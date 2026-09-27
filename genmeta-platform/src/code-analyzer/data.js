// data.js — mock dataset for the Code Analyzer page (ported from the standalone
// code-analyzer-app). In a real deployment this is served by GenMeta's metadata
// API; swap the static `jobs` / `lineageFlows` arrays for fetch() calls.
// reviewNotes[].icon is one of "warn" | "ok" | "note" (rendered as lucide icons).

export const jobs = [
  {
    id: "sp_ben_entitlement_calc",
    name: "sp_ben_entitlement_calc",
    path: "DWP_LEGACY_BENEFITS › dbo › stored_procedures",
    language: "T-SQL · SQL Server 2000",
    authored: "14 Mar 2001",
    modified: "02 Nov 2014",
    owner: "legacy_benefits_svc",
    status: "flag",
    statusLabel: "Flagged",
    pii: { level: "high", detail: "NINO, DOB" },
    metrics: {
      execPerDay: "214,308",
      execSub: "peak 09:00–10:30",
      avgRuntime: "340 ms",
      avgRuntimeLevel: "warn",
      runtimeSub: "p99 1.9 s",
      rowsPerDay: "1.24M",
      rowsSub: "claimant & award tables",
      errorRate: "0.02%",
      errorLevel: "good",
      errorSub: "42 failures / 30d",
      complexity: 37,
      complexityLevel: "crit",
      complexitySub: "high · 6 nested branches",
      confidence: 92
    },
    code: [
      { t: "CREATE PROCEDURE dbo.sp_ben_entitlement_calc" },
      { t: "AS" },
      { t: "BEGIN" },
      { t: "  -- Legacy benefits entitlement job. DO NOT MODIFY without sign-off (RB, 2001)." },
      { t: "  DECLARE @nino CHAR(9), @dob DATETIME, @age INT, @income MONEY, @band CHAR(1)" },
      { t: "" },
      { t: "  DECLARE claim_cursor CURSOR FOR", risk: true },
      { t: "    SELECT nino, date_of_birth FROM BEN_CLAIMANT WHERE review_flag = 1", risk: true },
      { t: "" },
      { t: "  OPEN claim_cursor" },
      { t: "  FETCH NEXT FROM claim_cursor INTO @nino, @dob" },
      { t: "" },
      { t: "  WHILE @@FETCH_STATUS = 0" },
      { t: "  BEGIN" },
      { t: "    SET @age = DATEDIFF(yy, @dob, GETDATE())" },
      { t: "    SELECT @income = income_value FROM HMRC_INCOME_FEED WHERE nino = @nino" },
      { t: "" },
      { t: "    IF @age < 25 AND @income < 1200.00" },
      { t: "      SET @band = 'A'" },
      { t: "    ELSE IF @age < 25" },
      { t: "      SET @band = 'B'" },
      { t: "    ELSE IF @income < 900.00" },
      { t: "      SET @band = 'C'" },
      { t: "    -- three more nested bands follow (D, E, F) — see complexity note" },
      { t: "" },
      { t: "    UPDATE BEN_ENTITLEMENT_LEDGER SET band = @band, calc_date = GETDATE()" },
      { t: "    WHERE nino = @nino" },
      { t: "" },
      { t: "    FETCH NEXT FROM claim_cursor INTO @nino, @dob" },
      { t: "  END" },
      { t: "" },
      { t: "  CLOSE claim_cursor" },
      { t: "END" }
    ],
    annotations: [
      { line: "Lines 7–8", risk: true, text: "Raw NINO and date of birth are read directly with no masking or column-level access control — flagged as a PII exposure risk under current GDS data handling guidance." },
      { line: "Lines 17–22", risk: false, text: "Entitlement banding is computed through five nested IF/ELSE blocks — the largest single source of the complexity score." },
      { line: "Lines 10–29", risk: false, text: "Cursor-based row-by-row update. Equivalent set-based logic would cut average runtime by an estimated 60–70%." }
    ],
    plainEnglish: [
      { title: "Pull today's claimant batch", tag: null, text: "For every claimant flagged as \"due for review\" today, fetch their record from the master claimant table, including National Insurance number and date of birth." },
      { title: "Work out how old they are", tag: null, text: "Calculate the claimant's current age from their date of birth, since age determines which benefit band applies." },
      { title: "Pull in their latest income", tag: null, text: "Look up their most recent income figure from the HMRC income feed table." },
      { title: "Decide which entitlement band they fall into", tag: "Complex logic", text: "Using age, income and existing award type, work through a chain of rules to land on one of six entitlement bands." },
      { title: "Calculate the weekly amount", tag: null, text: "Apply that band's rate table to work out the weekly payment amount, then apply any active deductions." },
      { title: "Write the result back, one claimant at a time", tag: "Performance risk", text: "Loop through the claimants one row at a time and write each entitlement to the ledger table — this row-by-row approach is what's slowing the job down." },
      { title: "Flag anything that needs a human to check it", tag: null, text: "Anything that doesn't cleanly match a band, or where income data is missing, gets written to an exceptions queue for manual review." }
    ],
    modernized: {
      python: {
        file: "calculate_entitlement.py",
        code:
`import pandas as pd
from genmeta.masking import mask_nino
from genmeta.rules import BAND_TABLE

def calculate_entitlement(claimants: pd.DataFrame,
                           income_feed: pd.DataFrame) -> pd.DataFrame:
    """Vectorised replacement for sp_ben_entitlement_calc (2001)."""
    due = claimants[claimants.review_flag == 1].copy()
    due["age"] = (pd.Timestamp.now() - due.date_of_birth).dt.days // 365

    merged = due.merge(income_feed, on="nino", how="left")
    merged["band"] = merged.apply(assign_band, axis=1)

    ledger = merged.assign(calc_date=pd.Timestamp.now())
    ledger["nino"] = mask_nino(ledger["nino"])
    return ledger[["nino", "band", "calc_date"]]

def assign_band(row) -> str:
    for band, rule in BAND_TABLE.items():
        if rule.matches(age=row.age, income=row.income_value):
            return band
    return "EXCEPTION"`
      },
      pyspark: {
        file: "calculate_entitlement_job.py",
        code:
`from pyspark.sql import functions as F
from genmeta.masking import mask_nino_col

def run(spark, claimants_df, income_df):
    due = claimants_df.filter(F.col("review_flag") == 1)
    due = due.withColumn(
        "age", F.datediff(F.current_date(), F.col("date_of_birth")) / 365
    )
    joined = due.join(income_df, on="nino", how="left")
    banded = joined.withColumn(
        "band",
        F.when((F.col("age") < 25) & (F.col("income_value") < 1200), "A")
         .when(F.col("age") < 25, "B")
         .when(F.col("income_value") < 900, "C")
         .otherwise("EXCEPTION")
    )
    banded = banded.withColumn("nino", mask_nino_col("nino"))
    (banded.select("nino", "band")
           .withColumn("calc_date", F.current_timestamp())
           .write.mode("append")
           .saveAsTable("ben_entitlement_ledger"))`
      },
      sql: {
        file: "calculate_entitlement.sql",
        code:
`-- Modern, set-based rewrite (ANSI SQL / SQL Server 2022)
MERGE INTO ben_entitlement_ledger AS tgt
USING (
    SELECT
        c.nino,
        DATEDIFF(year, c.date_of_birth, SYSDATETIME()) AS age,
        f.income_value,
        CASE
            WHEN age < 25 AND f.income_value < 1200.00 THEN 'A'
            WHEN age < 25                              THEN 'B'
            WHEN f.income_value < 900.00                THEN 'C'
            ELSE 'EXCEPTION'
        END AS band
    FROM ben_claimant AS c
    LEFT JOIN hmrc_income_feed AS f ON f.nino = c.nino
    WHERE c.review_flag = 1
) AS src
ON tgt.nino = src.nino
WHEN MATCHED THEN
    UPDATE SET band = src.band, calc_date = SYSDATETIME();
-- Access to nino is scoped via GenMeta's row-level masking view, not the base table.`
      }
    },
    reviewNotes: [
      { icon: "warn", text: "NINO and DOB are now pulled through GenMeta's masking layer — raw values are never held in this process's memory space." },
      { icon: "ok", text: "Nested banding logic reproduced as a testable rules table — same outputs verified against 14,203 historic rows." },
      { icon: "ok", text: "Row-by-row cursor replaced with a vectorised batch operation — projected runtime reduction ~65%." },
      { icon: "note", text: "Recommend a two-sprint parallel-run against production before cutover, per Rplus's Waterfall-governed / Agile-delivery mobilisation pattern." }
    ]
  },

  {
    id: "sp_customer_address_merge",
    name: "sp_customer_address_merge",
    path: "CRM_ORACLE_LEGACY › pkg_customer › procedures",
    language: "PL/SQL · Oracle 9i",
    authored: "22 Sep 2005",
    modified: "30 Apr 2018",
    owner: "crm_data_team",
    status: "done",
    statusLabel: "Analyzed",
    pii: { level: "med", detail: "Postal address" },
    metrics: {
      execPerDay: "48,120",
      execSub: "nightly batch, 02:15",
      avgRuntime: "1.8 s",
      avgRuntimeLevel: "warn",
      runtimeSub: "p99 6.4 s",
      rowsPerDay: "402K",
      rowsSub: "customer_raw + staging",
      errorRate: "0.4%",
      errorLevel: "warn",
      errorSub: "unmatched address pairs",
      complexity: 24,
      complexityLevel: "warn",
      complexitySub: "medium · fuzzy-match branches",
      confidence: 81
    },
    code: [
      { t: "CREATE OR REPLACE PROCEDURE pkg_customer.address_merge IS" },
      { t: "  CURSOR upd_cur IS", risk: true },
      { t: "    SELECT raw.customer_id, raw.address_line1, raw.postcode", risk: true },
      { t: "    FROM customer_raw raw", risk: true },
      { t: "    JOIN customer_updates_staging stg ON stg.customer_id = raw.customer_id;" },
      { t: "BEGIN" },
      { t: "  FOR rec IN upd_cur LOOP" },
      { t: "    IF UPPER(TRIM(rec.postcode)) != UPPER(TRIM(existing_postcode(rec.customer_id))) THEN" },
      { t: "      IF soundex_match(rec.address_line1, existing_address(rec.customer_id)) > 0.85 THEN" },
      { t: "        UPDATE customer_golden_record" },
      { t: "        SET address_line1 = rec.address_line1, postcode = rec.postcode, match_confidence = 0.9" },
      { t: "        WHERE customer_id = rec.customer_id;" },
      { t: "      ELSE" },
      { t: "        INSERT INTO address_review_queue (customer_id, reason) VALUES (rec.customer_id, 'LOW_CONFIDENCE');" },
      { t: "      END IF;" },
      { t: "    END IF;" },
      { t: "  END LOOP;" },
      { t: "  COMMIT;" },
      { t: "END;" }
    ],
    annotations: [
      { line: "Lines 2–5", risk: false, text: "Cursor joins the raw feed to the staging table row by row — no batching, so throughput degrades linearly with feed size." },
      { line: "Line 9", risk: false, text: "A hand-rolled SOUNDEX-style fuzzy match with a hardcoded 0.85 threshold — undocumented, and the threshold has never been revisited since 2005." },
      { line: "Line 13", risk: false, text: "Below-threshold matches fall into a manual review queue — 6–8% of nightly volume currently lands here." }
    ],
    plainEnglish: [
      { title: "Line up raw updates against existing customers", tag: null, text: "Join the incoming raw address feed to the staging table so each incoming record is paired with the customer it claims to update." },
      { title: "Check whether the postcode actually changed", tag: null, text: "Compare the incoming postcode to what's already on file — skip anything that hasn't changed." },
      { title: "Fuzzy-match the address text", tag: "Complex logic", text: "For genuine changes, score how similar the new address text is to the one on file using a similarity check." },
      { title: "Auto-apply confident matches", tag: null, text: "If the similarity score clears 0.85, update the golden record immediately with the new address." },
      { title: "Queue anything uncertain for a human", tag: "Performance risk", text: "Anything below that threshold is parked in a review queue rather than guessed at — currently 6–8% of nightly volume." }
    ],
    modernized: {
      python: {
        file: "merge_addresses.py",
        code:
`import pandas as pd
from rapidfuzz import fuzz

def merge_addresses(raw: pd.DataFrame, staging: pd.DataFrame,
                     golden: pd.DataFrame, threshold: float = 0.85):
    joined = raw.merge(staging, on="customer_id")
    joined = joined.merge(golden, on="customer_id", suffixes=("", "_existing"))

    changed = joined[joined.postcode.str.upper().str.strip()
                      != joined.postcode_existing.str.upper().str.strip()]

    changed["score"] = changed.apply(
        lambda r: fuzz.ratio(r.address_line1, r.address_line1_existing) / 100, axis=1
    )

    auto_apply = changed[changed.score > threshold]
    needs_review = changed[changed.score <= threshold]
    return auto_apply, needs_review`
      },
      pyspark: {
        file: "merge_addresses_job.py",
        code:
`from pyspark.sql import functions as F

def run(spark, raw_df, staging_df, golden_df, threshold=0.85):
    joined = (raw_df.join(staging_df, "customer_id")
                     .join(golden_df, "customer_id", "left")
                     .withColumnRenamed("postcode", "postcode_existing"))

    changed = joined.filter(
        F.upper(F.trim("postcode")) != F.upper(F.trim("postcode_existing"))
    )
    # similarity score would come from a registered UDF wrapping rapidfuzz
    scored = changed.withColumn("score", F.expr("address_similarity(address_line1, address_line1_existing)"))
    auto_apply = scored.filter(F.col("score") > threshold)
    needs_review = scored.filter(F.col("score") <= threshold)
    return auto_apply, needs_review`
      },
      sql: {
        file: "merge_addresses.sql",
        code:
`-- Set-based rewrite; SIMILARITY() assumed available via a registered function
MERGE INTO customer_golden_record AS tgt
USING (
    SELECT r.customer_id, r.address_line1, r.postcode,
           SIMILARITY(r.address_line1, g.address_line1) AS score
    FROM customer_raw r
    JOIN customer_updates_staging s ON s.customer_id = r.customer_id
    JOIN customer_golden_record g ON g.customer_id = r.customer_id
    WHERE UPPER(TRIM(r.postcode)) <> UPPER(TRIM(g.postcode))
) AS src
ON tgt.customer_id = src.customer_id AND src.score > 0.85
WHEN MATCHED THEN
    UPDATE SET address_line1 = src.address_line1, postcode = src.postcode, match_confidence = src.score;`
      }
    },
    reviewNotes: [
      { icon: "ok", text: "Row-by-row cursor replaced with a vectorised join + score, expected to cut nightly runtime from ~1.8 s/record batch to a single pass." },
      { icon: "note", text: "0.85 similarity threshold carried forward unchanged — flagged for the business to confirm it's still the right cut-off." },
      { icon: "ok", text: "Review-queue behaviour preserved exactly, so the 6–8% manual-review workflow downstream is unaffected." }
    ]
  }
];

