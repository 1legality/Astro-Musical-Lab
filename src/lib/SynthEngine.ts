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
    private reverbNode: ConvolverNode | null = null;
    private pannerNode: StereoPannerNode | null = null;
    private reverbSendGain: GainNode | null = null;
    private activeNotes: Set<ActiveNote> = new Set();
    private initialVolume: number;
    private readonly minBaseFrequency = 80; // Hz, keep sounds within small speaker range
    private readonly detuneSemitones = 12; // Drop an octave but stay punchy

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

    private drumBaseFrequency(midiNote: number): number {
        const shiftedNote = midiNote - this.detuneSemitones;
        const targetFrequency = this.midiNoteToFrequency(shiftedNote);
        return Math.max(this.minBaseFrequency, targetFrequency);
    }

    public playNote(midiNote: number, durationSeconds: number = 0.05): void {
        if (!this.initAudioContext() || !this.audioContext || !this.mainGainNode) {
            return;
        }

        const now = this.audioContext.currentTime;

        const baseFrequency = this.drumBaseFrequency(midiNote); // Lower pitch but keep audible

        // --- Oscillators for the drum tone ---
        const osc1 = this.audioContext!.createOscillator();
        osc1.type = 'sine'; // Smooth fundamental for a tom
        // Gentle downward bend to avoid laser-like sweep
        osc1.frequency.setValueAtTime(baseFrequency * 1.8, now);
        osc1.frequency.exponentialRampToValueAtTime(baseFrequency * 0.95, now + 0.18);

        const osc2 = this.audioContext!.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(baseFrequency * 1.35, now);
        osc2.frequency.exponentialRampToValueAtTime(baseFrequency, now + 0.22);
        osc2.detune.setValueAtTime(-30, now); // Light beating for body

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
        filter.type = 'bandpass';
        filter.Q.value = 1.5;
        filter.frequency.setValueAtTime(4500, now);
        filter.frequency.exponentialRampToValueAtTime(400, now + 0.06);

        const noiseGain = this.audioContext!.createGain();
        noiseGain.gain.setValueAtTime(0.5, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

        const noteGain = this.audioContext!.createGain();
        // Amplitude envelope for a percussive hit
        noteGain.gain.setValueAtTime(1.3, now); // Boost peak level for mobile speakers
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + durationSeconds * 1.5);

        // --- Connect the audio graph ---
        osc1.connect(noteGain);
        osc2.connect(noteGain);
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(noteGain);
        noteGain.connect(this.mainGainNode!);

        const stopTime = now + durationSeconds;
        const activeNote: ActiveNote = { midiNote: midiNote, velocity: 1.0, duration: durationSeconds, oscillators: [osc1, osc2], noiseSource: noise, filter, noiseGain, noteGain, stopTime };
        this.activeNotes.add(activeNote);

        const cleanup = () => {
            if (this.activeNotes.has(activeNote)) {
                try {
                    osc1.disconnect();
                    osc2.disconnect();
                    noise.disconnect();
                    filter.disconnect();
                    noiseGain.disconnect();
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
    }

    public startNote(midiNote: number): ActiveNote | null {
        if (!this.initAudioContext() || !this.audioContext || !this.mainGainNode) {
            return null;
        }

        const now = this.audioContext.currentTime;

        const baseFrequency = this.drumBaseFrequency(midiNote); // Lower pitch while staying audible

        const osc1 = this.audioContext!.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(baseFrequency * 1.8, now);
        osc1.frequency.exponentialRampToValueAtTime(baseFrequency * 0.95, now + 0.18);

        const osc2 = this.audioContext!.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(baseFrequency * 1.35, now);
        osc2.frequency.exponentialRampToValueAtTime(baseFrequency, now + 0.22);
        osc2.detune.setValueAtTime(-30, now);

        const noise = this.audioContext!.createBufferSource();
        const bufferSize = this.audioContext!.sampleRate * 0.05;
        const buffer = this.audioContext!.createBuffer(1, bufferSize, this.audioContext!.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        noise.buffer = buffer;

        const filter = this.audioContext!.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.value = 1.5;
        filter.frequency.setValueAtTime(4500, now);
        filter.frequency.exponentialRampToValueAtTime(400, now + 0.06);

        const noiseGain = this.audioContext!.createGain();
        noiseGain.gain.setValueAtTime(0.5, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

        const noteGain = this.audioContext!.createGain();
        noteGain.gain.setValueAtTime(1.3, now); // Boost sustained hits as well

        osc1.connect(noteGain);
        osc2.connect(noteGain);
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(noteGain);
        noteGain.connect(this.mainGainNode!);

        const activeNote: ActiveNote = {
            midiNote: midiNote,
            velocity: 1.0,
            duration: Infinity,
            oscillators: [osc1, osc2],
            noiseSource: noise,
            filter,
            noiseGain,
            noteGain,
            stopTime: Infinity
        };
        this.activeNotes.add(activeNote);

        osc1.start(now);
        osc2.start(now);
        noise.start(now);

        return activeNote;
    }

    public stopNote(noteToStop: ActiveNote): void {
        if (!this.initAudioContext() || !this.audioContext || !this.activeNotes.has(noteToStop)) {
            return;
        }

        const now = this.audioContext.currentTime;
        const fadeOutDuration = 0.1; // Slightly longer fade for a more natural drum decay

        noteToStop.noteGain.gain.cancelScheduledValues(now);
        noteToStop.noteGain.gain.setValueAtTime(noteToStop.noteGain.gain.value, now);
        noteToStop.noteGain.gain.exponentialRampToValueAtTime(0.0001, now + fadeOutDuration);

        const manualStopTime = now + fadeOutDuration + 0.01;
        noteToStop.oscillators.forEach(osc => {
            try {
                osc.stop(manualStopTime);
                noteToStop.noiseSource?.stop(now); // Stop noise immediately
            } catch (e) { /* Ignore */ }
        });

        setTimeout(() => {
            if (this.activeNotes.has(noteToStop)) {
                try {
                    noteToStop.oscillators.forEach(osc => osc.disconnect());
                    noteToStop.noiseSource?.disconnect();
                    noteToStop.filter?.disconnect();
                    noteToStop.noiseGain?.disconnect();
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
