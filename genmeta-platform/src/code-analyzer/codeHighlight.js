// codeHighlight.js
// Small, dependency-free tokenizer shared by every code panel on the Code
// Analyzer page (job explorer, lineage drawer and the converter).
//
// It tokenizes each line in a single pass and returns plain segments
// ({ cls, text }) — React renders them as text, so nothing is ever injected
// as HTML.

const KEYWORDS = [
  "CREATE PROCEDURE","PROCEDURE","AS","BEGIN","END","DECLARE","CURSOR FOR","CURSOR",
  "SELECT","FROM","WHERE","OPEN","FETCH NEXT FROM","FETCH","INTO","WHILE","SET","IF",
  "ELSE IF","ELSE","AND","OR","UPDATE","CLOSE","MERGE INTO","MERGE","USING","ON",
  "WHEN MATCHED THEN","WHEN NOT MATCHED THEN","WHEN","THEN","CASE","JOIN","LEFT JOIN",
  "INSERT INTO","INSERT","DELETE","COMMIT","LOOP","FOR","IN","RETURN","def","import",
  "from","return","for","if","elif","class","try","except"
].sort((a, b) => b.length - a.length); // longest first so multi-word phrases win

const TOKEN_SRC = [
  `'[^']*'`,                 // single-quoted string
  `"[^"]*"`,                 // double-quoted string
  `@\\w+`,                   // @variable
  `\\b(?:${KEYWORDS.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`,
  `\\b\\d+(?:\\.\\d+)?\\b`   // number
].join("|");

function classify(token) {
  if (/^'.*'$/.test(token) || /^".*"$/.test(token)) return "str";
  if (/^@/.test(token)) return "var";
  if (/^\d/.test(token)) return "num";
  return "kw";
}

/** Split one line of code into [{ cls, text }] segments (cls null = plain). */
export function tokenizeLine(raw) {
  const trimmed = raw.trim();
  if (trimmed.startsWith("--") || trimmed.startsWith("#") || trimmed.startsWith("//") || trimmed.startsWith('"""')) {
    return [{ cls: "com", text: raw }];
  }
  const re = new RegExp(TOKEN_SRC, "g");
  const out = [];
  let last = 0;
  let m;
  while ((m = re.exec(raw)) !== null) {
    if (m.index > last) out.push({ cls: null, text: raw.slice(last, m.index) });
    out.push({ cls: classify(m[0]), text: m[0] });
    last = m.index + m[0].length;
  }
  if (last < raw.length) out.push({ cls: null, text: raw.slice(last) });
  return out;
}

/** Normalise string[] | {t, risk?}[] | string into [{ t, risk }]. */
export function normalizeLines(lines) {
  const arr = typeof lines === "string" ? lines.split(/\r?\n/) : (lines || []);
  return arr.map(l => (typeof l === "string" ? { t: l, risk: false } : { t: l.t, risk: !!l.risk }));
}
