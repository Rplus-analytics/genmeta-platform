/* Governance › Access — the people directory (test data).
   3,000 people: the named test people used everywhere else (Admin, Priya Shah, Rajesh, Dana Whitfield…) plus
   generated colleagues who reach GenMeta through directory groups. The group carries the role, the role carries
   the clearance; named people's roles come live from the Access store so manual assignments show up here. */
import { DIRECTORY } from './data.js';

let seed = 7;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const pick = (a) => a[Math.floor(rnd() * a.length)];
const FIRST = ['Priya', 'Emma', 'Rajesh', 'Dana', 'Sam', 'Owen', 'Aisha', 'Tom', 'Noor', 'Liam', 'Sarah', 'Mark', 'Meera', 'Pradeep', 'Olivia', 'James', 'Fatima', 'Chen', 'Grace', 'Daniel', 'Amira', 'Hugo', 'Ruth', 'Kofi', 'Isla', 'Arjun', 'Zara', 'Ben', 'Leah', 'Yusuf', 'Ella', 'Ravi', 'Megan', 'Ade', 'Holly', 'Kai', 'Sophie', 'Ibrahim', 'Nina', 'Callum'];
const LAST = ['Shah', 'Clarke', 'Kumar', 'Whitfield', 'Okafor', 'Hughes', 'Khan', 'Reid', 'Ali', 'Patel', 'Jones', 'Owusu', 'Singh', 'Brown', 'Wilson', 'Taylor', 'Evans', 'Thomas', 'Roberts', 'Walker', 'Wright', 'Green', 'Hall', 'Wood', 'Hussain', 'Mensah', 'Campbell', 'Murray', 'Byrne', 'Lewis'];
export const DEPTS = ['Customer Compliance', 'Debt Management', 'Digital', 'Data & Analytics', 'Finance', 'Risk & Intelligence', 'HR', 'Legal', 'Technology'];
const LOCS = ['London', 'Newcastle', 'Manchester', 'Edinburgh', 'Cardiff', 'Belfast'];
export const COLORS = ['#2F6BFF', '#6D4AFF', '#1E8E5A', '#B26A00', '#C0362C', '#0E7C86', '#7A4E2D', '#3B4A6B'];

/* directory groups and how many generated members each has */
export const GROUP_SIZES = {
  'GenMeta-Analysts': 2167, 'GenMeta-Engineering': 410, 'GenMeta-ProductOwners': 96, 'GenMeta-Governance': 12, 'GenMeta-DPO': 4,
  'GenMeta-Audit': 20, 'GenMeta-Ops': 36, 'Finance-Analysts': 150, 'Risk-Investigators': 60, 'GenMeta-Contractors': 29,
};
const ANALYST_GROUPS = ['GenMeta-Analysts', 'Finance-Analysts', 'Risk-Investigators'];
export const groupRole = (g) => (DIRECTORY.find(([x]) => x === g) || [])[1] || null;
export const GROUP_LIST = Object.keys(GROUP_SIZES);

