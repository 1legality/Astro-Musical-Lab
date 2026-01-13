import React from 'react';
import {
    sectionsInOrder,
    DRUM_SECTION_LABELS,
    type PocketOperationPattern,
} from '../../lib/drums/pocketOperations';

interface DrumPatternSelectorProps {
    /** Currently selected section */
    selectedSection: string;
    /** Called when section changes */
    onSectionChange: (section: string) => void;
    /** Patterns available for the current section */
    patterns: PocketOperationPattern[];
    /** Currently selected pattern name */
    selectedName: string;
    /** Called when pattern changes */
    onPatternChange: (name: string) => void;
    /** Current MIDI channel setting */
    midiChannel: 'all' | number;
    /** Called when MIDI channel changes */
    onMidiChannelChange: (channel: 'all' | number) => void;
    /** Current tempo in BPM */
    bpm: number;
    /** Called when BPM changes */
    onBpmChange: (bpm: number) => void;
}

/**
 * Selector controls for drum patterns: section, pattern, and tempo.
 * Styled to match Pulse Generator aesthetic with pixel-perfect precision.
 */
const DrumPatternSelector: React.FC<DrumPatternSelectorProps> = ({
    selectedSection,
    onSectionChange,
    patterns,
    selectedName,
    onPatternChange,
    midiChannel,
    onMidiChannelChange,
    bpm,
    onBpmChange,
}) => {
    return (
        <div className="grid grid-cols-12 gap-x-4 gap-y-2 align-bottom">
            {/* Row 1: Section and Pattern */}
            <div className="col-span-12 lg:col-span-6 form-control">
                <span className="label-text text-xs uppercase tracking-wide mb-1">Section</span>
                <select
                    className="select select-bordered select-sm w-full"
                    value={selectedSection}
                    onChange={(event) => onSectionChange(event.target.value)}
                >
                    {sectionsInOrder.map((sectionOption) => (
                        <option key={sectionOption} value={sectionOption}>
                            {DRUM_SECTION_LABELS[sectionOption as keyof typeof DRUM_SECTION_LABELS] || sectionOption}
                        </option>
                    ))}
                </select>
            </div>

            <div className="col-span-12 lg:col-span-6 form-control">
                <span className="label-text text-xs uppercase tracking-wide mb-1">Pattern</span>
                <select
                    className="select select-bordered select-sm w-full"
                    value={selectedName}
                    onChange={(event) => onPatternChange(event.target.value)}
                >
                    {patterns.map((pattern) => (
                        <option key={pattern.name} value={pattern.name}>
                            {pattern.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Row 2: MIDI Channel and Tempo */}
            <div className="col-span-6 lg:col-span-4 form-control">
                <span className="label-text text-xs uppercase tracking-wide mb-1">MIDI Ch (Out)</span>
                <select
                    className="select select-bordered select-sm w-full"
                    value={midiChannel}
                    onChange={(event) => {
                        const value = event.target.value;
                        if (value === 'all') onMidiChannelChange('all');
                        else onMidiChannelChange(Number(value));
                    }}
                >
                    <option value="all">All (10)</option>
                    {Array.from({ length: 16 }, (_, i) => i + 1).map((channel) => (
                        <option key={channel} value={channel}>
                            Ch {channel}
                        </option>
                    ))}
                </select>
            </div>

            <div className="col-span-6 lg:col-span-8 form-control">
                <div className="flex justify-between items-center mb-1">
                    <span className="label-text text-xs uppercase tracking-wide">Tempo</span>
                    <span className="text-xs font-mono text-base-content/70">{bpm} BPM</span>
                </div>
                <input
                    type="range"
                    min={50}
                    max={240}
                    value={bpm}
                    className="range range-xs"
                    onChange={(event) => onBpmChange(Number(event.target.value))}
                />
            </div>
        </div>
    );
};

export default DrumPatternSelector;
