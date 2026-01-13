import { useCallback, useEffect, useRef, useState } from 'react';
import { midiService } from '../lib/chords/MidiService';

export interface MidiOutputState {
    /** Available MIDI output devices */
    outputs: MIDIOutput[];
    /** ID of the currently selected output (empty string for none) */
    selectedId: string;
    /** MIDI channel (0 = omni/all, 1-16 for specific channels) */
    channel: number;
    /** Error message if MIDI initialization failed */
    error: string | null;
}

export interface UseMidiOutputReturn extends MidiOutputState {
    /** Set the selected output ID */
    setSelectedId: (id: string) => void;
    /** Set the MIDI channel */
    setChannel: (channel: number) => void;
    /** Refresh the list of MIDI outputs */
    refresh: () => Promise<void>;
}

/**
 * Hook for managing MIDI output device selection.
 */
export function useMidiOutput(): UseMidiOutputReturn {
    const [outputs, setOutputs] = useState<MIDIOutput[]>([]);
    const [selectedId, setSelectedId] = useState<string>('');
    const [channel, setChannel] = useState<number>(0);
    const [error, setError] = useState<string | null>(null);
    const initializedRef = useRef(false);

    const refresh = useCallback(async () => {
        try {
            await midiService.initialize();
            const devices = midiService.getOutputs();
            setOutputs(devices);

            // Select first device if none selected and devices available
            if (devices.length > 0 && !selectedId) {
                setSelectedId(devices[0].id);
            }
            setError(null);
        } catch (err) {
            console.warn('MIDI refresh failed', err);
            setError('Could not refresh MIDI devices.');
        }
    }, [selectedId]);

    // Initialize on mount
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (initializedRef.current) return;
        initializedRef.current = true;

        midiService
            .initialize()
            .then(() => {
                const devices = midiService.getOutputs();
                setOutputs(devices);
                if (devices.length > 0) {
                    setSelectedId(devices[0].id);
                }
            })
            .catch((err) => {
                console.warn('MIDI initialization failed', err);
                setError('MIDI access denied or not supported.');
            });
    }, []);

    return {
        outputs,
        selectedId,
        channel,
        error,
        setSelectedId,
        setChannel,
        refresh,
    };
}
