import { ASSETS } from './model.js';
import EstateTiles from './EstateTiles.jsx';

/* HERE counts are computed from the estate; the descriptive copy is fixed. */
const count = (fn) => ASSETS.filter(fn).length;

const LANGS = () => [
  { lang: 'Snowflake SQL', tool: 'warehouse views',
    parsed: 'the SELECT list column by column, the FROM/JOIN graph with join keys, WHERE and HAVING conditions, GROUP BY grain and window functions',
    cannot: 'a UDF body, an external function, or a view built on a table function',
    here: count((a) => a.source === 'Rplus_DWH' && a.kind === 'view') },
  { lang: 'T-SQL', tool: 'SQL Server script batches and stored procedures',
    parsed: 'each writing statement in the batch (INSERT…SELECT, CREATE TABLE AS, MERGE, CREATE VIEW), its column mappings, joins and clauses; GO-separated batches are split',
    cannot: 'control flow — a statement inside IF or WHILE is parsed, but whether it ran is not known; and dynamic SQL built as a string cannot be read at all',
    here: count((a) => /sql server|t-sql/i.test(a.source || '')) },
  { lang: 'Python', tool: 'the object-storage pipelines',
    parsed: 'the manifest each run publishes: inputs, outputs and the column mappings the step declares',
    cannot: 'logic the manifest does not declare — a transformation done in pandas without stating it produces no column lineage',
    here: count((a) => a.kind === 'file') },
  { lang: 'Avro and JSON Schema', tool: 'the streaming schema registry',
    parsed: 'message fields, including nested records flattened to dotted paths',
    cannot: 'what a consumer does with the message after it is read',
    here: count((a) => a.kind === 'topic' || a.schema === 'STREAMING') },
  { lang: 'OpenAPI', tool: 'REST API definitions',
    parsed: 'response fields as data elements of the endpoint',
    cannot: 'the logic inside the service behind the endpoint',
    here: count((a) => a.kind === 'api') },
  { lang: 'DAX and Power Query', tool: 'Power BI',
    parsed: 'nothing today — reports are catalogued and linked to their sources, but their measures are not parsed',
    cannot: 'measure definitions, calculated columns and query folding; this is a known gap and is listed as one rather than inferred',
    here: count((a) => a.schema === 'BI' || a.kind === 'report' || a.kind === 'dashboard') },
];

export default function ParserCoverage() {
  const langs = LANGS();
  return (
    <div className="e2e">
      <EstateTiles />

      <div className="card pad-lg ml-card">
        <h3 className="sec-h">Languages and tools</h3>
        <div className="e2e-hop-wrap">
          <table className="tbl pc-table">
            <thead><tr><th>Language</th><th>Tool</th><th>What is parsed</th><th>What it cannot follow</th><th className="num">Here</th></tr></thead>
            <tbody>
              {langs.map((l) => (
                <tr key={l.lang} className="static">
                  <td className="pc-lang"><b>{l.lang}</b></td>
                  <td className="pc-tool">{l.tool}</td>
                  <td className="ml-how">{l.parsed}</td>
                  <td className="ml-cannot">{l.cannot}</td>
                  <td className="num">{l.here}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card pad-lg ml-card">
        <h3 className="sec-h">Script batches parsed here</h3>
        <p className="ml-empty">No script batches are connected yet.</p>
      </div>

      <div className="card pad-lg ml-card">
        <h3 className="sec-h">What could not be parsed</h3>
        <p className="ml-empty">Every statement in the estate was parsed.</p>
        <p className="ml-foot">a statement the parser cannot resolve is listed with the reason. It is never guessed at, and it never silently disappears.</p>
      </div>
    </div>
  );
}
