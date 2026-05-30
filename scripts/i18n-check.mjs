import { budgets, categories, dateIdeas, durations } from "../src/dateIdeas.ts";
import {
  budgetMarketFor,
  budgetLabels,
  categoryLabels,
  durationLabels,
  formatBudgetLabel,
  formatNoAdsPrice,
  iso6391LanguageCodes,
  isLanguageCode,
  labelFor,
  languages,
  localizeIdea,
  noAdsPriceByCurrency,
  tagLabels,
  translations,
  verifiedLanguageCodes,
  zeroDecimalCurrencies,
} from "../src/i18n.ts";
import {
  noAdsPriceByCurrency as serverNoAdsPriceByCurrency,
  stripeUnitAmountForCurrency,
  zeroDecimalCurrencies as serverZeroDecimalCurrencies,
} from "../server/pricing.mjs";

const errors = [];
const englishKeys = Object.keys(translations.en).sort();
const englishLanguageCodes = new Set(["en", "en-US"]);
const uniqueIsoCodes = new Set(iso6391LanguageCodes);
const languageCodes = new Set(languages.map((language) => language.code));
const regionalVerifiedLanguageCodes = verifiedLanguageCodes.filter((code) => !uniqueIsoCodes.has(code));
const expectedLanguageCount = iso6391LanguageCodes.length + regionalVerifiedLanguageCodes.length;

if (uniqueIsoCodes.size !== iso6391LanguageCodes.length) {
  errors.push("ISO 639-1 language catalog contains duplicate codes.");
}

if (languageCodes.size !== languages.length) {
  errors.push("Rendered language list contains duplicate codes.");
}

if (languages.length !== expectedLanguageCount) {
  errors.push(`Language list size ${languages.length} does not match ISO catalog plus regional variants size ${expectedLanguageCount}.`);
}

