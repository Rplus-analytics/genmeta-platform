/* localStorage-backed state for Data quality (all wrapped in try/catch).
   The dataset ships no rules / profiling / snapshots / quarantine, so these
   start empty (or seeded) and build up as the user acts. */
const read = (k, f) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : f; } catch { return f; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };

export const getRules = () => read('quality.rules', null);
export const setRules = (r) => write('quality.rules', r);

export const getProfiled = () => new Set(read('quality.profiled', []));
export const setProfiled = (s) => write('quality.profiled', [...s]);

export const getSnapshots = () => read('quality.snapshots', []);
export function addSnapshot(snap) {
  const s = read('quality.snapshots', []).filter((x) => x.date !== snap.date);
  s.push(snap); s.sort((a, b) => a.date.localeCompare(b.date));
  write('quality.snapshots', s); return s;
}

export const getQuarantine = () => read('quality.quarantine', []);
export const setQuarantine = (q) => write('quality.quarantine', q);

export const getRemediation = () => read('quality.remediation', []);
export const setRemediation = (r) => write('quality.remediation', r);
