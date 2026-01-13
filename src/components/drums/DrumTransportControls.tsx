import React from 'react';

interface DrumTransportControlsProps {
    /** Whether playback is currently active */
    isPlaying: boolean;
    /** Current tempo in BPM */
    bpm: number;
    /** Status message to display */
    status: string;
    /** Called when play/pause is toggled */
    onPlayPause: () => void;
    /** Called when stop is clicked */
    onStop: () => void;
    /** Called when reset is clicked */
    onReset?: () => void;
    /** Called when export MIDI is clicked */
    onExportMidi?: () => void;
    /** Called when ear candy is clicked */
    onEarCandy?: () => void;
}

/**
 * Transport controls for the drum pattern: Play/Pause, Stop.
 * Styled to match Pulse Generator aesthetic.
 */
const DrumTransportControls: React.FC<DrumTransportControlsProps> = ({
    isPlaying,
    bpm,
    status,
    onPlayPause,
    onStop,
    onReset,
    onExportMidi,
    onEarCandy,
}) => {
    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
                <button onClick={onPlayPause} className="btn btn-primary btn-sm">
                    {isPlaying ? 'Pause' : 'Play'}
                </button>
                <button onClick={onStop} className="btn btn-error btn-sm">
                    Stop
                </button>
                <div className="badge badge-outline badge-lg font-mono">
                    {bpm} BPM
                </div>
                {onReset && (
                    <button
                        onClick={onReset}
                        className="btn btn-xs btn-ghost"
                        title="Reset to original pattern"
                    >
                        Reset
                    </button>
                )}
                {onExportMidi && (
                    <button
                        onClick={onExportMidi}
                        className="btn btn-xs btn-outline"
                        title="Download MIDI file"
                    >
                        Export MIDI
                    </button>
                )}
                {onEarCandy && (
                    <button
                        onClick={onEarCandy}
                        className="btn btn-xs btn-outline border-secondary text-secondary hover:bg-secondary/20"
                        title="Add random ghost notes"
                    >
                        ✨ Ear Candy
                    </button>
                )}
            </div>
            <div className="text-xs text-base-content/70 italic">
                {status}
            </div>
        </div>
    );
};

export default DrumTransportControls;
