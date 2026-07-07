// ─── Moderación de contenido ────────────────────────────────────────────────
// Lista de términos bloqueados para el formulario. Editá este array para
// agregar o quitar palabras según necesites. No hace falta reiniciar nada,
// con guardar el archivo y volver a compilar/deployar alcanza.
//
// IMPORTANTE: esta misma lista existe DUPLICADA en el Apps Script (Code.gs)
// que hace de backend. Si agregás una palabra acá, agregala también allá,
// porque la validación que realmente importa (la que no se puede saltear)
// es la del servidor. Esta de acá es solo para avisarle al usuario al toque,
// sin esperar la respuesta del servidor.

export const BLOCKED_WORDS: string[] = [
  // Insultos y vulgaridades comunes (agregá las que necesites)
  "boludo",
  "pelotudo",
  "gil",
  "forro",
  "puto",
  "puta",
  "put0",
  "mierda",
  "mrd",
  "concha",
  "cornudo",
  "trolo",
  "negro de mierda",
  "sudaca",
  "retrasado",
  "retardado",
  "subnormal",
  "mongolico",
  "mongolo",
  "nazi",
  "hitler",
  "violador",
  "pedofilo",
  "pedófilo",
  // Inglés
  "fuck",
  "shit",
  "bitch",
  "nigger",
  "nigga",
  "retard",
  "faggot",
  // Spam / troll típico
  "http://",
  "https://",
  "www.",
  ".com",
  "onlyfans",
  "descargar gratis",
];

// Normaliza texto para que no se puedan esquivar los filtros con acentos,
// mayúsculas, espacios raros o reemplazos tipo leetspeak (@ por a, 0 por o, etc).
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
