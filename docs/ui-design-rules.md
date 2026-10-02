# GenMeta UI design rules (read before building any page)

Source of truth: `src/pro.css`, `src/styles.css`, `src/components/ui.jsx`.
Reference pages: Business glossary, Data catalogue, Data quality.
Never copy CSS from a prototype or from `public/sources/index.html`.
Never add a new colour, font size, radius or shadow. Use the tokens below.

## Page frame
- Every page sits inside `InnerLayout` and starts with `<PageHead eyebrow title sub>` (from `components/ui.jsx`).
  - The eyebrow is the section, e.g. "Discover" or "Data assets".
  - The title is 28px/600, the sub-text 14px muted, with a line under the head.
  - Primary actions go in PageHead `children` (right side).
- There are no extra strips or bars between the top bar and PageHead.
- Content wrapper: `.page` (24px 32px padding). Gap between blocks: 16px.

## Type
- The font is Hanken Grotesk everywhere. JetBrains Mono is only for asset names, SQL, IDs and fingerprints, at 12px via `.mono`.
- Section heading: `.block-head h2` 17px/600. Card heading: `.card-head h2` 15px/600, with `.block-sub` 13px muted below.
- Body 13.5px. Table cells 13.5px. Table headers 12px/500 muted. Footnotes 12.5px muted.
- No letter-spacing except the eyebrow.

## Colour (tokens only)
- `--navy` text and primary buttons.
- `--muted` secondary text. `--faint` hints.
- `--royal` links, active states and focus.
- `--ice` selected and hover fill. `--mist` row hover.
- `--line` and `--line2` borders. White cards on the `--canvas` background.
- No gradients, no tinted banners, no coloured squares as icons. Icons are lucide outline, 16px, `--muted` (or `--royal` when active).

## Components
- KPIs: `.tiles-sm` row (value 22px/600, label 13px/600, sub 12px muted). One row, full width, never inside another card.
- Cards: `.card` or `.dash-card` (12px radius, `--shadow-1`, 18px 20px padding). Never nest a card inside a card.
- Tables: `.table-wrap > table.tbl`. No inner bordered boxes, no cell backgrounds. Selected rows use `--ice`.
- Buttons: `<Button variant="primary|secondary|subtle|link" size="md|sm">`. One primary per page.
- Segmented control: `<Segmented>` (`.seg2`). Tabs: `<Tabs>`.
- Status: `<Badge tone>` / `<Status>`. Small labels: `.tag`.
- Selects and inputs: `.select` / `.input` at 32px high (`--h-md`). No native date pickers.
- Inner menu: `admin-link` items, as on Data assets. Search box: the glossary inner-menu search.

## Check before you finish
Open the new page next to Business glossary at 1440px. Headings, tiles, tables, buttons and spacing should be indistinguishable.
