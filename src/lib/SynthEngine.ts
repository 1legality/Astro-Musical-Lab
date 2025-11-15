// Export ActiveNote interface
export interface ActiveNote {
    midiNote: number;
    velocity: number; // Kept for potential future use
    duration: number; // For notes with a defined end
    oscillators: OscillatorNode[];
    noiseSource?: AudioBufferSourceNode;
    filter?: BiquadFilterNode;
    noteGain: GainNode;
    stopTime: number;
}

/**
 * A simple synthesizer class using the Web Audio API to play chords
 * with two detuned sawtooth oscillators per note for a basic analog synth vibe.
 * The AudioContext is initialized lazily on the first user gesture.
 */
export class SynthEngine {
    public audioContext: AudioContext | null = null;
    private mainGainNode: GainNode | null = null;
    private reverbNode: ConvolverNode | null = null;
    private pannerNode: StereoPannerNode | null = null;
    private reverbSendGain: GainNode | null = null;
    private activeNotes: Set<ActiveNote> = new Set();
    private initialVolume: number;

    constructor(initialVolume: number = 0.5) {
        this.initialVolume = Math.max(0, Math.min(1, initialVolume));
    }

    /**
     * Initializes the AudioContext if it hasn't been created yet.
     * This should be called from any method that needs the audio context.
     * @returns true if the context is ready, false otherwise.
     */
    private initAudioContext(): boolean {
        if (this.audioContext) {
            return true;
        }
        // Avoid errors during server-side rendering
        if (typeof window === 'undefined') {
            return false;
        }
        try {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            this.mainGainNode = this.audioContext.createGain();
            this.pannerNode = this.audioContext.createStereoPanner();
            this.reverbNode = this.audioContext.createConvolver();
            this.reverbSendGain = this.audioContext.createGain();

            // Basic signal chain: mainGain -> panner -> destination
            this.mainGainNode.connect(this.pannerNode);
            this.pannerNode.connect(this.audioContext.destination);

            // Parallel reverb chain: mainGain -> reverbSend -> reverb -> destination
            this.mainGainNode.connect(this.reverbSendGain);
            this.reverbSendGain.connect(this.reverbNode);
            this.reverbNode.connect(this.audioContext.destination);

            this.setReverb(0.4); // Default reverb mix
            this.createReverbImpulseResponse();

            this.mainGainNode.gain.setValueAtTime(this.initialVolume, this.audioContext.currentTime);
            console.log("AudioContext initialized successfully.");
            return true;
        } catch (e) {
            console.error("Web Audio API is not supported or could not be initialized.", e);
            return false;
        }
    }

    private createReverbImpulseResponse() {
        if (!this.audioContext || !this.reverbNode) return false;

        const sampleRate = this.audioContext.sampleRate;
        const duration = 3.0; // seconds - longer reverb tail
        const decay = 4.5;
        const impulse = this.audioContext.createBuffer(2, duration * sampleRate, sampleRate);
        for (let i = 0; i < 2; i++) {
            const channelData = impulse.getChannelData(i);
            for (let j = 0; j < impulse.length; j++) {
                channelData[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / impulse.length, decay);
            }
        }
        this.reverbNode.buffer = impulse;
        return true;
    }

    /**
     * Sets the wet/dry mix of the reverb.
     * @param mix A value from 0 (fully dry) to 1 (fully wet).
     */
    public setReverb(mix: number): void {
        if (!this.reverbSendGain || !this.pannerNode) return;
        const clampedMix = Math.max(0, Math.min(1, mix));
        // Equal-power crossfade
        this.reverbSendGain.gain.value = clampedMix;
        if (this.pannerNode) {
            // This is a simplification; a true dry path would be separate.
            // For now, we just control the send to the reverb.
        }
    }

    /**
     * Sets the stereo panning.
     * @param pan A value from -1 (left) to 1 (right).
     */
    public setPan(pan: number): void {
        if (this.pannerNode) {
            this.pannerNode.pan.value = Math.max(-1, Math.min(1, pan));
        }
    }

    /**
     * Creates or resumes the AudioContext in response to a user gesture.
     */
    public async ensureContextResumed(): Promise<void> {
        if (!this.initAudioContext()) {
            return;
        }
        if (this.audioContext!.state === 'suspended') {
            console.log("Resuming AudioContext...");
            try {
                await this.audioContext!.resume();
                console.log("AudioContext resumed successfully.");
            } catch (e) {
                console.error("Error resuming AudioContext:", e);
            }
        }
    }

