/* Shared defaults and helpers. Loaded by both the content script and the popup. */

const SBG_DEFAULT_SITES = [
  "rippling.com",
  "deel.com",
  "remote.com",
  "gusto.com",
  "workday.com",
  "myworkday.com",
  "adp.com",
  "bamboohr.com",
  "wise.com",
  "payoneer.com",
  "paypal.com",
  "revolut.com",
  "stripe.com",
  "upwork.com",
  "fiverr.com",
];

const SBG_DEFAULT_CURRENCIES = [
  "US$",
  "USD",
  "$",
  "EUR",
  "€",
  "GBP",
  "£",
  "JOD",
  "AED",
  "SAR",
  "EGP",
  "KWD",
  "QAR",
  "BHD",
  "OMR",
  "TRY",
  "₺",
  "CHF",
  "CAD",
  "AUD",
  "INR",
  "₹",
  "JPY",
  "¥",
];

const SBG_DEFAULTS = {
  blurEnabled: true,
  scope: "listed", // "listed" = only the sites below | "all" = every site
  sites: SBG_DEFAULT_SITES,
  currencies: SBG_DEFAULT_CURRENCIES,
};

function sbgEscapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* Builds one regex from the currency list. Matches both orders:
   "JOD 899.00" (currency first) and "899.00 JOD" (number first),
   with any amount of whitespace between them (or none at all),
   using Western (0-9) or Eastern Arabic (٠-٩) digits and separators. */
function sbgBuildCurrencyRegex(currencies) {
  const cleaned = [...new Set((currencies || []).map((c) => (c || "").trim()).filter(Boolean))];
  if (!cleaned.length) return null;

  // Longest first so "US$" wins over "$".
  const alt = cleaned
    .sort((a, b) => b.length - a.length)
    .map(sbgEscapeRegex)
    .join("|");

  const num = "[0-9\\u0660-\\u0669][0-9\\u0660-\\u0669.,\\u066B\\u066C\\s]*";
  const currencyFirst = `(?:${alt})\\s*${num}`;
  const numberFirst = `${num}\\s*(?:${alt})(?![A-Za-z])`;
  return new RegExp(`(?:${currencyFirst})|(?:${numberFirst})`);
}

/* Site patterns: "rippling.com" also covers app.rippling.com. "*" covers everything. */
function sbgHostMatches(host, patterns) {
  const h = (host || "").toLowerCase();
  return (patterns || []).some((raw) => {
    let p = (raw || "").trim().toLowerCase();
    if (!p) return false;
    if (p === "*") return true;
    p = p.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
    if (p.startsWith("*.")) p = p.slice(2);
    if (!p) return false;
    return h === p || h.endsWith("." + p);
  });
}
