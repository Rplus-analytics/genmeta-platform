import { useState } from 'react';
import { Play, RotateCcw, FileCode2 } from 'lucide-react';
import { analyzeCode, generatePlainEnglish, generateConversion } from './heuristics.js';
import { CodeBlock, Steps, Metric, Toggle } from './shared.jsx';

const SAMPLE = `CREATE PROCEDURE dbo.sp_award_recon_weekly
AS
BEGIN
  DECLARE recon_cursor CURSOR FOR
    SELECT award_id, claimant_nino, amount_paid FROM BEN_AWARD
    WHERE recon_flag = 1

  OPEN recon_cursor
  FETCH NEXT FROM recon_cursor INTO @award_id, @nino, @amount_paid

  WHILE @@FETCH_STATUS = 0
  BEGIN
    IF @amount_paid > 500.00
      SET @tier = 'REVIEW'
    ELSE IF @amount_paid > 100.00
      SET @tier = 'STANDARD'
    ELSE
      SET @tier = 'AUTO'

    UPDATE AWARD_RECON_LEDGER SET tier = @tier, checked_date = GETDATE()
    WHERE award_id = @award_id

    FETCH NEXT FROM recon_cursor INTO @award_id, @nino, @amount_paid
  END

  CLOSE recon_cursor
END`;

const TARGETS = [['english', 'Plain English'], ['python', 'Python'], ['pyspark', 'PySpark'], ['sql', 'Modern SQL']];
const FILES = { python: 'converted.py', pyspark: 'converted_job.py', sql: 'converted.sql' };

const run = (text) => (text.trim() ? { text, analysis: analyzeCode(text) } : null);

export default function Converter() {
  const [input, setInput] = useState(SAMPLE);
  const [result, setResult] = useState(() => run(SAMPLE)); // opens in a populated state
  const [target, setTarget] = useState('english');

  const analyze = () => setResult(run(input));
  const loadSample = () => { setInput(SAMPLE); setResult(run(SAMPLE)); };
  const clear = () => { setInput(''); setResult(null); };

  const a = result?.analysis;

  return (
    <div className="ca-conv">
      <section className="card ca-conv-input">
        <header className="card-head">
          <div><h2>Your code</h2><p>Paste a stored procedure, script or job: SQL, PL/SQL or procedural code.</p></div>
        </header>
        <div className="ca-conv-tools">
          <button type="button" className="btn ghost sm" onClick={loadSample}><FileCode2 size={13} />Load sample</button>
          <button type="button" className="btn ghost sm" onClick={clear}><RotateCcw size={13} />Clear</button>
          <button type="button" className="btn primary sm ca-push" onClick={analyze} disabled={!input.trim()}><Play size={13} />Analyze code</button>
        </div>
        <textarea
          className="ca-textarea"
          spellCheck={false}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); analyze(); } }}
          placeholder="Paste code here, then select Analyze code (Ctrl+Enter)."
          aria-label="Code to analyze"
        />
      </section>

      <section className="card ca-conv-out">
        <header className="card-head">
          <div><h2>Analysis</h2><p>Demo heuristics. A real deployment analyzes an AST against the metadata graph.</p></div>
        </header>
        {!a ? (
          <p className="ca-empty">Paste some code and select <b>Analyze code</b> to see its complexity, PII exposure and a drafted conversion.</p>
        ) : (
          <div className="ca-conv-body">
            <div className="ca-metrics two">
              <Metric label="Lines of code" value={a.loc} sub="non-blank lines" />
              <Metric label="Estimated complexity" value={a.complexity} sub={`${a.branchCount} branches · ${a.cursorCount} cursors`} level={a.complexityLevel} />
              <Metric label="Processing style" value={a.rowByRow ? 'Row-by-row' : 'Set-based'} sub={a.rowByRow ? 'modernization candidate' : 'already efficient'} level={a.rowByRow ? 'warn' : 'good'} />
              <Metric label="Personal data" value={a.piiHits.length ? `${a.piiHits.length} field(s)` : 'None found'} sub={a.piiHits.length ? a.piiHits.join(', ') : 'pattern scan only'} level={a.piiHits.length ? 'crit' : 'good'} />
              <Metric label="Conversion confidence" value={`${a.confidence}%`} sub="demo heuristic estimate" level="good" />
            </div>

            <h4 className="ca-label">Detected patterns</h4>
            <ul className="ca-patterns">{a.patterns.map((p, i) => <li key={i}>{p}</li>)}</ul>

            <div className="ca-modern-head">
              <Toggle label="Output" options={TARGETS} value={target} onChange={setTarget} />
            </div>
            {target === 'english'
              ? <Steps steps={generatePlainEnglish(a, result.text)} compact />
              : <CodeBlock lines={generateConversion(a, target)} file={FILES[target]} />}
          </div>
        )}
      </section>
    </div>
  );
}
