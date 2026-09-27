# Knowledge graph — content from the old UI (dev.genmeta.rplusanalytics.co.uk)

Captured 27 Sep 2026 from /galaxy and /graph-explorer on the old UI. Rebuild all of this in the new UI (blue/navy tokens, existing components). Use the existing demo data (src/catalogue-data.json, src/data.js) — its counts already match the old UI (50 assets, 326 columns, 6 sources).

## 1. Galaxy (old: /galaxy)

Header: "Galaxy" — "A visual map of your data estate — explore how sources, assets and business entities are connected."

KPI strip (5 tiles, each with an info tooltip = its sub-label):
- Assets 50 — Tables, views, files and topics
- Sources 6 — Connected source platforms
- Layers 11 — Schemas and processing stages
- Columns 326 — Catalogued field definitions
- Sensitive assets 37 — Inferred from column names

Card "Knowledge Graph" with a Graph / List toggle:
- Search box "Search a source, asset or entity…" + source dropdown ("All sources", then each source)
- Source chips with logos: Rplus_DWH, Rplus Streaming (Confluent), Rplus Amazon S3, Rplus Reports (Power BI), Rplus API (Rest API), Rplus Petstore API (Petstore API)
- Hint: "Click any node to focus its neighbourhood · hover to trace · filter by type below"
- Graph view: nodes for platforms, databases, buckets, schemas (INT, PRL, SRC, STG, STREAMING, S3_RAW, S3_CLN, S3_ENR, BI, API, PETSTORE_API_API), tables/views/files/topics, BI reports, API endpoints, business entities (Customer, Order), classifications (PII, SPECIAL_CATEGORY, FINANCIAL, COMMERCIAL, CREDENTIAL), policies (Data Protection / PII Policy, SPECIAL_CATEGORY Policy, Financial Data Handling Policy, COMMERCIAL Policy, CREDENTIAL Policy), AI consumers (GenMeta Assistant, Downstream AI / ML), owners (Rajesh, PK, Raghav)
- Filter chips by type with counts + Clear / All: Platform 3, Database 1, Bucket 1, Schema 11, Table 33, View 10, Topic 1, File 6, Entity 2, Owner 3, Policy 5, Classification 5, AI Consumption 2
- Note: "Business entity links are inferred from shared keys; only lineage edges represent data movement."
- Reset view button
- List view: table ASSET | SOURCE | TYPE (e.g. INT.CUSTOMER · Rplus_DWH · view; SRC.CUSTOMER · table; STREAMING.customer-value · topic; S3_RAW.CUSTOMER · file; BI.Customer 360 Dashboard · dashboard; API.GET_customers · api …)

Card "Asset details": empty state "Select an asset in the graph or table to explore its details." Fills when a node/row is selected.

Collapsible "Platform capabilities and graph changes" with 3 panels, each with Table view / JSON view / Refetch icons and its endpoint:
- Tile statistics — GET /api/tiles/stats → { tiles: 11, assets: 50, columns: 326, pii_columns: 73, financial_columns: 28, coverage_pct: 0.86 }
- Agnostic capabilities — GET /api/capabilities/agnostic → "Evidence source not connected for this module"
- Graph delta — GET /api/graph/delta → "Evidence source not connected for this module"

Also keep the current new-UI Knowledge graph picture (hub + sources + tables, hover a system to trace) — it belongs in Galaxy.

## 2. Graph explorer (old: /graph-explorer)

Header: "Graph Explorer" — "One graph over everything the platform knows — business terms, technical assets, the policies and classifications that govern them, the checks run against them and the products and models built on them. Expand anything, follow a lineage path, ask what a change would affect, and see where a label would inherit."

KPI strip (4): 429 Things in the graph (387 technical · 36 governance · 6 business) · 642 Relationships (5 kinds) · 1101 ms To build it (rebuilt as the estate changes) · 16 Things the shape flags (unowned, ungoverned or isolated)

Six tabs:
1. Explore — "Start from" input (placeholder "asset:SRC.CUSTOMER · term:customer · policy:pol-…"), Depth select (1 hop / 2 hops / 3 hops, default 2). Empty state: "Name a node to expand it — or pick one from a search result." Result: the node's neighbourhood to that depth. (Old UI returns an API error here — the new one must work with demo data.)
2. Search by meaning — "Find" input (placeholder "what are you looking for?", default "customer personal data"), button "Search the graph". Results: matching nodes ranked by meaning, each clickable to open in Explore.
3. What-if — "If this changed" input (asset:SRC.CUSTOMER), button "What would it affect?". Result: impact level (e.g. medium), summary "85 thing(s) depend on SRC.CUSTOMER: 85 technical", table AFFECTED | KIND | CLASS | HOPS AWAY.
4. Propagation — "From" input (asset:SRC.CUSTOMER), "Label" input (uk-gsc:official-sensitive), button "Where would it reach?". Explainer: "a label follows flows_to and contains edges. Something that already carries the label keeps its own and passes the inheritance on; an override stops that branch entirely, and nothing beyond it inherits". Result lists "Would inherit it (84)" — name — N hop(s) through contains/flows_to: path — and "Stopped (1)" — ORDER_ID — overridden here: Aggregated beyond identification — agreed with the DPO.
5. What the shape says — Methods line: "degree centrality for hubs; label propagation for communities; neighbourhood overlap (Jaccard) for similarity and discovery; embedding similarity (Amazon Titan, in this region) for meaning." Badge "embeddings live (amazon.titan-embed-text-v2:0)". Lists: Hubs (PRL.ORDER_MASTER 49 view, PETSTORE_API_API 38 dataset, PII 33 classification, STG.CUSTOMER_ORDER 26 view, STG.ORDER_ITEM_SUMMARY 26 view, Raghav 25 person, STG.CUSTOMER_ORDER_LIVE_RPLUS 25 view, FINANCIAL 23 classification); Flagged by the shape (INT.CUSTOMER, INT.ORDERS, PRL.ORDER_MASTER, SRC.CUSTOMER, SRC.ORDERS, STG.CUSTOMER_ORDER, STG.CUSTOMER_ORDER_LIVE_RPLUS, STG.ORDER_ITEM_SUMMARY, STREAMING.customer-value, S3_RAW.CUSTOMER — "sensitive but ungoverned: no policy, standard or control applies to it"); Relationships worth recording ("None suggested.").
6. Architecture & scale —
   The model: native (labelled property graph — nodes and edges both carry properties); rdf (RDF 1.1 Turtle); jsonld (JSON-LD 1.1 with a published context, OWL/RDFS semantics); package (Frictionless tabular data package); why (property graph kept natively because relationships carry attributes; RDF/JSON-LD exports open it to other tools).
   What it holds — CLASS | MEANS | NODES: business / What the organisation means / 6; technical / What physically exists / 387; governance / What is required of it / 36; assurance / What has been checked / 0; operational / What it is used for / 0.
   RELATIONSHIP | MEANS | EDGES: contains 426; flows_to 17; defines 50; owned_by 67; classified_as 82; governed_by 0; measured_by 0; published_as 0; trained_on 0; assessed_by 0 (with the "means" text for each, e.g. contains = a system holds a dataset, a dataset holds an asset, an asset holds a column).
   Flexibility (3 bullets): derived from the harvest and governance modules on every build, never a second copy that can drift; new source/scheme/policy/product adds nodes and edges without a schema migration — types are data, not columns; anything not yet connected contributes no nodes — the graph degrades to what is known.
   Scale: "429 nodes and 642 edges, built in 1101 ms; a two-hop query returned 96 nodes in 11 ms." Button "Run a scale test at 10×".
