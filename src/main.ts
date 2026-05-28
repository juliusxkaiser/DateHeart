import * as THREE from "three";
import "./styles.css";
import {
  budgets,
  categories,
  dateIdeas,
  defaultFilters,
  durations,
  filterIdeas,
  type Budget,
  type DateCategory,
  type DateIdea,
  type Duration,
  type IdeaFilters,
} from "./dateIdeas";
import {
  budgetMarketFor,
  formatNoAdsPrice,
  labelFor,
  isLanguageCode,
  languages,
  localizeIdea,
  translations,
  type LanguageCode,
} from "./i18n";

const STORAGE_KEYS = {
  favorites: "dateheart:favorites",
  history: "dateheart:history",
  filters: "dateheart:filters",
  language: "dateheart:language",
  stats: "dateheart:stats",
  noAds: "dateheart:no_ads",
};

const APP_NAME = "DateHeart";
const AD_EVERY_REVEALS = 7;
const ENABLE_AD_BANNER = false;
const ENABLE_INTERSTITIAL_AD = false;
const HISTORY_LIMIT = 40;

type PersistedStats = {
  reveals: number;
  adBreaks: number;
};

const icon = (name: "globe" | "info" | "sliders" | "history" | "heart" | "share" | "x" | "spark" | "star") => {
  const paths = {
    globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15 15 0 0 1 0 20"/><path d="M12 2a15 15 0 0 0 0 20"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 17v-6"/><path d="M12 8h.01"/>',
    sliders: '<path d="M4 7h8"/><path d="M16 7h4"/><path d="M14 5v4"/><path d="M4 17h4"/><path d="M12 17h8"/><path d="M10 15v4"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 7v5l3 2"/>',
    heart: '<path d="M20.8 5.7a5.4 5.4 0 0 0-7.6 0L12 6.9l-1.2-1.2a5.4 5.4 0 1 0-7.6 7.6L12 22l8.8-8.7a5.4 5.4 0 0 0 0-7.6Z"/>',
    share: '<path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M16 6 12 2 8 6"/><path d="M12 2v14"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    spark: '<path d="m12 2 1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7Z"/><path d="m19 17 .7 2.3L22 20l-2.3.7L19 23l-.7-2.3L16 20l2.3-.7Z"/>',
    star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.8 1.2 6.9-6.2-3.3L5.8 21 7 14.1 2 9.3l6.9-1Z"/>',
  } satisfies Record<string, string>;

  return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${paths[name]}</svg>`;
};

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("App root not found");
}

app.innerHTML = `
  <div class="app-shell">
    <header class="topbar">
      <div class="topbar-actions">
        <button class="icon-button" id="historyButton" type="button" aria-label="History" title="History">
          ${icon("history")}
        </button>
        <button class="icon-button" id="filterButton" type="button" aria-label="Filter" title="Filter">
          ${icon("sliders")}
        </button>
        <button class="icon-button" id="noAdsButton" type="button" aria-label="Remove ads" title="Remove ads">
          ${icon("star")}
        </button>
      </div>
      <h1 class="brand-title">
        <span class="brand-word">${APP_NAME}</span>
      </h1>
      <div class="topbar-actions">
        <button class="icon-button" id="favoritesButton" type="button" aria-label="Favorites" title="Favorites">
          ${icon("heart")}
        </button>
        <button class="icon-button" id="languageButton" type="button" aria-label="Language" title="Language">
          ${icon("globe")}
        </button>
        <button class="icon-button" id="infoButton" type="button" aria-label="Info" title="Info">
          ${icon("info")}
        </button>
      </div>
    </header>

    <main class="stage" aria-labelledby="stageTitle">
      <p class="counter" id="ideaCounter"></p>
      <h2 class="sr-only" id="stageTitle">Pull a date cue</h2>
      <div class="heart-wrap">
        <button class="heart-button" id="heartButton" type="button" aria-label="Tap the heart for a date cue">
          <canvas id="heartCanvas"></canvas>
        </button>
      </div>
      <p class="tap-copy" id="tapCopy">Tap the heart. Get your next date cue.</p>
    </main>

    <aside class="ad-banner" id="adBanner" aria-label="Ad" hidden>
      <span id="adBannerLabel">Ad</span>
      <strong id="adBannerText">Free app - reserved AdMob banner slot</strong>
    </aside>
  </div>

  <div class="overlay" id="resultOverlay" hidden>
    <article class="result-card" role="dialog" aria-modal="true" aria-labelledby="resultTitle">
      <button class="close-button" id="closeResultButton" type="button" aria-label="Close" title="Close">${icon("x")}</button>
      <span class="result-label" id="resultLabel">Your date cue:</span>
      <h2 id="resultTitle"></h2>
      <p id="resultPrompt"></p>
      <div class="meta-row" id="resultMeta"></div>
      <div class="prep-box">
        <span id="prepLabel">Prepare</span>
        <strong id="resultPrep"></strong>
      </div>
      <div class="result-actions">
        <button class="secondary-button" id="favoriteButton" type="button">${icon("heart")} Save</button>
        <button class="secondary-button" id="shareButton" type="button">${icon("share")} Share</button>
        <button class="primary-button" id="againButton" type="button">${icon("spark")} New cue</button>
      </div>
    </article>
  </div>

  <div class="panel" id="filterPanel" hidden>
    <section class="panel-card" role="dialog" aria-modal="true" aria-labelledby="filterTitle">
      <div class="panel-header">
        <h2 id="filterTitle">Filters</h2>
        <button class="close-button" id="closeFilterButton" type="button" aria-label="Close" title="Close">${icon("x")}</button>
      </div>
      <div class="filter-group">
        <h3 id="categoryLabel">Category</h3>
        <div class="chip-grid" id="categoryChips"></div>
      </div>
      <div class="filter-group">
        <h3 id="budgetLabel">Budget</h3>
        <div class="chip-grid compact" id="budgetChips"></div>
      </div>
      <div class="filter-group">
        <h3 id="durationLabel">Duration</h3>
        <div class="chip-grid compact" id="durationChips"></div>
      </div>
      <button class="primary-button wide" id="resetFiltersButton" type="button">Allow all ideas</button>
    </section>
  </div>

  <div class="panel" id="languagePanel" hidden>
    <section class="panel-card tall" role="dialog" aria-modal="true" aria-labelledby="languageTitle">
      <div class="panel-header">
        <h2 id="languageTitle">Language</h2>
        <button class="close-button" id="closeLanguageButton" type="button" aria-label="Close" title="Close">${icon("x")}</button>
      </div>
      <div class="language-list" id="languageList"></div>
    </section>
  </div>

  <div class="panel" id="libraryPanel" hidden>
    <section class="panel-card tall" role="dialog" aria-modal="true" aria-labelledby="libraryTitle">
      <div class="panel-header">
        <h2 id="libraryTitle">History</h2>
        <button class="close-button" id="closeLibraryButton" type="button" aria-label="Close" title="Close">${icon("x")}</button>
      </div>
      <div class="idea-list" id="ideaList"></div>
    </section>
  </div>

  <div class="overlay" id="infoOverlay" hidden>
    <article class="result-card info-card" role="dialog" aria-modal="true" aria-labelledby="infoTitle">
      <button class="close-button" id="closeInfoButton" type="button" aria-label="Close" title="Close">${icon("x")}</button>
      <span class="result-label">About</span>
      <h2 id="infoTitle">What is ${APP_NAME}?</h2>
      <p>${APP_NAME} gives couples practical date ideas with one tap. Use categories, budget and duration to narrow the cue, then save the ideas you actually want to do.</p>
      <div class="info-points">
        <span>Practical date cues</span>
        <span>Favorites and history</span>
        <span>Free app concept</span>
      </div>
    </article>
  </div>

  <div class="overlay" id="purchaseOverlay" hidden>
    <article class="result-card purchase-card" role="dialog" aria-modal="true" aria-labelledby="purchaseTitle">
      <button class="close-button" id="closePurchaseButton" type="button" aria-label="Close" title="Close">${icon("x")}</button>
      <span class="result-label" id="purchaseLabel">Remove ads</span>
      <h2 id="purchaseTitle">DateHeart without ads</h2>
      <strong class="price-pill" id="purchasePrice"></strong>
      <p id="purchaseBody">Remove future ad placements from DateHeart with a one-time purchase.</p>
      <button class="primary-button wide" id="buyNoAdsButton" type="button">Buy</button>
    </article>
  </div>

  <div class="ad-break" id="adBreak" hidden>
    <section class="ad-break-card" role="dialog" aria-modal="true" aria-labelledby="adBreakTitle">
      <span id="adBreakLabel">Ad</span>
      <h2 id="adBreakTitle">Short ad moment</h2>
      <p id="adBreakBody">This is the reserved interstitial placement for a later AdMob integration.</p>
      <button class="primary-button wide" id="closeAdBreakButton" type="button" disabled>Continue</button>
    </section>
  </div>
`;

const elements = {
  heartCanvas: document.querySelector<HTMLCanvasElement>("#heartCanvas")!,
  heartButton: document.querySelector<HTMLButtonElement>("#heartButton")!,
  ideaCounter: document.querySelector<HTMLParagraphElement>("#ideaCounter")!,
  stageTitle: document.querySelector<HTMLHeadingElement>("#stageTitle")!,
  resultOverlay: document.querySelector<HTMLDivElement>("#resultOverlay")!,
  resultTitle: document.querySelector<HTMLHeadingElement>("#resultTitle")!,
  resultPrompt: document.querySelector<HTMLParagraphElement>("#resultPrompt")!,
  resultMeta: document.querySelector<HTMLDivElement>("#resultMeta")!,
  resultPrep: document.querySelector<HTMLElement>("#resultPrep")!,
  favoriteButton: document.querySelector<HTMLButtonElement>("#favoriteButton")!,
  shareButton: document.querySelector<HTMLButtonElement>("#shareButton")!,
  againButton: document.querySelector<HTMLButtonElement>("#againButton")!,
  closeResultButton: document.querySelector<HTMLButtonElement>("#closeResultButton")!,
  filterButton: document.querySelector<HTMLButtonElement>("#filterButton")!,
  noAdsButton: document.querySelector<HTMLButtonElement>("#noAdsButton")!,
  favoritesButton: document.querySelector<HTMLButtonElement>("#favoritesButton")!,
  languageButton: document.querySelector<HTMLButtonElement>("#languageButton")!,
  filterPanel: document.querySelector<HTMLDivElement>("#filterPanel")!,
  closeFilterButton: document.querySelector<HTMLButtonElement>("#closeFilterButton")!,
  categoryChips: document.querySelector<HTMLDivElement>("#categoryChips")!,
  budgetChips: document.querySelector<HTMLDivElement>("#budgetChips")!,
  durationChips: document.querySelector<HTMLDivElement>("#durationChips")!,
  tapCopy: document.querySelector<HTMLParagraphElement>("#tapCopy")!,
  resultLabel: document.querySelector<HTMLElement>("#resultLabel")!,
  prepLabel: document.querySelector<HTMLElement>("#prepLabel")!,
  categoryLabel: document.querySelector<HTMLElement>("#categoryLabel")!,
  budgetLabel: document.querySelector<HTMLElement>("#budgetLabel")!,
  durationLabel: document.querySelector<HTMLElement>("#durationLabel")!,
  resetFiltersButton: document.querySelector<HTMLButtonElement>("#resetFiltersButton")!,
  historyButton: document.querySelector<HTMLButtonElement>("#historyButton")!,
  libraryPanel: document.querySelector<HTMLDivElement>("#libraryPanel")!,
  closeLibraryButton: document.querySelector<HTMLButtonElement>("#closeLibraryButton")!,
  ideaList: document.querySelector<HTMLDivElement>("#ideaList")!,
  infoButton: document.querySelector<HTMLButtonElement>("#infoButton")!,
  infoOverlay: document.querySelector<HTMLDivElement>("#infoOverlay")!,
  closeInfoButton: document.querySelector<HTMLButtonElement>("#closeInfoButton")!,
  purchaseOverlay: document.querySelector<HTMLDivElement>("#purchaseOverlay")!,
  closePurchaseButton: document.querySelector<HTMLButtonElement>("#closePurchaseButton")!,
  purchaseLabel: document.querySelector<HTMLElement>("#purchaseLabel")!,
  purchaseTitle: document.querySelector<HTMLHeadingElement>("#purchaseTitle")!,
  purchasePrice: document.querySelector<HTMLElement>("#purchasePrice")!,
  purchaseBody: document.querySelector<HTMLParagraphElement>("#purchaseBody")!,
  buyNoAdsButton: document.querySelector<HTMLButtonElement>("#buyNoAdsButton")!,
  languagePanel: document.querySelector<HTMLDivElement>("#languagePanel")!,
  closeLanguageButton: document.querySelector<HTMLButtonElement>("#closeLanguageButton")!,
  languageTitle: document.querySelector<HTMLHeadingElement>("#languageTitle")!,
  languageList: document.querySelector<HTMLDivElement>("#languageList")!,
  adBanner: document.querySelector<HTMLElement>("#adBanner")!,
  adBannerLabel: document.querySelector<HTMLElement>("#adBannerLabel")!,
  adBannerText: document.querySelector<HTMLElement>("#adBannerText")!,
  adBreak: document.querySelector<HTMLDivElement>("#adBreak")!,
  adBreakLabel: document.querySelector<HTMLElement>("#adBreakLabel")!,
  adBreakTitle: document.querySelector<HTMLHeadingElement>("#adBreakTitle")!,
  adBreakBody: document.querySelector<HTMLParagraphElement>("#adBreakBody")!,
  closeAdBreakButton: document.querySelector<HTMLButtonElement>("#closeAdBreakButton")!,
};

function loadJson<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

function normalizeFilters(value: IdeaFilters): IdeaFilters {
  return {
    category: categories.includes(value.category as DateCategory) ? value.category : "All",
    budget: budgets.includes(value.budget as Budget) ? value.budget : "All",
    duration: durations.includes(value.duration as Duration) ? value.duration : "All",
  };
}

function loadLanguage() {
  const saved = localStorage.getItem(STORAGE_KEYS.language);
  if (isLanguageCode(saved)) return saved;
  return "en";
}

function activeBudgetMarket() {
  const params = new URLSearchParams(window.location.search);
  const locales = navigator.languages.length > 0 ? navigator.languages : [navigator.language];
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return budgetMarketFor(activeLanguage, {
    locales,
    regionOverride: params.get("region") ?? params.get("market"),
    timeZone,
  });
}

let activeLanguage = loadLanguage();
let t = translations[activeLanguage];
let filters = normalizeFilters(loadJson<IdeaFilters>(STORAGE_KEYS.filters, defaultFilters));
let historyIds = loadJson<string[]>(STORAGE_KEYS.history, []);
let favoriteIds = new Set(loadJson<string[]>(STORAGE_KEYS.favorites, []));
let stats = loadJson<PersistedStats>(STORAGE_KEYS.stats, { reveals: 0, adBreaks: 0 });
let currentIdea: DateIdea | null = null;
let activeLibraryMode: "history" | "favorites" = "history";
let revealLocked = false;
let noAdsPurchased = localStorage.getItem(STORAGE_KEYS.noAds) === "true";

const ideaById = new Map(dateIdeas.map((entry) => [entry.id, entry]));

function randomIndex(length: number) {
  return crypto.getRandomValues(new Uint32Array(1))[0] % length;
}

class HeartScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  private heart: THREE.Mesh;
  private heartMaterial: THREE.MeshPhysicalMaterial;
  private burstLight: THREE.PointLight;
  private pulseUntil = 0;
  private startedAt = performance.now();

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.camera.position.set(0, 0, 10.8);

    const heartGeometry = this.createHeartGeometry();
    this.heartMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xe9002f,
      emissive: 0x4b0012,
      emissiveIntensity: 0.12,
      roughness: 0.38,
      metalness: 0.06,
      clearcoat: 0.42,
      clearcoatRoughness: 0.34,
    });

    this.heart = new THREE.Mesh(heartGeometry, this.heartMaterial);
    this.heart.rotation.x = -0.2;
    this.heart.rotation.z = Math.PI;
    this.scene.add(this.heart);

    this.scene.add(new THREE.HemisphereLight(0xfff2f4, 0x7a102a, 1.85));

    const key = new THREE.DirectionalLight(0xfff0f2, 2.25);
    key.position.set(-3, 4, 5);
    this.scene.add(key);

    const rim = new THREE.DirectionalLight(0xffbe84, 1.15);
    rim.position.set(3, -2, 3);
    this.scene.add(rim);

    this.burstLight = new THREE.PointLight(0xffcad2, 0, 12);
    this.burstLight.position.set(0, 0, 3.5);
    this.scene.add(this.burstLight);

    this.resize();
    window.addEventListener("resize", () => this.resize());
    this.animate();
  }

  pulse() {
    this.pulseUntil = performance.now() + 1050;
  }

  private createHeartGeometry() {
    const points: THREE.Vector2[] = [];
    const steps = 160;

    for (let index = 0; index <= steps; index += 1) {
      const t = (Math.PI * 2 * index) / steps;
      const x = 16 * Math.sin(t) ** 3;
      const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      points.push(new THREE.Vector2(x * 0.16, -y * 0.16));
    }

    const shape = new THREE.Shape(points);
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.9,
      bevelEnabled: true,
      bevelThickness: 0.25,
      bevelSize: 0.22,
      bevelSegments: 16,
      curveSegments: 24,
    });

    geometry.center();
    return geometry;
  }

  private resize() {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private animate = () => {
    const now = performance.now();
    const elapsed = (now - this.startedAt) / 1000;
    const pulseProgress = Math.max(0, this.pulseUntil - now) / 1050;
    const pulse = pulseProgress > 0 ? Math.sin((1 - pulseProgress) * Math.PI) : 0;
    const hit = pulseProgress > 0 ? Math.sin((1 - pulseProgress) * Math.PI * 3) * pulse : 0;

    this.heart.rotation.y = Math.sin(elapsed * 0.9) * 0.22 + pulse * 0.56;
    this.heart.rotation.x = -0.2 + Math.sin(elapsed * 1.35) * 0.06 - pulse * 0.18 + hit * 0.1;
    this.heart.rotation.z = Math.PI;
    this.heart.scale.setScalar(0.78 + pulse * 0.24 + Math.sin(elapsed * 2.1) * 0.01 + Math.max(hit, 0) * 0.03);
    this.heartMaterial.emissiveIntensity = 0.12 + pulse * 0.52;
    this.burstLight.intensity = pulse * 13;

    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.animate);
  };
}

const heartScene = new HeartScene(elements.heartCanvas);

function pickIdea() {
  const filtered = filterIdeas(filters);
  const usable = filtered.length > 0 ? filtered : dateIdeas;
  const usableFamilies = new Set(usable.map((entry) => entry.family));
  const maxFamilyBlock = Math.min(Math.max(8, Math.ceil(usableFamilies.size * 0.45)), usableFamilies.size - 1, HISTORY_LIMIT);
  const recentFamilies = new Set<string>();

  for (const id of historyIds) {
    const family = ideaById.get(id)?.family;
    if (!family || !usableFamilies.has(family)) continue;
    recentFamilies.add(family);
    if (recentFamilies.size >= maxFamilyBlock) break;
  }

  const idBlockSize = Math.min(Math.max(16, Math.ceil(usable.length * 0.08)), usable.length - 1, HISTORY_LIMIT);
  const recentIds = new Set(historyIds.slice(0, idBlockSize));
  const familySafePool = usable.filter((entry) => !recentIds.has(entry.id) && !recentFamilies.has(entry.family));
  const idSafePool = usable.filter((entry) => !recentIds.has(entry.id));
  const notCurrentPool = currentIdea ? usable.filter((entry) => entry.id !== currentIdea?.id) : usable;
  const source = familySafePool.length > 0 ? familySafePool : idSafePool.length > 0 ? idSafePool : notCurrentPool.length > 0 ? notCurrentPool : usable;

  return source[randomIndex(source.length)];
}

function revealIdea() {
  if (revealLocked) return;

  revealLocked = true;
  currentIdea = pickIdea();
  stats = {
    reveals: stats.reveals + 1,
    adBreaks: stats.adBreaks,
  };
  historyIds = [currentIdea.id, ...historyIds.filter((id) => id !== currentIdea?.id)].slice(0, HISTORY_LIMIT);

  saveJson(STORAGE_KEYS.history, historyIds);
  saveJson(STORAGE_KEYS.stats, stats);
  updateCounter();
  heartScene.pulse();
  spawnSparks();
  elements.heartButton.classList.add("is-pulsing");
  window.setTimeout(() => elements.heartButton.classList.remove("is-pulsing"), 920);
  navigator.vibrate?.(22);

  window.setTimeout(() => {
    showResult(currentIdea!);
    revealLocked = false;

    if (!noAdsPurchased && ENABLE_INTERSTITIAL_AD && stats.reveals > 0 && stats.reveals % AD_EVERY_REVEALS === 0) {
      window.setTimeout(showAdBreak, 700);
    }
  }, 620);
}

function spawnSparks() {
  for (let index = 0; index < 34; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 62 + Math.random() * 136;
    const spark = document.createElement("span");
    spark.className = "spark";
    spark.style.setProperty("--x", `${Math.cos(angle) * distance}px`);
    spark.style.setProperty("--y", `${Math.sin(angle) * distance}px`);
    spark.style.setProperty("--delay", `${Math.random() * 120}ms`);
    spark.style.setProperty("--size", `${5 + Math.random() * 9}px`);
    spark.style.setProperty("--spark-color", Math.random() > 0.5 ? "#fff5f7" : "#ffd1a8");
    elements.heartButton.append(spark);
    window.setTimeout(() => spark.remove(), 980);
  }
}

function showResult(idea: DateIdea) {
  const market = activeBudgetMarket();
  const displayIdea = localizeIdea(idea, activeLanguage, market);
  elements.resultTitle.textContent = displayIdea.title;
  elements.resultPrompt.textContent = displayIdea.prompt;
  elements.resultPrep.textContent = displayIdea.prep;
  elements.resultMeta.innerHTML = [
    labelFor("category", idea.category, activeLanguage),
    labelFor("budget", idea.budget, activeLanguage, market),
    labelFor("duration", idea.duration, activeLanguage),
    ...displayIdea.tags.slice(0, 2),
  ]
    .map((item) => `<span>${item}</span>`)
    .join("");
  syncFavoriteButton();
  elements.resultOverlay.hidden = false;
  elements.resultOverlay.classList.add("visible");
}

function hideResult() {
  elements.resultOverlay.classList.remove("visible");
  window.setTimeout(() => {
    elements.resultOverlay.hidden = true;
  }, 170);
}

function syncFavoriteButton() {
  if (!currentIdea) return;
  const isFavorite = favoriteIds.has(currentIdea.id);
  elements.favoriteButton.classList.toggle("active", isFavorite);
  elements.favoriteButton.innerHTML = `${icon("heart")} ${isFavorite ? t.saved : t.save}`;
}

function toggleFavorite() {
  if (!currentIdea) return;

  if (favoriteIds.has(currentIdea.id)) {
    favoriteIds.delete(currentIdea.id);
  } else {
    favoriteIds.add(currentIdea.id);
  }

  saveJson(STORAGE_KEYS.favorites, [...favoriteIds]);
  syncFavoriteButton();
  renderLibrary();
}

async function shareCurrentIdea() {
  if (!currentIdea) return;

  const displayIdea = localizeIdea(currentIdea, activeLanguage, activeBudgetMarket());
  const text = `${APP_NAME}: ${displayIdea.title}\n${displayIdea.prompt}\n${t.prep}: ${displayIdea.prep}`;

  if (navigator.share) {
    await navigator.share({ title: APP_NAME, text });
    return;
  }

  await navigator.clipboard.writeText(text);
  elements.shareButton.textContent = t.copied;
  window.setTimeout(() => {
    elements.shareButton.innerHTML = `${icon("share")} ${t.share}`;
  }, 1200);
}

function renderFilterGroup<T extends string>(
  container: HTMLElement,
  values: readonly T[],
  current: T | "All",
  onPick: (value: T | "All") => void,
) {
  const market = activeBudgetMarket();
  container.innerHTML = ["All", ...values]
    .map((value) => {
      const selected = value === current ? " active" : "";
      const label = value === "All" ? t.all : labelFor(
        container === elements.categoryChips ? "category" : container === elements.budgetChips ? "budget" : "duration",
        value,
        activeLanguage,
        market,
      );
      return `<button class="chip${selected}" type="button" data-value="${value}">${label}</button>`;
    })
    .join("");

  container.querySelectorAll<HTMLButtonElement>(".chip").forEach((button) => {
    button.addEventListener("click", () => onPick(button.dataset.value as T | "All"));
  });
}

function renderFilters() {
  renderFilterGroup(elements.categoryChips, categories, filters.category, (value) => {
    filters = { ...filters, category: value as DateCategory | "All" };
    saveFilters();
  });
  renderFilterGroup(elements.budgetChips, budgets, filters.budget, (value) => {
    filters = { ...filters, budget: value as Budget | "All" };
    saveFilters();
  });
  renderFilterGroup(elements.durationChips, durations, filters.duration, (value) => {
    filters = { ...filters, duration: value as Duration | "All" };
    saveFilters();
  });
}

function saveFilters() {
  saveJson(STORAGE_KEYS.filters, filters);
  renderFilters();
  updateCounter();
}

function updateCounter() {
  const market = activeBudgetMarket();
  const detail = [
    filters.category !== "All" ? labelFor("category", filters.category, activeLanguage) : "",
    filters.budget !== "All" ? labelFor("budget", filters.budget, activeLanguage, market) : "",
    filters.duration !== "All" ? labelFor("duration", filters.duration, activeLanguage) : "",
  ]
    .filter(Boolean)
    .join(" · ");
  elements.ideaCounter.textContent = detail || t.ready;
}

function renderLibrary() {
  const ids = activeLibraryMode === "history" ? historyIds : [...favoriteIds];
  const items = ids
    .map((id) => dateIdeas.find((ideaEntry) => ideaEntry.id === id))
    .filter(Boolean) as DateIdea[];

  document.querySelector<HTMLHeadingElement>("#libraryTitle")!.textContent =
    activeLibraryMode === "history" ? t.history : t.favorites;

  if (items.length === 0) {
    elements.ideaList.innerHTML = `<p class="empty-state">${activeLibraryMode === "history" ? t.emptyHistory : t.emptyFavorites}</p>`;
    return;
  }

  elements.ideaList.innerHTML = items
    .map((entry) => {
      const market = activeBudgetMarket();
      const displayIdea = localizeIdea(entry, activeLanguage, market);
      return `
        <button class="idea-row" type="button" data-id="${entry.id}">
          <span>${labelFor("category", entry.category, activeLanguage)} · ${labelFor("budget", entry.budget, activeLanguage, market)}</span>
          <strong>${displayIdea.title}</strong>
          <small>${displayIdea.prompt}</small>
        </button>
      `;
    })
    .join("");

  elements.ideaList.querySelectorAll<HTMLButtonElement>(".idea-row").forEach((row) => {
    row.addEventListener("click", () => {
      const selected = dateIdeas.find((entry) => entry.id === row.dataset.id);
      if (!selected) return;
      currentIdea = selected;
      elements.libraryPanel.hidden = true;
      showResult(selected);
    });
  });
}

function openPanel(panel: HTMLElement) {
  panel.hidden = false;
  panel.classList.add("visible");
}

function closePanel(panel: HTMLElement) {
  panel.classList.remove("visible");
  window.setTimeout(() => {
    panel.hidden = true;
  }, 170);
}

function showAdBreak() {
  stats = { ...stats, adBreaks: stats.adBreaks + 1 };
  saveJson(STORAGE_KEYS.stats, stats);
  elements.closeAdBreakButton.disabled = true;
  elements.closeAdBreakButton.textContent = t.continueIn.replace("{seconds}", "2");
  elements.adBreak.hidden = false;
  elements.adBreak.classList.add("visible");

  let remaining = 2;
  const timer = window.setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      window.clearInterval(timer);
      elements.closeAdBreakButton.disabled = false;
      elements.closeAdBreakButton.textContent = t.continue;
    } else {
      elements.closeAdBreakButton.textContent = t.continueIn.replace("{seconds}", String(remaining));
    }
  }, 1000);
}

function showInfo() {
  applyTranslations();
  openPanel(elements.infoOverlay);
}

function showPurchase() {
  applyTranslations();
  openPanel(elements.purchaseOverlay);
}

function buyNoAds() {
  noAdsPurchased = true;
  localStorage.setItem(STORAGE_KEYS.noAds, "true");
  elements.adBanner.hidden = true;
  applyTranslations();
  window.setTimeout(() => closePanel(elements.purchaseOverlay), 360);
}

function renderLanguageList() {
  elements.languageList.innerHTML = languages
    .map(
      (language) => `
        <button class="language-row${language.code === activeLanguage ? " active" : ""}${language.available ? "" : " unavailable"}" type="button" data-language="${language.code}"${language.available ? "" : " disabled"}>
          <span class="language-flag" aria-hidden="true">${language.flag}</span>
          <span class="language-copy">
            <strong>${language.nativeName}</strong>
            <small>${language.name}</small>
          </span>
        </button>
      `,
    )
    .join("");

  elements.languageList.querySelectorAll<HTMLButtonElement>(".language-row").forEach((button) => {
    button.addEventListener("click", () => {
      if (!isLanguageCode(button.dataset.language)) return;
      activeLanguage = button.dataset.language;
      localStorage.setItem(STORAGE_KEYS.language, activeLanguage);
      t = translations[activeLanguage];
      applyTranslations();
      renderFilters();
      renderLibrary();
      if (currentIdea && !elements.resultOverlay.hidden) showResult(currentIdea);
      closePanel(elements.languagePanel);
    });
  });
}

function applyTranslations() {
  const noAdsPrice = formatNoAdsPrice(activeBudgetMarket());

  document.documentElement.lang = activeLanguage;
  document.documentElement.dir = languages.find((language) => language.code === activeLanguage)?.dir ?? "ltr";

  elements.ideaCounter.textContent = t.ready;
  elements.stageTitle.textContent = t.resultLabel.replace(":", "");
  elements.heartButton.setAttribute("aria-label", t.tapCopy);
  elements.tapCopy.textContent = t.tapCopy;
  elements.resultLabel.textContent = t.resultLabel;
  elements.prepLabel.textContent = t.prep;
  elements.favoriteButton.innerHTML = `${icon("heart")} ${currentIdea && favoriteIds.has(currentIdea.id) ? t.saved : t.save}`;
  elements.shareButton.innerHTML = `${icon("share")} ${t.share}`;
  elements.againButton.innerHTML = `${icon("spark")} ${t.next}`;
  elements.filterButton.setAttribute("aria-label", t.filters);
  elements.filterButton.title = t.filters;
  elements.noAdsButton.setAttribute("aria-label", t.removeAds);
  elements.noAdsButton.title = t.removeAds;
  elements.noAdsButton.classList.toggle("active", noAdsPurchased);
  elements.favoritesButton.setAttribute("aria-label", t.favorites);
  elements.favoritesButton.title = t.favorites;
  elements.historyButton.setAttribute("aria-label", t.history);
  elements.historyButton.title = t.history;
  elements.infoButton.setAttribute("aria-label", t.about);
  elements.infoButton.title = t.about;
  elements.languageButton.setAttribute("aria-label", t.language);
  elements.languageButton.title = t.language;
  [
    elements.closeResultButton,
    elements.closeFilterButton,
    elements.closeLanguageButton,
    elements.closeLibraryButton,
    elements.closeInfoButton,
    elements.closePurchaseButton,
  ].forEach((button) => {
    button.setAttribute("aria-label", t.close);
    button.title = t.close;
  });
  document.querySelector<HTMLHeadingElement>("#filterTitle")!.textContent = t.filters;
  elements.categoryLabel.textContent = t.category;
  elements.budgetLabel.textContent = t.budget;
  elements.durationLabel.textContent = t.duration;
  elements.resetFiltersButton.textContent = t.reset;
  elements.languageTitle.textContent = t.language;
  document.querySelector<HTMLElement>("#infoTitle")!.textContent = t.aboutTitle;
  elements.infoOverlay.querySelector<HTMLSpanElement>(".result-label")!.textContent = t.about;
  const infoParagraph = elements.infoOverlay.querySelector<HTMLParagraphElement>("p");
  if (infoParagraph) infoParagraph.textContent = t.aboutBody;
  const infoPoints = elements.infoOverlay.querySelectorAll<HTMLSpanElement>(".info-points span");
  [t.aboutPoint1, t.aboutPoint2, t.aboutPoint3].forEach((text, index) => {
    if (infoPoints[index]) infoPoints[index].textContent = text;
  });
  elements.purchaseLabel.textContent = t.removeAds;
  elements.purchaseTitle.textContent = t.removeAdsTitle;
  elements.purchasePrice.textContent = noAdsPrice;
  elements.purchaseBody.textContent = t.removeAdsBody;
  elements.buyNoAdsButton.textContent = noAdsPurchased ? t.noAdsPurchased : t.buyNoAds.replace("{price}", noAdsPrice);
  elements.buyNoAdsButton.disabled = noAdsPurchased;
  elements.adBanner.setAttribute("aria-label", t.adLabel);
  elements.adBannerLabel.textContent = t.adLabel;
  elements.adBannerText.textContent = t.adBanner;
  elements.adBreakLabel.textContent = t.adLabel;
  elements.adBreakTitle.textContent = t.adBreakTitle;
  elements.adBreakBody.textContent = t.adBreakBody;
  elements.closeAdBreakButton.textContent = elements.closeAdBreakButton.disabled ? t.continueIn.replace("{seconds}", "2") : t.continue;
  updateCounter();
}

elements.heartButton.addEventListener("click", revealIdea);
elements.againButton.addEventListener("click", () => {
  hideResult();
  window.setTimeout(revealIdea, 190);
});
elements.closeResultButton.addEventListener("click", hideResult);
elements.resultOverlay.addEventListener("click", (event) => {
  if (event.target === elements.resultOverlay) hideResult();
});
elements.favoriteButton.addEventListener("click", toggleFavorite);
elements.shareButton.addEventListener("click", () => void shareCurrentIdea());
elements.filterButton.addEventListener("click", () => openPanel(elements.filterPanel));
elements.noAdsButton.addEventListener("click", showPurchase);
elements.buyNoAdsButton.addEventListener("click", buyNoAds);
elements.languageButton.addEventListener("click", () => {
  renderLanguageList();
  openPanel(elements.languagePanel);
});
elements.closeFilterButton.addEventListener("click", () => closePanel(elements.filterPanel));
elements.closeLanguageButton.addEventListener("click", () => closePanel(elements.languagePanel));
elements.resetFiltersButton.addEventListener("click", () => {
  filters = defaultFilters;
  saveFilters();
});
elements.historyButton.addEventListener("click", () => {
  activeLibraryMode = "history";
  renderLibrary();
  openPanel(elements.libraryPanel);
});
elements.favoritesButton.addEventListener("click", () => {
  activeLibraryMode = "favorites";
  renderLibrary();
  openPanel(elements.libraryPanel);
});
elements.closeLibraryButton.addEventListener("click", () => closePanel(elements.libraryPanel));
elements.infoButton.addEventListener("click", showInfo);
elements.closeInfoButton.addEventListener("click", () => closePanel(elements.infoOverlay));
elements.infoOverlay.addEventListener("click", (event) => {
  if (event.target === elements.infoOverlay) closePanel(elements.infoOverlay);
});
elements.closePurchaseButton.addEventListener("click", () => closePanel(elements.purchaseOverlay));
elements.purchaseOverlay.addEventListener("click", (event) => {
  if (event.target === elements.purchaseOverlay) closePanel(elements.purchaseOverlay);
});
elements.closeAdBreakButton.addEventListener("click", () => closePanel(elements.adBreak));

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (!elements.resultOverlay.hidden) hideResult();
  if (!elements.filterPanel.hidden) closePanel(elements.filterPanel);
  if (!elements.languagePanel.hidden) closePanel(elements.languagePanel);
  if (!elements.libraryPanel.hidden) closePanel(elements.libraryPanel);
  if (!elements.infoOverlay.hidden) closePanel(elements.infoOverlay);
  if (!elements.purchaseOverlay.hidden) closePanel(elements.purchaseOverlay);
  if (!elements.adBreak.hidden && !elements.closeAdBreakButton.disabled) closePanel(elements.adBreak);
});

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js");
  });
}

applyTranslations();
renderFilters();
renderLanguageList();
updateCounter();
elements.adBanner.hidden = noAdsPurchased || !ENABLE_AD_BANNER;
