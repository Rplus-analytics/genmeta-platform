import { BY_KEY } from './model.js';

/* Attribute granularity for the graph's focused asset. Sits full-width below
   the Column mappings panel and re-reads on refocus. Uses the same column
   metadata the Columns tab uses (name, type, nullable, classification):
   ASSETS[…].columns, built in model.js from RAW.columns. */
export default function AttributeGranularity({ assetKey }) {
  const a = BY_KEY[assetKey];
  if (!a) return null;
  const cols = a.columns || [];
  const clsList = (c) => (c.cls ? (Array.isArray(c.cls) ? c.cls : [c.cls]) : []);
  const classified = cols.filter((c) => clsList(c).length > 0).length;

  return (
    <section className="card attr-panel">
      <div className="attr-head">
        <b className="attr-title">Attribute Granularity</b>
        <p className="attr-meta">{cols.length} attribute{cols.length === 1 ? '' : 's'} · {classified} classified</p>
      </div>

      {cols.length ? (
        <div className="attr-table-wrap">
          <table className="tbl attr-table">
            <thead>
              <tr><th>Column</th><th>Type</th><th>Nullable</th><th>Classification</th></tr>
            </thead>
            <tbody>
              {cols.map((c) => {
                const classes = clsList(c);
                return (
                  <tr key={c.name} className="static">
                    <td className="attr-col">{c.name}</td>
                    <td className="attr-type">{c.type}</td>
                    <td className="attr-null">{c.nullable ? 'yes' : 'no'}</td>
                    <td>
                      {classes.length
                        ? classes.map((x) => <span key={x} className="attr-cls">{x}</span>)
                        : <span className="attr-dash">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="attr-empty">No attribute metadata recorded for this asset.</p>
      )}
    </section>
  );
}