/* named test people: department and the group(s) the directory puts them in */
const NAMED = [
  ['Admin', 'Data & Analytics', ['GenMeta-Governance']], ['Sarah Jones', 'Data & Analytics', ['GenMeta-Governance', 'GenMeta-Audit']],
  ['Dana Whitfield', 'Legal', ['GenMeta-DPO']], ['Mark Owusu', 'Legal', ['GenMeta-DPO']], ['Sam Okafor', 'Risk & Intelligence', ['GenMeta-Audit']],
  ['Owen Hughes', 'Technology', ['GenMeta-Ops']], ['Rajesh', 'Data & Analytics', ['GenMeta-Engineering']], ['Pradeep Kumar', 'Data & Analytics', ['GenMeta-Engineering']],
  ['Raghav', 'Data & Analytics', ['GenMeta-Engineering']], ['Aisha Khan', 'Digital', ['GenMeta-ProductOwners']], ['Tom Reid', 'Data & Analytics', ['GenMeta-Engineering']],
  ['Priya Shah', 'Customer Compliance', ['GenMeta-Analysts']], ['Emma Clarke', 'Customer Compliance', ['GenMeta-Analysts']], ['Noor Ali', 'Finance', ['GenMeta-Analysts']],
  ['Meera Shah', 'Finance', ['Finance-Analysts']], ['Liam Patel', 'Technology', ['GenMeta-Contractors']],
];
const email = (n) => `${n.toLowerCase().replace(/[^a-z]+/g, '.')}@hmrc.gov.uk`;
const people = [];
const seen = new Set(NAMED.map(([n]) => n));
NAMED.forEach(([name, dept, groups], i) => people.push({ id: `n${i}`, name, email: email(name), dept, loc: 'London', groups, named: true, lastActive: i % 5, col: COLORS[i % COLORS.length] }));
Object.entries(GROUP_SIZES).forEach(([g, size]) => {
  for (let i = 0; i < size; i += 1) {
    let n;
    do { const f = pick(FIRST); const l = pick(LAST); n = `${f} ${l}`; if (seen.has(n)) n = `${f} ${'ABCDEFGHJKLMNPRSTW'[Math.floor(rnd() * 18)]}. ${l}`; } while (seen.has(n));
    seen.add(n);
    const groups = [g];
    /* a few analysts also sit in the product-owner group (a different role, no separation-of-duties clash) */
    if (ANALYST_GROUPS.includes(g) && rnd() < 0.05) groups.push('GenMeta-ProductOwners');
    /* a few people hold one extra role given by hand — always a role their groups do not already give */
    const gr = groupRole(g);
    const manualRole = gr && rnd() < 0.012 ? (gr === 'analyst' ? 'data-engineer' : 'analyst') : null;
    people.push({
      id: `p${people.length}`, name: n, email: email(n), groups, named: false,
      dept: g === 'Finance-Analysts' ? 'Finance' : g === 'Risk-Investigators' ? 'Risk & Intelligence' : pick(DEPTS), loc: pick(LOCS),
      lastActive: Math.floor(rnd() * 120), manualRole, col: COLORS[people.length % COLORS.length],
    });
  }
});
export const PEOPLE_DIR = people;
export const personByName = (n) => PEOPLE_DIR.find((p) => p.name === n);
export const initials = (n) => n.split(' ').filter((x) => !x.endsWith('.')).map((x) => x[0]).slice(0, 2).join('');

/* roles a person holds. The directory is the source: every group carries its role.
   Named test people: their live assignments in the Access store (directory ones are seeded from their groups, manual ones added by hand).
   Everyone else: their groups' roles plus at most one manual role. */
export const groupRolesOf = (p) => [...new Set(p.groups.map(groupRole).filter(Boolean))];
export function manualRolesOf(p, assign) {
  if (p.named) return assign.filter((a) => a.person === p.name && a.source === 'manual').map((a) => a.role);
  return [...new Set([...(p.manualRole ? [p.manualRole] : []), ...assign.filter((a) => a.source === 'manual' && a.person === p.name).map((a) => a.role)])];
}
export function rolesFor(p, assign) {
  if (p.named) return [...new Set(assign.filter((a) => a.person === p.name).map((a) => a.role))];
  return [...new Set([...groupRolesOf(p), ...manualRolesOf(p, assign)])];
}
export function sourceFor(p, assign) {
  if (manualRolesOf(p, assign).length) return 'manual';
  return rolesFor(p, assign).length ? 'directory' : 'none';
}
/* the numbers every Access page shows — Who tiles, Settings tiles, role cards and groups all read these */
export function directoryStats(assign) {
  let manual = 0; let manualPeople = 0; let roleless = 0;
  PEOPLE_DIR.forEach((p) => { const m = manualRolesOf(p, assign).length; manual += m; if (m) manualPeople += 1; if (!rolesFor(p, assign).length) roleless += 1; });
  const unmapped = PEOPLE_DIR.filter((p) => !groupRolesOf(p).length).length;
  return { people: PEOPLE_DIR.length, manual, manualPeople, roleless, unmapped, fromDir: Math.round(((PEOPLE_DIR.length - manualPeople) / PEOPLE_DIR.length) * 100) };
}
/* the directory's view of the named test people, for synchronisation */
export const NAMED_DIRECTORY = GROUP_LIST.map((g) => [g, PEOPLE_DIR.filter((p) => p.named && p.groups.includes(g)).map((p) => p.name)]);
