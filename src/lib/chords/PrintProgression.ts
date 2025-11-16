import { jsPDF } from 'jspdf';
import { MidiGenerator } from './MidiGenerator';
import type { MidiGenerationOptions } from './MidiGenerator';

/**
 * Export a chord progression to PDF.
 * - Uses MidiGenerator.generate(...) to obtain chord details (voicings, bass note, etc).
 * - Renders a header with the progression string and one 4-octave keyboard row per chord.
 * - Respects outputType and inversionType by selecting which notes are highlighted.
 *
 * Returns a Blob for the generated PDF (caller may trigger a download).
 */
export async function exportProgressionToPdf(options: MidiGenerationOptions): Promise<Blob> {
    const midiGenerator = new MidiGenerator();
    const generationResult = midiGenerator.generate(options);
    const chordDetails: any[] = (generationResult as any).chordDetails || [];
    const progressionTitle = (options.progressionString || '').trim() || 'Progression';

    // Create jsPDF (portrait, points)
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const margin = 36;
    let y = margin;

    // Header (centered)
    doc.setFontSize(20);
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setTextColor(0);
    doc.text(` ${progressionTitle}`, pageWidth / 2, y + 6, { align: 'center' });
    y += 36;

    // Per-chord layout metrics
    let rowHeight = 110; // base row height
    const whiteKeyWidth = 12; // nominal
    const whiteKeyHeight = 56; // nominal
    const blackKeyWidth = Math.round(whiteKeyWidth * 0.6);
    const blackKeyHeight = Math.round(whiteKeyHeight * 0.62);
    const keysOctaves = 4; // use 4 octaves
    const whiteKeysPerOctave = 7;
    const totalWhiteKeys = whiteKeysPerOctave * keysOctaves;
    const keyboardWidth = totalWhiteKeys * whiteKeyWidth;
    const labelWidth = 40;
    const usableWidth = pageWidth - margin * 2;

    // Increase scale up to ~35% and make keys taller by 25%
    const scaleCap = 1.35;
    // Use most of the usable width for the keyboard (ignore small label area) so keys scale up to fill more of the page
    const scale = Math.min(scaleCap, Math.max(0.6, (usableWidth - 20) / keyboardWidth));
    const heightMultiplier = 1.25;

    const drawWhiteKeyW = whiteKeyWidth * scale;
    const drawWhiteKeyH = whiteKeyHeight * scale * heightMultiplier;
    const drawBlackKeyW = blackKeyWidth * scale;
    const drawBlackKeyH = blackKeyHeight * scale * heightMultiplier;

    // increase row height to accommodate taller keys
    rowHeight = Math.round((drawWhiteKeyH + 36) );
    const gapBetweenRows = 28;

    // Note name helper
    const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const midiToNoteLabel = (m: number) => `${NOTE_NAMES[m % 12]}${Math.floor(m / 12) - 1}`;

    // Helper: semitone positions considered black within an octave
    const isBlackInOctave = (semitone: number) => {
        const s = semitone % 12;
        return [1, 3, 6, 8, 10].includes(s);
    };

    // Iterate chords
    for (let i = 0; i < chordDetails.length; i++) {
        const chord = chordDetails[i];

        // Add page if needed
        if (y + rowHeight > doc.internal.pageSize.getHeight() - margin) {
            doc.addPage();
            // redraw header on new page
            y = margin;
            doc.setFontSize(20);
            doc.setTextColor(0);
            doc.text(` ${progressionTitle}`, pageWidth / 2, y + 6, { align: 'center' });
            y += 36;
        }

        // Determine keyboard base MIDI so the notes fit within 4 octaves
        const outputType = options.outputType;
        let highlightNotes: number[] = [];

        if (!chord || !chord.isValid) {
            highlightNotes = [];
        } else {
            switch (outputType) {
                case 'bassOnly':
                    if (chord.calculatedBassNote !== null) highlightNotes = [chord.calculatedBassNote];
                    break;
                case 'bassAndFifth':
                    if (chord.calculatedBassNote !== null) highlightNotes = [chord.calculatedBassNote, chord.calculatedBassNote + 7];
                    break;
                case 'chordsOnly':
                    highlightNotes = Array.isArray(chord.adjustedVoicing) ? [...chord.adjustedVoicing] : [];
                    break;
                case 'chordsAndBass':
                    highlightNotes = Array.isArray(chord.adjustedVoicing) ? [...chord.adjustedVoicing] : [];
                    if (chord.calculatedBassNote !== null && !highlightNotes.includes(chord.calculatedBassNote)) {
                        highlightNotes.push(chord.calculatedBassNote);
                    }
                    break;
                default:
                    highlightNotes = Array.isArray(chord.adjustedVoicing) ? [...chord.adjustedVoicing] : [];
                    break;
            }
        }

        const allNotes = highlightNotes.filter(n => typeof n === 'number' && !isNaN(n));
        let minNote = allNotes.length ? Math.min(...allNotes) : 60;
        let maxNote = allNotes.length ? Math.max(...allNotes) : 60;

        // Choose base midi so min and max fit into keysOctaves * 12 semitones
        // Prefer to start at C1 (MIDI 24) when possible so the first octave is used; only shift up if necessary
        const C1 = 24;
        let baseMidi = C1;
        if (baseMidi + 12 * keysOctaves - 1 < maxNote) {
            // shift up so maxNote fits within the window
            baseMidi = Math.max(0, Math.floor((maxNote - (12 * keysOctaves - 1)) / 12) * 12);
        }
        if (baseMidi < 0) baseMidi = 0;
        if (baseMidi + 12 * keysOctaves - 1 > 127) baseMidi = 127 - (12 * keysOctaves - 1);

        // Draw keyboard centered horizontally in usable area
        const kbY = y + 18;
        const keyboardDrawWidth = totalWhiteKeys * drawWhiteKeyW;
        const kbX = margin + Math.max(0, (usableWidth - keyboardDrawWidth) / 2);

        // Map semitone index -> white index for horizontal pos
        let whiteIndex = 0;
        const midiToWhiteIndex: Record<number, number> = {};
        for (let s = 0; s < keysOctaves * 12; s++) {
            const midi = baseMidi + s;
            if (!isBlackInOctave(s)) {
                midiToWhiteIndex[midi] = whiteIndex++;
            }
        }

        // Chord label centered above the keyboard
        const chordLabel = chord && chord.symbol ? chord.symbol : '(rest)';
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text(chordLabel, kbX + keyboardDrawWidth / 2, y + 8, { align: 'center' });

        // Draw white keys (with small note labels underneath)
        doc.setDrawColor(50);
        doc.setLineWidth(0.6);
        doc.setFontSize(8);
        for (let s = 0; s < keysOctaves * 12; s++) {
            const midi = baseMidi + s;
            if (!isBlackInOctave(s)) {
                const wIdx = midiToWhiteIndex[midi];
                const x = kbX + wIdx * drawWhiteKeyW;
                const yTop = kbY;
                const isHighlighted = highlightNotes.includes(midi);
                if (isHighlighted) {
                    doc.setFillColor(220, 235, 255);
                    doc.rect(x, yTop, drawWhiteKeyW, drawWhiteKeyH, 'F');
                } else {
                    doc.setFillColor(255, 255, 255);
                    doc.rect(x, yTop, drawWhiteKeyW, drawWhiteKeyH, 'F');
                }
                // key border
                doc.setDrawColor(160);
                doc.rect(x, yTop, drawWhiteKeyW, drawWhiteKeyH, 'S');

                // note label inside the key near the bottom (short form like C3)
                const label = `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
                doc.setFontSize(7);
                doc.setTextColor(80);
                // place label a few points above the key bottom
                doc.text(label, x + drawWhiteKeyW / 2, yTop + drawWhiteKeyH - 4, { align: 'center' });
             }
         }

        // Draw black keys over the white keys
        for (let s = 0; s < keysOctaves * 12; s++) {
            if (isBlackInOctave(s)) {
                const midi = baseMidi + s;
                // Find the white key to the left: previous semitone will be white
                let leftSemitone = s - 1;
                while (leftSemitone >= 0 && isBlackInOctave(leftSemitone)) leftSemitone--;
                const leftMidi = baseMidi + leftSemitone;
                const leftWhiteIdx = midiToWhiteIndex[leftMidi] ?? 0;
                const x = kbX + (leftWhiteIdx + 1) * drawWhiteKeyW - drawBlackKeyW / 2;
                const yTop = kbY;
                const isHighlighted = highlightNotes.includes(midi);
                if (isHighlighted) {
                    doc.setFillColor(160, 210, 255);
                    doc.rect(x, yTop, drawBlackKeyW, drawBlackKeyH, 'F');
                } else {
                    doc.setFillColor(0, 0, 0);
                    doc.rect(x, yTop, drawBlackKeyW, drawBlackKeyH, 'F');
                }
                // subtle border
                doc.setDrawColor(0);
                doc.rect(x, yTop, drawBlackKeyW, drawBlackKeyH, 'S');
            }
        }

        // --- Add pad-style "square" keyboard (four octaves) as an alternate visual ---
        // Keep the original keyboard above and draw the pads in 2 rows (Torso T1 style).
        const squareSize = Math.min(drawWhiteKeyW, drawWhiteKeyH);
        // increase spacing so octave boundaries are visible
        const octaveGap = Math.round(squareSize * 0.8);
        const totalSemitones = keysOctaves * 12;

        // Two rows: split octaves evenly across rows (for 4 octaves -> 2 octaves per row)
        const rowOctaves = Math.ceil(keysOctaves / 2); // octaves per row
        const rows = Math.ceil(keysOctaves / rowOctaves); // number of rows (should be 2)
        // Use 7 columns per octave for pad layout (one column per white key) and place black-key row above white-key row
        const rowWidth = rowOctaves * 7 * squareSize + Math.max(0, (rowOctaves - 1) * octaveGap);
        const padX = margin + Math.max(0, (usableWidth - rowWidth) / 2);

        // place pads below the piano keyboard, give a bit more vertical space
        const padTopY = kbY + drawWhiteKeyH + 14;
        const padRowGap = Math.round(squareSize * 0.9); // vertical gap between pad rows
        const padHeight = squareSize;

        doc.setLineWidth(0.8);
        // Draw pads using 7 columns per octave (white key columns). Black keys appear on an upper row
        const whiteSemitones = [0, 2, 4, 5, 7, 9, 11];
        // top-pad presence is determined per white-column by checking whether the
        // next semitone is a black key; this avoids relying on a hardcoded index list
        // (so F will correctly show a top pad where appropriate).

        // make top pads full-size squares (same width as the white pads)
        const blackPadWidth = squareSize;
        const blackOffset = 0;

        // Elektron-style per-column mapping for the top (black) row.
        // For each white column (C D E F G A B) specify which black semitone
        // should be shown in the top pad. Use null to indicate an "empty" top cell
        // which is rendered as a full black square.
        // Layout:  C   D   E   F   G   A   B
        // Desired Elektron layout: C# D# - F# G# A# over C D E F G A B. 
        // maps to semitone numbers within the octave: [null, 1, 3, null, 6, 8, 10]
        const topPadMapping: Array<number | null> = [null, 1, 3, null, 6, 8, 10];

        // each visual "row" consists of an upper top-pad row and a lower white-pad row
        for (let octaveIndex = 0; octaveIndex < keysOctaves; octaveIndex++) {
             const rowIndex = Math.floor(octaveIndex / rowOctaves);
             const colInRow = octaveIndex % rowOctaves;
 
             const baseXForOctave = padX + colInRow * (7 * squareSize + octaveGap);
             const perRowTop = padTopY + rowIndex * (2 * padHeight + padRowGap);
             const blackYTop = perRowTop; // upper small pads (black-key placeholders)
             const whiteYTop = perRowTop + padHeight; // lower pads (white-key columns)
 
             for (let w = 0; w < 7; w++) {
                 const semitone = whiteSemitones[w];
                 const midiWhite = baseMidi + octaveIndex * 12 + semitone;
                 const x = baseXForOctave + w * squareSize;

                // Use mapping to determine which black (if any) to show above this white column.
                const mapped = topPadMapping[w];
                if (mapped === null) {
                    // render an "empty" top cell as a full black square
                    doc.setFillColor(0, 0, 0);
                    doc.rect(x + blackOffset, blackYTop, blackPadWidth, padHeight, 'F');
                    doc.setDrawColor(0);
                    doc.rect(x + blackOffset, blackYTop, blackPadWidth, padHeight, 'S');
                } else {
                    const midiBlack = baseMidi + octaveIndex * 12 + mapped;
                    const blackHighlighted = highlightNotes.includes(midiBlack);
                    if (blackHighlighted) {
                        doc.setFillColor(160, 210, 255); // blue highlight
                    } else {
                        doc.setFillColor(245, 245, 245); // subtle grey for non-highlighted top pads
                    }
                    doc.rect(x + blackOffset, blackYTop, blackPadWidth, padHeight, 'F');
                    doc.setDrawColor(120);
                    doc.rect(x + blackOffset, blackYTop, blackPadWidth, padHeight, 'S');
                }

                // White pad (bottom row)
                const whiteHighlighted = highlightNotes.includes(midiWhite);
                if (whiteHighlighted) {
                    doc.setFillColor(160, 210, 255); // highlighted (use blue per request)
                } else {
                    doc.setFillColor(255, 255, 255); // white background
                }
                doc.rect(x, whiteYTop, squareSize, padHeight, 'F');
                doc.setDrawColor(120);
                doc.rect(x, whiteYTop, squareSize, padHeight, 'S');

                // Label under the white pad
                doc.setFontSize(7);
                doc.setTextColor(60);
                const label = `${NOTE_NAMES[midiWhite % 12]}${Math.floor(midiWhite / 12) - 1}`;
                doc.text(label, x + squareSize / 2, whiteYTop + padHeight + 9, { align: 'center' });
            }
        }

        // move ASCII tab down to sit under the pad rows (give a bit of spacing)
        const totalPadAreaHeight = rows * (2 * padHeight) + (rows - 1) * padRowGap;
        const tabY = padTopY + totalPadAreaHeight + 12;
         doc.setFontSize(12);
         doc.setTextColor(0);

         // Advance y to remain below the pad rows (keep spacing similar to previous layout).
         y = padTopY + totalPadAreaHeight + 18;
    } // end chords loop

    // Finalize PDF -> Blob
    const arrayBuffer = doc.output('arraybuffer');
    const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
    return blob;
}
