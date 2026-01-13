import React from 'react';
import { RangeControl } from '../ui/RangeControl';
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
 * Selector controls for drum patterns: section, pattern, MIDI channel, and tempo.
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
        <div className="space-y-3 p-1">
            <div className="form-control">
                <label className="label">
                    <span className="label-text text-sm font-medium">Section</span>
                </label>
                <select
                    className="select select-bordered w-full"
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

            <div className="form-control">
                <label className="label">
                    <span className="label-text text-sm font-medium">Pattern</span>
                </label>
                <select
                    className="select select-bordered w-full"
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-control">
                    <label className="label">
                        <span className="label-text text-sm font-medium">MIDI channel</span>
                    </label>
                    <select
                        className="select select-bordered w-full"
                        value={midiChannel}
                        onChange={(event) => {
                            const value = event.target.value;
                            if (value === 'all') onMidiChannelChange('all');
                            else onMidiChannelChange(Number(value));
                        }}
                    >
                        <option value="all">All channels (omit)</option>
                        {Array.from({ length: 16 }, (_, i) => i + 1).map((channel) => (
                            <option key={channel} value={channel}>
                                Channel {channel}
                            </option>
                        ))}
                    </select>
                </div>

                <RangeControl
                    label="Tempo"
                    value={bpm}
                    min={50}
                    max={240}
                    onChange={onBpmChange}
                    formatValue={(v) => `${v} BPM`}
                    className="block w-full"
                />
            </div>

            <div className="text-xs text-base-content/50 opacity-80 mt-4">
                <p>Click pads to cycle: Hit → Ghost → Off</p>
            </div>
        </div>
    );
};

export default DrumPatternSelector;
