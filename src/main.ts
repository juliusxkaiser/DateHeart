import * as THREE from "three";
import { Capacitor } from "@capacitor/core";
import "./styles.css";
import { canShowAdPrivacyOptions, canUseNativeAds, initializeAds, showAdPrivacyOptions, showInterstitialAd } from "./ads";
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
  hasSpecificIdeaLocalization,
  labelFor,
  isLanguageCode,
  languages,
  localizeIdea,
  noAdsPriceForMarket,
  translations,
  type LanguageCode,
} from "./i18n";

const DEFAULT_APP_SHARE_URL = "https://czarletsgo.github.io/dateheart-web/";

const STORAGE_KEYS = {
  favorites: "dateheart:favorites",
  history: "dateheart:history",
  filters: "dateheart:filters",
  language: "dateheart:language",
  stats: "dateheart:stats",
  noAds: "dateheart:no_ads",
  pendingCheckoutSession: "dateheart:pending_checkout_session",
  purchaseClientId: "dateheart:purchase_client_id",
};

const APP_NAME = "DateHeart";
const SUPPORT_EMAIL = "support@dateheart.app";
const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}?subject=DateHeart%20Support`;
const AD_EVERY_REVEALS = 7;
const IS_NATIVE_APP = Capacitor.isNativePlatform();
const ENABLE_AD_BANNER = false;
const ENABLE_INTERSTITIAL_AD = IS_NATIVE_APP || import.meta.env.VITE_ENABLE_WEB_AD_PLACEHOLDER === "true";
const HISTORY_LIMIT = 120;
const FAMILY_REPEAT_WINDOW = 90;
const staticPageUrl = (path: string) => `${import.meta.env.BASE_URL}${path}`;

type PersistedStats = {
  reveals: number;
  adBreaks: number;
};

type PaymentStatusKey =
  | "paymentNote"
  | "paymentStarting"
  | "paymentUnavailable"
  | "paymentFailed"
  | "paymentVerifying"
  | "paymentConfirmed"
  | "paymentCanceled"
  | "restoreStarting"
  | "restoreConfirmed"
  | "restoreNotFound"
  | "restoreEmailRequired";

type ResultCopy = {
  plan: string;
  aiPrompt: string;
  copyPlan: string;
  copiedPlan: string;
  tonight: string;
  out: string;
  aiPromptTemplate: string;
};

const resultCopy: Record<LanguageCode, ResultCopy> = {
  en: {
    plan: "Do this",
    aiPrompt: "AI prompt",
    copyPlan: "Copy plan",
    copiedPlan: "Plan copied",
    tonight: "Tonight",
    out: "Out",
    aiPromptTemplate:
      "Turn this DateHeart idea into a specific plan for today. Keep the budget and duration. Idea: {title}. Details: {prompt}. Prepare: {prep}.",
  },
  "en-US": {
    plan: "Do this",
    aiPrompt: "AI prompt",
    copyPlan: "Copy plan",
    copiedPlan: "Plan copied",
    tonight: "Tonight",
    out: "Out",
    aiPromptTemplate:
      "Turn this DateHeart idea into a specific plan for today. Keep the budget and duration. Idea: {title}. Details: {prompt}. Prepare: {prep}.",
  },
  de: {
    plan: "Macht das",
    aiPrompt: "AI-Prompt",
    copyPlan: "Plan kopieren",
    copiedPlan: "Plan kopiert",
    tonight: "Heute",
    out: "Rausgehen",
    aiPromptTemplate:
      "Mach aus dieser DateHeart-Idee einen konkreten Plan für heute. Budget und Dauer beibehalten. Idee: {title}. Details: {prompt}. Vorbereitung: {prep}.",
  },
  pl: {
    plan: "Zróbcie to",
    aiPrompt: "Prompt AI",
    copyPlan: "Kopiuj plan",
    copiedPlan: "Plan skopiowany",
    tonight: "Dziś",
    out: "Wyjście",
    aiPromptTemplate:
      "Zamień ten pomysł DateHeart w konkretny plan na dziś. Zachowaj budżet i czas. Pomysł: {title}. Szczegóły: {prompt}. Przygotowanie: {prep}.",
  },
  es: {
    plan: "Haced esto",
    aiPrompt: "Prompt de IA",
    copyPlan: "Copiar plan",
    copiedPlan: "Plan copiado",
    tonight: "Hoy",
    out: "Salir",
    aiPromptTemplate:
      "Convierte esta idea de DateHeart en un plan concreto para hoy. Mantén el presupuesto y la duración. Idea: {title}. Detalles: {prompt}. Preparación: {prep}.",
  },
  fr: {
    plan: "Faites ça",
    aiPrompt: "Prompt IA",
    copyPlan: "Copier le plan",
    copiedPlan: "Plan copié",
    tonight: "Ce soir",
    out: "Sortie",
    aiPromptTemplate:
      "Transforme cette idée DateHeart en plan concret pour aujourd’hui. Garde le budget et la durée. Idée : {title}. Détails : {prompt}. Préparation : {prep}.",
  },
  it: {
    plan: "Fate questo",
    aiPrompt: "Prompt AI",
    copyPlan: "Copia piano",
    copiedPlan: "Piano copiato",
    tonight: "Stasera",
    out: "Fuori",
    aiPromptTemplate:
      "Trasforma questa idea DateHeart in un piano concreto per oggi. Mantieni budget e durata. Idea: {title}. Dettagli: {prompt}. Preparazione: {prep}.",
  },
  pt: {
    plan: "Façam isto",
    aiPrompt: "Prompt de IA",
    copyPlan: "Copiar plano",
    copiedPlan: "Plano copiado",
    tonight: "Hoje",
    out: "Sair",
    aiPromptTemplate:
      "Transforma esta ideia do DateHeart num plano concreto para hoje. Mantém o orçamento e a duração. Ideia: {title}. Detalhes: {prompt}. Preparação: {prep}.",
  },
  hi: {
    plan: "यह करें",
    aiPrompt: "AI प्रॉम्प्ट",
    copyPlan: "योजना कॉपी करें",
    copiedPlan: "योजना कॉपी हुई",
    tonight: "आज",
    out: "बाहर",
    aiPromptTemplate:
      "इस DateHeart आइडिया को आज के लिए ठोस योजना में बदलें. बजट और अवधि रखें. आइडिया: {title}. विवरण: {prompt}. तैयारी: {prep}.",
  },
  ar: {
    plan: "افعلا هذا",
    aiPrompt: "موجه الذكاء الاصطناعي",
    copyPlan: "نسخ الخطة",
    copiedPlan: "تم نسخ الخطة",
    tonight: "اليوم",
    out: "خروج",
    aiPromptTemplate:
      "حوّل فكرة DateHeart هذه إلى خطة محددة لهذا اليوم. حافظ على الميزانية والمدة. الفكرة: {title}. التفاصيل: {prompt}. التحضير: {prep}.",
  },
  ja: {
    plan: "これを実行",
    aiPrompt: "AIプロンプト",
    copyPlan: "プランをコピー",
    copiedPlan: "プランをコピーしました",
    tonight: "今日",
    out: "外出",
    aiPromptTemplate:
      "このDateHeartのアイデアを今日の具体的なプランにしてください。予算と所要時間は守ってください。アイデア: {title}。詳細: {prompt}。準備: {prep}。",
  },
  zh: {
    plan: "照这样做",
    aiPrompt: "AI 提示词",
    copyPlan: "复制计划",
    copiedPlan: "计划已复制",
    tonight: "今天",
    out: "出门",
    aiPromptTemplate:
      "把这个 DateHeart 想法变成今天可执行的具体计划。保持预算和时长。想法：{title}。细节：{prompt}。准备：{prep}。",
  },
  ru: {
    plan: "Сделайте это",
    aiPrompt: "Промпт для ИИ",
    copyPlan: "Скопировать план",
    copiedPlan: "План скопирован",
    tonight: "Сегодня",
    out: "Выйти",
    aiPromptTemplate:
      "Преврати эту идею DateHeart в конкретный план на сегодня. Сохрани бюджет и длительность. Идея: {title}. Детали: {prompt}. Подготовка: {prep}.",
  },
  ko: {
    plan: "이렇게 하기",
    aiPrompt: "AI 프롬프트",
    copyPlan: "계획 복사",
    copiedPlan: "계획 복사됨",
    tonight: "오늘",
    out: "외출",
    aiPromptTemplate:
      "이 DateHeart 아이디어를 오늘 실행할 구체적인 계획으로 바꿔 주세요. 예산과 시간은 유지하세요. 아이디어: {title}. 세부 내용: {prompt}. 준비: {prep}.",
  },
  tr: {
    plan: "Bunu yapın",
    aiPrompt: "AI istemi",
    copyPlan: "Planı kopyala",
    copiedPlan: "Plan kopyalandı",
    tonight: "Bugün",
    out: "Dışarı",
    aiPromptTemplate:
      "Bu DateHeart fikrini bugün için somut bir plana dönüştür. Bütçeyi ve süreyi koru. Fikir: {title}. Ayrıntılar: {prompt}. Hazırlık: {prep}.",
  },
  id: {
    plan: "Lakukan ini",
    aiPrompt: "Prompt AI",
    copyPlan: "Salin rencana",
    copiedPlan: "Rencana disalin",
    tonight: "Hari ini",
    out: "Keluar",
    aiPromptTemplate:
      "Ubah ide DateHeart ini menjadi rencana konkret untuk hari ini. Pertahankan anggaran dan durasi. Ide: {title}. Detail: {prompt}. Persiapan: {prep}.",
  },
  nl: {
    plan: "Doe dit",
    aiPrompt: "AI-prompt",
    copyPlan: "Plan kopiëren",
    copiedPlan: "Plan gekopieerd",
    tonight: "Vandaag",
    out: "Uit",
    aiPromptTemplate:
      "Maak van dit DateHeart-idee een concreet plan voor vandaag. Houd budget en duur aan. Idee: {title}. Details: {prompt}. Voorbereiding: {prep}.",
  },
  sv: {
    plan: "Gör detta",
    aiPrompt: "AI-prompt",
    copyPlan: "Kopiera plan",
    copiedPlan: "Plan kopierad",
    tonight: "I dag",
    out: "Ut",
    aiPromptTemplate:
      "Gör denna DateHeart-idé till en konkret plan för i dag. Behåll budget och längd. Idé: {title}. Detaljer: {prompt}. Förbered: {prep}.",
  },
  cs: {
    plan: "Udělejte tohle",
    aiPrompt: "AI prompt",
    copyPlan: "Kopírovat plán",
    copiedPlan: "Plán zkopírován",
    tonight: "Dnes",
    out: "Ven",
    aiPromptTemplate:
      "Proměň tento nápad DateHeart v konkrétní plán na dnešek. Zachovej rozpočet a délku. Nápad: {title}. Detaily: {prompt}. Příprava: {prep}.",
  },
  uk: {
    plan: "Зробіть це",
    aiPrompt: "AI-промпт",
    copyPlan: "Скопіювати план",
    copiedPlan: "План скопійовано",
    tonight: "Сьогодні",
    out: "Вийти",
    aiPromptTemplate:
      "Перетвори цю ідею DateHeart на конкретний план на сьогодні. Збережи бюджет і тривалість. Ідея: {title}. Деталі: {prompt}. Підготовка: {prep}.",
  },
  vi: {
    plan: "Làm thế này",
    aiPrompt: "Prompt AI",
    copyPlan: "Sao chép kế hoạch",
    copiedPlan: "Đã sao chép kế hoạch",
    tonight: "Hôm nay",
    out: "Ra ngoài",
    aiPromptTemplate:
      "Biến ý tưởng DateHeart này thành kế hoạch cụ thể cho hôm nay. Giữ ngân sách và thời lượng. Ý tưởng: {title}. Chi tiết: {prompt}. Chuẩn bị: {prep}.",
  },
  th: {
    plan: "ทำแบบนี้",
    aiPrompt: "พรอมป์ AI",
    copyPlan: "คัดลอกแผน",
    copiedPlan: "คัดลอกแผนแล้ว",
    tonight: "วันนี้",
    out: "ออกไป",
    aiPromptTemplate:
      "เปลี่ยนไอเดีย DateHeart นี้ให้เป็นแผนที่ทำได้จริงสำหรับวันนี้ รักษางบและระยะเวลาไว้ ไอเดีย: {title}. รายละเอียด: {prompt}. เตรียม: {prep}.",
  },
};

const adPrivacyCopy: Partial<Record<LanguageCode, string>> = {
  en: "Ad privacy choices",
  "en-US": "Ad privacy choices",
  de: "Werbe-Datenschutz",
  pl: "Prywatnosc reklam",
  es: "Privacidad de anuncios",
  fr: "Confidentialite publicitaire",
  it: "Privacy annunci",
  pt: "Privacidade dos anuncios",
  hi: "विज्ञापन गोपनीयता",
  ar: "خصوصية الإعلانات",
  ja: "広告プライバシー",
  zh: "广告隐私设置",
  ru: "Конфиденциальность рекламы",
  ko: "광고 개인 정보",
  tr: "Reklam gizliligi",
  id: "Privasi iklan",
  nl: "Advertentieprivacy",
  sv: "Annonsintegritet",
  cs: "Soukromi reklam",
  uk: "Конфіденційність реклами",
  vi: "Quyen rieng tu quang cao",
  th: "ความเป็นส่วนตัวโฆษณา",
};

const supportEmailCopy: Partial<Record<LanguageCode, string>> = {
  en: "Write support email",
  "en-US": "Write support email",
  de: "Support-Mail schreiben",
  pl: "Napisz do supportu",
  es: "Escribir a soporte",
  fr: "Ecrire au support",
  it: "Scrivi al supporto",
  pt: "Escrever ao suporte",
  nl: "Supportmail schrijven",
  sv: "Skriv till support",
};

const icon = (
  name:
    | "globe"
    | "info"
    | "sliders"
    | "history"
    | "heart"
    | "share"
    | "copy"
    | "x"
    | "spark"
    | "star"
    | "check"
    | "mail",
) => {
  const paths = {
    globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15 15 0 0 1 0 20"/><path d="M12 2a15 15 0 0 0 0 20"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 17v-6"/><path d="M12 8h.01"/>',
    sliders: '<path d="M4 7h8"/><path d="M16 7h4"/><path d="M14 5v4"/><path d="M4 17h4"/><path d="M12 17h8"/><path d="M10 15v4"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 7v5l3 2"/>',
    heart: '<path d="M20.8 5.7a5.4 5.4 0 0 0-7.6 0L12 6.9l-1.2-1.2a5.4 5.4 0 1 0-7.6 7.6L12 22l8.8-8.7a5.4 5.4 0 0 0 0-7.6Z"/>',
    share: '<path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M16 6 12 2 8 6"/><path d="M12 2v14"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    spark: '<path d="m12 2 1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7Z"/><path d="m19 17 .7 2.3L22 20l-2.3.7L19 23l-.7-2.3L16 20l2.3-.7Z"/>',
    star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.8 1.2 6.9-6.2-3.3L5.8 21 7 14.1 2 9.3l6.9-1Z"/>',
    check: '<path d="m5 13 4 4L19 7"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
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
        <button class="icon-button filter-action" id="filterActionButton" type="button" aria-label="Filters" title="Filters">
          ${icon("sliders")}
          <span class="sr-only" id="filterActionKicker">Category</span>
          <strong class="sr-only" id="filterActionLabel">All</strong>
          <small class="sr-only" id="filterActionDetail"></small>
        </button>
        <button class="icon-button" id="historyButton" type="button" aria-label="History" title="History">
          ${icon("history")}
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
      <div class="plan-box">
        <span id="planLabel">Do this</span>
        <ol id="resultPlan"></ol>
      </div>
      <div class="ai-prompt-box">
        <span id="aiPromptLabel">AI prompt</span>
        <p id="resultAiPrompt"></p>
      </div>
      <div class="result-actions">
        <button class="secondary-button" id="favoriteButton" type="button">${icon("heart")} Save</button>
        <button class="secondary-button" id="shareButton" type="button">${icon("share")} Share</button>
        <button class="secondary-button span-button" id="copyPlanButton" type="button">${icon("copy")} Copy plan</button>
        <button class="primary-button" id="againButton" type="button">${icon("spark")} New cue</button>
      </div>
    </article>
  </div>

  <div class="panel" id="filterPanel" hidden>
    <section class="panel-card filter-card" role="dialog" aria-modal="true" aria-labelledby="filterTitle">
      <div class="panel-header">
        <h2 id="filterTitle">Filters</h2>
        <button class="close-button" id="closeFilterButton" type="button" aria-label="Close" title="Close">${icon("x")}</button>
      </div>
      <p class="filter-summary" id="filterPanelSummary"></p>
      <div class="filter-options">
        <div class="filter-group">
          <h3 id="categoryLabel">Category</h3>
          <div class="choice-list" id="categoryChips"></div>
        </div>
        <div class="filter-group">
          <h3 id="budgetLabel">Budget</h3>
          <div class="choice-grid" id="budgetChips"></div>
        </div>
        <div class="filter-group">
          <h3 id="durationLabel">Duration</h3>
          <div class="choice-grid" id="durationChips"></div>
        </div>
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
      <button class="support-link ad-privacy-button" id="adPrivacyButton" type="button" hidden>
        ${icon("sliders")}
        <span>Ad privacy choices</span>
      </button>
      <nav class="legal-links" aria-label="Legal">
        <button class="legal-link-button" id="supportMenuButton" type="button" aria-expanded="false" aria-controls="supportDropdown">Support</button>
        <a href="${staticPageUrl("privacy.html")}" target="_blank" rel="noreferrer">Privacy</a>
        <a href="${staticPageUrl("terms.html")}" target="_blank" rel="noreferrer">AGB</a>
        <a href="${staticPageUrl("impressum.html")}" target="_blank" rel="noreferrer">Impressum</a>
      </nav>
      <div class="support-dropdown" id="supportDropdown" hidden>
        <a class="support-link" id="supportEmailLink" href="${SUPPORT_MAILTO}">
          ${icon("mail")}
          <span>Write support email</span>
        </a>
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
      <p class="payment-status" id="paymentStatus" aria-live="polite"></p>
      <button class="primary-button wide" id="buyNoAdsButton" type="button">Buy</button>
      <button class="secondary-button wide restore-toggle" id="restoreToggleButton" type="button" aria-expanded="false" aria-controls="restorePurchaseForm">Restore purchase</button>
      <form class="restore-form" id="restorePurchaseForm" novalidate hidden>
        <input id="restoreEmailInput" type="email" autocomplete="email" inputmode="email" />
        <button class="secondary-button" id="restorePurchaseButton" type="submit"></button>
      </form>
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
  resultPlan: document.querySelector<HTMLOListElement>("#resultPlan")!,
  resultAiPrompt: document.querySelector<HTMLParagraphElement>("#resultAiPrompt")!,
  favoriteButton: document.querySelector<HTMLButtonElement>("#favoriteButton")!,
  shareButton: document.querySelector<HTMLButtonElement>("#shareButton")!,
  copyPlanButton: document.querySelector<HTMLButtonElement>("#copyPlanButton")!,
  againButton: document.querySelector<HTMLButtonElement>("#againButton")!,
  closeResultButton: document.querySelector<HTMLButtonElement>("#closeResultButton")!,
  filterActionButton: document.querySelector<HTMLButtonElement>("#filterActionButton")!,
  filterActionKicker: document.querySelector<HTMLSpanElement>("#filterActionKicker")!,
  filterActionLabel: document.querySelector<HTMLElement>("#filterActionLabel")!,
  filterActionDetail: document.querySelector<HTMLElement>("#filterActionDetail")!,
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
  filterPanelSummary: document.querySelector<HTMLParagraphElement>("#filterPanelSummary")!,
  planLabel: document.querySelector<HTMLElement>("#planLabel")!,
  aiPromptLabel: document.querySelector<HTMLElement>("#aiPromptLabel")!,
  resetFiltersButton: document.querySelector<HTMLButtonElement>("#resetFiltersButton")!,
  historyButton: document.querySelector<HTMLButtonElement>("#historyButton")!,
  libraryPanel: document.querySelector<HTMLDivElement>("#libraryPanel")!,
  closeLibraryButton: document.querySelector<HTMLButtonElement>("#closeLibraryButton")!,
  ideaList: document.querySelector<HTMLDivElement>("#ideaList")!,
  infoButton: document.querySelector<HTMLButtonElement>("#infoButton")!,
  infoOverlay: document.querySelector<HTMLDivElement>("#infoOverlay")!,
  closeInfoButton: document.querySelector<HTMLButtonElement>("#closeInfoButton")!,
  supportMenuButton: document.querySelector<HTMLButtonElement>("#supportMenuButton")!,
  supportDropdown: document.querySelector<HTMLDivElement>("#supportDropdown")!,
  supportEmailLink: document.querySelector<HTMLAnchorElement>("#supportEmailLink")!,
  adPrivacyButton: document.querySelector<HTMLButtonElement>("#adPrivacyButton")!,
  purchaseOverlay: document.querySelector<HTMLDivElement>("#purchaseOverlay")!,
  closePurchaseButton: document.querySelector<HTMLButtonElement>("#closePurchaseButton")!,
  purchaseLabel: document.querySelector<HTMLElement>("#purchaseLabel")!,
  purchaseTitle: document.querySelector<HTMLHeadingElement>("#purchaseTitle")!,
  purchasePrice: document.querySelector<HTMLElement>("#purchasePrice")!,
  purchaseBody: document.querySelector<HTMLParagraphElement>("#purchaseBody")!,
  paymentStatus: document.querySelector<HTMLParagraphElement>("#paymentStatus")!,
  buyNoAdsButton: document.querySelector<HTMLButtonElement>("#buyNoAdsButton")!,
  restoreToggleButton: document.querySelector<HTMLButtonElement>("#restoreToggleButton")!,
  restorePurchaseForm: document.querySelector<HTMLFormElement>("#restorePurchaseForm")!,
  restoreEmailInput: document.querySelector<HTMLInputElement>("#restoreEmailInput")!,
  restorePurchaseButton: document.querySelector<HTMLButtonElement>("#restorePurchaseButton")!,
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

function uiCopy() {
  return resultCopy[activeLanguage] ?? resultCopy.en;
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

function cleanCheckoutUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete("checkout");
  url.searchParams.delete("session_id");
  return url;
}

function appShareUrl() {
  const configuredUrl = import.meta.env.VITE_APP_SHARE_URL?.trim();
  if (configuredUrl) return configuredUrl;
  return DEFAULT_APP_SHARE_URL;
}

function buildShareUrl(idea: DateIdea) {
  const url = new URL(appShareUrl(), window.location.href);
  url.searchParams.set("idea", idea.id);
  url.searchParams.set("lang", activeLanguage);
  url.searchParams.set("category", filters.category);
  url.searchParams.set("budget", filters.budget);
  url.searchParams.set("duration", filters.duration);

  return url.toString();
}

function filterParam<T extends string>(params: URLSearchParams, key: string, values: readonly T[]) {
  const value = params.get(key);
  if (value === "All") return "All";
  if (value && values.includes(value as T)) return value as T;
  return "All";
}

function purchaseClientId() {
  const saved = localStorage.getItem(STORAGE_KEYS.purchaseClientId);
  if (saved) return saved;

  const generated = crypto.randomUUID?.() ?? `dateheart-${Date.now()}-${randomIndex(1_000_000)}`;
  localStorage.setItem(STORAGE_KEYS.purchaseClientId, generated);
  return generated;
}

function endpointCandidates(customEndpoint: string | undefined, paths: string[]) {
  if (customEndpoint) return [customEndpoint];
  return paths.map((path) => `${window.location.origin}${path}`);
}

async function jsonFromResponse(response: Response) {
  const text = await response.text();
  if (!text.trim()) return {};

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    if (text.includes("<!doctype html") || text.includes("<html")) {
      throw Object.assign(new Error("Endpoint did not return JSON."), { retryNextEndpoint: true });
    }
    throw new Error("Payment endpoint returned invalid JSON.");
  }
}

async function postJsonToFirstAvailable(endpoints: string[], body: Record<string, unknown>) {
  let lastError: unknown;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.status === 404) continue;
      const payload = await jsonFromResponse(response);
      if (!response.ok) throw new Error(String(payload.error || response.statusText));
      return payload;
    } catch (error) {
      lastError = error;
      if (!(error instanceof Error) || !(error as Error & { retryNextEndpoint?: boolean }).retryNextEndpoint) break;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("payment_unavailable");
}

async function getJsonFromFirstAvailable(endpoints: string[]) {
  let lastError: unknown;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint);
      if (response.status === 404) continue;
      const payload = await jsonFromResponse(response);
      if (!response.ok) throw new Error(String(payload.error || response.statusText));
      return payload;
    } catch (error) {
      lastError = error;
      if (!(error instanceof Error) || !(error as Error & { retryNextEndpoint?: boolean }).retryNextEndpoint) break;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("payment_unavailable");
}

function setNoAdsPurchased() {
  noAdsPurchased = true;
  localStorage.setItem(STORAGE_KEYS.noAds, "true");
  localStorage.removeItem(STORAGE_KEYS.pendingCheckoutSession);
  elements.adBanner.hidden = true;
  setRestoreOpen(false);
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
let paymentBusy = false;
let paymentStatusKey: PaymentStatusKey = "paymentNote";
let restoreOpen = false;

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
  private pulseDirection: -1 | 1 = 1;
  private nextPulseDirection: -1 | 1 = -1;
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
    this.pulseDirection = this.nextPulseDirection;
    this.nextPulseDirection = this.nextPulseDirection === 1 ? -1 : 1;
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

    this.heart.rotation.y = Math.sin(elapsed * 0.9) * 0.22 + pulse * 0.56 * this.pulseDirection;
    this.heart.rotation.x = -0.2 + Math.sin(elapsed * 1.35) * 0.06 - pulse * 0.18 + hit * 0.1;
    this.heart.rotation.z = Math.PI + pulse * 0.1 * this.pulseDirection;
    this.heart.position.x = pulse * 0.18 * this.pulseDirection;
    this.heart.scale.setScalar(0.78 + pulse * 0.24 + Math.sin(elapsed * 2.1) * 0.01 + Math.max(hit, 0) * 0.03);
    this.heartMaterial.emissiveIntensity = 0.12 + pulse * 0.52;
    this.burstLight.intensity = pulse * 13;

    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.animate);
  };
}

const heartScene = new HeartScene(elements.heartCanvas);

function candidateIdeasForCurrentMode() {
  const filtered = filterIdeas(filters);
  return filtered.length > 0 ? filtered : dateIdeas;
}

function pickIdea() {
  const usable = candidateIdeasForCurrentMode();
  const usableFamilies = new Set(usable.map((entry) => entry.family));
  const market = activeBudgetMarket();
  const titleKeyCache = new Map<string, string>();
  const titleKeyFor = (entry: DateIdea) => {
    const cached = titleKeyCache.get(entry.id);
    if (cached !== undefined) return cached;

    const key = localizeIdea(entry, activeLanguage, market)
      .title.toLocaleLowerCase(activeLanguage)
      .replace(/\s+/g, " ")
      .trim();
    titleKeyCache.set(entry.id, key);
    return key;
  };
  const maxFamilyBlock = Math.min(Math.max(12, Math.ceil(usableFamilies.size * 0.82)), usableFamilies.size - 1, FAMILY_REPEAT_WINDOW);
  const recentFamilies = new Set<string>();

  for (const id of historyIds) {
    if (recentFamilies.size >= maxFamilyBlock) break;
    const family = ideaById.get(id)?.family;
    if (!family || !usableFamilies.has(family)) continue;
    recentFamilies.add(family);
  }

  const idBlockSize = Math.min(Math.max(24, Math.ceil(usable.length * 0.12)), usable.length - 1, HISTORY_LIMIT);
  const recentIds = new Set(historyIds.slice(0, idBlockSize));
  const recentTitleKeys = new Set<string>();

  for (const id of historyIds.slice(0, Math.min(20, HISTORY_LIMIT))) {
    const entry = ideaById.get(id);
    if (!entry) continue;
    recentTitleKeys.add(titleKeyFor(entry));
  }

  const familySafePool = usable.filter((entry) => !recentIds.has(entry.id) && !recentFamilies.has(entry.family));
  const idSafePool = usable.filter((entry) => !recentIds.has(entry.id));
  const notCurrentPool = currentIdea ? usable.filter((entry) => entry.id !== currentIdea?.id) : usable;
  const concreteIdea = (entry: DateIdea) => hasSpecificIdeaLocalization(entry.family, activeLanguage);
  const pickTitleSafeFrom = (pool: DateIdea[]) => {
    if (pool.length === 0) return undefined;

    const attempts = Math.min(pool.length, 96);
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const candidate = pool[randomIndex(pool.length)];
      if (!recentTitleKeys.has(titleKeyFor(candidate))) return candidate;
    }

    if (pool.length > 1500) return undefined;

    const safePool = pool.filter((entry) => !recentTitleKeys.has(titleKeyFor(entry)));
    return safePool.length > 0 ? safePool[randomIndex(safePool.length)] : undefined;
  };

  const concreteTitleAndFamilySafeIdea = pickTitleSafeFrom(familySafePool.filter(concreteIdea));
  if (concreteTitleAndFamilySafeIdea) return concreteTitleAndFamilySafeIdea;

  const titleAndFamilySafeIdea = pickTitleSafeFrom(familySafePool);
  if (titleAndFamilySafeIdea) return titleAndFamilySafeIdea;

  const concreteTitleSafeIdea = pickTitleSafeFrom(idSafePool.filter(concreteIdea));
  if (concreteTitleSafeIdea) return concreteTitleSafeIdea;

  const titleSafeIdea = pickTitleSafeFrom(idSafePool);
  if (titleSafeIdea) return titleSafeIdea;

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
      window.setTimeout(() => void showAdBreak(), 700);
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

function splitPlanSentences(text: string) {
  return text
    .replace(/([.!?。！？।؟])\s*/gu, "$1\n")
    .split("\n")
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function uniqueTexts(items: string[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.toLocaleLowerCase(activeLanguage).replace(/\s+/g, " ").trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildPlanItems(displayIdea: DateIdea) {
  const sentences = splitPlanSentences(displayIdea.prompt);
  const prepFallbacks = displayIdea.prep
    .split(/[.!?。！？।؟]\s*|[,،、]\s*/u)
    .map((item) => item.trim())
    .filter(Boolean);

  const actionItems = uniqueTexts(sentences).slice(0, 5);
  if (actionItems.length >= 3) return actionItems;

  return uniqueTexts([...actionItems, ...prepFallbacks]).slice(0, 5);
}

function buildAiPrompt(displayIdea: DateIdea) {
  const copy = uiCopy();
  return copy.aiPromptTemplate
    .replace("{title}", displayIdea.title)
    .replace("{prompt}", displayIdea.prompt)
    .replace("{prep}", displayIdea.prep);
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Some browsers expose Clipboard API but reject it outside a trusted context.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.top = "-999px";
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Clipboard copy failed.");
}

function currentPlanText() {
  if (!currentIdea) return "";

  const displayIdea = localizeIdea(currentIdea, activeLanguage, activeBudgetMarket());
  const planItems = buildPlanItems(displayIdea);
  return [
    `${APP_NAME}: ${displayIdea.title}`,
    displayIdea.prompt,
    `${t.prep}: ${displayIdea.prep}`,
    "",
    `${uiCopy().plan}:`,
    ...planItems.map((item, index) => `${index + 1}. ${item}`),
    "",
    `${uiCopy().aiPrompt}:`,
    buildAiPrompt(displayIdea),
  ].join("\n");
}

function showResult(idea: DateIdea) {
  const market = activeBudgetMarket();
  const displayIdea = localizeIdea(idea, activeLanguage, market);
  const planItems = buildPlanItems(displayIdea);
  elements.resultTitle.textContent = displayIdea.title;
  elements.resultPrompt.textContent = displayIdea.prompt;
  elements.resultPrep.textContent = displayIdea.prep;
  elements.resultPlan.replaceChildren(
    ...planItems.map((item) => {
      const row = document.createElement("li");
      row.textContent = item;
      return row;
    }),
  );
  elements.resultAiPrompt.textContent = buildAiPrompt(displayIdea);
  elements.copyPlanButton.innerHTML = `${icon("copy")} ${uiCopy().copyPlan}`;
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
  const shareUrl = buildShareUrl(currentIdea);
  const baseText = currentPlanText() || `${APP_NAME}: ${displayIdea.title}\n${displayIdea.prompt}\n${t.prep}: ${displayIdea.prep}`;
  const text = `${baseText}\n\n${APP_NAME}: ${shareUrl}`;

  if (navigator.share) {
    try {
      await navigator.share({ title: `${APP_NAME}: ${displayIdea.title}`, text, url: shareUrl });
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
  }

  try {
    await copyText(text);
    elements.shareButton.textContent = t.copied;
    window.setTimeout(() => {
      elements.shareButton.innerHTML = `${icon("share")} ${t.share}`;
    }, 1200);
  } catch (error) {
    console.error(error);
  }
}

async function copyCurrentPlan() {
  if (!currentIdea) return;

  try {
    await copyText(currentPlanText());
    elements.copyPlanButton.textContent = uiCopy().copiedPlan;
    window.setTimeout(() => {
      elements.copyPlanButton.innerHTML = `${icon("copy")} ${uiCopy().copyPlan}`;
    }, 1200);
  } catch (error) {
    console.error(error);
  }
}

function renderFilterGroup<T extends string>(
  container: HTMLElement,
  values: readonly T[],
  current: T | "All",
  onPick: (value: T | "All") => void,
) {
  const market = activeBudgetMarket();
  const filterKind = container === elements.categoryChips ? "category" : container === elements.budgetChips ? "budget" : "duration";

  container.innerHTML = ["All", ...values]
    .map((value) => {
      const selected = value === current ? " active" : "";
      const label = value === "All" ? t.all : labelFor(filterKind, value, activeLanguage, market);

      return `
        <button class="choice-button${selected}" type="button" data-value="${value}" aria-pressed="${value === current}">
          <span class="choice-copy">
            <strong>${label}</strong>
          </span>
          <span class="choice-check" aria-hidden="true">${value === current ? icon("check") : ""}</span>
        </button>
      `;
    })
    .join("");

  container.querySelectorAll<HTMLButtonElement>(".choice-button").forEach((button) => {
    button.addEventListener("click", () => {
      onPick(button.dataset.value as T | "All");
      renderFilterAction();
    });
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
  renderFilterAction();
}

function renderFilterAction() {
  const market = activeBudgetMarket();
  const category = filters.category === "All" ? `${t.all} ${t.category}` : labelFor("category", filters.category, activeLanguage);
  const extraFilters = [
    filters.budget !== "All" ? labelFor("budget", filters.budget, activeLanguage, market) : "",
    filters.duration !== "All" ? labelFor("duration", filters.duration, activeLanguage) : "",
  ].filter(Boolean);

  elements.filterActionKicker.textContent = t.filters;
  elements.filterActionLabel.textContent = category;
  elements.filterActionDetail.textContent = extraFilters.join(" · ");
  const summary = [category, ...extraFilters].join(" · ");
  elements.filterActionButton.setAttribute("aria-label", `${t.filters}: ${summary}`);
  elements.filterActionButton.title = `${t.filters}: ${summary}`;
  elements.filterActionButton.classList.toggle(
    "active",
    filters.category !== "All" || filters.budget !== "All" || filters.duration !== "All",
  );
  elements.filterPanelSummary.textContent = summary;
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

function setSupportDropdown(open: boolean) {
  elements.supportDropdown.hidden = !open;
  elements.supportMenuButton.setAttribute("aria-expanded", String(open));
}

function setRestoreOpen(open: boolean) {
  restoreOpen = open;
  elements.restorePurchaseForm.hidden = !open;
  elements.restoreToggleButton.setAttribute("aria-expanded", String(open));
}

async function showAdBreak() {
  stats = { ...stats, adBreaks: stats.adBreaks + 1 };
  saveJson(STORAGE_KEYS.stats, stats);

  if (canUseNativeAds()) {
    await showInterstitialAd();
    return;
  }

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
  setSupportDropdown(false);
  applyTranslations();
  openPanel(elements.infoOverlay);
}

function showPurchase() {
  if (IS_NATIVE_APP) return;
  setRestoreOpen(false);
  paymentStatusKey = noAdsPurchased ? "paymentConfirmed" : "paymentNote";
  applyTranslations();
  openPanel(elements.purchaseOverlay);
}

async function buyNoAds() {
  if (IS_NATIVE_APP || noAdsPurchased || paymentBusy) return;

  paymentBusy = true;
  paymentStatusKey = "paymentStarting";
  applyTranslations();

  const market = activeBudgetMarket();
  const price = noAdsPriceForMarket(market);
  const returnUrl = cleanCheckoutUrl().toString();
  const endpoints = endpointCandidates(import.meta.env.VITE_CHECKOUT_ENDPOINT, [
    "/api/create-checkout-session",
    "/.netlify/functions/create-checkout-session",
  ]);

  try {
    const payload = await postJsonToFirstAvailable(endpoints, {
      clientReferenceId: purchaseClientId(),
      currency: price.currency,
      language: activeLanguage,
      locale: market.locale,
      region: market.region ?? "",
      returnUrl,
    });

    const url = typeof payload.url === "string" ? payload.url : "";
    if (!url) throw new Error("Checkout URL missing.");

    if (typeof payload.sessionId === "string") {
      localStorage.setItem(STORAGE_KEYS.pendingCheckoutSession, payload.sessionId);
    }

    window.location.assign(url);
  } catch (error) {
    console.error(error);
    paymentBusy = false;
    paymentStatusKey = error instanceof Error && error.message.includes("payment_unavailable") ? "paymentUnavailable" : "paymentFailed";
    applyTranslations();
  }
}

async function verifyCheckoutSession(sessionId: string, showStatus: boolean) {
  paymentBusy = true;
  paymentStatusKey = "paymentVerifying";
  if (showStatus) {
    applyTranslations();
    openPanel(elements.purchaseOverlay);
  }

  const customVerifyEndpoint = import.meta.env.VITE_VERIFY_PAYMENT_ENDPOINT;
  const endpoints = customVerifyEndpoint
    ? [`${customVerifyEndpoint}${customVerifyEndpoint.includes("?") ? "&" : "?"}session_id=${encodeURIComponent(sessionId)}`]
    : [
    `/api/verify-checkout-session?session_id=${encodeURIComponent(sessionId)}`,
    `/.netlify/functions/verify-checkout-session?session_id=${encodeURIComponent(sessionId)}`,
      ];

  try {
    const payload = await getJsonFromFirstAvailable(endpoints);
    if (payload.paid === true) {
      setNoAdsPurchased();
      paymentStatusKey = "paymentConfirmed";
    } else {
      paymentStatusKey = "paymentVerifying";
      localStorage.setItem(STORAGE_KEYS.pendingCheckoutSession, sessionId);
    }
  } catch (error) {
    console.error(error);
    paymentStatusKey = "paymentFailed";
  } finally {
    paymentBusy = false;
    applyTranslations();
  }
}

async function restoreNoAdsPurchase() {
  if (IS_NATIVE_APP || noAdsPurchased || paymentBusy) return;

  const email = elements.restoreEmailInput.value.trim();
  if (!email) {
    paymentStatusKey = "restoreEmailRequired";
    applyTranslations();
    elements.restoreEmailInput.focus();
    return;
  }

  paymentBusy = true;
  paymentStatusKey = "restoreStarting";
  applyTranslations();

  const endpoints = endpointCandidates(import.meta.env.VITE_RESTORE_PAYMENT_ENDPOINT, [
    "/api/restore-purchase",
    "/.netlify/functions/restore-purchase",
  ]);

  try {
    const payload = await postJsonToFirstAvailable(endpoints, { email });
    if (payload.paid === true) {
      setNoAdsPurchased();
      paymentStatusKey = "restoreConfirmed";
    } else {
      paymentStatusKey = "restoreNotFound";
    }
  } catch (error) {
    console.error(error);
    paymentStatusKey = error instanceof Error && error.message.includes("payment_unavailable") ? "paymentUnavailable" : "paymentFailed";
  } finally {
    paymentBusy = false;
    applyTranslations();
  }
}

function handleCheckoutReturn() {
  const params = new URLSearchParams(window.location.search);
  const checkoutState = params.get("checkout");
  const sessionId = params.get("session_id");

  if (checkoutState === "cancelled") {
    paymentStatusKey = "paymentCanceled";
    window.history.replaceState(null, "", cleanCheckoutUrl());
    applyTranslations();
    openPanel(elements.purchaseOverlay);
    return;
  }

  if (checkoutState === "success" && sessionId) {
    window.history.replaceState(null, "", cleanCheckoutUrl());
    void verifyCheckoutSession(sessionId, true);
    return;
  }

  const pendingSessionId = localStorage.getItem(STORAGE_KEYS.pendingCheckoutSession);
  if (pendingSessionId && !noAdsPurchased) {
    void verifyCheckoutSession(pendingSessionId, false);
  }
}

function handleSharedLink() {
  const params = new URLSearchParams(window.location.search);
  if (params.has("checkout") || params.has("session_id")) return;

  const sharedLanguage = params.get("lang");
  let needsRerender = false;

  if (isLanguageCode(sharedLanguage) && sharedLanguage !== activeLanguage) {
    activeLanguage = sharedLanguage;
    localStorage.setItem(STORAGE_KEYS.language, activeLanguage);
    t = translations[activeLanguage];
    needsRerender = true;
  }

  const sharedFilters = normalizeFilters({
    category: filterParam(params, "category", categories),
    budget: filterParam(params, "budget", budgets),
    duration: filterParam(params, "duration", durations),
  });
  const hasSharedFilters = params.has("category") || params.has("budget") || params.has("duration");

  if (hasSharedFilters) {
    filters = sharedFilters;
    saveJson(STORAGE_KEYS.filters, filters);
    needsRerender = true;
  }

  if (needsRerender) {
    applyTranslations();
    renderFilters();
    renderLibrary();
  }

  const sharedIdea = ideaById.get(params.get("idea") || "");
  if (!sharedIdea) return;

  currentIdea = sharedIdea;
  historyIds = [sharedIdea.id, ...historyIds.filter((id) => id !== sharedIdea.id)].slice(0, HISTORY_LIMIT);
  saveJson(STORAGE_KEYS.history, historyIds);
  renderLibrary();
  showResult(sharedIdea);
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
  const market = activeBudgetMarket();
  const noAdsPrice = formatNoAdsPrice(market);
  const paymentPrice = noAdsPriceForMarket(market);

  document.documentElement.lang = activeLanguage;
  document.documentElement.dir = languages.find((language) => language.code === activeLanguage)?.dir ?? "ltr";

  elements.ideaCounter.textContent = t.ready;
  elements.stageTitle.textContent = t.resultLabel.replace(":", "");
  elements.heartButton.setAttribute("aria-label", t.tapCopy);
  elements.tapCopy.textContent = t.tapCopy;
  elements.resultLabel.textContent = t.resultLabel;
  elements.prepLabel.textContent = t.prep;
  elements.planLabel.textContent = uiCopy().plan;
  elements.aiPromptLabel.textContent = uiCopy().aiPrompt;
  elements.favoriteButton.innerHTML = `${icon("heart")} ${currentIdea && favoriteIds.has(currentIdea.id) ? t.saved : t.save}`;
  elements.shareButton.innerHTML = `${icon("share")} ${t.share}`;
  elements.copyPlanButton.innerHTML = `${icon("copy")} ${uiCopy().copyPlan}`;
  elements.againButton.innerHTML = `${icon("spark")} ${t.next}`;
  elements.filterActionButton.title = t.filters;
  elements.noAdsButton.setAttribute("aria-label", t.removeAds);
  elements.noAdsButton.title = t.removeAds;
  elements.noAdsButton.hidden = IS_NATIVE_APP;
  elements.noAdsButton.classList.toggle("active", noAdsPurchased);
  elements.favoritesButton.setAttribute("aria-label", t.favorites);
  elements.favoritesButton.title = t.favorites;
  elements.historyButton.setAttribute("aria-label", t.history);
  elements.historyButton.title = t.history;
  elements.infoButton.setAttribute("aria-label", t.about);
  elements.infoButton.title = t.about;
  elements.adPrivacyButton.hidden = !canShowAdPrivacyOptions();
  elements.adPrivacyButton.querySelector("span")!.textContent = adPrivacyCopy[activeLanguage] ?? adPrivacyCopy.en!;
  elements.supportEmailLink.querySelector("span")!.textContent = supportEmailCopy[activeLanguage] ?? supportEmailCopy.en!;
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
  elements.purchasePrice.title = paymentPrice.currency;
  elements.purchaseBody.textContent = t.removeAdsBody;
  elements.paymentStatus.textContent = t[paymentStatusKey];
  elements.buyNoAdsButton.textContent = paymentBusy
    ? t.paymentStarting
    : noAdsPurchased
      ? t.noAdsPurchased
      : t.buyNoAds.replace("{price}", noAdsPrice);
  elements.buyNoAdsButton.disabled = noAdsPurchased || paymentBusy;
  elements.restoreToggleButton.textContent = t.restoreNoAds;
  elements.restoreToggleButton.disabled = noAdsPurchased || paymentBusy;
  elements.restoreEmailInput.placeholder = t.restoreEmailPlaceholder;
  elements.restoreEmailInput.setAttribute("aria-label", t.restoreEmailPlaceholder);
  elements.restorePurchaseButton.textContent = paymentBusy ? t.restoreStarting : t.restoreNoAds;
  elements.restorePurchaseButton.disabled = noAdsPurchased || paymentBusy;
  elements.adBanner.setAttribute("aria-label", t.adLabel);
  elements.adBannerLabel.textContent = t.adLabel;
  elements.adBannerText.textContent = t.adBanner;
  elements.adBreakLabel.textContent = t.adLabel;
  elements.adBreakTitle.textContent = t.adBreakTitle;
  elements.adBreakBody.textContent = t.adBreakBody;
  elements.closeAdBreakButton.textContent = elements.closeAdBreakButton.disabled ? t.continueIn.replace("{seconds}", "2") : t.continue;
  renderFilterAction();
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
elements.copyPlanButton.addEventListener("click", () => void copyCurrentPlan());
elements.filterActionButton.addEventListener("click", () => openPanel(elements.filterPanel));
elements.noAdsButton.addEventListener("click", showPurchase);
elements.buyNoAdsButton.addEventListener("click", buyNoAds);
elements.restoreToggleButton.addEventListener("click", () => setRestoreOpen(!restoreOpen));
elements.restorePurchaseForm.addEventListener("submit", (event) => {
  event.preventDefault();
  void restoreNoAdsPurchase();
});
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
elements.supportMenuButton.addEventListener("click", () => setSupportDropdown(elements.supportDropdown.hasAttribute("hidden")));
elements.supportEmailLink.addEventListener("click", () => setSupportDropdown(false));
elements.closeInfoButton.addEventListener("click", () => {
  setSupportDropdown(false);
  closePanel(elements.infoOverlay);
});
elements.adPrivacyButton.addEventListener("click", () => {
  setSupportDropdown(false);
  void showAdPrivacyOptions().finally(applyTranslations);
});
elements.infoOverlay.addEventListener("click", (event) => {
  if (event.target === elements.infoOverlay) {
    setSupportDropdown(false);
    closePanel(elements.infoOverlay);
  }
});
elements.closePurchaseButton.addEventListener("click", () => {
  setRestoreOpen(false);
  closePanel(elements.purchaseOverlay);
});
elements.purchaseOverlay.addEventListener("click", (event) => {
  if (event.target === elements.purchaseOverlay) {
    setRestoreOpen(false);
    closePanel(elements.purchaseOverlay);
  }
});
elements.closeAdBreakButton.addEventListener("click", () => closePanel(elements.adBreak));

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (!elements.resultOverlay.hidden) hideResult();
  if (!elements.filterPanel.hidden) closePanel(elements.filterPanel);
  if (!elements.languagePanel.hidden) closePanel(elements.languagePanel);
  if (!elements.libraryPanel.hidden) closePanel(elements.libraryPanel);
  if (!elements.infoOverlay.hidden) {
    setSupportDropdown(false);
    closePanel(elements.infoOverlay);
  }
  if (!elements.purchaseOverlay.hidden) {
    setRestoreOpen(false);
    closePanel(elements.purchaseOverlay);
  }
  if (!elements.adBreak.hidden && !elements.closeAdBreakButton.disabled) closePanel(elements.adBreak);
});

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, {
      scope: import.meta.env.BASE_URL,
    });
  });
}

applyTranslations();
renderFilters();
renderLanguageList();
handleCheckoutReturn();
handleSharedLink();
updateCounter();
elements.adBanner.hidden = noAdsPurchased || !ENABLE_AD_BANNER;
void initializeAds().finally(applyTranslations);
