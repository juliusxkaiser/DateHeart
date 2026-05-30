import { dateIdeas } from "../src/dateIdeas.ts";
import { budgetMarketFor, hasSpecificIdeaLocalization, localizeIdea, verifiedLanguageCodes } from "../src/i18n.ts";

const HISTORY_LIMIT = 120;
const FAMILY_REPEAT_WINDOW = 90;
const SESSION_REVEALS = 20;
const errors = [];

const quickModes = {
  all: () => true,
  tonight: (idea) => idea.duration === "Evening" || idea.duration === "60-90 min",
  free: (idea) => idea.budget === "Free",
  home: (idea) => idea.category === "Home" || idea.category === "Rainy Day",
  out: (idea) => ["Outdoors", "Food", "Movement", "Mini Adventure", "Culture", "Seasonal"].includes(idea.category),
  ai: (idea) => idea.family.startsWith("ai-") || idea.title.startsWith("AI "),
};

const priorityLanguages = ["en", "en-US", "de", "fr", "es"];
const testedLanguages = [...new Set([...priorityLanguages, ...verifiedLanguageCodes])];
const ideaById = new Map(dateIdeas.map((idea) => [idea.id, idea]));

function createRng(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

function titleKeyFor(entry, language, market, cache) {
  const cached = cache.get(entry.id);
  if (cached !== undefined) return cached;

  const key = localizeIdea(entry, language, market)
    .title.toLocaleLowerCase(language)
    .replace(/\s+/g, " ")
    .trim();
  cache.set(entry.id, key);
  return key;
}

function pickIdea({ usable, historyIds, currentIdea, language, rng, titleKeyCache }) {
  const usableFamilies = new Set(usable.map((entry) => entry.family));
  const market = budgetMarketFor(language);
  const titleKey = (entry) => titleKeyFor(entry, language, market, titleKeyCache);
  const maxFamilyBlock = Math.min(Math.max(12, Math.ceil(usableFamilies.size * 0.82)), usableFamilies.size - 1, FAMILY_REPEAT_WINDOW);
  const recentFamilies = new Set();

  for (const id of historyIds) {
    if (recentFamilies.size >= maxFamilyBlock) break;
    const family = ideaById.get(id)?.family;
    if (!family || !usableFamilies.has(family)) continue;
    recentFamilies.add(family);
  }

  const idBlockSize = Math.min(Math.max(24, Math.ceil(usable.length * 0.12)), usable.length - 1, HISTORY_LIMIT);
  const recentIds = new Set(historyIds.slice(0, idBlockSize));
  const recentTitleKeys = new Set();

  for (const id of historyIds.slice(0, Math.min(20, HISTORY_LIMIT))) {
    const entry = ideaById.get(id);
    if (entry) recentTitleKeys.add(titleKey(entry));
  }

  const familySafePool = usable.filter((entry) => !recentIds.has(entry.id) && !recentFamilies.has(entry.family));
  const idSafePool = usable.filter((entry) => !recentIds.has(entry.id));
  const notCurrentPool = currentIdea ? usable.filter((entry) => entry.id !== currentIdea.id) : usable;
  const concreteIdea = (entry) => hasSpecificIdeaLocalization(entry.family, language);
  const randomIndex = (length) => Math.floor(rng() * length);
  const pickTitleSafeFrom = (pool) => {
    if (pool.length === 0) return undefined;

    const attempts = Math.min(pool.length, 96);
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const candidate = pool[randomIndex(pool.length)];
      if (!recentTitleKeys.has(titleKey(candidate))) return candidate;
    }

    if (pool.length > 1500) return undefined;

    const safePool = pool.filter((entry) => !recentTitleKeys.has(titleKey(entry)));
    return safePool.length > 0 ? safePool[randomIndex(safePool.length)] : undefined;
  };

  return (
    pickTitleSafeFrom(familySafePool.filter(concreteIdea)) ||
    pickTitleSafeFrom(familySafePool) ||
    pickTitleSafeFrom(idSafePool.filter(concreteIdea)) ||
    pickTitleSafeFrom(idSafePool) ||
    (() => {
      const fallbackPool = familySafePool.length > 0 ? familySafePool : idSafePool.length > 0 ? idSafePool : notCurrentPool.length > 0 ? notCurrentPool : usable;
      return fallbackPool[randomIndex(fallbackPool.length)];
    })()
  );
}

function assert(condition, message) {
  if (!condition) errors.push(message);
}

const modeStats = {};

for (const [mode, matches] of Object.entries(quickModes)) {
  const usable = dateIdeas.filter(matches);
  const familyCount = new Set(usable.map((idea) => idea.family)).size;
  modeStats[mode] = { ideas: usable.length, families: familyCount };
  assert(usable.length >= SESSION_REVEALS, `${mode} mode has too few ideas: ${usable.length}`);
  assert(familyCount >= SESSION_REVEALS, `${mode} mode has too few idea families: ${familyCount}`);
}

for (const language of testedLanguages) {
  const modesToTest = priorityLanguages.includes(language) ? Object.keys(quickModes) : ["all", "ai"];

  for (const mode of modesToTest) {
    const usable = dateIdeas.filter(quickModes[mode]);
    const rng = createRng((language + mode).split("").reduce((sum, char) => sum + char.charCodeAt(0), 17));
    const titleKeyCache = new Map();
    const market = budgetMarketFor(language);
    const historyIds = [];
    const seenFamilies = new Set();
    const seenTitles = new Set();
    let currentIdea;

    for (let reveal = 0; reveal < SESSION_REVEALS; reveal += 1) {
      const picked = pickIdea({ usable, historyIds, currentIdea, language, rng, titleKeyCache });
      const localizedTitle = titleKeyFor(picked, language, market, titleKeyCache);

      assert(!seenFamilies.has(picked.family), `${language}/${mode} repeated family ${picked.family} inside a ${SESSION_REVEALS}-card session.`);
      assert(!seenTitles.has(localizedTitle), `${language}/${mode} repeated localized title "${localizedTitle}" inside a ${SESSION_REVEALS}-card session.`);

      seenFamilies.add(picked.family);
      seenTitles.add(localizedTitle);
      currentIdea = picked;
      historyIds.unshift(picked.id);
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
      ideas: dateIdeas.length,
      testedLanguages: testedLanguages.length,
      sessionReveals: SESSION_REVEALS,
      modes: modeStats,
      ok: true,
    },
    null,
    2,
  ),
);
