/** Mutable dictionary for Letter Walker legality checks (loaded by Board; tests inject a small set). */
let dictionary = new Set<string>();

export function parseDictionaryText(text: string): string[] {
  const out: string[] = [];
  for (const line of text.split('\n')) {
    const w = line.trim().toLowerCase();
    if (w.length >= 3 && w.length <= 8) out.push(w);
  }
  return out;
}

export function setLetterWalkerDictionary(words: Iterable<string>): void {
  dictionary = new Set(
    [...words].map((w) => w.toLowerCase()).filter((w) => w.length >= 3 && w.length <= 8),
  );
}

export function clearLetterWalkerDictionary(): void {
  dictionary = new Set();
}

export function isDictionaryWord(word: string): boolean {
  return dictionary.has(word.toLowerCase());
}

export function dictionarySize(): number {
  return dictionary.size;
}
