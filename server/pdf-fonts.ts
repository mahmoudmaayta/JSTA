import fs from "fs";
import path from "path";
import bidiFactory from "bidi-js";

/**
 * PDFKit's built-in fonts are Latin-only: Arabic text passed to Helvetica is
 * encoded through WinAnsi and comes out as mojibake. Cairo (SIL OFL, the same
 * family the web UI loads from Google Fonts) is embedded so the Arabic office
 * names on these documents render as Arabic.
 *
 * Regenerate with:
 *   curl -A "Mozilla/5.0" "https://fonts.googleapis.com/css2?family=Cairo:wght@400&subset=arabic,latin"
 *   # then download the .ttf URL from the returned @font-face block
 */
const FONT_DIR = path.join(process.cwd(), "server", "assets", "fonts");

export const BODY = "body";
export const BODY_BOLD = "body-bold";
export const BODY_ITALIC = "body-italic";

const regularPath = path.join(FONT_DIR, "Cairo-Regular.ttf");
const boldPath = path.join(FONT_DIR, "Cairo-Bold.ttf");

const embeddedFontsAvailable = fs.existsSync(regularPath) && fs.existsSync(boldPath);

if (!embeddedFontsAvailable) {
  console.warn(
    `[pdf] Cairo fonts missing from ${FONT_DIR}; falling back to Helvetica. Arabic text will not render correctly.`
  );
}

/** Registers the document fonts. Falls back to Helvetica if the files are absent. */
export function registerDocumentFonts(doc: PDFKit.PDFDocument): void {
  if (embeddedFontsAvailable) {
    doc.registerFont(BODY, regularPath);
    doc.registerFont(BODY_BOLD, boldPath);
    // Cairo has no italic; the oblique is only used for footnotes, so reuse regular.
    doc.registerFont(BODY_ITALIC, regularPath);
    return;
  }
  doc.registerFont(BODY, "Helvetica");
  doc.registerFont(BODY_BOLD, "Helvetica-Bold");
  doc.registerFont(BODY_ITALIC, "Helvetica-Oblique");
}

const ARABIC_RANGE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

export function hasArabic(text: string): boolean {
  return ARABIC_RANGE.test(text);
}

const bidi = bidiFactory();

interface DirectionalRun {
  /** Text in logical order. */
  text: string;
  /** Unicode bidi embedding level; odd is right-to-left. */
  level: number;
}

/**
 * Splits text into directional runs and orders them the way they should appear
 * on the page, using the Unicode Bidirectional Algorithm for the levels.
 *
 * Each run keeps its text in *logical* order: PDFKit's shaper reverses the
 * glyphs inside a right-to-left run itself, so reversing here as well would
 * undo it. Only the order of the runs is resolved at this level.
 */
function toVisualRuns(text: string): DirectionalRun[] {
  const { levels } = bidi.getEmbeddingLevels(text);

  // UBA rule L4: a bracket inside a right-to-left run is drawn with its mirror,
  // so "مكتب (الأردن)" keeps its parentheses pointing inwards.
  let display = text;
  const mirrored = bidi.getMirroredCharactersMap(text, levels);
  if (mirrored.size > 0) {
    const units = text.split("");
    mirrored.forEach((replacement, index) => {
      units[index] = replacement;
    });
    display = units.join("");
  }

  const runs: DirectionalRun[] = [];
  let start = 0;
  for (let i = 1; i <= display.length; i++) {
    if (i === display.length || levels[i] !== levels[start]) {
      runs.push({ text: display.slice(start, i), level: levels[start] });
      start = i;
    }
  }
  if (runs.length < 2) return runs;

  // UBA rule L2, applied per run since every character in a run shares a level:
  // from the highest level down to the lowest odd level, reverse each contiguous
  // stretch of runs at or above that level.
  const allLevels = runs.map((r) => r.level);
  const maxLevel = Math.max(...allLevels);
  const oddLevels = allLevels.filter((l) => l % 2 === 1);
  const minOddLevel = oddLevels.length > 0 ? Math.min(...oddLevels) : maxLevel + 1;

  for (let level = maxLevel; level >= minOddLevel; level--) {
    let i = 0;
    while (i < runs.length) {
      if (runs[i].level < level) {
        i++;
        continue;
      }
      let end = i;
      while (end + 1 < runs.length && runs[end + 1].level >= level) end++;
      const slice = runs.slice(i, end + 1).reverse();
      runs.splice(i, slice.length, ...slice);
      i = end + 1;
    }
  }

  return runs;
}

/**
 * Draws one right-to-left run, placing each whitespace-delimited token
 * explicitly from the right edge leftwards.
 *
 * PDFKit shapes Arabic correctly and reverses the glyphs, but the spaces
 * between words end up one position out — "مكتب الأردن للسياحة" renders as
 * "للسياحة الأردنمكتب". Handing the shaper one token at a time avoids that;
 * inside a token the shaping is already right.
 */
function drawRtlRun(doc: PDFKit.PDFDocument, text: string, x: number, y: number): number {
  const tokens = text.split(/(\s+)/).filter((t) => t.length > 0);
  const widths = tokens.map((t) => doc.widthOfString(t));
  const total = widths.reduce((sum, w) => sum + w, 0);

  let cursor = x + total;
  tokens.forEach((token, i) => {
    cursor -= widths[i];
    if (token.trim().length > 0) {
      doc.text(token, cursor, y, { lineBreak: false });
    }
  });

  return total;
}

/** Width the text will occupy once laid out. */
export function measureText(doc: PDFKit.PDFDocument, text: string): number {
  if (!hasArabic(text)) return doc.widthOfString(text);
  return toVisualRuns(text).reduce(
    (sum, run) =>
      sum +
      (run.level % 2 === 1
        ? run.text.split(/(\s+)/).filter((t) => t.length > 0).reduce((s, t) => s + doc.widthOfString(t), 0)
        : doc.widthOfString(run.text)),
    0
  );
}

/**
 * Draws text at (x, y) with mixed-script segments in the right visual order,
 * returning the width it occupied. Does not wrap — callers place their own lines.
 */
export function drawText(doc: PDFKit.PDFDocument, text: string, x: number, y: number): number {
  if (!hasArabic(text)) {
    doc.text(text, x, y, { lineBreak: false });
    return doc.widthOfString(text);
  }

  let cursor = x;
  for (const run of toVisualRuns(text)) {
    if (run.level % 2 === 1) {
      cursor += drawRtlRun(doc, run.text, cursor, y);
    } else {
      doc.text(run.text, cursor, y, { lineBreak: false });
      cursor += doc.widthOfString(run.text);
    }
  }
  return cursor - x;
}

/** Draws text centred within [left, right], honouring script direction. */
export function drawCentered(
  doc: PDFKit.PDFDocument,
  text: string,
  left: number,
  right: number,
  y: number
): number {
  const width = measureText(doc, text);
  return drawText(doc, text, left + (right - left - width) / 2, y);
}
