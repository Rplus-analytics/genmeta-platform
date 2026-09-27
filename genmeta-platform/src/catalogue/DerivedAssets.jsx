import { useMemo, useState } from 'react';
import { MessageSquarePlus } from 'lucide-react';
import { allEdges, BY_KEY, upstreamOf } from './model.js';
import { hopMethod, stageOfAsset } from './EndToEnd.jsx';
import EstateTiles from './EstateTiles.jsx';

const PURPOSE_KEY = 'lineage.purposes';
const readPurposes = () => { try { return JSON.parse(localStorage.getItem(PURPOSE_KEY) || '{}'); } catch { return {}; } };
const writePurposes = (o) => { try { localStorage.setItem(PURPOSE_KEY, JSON.stringify(o)); } catch { /* ignore */ } };

/* How a derived asset was created, from the method of its incoming edges. */
function howCreated(key) {
  const ins = upstreamOf(key);
  if (!ins.length) return 'not recorded';
  const methods = new Set(ins.map(hopMethod));
  if (methods.has('ingested')) return 'a pipeline that declares it';
  if (methods.has('parsed')) return 'its SQL, parsed';
  if (methods.has('inferred')) return 'inferred from names and columns';
  return 'not recorded';
}

export default function DerivedAssets() {
  const [purposes, setPurposes] = useState(readPurposes);
  const [editing, setEditing] = useState(null); // asset key
  const [draft, setDraft] = useState('');

  const rows = useMemo(() => {
    const derived = [...new Set(allEdges().map((e) => e.t))].map((k) => BY_KEY[k]).filter(Boolean);
    const list = derived.map((a) => {
      const deps = [...new Set(upstreamOf(a.key).map((e) => e.s))];
      const p = purposes[a.key];
      return { a, how: howCreated(a.key), deps, purpose: p ? p.text : '', purposeMeta: p };
    });
    // missing purpose first, then by name
    return list.sort((x, y) => (Number(!!x.purpose) - Number(!!y.purpose)) || x.a.key.localeCompare(y.a.key));
  }, [purposes]);

  const withPurpose = rows.filter((r) => r.purpose).length;
  const without = rows.length - withPurpose;

  const startEdit = (k) => { setEditing(k); setDraft(''); };
  const save = (k) => {
    const text = draft.trim();
    if (!text) { setEditing(null); return; }
    const next = { ...purposes, [k]: { text, by: 'Admin', at: new Date().toISOString().slice(0, 10) } };
    setPurposes(next); writePurposes(next); setEditing(null);
  };

  return (
    <div className="e2e">
      <EstateTiles />
      <div className="card pad-lg ml-card">
        <h3 className="sec-h">Derived and user-created assets</h3>
        <p className="e2e-synopsis">
          {rows.length} derived asset(s); {withPurpose} say why they exist, {without} do not. How an asset was built is in the code and the history. Why it exists, what it is for and who answers for it are not — those are asked of the person who made it and shown as missing until they answer.
        </p>
        <div className="e2e-hop-wrap">
          <table className="tbl da-table">
            <thead>
              <tr><th>Asset</th><th>How it was created</th><th>Depends on</th><th>Business purpose</th><th>Owner</th><th className="da-act-h">&nbsp;</th></tr>
            </thead>
            <tbody>
              {rows.map(({ a, how, deps, purpose, purposeMeta }) => (
                <tr key={a.key} className="static">
                  <td><code className="mono">{a.key}</code><div className="da-stage">{stageOfAsset(a)}</div></td>
                  <td className="ml-how">{how}</td>
                  <td className="da-deps">{deps.length ? deps.join(', ') : <span className="da-none">nothing recorded</span>}</td>
                  <td>
                    {purpose
                      ? <span className="da-purpose">{purpose}<small> — {purposeMeta.by}, {purposeMeta.at}</small></span>
                      : editing === a.key
                        ? (
                          <div className="da-editor" onClick={(e) => e.stopPropagation()}>
                            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Why does this asset exist? What is it for?" rows={2} autoFocus />
                            <div className="da-editor-btns">
                              <button className="btn primary sm" onClick={() => save(a.key)}>Save</button>
                              <button className="btn ghost sm" onClick={() => setEditing(null)}>Cancel</button>
                            </div>
                          </div>
                        )
                        : <span className="da-none">not recorded</span>}
                  </td>
                  <td className="da-owner">{a.owner || '—'}</td>
                  <td className="da-act">
                    {!purpose && editing !== a.key && (
                      <button className="btn ghost sm" onClick={() => startEdit(a.key)}><MessageSquarePlus size={13} />Say why</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
