import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AssetFilterBar from './AssetFilterBar.jsx';
import LineageGraph from './LineageGraph.jsx';
import ColumnMappings from './ColumnMappings.jsx';
import AttributeGranularity from './AttributeGranularity.jsx';
import EndToEnd from './EndToEnd.jsx';
import MethodsLimits from './MethodsLimits.jsx';
import DerivedAssets from './DerivedAssets.jsx';
import Impact from './Impact.jsx';
import TraceColumn from './TraceColumn.jsx';
import Rules from './Rules.jsx';
import Structures from './Structures.jsx';
import ParserCoverage from './ParserCoverage.jsx';
import RootCause from './RootCause.jsx';

const SUBTABS = [
  ['graph', 'Graph'], ['end-to-end', 'End to end'], ['methods-limits', 'Methods & limits'],
  ['derived-assets', 'Derived assets'], ['impact', 'Impact'], ['trace', 'Trace a column'],
  ['rules', 'Rules'], ['structures', 'Structures'], ['parser', 'Parser coverage'], ['root-cause', 'Root cause'],
];
const VALID_SUBS = new Set(SUBTABS.map((s) => s[0]));

/* Filter bar + [Graph | End to end | …] sub-tabs. The sub-tab lives in the URL
   (?lineage=…) so a refresh stays put. */
export default function LineageSection({ a, onOpenAsset }) {
  const [sp, setSp] = useSearchParams();
  const rawSub = sp.get('lineage');
  const sub = VALID_SUBS.has(rawSub) ? rawSub : 'graph';
  const setSub = (v) => setSp((prev) => { const n = new URLSearchParams(prev); n.set('lineage', v); return n; }, { replace: true });

  // Mirror the graph's focused asset so the Column mappings panel can follow it,
  // and hold a handle to drive refocus when a chip in the panel is clicked.
  const graphRef = useRef(null);
  const [graphFocus, setGraphFocus] = useState(a.key);
  useEffect(() => { setGraphFocus(a.key); }, [a.key]);

  return (
    <div className="lineage-section">
      <AssetFilterBar a={a} query={`lineage=${sub}`} />

      <nav className="asset-tabs lin-subtabs" role="tablist">
        {SUBTABS.map(([k, label]) => (
          <button key={k} role="tab" aria-selected={sub === k} className={sub === k ? 'on' : ''} onClick={() => setSub(k)}>{label}</button>
        ))}
      </nav>

      {sub === 'graph' ? (
        <>
          <LineageGraph ref={graphRef} focusKey={a.key} onOpenAsset={onOpenAsset} onFocusChange={setGraphFocus} />
          <ColumnMappings assetKey={graphFocus} onFocus={(k) => graphRef.current?.refocus(k)} />
          <AttributeGranularity assetKey={graphFocus} />
        </>
      ) : sub === 'end-to-end' ? <EndToEnd assetKey={a.key} />
        : sub === 'methods-limits' ? <MethodsLimits />
        : sub === 'derived-assets' ? <DerivedAssets />
        : sub === 'impact' ? <Impact assetKey={a.key} />
        : sub === 'trace' ? <TraceColumn assetKey={a.key} />
        : sub === 'rules' ? <Rules assetKey={a.key} />
        : sub === 'structures' ? <Structures />
        : sub === 'parser' ? <ParserCoverage />
        : sub === 'root-cause' ? <RootCause assetKey={a.key} />
        : <EndToEnd assetKey={a.key} />}
    </div>
  );
}
