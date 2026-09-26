import { forwardRef, useEffect, useRef, useState } from 'react';
import { Cover } from './Loader.jsx';
import estateHtml from '../../public/estate/index.html?raw';

/* The Data Estate view (public/estate/index.html).
   Local dev: served as a normal page at /estate/index.html.
   Hosted build (VITE_TARGET=artifact): inlined via srcdoc, three.js from cdnjs. */
const HOSTED = import.meta.env.VITE_TARGET === 'artifact';
const THREE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';

function srcdocFor(params) {
  return estateHtml
    .replace('<head>', `<head>\n<script>window.__GM_PARAMS=${JSON.stringify(params)};</script>`)
    .replace('<script src="./three.min.js"></script>', `<script src="${THREE_CDN}"></script>`);
}

const EstateFrame = forwardRef(function EstateFrame({ params = '', title }, ref) {
  const [ready, setReady] = useState(false);
  const done = () => setTimeout(() => setReady(true), 450);
  return (
    <>
      {HOSTED
        ? <iframe ref={ref} title={title} srcDoc={srcdocFor(params)} onLoad={done} />
        : <iframe ref={ref} title={title} src={`/estate/index.html${params}`} onLoad={done} />}
      {!ready && <Cover label="Drawing your estate" />}
    </>
  );
});

export default EstateFrame;

/* Refresh, driven by the estate itself: the page asks the estate to pull, the estate runs its
   scan across the buildings and reports back when the harvest has finished. */
export function useEstateRefresh(frame, initialChanges = 0) {
  const [refreshing, setRefreshing] = useState(false);
  const [last, setLast] = useState(() => Date.now() - 4 * 60000);
  const [changes, setChanges] = useState(initialChanges);
  const [, setTick] = useState(0);
  const guard = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 20000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onMsg = (e) => {
      if (!frame.current || e.source !== frame.current.contentWindow) return;
      const d = e.data || {};
      if (d.type === 'genmeta:refreshing') setRefreshing(true);
      if (d.type === 'genmeta:refreshed') {
        clearTimeout(guard.current);
        setRefreshing(false);
        setLast(d.last || Date.now());
        if (typeof d.changes === 'number') setChanges(d.changes);
      }
    };
    window.addEventListener('message', onMsg);
    return () => { window.removeEventListener('message', onMsg); clearTimeout(guard.current); };
  }, [frame]);

  const refresh = () => {
    if (refreshing) return;
    setRefreshing(true);
    frame.current?.contentWindow?.postMessage({ type: 'genmeta:refresh' }, '*');
    clearTimeout(guard.current);
    guard.current = setTimeout(() => setRefreshing(false), 8000); /* never leave the button stuck */
  };

  const mins = Math.floor((Date.now() - last) / 60000);
  const ago = mins < 1 ? 'just now' : mins === 1 ? '1 min ago' : `${mins} min ago`;
  const next = Math.max(0, 30 - mins);
  return { refreshing, refresh, ago, next, changes };
}
