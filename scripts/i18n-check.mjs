import { budgets, categories, dateIdeas, durations } from "../src/dateIdeas.ts";
import {
  budgetLabels,
  categoryLabels,
  durationLabels,
  iso6391LanguageCodes,
  isLanguageCode,
  labelFor,
  languages,
  localizeIdea,
  translations,
  verifiedLanguageCodes,
} from "../src/i18n.ts";

const errors = [];
const englishKeys = Object.keys(translations.en).sort();
const uniqueIsoCodes = new Set(iso6391LanguageCodes);
const languageCodes = new Set(languages.map((language) => language.code));

if (uniqueIsoCodes.size !== iso6391LanguageCodes.length) {
  errors.push("ISO 639-1 language catalog contains duplicate codes.");
}

if (languageCodes.size !== languages.length) {
  errors.push("Rendered language list contains duplicate codes.");
}

if (languages.length !== iso6391LanguageCodes.length) {
  errors.push(`Language list size ${languages.length} does not match ISO catalog size ${iso6391LanguageCodes.length}.`);
}

for (const code of verifiedLanguageCodes) {
  if (!isLanguageCode(code)) errors.push(`Verified code ${code} is not a selectable app language.`);
  if (!languageCodes.has(code)) errors.push(`Verified code ${code} is missing from the language list.`);
  if (!translations[code]) errors.push(`Verified code ${code} is missing a translation pack.`);
}

for (const language of languages) {
  if (language.available && !isLanguageCode(language.code)) {
    errors.push(`${language.code} is marked available without a verified translation type.`);
  }

  if (!language.name || !language.nativeName || !language.flag) {
    errors.push(`${language.code} has an incomplete language row.`);
  }
}

for (const [code, translation] of Object.entries(translations)) {
  const keys = Object.keys(translation).sort();
  const missing = englishKeys.filter((key) => !keys.includes(key));
  const extra = keys.filter((key) => !englishKeys.includes(key));

  if (missing.length > 0) errors.push(`${code} is missing translation keys: ${missing.join(", ")}`);
  if (extra.length > 0) errors.push(`${code} has unknown translation keys: ${extra.join(", ")}`);

  for (const [key, value] of Object.entries(translation)) {
    if (typeof value !== "string" || value.trim().length === 0) {
      errors.push(`${code}.${key} is empty.`);
    }
  }
}

for (const code of verifiedLanguageCodes) {
  for (const category of categories) {
    const label = labelFor("category", category, code);
    if (!label || label === categoryLabels[code]?.[category]?.trim()) continue;
    if (code !== "en" && !categoryLabels[code]?.[category]) errors.push(`${code} is missing category label ${category}.`);
  }

  for (const budget of budgets) {
    const label = labelFor("budget", budget, code);
    if (!label || label === budgetLabels[code]?.[budget]?.trim()) continue;
    if (code !== "en" && !budgetLabels[code]?.[budget]) errors.push(`${code} is missing budget label ${budget}.`);
  }

  for (const duration of durations) {
    const label = labelFor("duration", duration, code);
    if (!label || label === durationLabels[code]?.[duration]?.trim()) continue;
    if (code !== "en" && !durationLabels[code]?.[duration]) errors.push(`${code} is missing duration label ${duration}.`);
  }

  for (const idea of dateIdeas.slice(0, 250)) {
    const localized = localizeIdea(idea, code);
    for (const field of ["title", "prompt", "prep"]) {
      if (!localized[field] || /undefined|null/.test(localized[field])) {
        errors.push(`${code} creates invalid ${field} for ${idea.id}.`);
      }
    }
  }
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      verifiedLanguages: verifiedLanguageCodes.length,
      catalogLanguages: languages.length,
      iso6391Codes: iso6391LanguageCodes.length,
      checkedIdeasPerLanguage: 250,
    },
    null,
    2,
  ),
);
