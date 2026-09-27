import { useState } from 'react';
import { Download, Send } from 'lucide-react';
import { jobs, getJob } from './data.js';
import { CodeBlock, Steps, Metric, ReviewNotes, Toggle } from './shared.jsx';

const EXT = (lang) => (lang.startsWith('PL/SQL') ? '.pls' : lang.startsWith('COBOL') ? '.cbl' : lang.startsWith('Korn') ? '.ksh' : '.sql');
const PANELS = [['code', 'Original code'], ['english', 'Plain English'], ['modern', 'Modernized code']];
const LANGS = [['python', 'Python'], ['pyspark', 'PySpark'], ['sql', 'Modern SQL']];

export default function JobExplorer() {
  const [jobId, setJobId] = useState(jobs[0].id);
  const [panel, setPanel] = useState('code');
  const [lang, setLang] = useState('python');
  const job = getJob(jobId);
  const m = job.metrics;
  const modern = job.modernized[lang];

  const pick = (id) => { setJobId(id); setLang('python'); };

  return (
    <div className="ca-explorer">
      <aside className="card ca-jobs">
        <div className="ca-jobs-head"><h3>Analyzed jobs</h3><span className="ca-count">{jobs.length}</span></div>
        <div className="ca-job-list">
          {jobs.map((j) => (
            <button key={j.id} type="button" className={`ca-job${j.id === jobId ? ' on' : ''}`} onClick={() => pick(j.id)} aria-pressed={j.id === jobId}>
              <span className="ca-job-name">{j.name}</span>
              <span className="ca-job-meta">
                <i className={`ca-dot ${j.status}`} aria-hidden="true" />
                {j.statusLabel} · {j.language.split('·')[0].trim()} · {j.authored.split(' ').pop()}
              </span>
            </button>
          ))}
        </div>
        <p className="ca-jobs-foot">
          <b>Corpus scanned:</b> 1,842 objects across 6 legacy warehouses. Ingested from GenMeta's metadata graph, with column lineage and job schedules pre-linked.
        </p>
      </aside>

      <div className="ca-detail">
        <header className="ca-job-head">
          <div className="ca-job-title">
            <h2>{job.name}</h2>
            <div className="ca-path">{job.path}</div>
            <div className="chips">
              <span className="chip">{job.language}</span>
              <span className="chip">Authored {job.authored}</span>
              <span className="chip">Last modified {job.modified}</span>
              <span className="chip">Owner: {job.owner}</span>
              {job.pii && <span className={`chip ca-pii ${job.pii.level}`}>PII detected · {job.pii.detail}</span>}
            </div>
          </div>
          <div className="head-actions">
            <button type="button" className="btn ghost"><Download size={14} />Export report</button>
            <button type="button" className="btn primary"><Send size={14} />Send to modernization queue</button>
          </div>
        </header>

        <div className="ca-metrics">
          <Metric label="Executions / day" value={m.execPerDay} sub={m.execSub} />
          <Metric label="Avg runtime" value={m.avgRuntime} sub={m.runtimeSub} level={m.avgRuntimeLevel} />
          <Metric label="Rows processed / day" value={m.rowsPerDay} sub={m.rowsSub} />
          <Metric label="Error rate" value={m.errorRate} sub={m.errorSub} level={m.errorLevel} />
          <Metric label="Cyclomatic complexity" value={m.complexity} sub={m.complexitySub} level={m.complexityLevel} />
          <Metric label="Modernization confidence" value={`${m.confidence}%`} sub="auto-translatable" level="good" />
        </div>

        <section className="card ca-panel">
          <div className="tabs ca-subtabs" role="tablist">
            {PANELS.map(([k, t]) => (
              <button key={k} type="button" role="tab" aria-selected={panel === k} className={panel === k ? 'on' : ''} onClick={() => setPanel(k)}>{t}</button>
            ))}
          </div>

          <div className="ca-panel-body">
            {panel === 'code' && (
              <div className="ca-code-wrap">
                <CodeBlock lines={job.code} file={job.name + EXT(job.language)} />
                <div className="ca-annos">
                  {job.annotations.map((a, i) => (
                    <div key={i} className={`ca-anno${a.risk ? ' risk' : ''}`}>
                      <span className="ca-anno-line">{a.line}{a.risk && ' · risk'}</span>
                      <p>{a.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {panel === 'english' && <Steps steps={job.plainEnglish} />}

            {panel === 'modern' && (
              <>
                <div className="ca-modern-head">
                  <Toggle label="Target language" options={LANGS} value={lang} onChange={setLang} />
                  <div className="cov ca-conf">
                    <span>Translation confidence</span>
                    <div className="cov-bar"><i style={{ width: `${m.confidence}%` }} /></div>
                    <b>{m.confidence}%</b>
                  </div>
                </div>
                <CodeBlock lines={modern.code} file={modern.file} />
                <ReviewNotes notes={job.reviewNotes} />
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
