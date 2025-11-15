import type { NoteData } from './MidiGenerator';

interface PianoRollOptions {
  noteColor?: string;
  backgroundColor?: string;
  gridColor?: string;
  emptyMessageColor?: string;
}

/**
 * Lightweight canvas helper used to render MIDI data as a piano-roll preview.
 * The class keeps track of the most recent notes so it can redraw on resize.
 */
export class PianoRollDrawer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly options: Required<PianoRollOptions>;
  private lastNotes: NoteData[] = [];

  constructor(canvas: HTMLCanvasElement, opts: PianoRollOptions = {}) {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      throw new Error('Unable to create 2d canvas context');
    }
    this.canvas = canvas;
    this.ctx = ctx;
    this.options = {
      noteColor: opts.noteColor ?? '#2563eb',
      backgroundColor: opts.backgroundColor ?? '#f5f5f7',
      gridColor: opts.gridColor ?? '#d4d4d8',
      emptyMessageColor: opts.emptyMessageColor ?? '#9ca3af',
    };
    this.resize();
  }

  public resize(): void {
    if (typeof window === 'undefined') return;
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = this.canvas.clientWidth;
    const displayHeight = this.canvas.clientHeight;

    if (this.canvas.width !== displayWidth * dpr || this.canvas.height !== displayHeight * dpr) {
      this.canvas.width = displayWidth * dpr;
      this.canvas.height = displayHeight * dpr;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    this.draw(this.lastNotes);
  }

  public draw(notes: NoteData[]): void {
    this.lastNotes = notes;
    const { backgroundColor, noteColor, gridColor } = this.options;
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.fillStyle = backgroundColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();

    if (!notes || notes.length === 0) {
      this.drawEmptyMessage('No notes to display');
      return;
    }

    let minMidi = 127;
    let maxMidi = 0;
    let maxTimeTicks = 0;
    notes.forEach(note => {
      minMidi = Math.min(minMidi, note.midiNote);
      maxMidi = Math.max(maxMidi, note.midiNote);
      maxTimeTicks = Math.max(maxTimeTicks, note.startTimeTicks + note.durationTicks);
    });

    minMidi = Math.max(0, minMidi - 2);
    maxMidi = Math.min(127, maxMidi + 2);
    const midiRange = maxMidi - minMidi + 1;
    if (maxTimeTicks <= 0) maxTimeTicks = 1;

    const canvasWidth = this.canvas.clientWidth;
    const canvasHeight = this.canvas.clientHeight;

    const noteHeight = canvasHeight / midiRange;
    const timeScale = canvasWidth / (maxTimeTicks * 1.02); // add small padding

    // Draw horizontal lines on C notes for reference
    this.ctx.strokeStyle = gridColor;
    this.ctx.lineWidth = 0.5;
    for (let midi = minMidi; midi <= maxMidi; midi++) {
      if (midi % 12 === 0) {
        const y = canvasHeight - ((midi - minMidi + 0.5) * noteHeight);
        this.ctx.beginPath();
        this.ctx.moveTo(0, y);
        this.ctx.lineTo(canvasWidth, y);
        this.ctx.stroke();
      }
    }

    this.ctx.fillStyle = noteColor;
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    notes.forEach(note => {
      const x = note.startTimeTicks * timeScale;
      const y = canvasHeight - ((note.midiNote - minMidi + 1) * noteHeight);
      const width = Math.max(1 / dpr, note.durationTicks * timeScale - 1 / dpr);
      const height = Math.max(1 / dpr, noteHeight - 1 / dpr);
      this.ctx.fillRect(x, y, width, height);
    });
  }

  public drawEmptyMessage(message: string): void {
    const { emptyMessageColor } = this.options;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.ctx.save();
    this.ctx.fillStyle = emptyMessageColor;
    this.ctx.font = '14px system-ui, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(message, w / 2, h / 2);
    this.ctx.restore();
  }

  public drawErrorMessage(message: string): void {
    this.lastNotes = [];
    this.drawEmptyMessage(message);
  }
}
