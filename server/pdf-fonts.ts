import fs from "fs";
import path from "path";

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

const ARABIC_RANGE = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;

export function hasArabic(text: string): boolean {
  return ARABIC_RANGE.test(text);
}

/**
 * Draws a run of Arabic text at (x, y), returning the width it occupied.
 *
 * PDFKit shapes Arabic correctly and reverses the glyph run, but the spaces
 * between words end up one position out — "مكتب الأردن للسياحة" renders as
 * "للسياحة الأردنمكتب". Positioning each word explicitly, right to left,
 * sidesteps that: within a word the shaping is already correct.
 */
function drawRtlRun(doc: PDFKit.PDFDocument, text: string, x: number, y: number): number {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;

  const spaceWidth = doc.widthOfString(" ");
  const widths = words.map((word) => doc.widthOfString(word));
  const total = widths.reduce((sum, w) => sum + w, 0) + spaceWidth * (words.length - 1);

  let cursor = x + total;
  words.forEach((word, i) => {
    cursor -= widths[i];
    doc.text(word, cursor, y, { lineBreak: false });
    cursor -= spaceWidth;
  });

  return total;
}

/**
 * Draws text at (x, y) in the correct direction for its script, returning the
 * width it occupied. Does not wrap — callers place their own lines.
 */
export function drawText(doc: PDFKit.PDFDocument, text: string, x: number, y: number): number {
  if (hasArabic(text)) {
    return drawRtlRun(doc, text, x, y);
  }
  doc.text(text, x, y, { lineBreak: false });
  return doc.widthOfString(text);
}

/** Draws text centred within [left, right], honouring script direction. */
export function drawCentered(
  doc: PDFKit.PDFDocument,
  text: string,
  left: number,
  right: number,
  y: number
): number {
  const width = hasArabic(text)
    ? text.trim().split(/\s+/).filter(Boolean).reduce(
        (sum, w, i) => sum + doc.widthOfString(w) + (i > 0 ? doc.widthOfString(" ") : 0),
        0
      )
    : doc.widthOfString(text);
  return drawText(doc, text, left + (right - left - width) / 2, y);
}
