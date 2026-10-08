/**
 * Maps everyday capability language to the NeoZaar catalog category taxonomy.
 *
 * The catalog's categories (People Tech, Enterprise Security, Business
 * Continuity, Cloud Infrastructure, Modern Workplace, Data & AI) rarely appear
 * verbatim in a customer's request, so a query like "HR and payroll software"
 * scores near-zero against the "People Tech" products. inferCategories() detects
 * the implied category from synonyms so unifiedRetrieval can enrich the query.
 */

const CATEGORY_SYNONYMS = {
  "People Tech": [
    "hr", "hrms", "hcm", "human resource", "human resources", "payroll",
    "recruitment", "recruiting", "hiring", "onboarding", "attendance",
    "leave management", "workforce management", "talent", "employee management",
    "performance management", "people ops", "greythr", "factohr", "hr software",
    "hr platform", "hr system",
  ],
  "Enterprise Security": [
    "security", "cybersecurity", "cyber security", "infosec", "endpoint", "edr",
    "xdr", "mdr", "siem", "soc", "firewall", "waf", "antivirus", "malware",
    "ransomware", "threat", "phishing", "zero trust", "iam", "identity", "pam",
    "dlp", "vulnerability", "penetration", "vapt", "encryption", "casb",
    "email security", "web security",
  ],
  "Cloud Infrastructure": [
    "cloud", "aws", "azure", "gcp", "google cloud", "iaas", "paas",
    "kubernetes", "container", "migration", "infrastructure", "hosting",
    "datacenter", "data center", "landing zone", "finops", "cost optimization",
  ],
  "Business Continuity": [
    "backup", "recovery", "disaster recovery", "bcdr", "replication",
    "archival", "archive", "rpo", "rto", "resilience", "failover",
    "ransomware recovery", "data protection", "continuity", "immutable",
  ],
  "Modern Workplace": [
    "collaboration", "productivity", "m365", "microsoft 365", "office 365",
    "google workspace", "teams", "sharepoint", "intranet", "workplace",
    "device management", "intune", "mdm", "unified endpoint", "digital workplace",
  ],
  "Data & AI": [
    "artificial intelligence", "machine learning", "genai", "generative ai",
    "llm", "copilot", "chatbot", "ai assistant", "analytics", "data platform",
    "data warehouse", "business intelligence", "data lake", "mlops", "rag",
  ],
};

/**
 * @param {string} text  free query text (keywords + label + category joined)
 * @returns {{category: string, hits: string[]}[]}
 */
function inferCategories(text) {
  const lc = ` ${String(text || "").toLowerCase()} `;
  const out = [];
  for (const [category, terms] of Object.entries(CATEGORY_SYNONYMS)) {
    const hits = terms.filter((t) =>
      // whole-word-ish for short tokens (hr, edr, soc…), substring for phrases
      t.length <= 4 ? lc.includes(` ${t} `) || lc.includes(` ${t},`) || lc.includes(`-${t} `) : lc.includes(t),
    );
    if (hits.length) out.push({ category, hits });
  }
  return out;
}

module.exports = { CATEGORY_SYNONYMS, inferCategories };