    private midiNoteToFrequency(midiNote: number): number {
        return 440 * Math.pow(2, (midiNote - 69) / 12);
    }

    public playChord(midiNotes: number[], durationSeconds: number = 0.05): void {
        if (!this.initAudioContext() || !this.audioContext || !this.mainGainNode) {
            return;
        }

        const now = this.audioContext.currentTime;

        midiNotes.forEach(note => {
            const baseFrequency = this.midiNoteToFrequency(note - 24); // Lower pitch by 2 octaves for a deeper boom

            // --- Oscillators for the drum tone ---
            const osc1 = this.audioContext!.createOscillator();
            osc1.type = 'triangle'; // Triangle waves have richer harmonics than sine
            // Dramatic pitch drop for the "thump"
            osc1.frequency.setValueAtTime(baseFrequency * 8, now);
            osc1.frequency.exponentialRampToValueAtTime(baseFrequency, now + 0.25);

            const osc2 = this.audioContext!.createOscillator();
            osc2.type = 'triangle';
            // Inharmonic partial for a more complex, drum-like tone
            osc2.frequency.setValueAtTime(baseFrequency * 4.53, now);
            osc2.frequency.exponentialRampToValueAtTime(baseFrequency * 0.5, now + 0.3);

            // --- Noise for the "crack" of the stick hit ---
            const noise = this.audioContext!.createBufferSource();
            const bufferSize = this.audioContext!.sampleRate * 0.05; // A much shorter, sharper noise burst
            const buffer = this.audioContext!.createBuffer(1, bufferSize, this.audioContext!.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            noise.buffer = buffer;

            // --- Filter to shape the noise into a sharp "crack" ---
            const filter = this.audioContext!.createBiquadFilter();
            filter.type = 'lowpass';
            filter.Q.value = 2; // A little resonance for emphasis
            filter.frequency.setValueAtTime(6000, now);
            filter.frequency.exponentialRampToValueAtTime(80, now + 0.04); // Very fast decay

            const noteGain = this.audioContext!.createGain();
            // Amplitude envelope for a percussive hit
            noteGain.gain.setValueAtTime(0.8, now);
            noteGain.gain.exponentialRampToValueAtTime(0.001, now + durationSeconds * 1.5);

            // --- Connect the audio graph ---
            osc1.connect(noteGain);
            osc2.connect(noteGain);
            noise.connect(filter);
            filter.connect(noteGain);
            noteGain.connect(this.mainGainNode!);

            const stopTime = now + durationSeconds;
            const activeNote: ActiveNote = { midiNote: note, velocity: 1.0, duration: durationSeconds, oscillators: [osc1, osc2], noiseSource: noise, filter, noteGain, stopTime };
            this.activeNotes.add(activeNote);

            const cleanup = () => {
                if (this.activeNotes.has(activeNote)) {
                    try {
                        osc1.disconnect();
                        osc2.disconnect();
                        noise.disconnect();
                        filter.disconnect();
                        noteGain.disconnect();
                    } catch (e) { /* Ignore */ }
                    this.activeNotes.delete(activeNote);
                }
            };

            osc1.onended = cleanup; // Clean up when the main oscillator stops

            osc1.start(now);
            osc2.start(now);
            noise.start(now);
            osc1.stop(stopTime);
            osc2.stop(stopTime + 0.1); // Let the inharmonic partial ring a little longer
            noise.stop(now + 0.05);
        });
    }

    public startChord(midiNotes: number[]): ActiveNote[] {
        if (!this.initAudioContext() || !this.audioContext || !this.mainGainNode) {
            return [];
        }

        const now = this.audioContext.currentTime;
        const activeNotes: ActiveNote[] = [];

        midiNotes.forEach(note => {
            const baseFrequency = this.midiNoteToFrequency(note - 24); // Lower pitch by 2 octaves

            const osc1 = this.audioContext!.createOscillator();
            osc1.type = 'triangle';
            osc1.frequency.setValueAtTime(baseFrequency * 8, now);
            osc1.frequency.exponentialRampToValueAtTime(baseFrequency, now + 0.25);

            const osc2 = this.audioContext!.createOscillator();
            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(baseFrequency * 4.53, now);
            osc2.frequency.exponentialRampToValueAtTime(baseFrequency * 0.5, now + 0.3);

            const noise = this.audioContext!.createBufferSource();
            const bufferSize = this.audioContext!.sampleRate * 0.05;
            const buffer = this.audioContext!.createBuffer(1, bufferSize, this.audioContext!.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            noise.buffer = buffer;

            const filter = this.audioContext!.createBiquadFilter();
            filter.type = 'lowpass';
            filter.Q.value = 2;
            filter.frequency.setValueAtTime(6000, now);
            filter.frequency.exponentialRampToValueAtTime(80, now + 0.04);

            const noteGain = this.audioContext!.createGain();
            noteGain.gain.setValueAtTime(0.8, now);

            osc1.connect(noteGain);
            osc2.connect(noteGain);
            noise.connect(filter);
            filter.connect(noteGain);
            noteGain.connect(this.mainGainNode!);

            const activeNote: ActiveNote = {
                midiNote: note,
                velocity: 1.0,
                duration: Infinity,
                oscillators: [osc1, osc2],
                noiseSource: noise,
                filter,
                noteGain,
                stopTime: Infinity
            };
            this.activeNotes.add(activeNote);
            activeNotes.push(activeNote);

            osc1.start(now);
            osc2.start(now);
            noise.start(now);
        });

        return activeNotes;
    }

    public stopNotes(notesToStop?: ActiveNote[]): void {
        if (!this.initAudioContext() || !this.audioContext || this.activeNotes.size === 0) {
            return;
        }

        const now = this.audioContext.currentTime;
        const fadeOutDuration = 0.1; // Slightly longer fade for a more natural drum decay
        const notes = notesToStop || Array.from(this.activeNotes);

        notes.forEach(activeNote => {
            activeNote.noteGain.gain.cancelScheduledValues(now);
            activeNote.noteGain.gain.setValueAtTime(activeNote.noteGain.gain.value, now);
            activeNote.noteGain.gain.exponentialRampToValueAtTime(0.0001, now + fadeOutDuration);

            const manualStopTime = now + fadeOutDuration + 0.01;
            activeNote.oscillators.forEach(osc => {
                try {
                    osc.stop(manualStopTime);
                    activeNote.noiseSource?.stop(now); // Stop noise immediately
                } catch (e) { /* Ignore */ }
            });

            setTimeout(() => {
                if (this.activeNotes.has(activeNote)) {
                    try {
                        activeNote.oscillators.forEach(osc => osc.disconnect());
                        activeNote.noiseSource?.disconnect();
                        activeNote.filter?.disconnect();
                        activeNote.noteGain.disconnect();
                    } catch (e) { /* Ignore */ }
                    this.activeNotes.delete(activeNote);
                }
            }, fadeOutDuration * 1000 + 50);
        });
    }

    public stopAll(): void {
        if (!this.initAudioContext() || !this.audioContext || this.activeNotes.size === 0) {
            return;
        }

        const now = this.audioContext.currentTime;
        const fadeOutDuration = 0.1;

        this.activeNotes.forEach(activeNote => {
            if (now < activeNote.stopTime) {
                activeNote.noteGain.gain.cancelScheduledValues(now);
                activeNote.noteGain.gain.setValueAtTime(activeNote.noteGain.gain.value, now);
                activeNote.noteGain.gain.exponentialRampToValueAtTime(0.0001, now + fadeOutDuration);

                const manualStopTime = now + fadeOutDuration + 0.01;
                activeNote.oscillators.forEach(osc => {
                    try {
                        osc.stop(manualStopTime);
                        activeNote.noiseSource?.stop(now);
                    } catch (e) { /* Ignore */ }
                });
            }
        });
        // The onended event will handle cleanup. For reliability, we can also force it.
        setTimeout(() => {
            this.activeNotes.forEach(note => {
                 try {
                    note.oscillators.forEach(osc => osc.disconnect());
                    note.noiseSource?.disconnect();
                    note.filter?.disconnect();
                    note.noteGain.disconnect();
                } catch(e) { /* Ignore */ }
            });
            this.activeNotes.clear();
        }, fadeOutDuration * 1000 + 50);
    }

    public setVolume(volume: number): void {
        if (!this.initAudioContext() || !this.mainGainNode) {
            return;
        }
        const clampedVolume = Math.max(0, Math.min(1, volume));
        this.mainGainNode.gain.setValueAtTime(clampedVolume, this.audioContext!.currentTime);
    }

    public getVolume(): number {
        if (!this.initAudioContext() || !this.mainGainNode) {
            return this.initialVolume;
        }
        return this.mainGainNode.gain.value;
    }
}