// --- Custom lineage: two source tables → a transformation → one target table.
// Each transform node carries its own code, so clicking it in the UI opens
// the same code / plain-English / metrics view as the job explorer — this is
// the "custom lineage" GenMeta builds from any warehouse's job metadata.
export const lineageFlows = [
  {
    id: "flow-entitlement",
    sources: [
      { id: "ben_claimant", label: "BEN_CLAIMANT", sub: "318K rows" },
      { id: "hmrc_income_feed", label: "HMRC_INCOME_FEED", sub: "Nightly SFTP" }
    ],
    transform: {
      id: "sp_ben_entitlement_calc",
      label: "sp_ben_entitlement_calc",
      sub: "06:00 & 18:00 daily",
      jobId: "sp_ben_entitlement_calc" // links back into jobs[]
    },
    target: { id: "ben_entitlement_ledger", label: "BEN_ENTITLEMENT_LEDGER", sub: "feeds nightly BACS run" }
  },
  {
    id: "flow-customer",
    sources: [
      { id: "customer_raw", label: "CUSTOMER_RAW", sub: "inbound daily feed" },
      { id: "customer_updates_staging", label: "CUSTOMER_UPDATES_STAGING", sub: "1.1K rows/night" }
    ],
    transform: {
      id: "sp_customer_address_merge",
      label: "sp_customer_address_merge",
      sub: "02:15 nightly",
      jobId: "sp_customer_address_merge"
    },
    target: { id: "customer_golden_record", label: "CUSTOMER_GOLDEN_RECORD", sub: "feeds CRM + comms" }
  }
];

export function getJob(id) {
  return jobs.find(j => j.id === id) || jobs[0];
}
