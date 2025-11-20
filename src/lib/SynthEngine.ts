// Export ActiveNote interface
export interface ActiveNote {
    midiNote: number;
    velocity: number; // Kept for potential future use
    duration: number; // For notes with a defined end
    oscillators: OscillatorNode[];
    noiseSource?: AudioBufferSourceNode;
    filter?: BiquadFilterNode;
    noiseGain?: GainNode;
    noteGain: GainNode;
    stopTime: number;
}

/**
 * A simple drum machine synthesizer class using the Web Audio API.
 * The AudioContext is initialized lazily on the first user gesture.
 */
export class SynthEngine {
    public audioContext: AudioContext | null = null;
    private mainGainNode: GainNode | null = null;
    private compressorNode: DynamicsCompressorNode | null = null;
    private postGainNode: GainNode | null = null;
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
            const mainGain = this.audioContext.createGain();
            const compressor = this.audioContext.createDynamicsCompressor();
            const postGain = this.audioContext.createGain();
            const panner = this.audioContext.createStereoPanner();
            const reverb = this.audioContext.createConvolver();
            const reverbSend = this.audioContext.createGain();

            this.mainGainNode = mainGain;
            this.compressorNode = compressor;
            this.postGainNode = postGain;
            this.pannerNode = panner;
            this.reverbNode = reverb;
            this.reverbSendGain = reverbSend;

            // Basic signal chain: mainGain -> panner -> destination
            mainGain.connect(compressor);
            compressor.connect(postGain);
            postGain.connect(panner);
            panner.connect(this.audioContext.destination);

            // Gentle compression lets us push gain without clipping
            const comp = compressor;
            comp.threshold.setValueAtTime(-24, this.audioContext.currentTime);
            comp.knee.setValueAtTime(30, this.audioContext.currentTime);
            comp.ratio.setValueAtTime(6, this.audioContext.currentTime);
            comp.attack.setValueAtTime(0.005, this.audioContext.currentTime);
            comp.release.setValueAtTime(0.25, this.audioContext.currentTime);
            postGain.gain.setValueAtTime(1.6, this.audioContext.currentTime);

            // Parallel reverb chain: mainGain -> reverbSend -> reverb -> destination
            postGain.connect(reverbSend);
            reverbSend.connect(reverb);
            reverb.connect(this.audioContext.destination);

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
        if (!this.reverbSendGain) return;
        const clampedMix = Math.max(0, Math.min(1, mix));
        // Equal-power crossfade
        this.reverbSendGain.gain.value = clampedMix;
        // This is a simplification; a true dry path would be separate.
        // For now, we just control the send to the reverb.
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



    public playNote(midiNote: number, durationSeconds: number = 0.15): void {
        if (!this.initAudioContext() || !this.audioContext || !this.mainGainNode) {
            return;
        }

        const now = this.audioContext.currentTime;
        const frequency = this.midiNoteToFrequency(midiNote);

        // --- Oscillator for the pluck tone ---
        const osc = this.audioContext.createOscillator();
        osc.type = 'triangle'; // Triangle has odd harmonics, sounds "woody" or "flute-like" when filtered
        osc.frequency.setValueAtTime(frequency, now);

        // --- Filter to shape the tone (Pluck effect) ---
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.Q.value = 1; // Slight resonance
        // Filter envelope: Start open (bright) and close quickly (dull)
        filter.frequency.setValueAtTime(frequency * 4, now);
        filter.frequency.exponentialRampToValueAtTime(frequency, now + 0.1);

        // --- Amplitude Envelope ---
        const noteGain = this.audioContext.createGain();
        noteGain.gain.setValueAtTime(0, now);
        noteGain.gain.linearRampToValueAtTime(0.8, now + 0.005); // Fast attack
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + durationSeconds); // Decay

        // --- Connect the audio graph ---
        osc.connect(filter);
        filter.connect(noteGain);
        noteGain.connect(this.mainGainNode);

        const stopTime = now + durationSeconds;
        const activeNote: ActiveNote = {
            midiNote: midiNote,
            velocity: 1.0,
            duration: durationSeconds,
            oscillators: [osc],
            filter,
            noteGain,
            stopTime
        };
        this.activeNotes.add(activeNote);

        const cleanup = () => {
            if (this.activeNotes.has(activeNote)) {
                try {
                    osc.disconnect();
                    filter.disconnect();
                    noteGain.disconnect();
                } catch (e) { /* Ignore */ }
                this.activeNotes.delete(activeNote);
            }
        };

        osc.onended = cleanup;

        osc.start(now);
        osc.stop(stopTime + 0.1); // Allow tail to ring out slightly
    }

    public startNote(midiNote: number): ActiveNote | null {
        if (!this.initAudioContext() || !this.audioContext || !this.mainGainNode) {
            return null;
        }

        const now = this.audioContext.currentTime;
        const frequency = this.midiNoteToFrequency(midiNote);

        const osc = this.audioContext.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(frequency, now);

        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.Q.value = 1;
        filter.frequency.setValueAtTime(frequency * 4, now);
        filter.frequency.exponentialRampToValueAtTime(frequency, now + 0.2); // Slower filter decay for sustained notes

        const noteGain = this.audioContext.createGain();
        noteGain.gain.setValueAtTime(0, now);
        noteGain.gain.linearRampToValueAtTime(0.8, now + 0.01);
        noteGain.gain.setTargetAtTime(0.6, now + 0.01, 0.1); // Sustain level

        osc.connect(filter);
        filter.connect(noteGain);
        noteGain.connect(this.mainGainNode);

        const activeNote: ActiveNote = {
            midiNote: midiNote,
            velocity: 1.0,
            duration: Infinity,
            oscillators: [osc],
            filter,
            noteGain,
            stopTime: Infinity
        };
        this.activeNotes.add(activeNote);

        osc.start(now);

        return activeNote;
    }

    public stopNote(noteToStop: ActiveNote): void {
        if (!this.initAudioContext() || !this.audioContext || !this.activeNotes.has(noteToStop)) {
            return;
        }

        const now = this.audioContext.currentTime;
        const fadeOutDuration = 0.1;

        noteToStop.noteGain.gain.cancelScheduledValues(now);
        noteToStop.noteGain.gain.setValueAtTime(noteToStop.noteGain.gain.value, now);
        noteToStop.noteGain.gain.exponentialRampToValueAtTime(0.0001, now + fadeOutDuration);

        const manualStopTime = now + fadeOutDuration + 0.01;
        noteToStop.oscillators.forEach(osc => {
            try {
                osc.stop(manualStopTime);
            } catch (e) { /* Ignore */ }
        });

        setTimeout(() => {
            if (this.activeNotes.has(noteToStop)) {
                try {
                    noteToStop.oscillators.forEach(osc => osc.disconnect());
                    noteToStop.filter?.disconnect();
                    noteToStop.noteGain.disconnect();
                } catch (e) { /* Ignore */ }
                this.activeNotes.delete(noteToStop);
            }
        }, fadeOutDuration * 1000 + 50);
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
                    note.noiseGain?.disconnect();
                    note.noteGain.disconnect();
                } catch (e) { /* Ignore */ }
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
