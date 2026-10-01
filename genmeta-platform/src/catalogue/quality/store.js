/* localStorage-backed state for Data quality (all wrapped in try/catch).
   The dataset ships no rules / profiling / snapshots / quarantine, so these
   start empty (or seeded) and build up as the user acts. */
import { QUARANTINE_SEED, REMEDIATION_SEED, NOTIF_SEED } from './dqData.js';

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

export const getNotif = () => read('quality.notif', null);
export const setNotif = (n) => write('quality.notif', n);

/* Seed the quarantine + remediation record (and notification rules) once, so the
   cross-page links (Catalogue badge, product publish block, Stewardship issues)
   have something real to point at. Guarded by a one-time flag so releasing a
   quarantined asset (emptying the list) is not undone on the next visit. */
export function seedMonitoring({ quarantine, remediation, notif }) {
  if (read('quality.seeded', false)) return;
  if (quarantine) setQuarantine(quarantine);
  if (remediation) setRemediation(remediation);
  if (notif) setNotif(notif);
  write('quality.seeded', true);
}

/* Seed once at import so the Catalogue badge, product publish block and
   Stewardship issues work even before the Data quality section is opened. */
seedMonitoring({ quarantine: QUARANTINE_SEED, remediation: REMEDIATION_SEED, notif: NOTIF_SEED });
