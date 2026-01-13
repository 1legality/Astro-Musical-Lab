import React from 'react';

interface MidiOutputSelectorProps {
    /** Available MIDI output devices */
    outputs: MIDIOutput[];
    /** ID of the selected output (empty string for none) */
    selectedId: string;
    /** Called when selection changes */
    onSelectId: (id: string) => void;
    /** Current MIDI channel (0 = omni) */
    channel: number;
    /** Called when channel changes */
    onChannelChange: (channel: number) => void;
    /** Called when refresh button is clicked */
    onRefresh: () => void;
    /** Error message to display, if any */
    error: string | null;
}

/**
 * Reusable MIDI output device and channel selector.
 */
const MidiOutputSelector: React.FC<MidiOutputSelectorProps> = ({
    outputs,
    selectedId,
    onSelectId,
    channel,
    onChannelChange,
    onRefresh,
    error,
}) => {
    return (
        <div className="space-y-2">
            <div className="flex items-end gap-2">
                <div className="form-control flex-1">
                    <label className="label">
                        <span className="label-text text-sm font-medium">External MIDI Output</span>
                    </label>
                    <select
                        className="select select-bordered select-sm w-full"
                        value={selectedId}
                        onChange={(e) => onSelectId(e.target.value)}
                        disabled={outputs.length === 0}
                    >
                        <option value="">None (Browser Audio Only)</option>
                        {outputs.map((output) => (
                            <option key={output.id} value={output.id}>
                                {output.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="form-control w-24">
                    <label className="label">
                        <span className="label-text text-sm font-medium">Channel</span>
                    </label>
                    <select
                        className="select select-bordered select-sm w-full"
                        value={channel}
                        onChange={(e) => onChannelChange(Number(e.target.value))}
                        disabled={!selectedId}
                    >
                        <option value={0}>Omni (All)</option>
                        {Array.from({ length: 16 }, (_, i) => i + 1).map((ch) => (
                            <option key={ch} value={ch}>
                                {ch}
                            </option>
                        ))}
                    </select>
                </div>

                <button
                    className="btn btn-sm btn-ghost border-base-300"
                    onClick={onRefresh}
                    title="Refresh MIDI Devices"
                >
                    ↻
                </button>
            </div>

            {error && <div className="text-xs text-error">{error}</div>}
            {!error && outputs.length === 0 && (
                <div className="text-xs text-base-content/50">
                    No MIDI devices found. Connect your device and click refresh.
                </div>
            )}

            <div className="rounded-md bg-base-200 p-3 text-xs text-base-content/70">
                <strong>Tip:</strong> Select a MIDI device to test chords on your hardware synthesizers in
                real-time or to record sequences directly into an external sequencer (like the Oxi One).
            </div>
        </div>
    );
};

export default MidiOutputSelector;