const preferredOrder = ["en", "en-US", "de", "fr", "es"];
const actualTopOrder = languages.slice(0, preferredOrder.length).map((language) => language.code);
if (actualTopOrder.join(",") !== preferredOrder.join(",")) {
  errors.push(`Top language order must be ${preferredOrder.join(", ")}, got: ${actualTopOrder.join(", ")}.`);
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

const clientPriceEntries = Object.entries(noAdsPriceByCurrency).sort(([left], [right]) => left.localeCompare(right));
const serverPriceEntries = Object.entries(serverNoAdsPriceByCurrency).sort(([left], [right]) => left.localeCompare(right));
if (JSON.stringify(clientPriceEntries) !== JSON.stringify(serverPriceEntries)) {
  errors.push("Client and server no-ads price tables differ.");
}

if (noAdsPriceByCurrency.EUR !== 4.99) {
  errors.push(`Germany/EUR no-ads price must stay 4.99, got ${noAdsPriceByCurrency.EUR}.`);
}

if (stripeUnitAmountForCurrency("EUR").unitAmount !== 499) {
  errors.push("Stripe EUR unit amount must be 499 for a 4.99 EUR purchase.");
}

if (stripeUnitAmountForCurrency("JPY").unitAmount !== noAdsPriceByCurrency.JPY) {
  errors.push("Stripe zero-decimal unit amount for JPY must not be multiplied by 100.");
}

if (stripeUnitAmountForCurrency("ZZZ").currency !== "EUR") {
  errors.push("Unsupported payment currencies must fall back to EUR.");
}

const clientZeroDecimals = [...zeroDecimalCurrencies].sort();
const serverZeroDecimals = [...serverZeroDecimalCurrencies].sort();
if (JSON.stringify(clientZeroDecimals) !== JSON.stringify(serverZeroDecimals)) {
  errors.push("Client and server zero-decimal currency sets differ.");
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
const scriptedFamilyCodes = [
  "ai-cinema-pick",
  "ai-snack-crawl",
  "ai-bookstore-mission",
  "ai-playlist-walk",
  "supermarket-color-dinner",
  "photo-booth-story-strip",
  "museum-caption-swap",
  "random-transit-mission",
  "arcade-challenge-card",
  "cafe-character-orders",
  "ai-thrift-outfit-brief",
  "ai-dessert-bracket",
  "ai-board-game-remix",
  "ai-night-photo-mission",
  "ai-farmers-market-basket",
  "ai-plant-shop-adoption",
  "ai-home-trailer-shoot",
  "ai-window-shopping-brief",
  "ai-kindness-errand",
  "ai-mini-golf-rules",
  "receipt-poem-cafe",
  "map-pin-memory-walk",
  "fake-podcast-date",
  "puzzle-envelope-at-home",
  "street-sign-story-route",
  "ai-voice-note-treasure",
  "ai-kitchen-timer-menu",
  "ai-cafe-table-script",
  "ai-public-art-detectives",
  "ai-movie-double-feature-home",
  "ai-constellation-walk",
  "ai-thrift-prop-story",
  "ai-bakery-blind-ranking",
  "ai-home-escape-box",
  "ai-future-postcard-drop",
  "ai-transit-portrait-gallery",
  "ai-mocktail-color-lab",
  "ai-book-cover-redesign",
  "ai-weather-report-walk",
  "ai-neighborhood-menu-hunt",
  "ai-dance-floor-dice",
  "ai-compliment-map",
  "ai-photo-alphabet-route",
  "ai-tiny-souvenir-museum",
  "ai-window-poetry-night",
  "ai-grocery-recipe-swap",
  "ai-dessert-map-stamps",
  "ai-home-museum-tour",
  "ai-couch-quest-map",
  "ai-soundtrack-scene-walk",
  "ai-crosswalk-story",
  "ai-park-bench-interview",
  "ai-library-spine-poem",
  "ai-museum-color-heist",
  "ai-arcade-boss-level",
  "ai-mini-fitness-trailer",
  "ai-rain-window-radio",
  "ai-blanket-fort-mission-control",
  "ai-seasonal-time-capsule",
  "ai-sunset-minute-checklist",
  "ai-menu-trailer-voiceover",
  "ai-morning-micro-itinerary",
  "ai-night-market-scorecard",
  "ai-home-one-table-restaurant",
  "ai-photo-recreation-challenge",
  "ai-coin-budget-date-log",
  "ai-bookstore-trailer-voice",
  "ai-station-postcard-series",
  "ai-kindness-bingo-route",
];
const ideaByFamily = new Map(dateIdeas.map((idea) => [idea.family, idea]));
const indianMarket = budgetMarketFor("en", { locales: ["en-IN"], timeZone: "Asia/Kolkata" });
const indianBudget = formatBudgetLabel("Up to 40 EUR", "en", indianMarket);
const indianNoAdsPrice = formatNoAdsPrice(indianMarket);
const hindiIndianMarket = budgetMarketFor("hi", { locales: ["hi-IN"], timeZone: "Asia/Kolkata" });
const hindiIndianBudget = formatBudgetLabel("Up to 40 EUR", "hi", hindiIndianMarket);
const hindiIndianNoAdsPrice = formatNoAdsPrice(hindiIndianMarket);
const arabicSaudiMarket = budgetMarketFor("ar", { locales: ["ar-SA"], timeZone: "Asia/Riyadh" });
const arabicSaudiBudget = formatBudgetLabel("Up to 40 EUR", "ar", arabicSaudiMarket);
const arabicSaudiNoAdsPrice = formatNoAdsPrice(arabicSaudiMarket);
const japaneseMarket = budgetMarketFor("ja", { locales: ["ja-JP"], timeZone: "Asia/Tokyo" });
const japaneseBudget = formatBudgetLabel("Up to 40 EUR", "ja", japaneseMarket);
const japaneseNoAdsPrice = formatNoAdsPrice(japaneseMarket);
const chineseMarket = budgetMarketFor("zh", { locales: ["zh-CN"], timeZone: "Asia/Shanghai" });
const chineseBudget = formatBudgetLabel("Up to 40 EUR", "zh", chineseMarket);
const chineseNoAdsPrice = formatNoAdsPrice(chineseMarket);
const additionalMarketChecks = [
  { language: "en", locales: ["en-GB"], timeZone: "Europe/London", currencyName: "GBP", currencyPattern: /£|GBP/ },
  { language: "en-US", locales: ["en-US"], timeZone: "America/New_York", currencyName: "USD", currencyPattern: /\$|USD/ },
  { language: "ru", locales: ["ru-RU"], timeZone: "Europe/Moscow", currencyName: "RUB", currencyPattern: /₽|RUB/ },
  { language: "ko", locales: ["ko-KR"], timeZone: "Asia/Seoul", currencyName: "KRW", currencyPattern: /₩|KRW/ },
  { language: "tr", locales: ["tr-TR"], timeZone: "Europe/Istanbul", currencyName: "TRY", currencyPattern: /₺|TRY/ },
  { language: "id", locales: ["id-ID"], timeZone: "Asia/Jakarta", currencyName: "IDR", currencyPattern: /Rp|IDR/ },
  { language: "sv", locales: ["sv-SE"], timeZone: "Europe/Stockholm", currencyName: "SEK", currencyPattern: /kr|SEK/ },
  { language: "cs", locales: ["cs-CZ"], timeZone: "Europe/Prague", currencyName: "CZK", currencyPattern: /Kč|CZK/ },
  { language: "uk", locales: ["uk-UA"], timeZone: "Europe/Kyiv", currencyName: "UAH", currencyPattern: /₴|UAH/ },
  { language: "vi", locales: ["vi-VN"], timeZone: "Asia/Ho_Chi_Minh", currencyName: "VND", currencyPattern: /₫|VND/ },
  { language: "th", locales: ["th-TH"], timeZone: "Asia/Bangkok", currencyName: "THB", currencyPattern: /฿|THB/ },
];

if (/EUR|€|\$/.test(indianBudget) || !/(₹|INR)/.test(indianBudget)) {
  errors.push(`Indian market budget must use INR, got: ${indianBudget}`);
}

if (/EUR|€|\$/.test(indianNoAdsPrice) || !/(₹|INR)/.test(indianNoAdsPrice)) {
  errors.push(`Indian market no-ads price must use INR, got: ${indianNoAdsPrice}`);
}

if (/EUR|€|\$/.test(hindiIndianBudget) || !/(₹|INR)/.test(hindiIndianBudget)) {
  errors.push(`Hindi Indian market budget must use INR, got: ${hindiIndianBudget}`);
}

if (/EUR|€|\$/.test(hindiIndianNoAdsPrice) || !/(₹|INR)/.test(hindiIndianNoAdsPrice)) {
  errors.push(`Hindi Indian market no-ads price must use INR, got: ${hindiIndianNoAdsPrice}`);
}

if (/EUR|€|\$/.test(arabicSaudiBudget) || !/(ر\.س|SAR)/.test(arabicSaudiBudget)) {
  errors.push(`Arabic Saudi market budget must use SAR, got: ${arabicSaudiBudget}`);
}

if (/EUR|€|\$/.test(arabicSaudiNoAdsPrice) || !/(ر\.س|SAR)/.test(arabicSaudiNoAdsPrice)) {
  errors.push(`Arabic Saudi market no-ads price must use SAR, got: ${arabicSaudiNoAdsPrice}`);
}

if (/EUR|€|\$/.test(japaneseBudget) || !/[¥￥]|JPY/.test(japaneseBudget)) {
  errors.push(`Japanese market budget must use JPY, got: ${japaneseBudget}`);
}

if (/EUR|€|\$/.test(japaneseNoAdsPrice) || !/[¥￥]|JPY/.test(japaneseNoAdsPrice)) {
  errors.push(`Japanese market no-ads price must use JPY, got: ${japaneseNoAdsPrice}`);
}

if (/EUR|€|\$/.test(chineseBudget) || !/[¥￥]|CNY|CN¥/.test(chineseBudget)) {
  errors.push(`Chinese market budget must use CNY, got: ${chineseBudget}`);
}

if (/EUR|€|\$/.test(chineseNoAdsPrice) || !/[¥￥]|CNY|CN¥/.test(chineseNoAdsPrice)) {
  errors.push(`Chinese market no-ads price must use CNY, got: ${chineseNoAdsPrice}`);
}

for (const check of additionalMarketChecks) {
  const market = budgetMarketFor(check.language, { locales: check.locales, timeZone: check.timeZone });
  const budget = formatBudgetLabel("Up to 40 EUR", check.language, market);
  const noAdsPrice = formatNoAdsPrice(market);

  const forbiddenCurrencyPattern = check.currencyName === "USD" ? /EUR|€/ : /EUR|€|\$/;

  if (forbiddenCurrencyPattern.test(budget) || !check.currencyPattern.test(budget)) {
    errors.push(`${check.language} market budget must use ${check.currencyName}, got: ${budget}`);
  }

  if (forbiddenCurrencyPattern.test(noAdsPrice) || !check.currencyPattern.test(noAdsPrice)) {
    errors.push(`${check.language} market no-ads price must use ${check.currencyName}, got: ${noAdsPrice}`);
  }
}

for (const code of verifiedLanguageCodes) {
  for (const category of categories) {
    const label = labelFor("category", category, code);
    if (!label || label.trim().length === 0) errors.push(`${code} has an empty category label for ${category}.`);
    if (!englishLanguageCodes.has(code) && (!categoryLabels[code]?.[category] || label === category)) {
      errors.push(`${code} is missing category label ${category}.`);
    }
  }

  for (const budget of budgets) {
    const label = labelFor("budget", budget, code);
    if (!label || label.trim().length === 0) errors.push(`${code} has an empty budget label for ${budget}.`);
    if (!englishLanguageCodes.has(code) && (!budgetLabels[code]?.[budget] || label === budget)) {
      errors.push(`${code} is missing budget label ${budget}.`);
    }
  }

  for (const duration of durations) {
    const label = labelFor("duration", duration, code);
    if (!label || label.trim().length === 0) errors.push(`${code} has an empty duration label for ${duration}.`);
    if (!englishLanguageCodes.has(code) && (!durationLabels[code]?.[duration] || label === duration)) {
      errors.push(`${code} is missing duration label ${duration}.`);
    }
  }

  if (!englishLanguageCodes.has(code)) {
    const tagLabelCounts = new Map();

    for (const tag of allTags) {
      if (!tagLabels[code]?.[tag]) errors.push(`${code} is missing tag label ${tag}.`);
      const label = tagLabels[code]?.[tag];
      if (label) tagLabelCounts.set(label, (tagLabelCounts.get(label) ?? 0) + 1);
    }

    for (const [label, count] of tagLabelCounts) {
      if (count > 8) errors.push(`${code} maps ${count} tags to the same generic label: ${label}`);
    }
  }

  const localizedTitleKeys = new Set();

  for (const idea of dateIdeas) {
    const localized = localizeIdea(idea, code);
    localizedTitleKeys.add(localized.title.toLocaleLowerCase(code).replace(/\s+/g, " ").trim());

    for (const field of ["title", "prompt", "prep"]) {
      if (!localized[field] || /undefined|null/.test(localized[field])) {
        errors.push(`${code} creates invalid ${field} for ${idea.id}.`);
      }

      if (!englishLanguageCodes.has(code)) {
        for (const pattern of englishResiduePatterns) {
          if (pattern.test(localized[field])) {
            errors.push(`${code} still has English residue in ${field} for ${idea.id}: ${localized[field]}`);
            break;
          }
        }
      }
    }
  }

  const minimumLocalizedTitleVariety = Math.min(2500, Math.floor(dateIdeas.length * 0.1));
  if (!englishLanguageCodes.has(code) && localizedTitleKeys.size < minimumLocalizedTitleVariety) {
    errors.push(`${code} localized titles are too generic: ${localizedTitleKeys.size} unique titles for ${dateIdeas.length} ideas.`);
  }

  if (!englishLanguageCodes.has(code)) {
    for (const family of scriptedFamilyCodes) {
      const idea = ideaByFamily.get(family);
      if (!idea) {
        errors.push(`Scripted family ${family} is missing from date ideas.`);
        continue;
      }

      const localized = localizeIdea(idea, code);
      if (localized.title.includes(" · ")) {
        errors.push(`${code} scripted family ${family} fell back to a generic title: ${localized.title}`);
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
