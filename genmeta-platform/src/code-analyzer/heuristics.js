// heuristics.js
//
// A lightweight, pattern-based "engine" that stands in for GenMeta's real
// analysis pipeline (which parses an AST and joins against the metadata
// graph). It gives the demo believable output for arbitrary pasted code
// without needing a real compiler — swap analyzeCode() for a real API call
// when wiring this up to GenMeta's backend.

const PII_PATTERNS = [
  { re: /\bnino\b|national_insurance/i, label: "National Insurance number" },
  { re: /\bdob\b|date_of_birth|birth_?date/i, label: "Date of birth" },
  { re: /\bssn\b|social_security/i, label: "Social security number" },
  { re: /\bemail\b/i, label: "Email address" },
  { re: /\bpostcode\b|zip_?code/i, label: "Postal address" },
  { re: /\bcard_?number\b|\bpan\b/i, label: "Payment card number" }
];

function countMatches(text, re) {
  const m = text.match(re);
  return m ? m.length : 0;
}

export function analyzeCode(rawText) {
  const text = rawText || "";
  const lines = text.split(/\r?\n/);
  const loc = lines.filter(l => l.trim().length > 0).length;

  const cursorCount = countMatches(text, /\bCURSOR\b/gi);
  const loopCount = countMatches(text, /\bWHILE\b|\bFOR\b.*\bLOOP\b|\bfor\s+\w+\s+in\b/gi);
  const branchCount = countMatches(text, /\bIF\b|\bCASE\b|\bWHEN\b|\belif\b|\belse if\b/gi);
  const joinCount = countMatches(text, /\bJOIN\b/gi);
  const setOps = countMatches(text, /\bUPDATE\b|\bINSERT\b|\bDELETE\b|\bMERGE\b/gi);

  const piiHits = PII_PATTERNS.filter(p => p.re.test(text)).map(p => p.label);

  const rowByRow = cursorCount > 0 || /\bFOR\b.*\bLOOP\b/i.test(text);

  let complexity = branchCount * 3 + cursorCount * 6 + loopCount * 4 + joinCount * 2;
  complexity = Math.max(1, Math.min(99, complexity || (loc > 0 ? 4 : 0)));

  let complexityLevel = "good";
  if (complexity >= 30) complexityLevel = "crit";
  else if (complexity >= 12) complexityLevel = "warn";

  const patterns = [];
  if (cursorCount > 0) patterns.push(`${cursorCount} cursor${cursorCount > 1 ? "s" : ""} found — row-by-row processing rather than a set-based operation`);
  if (loopCount > 0 && cursorCount === 0) patterns.push(`${loopCount} explicit loop construct${loopCount > 1 ? "s" : ""} found`);
  if (branchCount > 0) patterns.push(`${branchCount} conditional branch${branchCount > 1 ? "es" : ""} detected — drives most of the complexity score`);
  if (joinCount > 0) patterns.push(`${joinCount} join${joinCount > 1 ? "s" : ""} across tables — check for missing indexes on join keys`);
  if (piiHits.length > 0) patterns.push(`Possible personal data referenced: ${piiHits.join(", ")}`);
  if (setOps > 0) patterns.push(`${setOps} write operation${setOps > 1 ? "s" : ""} (INSERT/UPDATE/DELETE/MERGE) — confirm target table(s) for lineage`);
  if (patterns.length === 0) patterns.push("No cursors, loops or branching detected — looks like a simple, mostly linear script");

  return {
    loc,
    complexity,
    complexityLevel,
    piiHits,
    rowByRow,
    branchCount,
    cursorCount,
    loopCount,
    joinCount,
    patterns,
    confidence: rowByRow || branchCount > 4 ? 76 : 90
  };
}

export function generatePlainEnglish(analysis, rawText) {
  const steps = [];
  const text = rawText || "";

  const sources = [...text.matchAll(/\bFROM\s+([a-zA-Z0-9_.]+)/gi)].map(m => m[1]);
  const targets = [...text.matchAll(/\b(?:UPDATE|INSERT INTO|MERGE INTO)\s+([a-zA-Z0-9_.]+)/gi)].map(m => m[1]);

  steps.push({
    title: "Reads its input",
    text: sources.length
      ? `Pulls data from ${[...new Set(sources)].slice(0, 4).join(", ")}.`
      : "Reads from at least one upstream table or feed (source not clearly named in the pasted snippet)."
  });

  if (analysis.piiHits.length > 0) {
    steps.push({
      title: "Touches personal data",
      tag: "Governance flag",
      text: `References fields that look like personal data (${analysis.piiHits.join(", ")}) — worth checking these are masked or access-controlled downstream.`
    });
  }

  if (analysis.branchCount > 0) {
    steps.push({
      title: "Applies conditional logic",
      tag: analysis.branchCount >= 5 ? "Complex logic" : null,
      text: `Works through ${analysis.branchCount} conditional branch${analysis.branchCount > 1 ? "es" : ""} to decide how each record should be handled.`
    });
  }

  if (analysis.rowByRow) {
    steps.push({
      title: "Processes records one at a time",
      tag: "Performance risk",
      text: "Uses a cursor or explicit loop rather than a set-based operation — this is usually the biggest lever for speeding the job up."
    });
  } else {
    steps.push({
      title: "Processes records as a batch",
      text: "No row-by-row cursor detected — this looks like a set-based operation already, which is good for performance."
    });
  }

  steps.push({
    title: "Writes its output",
    text: targets.length
      ? `Writes results to ${[...new Set(targets)].slice(0, 4).join(", ")}.`
      : "Writes results back to a downstream table (target not clearly named in the pasted snippet)."
  });

  return steps;
}

const TARGET_TEMPLATES = {
  python:
`import pandas as pd

def run(source_df: pd.DataFrame) -> pd.DataFrame:
    """Auto-drafted from the pasted source — review before use.
    Detected: {{PATTERNS}}
    """
    result = source_df.copy()
    # TODO: translate the branching / row logic above into
    # vectorised pandas operations (see the Plain English tab
    # for the step-by-step breakdown GenMeta extracted).
    return result`,
  pyspark:
`from pyspark.sql import functions as F

def run(spark, source_df):
    """Auto-drafted from the pasted source — review before use.
    Detected: {{PATTERNS}}
    """
    result = source_df
    # TODO: express the branching / row logic above as
    # withColumn(...) / F.when(...) chains.
    return result`,
  sql:
`-- Auto-drafted set-based rewrite — review before use.
-- Detected: {{PATTERNS}}
MERGE INTO target_table AS tgt
USING (
    SELECT * FROM source_table
    -- TODO: reproduce the branching logic above as CASE/WHEN here
) AS src
ON tgt.id = src.id
WHEN MATCHED THEN UPDATE SET /* mapped columns */
WHEN NOT MATCHED THEN INSERT /* mapped columns */;`
};

export function generateConversion(analysis, targetLang) {
  const template = TARGET_TEMPLATES[targetLang] || TARGET_TEMPLATES.python;
  const patternSummary = analysis.patterns.slice(0, 3).join("; ");
  return template.replace("{{PATTERNS}}", patternSummary);
}
