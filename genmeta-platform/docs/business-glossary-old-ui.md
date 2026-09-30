# Business glossary — content from the old UI (genmeta.rplusanalytics.co.uk → Data Catalogue → Business Glossary tab)

Captured 30 Sep 2026. Rebuild ALL of this in the new UI. Nothing below may be dropped.

## Page context (old UI)
- Lives as a tab of Data Catalogue: tabs "Assets | Business Glossary | Classification".
- Catalogue KPI "Linked to terms 29 — 14 glossary terms" points at it.

## Toolbar
- Search box: "Search terms, definitions or synonyms…"
- Status filter: All statuses / Approved / In review / Draft / Deprecated
- Button: "New term" → form: Name, Domain, Owner, Steward, Custodian, Synonyms (; separated), Definition → "Create term" (new terms start as Draft)

## Term list (grouped: domain term with its child terms nested under it)
Each term row: expand chevron, name, status badge, domain chip, "N linked", delete icon; drafts also have a "Submit" button.
Row body: definition, then Owner / Steward / Custodian / Synonyms.

Terms (name · status · domain · linked · definition · owner/steward/custodian · synonyms):
- Compliance Check 20306 · Approved · Customer · 3 · "Edited during requirement testing to prove terms can be managed." · Rajesh / Priya / Platform Ops · Verification term
- Customer · Approved · Customer · 20 · "A person or organisation that holds a relationship with the department and can be identified across systems." · Rajesh / Rajesh / —
  - Customer Order · Draft · Customer · 1 · "Working definition for Customer Order, pending review."
  - Customer Order Live Rplus · Draft · Customer · 1 · "Working definition for Customer Order Live Rplus, pending review."
  - Customer Orders · Draft · Customer · 2 · "Working definition for Customer Orders, pending review."
- Orders · Approved · Orders · 18 · "A request placed by a customer that is recorded, priced and fulfilled through the order pipeline." · PK / PK / —
  - Lineitem · Draft · Orders · 2 · "Working definition for Lineitem, pending review."
  - Order Item Summary · Draft · Orders · 1 · "Working definition for Order Item Summary, pending review."
  - Order Master · Draft · Orders · 1 · "Working definition for Order Master, pending review."
- Product · Approved · Product · 6 · "A distinct item or service that can be ordered, priced and supplied." · Raghav / Raghav / —
  - Part · Draft · Product · 2 · "Working definition for Part, pending review."
- Reference · Approved · Reference · 6 · "Shared lookup data used to standardise values across systems, such as country or nation codes." · Raghav / Raghav / —
  - Nation · Draft · Reference · 2 · "The country reference used to locate a customer or supplier."
- Supplier · Approved · Supplier · 6 · "An organisation that provides goods or services and is paid against agreed terms." · Raghav / Raghav / —
- Taxpayer Reference · Approved · Customer · 0 · "The unique reference used to identify a taxpayer record." · Rajesh / Priya / Platform Ops · UTR

## Expanded term (example: Customer)
- Inline edit form: Definition (textarea), Owner, Steward, Custodian, Synonyms (; separated), Business rules (; separated), Usage examples (; separated), Notes ("Seeded from the harvested catalogue; edit to make it authoritative.") → "Save changes" (disabled until something changes)
- Business rules: "A customer must have a unique customer identifier." · "Customer name and contact details are personal data and are restricted."
- Usage examples: "“How many customers are in the Restricted tier?”" · "Used by the customer 360 view to join orders to a single customer record."
- Linked assets (20), as chips: INT.CUSTOMER, SRC.CUSTOMER, STG.CUSTOMER_ORDER, STG.CUSTOMER_ORDER_LIVE_RPLUS, STREAMING.customer-value, S3_RAW.CUSTOMER, S3_CLN.CUSTOMER, S3_ENR.CUSTOMER_ORDERS, S3_ENR.CUSTOMER_SUMMARY, SQL_CLN.CUSTOMER, SQL_ENR.CUSTOMER_ORDERS, SQL_ENR.CUSTOMER_SUMMARY, INT.CUSTOMER.CUSTOMER_ID, INT.CUSTOMER.CUSTOMER_NAME, SRC.CUSTOMER.CUSTOMER_ID, SRC.CUSTOMER.CUSTOMER_NAME, STG.CUSTOMER_ORDER.ORDER_ID, STG.CUSTOMER_ORDER.CUSTOMER_ID, STG.CUSTOMER_ORDER_LIVE_RPLUS.ORDER_ID, STG.CUSTOMER_ORDER_LIVE_RPLUS.CUSTOMER_ID
- History: "17/09/2026, 20:17:09 · system · Derived from 12 harvested asset(s)"

## Right column
1. Glossary summary: Approved 7 · In review 0 · Draft 8 · Linked assets 28 · "Stored in Amazon S3."
2. Approvals & notifications: list of drafts "Draft awaiting submission" (Customer Order, Customer Order Live Rplus, Customer Orders, Lineitem, Nation, Order Item Summary, …) each with a send/submit icon. Footer: "Approval needs: governance-lead or product-owner. You are governance-lead."
3. Traceability: "71 term-to-asset links across 5 source systems." Rows term → asset + source, e.g. Compliance Check 20306 → BI.Customer 360 Dashboard (Rplus Reports (Power BI)); Compliance Check 20306 → INT.CUSTOMER (Rplus_DWH); Compliance Check 20306 → INT.CUSTOMER.CUSTOMER_ID (Rplus_DWH); Customer → INT.CUSTOMER / INT.CUSTOMER.CUSTOMER_ID / INT.CUSTOMER.CUSTOMER_NAME (Rplus_DWH); Customer → S3_CLN.CUSTOMER / S3_ENR.CUSTOMER_ORDERS (Rplus Amazon S3). Footer: "Unlinked terms: Taxpayer Reference".
4. Recent activity (term · change · timestamp · who):
   - Compliance Check 20306 · Changed assets, columns, reports · 18/09/2026, 09:31:47 · tester
   - Compliance Check 20306 · in_review → approved · 18/09/2026, 09:31:47 · jane
   - Compliance Check 20306 · draft → in_review · 18/09/2026, 09:31:47 · tester
   - Taxpayer Reference · in_review → approved · 17/09/2026, 20:21:09 · jane
   - Taxpayer Reference · draft → in_review · 17/09/2026, 20:21:08 · tester
   - Taxpayer Reference · Changed business_rules, usage_examples · 17/09/2026, 20:21:08 · tester

## Workflow
Draft → (Submit) → In review → (Approve / Reject by governance-lead or product-owner) → Approved → Deprecated. Every change is written to Recent activity and the term's History.
