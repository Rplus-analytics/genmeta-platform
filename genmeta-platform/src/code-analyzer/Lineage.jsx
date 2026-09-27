import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { lineageFlows, getJob } from './data.js';
import { CodeBlock, Steps } from './shared.jsx';

/* Source table(s) -> transformation -> target table, drawn as SVG. Each
   transformation node is an analyzed job: clicking it opens a drawer with the
   code and plain-English breakdown behind that lineage edge. */

const ROW_H = 150;
const NODE_W = 176;
const NODE_H = 52;
const TF_W = 198;
const TG_W = 188;
const COL_SOURCE = 16;
const COL_TRANSFORM = 372;
const COL_TARGET = 706;

function TableNode({ x, y, w, node }) {
  return (
    <g className="ca-ln-table">
      <rect x={x} y={y} width={w} height={NODE_H} rx="8" />
      <text x={x + w / 2} y={y + 22} textAnchor="middle" className="ca-ln-title">{node.label}</text>
      <text x={x + w / 2} y={y + 38} textAnchor="middle" className="ca-ln-sub">{node.sub}</text>
    </g>
  );
}

function Flow({ flow, row, onOpen }) {
  const yTop = row * ROW_H + 24;
  const ySrc1 = yTop;
  const ySrc2 = yTop + 76;
  const yMid = yTop + 30;
  const srcRight = COL_SOURCE + NODE_W;
  const cy = yMid + NODE_H / 2;
  const t = flow.transform;
  const key = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(t.id); } };
  return (
    <g>
      <g className="ca-ln-edges">
        <line x1={srcRight} y1={ySrc1 + NODE_H / 2} x2={COL_TRANSFORM - 2} y2={cy - 10} markerEnd="url(#ca-arrow)" />
        <line x1={srcRight} y1={ySrc2 + NODE_H / 2} x2={COL_TRANSFORM - 2} y2={cy + 10} markerEnd="url(#ca-arrow)" />
        <line x1={COL_TRANSFORM + TF_W} y1={cy} x2={COL_TARGET - 2} y2={cy} markerEnd="url(#ca-arrow)" />
      </g>
      <TableNode x={COL_SOURCE} y={ySrc1} w={NODE_W} node={flow.sources[0]} />
      <TableNode x={COL_SOURCE} y={ySrc2} w={NODE_W} node={flow.sources[1]} />
      <g className="ca-ln-transform" tabIndex={0} role="button" aria-label={`View code for ${t.label}`} onClick={() => onOpen(t.id)} onKeyDown={key}>
        <rect x={COL_TRANSFORM} y={yMid} width={TF_W} height={NODE_H} rx="10" />
        <text x={COL_TRANSFORM + TF_W / 2} y={yMid + 22} textAnchor="middle" className="ca-ln-title">{t.label}</text>
        <text x={COL_TRANSFORM + TF_W / 2} y={yMid + 38} textAnchor="middle" className="ca-ln-sub">{t.sub}</text>
      </g>
      <TableNode x={COL_TARGET} y={yMid} w={TG_W} node={flow.target} />
    </g>
  );
}

function Drawer({ flow, open, onClose }) {
  const job = flow ? getJob(flow.transform.jobId) : null;
  return (
    <>
      <div className={`ca-backdrop${open ? ' open' : ''}`} onClick={onClose} />
      <aside className={`ca-drawer${open ? ' open' : ''}`} aria-hidden={!open} role="dialog" aria-label={flow ? flow.transform.label : 'Transformation'}>
        {job && (
          <>
            <header className="ca-drawer-head">
              <div>
                <h3>{flow.transform.label}</h3>
                <div className="ca-path">{flow.sources.map((s) => s.label).join(' + ')} → {flow.target.label}</div>
                <div className="chips">
                  <span className="chip">{job.language}</span>
                  <span className="chip">Authored {job.authored}</span>
                  <span className="chip">Complexity {job.metrics.complexity}</span>
                  {job.pii && <span className={`chip ca-pii ${job.pii.level}`}>PII · {job.pii.detail}</span>}
                </div>
              </div>
              <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><X size={16} /></button>
            </header>
            <div className="ca-drawer-body">
              <h4 className="ca-label">Code</h4>
              <CodeBlock lines={job.code} maxHeight={340} />
              <h4 className="ca-label">Plain English</h4>
              <Steps steps={job.plainEnglish} compact />
            </div>
          </>
        )}
      </aside>
    </>
  );
}

export default function Lineage() {
  const [openId, setOpenId] = useState(null);
  const [open, setOpen] = useState(false);
  const show = (id) => { setOpenId(id); setOpen(true); };
  const close = () => setOpen(false);
  const flow = lineageFlows.find((f) => f.transform.id === openId) || null;
  const height = lineageFlows.length * ROW_H + 40;

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <section className="card ca-lineage">
        <header className="card-head">
          <div>
            <h2>Custom lineage</h2>
            <p>Source tables flow through a transformation into a target table. Each transformation is a real analyzed job; select one to open its code and plain-English breakdown.</p>
          </div>
          <div className="ca-legend">
            <span><i className="tbl" />Table</span>
            <span><i className="tf" />Transformation</span>
          </div>
        </header>
        <div className="ca-lineage-wrap">
          <svg viewBox={`0 0 920 ${height}`} width="100%" role="img" aria-label="Custom lineage diagram: source tables into a transformation into a target table">
            <defs>
              <marker id="ca-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 Z" className="ca-ln-arrow" />
              </marker>
            </defs>
            {lineageFlows.map((f, i) => <Flow key={f.id} flow={f} row={i} onOpen={show} />)}
          </svg>
        </div>
        <p className="ca-caption">Lineage resolved automatically from GenMeta's metadata knowledge graph, with no manual tagging. Select a navy transformation node to inspect the code behind it.</p>
      </section>
      <Drawer flow={flow} open={open} onClose={close} />
    </>
  );
}
