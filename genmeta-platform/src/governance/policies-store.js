import { useSyncExternalStore } from 'react';
import { POLICY_ITEMS, DOCUMENTS, EXTRACTED_PENDING } from './data.js';
import { applicability, hasCriteria } from './applicability.js';

/* Policies library state, shared by the catalogue, the item pages and the menu filters (test data, in memory).
   Setters take a value or an updater function, like React's useState. */
let st = { items: POLICY_ITEMS, pending: EXTRACTED_PENDING, docs: DOCUMENTS };
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());
const apply = (k) => (v) => { st = { ...st, [k]: typeof v === 'function' ? v(st[k]) : v }; emit(); };
export const setItems = apply('items');
export const setPending = apply('pending');
export const setDocs = apply('docs');
export const usePolicies = () => useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, () => st);
export const getPolicies = () => st;
export function updateItem(id, patch, what) {
  setItems((a) => a.map((i) => (i.id === id ? { ...i, ...patch, history: [[new Date().toLocaleString('en-GB'), 'Admin', what || 'Edited'], ...(i.history || defaultHistory(i))] } : i)));
}
export const defaultHistory = (i) => [['23 Sept 2026, 07:51', 'Admin', 'Status set to active'], ['23 Sept 2026, 07:50', 'Admin', i.source ? 'Created from a document' : 'Created']];

/* automated checks of every active control against the assets it applies to */
const QUALITY_FAIL = { 'BI.Customer 360 Dashboard': 13, 'BI.Supplier Performance': 10 };
export function controlChecks(items) {
  const active = items.filter((i) => i.status === 'active');
  const retained = new Set(active.filter((i) => i.type === 'retention' && hasCriteria(i.applies)).flatMap((i) => applicability(i).rows.map((r) => r.asset)));
  return active.filter((i) => i.type === 'control').flatMap((c) => {
    const assets = applicability(c).rows.map((r) => r.asset);
    if (c.check === 'description_present') return assets.map((a) => ({ c, a, ok: a !== 'STG.CUSTOMER_ORDER_LIVE_RPLUS', finding: 'no business description' }));
    if (c.check === 'retention_defined') return assets.map((a) => ({ c, a, ok: retained.has(a), finding: 'no active retention requirement applies' }));
    if (c.check?.startsWith('quality_min')) return assets.map((a) => ({ c, a, ok: !QUALITY_FAIL[a], finding: `quality ${QUALITY_FAIL[a]}% is below 60` }));
    return [];
  });
}
/* controls that implement / satisfy / support an item, directly or through other items */
export function controlsUnder(items, id) {
  const seen = new Set(); const out = [];
  const walk = (x) => items.filter((i) => i.links.some(([, to]) => to === x)).forEach((i) => { if (seen.has(i.id)) return; seen.add(i.id); if (i.type === 'control') out.push(i); walk(i.id); });
  walk(id);
  return out;
}
