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
 * Styled to match Pulse Generator aesthetic.
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
        <div className="space-y-3">
            <div className="grid grid-cols-12 gap-4 items-end">
                <label className="form-control col-span-12 sm:col-span-7">
                    <span className="label-text text-xs uppercase tracking-wide mb-1">External MIDI Output</span>
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
                </label>

                <label className="form-control col-span-6 sm:col-span-3">
                    <span className="label-text text-xs uppercase tracking-wide mb-1">Channel</span>
                    <select
                        className="select select-bordered select-sm w-full"
                        value={channel}
                        onChange={(e) => onChannelChange(Number(e.target.value))}
                        disabled={!selectedId}
                    >
                        <option value={0}>Omni</option>
                        {Array.from({ length: 16 }, (_, i) => i + 1).map((ch) => (
                            <option key={ch} value={ch}>
                                Ch {ch}
                            </option>
                        ))}
                    </select>
                </label>

                <div className="col-span-6 sm:col-span-2 flex justify-start sm:justify-end">
                    <button
                        className="btn btn-sm btn-ghost border-base-300"
                        onClick={onRefresh}
                        title="Refresh MIDI Devices"
                    >
                        ↻ Refresh
                    </button>
                </div>
            </div>

            <div className="text-xs text-base-content/60">
                Route playback to an external synth or DAW for real-time auditioning.
            </div>

            {error && <div className="text-xs text-error">{error}</div>}
            {!error && outputs.length === 0 && (
                <div className="text-xs text-base-content/50">
                    No MIDI devices found. Connect your device and click refresh.
                </div>
            )}
        </div>
    );
};

export default MidiOutputSelector;
