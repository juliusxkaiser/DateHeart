import { readFile } from "node:fs/promises";
import { budgets, categories, dateIdeas, durations } from "../src/dateIdeas.ts";
import { budgetMarketFor, labelFor, translations, verifiedLanguageCodes } from "../src/i18n.ts";

const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

for (const category of categories) {
  const count = dateIdeas.filter((idea) => idea.category === category).length;
  assert(count >= 20, `Category ${category} has too few ideas: ${count}`);
}

for (const budget of budgets) {
  const count = dateIdeas.filter((idea) => idea.budget === budget).length;
  assert(count >= 20, `Budget ${budget} has too few ideas: ${count}`);
}

for (const duration of durations) {
  const count = dateIdeas.filter((idea) => idea.duration === duration).length;
  assert(count >= 20, `Duration ${duration} has too few ideas: ${count}`);
}

for (const language of verifiedLanguageCodes) {
  const market = budgetMarketFor(language);
  const copy = translations[language];
  assert(copy.filters && copy.category && copy.budget && copy.duration, `${language} is missing filter copy.`);

  for (const category of categories) {
    assert(labelFor("category", category, language), `${language} missing category label: ${category}`);
  }

  for (const budget of budgets) {
    assert(labelFor("budget", budget, language, market), `${language} missing budget label: ${budget}`);
  }

  for (const duration of durations) {
    assert(labelFor("duration", duration, language), `${language} missing duration label: ${duration}`);
  }
}

const envExample = await readFile(".env.example", "utf8");
assert(/VITE_APP_SHARE_URL=https:\/\/\S+/.test(envExample), ".env.example must contain an HTTPS VITE_APP_SHARE_URL.");

const mainSource = await readFile("src/main.ts", "utf8");
assert(mainSource.includes("VITE_APP_SHARE_URL"), "Share URL env hook is missing from the app.");
assert(/navigator\.share\(\{\s*title:\s*APP_NAME,\s*text,\s*url:\s*shareUrl\s*\}\)/s.test(mainSource), "Native share payload must include url.");

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      categories: categories.length,
      budgets: budgets.length,
      durations: durations.length,
      ideas: dateIdeas.length,
      verifiedLanguages: verifiedLanguageCodes.length,
      ok: true,
    },
    null,
    2,
  ),
);
