export type RepeatConfig = {
    count: number;
    time: number;
    pace: number;
    offset: number;
};

export enum ModulationShape {
    Sine = 0,
    Triangle = 1,
    Sawtooth = 2,
    ReverseSaw = 3,
    Square = 4,
    Random = 5,
    SampleHold = 6,
    Exponential = 7,
}

export const MODULATION_SHAPE_LABELS = [
    'Sine',
    'Triangle',
    'Sawtooth',
    'Reverse Saw',
    'Square',
    'Random',
    'Sample & Hold',
    'Exponential',
];

export enum VoicingStyle {
    Up = 0,
    Down = 1,
    UpDown = 2,
    Random = 3,
    Converge = 4,
    Diverge = 5,
    PinkyAnchor = 6,
    AsPlayed = 7,
}

export const VOICING_STYLE_LABELS = [
    'Up',
    'Down',
    'Up-Down',
    'Random',
    'Converge',
    'Diverge',
    'Pinky Anchor',
    'As Played',
];

export type PhraseModulation = {
    shape: ModulationShape;
    amount: number;
};
