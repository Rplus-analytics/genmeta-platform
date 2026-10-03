# Governance: what the market leaders do, and what GenMeta copied (Oct 2026)

Research behind v2 of the Governance section (Governance overview, Policies, DPIA, Access).
Each section takes one pattern from the leader that does it best and leaves the rest of the old UI as it was.

| Section | Leader | Their pattern | What GenMeta now does |
|---|---|---|---|
| Governance overview | **Microsoft Purview Compliance Manager** | A compliance score built from points for each improvement action (preventative mandatory 27, discretionary 9; detective 3/1), a score per assessment or regulation, and improvement actions you can assign, track and attach evidence to | A **Compliance score** ring with a score per framework (UK GDPR, DPA 2018, ISO 27001, NCSC CAF, HMRC residency) and an **Improvement actions** list (owner, due date, status, points, how to implement, evidence). Passing an action raises the score straight away. Each control shows its next action. |
| Governance overview | **Collibra** (governance metrics) | One view across policies, privacy and access, with the gaps to close | Three section cards (Policies, DPIA & GDPR, Access) with their key numbers, each linking to its section |
| Residency | Purview data map | Where data is, grouped by location | Three region cards: in the UK, outside but disclosed, no region established |
| Policies | **Collibra Policy Manager** | Regulation → section → requirement traceability; a lifecycle with approval; the compliance and risk phases | A **By regulation** view, a lifecycle stepper (draft → in review → approved → active) with Submit / Approve / Activate, a **Traceability** tab (comes from → this item → governs) and version history |
| Policies | **Alation Policy Center** | Search and facets, with owners and review dates up front | Search, type chips with counts, a status filter, Owner and Next review columns, and **Gaps to close** (no owner, not linked, no regulation) |
| DPIA | **OneTrust Privacy Operations** | Guided workflow, data map, risk register with an inherent vs residual heatmap | A **guided path** (find personal data → record processing → fix rules → assess → accountability pack), filters and a "where personal data sits" summary on the map, and a **risk heatmap** (inherent / residual) |
| DPIA | **ICO DPIA template** | Likelihood (remote, possible, probable) × severity (minimal, significant, severe) → low, medium or high; measures with effect (eliminated, reduced, accepted), residual risk and approval | An **assessment workspace**: suggested risks per domain, the ICO scales, measures and residual risk, sign-off that stays blocked until DPO advice, the acceptor and every measure are in place, and stage moves (Completion → DPO review → Approval → Approved) |
| Access | **Microsoft Entra access reviews** | Recurring review campaigns; reviewers approve, deny or answer "don't know"; recommendations from last sign-in; results applied in one step | A new **Access reviews** tab: a quarterly campaign for Restricted grants, a keep/revoke recommendation from last use, Accept recommendations, and Apply results |
| Access | **Atlan** personas, purposes and policies | Personas define what a role sees; any deny overrides; masking driven by data policies | A **Who can see what** matrix (role × sensitivity: full, masked, request) and the access check shown as a **decision trace** (role → policy → grants → each rule, any deny wins) |

## Sources
- Microsoft Purview, Compliance Manager scoring: https://learn.microsoft.com/purview/compliance-manager-scoring
- Microsoft Purview, Compliance Manager: https://learn.microsoft.com/en-ca/purview/compliance-manager
- Collibra Policy Manager: https://productresources.collibra.com/docs/collibra/2024.02/Content/PolicyManager/to_policy-manager.htm
- Alation Governance App: https://docs.alation.com/en/latest/steward/GovernanceApp
- OneTrust Privacy Operations: https://www.onetrust.com/it/products/privacy-operations/
- ICO DPIA template (Annex D): https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/annex-d-dpia-template/
- Microsoft Entra access reviews: https://learn.microsoft.com/en-us/entra/id-governance/access-reviews-overview
- Atlan, design access and personas: https://docs.atlan.com/product/capabilities/governance/access-control/best-practices/design-access-and-personas
