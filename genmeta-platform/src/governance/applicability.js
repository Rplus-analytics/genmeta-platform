/* Applicability engine for the Policies library (test data).
   Works out which data assets an item applies to from its criteria, follows lineage when the
   item is inherited by derived assets, and rolls the result up to systems, information assets
   (domains), business processes, tax regimes and organisational units. */
import { ASSET_NAMES, PD_MAP, MONEY, systemOf, sensitivityOf } from './data.js';

/* lineage edges beyond the personal-data map's "shared with" lists */
const EXTRA_LINEAGE = [
  ['SRC.ORDERS', 'INT.ORDERS'], ['INT.ORDERS', 'STG.CUSTOMER_ORDER'], ['SRC.LINEITEM', 'INT.LINEITEM'], ['INT.LINEITEM', 'STG.ORDER_ITEM_SUMMARY'],
  ['PRL.ORDER_MASTER', 'BI.Order Revenue Report'], ['PRL.ORDER_MASTER', 'BI.Customer Churn Analysis'],
  ['S3_ENR.CUSTOMER_ORDERS', 'BI.Customer 360 Dashboard'], ['S3_ENR.CUSTOMER_SUMMARY', 'STREAMING.customer-value'],
  ['S3_RAW.ORDERS', 'S3_CLN.ORDERS'], ['SQL_SRC.CUSTOMER', 'SQL_CLN.ORDERS'], ['SQL_SRC.ORDERS', 'SQL_CLN.ORDERS'],
  ['SQL_ENR.CUSTOMER_ORDERS', 'API.GET_customers'], ['SQL_ENR.CUSTOMER_ORDERS', 'API.GET_customers_customerId'],
  ['INT.ORDERS', 'API.GET_orders'], ['API.POST_orders', 'SRC.ORDERS'], ['INT.SUPPLIER', 'BI.Supplier Performance'],
];
export const DOWNSTREAM = (() => {
  const m = {};
  const add = (a, b) => { (m[a] = m[a] || []).includes(b) || m[a].push(b); };
  PD_MAP.forEach((r) => r.shared.forEach((b) => add(r.asset, b)));
  EXTRA_LINEAGE.forEach(([a, b]) => add(a, b));
  return m;
})();

const pd = (a) => PD_MAP.find((r) => r.asset === a);
export const domainOf = (a) => pd(a)?.domain
  || (/LINEITEM|ORDERS|orders|Revenue/.test(a) ? 'Orders' : /PART/.test(a) ? 'Product' : /NATION/.test(a) ? 'Reference' : /SUPPLIER|Supplier/.test(a) ? 'Supplier' : 'Customer');
export const layerOf = (a) => (/^(SRC|S3_RAW|SQL_SRC)\./.test(a) ? 'Raw' : /^(INT|S3_CLN|SQL_CLN)\./.test(a) ? 'Cleansed' : /^STG\./.test(a) ? 'Staging' : 'Curated');
export const classesOf = (a) => {
  const r = pd(a); const out = new Set();
  if (r) {
    if (r.cols.some((c) => !MONEY.test(c) && !/PART_NAME/.test(c))) out.add('PII');
    if (r.cols.some((c) => MONEY.test(c))) out.add('FINANCIAL');
    if (r.cols.some((c) => /PART|SUPPLIER/.test(c))) out.add('COMMERCIAL');
  } else {
    if (/ORDERS|LINEITEM|orders|Revenue/.test(a)) out.add('FINANCIAL');
    if (/PART|SUPPLIER|Supplier/.test(a)) out.add('COMMERCIAL');
  }
  return [...out];
};

