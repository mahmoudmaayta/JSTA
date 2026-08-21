/**
 * bidi-js ships no type declarations. This covers only the part of its API the
 * PDF renderer uses: resolving Unicode bidi embedding levels for a string.
 */
declare module "bidi-js" {
  interface EmbeddingLevels {
    /** One level per UTF-16 code unit; odd values are right-to-left. */
    levels: Uint8Array;
    /** Ranges of characters removed by the algorithm (explicit formatting controls). */
    paragraphs: Array<{ start: number; end: number; level: number }>;
  }

  interface Bidi {
    getEmbeddingLevels(text: string, explicitDirection?: "ltr" | "rtl"): EmbeddingLevels;
    /**
     * UBA rule L4: characters in right-to-left runs that need their glyph
     * mirrored, as a map of string index to the replacement character.
     */
    getMirroredCharactersMap(
      text: string,
      /** The raw levels array, not the object getEmbeddingLevels returns. */
      levels: Uint8Array,
      start?: number,
      end?: number
    ): Map<number, string>;
  }

  export default function bidiFactory(): Bidi;
}
