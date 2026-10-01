# Data products: research notes (Atlan) and what GenMeta copies

## What Atlan has (from Karan's screenshots and Atlan docs)
- **Domains and sub-domains** in a left tree (for example, Finance contains Forecasting, Loans and Order Management). There is also an "Overview" link and a "Draft products" link with a count.
- **Domain tabs:**
  - **Overview:** readme, custom metadata sections and score.
  - **Assets and Products:** search, filters for asset type, domains, source, owners and tags, a sort option, and product cards.
  - **Statistics:** a summary (total products, sub-domains, total assets, domain list), products by status, products by enrichment (with certificate, with description and with status, each with "N remaining →"), products created over time, and usage.
  - **Lineage.**
- **Product card:** name, a verified tick, domain chip, description (shown in full on hover), output ports count and a score.
- **Product fields:**
  - name, up to 80 characters
  - description
  - domain or sub-domain
  - criticality: High, Medium or Low
  - sensitivity: Public, Internal or Confidential
  - owners
  - visibility: private to domain members, private to selected members, or public
  - assets, added by picker or by rules
  - output ports and input ports
- **Statuses:** Draft (owners only), Published, Sunset (planned retirement) and Archived.
- **Creating a product:** Details → Assets → Output ports → Review → "Save as draft" or "Create and publish".
- **Product score (0–5):** built from six principles:
  - Discoverable: glossary terms
  - Understandable: descriptions and readme
  - Addressable: owners
  - Secure: sensitivity and tags
  - Interoperable: lineage
  - Trustworthy: certificates and contracts
- **Product profile:**
  - summary: domain, criticality, sensitivity, description and freshness
  - score with "view details"
  - status dropdown
  - announcements
  - output ports
  - readme
  - resources and collaboration links (Slack, Jira)
  - assets
  - lineage
  - changelog
  - star and notify

Sources: docs.atlan.com ("Create data products", "What are data products", "What is a product score") and atlan.com demos (data products overview page, product profiles).

## What GenMeta adds on top (already in the old GenMeta UI)
- Recommended candidates ranked from real usage. Example: Order Master, queried 32 times in 30 days, candidate score 59. Each one has a "Create" button.
- Service levels for freshness, availability and quality, with a "Meeting" or "Breaching" status and owner alerts.
- Marketplace access requests, which the owner approves or declines.

## Kept from today's new UI
- The same 6 products, with their owners, descriptions, consumers, sources and quality: Customer 360, Finance Ledger, Casework Insights, Web Engagement, Document Index and Streaming Orders.

## Demo-only values in the prototype
- Domain names, criticality, sensitivity, scores, ports, service levels and the Sunset status on Document Index are demo values chosen to show every state. Replace them with real data when the API is ready.