/* labelled examples until HMRC supplies its own lists */
export const BUSINESS = {
  Customer: { processes: ['Customer registration and identity', 'Customer value analytics'], tax_regimes: ['Income Tax Self Assessment', 'PAYE', 'National Insurance contributions'], org_units: ['Customer Services Group', 'Customer Compliance Group'] },
  Orders: { processes: ['Order to cash'], tax_regimes: ['VAT', 'Corporation Tax'], org_units: ['Finance'] },
  Product: { processes: ['Order to cash'], tax_regimes: ['Customs and excise duties'], org_units: ['Data and Analytics'] },
  Supplier: { processes: ['Supplier management'], tax_regimes: ['VAT', 'Customs and excise duties'], org_units: ['Finance'] },
  Reference: { processes: ['Compliance risk assessment'], tax_regimes: [], org_units: ['Chief Digital and Information Officer Group'] },
};
export const TAX_SHORT = { 'Income Tax Self Assessment': 'ITSA', PAYE: 'PAYE', 'National Insurance contributions': 'NICs', VAT: 'VAT', 'Corporation Tax': 'CT', 'Capital Gains Tax': 'CGT', 'Inheritance Tax': 'IHT', 'Customs and excise duties': 'customs' };

export const profileOf = (a) => {
  const domain = domainOf(a);
  return { asset: a, system: systemOf(a), domain, layer: layerOf(a), sensitivity: sensitivityOf(a), classes: classesOf(a), ...BUSINESS[domain] };
};
export const PROFILES = Object.fromEntries(ASSET_NAMES.map((a) => [a, profileOf(a)]));

const FIELD = { classifications: 'classes', sensitivity: 'sensitivity', domains: 'domain', layers: 'layer', systems: 'system', tax_regimes: 'tax_regimes', processes: 'processes', org_units: 'org_units', assets: 'asset' };
const REASON = {
  classifications: (v) => `holds ${v.join(', ')} data`, sensitivity: (v) => `${v.join(', ')} sensitivity`, domains: (v) => `in information asset ${v.join(', ')}`,
  layers: (v) => `${v.join(', ')} layer`, systems: (v) => `held in ${v.join(', ')}`, tax_regimes: (v) => `serves tax regime ${v.map((t) => TAX_SHORT[t] || t).join(', ')}`,
  processes: (v) => `used by ${v.join(', ')}`, org_units: (v) => `owned by ${v.join(', ')}`, assets: () => 'named directly',
};
export const hasCriteria = (applies) => Object.values(applies || {}).some((v) => v && v.length);

/* rows: [{ asset, why, lineage: bool, from? , profile }] */
export function applicability(item) {
  const crit = Object.entries(item.applies || {}).filter(([, v]) => v && v.length);
  const rows = [];
  const seen = new Set();
  ASSET_NAMES.forEach((a) => {
    const p = PROFILES[a];
    if (!crit.length) { rows.push({ asset: a, why: 'applies to every data asset', lineage: false, profile: p }); seen.add(a); return; }
    const hits = crit.map(([k, v]) => { const f = p[FIELD[k]]; const got = Array.isArray(f) ? v.filter((x) => f.includes(x)) : v.filter((x) => x === f); return got.length ? REASON[k](got) : null; });
    if (hits.every(Boolean)) { rows.push({ asset: a, why: hits.join('; '), lineage: false, profile: p }); seen.add(a); }
  });
  if (item.inherit && crit.length) {
    const queue = rows.map((r) => r.asset);
    while (queue.length) {
      const a = queue.shift();
      (DOWNSTREAM[a] || []).forEach((b) => {
        if (seen.has(b) || !PROFILES[b]) return;
        seen.add(b); queue.push(b);
        rows.push({ asset: b, why: `derived from ${a}`, lineage: true, from: a, profile: PROFILES[b] });
      });
    }
  }
  const uniq = (k) => [...new Set(rows.flatMap((r) => [].concat(r.profile[k])))].filter(Boolean).sort();
  return {
    rows, all: !crit.length,
    viaLineage: rows.filter((r) => r.lineage).length,
    systems: uniq('system'), domains: uniq('domain'), processes: uniq('processes'), tax_regimes: uniq('tax_regimes'), org_units: uniq('org_units'),
  };
}
export const sensitivityLine = (p) => {
  const t = p.tax_regimes.map((x) => TAX_SHORT[x] || x);
  return `${p.classes.length ? `holds ${p.classes.join(', ')} data; ` : ''}${t.length ? `tax regime${t.length > 1 ? 's' : ''} ${t.join(', ')} ` : 'no tax regime '}covering domain ${p.domain}`;
};

