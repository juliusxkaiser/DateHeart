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
  tagLabels,
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

const englishResiduePatterns = [
  /\bChoose a vibe\b/i,
  /\bTap the heart\b/i,
  /\bGet your next date cue\b/i,
  /\bYour date idea\b/i,
  /\bPrepare\b/i,
  /\bSave\b/i,
  /\bShare\b/i,
  /\bNew idea\b/i,
  /\bFilters\b/i,
  /\bCategory\b/i,
  /\bDuration\b/i,
  /\bHistory\b/i,
  /\bFavorites\b/i,
  /\bLanguage\b/i,
  /\bRemove ads\b/i,
  /\bContinue\b/i,
  /\b(Book|Choose|Bring|Keep|Make|Visit|Walk|Pick|Rent|Go|Take|Create|Prepare|Use|Find|Try|Build)\b/,
];

const allTags = [...new Set(dateIdeas.flatMap((idea) => idea.tags))].sort();

for (const code of verifiedLanguageCodes) {
  for (const category of categories) {
    const label = labelFor("category", category, code);
    if (!label || label.trim().length === 0) errors.push(`${code} has an empty category label for ${category}.`);
    if (code !== "en" && (!categoryLabels[code]?.[category] || label === category)) {
      errors.push(`${code} is missing category label ${category}.`);
    }
  }

  for (const budget of budgets) {
    const label = labelFor("budget", budget, code);
    if (!label || label.trim().length === 0) errors.push(`${code} has an empty budget label for ${budget}.`);
    if (code !== "en" && (!budgetLabels[code]?.[budget] || label === budget)) {
      errors.push(`${code} is missing budget label ${budget}.`);
    }
  }

  for (const duration of durations) {
    const label = labelFor("duration", duration, code);
    if (!label || label.trim().length === 0) errors.push(`${code} has an empty duration label for ${duration}.`);
    if (code !== "en" && (!durationLabels[code]?.[duration] || label === duration)) {
      errors.push(`${code} is missing duration label ${duration}.`);
    }
  }

  if (code !== "en") {
    for (const tag of allTags) {
      if (!tagLabels[code]?.[tag]) errors.push(`${code} is missing tag label ${tag}.`);
    }
  }

  for (const idea of dateIdeas) {
    const localized = localizeIdea(idea, code);
    for (const field of ["title", "prompt", "prep"]) {
      if (!localized[field] || /undefined|null/.test(localized[field])) {
        errors.push(`${code} creates invalid ${field} for ${idea.id}.`);
      }

      if (code !== "en") {
        for (const pattern of englishResiduePatterns) {
          if (pattern.test(localized[field])) {
            errors.push(`${code} still has English residue in ${field} for ${idea.id}: ${localized[field]}`);
            break;
          }
        }
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
      checkedIdeasPerLanguage: dateIdeas.length,
      checkedTags: allTags.length,
    },
    null,
    2,
  ),
);
