/**
 * Service to handle Web MIDI API interactions.
 * Allows listing outputs and sending note messages.
 */
export class MidiService {
    private midiAccess: MIDIAccess | null = null;

    async initialize(): Promise<void> {
        if (!navigator.requestMIDIAccess) {
            throw new Error('Web MIDI API is not supported in this browser.');
        }
        try {
            this.midiAccess = (await navigator.requestMIDIAccess()) as unknown as MIDIAccess;
        } catch (error) {
            console.error('Failed to access MIDI devices:', error);
            throw error;
        }
    }

    getOutputs(): MIDIOutput[] {
        if (!this.midiAccess) return [];
        return Array.from(this.midiAccess.outputs.values());
    }

    getOutputById(id: string): MIDIOutput | undefined {
        return this.midiAccess?.outputs.get(id);
    }

    sendNoteOn(outputId: string, note: number, velocity: number = 0x7f, channel: number = 0) {
        const output = this.getOutputById(outputId);
        if (!output) return; // Output not found or not ready

        if (channel === -1) {
            // Omni: broadcast to all 16 channels
            for (let c = 0; c < 16; c++) {
                this.sendNoteOn(outputId, note, velocity, c);
            }
            return;
        }

        // MIDI Note On message: 0x90 + channel, note, velocity
        // Channel is 0-indexed in code (0-15), 1-16 in common speech
        // Ensure channel is 0-15
        const clampedChannel = Math.max(0, Math.min(15, channel));
        const statusByte = 0x90 + clampedChannel;

        output.send([statusByte, note, velocity]);
    }

    sendNoteOff(outputId: string, note: number, channel: number = 0) {
        const output = this.getOutputById(outputId);
        if (!output) return;

        if (channel === -1) {
            // Omni: broadcast to all 16 channels
            for (let c = 0; c < 16; c++) {
                this.sendNoteOff(outputId, note, c);
            }
            return;
        }

        const clampedChannel = Math.max(0, Math.min(15, channel));
        const statusByte = 0x80 + clampedChannel; // Note Off

        output.send([statusByte, note, 0x00]);
    }

    sendChordOn(outputId: string, notes: number[], velocity: number = 0x7f, channel: number = 0) {
        notes.forEach(note => this.sendNoteOn(outputId, note, velocity, channel));
    }

    sendChordOff(outputId: string, notes: number[], channel: number = 0) {
        notes.forEach(note => this.sendNoteOff(outputId, note, channel));
    }
}

export const midiService = new MidiService();