/* "Interpret with Claude" — canned suggestions that read the statement (test data) */
export function interpret(item) {
  const txt = `${item.title} ${item.statement}`.toLowerCase();
  if (/personal|storage limitation|identity|publicly name/.test(txt)) return {
    applies: { classifications: ['PII'] }, inherit: true,
    why: 'This requirement applies to every asset holding personal data, identified by the PII classification. Downstream inheritance makes sure it follows the data through pipelines into derived datasets and reports.',
  };
  if (/quality|sensitive|restricted/.test(txt)) return {
    applies: { sensitivity: ['Restricted'] }, inherit: false,
    why: 'The statement is about sensitive data, so it applies to assets rated Restricted. Derived assets carry their own sensitivity rating, so inheritance is not needed.',
  };
  if (/vat|tax|accounting|record retention|retention period|6 years|last entry/.test(txt)) return {
    applies: { classifications: ['FINANCIAL', 'PII'] }, inherit: true,
    why: 'HMRC records are financial and taxpayer records, so this applies to assets holding FINANCIAL or PII data and to everything derived from them through lineage.',
  };
  if (/supplier/.test(txt)) return { applies: { domains: ['Supplier'] }, inherit: true, why: 'The statement is about suppliers, so it applies to the Supplier information asset and assets derived from it.' };
  if (/historic|national archives|transfer/.test(txt)) return { applies: { layers: ['Curated'] }, inherit: false, why: 'Records of historic value are the curated, published outputs, so this applies to the Curated layer.' };
  if (/describ|document|steward|every data asset/.test(txt)) return { applies: {}, inherit: false, why: 'Every governed asset must meet this, so it applies to the whole estate with no narrowing criteria.' };
  return { applies: { classifications: ['FINANCIAL'] }, inherit: true, why: 'The statement concerns financial records, so it applies to assets holding FINANCIAL data and anything derived from them.' };
}

/* dependencies of non-compliant assets (test data) */
export const DATA_PRODUCTS = [
  ['Customer 360', ['BI.Customer 360 Dashboard', 'S3_ENR.CUSTOMER_ORDERS', 'S3_ENR.CUSTOMER_SUMMARY', 'INT.CUSTOMER', 'S3_CLN.CUSTOMER']],
  ['Customer value score', ['STREAMING.customer-value', 'S3_ENR.CUSTOMER_SUMMARY', 'S3_ENR.CUSTOMER_ORDERS']],
  ['Order revenue', ['PRL.ORDER_MASTER', 'STG.CUSTOMER_ORDER', 'STG.ORDER_ITEM_SUMMARY', 'BI.Order Revenue Report', 'BI.Customer Churn Analysis']],
  ['Customer API', ['API.GET_customers', 'API.GET_customers_customerId', 'SQL_ENR.CUSTOMER_ORDERS', 'SQL_ENR.CUSTOMER_SUMMARY', 'SQL_CLN.CUSTOMER']],
  ['Supplier performance', ['BI.Supplier Performance', 'INT.SUPPLIER', 'SRC.SUPPLIER']],
];
export const MODEL_SOURCES = [['customer-value-band', ['S3_ENR.CUSTOMER_ORDERS', 'S3_ENR.CUSTOMER_SUMMARY', 'S3_CLN.CUSTOMER']]];
export const productsOf = (a) => DATA_PRODUCTS.filter(([, l]) => l.includes(a)).map(([n]) => n);
export const modelsOf = (a) => MODEL_SOURCES.filter(([, l]) => l.includes(a)).map(([n]) => n);
