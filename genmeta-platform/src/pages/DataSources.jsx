import { useState } from 'react';
import { Cover } from '../components/Loader.jsx';
import sourcesHtml from '../../public/sources/index.html?raw';

/* Data sources (public/sources/index.html): connected sources, connectors, marketplace,
   metadata changes and bulk import. It keeps its own styles and script, so it runs in a
   frame that fills the content area. Local dev serves it as a page; the hosted
   single-file build (VITE_TARGET=artifact) inlines it via srcdoc. */
const HOSTED = import.meta.env.VITE_TARGET === 'artifact';

export default function DataSources() {
  const [ready, setReady] = useState(false);
  return (
    <div className="sources-frame">
      {HOSTED
        ? <iframe title="Data sources" srcDoc={sourcesHtml} onLoad={() => setReady(true)} />
        : <iframe title="Data sources" src="/sources/index.html" onLoad={() => setReady(true)} />}
      {!ready && <Cover label="Loading data sources" />}
    </div>
  );
}
