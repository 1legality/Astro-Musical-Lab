// Export ActiveNote interface
export interface ActiveNote {
    midiNote: number;
    velocity: number;
    duration: number;
    oscillators: OscillatorNode[];
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
            this.mainGainNode.gain.setValueAtTime(this.initialVolume, this.audioContext.currentTime);
            this.mainGainNode.connect(this.audioContext.destination);
            console.log("AudioContext initialized successfully.");
            return true;
        } catch (e) {
            console.error("Web Audio API is not supported or could not be initialized.", e);
            return false;
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
            const baseFrequency = this.midiNoteToFrequency(note);
            const osc = this.audioContext!.createOscillator();
            osc.type = 'square';
            osc.frequency.setValueAtTime(baseFrequency * 4, now);
            osc.frequency.exponentialRampToValueAtTime(baseFrequency, now + 0.05);

            const noteGain = this.audioContext!.createGain();
            noteGain.gain.setValueAtTime(1.0, now);
            noteGain.gain.exponentialRampToValueAtTime(0.001, now + durationSeconds);

            osc.connect(noteGain);
            noteGain.connect(this.mainGainNode!);

            const stopTime = now + durationSeconds;
            const activeNote: ActiveNote = { midiNote: note, velocity: 1.0, duration: durationSeconds, oscillators: [osc], noteGain, stopTime };
            this.activeNotes.add(activeNote);

            osc.onended = () => {
                if (this.activeNotes.has(activeNote)) {
                    try {
                        osc.disconnect();
                        noteGain.disconnect();
                    } catch (e) { /* Ignore */ }
                    this.activeNotes.delete(activeNote);
                }
            };

            osc.start(now);
            osc.stop(stopTime);
        });
    }

    public startChord(midiNotes: number[]): ActiveNote[] {
        if (!this.initAudioContext() || !this.audioContext || !this.mainGainNode) {
            return [];
        }

        const now = this.audioContext.currentTime;
        const activeNotes: ActiveNote[] = [];

        midiNotes.forEach(note => {
            const baseFrequency = this.midiNoteToFrequency(note);
            const osc = this.audioContext!.createOscillator();
            osc.type = 'square';
            osc.frequency.setValueAtTime(baseFrequency * 4, now);
            osc.frequency.exponentialRampToValueAtTime(baseFrequency, now + 0.05);

            const noteGain = this.audioContext!.createGain();
            noteGain.gain.setValueAtTime(1.0, now);
            noteGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

            osc.connect(noteGain);
            noteGain.connect(this.mainGainNode!);

            const activeNote: ActiveNote = { midiNote: note, velocity: 1.0, duration: Infinity, oscillators: [osc], noteGain, stopTime: Infinity };
            this.activeNotes.add(activeNote);
            activeNotes.push(activeNote);

            osc.start(now);
        });

        return activeNotes;
    }

    public stopNotes(notesToStop?: ActiveNote[]): void {
        if (!this.initAudioContext() || !this.audioContext || this.activeNotes.size === 0) {
            return;
        }

        const now = this.audioContext.currentTime;
        const fadeOutDuration = 0.05;
        const notes = notesToStop || Array.from(this.activeNotes);

        notes.forEach(activeNote => {
            activeNote.noteGain.gain.cancelScheduledValues(now);
            activeNote.noteGain.gain.setValueAtTime(activeNote.noteGain.gain.value, now);
            activeNote.noteGain.gain.exponentialRampToValueAtTime(0.0001, now + fadeOutDuration);

            const manualStopTime = now + fadeOutDuration + 0.01;
            activeNote.oscillators.forEach(osc => {
                try {
                    osc.stop(manualStopTime);
                } catch (e) { /* Ignore */ }
            });

            setTimeout(() => {
                if (this.activeNotes.has(activeNote)) {
                    try {
                        activeNote.oscillators.forEach(osc => osc.disconnect());
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
        const fadeOutDuration = 0.05;

        this.activeNotes.forEach(activeNote => {
            if (now < activeNote.stopTime) {
                activeNote.noteGain.gain.cancelScheduledValues(now);
                activeNote.noteGain.gain.setValueAtTime(activeNote.noteGain.gain.value, now);
                activeNote.noteGain.gain.exponentialRampToValueAtTime(0.0001, now + fadeOutDuration);

                const manualStopTime = now + fadeOutDuration + 0.01;
                activeNote.oscillators.forEach(osc => {
                    try {
                        osc.stop(manualStopTime);
                    } catch (e) { /* Ignore */ }
                });
            }
        });
        // The onended event will handle cleanup. For reliability, we can also force it.
        setTimeout(() => {
            this.activeNotes.forEach(note => {
                 try {
                    note.oscillators.forEach(osc => osc.disconnect());
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
