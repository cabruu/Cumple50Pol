export const BLOCKED_WORDS: string[] = [
];

function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // saca acentos/tildes
    .replace(/[@]/g, "a")
    .replace(/[4]/g, "a")
    .replace(/[3]/g, "e")
    .replace(/[1!]/g, "i")
    .replace(/[0]/g, "o")
    .replace(/[$5]/g, "s")
    .replace(/[^a-z0-9\s.:/]/g, "") // saca símbolos raros pero deja . : / para detectar links
    .replace(/\s+/g, " ")
    .trim();
}

export interface ModerationResult {
  blocked: boolean;
  matchedWord?: string;
}

// Revisa un texto (o varios concatenados) contra la lista de bloqueados.
export function checkBlockedWords(...texts: string[]): ModerationResult {
  const normalized = normalize(texts.join(" "));
  // saca espacios para detectar trucos tipo "b o l u d o"
  const squished = normalized.replace(/\s+/g, "");

  for (const word of BLOCKED_WORDS) {
    const normalizedWord = normalize(word);
    const squishedWord = normalizedWord.replace(/\s+/g, "");
    if (!normalizedWord) continue;
    if (normalized.includes(normalizedWord) || squished.includes(squishedWord)) {
      return { blocked: true, matchedWord: word };
    }
  }
  return { blocked: false };
}
