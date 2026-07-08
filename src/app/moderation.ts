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
  "negro",
  "gordo",
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
  "fuck",
  "shit",
  "bitch",
  "nigger",
  "nigga",
  "retard",
  "faggot",
  "http://",
  "https://",
  "www.",
  ".com",
  "onlyfans",
  "descargar gratis",
  "gordo",
  "hijo de puta", "cocaina",
  "joputa", "hijoputa", "pene", "vagina", "masturbarse", "gay", "gey", "gei",
  "pajero", "pajear", "squirt", "hot", "cachondo", "poronga", "autista", "coño", "conio",
  "escupeme", "escupime", "tetonas", "tetas", "teticas", "sexo", "putito", "putazo",
  "pinga", "pingo", "picha", "nalga", "porno", "polla", "follar", "follame", "dick", "culos",
  "nepe", "pija", "chupa pija", "chupame el pico", "chupa pico", "chupapi", "putero", "consolador",
  "cojones", "teton", "cock", "cariñosas", "violacion", "weon",
  "huevon", "verga", "pichula", "hazme un hijo", "pussy", "punto g", "qlo", "masturba", "joto",
  "tula", "chupamela", "gilipollas", "hdp", "hpta", "guaton", "me corro",
  "pete", "vibrador", "gemir", "gemido", "nudes", "dildo"
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
