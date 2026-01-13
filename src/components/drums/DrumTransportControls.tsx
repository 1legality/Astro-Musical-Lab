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
    /** Called when export MIDI is clicked */
    onExportMidi: () => void;
}

/**
 * Transport controls for the drum pattern: Play/Pause, Stop, Export MIDI.
 */
const DrumTransportControls: React.FC<DrumTransportControlsProps> = ({
    isPlaying,
    bpm,
    status,
    onPlayPause,
    onStop,
    onExportMidi,
}) => {
    const stepDuration = (60 / Math.max(1, bpm) / 4).toFixed(3);

    return (
        <div className="flex flex-wrap items-center gap-3">
            <button onClick={onPlayPause} className="btn btn-primary btn-sm">
                {isPlaying ? 'Pause' : 'Play'}
            </button>
            <button onClick={onStop} className="btn btn-error btn-sm">
                Stop
            </button>
            <button onClick={onExportMidi} className="btn btn-secondary btn-sm">
                Export MIDI (GM)
            </button>
            <div className="badge badge-outline badge-lg font-mono gap-1">
                16th = {stepDuration}s
            </div>
            <div className="text-xs text-base-content/70">{status}</div>
        </div>
    );
};

export default DrumTransportControls;
