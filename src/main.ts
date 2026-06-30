import * as THREE from "three";
import { Capacitor } from "@capacitor/core";
import "./styles.css";
import {
  canShowAdPrivacyOptions,
  canUseNativeAds,
  hideBannerAd,
  initializeAds,
  onBannerVisibilityChange,
  showAdPrivacyOptions,
  showBannerAd,
  showInterstitialAd,
} from "./ads";
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
  formatPlusPrice,
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
import {
  canUseStorePurchases,
  initializeStorePurchases,
  purchaseStoreProduct,
  restoreStorePurchases,
  STORE_PRODUCTS,
  storePurchaseStatus,
  type StoreEntitlement,
  type StoreProductId,
  type StorePurchaseStatus,
} from "./storePurchases";

const DEFAULT_APP_SHARE_URL = "https://juliuskaiser.app/dateheart/";

const STORAGE_KEYS = {
  favorites: "dateheart:favorites",
  history: "dateheart:history",
  filters: "dateheart:filters",
  language: "dateheart:language",
  stats: "dateheart:stats",
  noAds: "dateheart:no_ads",
  plus: "dateheart:plus",
  plusSession: "dateheart:plus_session",
  pendingCheckoutSession: "dateheart:pending_checkout_session",
  purchaseClientId: "dateheart:purchase_client_id",
};

const APP_NAME = "DateHeart";
const SUPPORT_EMAIL = "ceo@juliuskaiser.app";
const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}?subject=DateHeart%20Support`;
const AD_REVEAL_INTERVAL_MIN = 5;
const AD_REVEAL_INTERVAL_MAX = 7;
const NATIVE_PLATFORM = Capacitor.getPlatform();
const IS_NATIVE_APP = NATIVE_PLATFORM === "ios" || NATIVE_PLATFORM === "android";

if (IS_NATIVE_APP) {
  document.documentElement.classList.add("native-shell");
}
const SHOW_PLUS_ENTRY = true;
const ENABLE_WEB_AD_PLACEHOLDER = import.meta.env.VITE_ENABLE_WEB_AD_PLACEHOLDER === "true";
const ENABLE_AD_BANNER = IS_NATIVE_APP || ENABLE_WEB_AD_PLACEHOLDER;
const ENABLE_INTERSTITIAL_AD = IS_NATIVE_APP || ENABLE_WEB_AD_PLACEHOLDER;
const ENABLE_LOCAL_PURCHASE_TESTING =
  import.meta.env.VITE_ENABLE_LOCAL_PURCHASE_TESTING === "true" && import.meta.env.VITE_ADMOB_TEST_MODE === "true";
const ENABLE_UI_SOUNDS = import.meta.env.VITE_ENABLE_UI_SOUNDS !== "false";
const HISTORY_LIMIT = 120;
const FAMILY_REPEAT_WINDOW = 90;
const staticPageUrl = (path: string) => `${import.meta.env.BASE_URL}${path}`;

type PersistedStats = {
  reveals: number;
  adBreaks: number;
  nextAdRevealAt?: number;
};

function nextAdRevealTarget(fromRevealCount: number) {
  const span = AD_REVEAL_INTERVAL_MAX - AD_REVEAL_INTERVAL_MIN + 1;
  return fromRevealCount + AD_REVEAL_INTERVAL_MIN + Math.floor(Math.random() * span);
}

function normalizeStats(stats: PersistedStats): PersistedStats {
  const reveals = Number.isFinite(stats.reveals) ? Math.max(0, Math.floor(stats.reveals)) : 0;
  const adBreaks = Number.isFinite(stats.adBreaks) ? Math.max(0, Math.floor(stats.adBreaks)) : 0;
  const nextAdRevealAt =
    Number.isFinite(stats.nextAdRevealAt) && (stats.nextAdRevealAt ?? 0) > reveals
      ? Math.floor(stats.nextAdRevealAt ?? 0)
      : nextAdRevealTarget(reveals);

  return { reveals, adBreaks, nextAdRevealAt };
}

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

type PlusPlan = typeof STORE_PRODUCTS.proMonthly | typeof STORE_PRODUCTS.proYearly;

type PlusStatus = "note" | "starting" | "verifying" | "confirmed" | "failed" | "unavailable" | "native";

type PlusCopy = {
  button: string;
  label: string;
  title: string;
  body: string;
  plusIntro: string;
  monthly: string;
  yearly: string;
  monthSuffix: string;
  yearSuffix: string;
  subscribeMonthly: string;
  subscribeYearly: string;
  active: string;
  nativeBilling: string;
  nativeNoAdsBilling: string;
  statusNote: string;
  statusStarting: string;
  statusVerifying: string;
  statusConfirmed: string;
  statusFailed: string;
  statusUnavailable: string;
  unlockRequired: string;
  featurePlanner: string;
  featureNoAds: string;
  featureWeek: string;
  featureChallenges: string;
  featureSync: string;
  featureFilters: string;
  featurePacks: string;
  toolsTitle: string;
  tonightMode: string;
  weekPlan: string;
  challenge: string;
  copyAiPlanner: string;
  shareFavorites: string;
  noAdsIncluded: string;
  outputCopied: string;
};

const resultCopy: Record<LanguageCode, ResultCopy> = {
  en: {
    plan: "Do this",
    aiPrompt: "Dateplanner",
    copyPlan: "Copy plan",
    copiedPlan: "Plan copied",
    tonight: "Tonight",
    out: "Out",
    aiPromptTemplate: "Dateplanner: {title}. Details: {prompt}. Prepare: {prep}. Keep the budget and duration in mind.",
  },
  "en-US": {
    plan: "Do this",
    aiPrompt: "Dateplanner",
    copyPlan: "Copy plan",
    copiedPlan: "Plan copied",
    tonight: "Tonight",
    out: "Out",
    aiPromptTemplate: "Dateplanner: {title}. Details: {prompt}. Prepare: {prep}. Keep the budget and duration in mind.",
  },
  de: {
    plan: "Macht das",
    aiPrompt: "Dateplanner",
    copyPlan: "Plan kopieren",
    copiedPlan: "Plan kopiert",
    tonight: "Heute",
    out: "Rausgehen",
    aiPromptTemplate: "Dateplanner: {title}. Details: {prompt}. Vorbereitung: {prep}. Budget und Dauer passend einplanen.",
  },
  pl: {
    plan: "Zróbcie to",
    aiPrompt: "Dateplanner",
    copyPlan: "Kopiuj plan",
    copiedPlan: "Plan skopiowany",
    tonight: "Dziś",
    out: "Wyjście",
    aiPromptTemplate:
      "Zamień ten pomysł DateHeart w konkretny plan na dziś. Zachowaj budżet i czas. Pomysł: {title}. Szczegóły: {prompt}. Przygotowanie: {prep}.",
  },
  es: {
    plan: "Haced esto",
    aiPrompt: "Dateplanner",
    copyPlan: "Copiar plan",
    copiedPlan: "Plan copiado",
    tonight: "Hoy",
    out: "Salir",
    aiPromptTemplate:
      "Convierte esta idea de DateHeart en un plan concreto para hoy. Mantén el presupuesto y la duración. Idea: {title}. Detalles: {prompt}. Preparación: {prep}.",
  },
  fr: {
    plan: "Faites ça",
    aiPrompt: "Dateplanner",
    copyPlan: "Copier le plan",
    copiedPlan: "Plan copié",
    tonight: "Ce soir",
    out: "Sortie",
    aiPromptTemplate:
      "Transforme cette idée DateHeart en plan concret pour aujourd’hui. Garde le budget et la durée. Idée : {title}. Détails : {prompt}. Préparation : {prep}.",
  },
  it: {
    plan: "Fate questo",
    aiPrompt: "Dateplanner",
    copyPlan: "Copia piano",
    copiedPlan: "Piano copiato",
    tonight: "Stasera",
    out: "Fuori",
    aiPromptTemplate:
      "Trasforma questa idea DateHeart in un piano concreto per oggi. Mantieni budget e durata. Idea: {title}. Dettagli: {prompt}. Preparazione: {prep}.",
  },
  pt: {
    plan: "Façam isto",
    aiPrompt: "Dateplanner",
    copyPlan: "Copiar plano",
    copiedPlan: "Plano copiado",
    tonight: "Hoje",
    out: "Sair",
    aiPromptTemplate:
      "Transforma esta ideia do DateHeart num plano concreto para hoje. Mantém o orçamento e a duração. Ideia: {title}. Detalhes: {prompt}. Preparação: {prep}.",
  },
  hi: {
    plan: "यह करें",
    aiPrompt: "Dateplanner",
    copyPlan: "योजना कॉपी करें",
    copiedPlan: "योजना कॉपी हुई",
    tonight: "आज",
    out: "बाहर",
    aiPromptTemplate:
      "इस DateHeart आइडिया को आज के लिए ठोस योजना में बदलें. बजट और अवधि रखें. आइडिया: {title}. विवरण: {prompt}. तैयारी: {prep}.",
  },
  ar: {
    plan: "افعلا هذا",
    aiPrompt: "Dateplanner",
    copyPlan: "نسخ الخطة",
    copiedPlan: "تم نسخ الخطة",
    tonight: "اليوم",
    out: "خروج",
    aiPromptTemplate:
      "حوّل فكرة DateHeart هذه إلى خطة محددة لهذا اليوم. حافظ على الميزانية والمدة. الفكرة: {title}. التفاصيل: {prompt}. التحضير: {prep}.",
  },
  ja: {
    plan: "これを実行",
    aiPrompt: "Dateplanner",
    copyPlan: "プランをコピー",
    copiedPlan: "プランをコピーしました",
    tonight: "今日",
    out: "外出",
    aiPromptTemplate:
      "このDateHeartのアイデアを今日の具体的なプランにしてください。予算と所要時間は守ってください。アイデア: {title}。詳細: {prompt}。準備: {prep}。",
  },
  zh: {
    plan: "照这样做",
    aiPrompt: "Dateplanner",
    copyPlan: "复制计划",
    copiedPlan: "计划已复制",
    tonight: "今天",
    out: "出门",
    aiPromptTemplate:
      "把这个 DateHeart 想法变成今天可执行的具体计划。保持预算和时长。想法：{title}。细节：{prompt}。准备：{prep}。",
  },
  ru: {
    plan: "Сделайте это",
    aiPrompt: "Dateplanner",
    copyPlan: "Скопировать план",
    copiedPlan: "План скопирован",
    tonight: "Сегодня",
    out: "Выйти",
    aiPromptTemplate:
      "Преврати эту идею DateHeart в конкретный план на сегодня. Сохрани бюджет и длительность. Идея: {title}. Детали: {prompt}. Подготовка: {prep}.",
  },
  ko: {
    plan: "이렇게 하기",
    aiPrompt: "Dateplanner",
    copyPlan: "계획 복사",
    copiedPlan: "계획 복사됨",
    tonight: "오늘",
    out: "외출",
    aiPromptTemplate:
      "이 DateHeart 아이디어를 오늘 실행할 구체적인 계획으로 바꿔 주세요. 예산과 시간은 유지하세요. 아이디어: {title}. 세부 내용: {prompt}. 준비: {prep}.",
  },
  tr: {
    plan: "Bunu yapın",
    aiPrompt: "Dateplanner",
    copyPlan: "Planı kopyala",
    copiedPlan: "Plan kopyalandı",
    tonight: "Bugün",
    out: "Dışarı",
    aiPromptTemplate:
      "Bu DateHeart fikrini bugün için somut bir plana dönüştür. Bütçeyi ve süreyi koru. Fikir: {title}. Ayrıntılar: {prompt}. Hazırlık: {prep}.",
  },
  id: {
    plan: "Lakukan ini",
    aiPrompt: "Dateplanner",
    copyPlan: "Salin rencana",
    copiedPlan: "Rencana disalin",
    tonight: "Hari ini",
    out: "Keluar",
    aiPromptTemplate:
      "Ubah ide DateHeart ini menjadi rencana konkret untuk hari ini. Pertahankan anggaran dan durasi. Ide: {title}. Detail: {prompt}. Persiapan: {prep}.",
  },
  nl: {
    plan: "Doe dit",
    aiPrompt: "Dateplanner",
    copyPlan: "Plan kopiëren",
    copiedPlan: "Plan gekopieerd",
    tonight: "Vandaag",
    out: "Uit",
    aiPromptTemplate:
      "Maak van dit DateHeart-idee een concreet plan voor vandaag. Houd budget en duur aan. Idee: {title}. Details: {prompt}. Voorbereiding: {prep}.",
  },
  sv: {
    plan: "Gör detta",
    aiPrompt: "Dateplanner",
    copyPlan: "Kopiera plan",
    copiedPlan: "Plan kopierad",
    tonight: "I dag",
    out: "Ut",
    aiPromptTemplate:
      "Gör denna DateHeart-idé till en konkret plan för i dag. Behåll budget och längd. Idé: {title}. Detaljer: {prompt}. Förbered: {prep}.",
  },
  cs: {
    plan: "Udělejte tohle",
    aiPrompt: "Dateplanner",
    copyPlan: "Kopírovat plán",
    copiedPlan: "Plán zkopírován",
    tonight: "Dnes",
    out: "Ven",
    aiPromptTemplate:
      "Proměň tento nápad DateHeart v konkrétní plán na dnešek. Zachovej rozpočet a délku. Nápad: {title}. Detaily: {prompt}. Příprava: {prep}.",
  },
  uk: {
    plan: "Зробіть це",
    aiPrompt: "Dateplanner",
    copyPlan: "Скопіювати план",
    copiedPlan: "План скопійовано",
    tonight: "Сьогодні",
    out: "Вийти",
    aiPromptTemplate:
      "Перетвори цю ідею DateHeart на конкретний план на сьогодні. Збережи бюджет і тривалість. Ідея: {title}. Деталі: {prompt}. Підготовка: {prep}.",
  },
  vi: {
    plan: "Làm thế này",
    aiPrompt: "Dateplanner",
    copyPlan: "Sao chép kế hoạch",
    copiedPlan: "Đã sao chép kế hoạch",
    tonight: "Hôm nay",
    out: "Ra ngoài",
    aiPromptTemplate:
      "Biến ý tưởng DateHeart này thành kế hoạch cụ thể cho hôm nay. Giữ ngân sách và thời lượng. Ý tưởng: {title}. Chi tiết: {prompt}. Chuẩn bị: {prep}.",
  },
  th: {
    plan: "ทำแบบนี้",
    aiPrompt: "Dateplanner",
    copyPlan: "คัดลอกแผน",
    copiedPlan: "คัดลอกแผนแล้ว",
    tonight: "วันนี้",
    out: "ออกไป",
    aiPromptTemplate:
      "เปลี่ยนไอเดีย DateHeart นี้ให้เป็นแผนที่ทำได้จริงสำหรับวันนี้ รักษางบและระยะเวลาไว้ ไอเดีย: {title}. รายละเอียด: {prompt}. เตรียม: {prep}.",
  },
  da: {
    plan: "Gør dette",
    aiPrompt: "Dateplanner",
    copyPlan: "Kopiér plan",
    copiedPlan: "Plan kopieret",
    tonight: "I dag",
    out: "Ud",
    aiPromptTemplate:
      "Gør denne DateHeart-idé til en konkret plan for i dag. Behold budget og varighed. Idé: {title}. Detaljer: {prompt}. Forberedelse: {prep}.",
  },
  fi: {
    plan: "Tehkää näin",
    aiPrompt: "Treffisuunnittelija",
    copyPlan: "Kopioi suunnitelma",
    copiedPlan: "Suunnitelma kopioitu",
    tonight: "Tänään",
    out: "Ulos",
    aiPromptTemplate:
      "Muuta tämä DateHeart-idea konkreettiseksi suunnitelmaksi tälle päivälle. Säilytä budjetti ja kesto. Idea: {title}. Tiedot: {prompt}. Valmistelu: {prep}.",
  },
  ro: {
    plan: "Faceți asta",
    aiPrompt: "Planificator de întâlniri",
    copyPlan: "Copiază planul",
    copiedPlan: "Plan copiat",
    tonight: "Astăzi",
    out: "Afară",
    aiPromptTemplate:
      "Transformă această idee DateHeart într-un plan concret pentru azi. Păstrează bugetul și durata. Idee: {title}. Detalii: {prompt}. Pregătire: {prep}.",
  },
  hu: {
    plan: "Ezt csináljátok",
    aiPrompt: "Randitervező",
    copyPlan: "Terv másolása",
    copiedPlan: "Terv másolva",
    tonight: "Ma",
    out: "Kimozdulás",
    aiPromptTemplate:
      "Alakítsd ezt a DateHeart-ötletet konkrét mai tervvé. Tartsd meg a költségkeretet és az időtartamot. Ötlet: {title}. Részletek: {prompt}. Előkészítés: {prep}.",
  },
  bn: {
    plan: "এটা করুন",
    aiPrompt: "ডেট পরিকল্পনাকারী",
    copyPlan: "পরিকল্পনা কপি করুন",
    copiedPlan: "পরিকল্পনা কপি হয়েছে",
    tonight: "আজ",
    out: "বাইরে",
    aiPromptTemplate:
      "এই DateHeart আইডিয়াকে আজকের জন্য নির্দিষ্ট পরিকল্পনায় বদলে দিন। বাজেট ও সময়কাল বজায় রাখুন। আইডিয়া: {title}. বিস্তারিত: {prompt}. প্রস্তুতি: {prep}.",
  },
  ur: {
    plan: "یہ کریں",
    aiPrompt: "ڈیٹ منصوبہ ساز",
    copyPlan: "منصوبہ کاپی کریں",
    copiedPlan: "منصوبہ کاپی ہوگیا",
    tonight: "آج",
    out: "باہر",
    aiPromptTemplate:
      "اس DateHeart آئیڈیا کو آج کے لیے واضح منصوبے میں بدلیں۔ بجٹ اور دورانیہ برقرار رکھیں۔ آئیڈیا: {title}. تفصیل: {prompt}. تیاری: {prep}.",
  },
  fa: {
    plan: "این کار را انجام دهید",
    aiPrompt: "برنامه‌ریز قرار",
    copyPlan: "کپی برنامه",
    copiedPlan: "برنامه کپی شد",
    tonight: "امروز",
    out: "بیرون",
    aiPromptTemplate:
      "این ایده DateHeart را به برنامه‌ای مشخص برای امروز تبدیل کن. بودجه و مدت را حفظ کن. ایده: {title}. جزئیات: {prompt}. آمادگی: {prep}.",
  },
  he: {
    plan: "עשו את זה",
    aiPrompt: "מתכנן דייט",
    copyPlan: "העתק תכנית",
    copiedPlan: "התכנית הועתקה",
    tonight: "היום",
    out: "בחוץ",
    aiPromptTemplate:
      "הפכו את רעיון DateHeart הזה לתכנית ברורה להיום. שמרו על התקציב והמשך. רעיון: {title}. פרטים: {prompt}. הכנה: {prep}.",
  },
  el: {
    plan: "Κάντε αυτό",
    aiPrompt: "Σχεδιαστής ραντεβού",
    copyPlan: "Αντιγραφή πλάνου",
    copiedPlan: "Το πλάνο αντιγράφηκε",
    tonight: "Σήμερα",
    out: "Έξω",
    aiPromptTemplate:
      "Μετέτρεψε αυτή την ιδέα DateHeart σε συγκεκριμένο πλάνο για σήμερα. Κράτησε τον προϋπολογισμό και τη διάρκεια. Ιδέα: {title}. Λεπτομέρειες: {prompt}. Προετοιμασία: {prep}.",
  },
  bg: {
    plan: "Направете това",
    aiPrompt: "Планировчик на среща",
    copyPlan: "Копирай плана",
    copiedPlan: "Планът е копиран",
    tonight: "Днес",
    out: "Навън",
    aiPromptTemplate:
      "Превърни тази идея от DateHeart в конкретен план за днес. Запази бюджета и продължителността. Идея: {title}. Детайли: {prompt}. Подготовка: {prep}.",
  },
  hr: {
    plan: "Napravite ovo",
    aiPrompt: "Planer spoja",
    copyPlan: "Kopiraj plan",
    copiedPlan: "Plan je kopiran",
    tonight: "Danas",
    out: "Vani",
    aiPromptTemplate:
      "Pretvori ovu DateHeart ideju u konkretan plan za danas. Zadrži budžet i trajanje. Ideja: {title}. Detalji: {prompt}. Priprema: {prep}.",
  },
  sk: {
    plan: "Urobte toto",
    aiPrompt: "Plánovač rande",
    copyPlan: "Kopírovať plán",
    copiedPlan: "Plán skopírovaný",
    tonight: "Dnes",
    out: "Von",
    aiPromptTemplate:
      "Premeň tento nápad DateHeart na konkrétny plán na dnes. Zachovaj rozpočet a trvanie. Nápad: {title}. Detaily: {prompt}. Príprava: {prep}.",
  },
  ms: {
    plan: "Lakukan ini",
    aiPrompt: "Perancang janji temu",
    copyPlan: "Salin rancangan",
    copiedPlan: "Rancangan disalin",
    tonight: "Hari ini",
    out: "Keluar",
    aiPromptTemplate:
      "Tukar idea DateHeart ini menjadi rancangan konkrit untuk hari ini. Kekalkan bajet dan tempoh. Idea: {title}. Butiran: {prompt}. Persediaan: {prep}.",
  },
  tl: {
    plan: "Gawin ito",
    aiPrompt: "Tagaplano ng tipanan",
    copyPlan: "Kopyahin ang plano",
    copiedPlan: "Nakopya ang plano",
    tonight: "Ngayon",
    out: "Sa labas",
    aiPromptTemplate:
      "Gawing konkretong plano para sa araw na ito ang ideyang DateHeart na ito. Panatilihin ang badyet at tagal. Ideya: {title}. Detalye: {prompt}. Paghahanda: {prep}.",
  },
  ta: {
    plan: "இதைக் செய்யுங்கள்",
    aiPrompt: "டேட் திட்டமிடுபவர்",
    copyPlan: "திட்டத்தை நகலெடு",
    copiedPlan: "திட்டம் நகலெடுக்கப்பட்டது",
    tonight: "இன்று",
    out: "வெளியே",
    aiPromptTemplate:
      "இந்த DateHeart யோசனையை இன்றுக்கான தெளிவான திட்டமாக மாற்றுங்கள். பட்ஜெட் மற்றும் நேரத்தை வைத்திருங்கள். யோசனை: {title}. விவரங்கள்: {prompt}. தயாரிப்பு: {prep}.",
  },
  te: {
    plan: "ఇది చేయండి",
    aiPrompt: "డేట్ ప్లానర్",
    copyPlan: "ప్రణాళికను కాపీ చేయండి",
    copiedPlan: "ప్రణాళిక కాపీ అయింది",
    tonight: "ఈ రోజు",
    out: "బయట",
    aiPromptTemplate:
      "ఈ DateHeart ఆలోచనను ఈ రోజుకి స్పష్టమైన ప్రణాళికగా మార్చండి. బడ్జెట్ మరియు వ్యవధిని అలాగే ఉంచండి. ఆలోచన: {title}. వివరాలు: {prompt}. తయారీ: {prep}.",
  },
  sw: {
    plan: "Fanyeni hivi",
    aiPrompt: "Mpangaji wa miadi",
    copyPlan: "Nakili mpango",
    copiedPlan: "Mpango umenakiliwa",
    tonight: "Leo",
    out: "Nje",
    aiPromptTemplate:
      "Geuza wazo hili la DateHeart kuwa mpango halisi wa leo. Shikilia bajeti na muda. Wazo: {title}. Maelezo: {prompt}. Maandalizi: {prep}.",
  },
  mr: {
    plan: "हे करा",
    aiPrompt: "भेट नियोजक",
    copyPlan: "योजना कॉपी करा",
    copiedPlan: "योजना कॉपी झाली",
    tonight: "आज",
    out: "बाहेर",
    aiPromptTemplate:
      "ही DateHeart कल्पना आजच्या स्पष्ट योजनेत बदला. बजेट आणि कालावधी तसेच ठेवा. कल्पना: {title}. तपशील: {prompt}. तयारी: {prep}.",
  },
  gu: {
    plan: "આ કરો",
    aiPrompt: "મુલાકાત યોજક",
    copyPlan: "યોજનાની નકલ કરો",
    copiedPlan: "યોજનાની નકલ થઈ",
    tonight: "આજે",
    out: "બહાર",
    aiPromptTemplate:
      "આ DateHeart વિચારણાને આજની સ્પષ્ટ યોજનામાં ફેરવો. બજેટ અને સમયગાળો યથાવત રાખો. વિચારણા: {title}. વિગતો: {prompt}. તૈયારી: {prep}.",
  },
  pa: {
    plan: "ਇਹ ਕਰੋ",
    aiPrompt: "ਮਿਲਣ ਯੋਜਕ",
    copyPlan: "ਯੋਜਨਾ ਨਕਲ ਕਰੋ",
    copiedPlan: "ਯੋਜਨਾ ਨਕਲ ਹੋਈ",
    tonight: "ਅੱਜ",
    out: "ਬਾਹਰ",
    aiPromptTemplate:
      "ਇਸ DateHeart ਸੋਚ ਨੂੰ ਅੱਜ ਲਈ ਸਪਸ਼ਟ ਯੋਜਨਾ ਵਿੱਚ ਬਦਲੋ. ਬਜਟ ਅਤੇ ਸਮਾਂ ਜਿਵੇਂ ਹੈ ਰੱਖੋ. ਸੋਚ: {title}. ਵੇਰਵਾ: {prompt}. ਤਿਆਰੀ: {prep}.",
  },
  kn: {
    plan: "ಇದನ್ನು ಮಾಡಿ",
    aiPrompt: "ಭೇಟಿ ಯೋಜಕ",
    copyPlan: "ಯೋಜನೆ ನಕಲಿಸಿ",
    copiedPlan: "ಯೋಜನೆ ನಕಲಿಸಲಾಗಿದೆ",
    tonight: "ಇಂದು",
    out: "ಹೊರಗೆ",
    aiPromptTemplate:
      "ಈ DateHeart ಆಲೋಚನೆಯನ್ನು ಇಂದಿನ ಸ್ಪಷ್ಟ ಯೋಜನೆಗೆ ಬದಲಿಸಿ. ಬಜೆಟ್ ಮತ್ತು ಅವಧಿ ಉಳಿಸಿ. ಆಲೋಚನೆ: {title}. ವಿವರಗಳು: {prompt}. ತಯಾರಿ: {prep}.",
  },
  ml: {
    plan: "ഇത് ചെയ്യുക",
    aiPrompt: "കൂടിക്കാഴ്ച പദ്ധതികർത്താവ്",
    copyPlan: "പദ്ധതി പകർത്തുക",
    copiedPlan: "പദ്ധതി പകർത്തി",
    tonight: "ഇന്ന്",
    out: "പുറത്ത്",
    aiPromptTemplate:
      "ഈ DateHeart ചിന്തയെ ഇന്നത്തെ വ്യക്തമായ പദ്ധതിയാക്കി മാറ്റുക. ബജറ്റും ദൈർഘ്യവും നിലനിർത്തുക. ചിന്ത: {title}. വിശദാംശങ്ങൾ: {prompt}. തയ്യാറെടുപ്പ്: {prep}.",
  },
  ne: {
    plan: "यो गर्नुहोस्",
    aiPrompt: "भेट योजनाकार",
    copyPlan: "योजना नक्कल गर्नुहोस्",
    copiedPlan: "योजना नक्कल भयो",
    tonight: "आज",
    out: "बाहिर",
    aiPromptTemplate:
      "यो DateHeart विचारलाई आजका लागि स्पष्ट योजनामा बदल्नुहोस्. बजेट र अवधि जस्ताको त्यस्तै राख्नुहोस्. विचार: {title}. विवरण: {prompt}. तयारी: {prep}.",
  },
  si: {
    plan: "මෙය කරන්න",
    aiPrompt: "හමුවීම් සැලසුම්කරු",
    copyPlan: "සැලැස්ම පිටපත් කරන්න",
    copiedPlan: "සැලැස්ම පිටපත් විය",
    tonight: "අද",
    out: "පිටත",
    aiPromptTemplate:
      "මෙම DateHeart අදහස අදට පැහැදිලි සැලැස්මක් බවට පත් කරන්න. අයවැය සහ කාලය එලෙසම තබන්න. අදහස: {title}. විස්තර: {prompt}. සූදානම: {prep}.",
  },
  et: {
    plan: "Tehke seda",
    aiPrompt: "Kohtinguplaanija",
    copyPlan: "Kopeeri plaan",
    copiedPlan: "Plaan kopeeritud",
    tonight: "Täna",
    out: "Välja",
    aiPromptTemplate:
      "Muuda see DateHearti idee tänaseks konkreetseks plaaniks. Säilita eelarve ja kestus. Idee: {title}. Üksikasjad: {prompt}. Ettevalmistus: {prep}.",
  },
  lt: {
    plan: "Padarykite tai",
    aiPrompt: "Pasimatymo planuotojas",
    copyPlan: "Kopijuoti planą",
    copiedPlan: "Planas nukopijuotas",
    tonight: "Šiandien",
    out: "Į lauką",
    aiPromptTemplate:
      "Paverskite šią DateHeart idėją konkrečiu šiandienos planu. Išlaikykite biudžetą ir trukmę. Idėja: {title}. Išsamiau: {prompt}. Pasiruošimas: {prep}.",
  },
  lv: {
    plan: "Dariet šo",
    aiPrompt: "Randiņa plānotājs",
    copyPlan: "Kopēt plānu",
    copiedPlan: "Plāns nokopēts",
    tonight: "Šodien",
    out: "Ārā",
    aiPromptTemplate:
      "Pārvērtiet šo DateHeart ideju konkrētā šodienas plānā. Saglabājiet budžetu un ilgumu. Ideja: {title}. Sīkāk: {prompt}. Sagatavošanās: {prep}.",
  },
  sl: {
    plan: "Naredita to",
    aiPrompt: "Načrtovalnik zmenka",
    copyPlan: "Kopiraj načrt",
    copiedPlan: "Načrt kopiran",
    tonight: "Danes",
    out: "Ven",
    aiPromptTemplate:
      "Spremenita to idejo DateHeart v konkreten načrt za danes. Ohranita proračun in trajanje. Ideja: {title}. Podrobnosti: {prompt}. Priprava: {prep}.",
  },
  ca: {
    plan: "Feu això",
    aiPrompt: "Planificador de cita",
    copyPlan: "Copia el pla",
    copiedPlan: "Pla copiat",
    tonight: "Avui",
    out: "A fora",
    aiPromptTemplate:
      "Convertiu aquesta idea de DateHeart en un pla concret per avui. Manteniu pressupost i durada. Idea: {title}. Detalls: {prompt}. Preparació: {prep}.",
  },
  eu: {
    plan: "Egin hau",
    aiPrompt: "Hitzordu-planifikatzailea",
    copyPlan: "Kopiatu plana",
    copiedPlan: "Plana kopiatuta",
    tonight: "Gaur",
    out: "Kanpora",
    aiPromptTemplate:
      "Bihurtu DateHeart ideia hau gaurko plan zehatz batean. Mantendu aurrekontua eta iraupena. Ideia: {title}. Xehetasunak: {prompt}. Prestaketa: {prep}.",
  },
  gl: {
    plan: "Facede isto",
    aiPrompt: "Planificador de cita",
    copyPlan: "Copiar o plan",
    copiedPlan: "Plan copiado",
    tonight: "Hoxe",
    out: "Fóra",
    aiPromptTemplate:
      "Convertede esta idea de DateHeart nun plan concreto para hoxe. Mantede orzamento e duración. Idea: {title}. Detalles: {prompt}. Preparación: {prep}.",
  },
  ga: {
    plan: "Déan é seo",
    aiPrompt: "Pleanálaí coinne",
    copyPlan: "Cóipeáil an plean",
    copiedPlan: "Plean cóipeáilte",
    tonight: "Inniu",
    out: "Amach",
    aiPromptTemplate:
      "Déan an smaoineamh DateHeart seo ina phlean coincréiteach don lá inniu. Coinnigh buiséad agus fad. Smaoineamh: {title}. Sonraí: {prompt}. Ullmhúchán: {prep}.",
  },
  is: {
    plan: "Gerið þetta",
    aiPrompt: "Stefnumótaplanari",
    copyPlan: "Afrita plan",
    copiedPlan: "Plan afritað",
    tonight: "Í dag",
    out: "Út",
    aiPromptTemplate:
      "Breytið þessari DateHeart hugmynd í skýrt plan fyrir daginn. Haldið fjárhagsáætlun og lengd. Hugmynd: {title}. Upplýsingar: {prompt}. Undirbúningur: {prep}.",
  },
  mt: {
    plan: "Agħmlu dan",
    aiPrompt: "Pjanifikatur tad-date",
    copyPlan: "Ikkopja l-pjan",
    copiedPlan: "Pjan ikkupjat",
    tonight: "Illum",
    out: "Barra",
    aiPromptTemplate:
      "Ibiddlu din l-idea ta' DateHeart fi pjan konkret għal-lum. Żommu l-baġit u t-tul. Idea: {title}. Dettalji: {prompt}. Preparazzjoni: {prep}.",
  },
  mk: {
    plan: "Направете го ова",
    aiPrompt: "Планер за состанок",
    copyPlan: "Копирај план",
    copiedPlan: "Планот е копиран",
    tonight: "Денес",
    out: "Надвор",
    aiPromptTemplate:
      "Претворете ја оваа DateHeart идеја во конкретен план за денес. Задржете ги буџетот и траењето. Идеја: {title}. Детали: {prompt}. Подготовка: {prep}.",
  },
  sq: {
    plan: "Bëjeni këtë",
    aiPrompt: "Planifikues takimi",
    copyPlan: "Kopjo planin",
    copiedPlan: "Plani u kopjua",
    tonight: "Sot",
    out: "Jashtë",
    aiPromptTemplate:
      "Kthejeni këtë ide DateHeart në një plan konkret për sot. Ruani buxhetin dhe kohëzgjatjen. Ideja: {title}. Detaje: {prompt}. Përgatitja: {prep}.",
  },
  no: {
    plan: "Gjør dette",
    aiPrompt: "Dateplanlegger",
    copyPlan: "Kopier plan",
    copiedPlan: "Plan kopiert",
    tonight: "I dag",
    out: "Ut",
    aiPromptTemplate:
      "Gjør denne DateHeart-ideen om til en konkret plan for i dag. Behold budsjett og varighet. Idé: {title}. Detaljer: {prompt}. Forberedelse: {prep}.",
  },
  sr: {
    plan: "Урадите ово",
    aiPrompt: "Планер састанка",
    copyPlan: "Копирај план",
    copiedPlan: "План је копиран",
    tonight: "Данас",
    out: "Напоље",
    aiPromptTemplate:
      "Претворите ову DateHeart идеју у конкретан план за данас. Задржите буџет и трајање. Идеја: {title}. Детаљи: {prompt}. Припрема: {prep}.",
  },
  bs: {
    plan: "Uradite ovo",
    aiPrompt: "Planer spoja",
    copyPlan: "Kopiraj plan",
    copiedPlan: "Plan kopiran",
    tonight: "Danas",
    out: "Vani",
    aiPromptTemplate:
      "Pretvorite ovu DateHeart ideju u konkretan plan za danas. Zadržite budžet i trajanje. Ideja: {title}. Detalji: {prompt}. Priprema: {prep}.",
  },
  be: {
    plan: "Зрабіце гэта",
    aiPrompt: "Планавальнік спаткання",
    copyPlan: "Скапіраваць план",
    copiedPlan: "План скапіраваны",
    tonight: "Сёння",
    out: "На вуліцу",
    aiPromptTemplate:
      "Ператварыце гэтую ідэю DateHeart у канкрэтны план на сёння. Захавайце бюджэт і працягласць. Ідэя: {title}. Падрабязнасці: {prompt}. Падрыхтоўка: {prep}.",
  },
  af: {
    plan: "Doen dit",
    aiPrompt: "Afspraakbeplanner",
    copyPlan: "Kopieer plan",
    copiedPlan: "Plan gekopieer",
    tonight: "Vandag",
    out: "Buite",
    aiPromptTemplate:
      "Verander hierdie DateHeart-idee in 'n konkrete plan vir vandag. Hou begroting en duur in gedagte. Idee: {title}. Besonderhede: {prompt}. Voorbereiding: {prep}.",
  },
  az: {
    plan: "Bunu edin",
    aiPrompt: "Görüş planlayıcısı",
    copyPlan: "Planı kopyala",
    copiedPlan: "Plan kopyalandı",
    tonight: "Bu gün",
    out: "Çölə",
    aiPromptTemplate:
      "Bu DateHeart ideyasını bu gün üçün konkret plana çevirin. Büdcə və müddəti qoruyun. İdeya: {title}. Detallar: {prompt}. Hazırlıq: {prep}.",
  },
  hy: {
    plan: "Արեք սա",
    aiPrompt: "Ժամադրության պլանավորիչ",
    copyPlan: "Պատճենել պլանը",
    copiedPlan: "Պլանը պատճենված է",
    tonight: "Այսօր",
    out: "Դուրս",
    aiPromptTemplate:
      "Այս DateHeart գաղափարը վերածեք այսօրվա կոնկրետ պլանի։ Պահպանեք բյուջեն և տևողությունը։ Գաղափար՝ {title}։ Մանրամասներ՝ {prompt}։ Պատրաստում՝ {prep}։",
  },
  ka: {
    plan: "გააკეთეთ ეს",
    aiPrompt: "პაემნის დამგეგმავი",
    copyPlan: "გეგმის კოპირება",
    copiedPlan: "გეგმა დაკოპირდა",
    tonight: "დღეს",
    out: "გარეთ",
    aiPromptTemplate:
      "ეს DateHeart იდეა დღევანდელ კონკრეტულ გეგმად აქციეთ. შეინარჩუნეთ ბიუჯეტი და ხანგრძლივობა. იდეა: {title}. დეტალები: {prompt}. მომზადება: {prep}.",
  },
  am: {
    plan: "ይህን አድርጉ",
    aiPrompt: "የቀጠሮ አቅድ",
    copyPlan: "እቅዱን ቅዳ",
    copiedPlan: "እቅዱ ተቀድቷል",
    tonight: "ዛሬ",
    out: "ውጭ",
    aiPromptTemplate:
      "ይህን የDateHeart ሀሳብ ለዛሬ የሚፈጸም እቅድ አድርጉት። በጀትን እና ጊዜን ጠብቁ። ሀሳብ: {title}. ዝርዝር: {prompt}. ዝግጅት: {prep}.",
  },
  om: {
    plan: "Kana hojjedhaa",
    aiPrompt: "Karoorsaa walargii",
    copyPlan: "Karoora waraabi",
    copiedPlan: "Karooraan waraabame",
    tonight: "Har'a",
    out: "Ala",
    aiPromptTemplate:
      "Yaada DateHeart kana gara karoora har'aa raawwatamuutti jijjiiraa. Baajataa fi yeroo eegaa. Yaada: {title}. Bal'ina: {prompt}. Qophii: {prep}.",
  },
  so: {
    plan: "Tan sameeya",
    aiPrompt: "Qorsheeye shukaansi",
    copyPlan: "Nuqul qorshaha",
    copiedPlan: "Qorshaha waa la nuqulay",
    tonight: "Maanta",
    out: "Bannaanka",
    aiPromptTemplate:
      "Fikraddan DateHeart u beddel qorshe cad oo maanta la sameeyo. Ilaali miisaaniyadda iyo muddada. Fikrad: {title}. Faahfaahin: {prompt}. Diyaarin: {prep}.",
  },
  rw: {
    plan: "Mukore ibi",
    aiPrompt: "Utegura gahunda",
    copyPlan: "Koporora gahunda",
    copiedPlan: "Gahunda yakoporowe",
    tonight: "Uyu munsi",
    out: "Hanze",
    aiPromptTemplate:
      "Muhindure iki gitekerezo cya DateHeart gahunda ifatika y'uyu munsi. Mugumane ingengo n'igihe. Igitekerezo: {title}. Ibisobanuro: {prompt}. Gutegura: {prep}.",
  },
  ha: {
    plan: "Ku yi wannan",
    aiPrompt: "Mai tsara soyayya",
    copyPlan: "Kwafa shiri",
    copiedPlan: "An kwafa shiri",
    tonight: "Yau",
    out: "Waje",
    aiPromptTemplate:
      "Mai da wannan ra'ayin DateHeart zuwa shiri na yau mai yiwuwa. Riƙe kasafi da tsawon lokaci. Ra'ayi: {title}. Bayani: {prompt}. Shiri: {prep}.",
  },
  ig: {
    plan: "Mee nke a",
    aiPrompt: "Onye nhazi ịhụnanya",
    copyPlan: "Detuo atụmatụ",
    copiedPlan: "E detuola atụmatụ",
    tonight: "Taa",
    out: "N'èzí",
    aiPromptTemplate:
      "Gbanwee echiche DateHeart a ka ọ bụrụ atụmatụ doro anya maka taa. Debe mmefu ego na ogologo oge. Echiche: {title}. Nkọwa: {prompt}. Nkwadebe: {prep}.",
  },
  yo: {
    plan: "Ṣe eyi",
    aiPrompt: "Alakoso eto ìfẹ́",
    copyPlan: "Daakọ eto",
    copiedPlan: "Eto ti daakọ",
    tonight: "Loni",
    out: "Níta",
    aiPromptTemplate:
      "Yi ero DateHeart yii pada si eto gidi fun oni. Pa isuna ati iye akoko mọ́. Ero: {title}. Alaye: {prompt}. Ìmúrasílẹ̀: {prep}.",
  },
  zu: {
    plan: "Yenzani lokhu",
    aiPrompt: "Umhleli wothando",
    copyPlan: "Kopisha uhlelo",
    copiedPlan: "Uhlelo lukopishiwe",
    tonight: "Namuhla",
    out: "Ngaphandle",
    aiPromptTemplate:
      "Guqulani lo mbono we-DateHeart ube uhlelo olucacile lwanamuhla. Gcinani isabelomali nesikhathi. Umbono: {title}. Imininingwane: {prompt}. Ukulungiselela: {prep}.",
  },
  as: {
    plan: "এইটো কৰক",
    aiPrompt: "ডেট পৰিকল্পনাকাৰী",
    copyPlan: "পৰিকল্পনা নকল কৰক",
    copiedPlan: "পৰিকল্পনা নকল হ'ল",
    tonight: "আজি",
    out: "বাহিৰত",
    aiPromptTemplate:
      "এই DateHeart ধাৰণাটোক আজিৰ বাবে স্পষ্ট পৰিকল্পনালৈ ৰূপান্তৰ কৰক। বাজেট আৰু সময় ৰাখক। ধাৰণা: {title}। বিৱৰণ: {prompt}। প্ৰস্তুতি: {prep}।",
  },
  my: {
    plan: "ဒီလိုလုပ်ပါ",
    aiPrompt: "ဒိတ်စီစဉ်သူ",
    copyPlan: "အစီအစဉ် ကူးယူမည်",
    copiedPlan: "အစီအစဉ် ကူးယူပြီး",
    tonight: "ဒီနေ့",
    out: "အပြင်",
    aiPromptTemplate:
      "ဒီ DateHeart အကြံကို ဒီနေ့အတွက် ရှင်းလင်းသော အစီအစဉ်အဖြစ် ပြောင်းပါ။ ဘတ်ဂျက်နှင့် ကြာချိန်ကို ထိန်းပါ။ အကြံ: {title}။ အသေးစိတ်: {prompt}။ ပြင်ဆင်ရန်: {prep}။",
  },
  km: {
    plan: "ធ្វើបែបនេះ",
    aiPrompt: "អ្នករៀបចំណាត់ជួប",
    copyPlan: "ចម្លងផែនការ",
    copiedPlan: "បានចម្លងផែនការ",
    tonight: "ថ្ងៃនេះ",
    out: "ខាងក្រៅ",
    aiPromptTemplate:
      "បម្លែងគំនិត DateHeart នេះទៅជាផែនការច្បាស់សម្រាប់ថ្ងៃនេះ។ រក្សាថវិកា និងរយៈពេល។ គំនិត: {title}។ ព័ត៌មានលម្អិត: {prompt}។ ការត្រៀម: {prep}។",
  },
  lo: {
    plan: "ເຮັດສິ່ງນີ້",
    aiPrompt: "ຜູ້ວາງແຜນນັດ",
    copyPlan: "ຄັດລອກແຜນ",
    copiedPlan: "ຄັດລອກແຜນແລ້ວ",
    tonight: "ມື້ນີ້",
    out: "ຂ້າງນອກ",
    aiPromptTemplate:
      "ປ່ຽນແນວຄິດ DateHeart ນີ້ໃຫ້ເປັນແຜນຊັດເຈນສໍາລັບມື້ນີ້. ຮັກສາງົບ ແລະໄລຍະເວລາ. ແນວຄິດ: {title}. ລາຍລະອຽດ: {prompt}. ການກຽມ: {prep}.",
  },
  or: {
    plan: "ଏହା କରନ୍ତୁ",
    aiPrompt: "ଡେଟ ପରିକଳ୍ପନାକାରୀ",
    copyPlan: "ପରିକଳ୍ପନା ନକଲ",
    copiedPlan: "ପରିକଳ୍ପନା ନକଲ ହେଲା",
    tonight: "ଆଜି",
    out: "ବାହାରେ",
    aiPromptTemplate:
      "ଏହି DateHeart ଧାରଣାକୁ ଆଜି ପାଇଁ ସ୍ପଷ୍ଟ ପରିକଳ୍ପନା କରନ୍ତୁ। ବଜେଟ ଓ ସମୟ ରଖନ୍ତୁ। ଧାରଣା: {title}। ବିବରଣୀ: {prompt}। ପ୍ରସ୍ତୁତି: {prep}।",
  },
  ps: {
    plan: "دا وکړئ",
    aiPrompt: "د لیدنې پلان جوړوونکی",
    copyPlan: "پلان کاپي کړئ",
    copiedPlan: "پلان کاپي شو",
    tonight: "نن",
    out: "بهر",
    aiPromptTemplate:
      "دا DateHeart مفکوره د نن لپاره په روښانه پلان بدله کړئ. بودجه او موده وساتئ. مفکوره: {title}. جزیات: {prompt}. چمتووالی: {prep}.",
  },
  sd: {
    plan: "هي ڪريو",
    aiPrompt: "ڊيٽ پلان ڪندڙ",
    copyPlan: "پلان ڪاپي ڪريو",
    copiedPlan: "پلان ڪاپي ٿيو",
    tonight: "اڄ",
    out: "ٻاهر",
    aiPromptTemplate:
      "هن DateHeart خيال کي اڄ لاءِ صاف پلان ۾ بدلايو. بجيٽ ۽ مدت برقرار رکو. خيال: {title}. تفصيل: {prompt}. تياري: {prep}.",
  },
  ug: {
    plan: "بۇنى قىلىڭ",
    aiPrompt: "ئۇچرىشىش پىلانلىغۇچى",
    copyPlan: "پىلاننى كۆچۈرۈش",
    copiedPlan: "پىلان كۆچۈرۈلدى",
    tonight: "بۈگۈن",
    out: "سىرتقا",
    aiPromptTemplate:
      "بۇ DateHeart پىكرىنى بۈگۈن ئۈچۈن ئېنىق پىلانغا ئايلاندۇرۇڭ. خامچوت ۋە مۇددەتنى ساقلاڭ. پىكىر: {title}. تەپسىلات: {prompt}. تەييارلىق: {prep}.",
  },
};

const plusCopy: Record<LanguageCode, PlusCopy> = {
  en: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro removes ads and unlocks the full planning layer for couples.",
    plusIntro: "Pro includes ad-free use, Dateplanner, weekly plans, date challenges, shared favorites and exclusive idea packs.",
    monthly: "Monthly",
    yearly: "Yearly",
    monthSuffix: "/ month",
    yearSuffix: "/ year",
    subscribeMonthly: "Start monthly",
    subscribeYearly: "Start yearly",
    active: "Pro active",
    nativeBilling: "In-app purchase via the App Store or Google Play.",
    nativeNoAdsBilling: "One-time in-app purchase via the App Store or Google Play.",
    statusNote: "Web checkout uses Stripe. iOS and Android use native in-app purchases.",
    statusStarting: "Opening secure Pro checkout...",
    statusVerifying: "Checking Pro subscription...",
    statusConfirmed: "DateHeart Pro is active.",
    statusFailed: "Pro purchase could not be started. Try again.",
    statusUnavailable: "Payment is wired, but this store product is not live yet. Create and approve the Product IDs in App Store Connect or Play Console.",
    unlockRequired: "DateHeart Pro unlock required.",
    featureNoAds: "Ad-free included",
    featurePlanner: "Dateplanner",
    featureWeek: "Weekly plan",
    featureChallenges: "Date challenges",
    featureSync: "Shared favorites",
    featureFilters: "More planning modes",
    featurePacks: "Exclusive packs",
    toolsTitle: "Pro tools",
    tonightMode: "Tonight mode",
    weekPlan: "Build week",
    challenge: "New challenge",
    copyAiPlanner: "Copy Dateplanner",
    shareFavorites: "Share favorites",
    noAdsIncluded: "Pro removes ads while active.",
    outputCopied: "Copied",
  },
  "en-US": {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro removes ads and unlocks the full planning layer for couples.",
    plusIntro: "Pro includes ad-free use, Dateplanner, weekly plans, date challenges, shared favorites and exclusive idea packs.",
    monthly: "Monthly",
    yearly: "Yearly",
    monthSuffix: "/ month",
    yearSuffix: "/ year",
    subscribeMonthly: "Start monthly",
    subscribeYearly: "Start yearly",
    active: "Pro active",
    nativeBilling: "In-app purchase via the App Store or Google Play.",
    nativeNoAdsBilling: "One-time in-app purchase via the App Store or Google Play.",
    statusNote: "Web checkout uses Stripe. iOS and Android use native in-app purchases.",
    statusStarting: "Opening secure Pro checkout...",
    statusVerifying: "Checking Pro subscription...",
    statusConfirmed: "DateHeart Pro is active.",
    statusFailed: "Pro purchase could not be started. Try again.",
    statusUnavailable: "Payment is wired, but this store product is not live yet. Create and approve the Product IDs in App Store Connect or Play Console.",
    unlockRequired: "DateHeart Pro unlock required.",
    featureNoAds: "Ad-free included",
    featurePlanner: "Dateplanner",
    featureWeek: "Weekly plan",
    featureChallenges: "Date challenges",
    featureSync: "Shared favorites",
    featureFilters: "More planning modes",
    featurePacks: "Exclusive packs",
    toolsTitle: "Pro tools",
    tonightMode: "Tonight mode",
    weekPlan: "Build week",
    challenge: "New challenge",
    copyAiPlanner: "Copy Dateplanner",
    shareFavorites: "Share favorites",
    noAdsIncluded: "Pro removes ads while active.",
    outputCopied: "Copied",
  },
  de: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro entfernt Werbung und schaltet die volle Planungsebene für Paare frei.",
    plusIntro: "Pro enthält Werbefreiheit, Dateplanner, Wochenpläne, Date-Challenges, gemeinsame Favoriten und exklusive Ideenpakete.",
    monthly: "Monatlich",
    yearly: "Jährlich",
    monthSuffix: "/ Monat",
    yearSuffix: "/ Jahr",
    subscribeMonthly: "Monatlich starten",
    subscribeYearly: "Jährlich starten",
    active: "Pro aktiv",
    nativeBilling: "In-App-Kauf über App Store oder Google Play.",
    nativeNoAdsBilling: "Einmaliger In-App-Kauf über App Store oder Google Play.",
    statusNote: "Web-Checkout läuft über Stripe. iOS und Android nutzen native In-App-Käufe.",
    statusStarting: "Sicherer Pro-Kauf wird geöffnet...",
    statusVerifying: "Pro-Abo wird geprüft...",
    statusConfirmed: "DateHeart Pro ist aktiv.",
    statusFailed: "Pro-Kauf konnte nicht gestartet werden. Bitte erneut versuchen.",
    statusUnavailable: "Zahlung ist eingebaut, aber dieses Store-Produkt ist noch nicht live. Lege die Product IDs in App Store Connect oder Play Console an und gib sie frei.",
    unlockRequired: "DateHeart Pro muss freigeschaltet sein.",
    featureNoAds: "Werbefrei inklusive",
    featurePlanner: "Dateplanner",
    featureWeek: "Wochenplan",
    featureChallenges: "Date-Challenges",
    featureSync: "Gemeinsame Favoriten",
    featureFilters: "Mehr Planungsmodi",
    featurePacks: "Exklusive Pakete",
    toolsTitle: "Pro-Tools",
    tonightMode: "Heute Abend",
    weekPlan: "Woche bauen",
    challenge: "Neue Challenge",
    copyAiPlanner: "Dateplanner kopieren",
    shareFavorites: "Favoriten teilen",
    noAdsIncluded: "Pro entfernt Werbung, solange es aktiv ist.",
    outputCopied: "Kopiert",
  },
  pl: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro usuwa reklamy i odblokowuje pełną warstwę planowania dla par.",
    plusIntro: "Pro obejmuje korzystanie bez reklam, Dateplanner, plany tygodniowe, wyzwania randkowe, wspólne ulubione i ekskluzywne pakiety pomysłów.",
    monthly: "Miesięcznie",
    yearly: "Rocznie",
    monthSuffix: "/ miesiąc",
    yearSuffix: "/ rok",
    subscribeMonthly: "Zacznij miesięcznie",
    subscribeYearly: "Zacznij rocznie",
    active: "Pro aktywne",
    nativeBilling: "Zakup w aplikacji przez App Store albo Google Play.",
    nativeNoAdsBilling: "Jednorazowy zakup w aplikacji przez App Store albo Google Play.",
    statusNote: "Płatność w przeglądarce działa przez Stripe. iOS i Android używają zakupów w aplikacji.",
    statusStarting: "Otwieranie bezpiecznego zakupu Pro...",
    statusVerifying: "Sprawdzanie subskrypcji Pro...",
    statusConfirmed: "DateHeart Pro jest aktywne.",
    statusFailed: "Nie udało się rozpocząć zakupu Pro. Spróbuj ponownie.",
    statusUnavailable: "Płatność jest podłączona, ale ten produkt sklepu nie jest jeszcze aktywny. Utwórz i zatwierdź Product ID w App Store Connect albo Play Console.",
    unlockRequired: "Wymagane odblokowanie DateHeart Pro.",
    featureNoAds: "Bez reklam w pakiecie",
    featurePlanner: "Dateplanner",
    featureWeek: "Plan tygodnia",
    featureChallenges: "Wyzwania randkowe",
    featureSync: "Wspólne ulubione",
    featureFilters: "Więcej trybów planowania",
    featurePacks: "Ekskluzywne pakiety",
    toolsTitle: "Narzędzia Pro",
    tonightMode: "Tryb na dziś",
    weekPlan: "Ułóż tydzień",
    challenge: "Nowe wyzwanie",
    copyAiPlanner: "Kopiuj Dateplanner",
    shareFavorites: "Udostępnij ulubione",
    noAdsIncluded: "Pro usuwa reklamy, gdy jest aktywne.",
    outputCopied: "Skopiowano",
  },
  es: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro elimina los anuncios y desbloquea toda la capa de planificación para parejas.",
    plusIntro: "Pro incluye uso sin anuncios, Dateplanner, planes semanales, retos de citas, favoritos compartidos y paquetes exclusivos de ideas.",
    monthly: "Mensual",
    yearly: "Anual",
    monthSuffix: "/ mes",
    yearSuffix: "/ año",
    subscribeMonthly: "Empezar mensual",
    subscribeYearly: "Empezar anual",
    active: "Pro activo",
    nativeBilling: "Compra dentro de la app mediante App Store o Google Play.",
    nativeNoAdsBilling: "Compra única dentro de la app mediante App Store o Google Play.",
    statusNote: "El pago web usa Stripe. iOS y Android usan compras dentro de la app.",
    statusStarting: "Abriendo compra Pro segura...",
    statusVerifying: "Comprobando suscripción Pro...",
    statusConfirmed: "DateHeart Pro está activo.",
    statusFailed: "No se pudo iniciar la compra Pro. Inténtalo de nuevo.",
    statusUnavailable: "El pago está conectado, pero este producto de la tienda aún no está publicado. Crea y aprueba los Product ID en App Store Connect o Play Console.",
    unlockRequired: "Se requiere desbloquear DateHeart Pro.",
    featureNoAds: "Sin anuncios incluido",
    featurePlanner: "Dateplanner",
    featureWeek: "Plan semanal",
    featureChallenges: "Retos de citas",
    featureSync: "Favoritos compartidos",
    featureFilters: "Más modos de planificación",
    featurePacks: "Paquetes exclusivos",
    toolsTitle: "Herramientas Pro",
    tonightMode: "Modo de hoy",
    weekPlan: "Crear semana",
    challenge: "Nuevo reto",
    copyAiPlanner: "Copiar Dateplanner",
    shareFavorites: "Compartir favoritos",
    noAdsIncluded: "Pro elimina los anuncios mientras esté activo.",
    outputCopied: "Copiado",
  },
  fr: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro supprime les publicités et débloque toute la couche de planification pour les couples.",
    plusIntro: "Pro inclut l'utilisation sans publicité, Dateplanner, les plans hebdomadaires, les défis de rendez-vous, les favoris partagés et des packs d'idées exclusifs.",
    monthly: "Mensuel",
    yearly: "Annuel",
    monthSuffix: "/ mois",
    yearSuffix: "/ an",
    subscribeMonthly: "Commencer mensuel",
    subscribeYearly: "Commencer annuel",
    active: "Pro actif",
    nativeBilling: "Achat intégré via l'App Store ou Google Play.",
    nativeNoAdsBilling: "Achat intégré unique via l'App Store ou Google Play.",
    statusNote: "Le paiement web utilise Stripe. iOS et Android utilisent les achats intégrés.",
    statusStarting: "Ouverture de l'achat Pro sécurisé...",
    statusVerifying: "Vérification de l'abonnement Pro...",
    statusConfirmed: "DateHeart Pro est actif.",
    statusFailed: "L'achat Pro n'a pas pu démarrer. Réessayez.",
    statusUnavailable: "Le paiement est connecté, mais ce produit de boutique n'est pas encore publié. Créez et approuvez les Product ID dans App Store Connect ou Play Console.",
    unlockRequired: "Déblocage DateHeart Pro requis.",
    featureNoAds: "Sans publicité inclus",
    featurePlanner: "Dateplanner",
    featureWeek: "Plan hebdomadaire",
    featureChallenges: "Défis de rendez-vous",
    featureSync: "Favoris partagés",
    featureFilters: "Plus de modes de planification",
    featurePacks: "Packs exclusifs",
    toolsTitle: "Outils Pro",
    tonightMode: "Mode ce soir",
    weekPlan: "Construire la semaine",
    challenge: "Nouveau défi",
    copyAiPlanner: "Copier Dateplanner",
    shareFavorites: "Partager les favoris",
    noAdsIncluded: "Pro supprime les publicités tant qu'il est actif.",
    outputCopied: "Copié",
  },
  it: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro rimuove gli annunci e sblocca l'intero livello di pianificazione per le coppie.",
    plusIntro: "Pro include uso senza annunci, Dateplanner, piani settimanali, sfide per appuntamenti, preferiti condivisi e pacchetti di idee esclusivi.",
    monthly: "Mensile",
    yearly: "Annuale",
    monthSuffix: "/ mese",
    yearSuffix: "/ anno",
    subscribeMonthly: "Inizia mensile",
    subscribeYearly: "Inizia annuale",
    active: "Pro attivo",
    nativeBilling: "Acquisto in-app tramite App Store o Google Play.",
    nativeNoAdsBilling: "Acquisto in-app una tantum tramite App Store o Google Play.",
    statusNote: "Il pagamento web usa Stripe. iOS e Android usano acquisti in-app.",
    statusStarting: "Apertura acquisto Pro sicuro...",
    statusVerifying: "Verifica abbonamento Pro...",
    statusConfirmed: "DateHeart Pro è attivo.",
    statusFailed: "Impossibile avviare l'acquisto Pro. Riprova.",
    statusUnavailable: "Il pagamento è collegato, ma questo prodotto dello store non è ancora pubblicato. Crea e approva i Product ID in App Store Connect o Play Console.",
    unlockRequired: "È richiesto DateHeart Pro.",
    featureNoAds: "Senza annunci incluso",
    featurePlanner: "Dateplanner",
    featureWeek: "Piano settimanale",
    featureChallenges: "Sfide per appuntamenti",
    featureSync: "Preferiti condivisi",
    featureFilters: "Più modalità di pianificazione",
    featurePacks: "Pacchetti esclusivi",
    toolsTitle: "Strumenti Pro",
    tonightMode: "Modalità stasera",
    weekPlan: "Crea settimana",
    challenge: "Nuova sfida",
    copyAiPlanner: "Copia Dateplanner",
    shareFavorites: "Condividi preferiti",
    noAdsIncluded: "Pro rimuove gli annunci finché è attivo.",
    outputCopied: "Copiato",
  },
  pt: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "O Pro remove anúncios e desbloqueia toda a camada de planeamento para casais.",
    plusIntro: "O Pro inclui uso sem anúncios, Dateplanner, planos semanais, desafios de encontro, favoritos partilhados e pacotes exclusivos de ideias.",
    monthly: "Mensal",
    yearly: "Anual",
    monthSuffix: "/ mês",
    yearSuffix: "/ ano",
    subscribeMonthly: "Começar mensal",
    subscribeYearly: "Começar anual",
    active: "Pro ativo",
    nativeBilling: "Compra na app através da App Store ou Google Play.",
    nativeNoAdsBilling: "Compra única na app através da App Store ou Google Play.",
    statusNote: "O pagamento web usa Stripe. iOS e Android usam compras na app.",
    statusStarting: "A abrir compra Pro segura...",
    statusVerifying: "A verificar subscrição Pro...",
    statusConfirmed: "DateHeart Pro está ativo.",
    statusFailed: "Não foi possível iniciar a compra Pro. Tenta novamente.",
    statusUnavailable: "O pagamento está ligado, mas este produto da loja ainda não está publicado. Cria e aprova os Product IDs no App Store Connect ou Play Console.",
    unlockRequired: "É preciso desbloquear DateHeart Pro.",
    featureNoAds: "Sem anúncios incluído",
    featurePlanner: "Dateplanner",
    featureWeek: "Plano semanal",
    featureChallenges: "Desafios de encontro",
    featureSync: "Favoritos partilhados",
    featureFilters: "Mais modos de planeamento",
    featurePacks: "Pacotes exclusivos",
    toolsTitle: "Ferramentas Pro",
    tonightMode: "Modo hoje",
    weekPlan: "Criar semana",
    challenge: "Novo desafio",
    copyAiPlanner: "Copiar Dateplanner",
    shareFavorites: "Partilhar favoritos",
    noAdsIncluded: "O Pro remove anúncios enquanto estiver ativo.",
    outputCopied: "Copiado",
  },
  hi: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro विज्ञापन हटाता है और कपल्स के लिए पूरा प्लानिंग लेयर खोलता है.",
    plusIntro: "Pro में विज्ञापन-मुक्त उपयोग, Dateplanner, साप्ताहिक योजनाएँ, डेट चुनौतियाँ, साझा पसंदीदा और विशेष आइडिया पैक शामिल हैं.",
    monthly: "मासिक",
    yearly: "वार्षिक",
    monthSuffix: "/ महीना",
    yearSuffix: "/ वर्ष",
    subscribeMonthly: "मासिक शुरू करें",
    subscribeYearly: "वार्षिक शुरू करें",
    active: "Pro सक्रिय",
    nativeBilling: "App Store या Google Play के जरिए इन-ऐप खरीदारी.",
    nativeNoAdsBilling: "App Store या Google Play के जरिए एक बार की इन-ऐप खरीदारी.",
    statusNote: "वेब checkout Stripe इस्तेमाल करता है. iOS और Android इन-ऐप खरीदारी इस्तेमाल करते हैं.",
    statusStarting: "सुरक्षित Pro खरीद खुल रही है...",
    statusVerifying: "Pro सदस्यता जाँची जा रही है...",
    statusConfirmed: "DateHeart Pro सक्रिय है.",
    statusFailed: "Pro खरीद शुरू नहीं हो सकी. फिर कोशिश करें.",
    statusUnavailable: "भुगतान जुड़ा है, लेकिन यह स्टोर उत्पाद अभी लाइव नहीं है. App Store Connect या Play Console में Product ID बनाकर मंजूर करें.",
    unlockRequired: "DateHeart Pro अनलॉक ज़रूरी है.",
    featureNoAds: "विज्ञापन-मुक्त शामिल",
    featurePlanner: "Dateplanner",
    featureWeek: "साप्ताहिक योजना",
    featureChallenges: "डेट चुनौतियाँ",
    featureSync: "साझा पसंदीदा",
    featureFilters: "और प्लानिंग मोड",
    featurePacks: "विशेष पैक",
    toolsTitle: "Pro टूल्स",
    tonightMode: "आज रात मोड",
    weekPlan: "सप्ताह बनाएँ",
    challenge: "नई चुनौती",
    copyAiPlanner: "Dateplanner कॉपी करें",
    shareFavorites: "पसंदीदा साझा करें",
    noAdsIncluded: "Pro सक्रिय रहने पर विज्ञापन हटाता है.",
    outputCopied: "कॉपी हो गया",
  },
  ar: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "يزيل Pro الإعلانات ويفتح طبقة التخطيط الكاملة للأزواج.",
    plusIntro: "يتضمن Pro استخدامًا بلا إعلانات وDateplanner وخططًا أسبوعية وتحديات مواعيد ومفضلات مشتركة وحزم أفكار حصرية.",
    monthly: "شهري",
    yearly: "سنوي",
    monthSuffix: "/ شهر",
    yearSuffix: "/ سنة",
    subscribeMonthly: "ابدأ شهريًا",
    subscribeYearly: "ابدأ سنويًا",
    active: "Pro نشط",
    nativeBilling: "شراء داخل التطبيق عبر App Store أو Google Play.",
    nativeNoAdsBilling: "شراء لمرة واحدة داخل التطبيق عبر App Store أو Google Play.",
    statusNote: "يستخدم الدفع على الويب Stripe. يستخدم iOS وAndroid الشراء داخل التطبيق.",
    statusStarting: "جار فتح شراء Pro الآمن...",
    statusVerifying: "جار التحقق من اشتراك Pro...",
    statusConfirmed: "DateHeart Pro نشط.",
    statusFailed: "تعذر بدء شراء Pro. حاول مرة أخرى.",
    statusUnavailable: "الدفع متصل، لكن منتج المتجر هذا غير منشور بعد. أنشئ Product ID واعتمده في App Store Connect أو Play Console.",
    unlockRequired: "يلزم فتح DateHeart Pro.",
    featureNoAds: "بلا إعلانات ضمن Pro",
    featurePlanner: "Dateplanner",
    featureWeek: "خطة أسبوعية",
    featureChallenges: "تحديات مواعيد",
    featureSync: "مفضلات مشتركة",
    featureFilters: "المزيد من أوضاع التخطيط",
    featurePacks: "حزم حصرية",
    toolsTitle: "أدوات Pro",
    tonightMode: "وضع الليلة",
    weekPlan: "بناء الأسبوع",
    challenge: "تحد جديد",
    copyAiPlanner: "نسخ Dateplanner",
    shareFavorites: "مشاركة المفضلات",
    noAdsIncluded: "يزيل Pro الإعلانات ما دام نشطًا.",
    outputCopied: "تم النسخ",
  },
  ja: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Proは広告を削除し、カップル向けの全プランニング機能を解除します。",
    plusIntro: "Proには広告なし利用、Dateplanner、週間プラン、デートチャレンジ、共有お気に入り、限定アイデアパックが含まれます。",
    monthly: "月額",
    yearly: "年額",
    monthSuffix: "/ 月",
    yearSuffix: "/ 年",
    subscribeMonthly: "月額で始める",
    subscribeYearly: "年額で始める",
    active: "Pro有効",
    nativeBilling: "App StoreまたはGoogle Playでのアプリ内購入です。",
    nativeNoAdsBilling: "App StoreまたはGoogle Playでの1回限りのアプリ内購入です。",
    statusNote: "Web決済はStripeを使用します。iOSとAndroidはアプリ内購入を使用します。",
    statusStarting: "安全なPro購入を開いています...",
    statusVerifying: "Proサブスクリプションを確認しています...",
    statusConfirmed: "DateHeart Proは有効です。",
    statusFailed: "Pro購入を開始できませんでした。もう一度お試しください。",
    statusUnavailable: "決済は接続済みですが、このストア商品はまだ公開されていません。App Store ConnectまたはPlay ConsoleでProduct IDを作成して承認してください。",
    unlockRequired: "DateHeart Proの解除が必要です。",
    featureNoAds: "広告なしを含む",
    featurePlanner: "Dateplanner",
    featureWeek: "週間プラン",
    featureChallenges: "デートチャレンジ",
    featureSync: "共有お気に入り",
    featureFilters: "追加プランニングモード",
    featurePacks: "限定パック",
    toolsTitle: "Proツール",
    tonightMode: "今夜モード",
    weekPlan: "週を作成",
    challenge: "新しいチャレンジ",
    copyAiPlanner: "Dateplannerをコピー",
    shareFavorites: "お気に入りを共有",
    noAdsIncluded: "Proが有効な間は広告が削除されます。",
    outputCopied: "コピー済み",
  },
  zh: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro 会移除广告，并为情侣解锁完整规划层。",
    plusIntro: "Pro 包含无广告使用、Dateplanner、每周计划、约会挑战、共享收藏和独家想法包。",
    monthly: "每月",
    yearly: "每年",
    monthSuffix: "/ 月",
    yearSuffix: "/ 年",
    subscribeMonthly: "开始月付",
    subscribeYearly: "开始年付",
    active: "Pro 已激活",
    nativeBilling: "通过 App Store 或 Google Play 进行应用内购买。",
    nativeNoAdsBilling: "通过 App Store 或 Google Play 进行一次性应用内购买。",
    statusNote: "网页结账使用 Stripe。iOS 和 Android 使用应用内购买。",
    statusStarting: "正在打开安全 Pro 购买...",
    statusVerifying: "正在检查 Pro 订阅...",
    statusConfirmed: "DateHeart Pro 已激活。",
    statusFailed: "无法开始 Pro 购买。请重试。",
    statusUnavailable: "付款已连接，但此商店商品尚未上线。请在 App Store Connect 或 Play Console 创建并批准 Product ID。",
    unlockRequired: "需要解锁 DateHeart Pro。",
    featureNoAds: "包含无广告",
    featurePlanner: "Dateplanner",
    featureWeek: "每周计划",
    featureChallenges: "约会挑战",
    featureSync: "共享收藏",
    featureFilters: "更多规划模式",
    featurePacks: "独家包",
    toolsTitle: "Pro 工具",
    tonightMode: "今晚模式",
    weekPlan: "创建一周",
    challenge: "新挑战",
    copyAiPlanner: "复制 Dateplanner",
    shareFavorites: "分享收藏",
    noAdsIncluded: "Pro 激活期间会移除广告。",
    outputCopied: "已复制",
  },
  ru: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro убирает рекламу и открывает полный слой планирования для пар.",
    plusIntro: "Pro включает использование без рекламы, Dateplanner, недельные планы, задания для свиданий, общие избранные идеи и эксклюзивные пакеты идей.",
    monthly: "Ежемесячно",
    yearly: "Ежегодно",
    monthSuffix: "/ месяц",
    yearSuffix: "/ год",
    subscribeMonthly: "Начать помесячно",
    subscribeYearly: "Начать на год",
    active: "Pro активно",
    nativeBilling: "Покупка в приложении через App Store или Google Play.",
    nativeNoAdsBilling: "Разовая покупка в приложении через App Store или Google Play.",
    statusNote: "Веб-оплата использует Stripe. iOS и Android используют покупки в приложении.",
    statusStarting: "Открываем безопасную покупку Pro...",
    statusVerifying: "Проверяем подписку Pro...",
    statusConfirmed: "DateHeart Pro активно.",
    statusFailed: "Не удалось начать покупку Pro. Попробуйте снова.",
    statusUnavailable: "Оплата подключена, но этот магазинный продукт еще не опубликован. Создайте и одобрите Product ID в App Store Connect или Play Console.",
    unlockRequired: "Требуется разблокировать DateHeart Pro.",
    featureNoAds: "Без рекламы включено",
    featurePlanner: "Dateplanner",
    featureWeek: "Недельный план",
    featureChallenges: "Задания для свиданий",
    featureSync: "Общие избранные",
    featureFilters: "Больше режимов планирования",
    featurePacks: "Эксклюзивные пакеты",
    toolsTitle: "Инструменты Pro",
    tonightMode: "Режим на сегодня",
    weekPlan: "Собрать неделю",
    challenge: "Новое задание",
    copyAiPlanner: "Скопировать Dateplanner",
    shareFavorites: "Поделиться избранным",
    noAdsIncluded: "Pro убирает рекламу, пока активно.",
    outputCopied: "Скопировано",
  },
  ko: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro는 광고를 제거하고 커플을 위한 전체 계획 기능을 엽니다.",
    plusIntro: "Pro에는 광고 없는 사용, Dateplanner, 주간 계획, 데이트 챌린지, 공유 즐겨찾기, 독점 아이디어 팩이 포함됩니다.",
    monthly: "월간",
    yearly: "연간",
    monthSuffix: "/ 월",
    yearSuffix: "/ 년",
    subscribeMonthly: "월간 시작",
    subscribeYearly: "연간 시작",
    active: "Pro 활성",
    nativeBilling: "App Store 또는 Google Play를 통한 인앱 구매입니다.",
    nativeNoAdsBilling: "App Store 또는 Google Play를 통한 1회 인앱 구매입니다.",
    statusNote: "웹 결제는 Stripe를 사용합니다. iOS와 Android는 인앱 구매를 사용합니다.",
    statusStarting: "안전한 Pro 구매를 여는 중...",
    statusVerifying: "Pro 구독 확인 중...",
    statusConfirmed: "DateHeart Pro가 활성화되었습니다.",
    statusFailed: "Pro 구매를 시작할 수 없습니다. 다시 시도하세요.",
    statusUnavailable: "결제는 연결되었지만 이 스토어 상품은 아직 출시되지 않았습니다. App Store Connect 또는 Play Console에서 Product ID를 만들고 승인하세요.",
    unlockRequired: "DateHeart Pro 잠금 해제가 필요합니다.",
    featureNoAds: "광고 없음 포함",
    featurePlanner: "Dateplanner",
    featureWeek: "주간 계획",
    featureChallenges: "데이트 챌린지",
    featureSync: "공유 즐겨찾기",
    featureFilters: "더 많은 계획 모드",
    featurePacks: "독점 팩",
    toolsTitle: "Pro 도구",
    tonightMode: "오늘 밤 모드",
    weekPlan: "한 주 만들기",
    challenge: "새 챌린지",
    copyAiPlanner: "Dateplanner 복사",
    shareFavorites: "즐겨찾기 공유",
    noAdsIncluded: "Pro가 활성화된 동안 광고가 제거됩니다.",
    outputCopied: "복사됨",
  },
  tr: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro reklamları kaldırır ve çiftler için tam planlama katmanını açar.",
    plusIntro: "Pro reklamsız kullanım, Dateplanner, haftalık planlar, randevu görevleri, ortak favoriler ve özel fikir paketleri içerir.",
    monthly: "Aylık",
    yearly: "Yıllık",
    monthSuffix: "/ ay",
    yearSuffix: "/ yıl",
    subscribeMonthly: "Aylık başlat",
    subscribeYearly: "Yıllık başlat",
    active: "Pro aktif",
    nativeBilling: "App Store veya Google Play üzerinden uygulama içi satın alma.",
    nativeNoAdsBilling: "App Store veya Google Play üzerinden tek seferlik uygulama içi satın alma.",
    statusNote: "Web ödemesi Stripe kullanır. iOS ve Android uygulama içi satın alma kullanır.",
    statusStarting: "Güvenli Pro satın alma açılıyor...",
    statusVerifying: "Pro aboneliği kontrol ediliyor...",
    statusConfirmed: "DateHeart Pro aktif.",
    statusFailed: "Pro satın alma başlatılamadı. Tekrar deneyin.",
    statusUnavailable: "Ödeme bağlı, ancak bu mağaza ürünü henüz yayında değil. App Store Connect veya Play Console'da Product ID oluşturup onaylayın.",
    unlockRequired: "DateHeart Pro kilidini açmak gerekir.",
    featureNoAds: "Reklamsız kullanım dahil",
    featurePlanner: "Dateplanner",
    featureWeek: "Haftalık plan",
    featureChallenges: "Randevu görevleri",
    featureSync: "Ortak favoriler",
    featureFilters: "Daha fazla planlama modu",
    featurePacks: "Özel paketler",
    toolsTitle: "Pro araçları",
    tonightMode: "Bu gece modu",
    weekPlan: "Hafta oluştur",
    challenge: "Yeni görev",
    copyAiPlanner: "Dateplanner kopyala",
    shareFavorites: "Favorileri paylaş",
    noAdsIncluded: "Pro aktifken reklamları kaldırır.",
    outputCopied: "Kopyalandı",
  },
  id: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro menghapus iklan dan membuka seluruh lapisan perencanaan untuk pasangan.",
    plusIntro: "Pro mencakup penggunaan tanpa iklan, Dateplanner, rencana mingguan, tantangan kencan, favorit bersama, dan paket ide eksklusif.",
    monthly: "Bulanan",
    yearly: "Tahunan",
    monthSuffix: "/ bulan",
    yearSuffix: "/ tahun",
    subscribeMonthly: "Mulai bulanan",
    subscribeYearly: "Mulai tahunan",
    active: "Pro aktif",
    nativeBilling: "Pembelian dalam aplikasi melalui App Store atau Google Play.",
    nativeNoAdsBilling: "Pembelian satu kali dalam aplikasi melalui App Store atau Google Play.",
    statusNote: "Checkout web memakai Stripe. iOS dan Android memakai pembelian dalam aplikasi.",
    statusStarting: "Membuka pembelian Pro aman...",
    statusVerifying: "Memeriksa langganan Pro...",
    statusConfirmed: "DateHeart Pro aktif.",
    statusFailed: "Pembelian Pro tidak bisa dimulai. Coba lagi.",
    statusUnavailable: "Pembayaran sudah tersambung, tetapi produk toko ini belum aktif. Buat dan setujui Product ID di App Store Connect atau Play Console.",
    unlockRequired: "DateHeart Pro perlu dibuka.",
    featureNoAds: "Tanpa iklan termasuk",
    featurePlanner: "Dateplanner",
    featureWeek: "Rencana mingguan",
    featureChallenges: "Tantangan kencan",
    featureSync: "Favorit bersama",
    featureFilters: "Mode perencanaan tambahan",
    featurePacks: "Paket eksklusif",
    toolsTitle: "Alat Pro",
    tonightMode: "Mode malam ini",
    weekPlan: "Buat minggu",
    challenge: "Tantangan baru",
    copyAiPlanner: "Salin Dateplanner",
    shareFavorites: "Bagikan favorit",
    noAdsIncluded: "Pro menghapus iklan selama aktif.",
    outputCopied: "Tersalin",
  },
  nl: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro verwijdert advertenties en ontgrendelt de volledige planningslaag voor koppels.",
    plusIntro: "Pro bevat advertentievrij gebruik, Dateplanner, weekplannen, date-uitdagingen, gedeelde favorieten en exclusieve ideeënpakketten.",
    monthly: "Maandelijks",
    yearly: "Jaarlijks",
    monthSuffix: "/ maand",
    yearSuffix: "/ jaar",
    subscribeMonthly: "Maandelijks starten",
    subscribeYearly: "Jaarlijks starten",
    active: "Pro actief",
    nativeBilling: "In-app aankoop via de App Store of Google Play.",
    nativeNoAdsBilling: "Eenmalige in-app aankoop via de App Store of Google Play.",
    statusNote: "Webbetaling gebruikt Stripe. iOS en Android gebruiken in-app aankopen.",
    statusStarting: "Veilige Pro-aankoop openen...",
    statusVerifying: "Pro-abonnement controleren...",
    statusConfirmed: "DateHeart Pro is actief.",
    statusFailed: "Pro-aankoop kon niet worden gestart. Probeer opnieuw.",
    statusUnavailable: "Betaling is gekoppeld, maar dit winkelproduct is nog niet live. Maak en keur de Product ID's goed in App Store Connect of Play Console.",
    unlockRequired: "DateHeart Pro moet worden ontgrendeld.",
    featureNoAds: "Advertentievrij inbegrepen",
    featurePlanner: "Dateplanner",
    featureWeek: "Weekplan",
    featureChallenges: "Date-uitdagingen",
    featureSync: "Gedeelde favorieten",
    featureFilters: "Meer planningsmodi",
    featurePacks: "Exclusieve pakketten",
    toolsTitle: "Pro-tools",
    tonightMode: "Vanavondmodus",
    weekPlan: "Week maken",
    challenge: "Nieuwe uitdaging",
    copyAiPlanner: "Dateplanner kopiëren",
    shareFavorites: "Favorieten delen",
    noAdsIncluded: "Pro verwijdert advertenties zolang het actief is.",
    outputCopied: "Gekopieerd",
  },
  sv: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro tar bort annonser och låser upp hela planeringslagret för par.",
    plusIntro: "Pro inkluderar annonsfri användning, Dateplanner, veckoplaner, dejtutmaningar, delade favoriter och exklusiva idépaket.",
    monthly: "Månadsvis",
    yearly: "Årsvis",
    monthSuffix: "/ månad",
    yearSuffix: "/ år",
    subscribeMonthly: "Starta månadsvis",
    subscribeYearly: "Starta årsvis",
    active: "Pro aktiv",
    nativeBilling: "Köp i appen via App Store eller Google Play.",
    nativeNoAdsBilling: "Engångsköp i appen via App Store eller Google Play.",
    statusNote: "Webbetalning använder Stripe. iOS och Android använder köp i appen.",
    statusStarting: "Öppnar säkert Pro-köp...",
    statusVerifying: "Kontrollerar Pro-prenumeration...",
    statusConfirmed: "DateHeart Pro är aktivt.",
    statusFailed: "Pro-köpet kunde inte startas. Försök igen.",
    statusUnavailable: "Betalning är ansluten, men denna butiksprodukt är inte live än. Skapa och godkänn Product ID:n i App Store Connect eller Play Console.",
    unlockRequired: "DateHeart Pro måste låsas upp.",
    featureNoAds: "Annonsfritt ingår",
    featurePlanner: "Dateplanner",
    featureWeek: "Veckoplan",
    featureChallenges: "Dejtutmaningar",
    featureSync: "Delade favoriter",
    featureFilters: "Fler planeringslägen",
    featurePacks: "Exklusiva paket",
    toolsTitle: "Pro-verktyg",
    tonightMode: "Ikvällsläge",
    weekPlan: "Bygg vecka",
    challenge: "Ny utmaning",
    copyAiPlanner: "Kopiera Dateplanner",
    shareFavorites: "Dela favoriter",
    noAdsIncluded: "Pro tar bort annonser medan det är aktivt.",
    outputCopied: "Kopierad",
  },
  cs: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro odstraní reklamy a odemkne celou plánovací vrstvu pro páry.",
    plusIntro: "Pro zahrnuje používání bez reklam, Dateplanner, týdenní plány, rande výzvy, sdílené oblíbené a exkluzivní balíčky nápadů.",
    monthly: "Měsíčně",
    yearly: "Ročně",
    monthSuffix: "/ měsíc",
    yearSuffix: "/ rok",
    subscribeMonthly: "Začít měsíčně",
    subscribeYearly: "Začít ročně",
    active: "Pro aktivní",
    nativeBilling: "Nákup v aplikaci přes App Store nebo Google Play.",
    nativeNoAdsBilling: "Jednorázový nákup v aplikaci přes App Store nebo Google Play.",
    statusNote: "Webová platba používá Stripe. iOS a Android používají nákupy v aplikaci.",
    statusStarting: "Otevírá se bezpečný nákup Pro...",
    statusVerifying: "Kontrolujeme předplatné Pro...",
    statusConfirmed: "DateHeart Pro je aktivní.",
    statusFailed: "Nákup Pro se nepodařilo spustit. Zkuste to znovu.",
    statusUnavailable: "Platba je zapojená, ale tento produkt obchodu ještě není aktivní. Vytvořte a schvalte Product ID v App Store Connect nebo Play Console.",
    unlockRequired: "Je nutné odemknout DateHeart Pro.",
    featureNoAds: "Bez reklam v ceně",
    featurePlanner: "Dateplanner",
    featureWeek: "Týdenní plán",
    featureChallenges: "Rande výzvy",
    featureSync: "Sdílené oblíbené",
    featureFilters: "Více plánovacích režimů",
    featurePacks: "Exkluzivní balíčky",
    toolsTitle: "Nástroje Pro",
    tonightMode: "Režim na dnešek",
    weekPlan: "Sestavit týden",
    challenge: "Nová výzva",
    copyAiPlanner: "Kopírovat Dateplanner",
    shareFavorites: "Sdílet oblíbené",
    noAdsIncluded: "Pro odstraňuje reklamy, dokud je aktivní.",
    outputCopied: "Zkopírováno",
  },
  uk: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro прибирає рекламу й відкриває повний рівень планування для пар.",
    plusIntro: "Pro містить використання без реклами, Dateplanner, тижневі плани, виклики для побачень, спільне обране та ексклюзивні пакети ідей.",
    monthly: "Щомісяця",
    yearly: "Щороку",
    monthSuffix: "/ місяць",
    yearSuffix: "/ рік",
    subscribeMonthly: "Почати щомісяця",
    subscribeYearly: "Почати щороку",
    active: "Pro активний",
    nativeBilling: "Покупка в застосунку через App Store або Google Play.",
    nativeNoAdsBilling: "Одноразова покупка в застосунку через App Store або Google Play.",
    statusNote: "Веб-оплата використовує Stripe. iOS і Android використовують покупки в застосунку.",
    statusStarting: "Відкриваємо безпечну покупку Pro...",
    statusVerifying: "Перевіряємо підписку Pro...",
    statusConfirmed: "DateHeart Pro активний.",
    statusFailed: "Не вдалося почати покупку Pro. Спробуйте ще раз.",
    statusUnavailable: "Оплату підключено, але цей продукт магазину ще не опубліковано. Створіть і затвердьте Product ID в App Store Connect або Play Console.",
    unlockRequired: "Потрібно розблокувати DateHeart Pro.",
    featureNoAds: "Без реклами включено",
    featurePlanner: "Dateplanner",
    featureWeek: "Тижневий план",
    featureChallenges: "Виклики для побачень",
    featureSync: "Спільне обране",
    featureFilters: "Більше режимів планування",
    featurePacks: "Ексклюзивні пакети",
    toolsTitle: "Інструменти Pro",
    tonightMode: "Режим на сьогодні",
    weekPlan: "Скласти тиждень",
    challenge: "Новий виклик",
    copyAiPlanner: "Копіювати Dateplanner",
    shareFavorites: "Поділитися обраним",
    noAdsIncluded: "Pro прибирає рекламу, доки активний.",
    outputCopied: "Скопійовано",
  },
  vi: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro gỡ quảng cáo và mở toàn bộ lớp lập kế hoạch cho các cặp đôi.",
    plusIntro: "Pro bao gồm dùng không quảng cáo, Dateplanner, kế hoạch tuần, thử thách hẹn hò, mục yêu thích chung và gói ý tưởng độc quyền.",
    monthly: "Hằng tháng",
    yearly: "Hằng năm",
    monthSuffix: "/ tháng",
    yearSuffix: "/ năm",
    subscribeMonthly: "Bắt đầu hằng tháng",
    subscribeYearly: "Bắt đầu hằng năm",
    active: "Pro đang hoạt động",
    nativeBilling: "Mua trong ứng dụng qua App Store hoặc Google Play.",
    nativeNoAdsBilling: "Mua một lần trong ứng dụng qua App Store hoặc Google Play.",
    statusNote: "Thanh toán web dùng Stripe. iOS và Android dùng mua trong ứng dụng.",
    statusStarting: "Đang mở mua Pro an toàn...",
    statusVerifying: "Đang kiểm tra đăng ký Pro...",
    statusConfirmed: "DateHeart Pro đang hoạt động.",
    statusFailed: "Không thể bắt đầu mua Pro. Hãy thử lại.",
    statusUnavailable: "Thanh toán đã được nối, nhưng sản phẩm cửa hàng này chưa được phát hành. Tạo và duyệt Product ID trong App Store Connect hoặc Play Console.",
    unlockRequired: "Cần mở khóa DateHeart Pro.",
    featureNoAds: "Bao gồm không quảng cáo",
    featurePlanner: "Dateplanner",
    featureWeek: "Kế hoạch tuần",
    featureChallenges: "Thử thách hẹn hò",
    featureSync: "Yêu thích chung",
    featureFilters: "Thêm chế độ lập kế hoạch",
    featurePacks: "Gói độc quyền",
    toolsTitle: "Công cụ Pro",
    tonightMode: "Chế độ tối nay",
    weekPlan: "Tạo tuần",
    challenge: "Thử thách mới",
    copyAiPlanner: "Sao chép Dateplanner",
    shareFavorites: "Chia sẻ yêu thích",
    noAdsIncluded: "Pro gỡ quảng cáo khi đang hoạt động.",
    outputCopied: "Đã sao chép",
  },
  th: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro ลบโฆษณาและปลดล็อกชั้นการวางแผนครบชุดสำหรับคู่รัก",
    plusIntro: "Pro รวมการใช้งานแบบไม่มีโฆษณา Dateplanner แผนรายสัปดาห์ ความท้าทายเดต รายการโปรดร่วมกัน และแพ็กไอเดียพิเศษ",
    monthly: "รายเดือน",
    yearly: "รายปี",
    monthSuffix: "/ เดือน",
    yearSuffix: "/ ปี",
    subscribeMonthly: "เริ่มรายเดือน",
    subscribeYearly: "เริ่มรายปี",
    active: "Pro เปิดใช้งาน",
    nativeBilling: "ซื้อในแอปผ่าน App Store หรือ Google Play",
    nativeNoAdsBilling: "ซื้อในแอปครั้งเดียวผ่าน App Store หรือ Google Play",
    statusNote: "การชำระเงินบนเว็บใช้ Stripe ส่วน iOS และ Android ใช้การซื้อในแอป",
    statusStarting: "กำลังเปิดการซื้อ Pro ที่ปลอดภัย...",
    statusVerifying: "กำลังตรวจสอบการสมัคร Pro...",
    statusConfirmed: "DateHeart Pro เปิดใช้งานแล้ว",
    statusFailed: "เริ่มการซื้อ Pro ไม่ได้ โปรดลองอีกครั้ง",
    statusUnavailable: "เชื่อมต่อการชำระเงินแล้ว แต่สินค้านี้ยังไม่เผยแพร่ สร้างและอนุมัติ Product ID ใน App Store Connect หรือ Play Console",
    unlockRequired: "ต้องปลดล็อก DateHeart Pro",
    featureNoAds: "รวมแบบไม่มีโฆษณา",
    featurePlanner: "Dateplanner",
    featureWeek: "แผนรายสัปดาห์",
    featureChallenges: "ความท้าทายเดต",
    featureSync: "รายการโปรดร่วมกัน",
    featureFilters: "โหมดวางแผนเพิ่มเติม",
    featurePacks: "แพ็กพิเศษ",
    toolsTitle: "เครื่องมือ Pro",
    tonightMode: "โหมดคืนนี้",
    weekPlan: "สร้างสัปดาห์",
    challenge: "ความท้าทายใหม่",
    copyAiPlanner: "คัดลอก Dateplanner",
    shareFavorites: "แชร์รายการโปรด",
    noAdsIncluded: "Pro ลบโฆษณาขณะเปิดใช้งาน",
    outputCopied: "คัดลอกแล้ว",
  },
  da: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro fjerner reklamer og låser hele planlægningslaget op for par.",
    plusIntro: "Pro inkluderer reklamefri brug, Dateplanner, ugeplaner, dateudfordringer, delte favoritter og eksklusive idépakker.",
    monthly: "Månedligt",
    yearly: "Årligt",
    monthSuffix: "/ måned",
    yearSuffix: "/ år",
    subscribeMonthly: "Start månedligt",
    subscribeYearly: "Start årligt",
    active: "Pro aktiv",
    nativeBilling: "Køb i appen via App Store eller Google Play.",
    nativeNoAdsBilling: "Engangskøb i appen via App Store eller Google Play.",
    statusNote: "Webbetaling bruger Stripe. iOS og Android bruger køb i appen.",
    statusStarting: "Åbner sikkert Pro-køb...",
    statusVerifying: "Kontrollerer Pro-abonnement...",
    statusConfirmed: "DateHeart Pro er aktiv.",
    statusFailed: "Pro-købet kunne ikke startes. Prøv igen.",
    statusUnavailable: "Betaling er tilsluttet, men dette butiksprodukt er ikke live endnu. Opret og godkend Product IDs i App Store Connect eller Play Console.",
    unlockRequired: "DateHeart Pro skal låses op.",
    featureNoAds: "Reklamefri inkluderet",
    featurePlanner: "Dateplanner",
    featureWeek: "Ugeplan",
    featureChallenges: "Dateudfordringer",
    featureSync: "Delte favoritter",
    featureFilters: "Flere planlægningsmåder",
    featurePacks: "Eksklusive pakker",
    toolsTitle: "Pro-værktøjer",
    tonightMode: "I aften",
    weekPlan: "Byg uge",
    challenge: "Ny udfordring",
    copyAiPlanner: "Kopiér Dateplanner",
    shareFavorites: "Del favoritter",
    noAdsIncluded: "Pro fjerner reklamer, mens det er aktivt.",
    outputCopied: "Kopieret",
  },
  fi: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro poistaa mainokset ja avaa parien koko suunnittelukerroksen.",
    plusIntro: "Pro sisältää mainoksettoman käytön, treffisuunnittelijan, viikkosuunnitelmat, treffinhaasteet, jaetut suosikit ja erikoisideapaketit.",
    monthly: "Kuukausittain",
    yearly: "Vuosittain",
    monthSuffix: "/ kuukausi",
    yearSuffix: "/ vuosi",
    subscribeMonthly: "Aloita kuukausittain",
    subscribeYearly: "Aloita vuosittain",
    active: "Pro aktiivinen",
    nativeBilling: "Sovelluksen sisäinen osto App Storen tai Google Playn kautta.",
    nativeNoAdsBilling: "Kertaluonteinen sovelluksen sisäinen osto App Storen tai Google Playn kautta.",
    statusNote: "Verkkomaksu käyttää Stripeä. iOS ja Android käyttävät sovelluksen sisäisiä ostoja.",
    statusStarting: "Avataan turvallista Pro-maksua...",
    statusVerifying: "Tarkistetaan Pro-tilausta...",
    statusConfirmed: "DateHeart Pro on aktiivinen.",
    statusFailed: "Pro-ostoa ei voitu aloittaa. Yritä uudelleen.",
    statusUnavailable: "Maksu on kytketty, mutta tämä kauppatuote ei ole vielä julkaistu. Luo ja hyväksy Product ID:t App Store Connectissa tai Play Consolessa.",
    unlockRequired: "DateHeart Pro vaaditaan.",
    featureNoAds: "Mainokseton käyttö mukana",
    featurePlanner: "Treffisuunnittelija",
    featureWeek: "Viikkosuunnitelma",
    featureChallenges: "Treffinhaasteet",
    featureSync: "Jaetut suosikit",
    featureFilters: "Lisää suunnittelutiloja",
    featurePacks: "Erikoispaketit",
    toolsTitle: "Pro-työkalut",
    tonightMode: "Tämä ilta",
    weekPlan: "Rakenna viikko",
    challenge: "Uusi haaste",
    copyAiPlanner: "Kopioi treffisuunnittelija",
    shareFavorites: "Jaa suosikit",
    noAdsIncluded: "Pro poistaa mainokset, kun se on aktiivinen.",
    outputCopied: "Kopioitu",
  },
  ro: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro elimină reclamele și deblochează întregul nivel de planificare pentru cupluri.",
    plusIntro: "Pro include folosire fără reclame, planificator de întâlniri, planuri săptămânale, provocări de întâlnire, favorite partajate și pachete exclusive de idei.",
    monthly: "Lunar",
    yearly: "Anual",
    monthSuffix: "/ lună",
    yearSuffix: "/ an",
    subscribeMonthly: "Pornește lunar",
    subscribeYearly: "Pornește anual",
    active: "Pro activ",
    nativeBilling: "Achiziție în aplicație prin App Store sau Google Play.",
    nativeNoAdsBilling: "Achiziție unică în aplicație prin App Store sau Google Play.",
    statusNote: "Plata web folosește Stripe. iOS și Android folosesc achiziții în aplicație.",
    statusStarting: "Se deschide plata Pro sigură...",
    statusVerifying: "Se verifică abonamentul Pro...",
    statusConfirmed: "DateHeart Pro este activ.",
    statusFailed: "Achiziția Pro nu a putut fi pornită. Încearcă din nou.",
    statusUnavailable: "Plata este conectată, dar acest produs din magazin nu este încă live. Creează și aprobă Product IDs în App Store Connect sau Play Console.",
    unlockRequired: "Este necesar DateHeart Pro.",
    featureNoAds: "Fără reclame inclus",
    featurePlanner: "Planificator de întâlniri",
    featureWeek: "Plan săptămânal",
    featureChallenges: "Provocări de întâlnire",
    featureSync: "Favorite partajate",
    featureFilters: "Mai multe moduri de planificare",
    featurePacks: "Pachete exclusive",
    toolsTitle: "Instrumente Pro",
    tonightMode: "Modul de seară",
    weekPlan: "Construiește săptămâna",
    challenge: "Provocare nouă",
    copyAiPlanner: "Copiază planificatorul",
    shareFavorites: "Distribuie favorite",
    noAdsIncluded: "Pro elimină reclamele cât timp este activ.",
    outputCopied: "Copiat",
  },
  hu: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "A Pro eltávolítja a reklámokat, és feloldja a teljes páros tervezési réteget.",
    plusIntro: "A Pro reklámmentes használatot, randitervezőt, heti terveket, randi-kihívásokat, közös kedvenceket és exkluzív ötletcsomagokat tartalmaz.",
    monthly: "Havi",
    yearly: "Éves",
    monthSuffix: "/ hónap",
    yearSuffix: "/ év",
    subscribeMonthly: "Havi indítása",
    subscribeYearly: "Éves indítása",
    active: "Pro aktív",
    nativeBilling: "Alkalmazáson belüli vásárlás az App Store-on vagy a Google Playen keresztül.",
    nativeNoAdsBilling: "Egyszeri alkalmazáson belüli vásárlás az App Store-on vagy a Google Playen keresztül.",
    statusNote: "A webes fizetés Stripe-pal működik. iOS-en és Androidon natív alkalmazáson belüli vásárlás van.",
    statusStarting: "Biztonságos Pro-fizetés megnyitása...",
    statusVerifying: "Pro-előfizetés ellenőrzése...",
    statusConfirmed: "A DateHeart Pro aktív.",
    statusFailed: "A Pro-vásárlás nem indult el. Próbáld újra.",
    statusUnavailable: "A fizetés be van kötve, de ez a bolti termék még nem él. Hozd létre és hagyd jóvá a Product ID-ket az App Store Connectben vagy a Play Console-ban.",
    unlockRequired: "DateHeart Pro feloldás szükséges.",
    featureNoAds: "Reklámmentesség benne",
    featurePlanner: "Randitervező",
    featureWeek: "Heti terv",
    featureChallenges: "Randi-kihívások",
    featureSync: "Közös kedvencek",
    featureFilters: "Több tervezési mód",
    featurePacks: "Exkluzív csomagok",
    toolsTitle: "Pro eszközök",
    tonightMode: "Ma este mód",
    weekPlan: "Hét építése",
    challenge: "Új kihívás",
    copyAiPlanner: "Randitervező másolása",
    shareFavorites: "Kedvencek megosztása",
    noAdsIncluded: "A Pro aktív állapotban eltávolítja a reklámokat.",
    outputCopied: "Másolva",
  },
  bn: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro বিজ্ঞাপন সরায় এবং জুটিদের জন্য পুরো পরিকল্পনা স্তর খুলে দেয়।",
    plusIntro: "Pro-তে বিজ্ঞাপন ছাড়া ব্যবহার, ডেট পরিকল্পনাকারী, সাপ্তাহিক পরিকল্পনা, ডেট চ্যালেঞ্জ, শেয়ার করা পছন্দ ও বিশেষ আইডিয়া প্যাক থাকে।",
    monthly: "মাসিক",
    yearly: "বার্ষিক",
    monthSuffix: "/ মাস",
    yearSuffix: "/ বছর",
    subscribeMonthly: "মাসিক শুরু করুন",
    subscribeYearly: "বার্ষিক শুরু করুন",
    active: "Pro সক্রিয়",
    nativeBilling: "App Store বা Google Play দিয়ে অ্যাপের ভেতরের কেনাকাটা।",
    nativeNoAdsBilling: "App Store বা Google Play দিয়ে একবারের অ্যাপের ভেতরের কেনাকাটা।",
    statusNote: "ওয়েব পেমেন্ট Stripe ব্যবহার করে। iOS ও Android অ্যাপের ভেতরের কেনাকাটা ব্যবহার করে।",
    statusStarting: "নিরাপদ Pro কেনাকাটা খোলা হচ্ছে...",
    statusVerifying: "Pro সাবস্ক্রিপশন যাচাই হচ্ছে...",
    statusConfirmed: "DateHeart Pro সক্রিয়।",
    statusFailed: "Pro কেনাকাটা শুরু করা যায়নি। আবার চেষ্টা করুন।",
    statusUnavailable: "পেমেন্ট যুক্ত আছে, কিন্তু এই স্টোর পণ্য এখনো লাইভ নয়। App Store Connect বা Play Console-এ Product ID তৈরি ও অনুমোদন করুন।",
    unlockRequired: "DateHeart Pro আনলক দরকার।",
    featureNoAds: "বিজ্ঞাপনহীন ব্যবহার অন্তর্ভুক্ত",
    featurePlanner: "ডেট পরিকল্পনাকারী",
    featureWeek: "সাপ্তাহিক পরিকল্পনা",
    featureChallenges: "ডেট চ্যালেঞ্জ",
    featureSync: "শেয়ার করা পছন্দ",
    featureFilters: "আরও পরিকল্পনা মোড",
    featurePacks: "বিশেষ প্যাক",
    toolsTitle: "Pro টুল",
    tonightMode: "আজ রাত মোড",
    weekPlan: "সপ্তাহ বানান",
    challenge: "নতুন চ্যালেঞ্জ",
    copyAiPlanner: "ডেট পরিকল্পনাকারী কপি করুন",
    shareFavorites: "পছন্দ শেয়ার করুন",
    noAdsIncluded: "Pro সক্রিয় থাকলে বিজ্ঞাপন সরায়।",
    outputCopied: "কপি হয়েছে",
  },
  ur: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro اشتہارات ہٹاتا ہے اور جوڑوں کے لیے مکمل منصوبہ بندی کھولتا ہے۔",
    plusIntro: "Pro میں بغیر اشتہار استعمال، ڈیٹ منصوبہ ساز، ہفتہ وار منصوبے، ڈیٹ چیلنجز، مشترک پسندیدہ اور خاص آئیڈیا پیک شامل ہیں۔",
    monthly: "ماہانہ",
    yearly: "سالانہ",
    monthSuffix: "/ مہینہ",
    yearSuffix: "/ سال",
    subscribeMonthly: "ماہانہ شروع کریں",
    subscribeYearly: "سالانہ شروع کریں",
    active: "Pro فعال",
    nativeBilling: "App Store یا Google Play کے ذریعے ایپ کے اندر خریداری۔",
    nativeNoAdsBilling: "App Store یا Google Play کے ذریعے ایک بار کی ایپ کے اندر خریداری۔",
    statusNote: "ویب ادائیگی Stripe استعمال کرتی ہے۔ iOS اور Android ایپ کے اندر خریداری استعمال کرتے ہیں۔",
    statusStarting: "محفوظ Pro خریداری کھل رہی ہے...",
    statusVerifying: "Pro سبسکرپشن چیک ہو رہی ہے...",
    statusConfirmed: "DateHeart Pro فعال ہے۔",
    statusFailed: "Pro خریداری شروع نہ ہوسکی۔ دوبارہ کوشش کریں۔",
    statusUnavailable: "ادائیگی جڑی ہوئی ہے، مگر یہ اسٹور پروڈکٹ ابھی لائیو نہیں۔ App Store Connect یا Play Console میں Product ID بنا کر منظور کریں۔",
    unlockRequired: "DateHeart Pro کھولنا ضروری ہے۔",
    featureNoAds: "بغیر اشتہار شامل",
    featurePlanner: "ڈیٹ منصوبہ ساز",
    featureWeek: "ہفتہ وار منصوبہ",
    featureChallenges: "ڈیٹ چیلنجز",
    featureSync: "مشترک پسندیدہ",
    featureFilters: "مزید منصوبہ بندی موڈ",
    featurePacks: "خاص پیک",
    toolsTitle: "Pro اوزار",
    tonightMode: "آج رات موڈ",
    weekPlan: "ہفتہ بنائیں",
    challenge: "نیا چیلنج",
    copyAiPlanner: "ڈیٹ منصوبہ ساز کاپی کریں",
    shareFavorites: "پسندیدہ شیئر کریں",
    noAdsIncluded: "Pro فعال رہتے ہوئے اشتہارات ہٹاتا ہے۔",
    outputCopied: "کاپی ہوگیا",
  },
  fa: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro تبلیغات را حذف می‌کند و لایه کامل برنامه‌ریزی زوج‌ها را باز می‌کند.",
    plusIntro: "Pro شامل استفاده بدون تبلیغات، برنامه‌ریز قرار، برنامه‌های هفتگی، چالش‌های قرار، پسندیده‌های مشترک و بسته‌های ویژه ایده است.",
    monthly: "ماهانه",
    yearly: "سالانه",
    monthSuffix: "/ ماه",
    yearSuffix: "/ سال",
    subscribeMonthly: "شروع ماهانه",
    subscribeYearly: "شروع سالانه",
    active: "Pro فعال",
    nativeBilling: "خرید درون‌برنامه‌ای از طریق App Store یا Google Play.",
    nativeNoAdsBilling: "خرید درون‌برنامه‌ای یک‌باره از طریق App Store یا Google Play.",
    statusNote: "پرداخت وب از Stripe استفاده می‌کند. iOS و Android از خرید درون‌برنامه‌ای استفاده می‌کنند.",
    statusStarting: "در حال باز کردن خرید امن Pro...",
    statusVerifying: "در حال بررسی اشتراک Pro...",
    statusConfirmed: "DateHeart Pro فعال است.",
    statusFailed: "خرید Pro شروع نشد. دوباره تلاش کنید.",
    statusUnavailable: "پرداخت متصل است، اما این محصول فروشگاه هنوز فعال نیست. Product ID را در App Store Connect یا Play Console بسازید و تأیید کنید.",
    unlockRequired: "باز کردن DateHeart Pro لازم است.",
    featureNoAds: "بدون تبلیغات شامل است",
    featurePlanner: "برنامه‌ریز قرار",
    featureWeek: "برنامه هفتگی",
    featureChallenges: "چالش‌های قرار",
    featureSync: "پسندیده‌های مشترک",
    featureFilters: "حالت‌های بیشتر برنامه‌ریزی",
    featurePacks: "بسته‌های ویژه",
    toolsTitle: "ابزارهای Pro",
    tonightMode: "حالت امشب",
    weekPlan: "ساخت هفته",
    challenge: "چالش تازه",
    copyAiPlanner: "کپی برنامه‌ریز قرار",
    shareFavorites: "اشتراک پسندیده‌ها",
    noAdsIncluded: "Pro تا زمانی که فعال است تبلیغات را حذف می‌کند.",
    outputCopied: "کپی شد",
  },
  he: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro מסיר פרסומות ופותח את שכבת התכנון המלאה לזוגות.",
    plusIntro: "Pro כולל שימוש בלי פרסומות, מתכנן דייט, תכניות שבועיות, אתגרי דייט, מועדפים משותפים וחבילות רעיונות בלעדיות.",
    monthly: "חודשי",
    yearly: "שנתי",
    monthSuffix: "/ חודש",
    yearSuffix: "/ שנה",
    subscribeMonthly: "התחל חודשי",
    subscribeYearly: "התחל שנתי",
    active: "Pro פעיל",
    nativeBilling: "רכישה בתוך האפליקציה דרך App Store או Google Play.",
    nativeNoAdsBilling: "רכישה חד-פעמית בתוך האפליקציה דרך App Store או Google Play.",
    statusNote: "תשלום באתר משתמש ב-Stripe. iOS ו-Android משתמשים ברכישות בתוך האפליקציה.",
    statusStarting: "פותחים רכישת Pro מאובטחת...",
    statusVerifying: "בודקים מנוי Pro...",
    statusConfirmed: "DateHeart Pro פעיל.",
    statusFailed: "לא ניתן היה להתחיל רכישת Pro. נסו שוב.",
    statusUnavailable: "התשלום מחובר, אבל מוצר החנות הזה עדיין לא פעיל. צרו ואשרו Product ID ב-App Store Connect או Play Console.",
    unlockRequired: "צריך לפתוח את DateHeart Pro.",
    featureNoAds: "ללא פרסומות כלול",
    featurePlanner: "מתכנן דייט",
    featureWeek: "תכנית שבועית",
    featureChallenges: "אתגרי דייט",
    featureSync: "מועדפים משותפים",
    featureFilters: "עוד מצבי תכנון",
    featurePacks: "חבילות בלעדיות",
    toolsTitle: "כלי Pro",
    tonightMode: "מצב הערב",
    weekPlan: "בנה שבוע",
    challenge: "אתגר חדש",
    copyAiPlanner: "העתק מתכנן דייט",
    shareFavorites: "שתף מועדפים",
    noAdsIncluded: "Pro מסיר פרסומות כל עוד הוא פעיל.",
    outputCopied: "הועתק",
  },
  el: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Το Pro αφαιρεί διαφημίσεις και ξεκλειδώνει το πλήρες επίπεδο σχεδιασμού για ζευγάρια.",
    plusIntro: "Το Pro περιλαμβάνει χρήση χωρίς διαφημίσεις, σχεδιαστή ραντεβού, εβδομαδιαία πλάνα, προκλήσεις ραντεβού, κοινά αγαπημένα και αποκλειστικά πακέτα ιδεών.",
    monthly: "Μηνιαίο",
    yearly: "Ετήσιο",
    monthSuffix: "/ μήνα",
    yearSuffix: "/ έτος",
    subscribeMonthly: "Έναρξη μηνιαίου",
    subscribeYearly: "Έναρξη ετήσιου",
    active: "Pro ενεργό",
    nativeBilling: "Αγορά εντός εφαρμογής μέσω App Store ή Google Play.",
    nativeNoAdsBilling: "Εφάπαξ αγορά εντός εφαρμογής μέσω App Store ή Google Play.",
    statusNote: "Η πληρωμή web χρησιμοποιεί Stripe. iOS και Android χρησιμοποιούν αγορές εντός εφαρμογής.",
    statusStarting: "Άνοιγμα ασφαλούς αγοράς Pro...",
    statusVerifying: "Έλεγχος συνδρομής Pro...",
    statusConfirmed: "Το DateHeart Pro είναι ενεργό.",
    statusFailed: "Η αγορά Pro δεν μπόρεσε να ξεκινήσει. Δοκιμάστε ξανά.",
    statusUnavailable: "Η πληρωμή είναι συνδεδεμένη, αλλά αυτό το προϊόν καταστήματος δεν είναι ακόμα ενεργό. Δημιουργήστε και εγκρίνετε τα Product ID στο App Store Connect ή στο Play Console.",
    unlockRequired: "Απαιτείται ξεκλείδωμα DateHeart Pro.",
    featureNoAds: "Χωρίς διαφημίσεις",
    featurePlanner: "Σχεδιαστής ραντεβού",
    featureWeek: "Εβδομαδιαίο πλάνο",
    featureChallenges: "Προκλήσεις ραντεβού",
    featureSync: "Κοινά αγαπημένα",
    featureFilters: "Περισσότεροι τρόποι σχεδιασμού",
    featurePacks: "Αποκλειστικά πακέτα",
    toolsTitle: "Εργαλεία Pro",
    tonightMode: "Λειτουργία απόψε",
    weekPlan: "Φτιάξτε εβδομάδα",
    challenge: "Νέα πρόκληση",
    copyAiPlanner: "Αντιγραφή σχεδιαστή",
    shareFavorites: "Κοινοποίηση αγαπημένων",
    noAdsIncluded: "Το Pro αφαιρεί διαφημίσεις όσο είναι ενεργό.",
    outputCopied: "Αντιγράφηκε",
  },
  bg: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro премахва рекламите и отключва пълния слой за планиране за двойки.",
    plusIntro: "Pro включва използване без реклами, планировчик на срещи, седмични планове, предизвикателства за срещи, споделени любими и ексклузивни пакети идеи.",
    monthly: "Месечно",
    yearly: "Годишно",
    monthSuffix: "/ месец",
    yearSuffix: "/ година",
    subscribeMonthly: "Започни месечно",
    subscribeYearly: "Започни годишно",
    active: "Pro активно",
    nativeBilling: "Покупка в приложението чрез App Store или Google Play.",
    nativeNoAdsBilling: "Еднократна покупка в приложението чрез App Store или Google Play.",
    statusNote: "Уеб плащането използва Stripe. iOS и Android използват покупки в приложението.",
    statusStarting: "Отваряне на сигурна Pro покупка...",
    statusVerifying: "Проверка на Pro абонамент...",
    statusConfirmed: "DateHeart Pro е активно.",
    statusFailed: "Pro покупката не можа да започне. Опитайте отново.",
    statusUnavailable: "Плащането е свързано, но този магазинен продукт още не е активен. Създайте и одобрете Product ID в App Store Connect или Play Console.",
    unlockRequired: "Изисква се отключване на DateHeart Pro.",
    featureNoAds: "Без реклами включено",
    featurePlanner: "Планировчик на срещи",
    featureWeek: "Седмичен план",
    featureChallenges: "Предизвикателства за срещи",
    featureSync: "Споделени любими",
    featureFilters: "Повече режими за планиране",
    featurePacks: "Ексклузивни пакети",
    toolsTitle: "Pro инструменти",
    tonightMode: "Режим тази вечер",
    weekPlan: "Създай седмица",
    challenge: "Ново предизвикателство",
    copyAiPlanner: "Копирай планировчика",
    shareFavorites: "Сподели любими",
    noAdsIncluded: "Pro премахва рекламите, докато е активно.",
    outputCopied: "Копирано",
  },
  hr: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro uklanja oglase i otključava cijeli sloj planiranja za parove.",
    plusIntro: "Pro uključuje korištenje bez oglasa, planer spoja, tjedne planove, izazove za spojeve, zajedničke favorite i ekskluzivne pakete ideja.",
    monthly: "Mjesečno",
    yearly: "Godišnje",
    monthSuffix: "/ mjesec",
    yearSuffix: "/ godina",
    subscribeMonthly: "Pokreni mjesečno",
    subscribeYearly: "Pokreni godišnje",
    active: "Pro aktivan",
    nativeBilling: "Kupnja u aplikaciji putem App Storea ili Google Playa.",
    nativeNoAdsBilling: "Jednokratna kupnja u aplikaciji putem App Storea ili Google Playa.",
    statusNote: "Web plaćanje koristi Stripe. iOS i Android koriste kupnje u aplikaciji.",
    statusStarting: "Otvara se sigurna Pro kupnja...",
    statusVerifying: "Provjera Pro pretplate...",
    statusConfirmed: "DateHeart Pro je aktivan.",
    statusFailed: "Pro kupnja se nije mogla pokrenuti. Pokušajte ponovno.",
    statusUnavailable: "Plaćanje je povezano, ali ovaj proizvod trgovine još nije aktivan. Izradite i odobrite Product ID u App Store Connectu ili Play Consoleu.",
    unlockRequired: "Potrebno je otključati DateHeart Pro.",
    featureNoAds: "Bez oglasa uključeno",
    featurePlanner: "Planer spoja",
    featureWeek: "Tjedni plan",
    featureChallenges: "Izazovi za spojeve",
    featureSync: "Zajednički favoriti",
    featureFilters: "Više načina planiranja",
    featurePacks: "Ekskluzivni paketi",
    toolsTitle: "Pro alati",
    tonightMode: "Način večeras",
    weekPlan: "Složi tjedan",
    challenge: "Novi izazov",
    copyAiPlanner: "Kopiraj planer",
    shareFavorites: "Podijeli favorite",
    noAdsIncluded: "Pro uklanja oglase dok je aktivan.",
    outputCopied: "Kopirano",
  },
  sk: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro odstraňuje reklamy a odomyká celú plánovaciu vrstvu pre páry.",
    plusIntro: "Pro zahŕňa používanie bez reklám, plánovač rande, týždenné plány, výzvy na rande, zdieľané obľúbené a exkluzívne balíčky nápadov.",
    monthly: "Mesačne",
    yearly: "Ročne",
    monthSuffix: "/ mesiac",
    yearSuffix: "/ rok",
    subscribeMonthly: "Začať mesačne",
    subscribeYearly: "Začať ročne",
    active: "Pro aktívne",
    nativeBilling: "Nákup v aplikácii cez App Store alebo Google Play.",
    nativeNoAdsBilling: "Jednorazový nákup v aplikácii cez App Store alebo Google Play.",
    statusNote: "Webová platba používa Stripe. iOS a Android používajú nákupy v aplikácii.",
    statusStarting: "Otvára sa bezpečný nákup Pro...",
    statusVerifying: "Kontrola predplatného Pro...",
    statusConfirmed: "DateHeart Pro je aktívne.",
    statusFailed: "Nákup Pro sa nepodarilo spustiť. Skúste znova.",
    statusUnavailable: "Platba je pripojená, ale tento produkt obchodu ešte nie je aktívny. Vytvorte a schváľte Product ID v App Store Connect alebo Play Console.",
    unlockRequired: "Je potrebné odomknúť DateHeart Pro.",
    featureNoAds: "Bez reklám zahrnuté",
    featurePlanner: "Plánovač rande",
    featureWeek: "Týždenný plán",
    featureChallenges: "Výzvy na rande",
    featureSync: "Zdieľané obľúbené",
    featureFilters: "Viac režimov plánovania",
    featurePacks: "Exkluzívne balíčky",
    toolsTitle: "Pro nástroje",
    tonightMode: "Režim na dnes večer",
    weekPlan: "Vytvoriť týždeň",
    challenge: "Nová výzva",
    copyAiPlanner: "Kopírovať plánovač",
    shareFavorites: "Zdieľať obľúbené",
    noAdsIncluded: "Pro odstraňuje reklamy, kým je aktívne.",
    outputCopied: "Skopírované",
  },
  ms: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro membuang iklan dan membuka lapisan perancangan penuh untuk pasangan.",
    plusIntro: "Pro merangkumi penggunaan tanpa iklan, perancang janji temu, rancangan mingguan, cabaran janji temu, kegemaran bersama dan pek idea eksklusif.",
    monthly: "Bulanan",
    yearly: "Tahunan",
    monthSuffix: "/ bulan",
    yearSuffix: "/ tahun",
    subscribeMonthly: "Mula bulanan",
    subscribeYearly: "Mula tahunan",
    active: "Pro aktif",
    nativeBilling: "Pembelian dalam aplikasi melalui App Store atau Google Play.",
    nativeNoAdsBilling: "Pembelian sekali dalam aplikasi melalui App Store atau Google Play.",
    statusNote: "Bayaran web menggunakan Stripe. iOS dan Android menggunakan pembelian dalam aplikasi.",
    statusStarting: "Membuka pembelian Pro selamat...",
    statusVerifying: "Menyemak langganan Pro...",
    statusConfirmed: "DateHeart Pro aktif.",
    statusFailed: "Pembelian Pro tidak dapat dimulakan. Cuba lagi.",
    statusUnavailable: "Bayaran sudah disambungkan, tetapi produk kedai ini belum aktif. Cipta dan luluskan Product ID dalam App Store Connect atau Play Console.",
    unlockRequired: "DateHeart Pro perlu dibuka.",
    featureNoAds: "Tanpa iklan disertakan",
    featurePlanner: "Perancang janji temu",
    featureWeek: "Rancangan mingguan",
    featureChallenges: "Cabaran janji temu",
    featureSync: "Kegemaran bersama",
    featureFilters: "Lebih banyak mod perancangan",
    featurePacks: "Pek eksklusif",
    toolsTitle: "Alat Pro",
    tonightMode: "Mod malam ini",
    weekPlan: "Bina minggu",
    challenge: "Cabaran baharu",
    copyAiPlanner: "Salin perancang janji temu",
    shareFavorites: "Kongsi kegemaran",
    noAdsIncluded: "Pro membuang iklan selagi aktif.",
    outputCopied: "Disalin",
  },
  tl: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Tinatanggal ng Pro ang mga patalastas at binubuksan ang buong antas ng pagpaplano para sa magkasintahan.",
    plusIntro: "Kasama sa Pro ang paggamit nang walang patalastas, tagaplano ng tipanan, lingguhang plano, hamon sa tipanan, pinagsasaluhang paborito at natatanging pakete ng ideya.",
    monthly: "Buwan-buwan",
    yearly: "Taunan",
    monthSuffix: "/ buwan",
    yearSuffix: "/ taon",
    subscribeMonthly: "Simulan buwan-buwan",
    subscribeYearly: "Simulan taunan",
    active: "Aktibo ang Pro",
    nativeBilling: "Pagbili sa loob ng app sa pamamagitan ng App Store o Google Play.",
    nativeNoAdsBilling: "Isang beses na pagbili sa loob ng app sa pamamagitan ng App Store o Google Play.",
    statusNote: "Gumagamit ng Stripe ang bayad sa web. Gumagamit ng pagbili sa loob ng app ang iOS at Android.",
    statusStarting: "Binubuksan ang ligtas na pagbili ng Pro...",
    statusVerifying: "Sinusuri ang Pro na kasapian...",
    statusConfirmed: "Aktibo ang DateHeart Pro.",
    statusFailed: "Hindi masimulan ang pagbili ng Pro. Subukan muli.",
    statusUnavailable: "Nakakabit ang bayad, pero hindi pa aktibo ang produktong ito sa tindahan. Gumawa at ipaapruba ang palatandaan ng produkto sa App Store Connect o Play Console.",
    unlockRequired: "Kailangang buksan ang DateHeart Pro.",
    featureNoAds: "Kasama ang walang patalastas",
    featurePlanner: "Tagaplano ng tipanan",
    featureWeek: "Lingguhang plano",
    featureChallenges: "Mga hamon sa tipanan",
    featureSync: "Pinagsasaluhang paborito",
    featureFilters: "Mas maraming paraan ng pagpaplano",
    featurePacks: "Natatanging pakete",
    toolsTitle: "Mga kasangkapan ng Pro",
    tonightMode: "Paraan para ngayong gabi",
    weekPlan: "Bumuo ng linggo",
    challenge: "Bagong hamon",
    copyAiPlanner: "Kopyahin ang tagaplano ng tipanan",
    shareFavorites: "Ibahagi ang mga paborito",
    noAdsIncluded: "Tinatanggal ng Pro ang mga patalastas habang aktibo.",
    outputCopied: "Nakopya",
  },
  ta: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro விளம்பரங்களை அகற்றி, ஜோடிகளுக்கான முழு திட்டமிடல் அடுக்கைத் திறக்கிறது.",
    plusIntro: "Pro-வில் விளம்பரமில்லா பயன்பாடு, டேட் திட்டமிடுபவர், வார திட்டங்கள், டேட் சவால்கள், பகிரப்பட்ட பிடித்தவை மற்றும் சிறப்பு யோசனைப் பேக்குகள் உள்ளன.",
    monthly: "மாதாந்திரம்",
    yearly: "ஆண்டுதோறும்",
    monthSuffix: "/ மாதம்",
    yearSuffix: "/ ஆண்டு",
    subscribeMonthly: "மாதாந்திரம் தொடங்கு",
    subscribeYearly: "ஆண்டுதோறும் தொடங்கு",
    active: "Pro செயலில் உள்ளது",
    nativeBilling: "App Store அல்லது Google Play மூலம் செயலிக்குள் வாங்குதல்.",
    nativeNoAdsBilling: "App Store அல்லது Google Play மூலம் ஒருமுறை செயலிக்குள் வாங்குதல்.",
    statusNote: "வெப் கட்டணம் Stripe-ஐ பயன்படுத்துகிறது. iOS மற்றும் Android செயலிக்குள் வாங்குதலைப் பயன்படுத்துகின்றன.",
    statusStarting: "பாதுகாப்பான Pro வாங்குதல் திறக்கப்படுகிறது...",
    statusVerifying: "Pro சந்தா சரிபார்க்கப்படுகிறது...",
    statusConfirmed: "DateHeart Pro செயலில் உள்ளது.",
    statusFailed: "Pro வாங்குதல் தொடங்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.",
    statusUnavailable: "கட்டணம் இணைக்கப்பட்டுள்ளது, ஆனால் இந்த கடை தயாரிப்பு இன்னும் செயலில் இல்லை. App Store Connect அல்லது Play Console-இல் தயாரிப்பு அடையாளங்களை உருவாக்கி அங்கீகரிக்கவும்.",
    unlockRequired: "DateHeart Pro திறப்பு தேவை.",
    featureNoAds: "விளம்பரமில்லா பயன்பாடு உட்பட",
    featurePlanner: "டேட் திட்டமிடுபவர்",
    featureWeek: "வார திட்டம்",
    featureChallenges: "டேட் சவால்கள்",
    featureSync: "பகிரப்பட்ட பிடித்தவை",
    featureFilters: "மேலும் திட்டமிடல் முறைகள்",
    featurePacks: "சிறப்பு பேக்குகள்",
    toolsTitle: "Pro கருவிகள்",
    tonightMode: "இன்றிரவு முறை",
    weekPlan: "வாரத்தை அமைக்கவும்",
    challenge: "புதிய சவால்",
    copyAiPlanner: "டேட் திட்டமிடுபவரை நகலெடு",
    shareFavorites: "பிடித்தவற்றைப் பகிர்",
    noAdsIncluded: "Pro செயலில் இருக்கும் போது விளம்பரங்களை அகற்றும்.",
    outputCopied: "நகலெடுக்கப்பட்டது",
  },
  te: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro ప్రకటనలను తీసేసి, జంటల కోసం పూర్తి ప్రణాళిక పొరను తెరుస్తుంది.",
    plusIntro: "Proలో ప్రకటనలేని ఉపయోగం, డేట్ ప్లానర్, వారపు ప్రణాళికలు, డేట్ సవాళ్లు, పంచుకున్న ఇష్టమైనవి మరియు ప్రత్యేక ఆలోచన ప్యాక్లు ఉంటాయి.",
    monthly: "నెలవారీ",
    yearly: "వార్షిక",
    monthSuffix: "/ నెల",
    yearSuffix: "/ సంవత్సరం",
    subscribeMonthly: "నెలవారీ ప్రారంభించండి",
    subscribeYearly: "వార్షికంగా ప్రారంభించండి",
    active: "Pro సక్రియంగా ఉంది",
    nativeBilling: "App Store లేదా Google Play ద్వారా యాప్‌లో కొనుగోలు.",
    nativeNoAdsBilling: "App Store లేదా Google Play ద్వారా ఒక్కసారి యాప్‌లో కొనుగోలు.",
    statusNote: "వెబ్ చెల్లింపు Stripe ఉపయోగిస్తుంది. iOS మరియు Android యాప్‌లో కొనుగోళ్లను ఉపయోగిస్తాయి.",
    statusStarting: "సురక్షిత Pro కొనుగోలు తెరుచుకుంటోంది...",
    statusVerifying: "Pro సబ్‌స్క్రిప్షన్ తనిఖీ చేస్తోంది...",
    statusConfirmed: "DateHeart Pro సక్రియంగా ఉంది.",
    statusFailed: "Pro కొనుగోలు ప్రారంభం కాలేదు. మళ్లీ ప్రయత్నించండి.",
    statusUnavailable: "చెల్లింపు కలిపారు, కానీ ఈ దుకాణపు ఉత్పత్తి ఇంకా సక్రియం కాలేదు. App Store Connect లేదా Play Consoleలో ఉత్పత్తి గుర్తింపులను సృష్టించి ఆమోదించండి.",
    unlockRequired: "DateHeart Pro తెరవాలి.",
    featureNoAds: "ప్రకటనలేని ఉపయోగం చేర్చబడింది",
    featurePlanner: "డేట్ ప్లానర్",
    featureWeek: "వారపు ప్రణాళిక",
    featureChallenges: "డేట్ సవాళ్లు",
    featureSync: "పంచుకున్న ఇష్టమైనవి",
    featureFilters: "మరిన్ని ప్రణాళిక మోడ్‌లు",
    featurePacks: "ప్రత్యేక ప్యాక్లు",
    toolsTitle: "Pro సాధనాలు",
    tonightMode: "ఈ రాత్రి మోడ్",
    weekPlan: "వారం నిర్మించండి",
    challenge: "కొత్త సవాలు",
    copyAiPlanner: "డేట్ ప్లానర్ కాపీ చేయండి",
    shareFavorites: "ఇష్టమైనవి పంచుకోండి",
    noAdsIncluded: "Pro సక్రియంగా ఉన్నప్పుడు ప్రకటనలను తీసేస్తుంది.",
    outputCopied: "కాపీ అయింది",
  },
  sw: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro huondoa matangazo na kufungua safu kamili ya kupanga kwa wenzi.",
    plusIntro: "Pro inajumuisha matumizi bila matangazo, mpangaji wa miadi, mipango ya wiki, changamoto za miadi, vipendwa vya pamoja na vifurushi maalum vya mawazo.",
    monthly: "Kila mwezi",
    yearly: "Kila mwaka",
    monthSuffix: "/ mwezi",
    yearSuffix: "/ mwaka",
    subscribeMonthly: "Anza kila mwezi",
    subscribeYearly: "Anza kila mwaka",
    active: "Pro inatumika",
    nativeBilling: "Ununuzi ndani ya programu kupitia App Store au Google Play.",
    nativeNoAdsBilling: "Ununuzi wa mara moja ndani ya programu kupitia App Store au Google Play.",
    statusNote: "Malipo ya wavuti hutumia Stripe. iOS na Android hutumia ununuzi ndani ya programu.",
    statusStarting: "Inafungua ununuzi salama wa Pro...",
    statusVerifying: "Inakagua uanachama wa Pro...",
    statusConfirmed: "DateHeart Pro inatumika.",
    statusFailed: "Ununuzi wa Pro haukuweza kuanza. Jaribu tena.",
    statusUnavailable: "Malipo yameunganishwa, lakini bidhaa hii ya duka bado haijawashwa. Unda na uidhinishe vitambulisho vya bidhaa kwenye App Store Connect au Play Console.",
    unlockRequired: "DateHeart Pro inahitaji kufunguliwa.",
    featureNoAds: "Bila matangazo",
    featurePlanner: "Mpangaji wa miadi",
    featureWeek: "Mpango wa wiki",
    featureChallenges: "Changamoto za miadi",
    featureSync: "Vipendwa vya pamoja",
    featureFilters: "Njia zaidi za kupanga",
    featurePacks: "Vifurushi maalum",
    toolsTitle: "Zana za Pro",
    tonightMode: "Njia ya leo jioni",
    weekPlan: "Jenga wiki",
    challenge: "Changamoto mpya",
    copyAiPlanner: "Nakili mpangaji wa miadi",
    shareFavorites: "Shiriki vipendwa",
    noAdsIncluded: "Pro huondoa matangazo wakati inatumika.",
    outputCopied: "Imenakiliwa",
  },
  mr: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro जाहिराती काढतो आणि जोडप्यांसाठी पूर्ण योजना स्तर उघडतो.",
    plusIntro: "Pro मध्ये जाहिरातीशिवाय वापर, भेट नियोजक, आठवड्याचे प्लॅन, भेट आव्हाने, सामायिक आवडी आणि खास कल्पना पॅक मिळतात.",
    monthly: "मासिक",
    yearly: "वार्षिक",
    monthSuffix: "/ महिना",
    yearSuffix: "/ वर्ष",
    subscribeMonthly: "मासिक सुरू करा",
    subscribeYearly: "वार्षिक सुरू करा",
    active: "Pro सक्रिय आहे",
    nativeBilling: "App Store किंवा Google Play द्वारे अॅपमधील खरेदी.",
    nativeNoAdsBilling: "App Store किंवा Google Play द्वारे एकदाच अॅपमधील खरेदी.",
    statusNote: "वेब पेमेंट Stripe वापरते. iOS आणि Android अॅपमधील खरेदी वापरतात.",
    statusStarting: "सुरक्षित Pro खरेदी उघडत आहे...",
    statusVerifying: "Pro सदस्यता तपासत आहे...",
    statusConfirmed: "DateHeart Pro सक्रिय आहे.",
    statusFailed: "Pro खरेदी सुरू होऊ शकली नाही. पुन्हा प्रयत्न करा.",
    statusUnavailable: "पेमेंट जोडले आहे, पण हे दुकानातील उत्पादन अजून सक्रिय नाही. App Store Connect किंवा Play Console मध्ये उत्पादन ओळखी तयार करून मंजूर करा.",
    unlockRequired: "DateHeart Pro उघडणे आवश्यक आहे.",
    featureNoAds: "जाहिरातीशिवाय वापर",
    featurePlanner: "भेट नियोजक",
    featureWeek: "आठवड्याची योजना",
    featureChallenges: "भेट आव्हाने",
    featureSync: "सामायिक आवडी",
    featureFilters: "अधिक योजना पद्धती",
    featurePacks: "खास पॅक",
    toolsTitle: "Pro साधने",
    tonightMode: "आज संध्याकाळची पद्धत",
    weekPlan: "आठवडा तयार करा",
    challenge: "नवे आव्हान",
    copyAiPlanner: "भेट नियोजक कॉपी करा",
    shareFavorites: "आवडी शेअर करा",
    noAdsIncluded: "Pro सक्रिय असताना जाहिराती काढतो.",
    outputCopied: "कॉपी झाले",
  },
  gu: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro જાહેરાતો દૂર કરે છે અને જોડીઓ માટે સંપૂર્ણ આયોજન સ્તર ખોલે છે.",
    plusIntro: "Pro માં જાહેરાત વગરનો ઉપયોગ, મુલાકાત યોજક, અઠવાડિયાની યોજનાઓ, મુલાકાત પડકારો, શેર કરેલી પસંદીદા અને ખાસ વિચારણા પેક મળે છે.",
    monthly: "માસિક",
    yearly: "વાર્ષિક",
    monthSuffix: "/ મહિનો",
    yearSuffix: "/ વર્ષ",
    subscribeMonthly: "માસિક શરૂ કરો",
    subscribeYearly: "વાર્ષિક શરૂ કરો",
    active: "Pro સક્રિય છે",
    nativeBilling: "App Store અથવા Google Play દ્વારા એપ્લિકેશનની અંદર ખરીદી.",
    nativeNoAdsBilling: "App Store અથવા Google Play દ્વારા એક વખતની એપ્લિકેશનની અંદર ખરીદી.",
    statusNote: "વેબ ચુકવણી Stripe વાપરે છે. iOS અને Android એપ્લિકેશનની અંદરની ખરીદી વાપરે છે.",
    statusStarting: "સુરક્ષિત Pro ખરીદી ખૂલી રહી છે...",
    statusVerifying: "Pro સભ્યપદ તપાસાઈ રહ્યું છે...",
    statusConfirmed: "DateHeart Pro સક્રિય છે.",
    statusFailed: "Pro ખરીદી શરૂ થઈ શકી નથી. ફરી પ્રયત્ન કરો.",
    statusUnavailable: "ચુકવણી જોડાઈ છે, પરંતુ આ દુકાન ઉત્પાદન હજી સક્રિય નથી. App Store Connect અથવા Play Console માં ઉત્પાદન ઓળખો બનાવી મંજૂર કરો.",
    unlockRequired: "DateHeart Pro ખોલવું જરૂરી છે.",
    featureNoAds: "જાહેરાત વગરનો ઉપયોગ",
    featurePlanner: "મુલાકાત યોજક",
    featureWeek: "અઠવાડિયાની યોજના",
    featureChallenges: "મુલાકાત પડકારો",
    featureSync: "શેર કરેલી પસંદીદા",
    featureFilters: "વધુ આયોજન રીતો",
    featurePacks: "ખાસ પેક",
    toolsTitle: "Pro સાધનો",
    tonightMode: "આજ રાતની રીત",
    weekPlan: "અઠવાડિયું બનાવો",
    challenge: "નવો પડકાર",
    copyAiPlanner: "મુલાકાત યોજકની નકલ કરો",
    shareFavorites: "પસંદીદા શેર કરો",
    noAdsIncluded: "Pro સક્રિય હોય ત્યારે જાહેરાતો દૂર કરે છે.",
    outputCopied: "નકલ થઈ",
  },
  pa: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro ਇਸ਼ਤਿਹਾਰ ਹਟਾਉਂਦਾ ਹੈ ਅਤੇ ਜੋੜਿਆਂ ਲਈ ਪੂਰੀ ਯੋਜਨਾ ਪਰਤ ਖੋਲ੍ਹਦਾ ਹੈ.",
    plusIntro: "Pro ਵਿੱਚ ਇਸ਼ਤਿਹਾਰਾਂ ਤੋਂ ਬਿਨਾਂ ਵਰਤੋਂ, ਮਿਲਣ ਯੋਜਕ, ਹਫ਼ਤੇ ਦੀਆਂ ਯੋਜਨਾਵਾਂ, ਮਿਲਣ ਚੁਣੌਤੀਆਂ, ਸਾਂਝੀਆਂ ਪਸੰਦਾਂ ਅਤੇ ਖਾਸ ਸੋਚ ਪੈਕ ਸ਼ਾਮਲ ਹਨ.",
    monthly: "ਮਹੀਨਾਵਾਰ",
    yearly: "ਸਾਲਾਨਾ",
    monthSuffix: "/ ਮਹੀਨਾ",
    yearSuffix: "/ ਸਾਲ",
    subscribeMonthly: "ਮਹੀਨਾਵਾਰ ਸ਼ੁਰੂ ਕਰੋ",
    subscribeYearly: "ਸਾਲਾਨਾ ਸ਼ੁਰੂ ਕਰੋ",
    active: "Pro ਚਾਲੂ ਹੈ",
    nativeBilling: "App Store ਜਾਂ Google Play ਰਾਹੀਂ ਐਪ ਅੰਦਰ ਖਰੀਦ.",
    nativeNoAdsBilling: "App Store ਜਾਂ Google Play ਰਾਹੀਂ ਇੱਕ ਵਾਰ ਦੀ ਐਪ ਅੰਦਰ ਖਰੀਦ.",
    statusNote: "ਵੈੱਬ ਭੁਗਤਾਨ Stripe ਵਰਤਦਾ ਹੈ. iOS ਅਤੇ Android ਐਪ ਅੰਦਰ ਖਰੀਦ ਵਰਤਦੇ ਹਨ.",
    statusStarting: "ਸੁਰੱਖਿਅਤ Pro ਖਰੀਦ ਖੁੱਲ ਰਹੀ ਹੈ...",
    statusVerifying: "Pro ਮੈਂਬਰਸ਼ਿਪ ਜਾਂਚੀ ਜਾ ਰਹੀ ਹੈ...",
    statusConfirmed: "DateHeart Pro ਚਾਲੂ ਹੈ.",
    statusFailed: "Pro ਖਰੀਦ ਸ਼ੁਰੂ ਨਹੀਂ ਹੋ ਸਕੀ. ਮੁੜ ਕੋਸ਼ਿਸ਼ ਕਰੋ.",
    statusUnavailable: "ਭੁਗਤਾਨ ਜੁੜਿਆ ਹੈ, ਪਰ ਇਹ ਦੁਕਾਨ ਉਤਪਾਦ ਹਜੇ ਚਾਲੂ ਨਹੀਂ. App Store Connect ਜਾਂ Play Console ਵਿੱਚ ਉਤਪਾਦ ਪਛਾਣਾਂ ਬਣਾਕੇ ਮਨਜ਼ੂਰ ਕਰੋ.",
    unlockRequired: "DateHeart Pro ਖੋਲ੍ਹਣਾ ਲਾਜ਼ਮੀ ਹੈ.",
    featureNoAds: "ਇਸ਼ਤਿਹਾਰਾਂ ਤੋਂ ਬਿਨਾਂ ਵਰਤੋਂ",
    featurePlanner: "ਮਿਲਣ ਯੋਜਕ",
    featureWeek: "ਹਫ਼ਤੇ ਦੀ ਯੋਜਨਾ",
    featureChallenges: "ਮਿਲਣ ਚੁਣੌਤੀਆਂ",
    featureSync: "ਸਾਂਝੀਆਂ ਪਸੰਦਾਂ",
    featureFilters: "ਹੋਰ ਯੋਜਨਾ ਢੰਗ",
    featurePacks: "ਖਾਸ ਪੈਕ",
    toolsTitle: "Pro ਸੰਦ",
    tonightMode: "ਅੱਜ ਰਾਤ ਦਾ ਢੰਗ",
    weekPlan: "ਹਫ਼ਤਾ ਬਣਾਓ",
    challenge: "ਨਵੀਂ ਚੁਣੌਤੀ",
    copyAiPlanner: "ਮਿਲਣ ਯੋਜਕ ਨਕਲ ਕਰੋ",
    shareFavorites: "ਪਸੰਦਾਂ ਸਾਂਝੀਆਂ ਕਰੋ",
    noAdsIncluded: "Pro ਚਾਲੂ ਹੋਣ ਤੇ ਇਸ਼ਤਿਹਾਰ ਹਟਾਉਂਦਾ ਹੈ.",
    outputCopied: "ਨਕਲ ਹੋਇਆ",
  },
  kn: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro ಜಾಹೀರಾತುಗಳನ್ನು ತೆಗೆದುಹಾಕಿ, ಜೋಡಿಗಳಿಗಾಗಿ ಪೂರ್ಣ ಯೋಜನಾ ಪದರವನ್ನು ತೆರೆಯುತ್ತದೆ.",
    plusIntro: "Pro ನಲ್ಲಿ ಜಾಹೀರಾತಿಲ್ಲದ ಬಳಕೆ, ಭೇಟಿ ಯೋಜಕ, ವಾರದ ಯೋಜನೆಗಳು, ಭೇಟಿ ಸವಾಲುಗಳು, ಹಂಚಿದ ಇಷ್ಟಗಳು ಮತ್ತು ವಿಶೇಷ ಆಲೋಚನೆ ಪ್ಯಾಕ್‌ಗಳು ಸೇರಿವೆ.",
    monthly: "ಮಾಸಿಕ",
    yearly: "ವಾರ್ಷಿಕ",
    monthSuffix: "/ ತಿಂಗಳು",
    yearSuffix: "/ ವರ್ಷ",
    subscribeMonthly: "ಮಾಸಿಕ ಆರಂಭಿಸಿ",
    subscribeYearly: "ವಾರ್ಷಿಕ ಆರಂಭಿಸಿ",
    active: "Pro ಸಕ್ರಿಯವಾಗಿದೆ",
    nativeBilling: "App Store ಅಥವಾ Google Play ಮೂಲಕ ಅಪ್ಲಿಕೇಶನ್ ಒಳಗಿನ ಖರೀದಿ.",
    nativeNoAdsBilling: "App Store ಅಥವಾ Google Play ಮೂಲಕ ಒಮ್ಮೆ ಮಾಡುವ ಅಪ್ಲಿಕೇಶನ್ ಒಳಗಿನ ಖರೀದಿ.",
    statusNote: "ವೆಬ್ ಪಾವತಿ Stripe ಬಳಸುತ್ತದೆ. iOS ಮತ್ತು Android ಅಪ್ಲಿಕೇಶನ್ ಒಳಗಿನ ಖರೀದಿ ಬಳಸುತ್ತವೆ.",
    statusStarting: "ಸುರಕ್ಷಿತ Pro ಖರೀದಿ ತೆರೆಯುತ್ತಿದೆ...",
    statusVerifying: "Pro ಸದಸ್ಯತ್ವ ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ...",
    statusConfirmed: "DateHeart Pro ಸಕ್ರಿಯವಾಗಿದೆ.",
    statusFailed: "Pro ಖರೀದಿ ಆರಂಭವಾಗಲಿಲ್ಲ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.",
    statusUnavailable: "ಪಾವತಿ ಜೋಡಿಸಲಾಗಿದೆ, ಆದರೆ ಈ ಅಂಗಡಿ ಉತ್ಪನ್ನ ಇನ್ನೂ ಸಕ್ರಿಯವಾಗಿಲ್ಲ. App Store Connect ಅಥವಾ Play Console ನಲ್ಲಿ ಉತ್ಪನ್ನ ಗುರುತುಗಳನ್ನು ರಚಿಸಿ ಅನುಮೋದಿಸಿ.",
    unlockRequired: "DateHeart Pro ತೆರೆಯಬೇಕು.",
    featureNoAds: "ಜಾಹೀರಾತಿಲ್ಲದ ಬಳಕೆ",
    featurePlanner: "ಭೇಟಿ ಯೋಜಕ",
    featureWeek: "ವಾರದ ಯೋಜನೆ",
    featureChallenges: "ಭೇಟಿ ಸವಾಲುಗಳು",
    featureSync: "ಹಂಚಿದ ಇಷ್ಟಗಳು",
    featureFilters: "ಹೆಚ್ಚು ಯೋಜನಾ ವಿಧಾನಗಳು",
    featurePacks: "ವಿಶೇಷ ಪ್ಯಾಕ್‌ಗಳು",
    toolsTitle: "Pro ಸಾಧನಗಳು",
    tonightMode: "ಇಂದು ರಾತ್ರಿ ವಿಧಾನ",
    weekPlan: "ವಾರ ನಿರ್ಮಿಸಿ",
    challenge: "ಹೊಸ ಸವಾಲು",
    copyAiPlanner: "ಭೇಟಿ ಯೋಜಕ ನಕಲಿಸಿ",
    shareFavorites: "ಇಷ್ಟಗಳನ್ನು ಹಂಚಿಕೊಳ್ಳಿ",
    noAdsIncluded: "Pro ಸಕ್ರಿಯವಾಗಿರುವಾಗ ಜಾಹೀರಾತುಗಳನ್ನು ತೆಗೆದುಹಾಕುತ್ತದೆ.",
    outputCopied: "ನಕಲಿಸಲಾಗಿದೆ",
  },
  ml: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro പരസ്യങ്ങൾ നീക്കി കൂട്ടുകാർക്കുള്ള പൂർണ്ണ പദ്ധതി പാളി തുറക്കുന്നു.",
    plusIntro: "Pro യിൽ പരസ്യമില്ലാത്ത ഉപയോഗം, കൂടിക്കാഴ്ച പദ്ധതികർത്താവ്, ആഴ്ച പദ്ധതികൾ, കൂടിക്കാഴ്ച വെല്ലുവിളികൾ, പങ്കിട്ട ഇഷ്ടങ്ങൾ, പ്രത്യേക ചിന്ത പാക്കുകൾ എന്നിവ ഉൾപ്പെടുന്നു.",
    monthly: "മാസംതോറും",
    yearly: "വർഷംതോറും",
    monthSuffix: "/ മാസം",
    yearSuffix: "/ വർഷം",
    subscribeMonthly: "മാസംതോറും തുടങ്ങുക",
    subscribeYearly: "വർഷംതോറും തുടങ്ങുക",
    active: "Pro സജീവമാണ്",
    nativeBilling: "App Store അല്ലെങ്കിൽ Google Play വഴി അപ്ലിക്കേഷനിലെ വാങ്ങൽ.",
    nativeNoAdsBilling: "App Store അല്ലെങ്കിൽ Google Play വഴി ഒരിക്കൽ മാത്രം അപ്ലിക്കേഷനിലെ വാങ്ങൽ.",
    statusNote: "വെബ് പേയ്മെന്റ് Stripe ഉപയോഗിക്കുന്നു. iOSയും Androidവും അപ്ലിക്കേഷനിലെ വാങ്ങൽ ഉപയോഗിക്കുന്നു.",
    statusStarting: "സുരക്ഷിത Pro വാങ്ങൽ തുറക്കുന്നു...",
    statusVerifying: "Pro അംഗത്വം പരിശോധിക്കുന്നു...",
    statusConfirmed: "DateHeart Pro സജീവമാണ്.",
    statusFailed: "Pro വാങ്ങൽ തുടങ്ങാനായില്ല. വീണ്ടും ശ്രമിക്കുക.",
    statusUnavailable: "പേയ്മെന്റ് ബന്ധിപ്പിച്ചിട്ടുണ്ട്, പക്ഷേ ഈ കട ഉൽപ്പന്നം ഇതുവരെ സജീവമല്ല. App Store Connect അല്ലെങ്കിൽ Play Console ൽ ഉൽപ്പന്ന തിരിച്ചറിയലുകൾ സൃഷ്ടിച്ച് അംഗീകരിക്കുക.",
    unlockRequired: "DateHeart Pro തുറക്കണം.",
    featureNoAds: "പരസ്യമില്ലാത്ത ഉപയോഗം",
    featurePlanner: "കൂടിക്കാഴ്ച പദ്ധതികർത്താവ്",
    featureWeek: "ആഴ്ച പദ്ധതി",
    featureChallenges: "കൂടിക്കാഴ്ച വെല്ലുവിളികൾ",
    featureSync: "പങ്കിട്ട ഇഷ്ടങ്ങൾ",
    featureFilters: "കൂടുതൽ പദ്ധതി രീതികൾ",
    featurePacks: "പ്രത്യേക പാക്കുകൾ",
    toolsTitle: "Pro ഉപകരണങ്ങൾ",
    tonightMode: "ഇന്നിറവ് രീതി",
    weekPlan: "ആഴ്ച നിർമ്മിക്കുക",
    challenge: "പുതിയ വെല്ലുവിളി",
    copyAiPlanner: "കൂടിക്കാഴ്ച പദ്ധതികർത്താവ് പകർത്തുക",
    shareFavorites: "ഇഷ്ടങ്ങൾ പങ്കിടുക",
    noAdsIncluded: "Pro സജീവമായിരിക്കുമ്പോൾ പരസ്യങ്ങൾ നീക്കും.",
    outputCopied: "പകർന്നു",
  },
  ne: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro ले विज्ञापन हटाउँछ र जोडीहरूका लागि पूरा योजना तह खोल्छ.",
    plusIntro: "Pro मा विज्ञापनरहित प्रयोग, भेट योजनाकार, साप्ताहिक योजना, भेट चुनौती, साझा मनपर्ने र विशेष विचार प्याक समावेश छन्.",
    monthly: "मासिक",
    yearly: "वार्षिक",
    monthSuffix: "/ महिना",
    yearSuffix: "/ वर्ष",
    subscribeMonthly: "मासिक सुरु गर्नुहोस्",
    subscribeYearly: "वार्षिक सुरु गर्नुहोस्",
    active: "Pro सक्रिय छ",
    nativeBilling: "App Store वा Google Play मार्फत एपभित्रको खरिद.",
    nativeNoAdsBilling: "App Store वा Google Play मार्फत एक पटकको एपभित्रको खरिद.",
    statusNote: "वेब भुक्तानी Stripe प्रयोग गर्छ. iOS र Android ले एपभित्रको खरिद प्रयोग गर्छन्.",
    statusStarting: "सुरक्षित Pro खरिद खुल्दैछ...",
    statusVerifying: "Pro सदस्यता जाँचिँदैछ...",
    statusConfirmed: "DateHeart Pro सक्रिय छ.",
    statusFailed: "Pro खरिद सुरु हुन सकेन. फेरि प्रयास गर्नुहोस्.",
    statusUnavailable: "भुक्तानी जोडिएको छ, तर यो स्टोर उत्पादन अझै सक्रिय छैन. App Store Connect वा Play Console मा उत्पादन पहिचान सिर्जना गरी स्वीकृत गराउनुहोस्.",
    unlockRequired: "DateHeart Pro खोल्नुपर्छ.",
    featureNoAds: "विज्ञापनरहित प्रयोग",
    featurePlanner: "भेट योजनाकार",
    featureWeek: "साप्ताहिक योजना",
    featureChallenges: "भेट चुनौतीहरू",
    featureSync: "साझा मनपर्ने",
    featureFilters: "थप योजना तरिका",
    featurePacks: "विशेष प्याक",
    toolsTitle: "Pro उपकरण",
    tonightMode: "आज रातिको तरिका",
    weekPlan: "हप्ता बनाउनुहोस्",
    challenge: "नयाँ चुनौती",
    copyAiPlanner: "भेट योजनाकार नक्कल गर्नुहोस्",
    shareFavorites: "मनपर्ने साझा गर्नुहोस्",
    noAdsIncluded: "Pro सक्रिय हुँदा विज्ञापन हटाउँछ.",
    outputCopied: "नक्कल भयो",
  },
  si: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro දැන්වීම් ඉවත් කර යුවළවල් සඳහා සම්පූර්ණ සැලසුම් ස්ථරය විවෘත කරයි.",
    plusIntro: "Pro තුළ දැන්වීම් රහිත භාවිතය, හමුවීම් සැලසුම්කරු, සති සැලසුම්, හමුවීම් අභියෝග, බෙදාගත් ප්‍රියතම සහ විශේෂ අදහස් පැකේජ ඇතුළත් වේ.",
    monthly: "මාසික",
    yearly: "වාර්ෂික",
    monthSuffix: "/ මාසය",
    yearSuffix: "/ වසර",
    subscribeMonthly: "මාසිකව ආරම්භ කරන්න",
    subscribeYearly: "වාර්ෂිකව ආරම්භ කරන්න",
    active: "Pro සක්‍රියයි",
    nativeBilling: "App Store හෝ Google Play හරහා යෙදුම තුළ මිලදී ගැනීම.",
    nativeNoAdsBilling: "App Store හෝ Google Play හරහා එක්වරක් යෙදුම තුළ මිලදී ගැනීම.",
    statusNote: "වෙබ් ගෙවීම Stripe භාවිත කරයි. iOS සහ Android යෙදුම තුළ මිලදී ගැනීම භාවිත කරයි.",
    statusStarting: "ආරක්ෂිත Pro මිලදී ගැනීම විවෘත වෙමින් පවතී...",
    statusVerifying: "Pro සාමාජිකත්වය පරීක්ෂා කරමින් පවතී...",
    statusConfirmed: "DateHeart Pro සක්‍රියයි.",
    statusFailed: "Pro මිලදී ගැනීම ආරම්භ කළ නොහැකි විය. නැවත උත්සාහ කරන්න.",
    statusUnavailable: "ගෙවීම සම්බන්ධ කර ඇත, නමුත් මෙම වෙළඳසැල් නිෂ්පාදනය තවම සක්‍රිය නැත. App Store Connect හෝ Play Console තුළ නිෂ්පාදන හඳුනාගැනීම් සාදා අනුමත කරන්න.",
    unlockRequired: "DateHeart Pro විවෘත කළ යුතුය.",
    featureNoAds: "දැන්වීම් රහිත භාවිතය",
    featurePlanner: "හමුවීම් සැලසුම්කරු",
    featureWeek: "සති සැලැස්ම",
    featureChallenges: "හමුවීම් අභියෝග",
    featureSync: "බෙදාගත් ප්‍රියතම",
    featureFilters: "තවත් සැලසුම් ක්‍රම",
    featurePacks: "විශේෂ පැකේජ",
    toolsTitle: "Pro මෙවලම්",
    tonightMode: "අද රාත්‍රි ක්‍රමය",
    weekPlan: "සතිය සාදන්න",
    challenge: "නව අභියෝගය",
    copyAiPlanner: "හමුවීම් සැලසුම්කරු පිටපත් කරන්න",
    shareFavorites: "ප්‍රියතම බෙදාගන්න",
    noAdsIncluded: "Pro සක්‍රියව තිබෙන විට දැන්වීම් ඉවත් කරයි.",
    outputCopied: "පිටපත් විය",
  },
  et: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro eemaldab reklaamid ja avab paaridele täieliku planeerimiskihi.",
    plusIntro: "Pro sisaldab reklaamideta kasutust, kohtinguplaanijat, nädalaplaane, kohtingu väljakutseid, jagatud lemmikuid ja eripakette.",
    monthly: "Kuu kaupa",
    yearly: "Aasta kaupa",
    monthSuffix: "/ kuu",
    yearSuffix: "/ aasta",
    subscribeMonthly: "Alusta kuupaketti",
    subscribeYearly: "Alusta aastapaketti",
    active: "Pro on aktiivne",
    nativeBilling: "Rakendusesisene ost App Store'i või Google Play kaudu.",
    nativeNoAdsBilling: "Ühekordne rakendusesisene ost App Store'i või Google Play kaudu.",
    statusNote: "Veebimakse kasutab Stripe'i. iOS ja Android kasutavad rakendusesiseseid oste.",
    statusStarting: "Turvaline Pro ost avaneb...",
    statusVerifying: "Pro liikmesust kontrollitakse...",
    statusConfirmed: "DateHeart Pro on aktiivne.",
    statusFailed: "Pro ostu ei saanud alustada. Proovige uuesti.",
    statusUnavailable: "Makse on ühendatud, kuid see poe toode pole veel aktiivne. Looge ja kinnitage toote ID-d App Store Connectis või Play Console'is.",
    unlockRequired: "DateHeart Pro tuleb avada.",
    featureNoAds: "Reklaamideta kasutus",
    featurePlanner: "Kohtinguplaanija",
    featureWeek: "Nädalaplaan",
    featureChallenges: "Kohtingu väljakutsed",
    featureSync: "Jagatud lemmikud",
    featureFilters: "Rohkem planeerimisviise",
    featurePacks: "Eripaketid",
    toolsTitle: "Pro tööriistad",
    tonightMode: "Tänase õhtu viis",
    weekPlan: "Koosta nädal",
    challenge: "Uus väljakutse",
    copyAiPlanner: "Kopeeri kohtinguplaanija",
    shareFavorites: "Jaga lemmikuid",
    noAdsIncluded: "Pro eemaldab reklaamid, kuni see on aktiivne.",
    outputCopied: "Kopeeritud",
  },
  lt: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro pašalina reklamas ir atveria poroms visą planavimo sluoksnį.",
    plusIntro: "Pro apima naudojimą be reklamų, pasimatymo planuotoją, savaitės planus, pasimatymo iššūkius, bendrus mėgstamus ir specialius idėjų paketus.",
    monthly: "Kas mėnesį",
    yearly: "Kas metus",
    monthSuffix: "/ mėn.",
    yearSuffix: "/ metus",
    subscribeMonthly: "Pradėti mėnesinį",
    subscribeYearly: "Pradėti metinį",
    active: "Pro aktyvus",
    nativeBilling: "Pirkimas programoje per App Store arba Google Play.",
    nativeNoAdsBilling: "Vienkartinis pirkimas programoje per App Store arba Google Play.",
    statusNote: "Mokėjimas internete naudoja Stripe. iOS ir Android naudoja pirkimus programoje.",
    statusStarting: "Atidaromas saugus Pro pirkimas...",
    statusVerifying: "Tikrinama Pro narystė...",
    statusConfirmed: "DateHeart Pro aktyvus.",
    statusFailed: "Pro pirkimo pradėti nepavyko. Bandykite dar kartą.",
    statusUnavailable: "Mokėjimas prijungtas, bet šis parduotuvės produktas dar neaktyvus. Sukurkite ir patvirtinkite produkto ID App Store Connect arba Play Console.",
    unlockRequired: "Reikia atrakinti DateHeart Pro.",
    featureNoAds: "Naudojimas be reklamų",
    featurePlanner: "Pasimatymo planuotojas",
    featureWeek: "Savaitės planas",
    featureChallenges: "Pasimatymo iššūkiai",
    featureSync: "Bendri mėgstami",
    featureFilters: "Daugiau planavimo būdų",
    featurePacks: "Specialūs paketai",
    toolsTitle: "Pro įrankiai",
    tonightMode: "Šio vakaro būdas",
    weekPlan: "Sudaryti savaitę",
    challenge: "Naujas iššūkis",
    copyAiPlanner: "Kopijuoti pasimatymo planuotoją",
    shareFavorites: "Bendrinti mėgstamus",
    noAdsIncluded: "Pro pašalina reklamas, kol yra aktyvus.",
    outputCopied: "Nukopijuota",
  },
  lv: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro noņem reklāmas un atver pāriem pilnu plānošanas slāni.",
    plusIntro: "Pro ietver lietošanu bez reklāmām, randiņa plānotāju, nedēļas plānus, randiņa izaicinājumus, kopīgu izlasi un īpašas ideju pakas.",
    monthly: "Katru mēnesi",
    yearly: "Katru gadu",
    monthSuffix: "/ mēnesī",
    yearSuffix: "/ gadā",
    subscribeMonthly: "Sākt mēneša plānu",
    subscribeYearly: "Sākt gada plānu",
    active: "Pro ir aktīvs",
    nativeBilling: "Pirkums lietotnē caur App Store vai Google Play.",
    nativeNoAdsBilling: "Vienreizējs pirkums lietotnē caur App Store vai Google Play.",
    statusNote: "Tīmekļa maksājums izmanto Stripe. iOS un Android izmanto pirkumus lietotnē.",
    statusStarting: "Tiek atvērts drošs Pro pirkums...",
    statusVerifying: "Tiek pārbaudīta Pro dalība...",
    statusConfirmed: "DateHeart Pro ir aktīvs.",
    statusFailed: "Pro pirkumu neizdevās sākt. Mēģiniet vēlreiz.",
    statusUnavailable: "Maksājums ir pievienots, bet šis veikala produkts vēl nav aktīvs. Izveidojiet un apstipriniet produkta ID App Store Connect vai Play Console.",
    unlockRequired: "DateHeart Pro ir jāatver.",
    featureNoAds: "Lietošana bez reklāmām",
    featurePlanner: "Randiņa plānotājs",
    featureWeek: "Nedēļas plāns",
    featureChallenges: "Randiņa izaicinājumi",
    featureSync: "Kopīga izlase",
    featureFilters: "Vairāk plānošanas veidu",
    featurePacks: "Īpašas pakas",
    toolsTitle: "Pro rīki",
    tonightMode: "Šī vakara veids",
    weekPlan: "Izveidot nedēļu",
    challenge: "Jauns izaicinājums",
    copyAiPlanner: "Kopēt randiņa plānotāju",
    shareFavorites: "Kopīgot izlasi",
    noAdsIncluded: "Pro noņem reklāmas, kamēr tas ir aktīvs.",
    outputCopied: "Nokopēts",
  },
  sl: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro odstrani oglase in parom odpre celotno plast načrtovanja.",
    plusIntro: "Pro vključuje uporabo brez oglasov, načrtovalnik zmenka, tedenske načrte, izzive za zmenke, skupne priljubljene in posebne pakete idej.",
    monthly: "Mesečno",
    yearly: "Letno",
    monthSuffix: "/ mesec",
    yearSuffix: "/ leto",
    subscribeMonthly: "Začni mesečno",
    subscribeYearly: "Začni letno",
    active: "Pro je aktiven",
    nativeBilling: "Nakup v aplikaciji prek App Store ali Google Play.",
    nativeNoAdsBilling: "Enkraten nakup v aplikaciji prek App Store ali Google Play.",
    statusNote: "Spletno plačilo uporablja Stripe. iOS in Android uporabljata nakupe v aplikaciji.",
    statusStarting: "Odpira se varen nakup Pro...",
    statusVerifying: "Preverja se članstvo Pro...",
    statusConfirmed: "DateHeart Pro je aktiven.",
    statusFailed: "Nakupa Pro ni bilo mogoče začeti. Poskusite znova.",
    statusUnavailable: "Plačilo je povezano, vendar ta izdelek v trgovini še ni aktiven. Ustvarite in odobrite ID izdelka v App Store Connect ali Play Console.",
    unlockRequired: "DateHeart Pro je treba odkleniti.",
    featureNoAds: "Uporaba brez oglasov",
    featurePlanner: "Načrtovalnik zmenka",
    featureWeek: "Tedenski načrt",
    featureChallenges: "Izzivi za zmenke",
    featureSync: "Skupne priljubljene",
    featureFilters: "Več načinov načrtovanja",
    featurePacks: "Posebni paketi",
    toolsTitle: "Orodja Pro",
    tonightMode: "Način za nocoj",
    weekPlan: "Sestavi teden",
    challenge: "Nov izziv",
    copyAiPlanner: "Kopiraj načrtovalnik zmenka",
    shareFavorites: "Deli priljubljene",
    noAdsIncluded: "Pro odstrani oglase, dokler je aktiven.",
    outputCopied: "Kopirano",
  },
  ca: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro treu els anuncis i obre tota la capa de planificació per a parelles.",
    plusIntro: "Pro inclou ús sense anuncis, planificador de cita, plans setmanals, reptes de cita, preferides compartides i paquets d'idees exclusius.",
    monthly: "Mensual",
    yearly: "Anual",
    monthSuffix: "/ mes",
    yearSuffix: "/ any",
    subscribeMonthly: "Comença mensual",
    subscribeYearly: "Comença anual",
    active: "Pro actiu",
    nativeBilling: "Compra dins l'app mitjançant App Store o Google Play.",
    nativeNoAdsBilling: "Compra única dins l'app mitjançant App Store o Google Play.",
    statusNote: "El pagament web fa servir Stripe. iOS i Android fan servir compres dins l'app.",
    statusStarting: "S'obre la compra Pro segura...",
    statusVerifying: "S'està comprovant la subscripció Pro...",
    statusConfirmed: "DateHeart Pro és actiu.",
    statusFailed: "No s'ha pogut iniciar la compra Pro. Torneu-ho a provar.",
    statusUnavailable: "El pagament està connectat, però aquest producte de la botiga encara no és actiu. Creeu i aproveu els identificadors de producte a App Store Connect o Play Console.",
    unlockRequired: "Cal desbloquejar DateHeart Pro.",
    featureNoAds: "Ús sense anuncis",
    featurePlanner: "Planificador de cita",
    featureWeek: "Pla setmanal",
    featureChallenges: "Reptes de cita",
    featureSync: "Preferides compartides",
    featureFilters: "Més modes de planificació",
    featurePacks: "Paquets exclusius",
    toolsTitle: "Eines Pro",
    tonightMode: "Mode d'avui",
    weekPlan: "Crea la setmana",
    challenge: "Repte nou",
    copyAiPlanner: "Copia el planificador de cita",
    shareFavorites: "Comparteix preferides",
    noAdsIncluded: "Pro treu els anuncis mentre és actiu.",
    outputCopied: "Copiat",
  },
  eu: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro-k iragarkiak kentzen ditu eta bikoteentzako plangintza-geruza osoa irekitzen du.",
    plusIntro: "Pro-k iragarkirik gabeko erabilera, hitzordu-planifikatzailea, asteko planak, hitzordu-erronkak, partekatutako gogokoak eta ideia-pakete bereziak biltzen ditu.",
    monthly: "Hilero",
    yearly: "Urtero",
    monthSuffix: "/ hilean",
    yearSuffix: "/ urtean",
    subscribeMonthly: "Hasi hilekoa",
    subscribeYearly: "Hasi urtekoa",
    active: "Pro aktibo dago",
    nativeBilling: "Aplikazio barruko erosketa App Store edo Google Play bidez.",
    nativeNoAdsBilling: "Behin bakarreko aplikazio barruko erosketa App Store edo Google Play bidez.",
    statusNote: "Webeko ordainketak Stripe erabiltzen du. iOS eta Androidek aplikazio barruko erosketak erabiltzen dituzte.",
    statusStarting: "Pro erosketa segurua irekitzen...",
    statusVerifying: "Pro harpidetza egiaztatzen...",
    statusConfirmed: "DateHeart Pro aktibo dago.",
    statusFailed: "Ezin izan da Pro erosketa hasi. Saiatu berriro.",
    statusUnavailable: "Ordainketa konektatuta dago, baina dendako produktu hau oraindik ez dago aktibo. Sortu eta onartu produktuen identifikatzaileak App Store Connect-en edo Play Console-n.",
    unlockRequired: "DateHeart Pro desblokeatu behar da.",
    featureNoAds: "Iragarkirik gabeko erabilera",
    featurePlanner: "Hitzordu-planifikatzailea",
    featureWeek: "Asteko plana",
    featureChallenges: "Hitzordu-erronkak",
    featureSync: "Partekatutako gogokoak",
    featureFilters: "Plangintza modu gehiago",
    featurePacks: "Pakete bereziak",
    toolsTitle: "Pro tresnak",
    tonightMode: "Gaurko modua",
    weekPlan: "Sortu astea",
    challenge: "Erronka berria",
    copyAiPlanner: "Kopiatu hitzordu-planifikatzailea",
    shareFavorites: "Partekatu gogokoak",
    noAdsIncluded: "Pro-k iragarkiak kentzen ditu aktibo dagoen bitartean.",
    outputCopied: "Kopiatuta",
  },
  gl: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro retira anuncios e abre toda a capa de planificación para parellas.",
    plusIntro: "Pro inclúe uso sen anuncios, planificador de cita, plans semanais, retos de cita, favoritas compartidas e paquetes exclusivos de ideas.",
    monthly: "Mensual",
    yearly: "Anual",
    monthSuffix: "/ mes",
    yearSuffix: "/ ano",
    subscribeMonthly: "Comezar mensual",
    subscribeYearly: "Comezar anual",
    active: "Pro activo",
    nativeBilling: "Compra dentro da aplicación mediante App Store ou Google Play.",
    nativeNoAdsBilling: "Compra única dentro da aplicación mediante App Store ou Google Play.",
    statusNote: "O pagamento web usa Stripe. iOS e Android usan compras dentro da aplicación.",
    statusStarting: "Abrindo compra Pro segura...",
    statusVerifying: "Comprobando subscrición Pro...",
    statusConfirmed: "DateHeart Pro está activo.",
    statusFailed: "Non se puido iniciar a compra Pro. Tentádeo de novo.",
    statusUnavailable: "O pagamento está conectado, pero este produto da tenda aínda non está activo. Creade e aprobade os identificadores de produto en App Store Connect ou Play Console.",
    unlockRequired: "Cómpre desbloquear DateHeart Pro.",
    featureNoAds: "Uso sen anuncios",
    featurePlanner: "Planificador de cita",
    featureWeek: "Plan semanal",
    featureChallenges: "Retos de cita",
    featureSync: "Favoritas compartidas",
    featureFilters: "Máis modos de planificación",
    featurePacks: "Paquetes exclusivos",
    toolsTitle: "Ferramentas Pro",
    tonightMode: "Modo de hoxe",
    weekPlan: "Crear semana",
    challenge: "Novo reto",
    copyAiPlanner: "Copiar planificador de cita",
    shareFavorites: "Compartir favoritas",
    noAdsIncluded: "Pro retira os anuncios mentres está activo.",
    outputCopied: "Copiado",
  },
  ga: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Baineann Pro fógraí agus osclaíonn sé an tsraith iomlán pleanála do lánúineacha.",
    plusIntro: "Cuimsíonn Pro úsáid gan fhógraí, pleanálaí coinne, pleananna seachtainiúla, dúshláin choinne, ceanáin chomhroinnte agus pacáistí smaointe eisiacha.",
    monthly: "Míosúil",
    yearly: "Bliantúil",
    monthSuffix: "/ mí",
    yearSuffix: "/ bliain",
    subscribeMonthly: "Tosaigh míosúil",
    subscribeYearly: "Tosaigh bliantúil",
    active: "Tá Pro gníomhach",
    nativeBilling: "Ceannach san aip trí App Store nó Google Play.",
    nativeNoAdsBilling: "Ceannach aonuaire san aip trí App Store nó Google Play.",
    statusNote: "Úsáideann íocaíocht ghréasáin Stripe. Úsáideann iOS agus Android ceannacháin san aip.",
    statusStarting: "Ceannach slán Pro á oscailt...",
    statusVerifying: "Síntiús Pro á sheiceáil...",
    statusConfirmed: "Tá DateHeart Pro gníomhach.",
    statusFailed: "Níorbh fhéidir ceannach Pro a thosú. Bain triail eile as.",
    statusUnavailable: "Tá an íocaíocht ceangailte, ach níl an táirge siopa seo beo fós. Cruthaigh agus ceadaigh na haitheantóirí táirge in App Store Connect nó Play Console.",
    unlockRequired: "Ní mór DateHeart Pro a dhíghlasáil.",
    featureNoAds: "Úsáid gan fhógraí",
    featurePlanner: "Pleanálaí coinne",
    featureWeek: "Plean seachtainiúil",
    featureChallenges: "Dúshláin choinne",
    featureSync: "Ceanáin chomhroinnte",
    featureFilters: "Tuilleadh mód pleanála",
    featurePacks: "Pacáistí eisiacha",
    toolsTitle: "Uirlisí Pro",
    tonightMode: "Mód an lae inniu",
    weekPlan: "Tóg seachtain",
    challenge: "Dúshlán nua",
    copyAiPlanner: "Cóipeáil pleanálaí coinne",
    shareFavorites: "Comhroinn ceanáin",
    noAdsIncluded: "Baineann Pro fógraí fad atá sé gníomhach.",
    outputCopied: "Cóipeáilte",
  },
  is: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro fjarlægir auglýsingar og opnar alla skipulagslagið fyrir pör.",
    plusIntro: "Pro inniheldur notkun án auglýsinga, stefnumótaplanara, vikuleg plön, stefnumótaáskoranir, sameiginlegt uppáhald og sérstaka hugmyndapakka.",
    monthly: "Mánaðarlega",
    yearly: "Árlega",
    monthSuffix: "/ mánuð",
    yearSuffix: "/ ár",
    subscribeMonthly: "Byrja mánaðarlega",
    subscribeYearly: "Byrja árlega",
    active: "Pro virkt",
    nativeBilling: "Kaup inni í appi í gegnum App Store eða Google Play.",
    nativeNoAdsBilling: "Einu sinni kaup inni í appi í gegnum App Store eða Google Play.",
    statusNote: "Vefgreiðsla notar Stripe. iOS og Android nota kaup inni í appi.",
    statusStarting: "Opna örugg Pro kaup...",
    statusVerifying: "Athuga Pro áskrift...",
    statusConfirmed: "DateHeart Pro er virkt.",
    statusFailed: "Ekki tókst að hefja Pro kaup. Reynið aftur.",
    statusUnavailable: "Greiðsla er tengd, en þessi verslunarvara er ekki virk enn. Búið til og samþykkið vöruauðkenni í App Store Connect eða Play Console.",
    unlockRequired: "Það þarf að opna DateHeart Pro.",
    featureNoAds: "Notkun án auglýsinga",
    featurePlanner: "Stefnumótaplanari",
    featureWeek: "Vikuplan",
    featureChallenges: "Stefnumótaáskoranir",
    featureSync: "Sameiginlegt uppáhald",
    featureFilters: "Fleiri skipulagsstillingar",
    featurePacks: "Sérstakir pakkar",
    toolsTitle: "Pro verkfæri",
    tonightMode: "Hamur dagsins",
    weekPlan: "Búa til viku",
    challenge: "Ný áskorun",
    copyAiPlanner: "Afrita stefnumótaplanara",
    shareFavorites: "Deila uppáhaldi",
    noAdsIncluded: "Pro fjarlægir auglýsingar á meðan það er virkt.",
    outputCopied: "Afritað",
  },
  mt: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro ineħħi r-reklami u jiftaħ is-saff sħiħ tal-ippjanar għall-koppji.",
    plusIntro: "Pro jinkludi użu mingħajr reklami, pjanifikatur tad-date, pjanijiet ta' ġimgħa, sfidi tad-date, favoriti maqsuma u pakketti esklussivi ta' ideat.",
    monthly: "Kull xahar",
    yearly: "Kull sena",
    monthSuffix: "/ xahar",
    yearSuffix: "/ sena",
    subscribeMonthly: "Ibda kull xahar",
    subscribeYearly: "Ibda kull sena",
    active: "Pro attiv",
    nativeBilling: "Xiri fl-app permezz tal-App Store jew Google Play.",
    nativeNoAdsBilling: "Xiri ta' darba fl-app permezz tal-App Store jew Google Play.",
    statusNote: "Il-ħlas tal-web juża Stripe. iOS u Android jużaw xiri fl-app.",
    statusStarting: "Qed jinfetaħ xiri sigur ta' Pro...",
    statusVerifying: "Qed tiġi ċċekkjata s-sħubija Pro...",
    statusConfirmed: "DateHeart Pro huwa attiv.",
    statusFailed: "Ix-xiri Pro ma setax jinbeda. Erġgħu ppruvaw.",
    statusUnavailable: "Il-ħlas huwa mqabbad, iżda dan il-prodott tal-ħanut għadu mhux attiv. Oħolqu u approvaw l-identifikaturi tal-prodott f'App Store Connect jew Play Console.",
    unlockRequired: "Jeħtieġ jinfetaħ DateHeart Pro.",
    featureNoAds: "Użu mingħajr reklami",
    featurePlanner: "Pjanifikatur tad-date",
    featureWeek: "Pjan ta' ġimgħa",
    featureChallenges: "Sfidi tad-date",
    featureSync: "Favoriti maqsuma",
    featureFilters: "Aktar modi ta' ppjanar",
    featurePacks: "Pakketti esklussivi",
    toolsTitle: "Għodod Pro",
    tonightMode: "Mod ta' llum",
    weekPlan: "Ibni ġimgħa",
    challenge: "Sfida ġdida",
    copyAiPlanner: "Ikkopja l-pjanifikatur tad-date",
    shareFavorites: "Aqsam il-favoriti",
    noAdsIncluded: "Pro ineħħi r-reklami waqt li jkun attiv.",
    outputCopied: "Ikkupjat",
  },
  mk: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro ги отстранува рекламите и го отклучува целото ниво за планирање за парови.",
    plusIntro: "Pro вклучува користење без реклами, планер за состанок, неделни планови, предизвици за состаноци, заеднички омилени и ексклузивни пакети идеи.",
    monthly: "Месечно",
    yearly: "Годишно",
    monthSuffix: "/ месец",
    yearSuffix: "/ година",
    subscribeMonthly: "Започни месечно",
    subscribeYearly: "Започни годишно",
    active: "Pro е активен",
    nativeBilling: "Купување во апликација преку App Store или Google Play.",
    nativeNoAdsBilling: "Еднократно купување во апликација преку App Store или Google Play.",
    statusNote: "Веб-плаќањето користи Stripe. iOS и Android користат купувања во апликација.",
    statusStarting: "Се отвора безбедно Pro купување...",
    statusVerifying: "Се проверува Pro претплатата...",
    statusConfirmed: "DateHeart Pro е активен.",
    statusFailed: "Pro купувањето не можеше да се започне. Обидете се повторно.",
    statusUnavailable: "Плаќањето е поврзано, но овој производ во продавницата сè уште не е активен. Создајте и одобрете ги идентификаторите на производот во App Store Connect или Play Console.",
    unlockRequired: "Потребно е отклучување на DateHeart Pro.",
    featureNoAds: "Користење без реклами",
    featurePlanner: "Планер за состанок",
    featureWeek: "Неделен план",
    featureChallenges: "Предизвици за состаноци",
    featureSync: "Заеднички омилени",
    featureFilters: "Повеќе режими на планирање",
    featurePacks: "Ексклузивни пакети",
    toolsTitle: "Pro алатки",
    tonightMode: "Режим за денес",
    weekPlan: "Создај недела",
    challenge: "Нов предизвик",
    copyAiPlanner: "Копирај планер за состанок",
    shareFavorites: "Сподели омилени",
    noAdsIncluded: "Pro ги отстранува рекламите додека е активен.",
    outputCopied: "Копирано",
  },
  sq: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro heq reklamat dhe hap shtresën e plotë të planifikimit për çiftet.",
    plusIntro: "Pro përfshin përdorim pa reklama, planifikues takimi, plane javore, sfida takimesh, të preferuara të përbashkëta dhe paketa ekskluzive idesh.",
    monthly: "Mujore",
    yearly: "Vjetore",
    monthSuffix: "/ muaj",
    yearSuffix: "/ vit",
    subscribeMonthly: "Fillo mujore",
    subscribeYearly: "Fillo vjetore",
    active: "Pro aktiv",
    nativeBilling: "Blerje brenda aplikacionit përmes App Store ose Google Play.",
    nativeNoAdsBilling: "Blerje një herë brenda aplikacionit përmes App Store ose Google Play.",
    statusNote: "Pagesa në web përdor Stripe. iOS dhe Android përdorin blerje brenda aplikacionit.",
    statusStarting: "Po hapet blerja e sigurt Pro...",
    statusVerifying: "Po kontrollohet abonimi Pro...",
    statusConfirmed: "DateHeart Pro është aktiv.",
    statusFailed: "Blerja Pro nuk mund të nisej. Provoni përsëri.",
    statusUnavailable: "Pagesa është lidhur, por ky produkt dyqani nuk është ende aktiv. Krijoni dhe miratoni ID-të e produktit në App Store Connect ose Play Console.",
    unlockRequired: "Kërkohet zhbllokimi i DateHeart Pro.",
    featureNoAds: "Përdorim pa reklama",
    featurePlanner: "Planifikues takimi",
    featureWeek: "Plan javor",
    featureChallenges: "Sfida takimesh",
    featureSync: "Të preferuara të përbashkëta",
    featureFilters: "Më shumë mënyra planifikimi",
    featurePacks: "Paketa ekskluzive",
    toolsTitle: "Mjete Pro",
    tonightMode: "Modaliteti i sotëm",
    weekPlan: "Ndërto javën",
    challenge: "Sfidë e re",
    copyAiPlanner: "Kopjo planifikuesin e takimit",
    shareFavorites: "Ndaj të preferuarat",
    noAdsIncluded: "Pro heq reklamat ndërsa është aktiv.",
    outputCopied: "U kopjua",
  },
  no: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro fjerner annonser og åpner hele planleggingslaget for par.",
    plusIntro: "Pro inkluderer bruk uten annonser, dateplanlegger, ukeplaner, dateutfordringer, delte favoritter og eksklusive idépakker.",
    monthly: "Månedlig",
    yearly: "Årlig",
    monthSuffix: "/ måned",
    yearSuffix: "/ år",
    subscribeMonthly: "Start månedlig",
    subscribeYearly: "Start årlig",
    active: "Pro er aktiv",
    nativeBilling: "Kjøp i appen via App Store eller Google Play.",
    nativeNoAdsBilling: "Engangskjøp i appen via App Store eller Google Play.",
    statusNote: "Nettbetaling bruker Stripe. iOS og Android bruker kjøp i appen.",
    statusStarting: "Åpner sikkert Pro-kjøp...",
    statusVerifying: "Kontrollerer Pro-abonnement...",
    statusConfirmed: "DateHeart Pro er aktiv.",
    statusFailed: "Pro-kjøpet kunne ikke startes. Prøv igjen.",
    statusUnavailable: "Betaling er koblet til, men dette butikkproduktet er ikke publisert ennå. Opprett og godkjenn produkt-ID-er i App Store Connect eller Play Console.",
    unlockRequired: "DateHeart Pro må låses opp.",
    featureNoAds: "Annonsefritt inkludert",
    featurePlanner: "Dateplanlegger",
    featureWeek: "Ukeplan",
    featureChallenges: "Dateutfordringer",
    featureSync: "Delte favoritter",
    featureFilters: "Flere planleggingsmoduser",
    featurePacks: "Eksklusive pakker",
    toolsTitle: "Pro-verktøy",
    tonightMode: "I dag-modus",
    weekPlan: "Bygg uke",
    challenge: "Ny utfordring",
    copyAiPlanner: "Kopier dateplanlegger",
    shareFavorites: "Del favoritter",
    noAdsIncluded: "Pro fjerner annonser mens det er aktivt.",
    outputCopied: "Kopiert",
  },
  sr: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro уклања рекламе и откључава цео слој планирања за парове.",
    plusIntro: "Pro укључује коришћење без реклама, планер састанка, недељне планове, изазове за састанке, заједничко омиљено и ексклузивне пакете идеја.",
    monthly: "Месечно",
    yearly: "Годишње",
    monthSuffix: "/ месец",
    yearSuffix: "/ година",
    subscribeMonthly: "Почни месечно",
    subscribeYearly: "Почни годишње",
    active: "Pro је активан",
    nativeBilling: "Куповина у апликацији преко App Store-а или Google Play-а.",
    nativeNoAdsBilling: "Једнократна куповина у апликацији преко App Store-а или Google Play-а.",
    statusNote: "Веб плаћање користи Stripe. iOS и Android користе куповине у апликацији.",
    statusStarting: "Отвара се сигурна Pro куповина...",
    statusVerifying: "Провера Pro претплате...",
    statusConfirmed: "DateHeart Pro је активан.",
    statusFailed: "Pro куповина није могла да се покрене. Покушајте поново.",
    statusUnavailable: "Плаћање је повезано, али овај производ у продавници још није објављен. Направите и одобрите ID производа у App Store Connect-у или Play Console-у.",
    unlockRequired: "Потребно је откључати DateHeart Pro.",
    featureNoAds: "Без реклама укључено",
    featurePlanner: "Планер састанка",
    featureWeek: "Недељни план",
    featureChallenges: "Изазови за састанке",
    featureSync: "Заједничко омиљено",
    featureFilters: "Више режима планирања",
    featurePacks: "Ексклузивни пакети",
    toolsTitle: "Pro алати",
    tonightMode: "Режим за данас",
    weekPlan: "Направи недељу",
    challenge: "Нови изазов",
    copyAiPlanner: "Копирај планер састанка",
    shareFavorites: "Подели омиљено",
    noAdsIncluded: "Pro уклања рекламе док је активан.",
    outputCopied: "Копирано",
  },
  bs: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro uklanja reklame i otključava cijeli sloj planiranja za parove.",
    plusIntro: "Pro uključuje korištenje bez reklama, planer spoja, sedmične planove, izazove za spojeve, zajedničke favorite i ekskluzivne pakete ideja.",
    monthly: "Mjesečno",
    yearly: "Godišnje",
    monthSuffix: "/ mjesec",
    yearSuffix: "/ godina",
    subscribeMonthly: "Počni mjesečno",
    subscribeYearly: "Počni godišnje",
    active: "Pro je aktivan",
    nativeBilling: "Kupovina u aplikaciji putem App Store-a ili Google Play-a.",
    nativeNoAdsBilling: "Jednokratna kupovina u aplikaciji putem App Store-a ili Google Play-a.",
    statusNote: "Web plaćanje koristi Stripe. iOS i Android koriste kupovine u aplikaciji.",
    statusStarting: "Otvara se sigurna Pro kupovina...",
    statusVerifying: "Provjera Pro pretplate...",
    statusConfirmed: "DateHeart Pro je aktivan.",
    statusFailed: "Pro kupovina se nije mogla pokrenuti. Pokušajte ponovo.",
    statusUnavailable: "Plaćanje je povezano, ali ovaj proizvod u trgovini još nije objavljen. Kreirajte i odobrite ID proizvoda u App Store Connectu ili Play Consoleu.",
    unlockRequired: "Potrebno je otključati DateHeart Pro.",
    featureNoAds: "Bez reklama uključeno",
    featurePlanner: "Planer spoja",
    featureWeek: "Sedmični plan",
    featureChallenges: "Izazovi za spojeve",
    featureSync: "Zajednički favoriti",
    featureFilters: "Više načina planiranja",
    featurePacks: "Ekskluzivni paketi",
    toolsTitle: "Pro alati",
    tonightMode: "Režim za danas",
    weekPlan: "Napravi sedmicu",
    challenge: "Novi izazov",
    copyAiPlanner: "Kopiraj planer spoja",
    shareFavorites: "Podijeli favorite",
    noAdsIncluded: "Pro uklanja reklame dok je aktivan.",
    outputCopied: "Kopirano",
  },
  be: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro прыбірае рэкламу і адкрывае поўны ўзровень планавання для пар.",
    plusIntro: "Pro уключае карыстанне без рэкламы, планавальнік спаткання, тыднёвыя планы, выклікі для спатканняў, агульнае абранае і эксклюзіўныя пакеты ідэй.",
    monthly: "Штомесяц",
    yearly: "Штогод",
    monthSuffix: "/ месяц",
    yearSuffix: "/ год",
    subscribeMonthly: "Пачаць штомесяц",
    subscribeYearly: "Пачаць штогод",
    active: "Pro актыўны",
    nativeBilling: "Пакупка ў праграме праз App Store або Google Play.",
    nativeNoAdsBilling: "Аднаразовая пакупка ў праграме праз App Store або Google Play.",
    statusNote: "Вэб-аплата выкарыстоўвае Stripe. iOS і Android выкарыстоўваюць пакупкі ў праграме.",
    statusStarting: "Адкрываецца бяспечная Pro-пакупка...",
    statusVerifying: "Правяраецца Pro-падпіска...",
    statusConfirmed: "DateHeart Pro актыўны.",
    statusFailed: "Не ўдалося пачаць Pro-пакупку. Паспрабуйце яшчэ раз.",
    statusUnavailable: "Аплата падключана, але гэты прадукт крамы яшчэ не апублікаваны. Стварыце і зацвердзіце ID прадукту ў App Store Connect або Play Console.",
    unlockRequired: "Патрэбна разблакіраваць DateHeart Pro.",
    featureNoAds: "Без рэкламы ўключана",
    featurePlanner: "Планавальнік спаткання",
    featureWeek: "Тыднёвы план",
    featureChallenges: "Выклікі для спатканняў",
    featureSync: "Агульнае абранае",
    featureFilters: "Больш рэжымаў планавання",
    featurePacks: "Эксклюзіўныя пакеты",
    toolsTitle: "Pro-інструменты",
    tonightMode: "Рэжым на сёння",
    weekPlan: "Скласці тыдзень",
    challenge: "Новы выклік",
    copyAiPlanner: "Скапіраваць планавальнік",
    shareFavorites: "Падзяліцца абраным",
    noAdsIncluded: "Pro прыбірае рэкламу, пакуль ён актыўны.",
    outputCopied: "Скапіравана",
  },
  af: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro verwyder advertensies en ontsluit die volle beplanningslaag vir paartjies.",
    plusIntro: "Pro sluit advertensievrye gebruik, afspraakbeplanner, weekplanne, afspraakuitdagings, gedeelde gunstelinge en eksklusiewe ideepakke in.",
    monthly: "Maandeliks",
    yearly: "Jaarliks",
    monthSuffix: "/ maand",
    yearSuffix: "/ jaar",
    subscribeMonthly: "Begin maandeliks",
    subscribeYearly: "Begin jaarliks",
    active: "Pro aktief",
    nativeBilling: "In-app-aankoop via die App Store of Google Play.",
    nativeNoAdsBilling: "Eenmalige in-app-aankoop via die App Store of Google Play.",
    statusNote: "Webbetaling gebruik Stripe. iOS en Android gebruik in-app-aankope.",
    statusStarting: "Veilige Pro-aankoop word oopgemaak...",
    statusVerifying: "Pro-intekening word nagegaan...",
    statusConfirmed: "DateHeart Pro is aktief.",
    statusFailed: "Pro-aankoop kon nie begin nie. Probeer weer.",
    statusUnavailable: "Betaling is gekoppel, maar hierdie winkelproduk is nog nie beskikbaar nie. Skep en keur die produk-ID's in App Store Connect of Play Console goed.",
    unlockRequired: "DateHeart Pro moet ontsluit word.",
    featureNoAds: "Advertensievry ingesluit",
    featurePlanner: "Afspraakbeplanner",
    featureWeek: "Weekplan",
    featureChallenges: "Afspraakuitdagings",
    featureSync: "Gedeelde gunstelinge",
    featureFilters: "Meer beplanningsmodusse",
    featurePacks: "Eksklusiewe pakke",
    toolsTitle: "Pro-gereedskap",
    tonightMode: "Vandag-modus",
    weekPlan: "Bou week",
    challenge: "Nuwe uitdaging",
    copyAiPlanner: "Kopieer afspraakbeplanner",
    shareFavorites: "Deel gunstelinge",
    noAdsIncluded: "Pro verwyder advertensies terwyl dit aktief is.",
    outputCopied: "Gekopieer",
  },
  az: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro reklamları silir və cütlüklər üçün tam planlama qatını açır.",
    plusIntro: "Pro reklamsız istifadə, görüş planlayıcısı, həftəlik planlar, görüş çağırışları, ortaq sevimlilər və eksklüziv ideya paketlərini əhatə edir.",
    monthly: "Aylıq",
    yearly: "İllik",
    monthSuffix: "/ ay",
    yearSuffix: "/ il",
    subscribeMonthly: "Aylıq başla",
    subscribeYearly: "İllik başla",
    active: "Pro aktivdir",
    nativeBilling: "App Store və ya Google Play vasitəsilə tətbiqdaxili alış.",
    nativeNoAdsBilling: "App Store və ya Google Play vasitəsilə birdəfəlik tətbiqdaxili alış.",
    statusNote: "Veb ödəniş Stripe istifadə edir. iOS və Android tətbiqdaxili alışlardan istifadə edir.",
    statusStarting: "Təhlükəsiz Pro alışı açılır...",
    statusVerifying: "Pro abunəliyi yoxlanılır...",
    statusConfirmed: "DateHeart Pro aktivdir.",
    statusFailed: "Pro alışını başlatmaq mümkün olmadı. Yenidən cəhd edin.",
    statusUnavailable: "Ödəniş qoşulub, amma bu mağaza məhsulu hələ yayımlanmayıb. App Store Connect və ya Play Console-da məhsul ID-lərini yaradıb təsdiqləyin.",
    unlockRequired: "DateHeart Pro açılmalıdır.",
    featureNoAds: "Reklamsız istifadə daxildir",
    featurePlanner: "Görüş planlayıcısı",
    featureWeek: "Həftəlik plan",
    featureChallenges: "Görüş çağırışları",
    featureSync: "Ortaq sevimlilər",
    featureFilters: "Daha çox planlama rejimi",
    featurePacks: "Eksklüziv paketlər",
    toolsTitle: "Pro alətləri",
    tonightMode: "Bu gün rejimi",
    weekPlan: "Həftə qur",
    challenge: "Yeni çağırış",
    copyAiPlanner: "Görüş planlayıcısını kopyala",
    shareFavorites: "Sevimliləri paylaş",
    noAdsIncluded: "Pro aktiv olduğu müddətdə reklamları silir.",
    outputCopied: "Kopyalandı",
  },
  hy: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro-ն հեռացնում է գովազդները և բացում զույգերի համար ամբողջական պլանավորման շերտը։",
    plusIntro: "Pro-ն ներառում է օգտագործում առանց գովազդի, ժամադրության պլանավորիչ, շաբաթական պլաններ, ժամադրության մարտահրավերներ, ընդհանուր սիրելիներ և բացառիկ գաղափարների փաթեթներ։",
    monthly: "Ամսական",
    yearly: "Տարեկան",
    monthSuffix: "/ ամիս",
    yearSuffix: "/ տարի",
    subscribeMonthly: "Սկսել ամսական",
    subscribeYearly: "Սկսել տարեկան",
    active: "Pro-ն ակտիվ է",
    nativeBilling: "Ներհավելվածային գնում App Store-ի կամ Google Play-ի միջոցով։",
    nativeNoAdsBilling: "Մեկանգամյա ներհավելվածային գնում App Store-ի կամ Google Play-ի միջոցով։",
    statusNote: "Վեբ վճարումն օգտագործում է Stripe։ iOS-ը և Android-ը օգտագործում են ներհավելվածային գնումներ։",
    statusStarting: "Բացվում է անվտանգ Pro գնումը...",
    statusVerifying: "Ստուգվում է Pro բաժանորդագրությունը...",
    statusConfirmed: "DateHeart Pro-ն ակտիվ է։",
    statusFailed: "Pro գնումը հնարավոր չեղավ սկսել։ Փորձեք կրկին։",
    statusUnavailable: "Վճարումը միացված է, բայց այս խանութի ապրանքը դեռ հրապարակված չէ։ Ստեղծեք և հաստատեք ապրանքի ID-ները App Store Connect-ում կամ Play Console-ում։",
    unlockRequired: "Պետք է բացել DateHeart Pro-ն։",
    featureNoAds: "Առանց գովազդի ներառված է",
    featurePlanner: "Ժամադրության պլանավորիչ",
    featureWeek: "Շաբաթական պլան",
    featureChallenges: "Ժամադրության մարտահրավերներ",
    featureSync: "Ընդհանուր սիրելիներ",
    featureFilters: "Ավելի շատ պլանավորման ռեժիմներ",
    featurePacks: "Բացառիկ փաթեթներ",
    toolsTitle: "Pro գործիքներ",
    tonightMode: "Այսօրվա ռեժիմ",
    weekPlan: "Կազմել շաբաթ",
    challenge: "Նոր մարտահրավեր",
    copyAiPlanner: "Պատճենել պլանավորիչը",
    shareFavorites: "Կիսվել սիրելիներով",
    noAdsIncluded: "Pro-ն հեռացնում է գովազդները, քանի դեռ ակտիվ է։",
    outputCopied: "Պատճենված է",
  },
  ka: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro აშორებს რეკლამებს და წყვილებისთვის სრულ დაგეგმვის ფენას ხსნის.",
    plusIntro: "Pro მოიცავს რეკლამების გარეშე გამოყენებას, პაემნის დამგეგმავს, კვირის გეგმებს, პაემნის გამოწვევებს, საერთო რჩეულებს და ექსკლუზიურ იდეების პაკეტებს.",
    monthly: "თვიურად",
    yearly: "წლიურად",
    monthSuffix: "/ თვე",
    yearSuffix: "/ წელი",
    subscribeMonthly: "თვიურად დაწყება",
    subscribeYearly: "წლიურად დაწყება",
    active: "Pro აქტიურია",
    nativeBilling: "შიდა შესყიდვა App Store-ის ან Google Play-ის მეშვეობით.",
    nativeNoAdsBilling: "ერთჯერადი შიდა შესყიდვა App Store-ის ან Google Play-ის მეშვეობით.",
    statusNote: "ვებგადახდა იყენებს Stripe-ს. iOS და Android იყენებენ შიდა შესყიდვებს.",
    statusStarting: "იხსნება უსაფრთხო Pro შესყიდვა...",
    statusVerifying: "მოწმდება Pro გამოწერა...",
    statusConfirmed: "DateHeart Pro აქტიურია.",
    statusFailed: "Pro შესყიდვის დაწყება ვერ მოხერხდა. სცადეთ ხელახლა.",
    statusUnavailable: "გადახდა დაკავშირებულია, მაგრამ ეს მაღაზიის პროდუქტი ჯერ გამოქვეყნებული არ არის. შექმენით და დაამტკიცეთ პროდუქტის ID-ები App Store Connect-ში ან Play Console-ში.",
    unlockRequired: "DateHeart Pro-ს გახსნა საჭიროა.",
    featureNoAds: "რეკლამების გარეშე შედის",
    featurePlanner: "პაემნის დამგეგმავი",
    featureWeek: "კვირის გეგმა",
    featureChallenges: "პაემნის გამოწვევები",
    featureSync: "საერთო რჩეულები",
    featureFilters: "მეტი დაგეგმვის რეჟიმი",
    featurePacks: "ექსკლუზიური პაკეტები",
    toolsTitle: "Pro ინსტრუმენტები",
    tonightMode: "დღევანდელი რეჟიმი",
    weekPlan: "კვირის აწყობა",
    challenge: "ახალი გამოწვევა",
    copyAiPlanner: "დამგეგმავის კოპირება",
    shareFavorites: "რჩეულების გაზიარება",
    noAdsIncluded: "Pro აშორებს რეკლამებს, სანამ აქტიურია.",
    outputCopied: "დაკოპირდა",
  },
  am: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro ማስታወቂያዎችን ያስወግዳል እና ለጥንዶች ሙሉ የእቅድ ክፍሉን ይከፍታል።",
    plusIntro: "Pro ያለ ማስታወቂያ አጠቃቀም፣ የቀጠሮ አቅድ፣ ሳምንታዊ እቅዶች፣ የቀጠሮ ፈተናዎች፣ የጋራ ተወዳጆች እና ልዩ የሀሳብ ጥቅሎችን ያካትታል።",
    monthly: "በወር",
    yearly: "በዓመት",
    monthSuffix: "/ ወር",
    yearSuffix: "/ ዓመት",
    subscribeMonthly: "በወር ጀምር",
    subscribeYearly: "በዓመት ጀምር",
    active: "Pro ንቁ ነው",
    nativeBilling: "የመተግበሪያ ውስጥ ግዢ በApp Store ወይም Google Play በኩል።",
    nativeNoAdsBilling: "አንድ ጊዜ የመተግበሪያ ውስጥ ግዢ በApp Store ወይም Google Play በኩል።",
    statusNote: "የድር ክፍያ Stripe ይጠቀማል። iOS እና Android የመተግበሪያ ውስጥ ግዢ ይጠቀማሉ።",
    statusStarting: "ደህንነቱ የተጠበቀ Pro ግዢ ይከፈታል...",
    statusVerifying: "የPro ምዝገባ ይፈተሻል...",
    statusConfirmed: "DateHeart Pro ንቁ ነው።",
    statusFailed: "የPro ግዢ መጀመር አልተቻለም። እንደገና ይሞክሩ።",
    statusUnavailable: "ክፍያ ተገናኝቷል፣ ግን ይህ የመደብር ምርት ገና አልተለቀቀም። የምርት መለያዎችን በApp Store Connect ወይም Play Console ውስጥ ፍጠሩ እና አጽድቁ።",
    unlockRequired: "DateHeart Pro መክፈት ያስፈልጋል።",
    featureNoAds: "ያለ ማስታወቂያ ተካቷል",
    featurePlanner: "የቀጠሮ አቅድ",
    featureWeek: "ሳምንታዊ እቅድ",
    featureChallenges: "የቀጠሮ ፈተናዎች",
    featureSync: "የጋራ ተወዳጆች",
    featureFilters: "ተጨማሪ የእቅድ ሁነታዎች",
    featurePacks: "ልዩ ጥቅሎች",
    toolsTitle: "የPro መሳሪያዎች",
    tonightMode: "የዛሬ ሁነታ",
    weekPlan: "ሳምንት አቅድ",
    challenge: "አዲስ ፈተና",
    copyAiPlanner: "የቀጠሮ አቅዱን ቅዳ",
    shareFavorites: "ተወዳጆችን አጋራ",
    noAdsIncluded: "Pro ንቁ እያለ ማስታወቂያዎችን ያስወግዳል።",
    outputCopied: "ተቀድቷል",
  },
  om: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro beeksisa ni haqa, kutaa karooraa guutuu warra jaalallaniif ni bana.",
    plusIntro: "Pro fayyadama beeksisa malee, karoorsaa walargii, karoora torban, qormaata walargii, filannoo waliinii fi paakeejii yaadaa addaa of keessaa qaba.",
    monthly: "Ji'aan",
    yearly: "Waggaadhaan",
    monthSuffix: "/ ji'a",
    yearSuffix: "/ waggaa",
    subscribeMonthly: "Ji'aan jalqabi",
    subscribeYearly: "Waggaadhaan jalqabi",
    active: "Pro ni hojjeta",
    nativeBilling: "Bittaa appii keessaa karaa App Store yookaan Google Play.",
    nativeNoAdsBilling: "Bittaa yeroo tokko appii keessaa karaa App Store yookaan Google Play.",
    statusNote: "Kaffaltiin weebii Stripe fayyadama. iOS fi Android bittaa appii keessaa fayyadamu.",
    statusStarting: "Bittaa Pro nageenya qabu banaa jira...",
    statusVerifying: "Miseensummaa Pro mirkaneessaa jira...",
    statusConfirmed: "DateHeart Pro ni hojjeta.",
    statusFailed: "Bittaa Pro jalqabuu hin dandeenye. Irra deebi'aa.",
    statusUnavailable: "Kaffaltiin walqabateera, garuu oomishni mana gurgurtaa kun ammallee hin maxxanfamne. Product ID App Store Connect yookaan Play Console keessatti uumaa fi mirkaneessaa.",
    unlockRequired: "DateHeart Pro banuun barbaachisa.",
    featureNoAds: "Beeksisa malee ni dabalata",
    featurePlanner: "Karoorsaa walargii",
    featureWeek: "Karoora torban",
    featureChallenges: "Qormaata walargii",
    featureSync: "Filannoo waliinii",
    featureFilters: "Haalota karooraa dabalataa",
    featurePacks: "Paakeejii addaa",
    toolsTitle: "Meeshaalee Pro",
    tonightMode: "Haalata har'aa",
    weekPlan: "Torban qopheessi",
    challenge: "Qormaata haaraa",
    copyAiPlanner: "Karoorsaa walargii waraabi",
    shareFavorites: "Filannoo qoodi",
    noAdsIncluded: "Pro yeroo hojjatu beeksisa ni haqa.",
    outputCopied: "Waraabame",
  },
  so: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro wuxuu saaraa xayeysiisyada wuxuuna furaa lakabka qorsheynta oo dhan ee lammaanaha.",
    plusIntro: "Pro waxa ku jira isticmaal xayeysiis la'aan, qorsheeye shukaansi, qorshayaal toddobaadle ah, caqabado shukaansi, kuwa la jecel yahay oo wadajir ah iyo xirmooyin fikrado gaar ah.",
    monthly: "Bille",
    yearly: "Sannadle",
    monthSuffix: "/ bil",
    yearSuffix: "/ sanad",
    subscribeMonthly: "Bilow bille",
    subscribeYearly: "Bilow sannadle",
    active: "Pro waa firfircoon yahay",
    nativeBilling: "Iib gudaha app-ka ah oo loo maro App Store ama Google Play.",
    nativeNoAdsBilling: "Iib hal mar gudaha app-ka ah oo loo maro App Store ama Google Play.",
    statusNote: "Bixinta webku waxay isticmaashaa Stripe. iOS iyo Android waxay isticmaalaan iib gudaha app-ka ah.",
    statusStarting: "Waxaa furmaya iibsiga Pro ee ammaan ah...",
    statusVerifying: "Waxaa la hubinayaa rukhsadda Pro...",
    statusConfirmed: "DateHeart Pro waa firfircoon yahay.",
    statusFailed: "Iibsiga Pro lama bilaabi karin. Mar kale isku day.",
    statusUnavailable: "Bixinta waa la xidhay, laakiin badeecaddan dukaanka weli ma noola. Samee oo ansixi Product ID-yada App Store Connect ama Play Console.",
    unlockRequired: "DateHeart Pro waa in la furaa.",
    featureNoAds: "Xayeysiis la'aan ayaa ku jirta",
    featurePlanner: "Qorsheeye shukaansi",
    featureWeek: "Qorshe toddobaad",
    featureChallenges: "Caqabado shukaansi",
    featureSync: "Kuwa la jecel yahay oo wadajir ah",
    featureFilters: "Habab qorsheyn oo dheeraad ah",
    featurePacks: "Xirmooyin gaar ah",
    toolsTitle: "Qalabka Pro",
    tonightMode: "Habka maanta",
    weekPlan: "Dhiso toddobaad",
    challenge: "Caqabad cusub",
    copyAiPlanner: "Nuqul qorsheeyaha shukaansi",
    shareFavorites: "Wadaag kuwa la jecel yahay",
    noAdsIncluded: "Pro wuxuu saaraa xayeysiisyada inta uu firfircoon yahay.",
    outputCopied: "La nuqulay",
  },
  rw: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro ikuraho amatangazo kandi igafungura igice cyose cyo gutegura ku bakundana.",
    plusIntro: "Pro irimo gukoresha nta matangazo, utegura gahunda, gahunda z'icyumweru, ibibazo by'urukundo, ibyo mwakunze musangiye n'udupaki tw'ibitekerezo byihariye.",
    monthly: "Buri kwezi",
    yearly: "Buri mwaka",
    monthSuffix: "/ kwezi",
    yearSuffix: "/ mwaka",
    subscribeMonthly: "Tangira buri kwezi",
    subscribeYearly: "Tangira buri mwaka",
    active: "Pro irakora",
    nativeBilling: "Kugura muri porogaramu binyuze kuri App Store cyangwa Google Play.",
    nativeNoAdsBilling: "Kugura rimwe muri porogaramu binyuze kuri App Store cyangwa Google Play.",
    statusNote: "Kwishyura ku rubuga bikoresha Stripe. iOS na Android bikoresha kugura muri porogaramu.",
    statusStarting: "Kugura Pro mu mutekano birafungurwa...",
    statusVerifying: "Ifatabuguzi rya Pro rirasuzumwa...",
    statusConfirmed: "DateHeart Pro irakora.",
    statusFailed: "Kugura Pro ntibyabashije gutangira. Ongera ugerageze.",
    statusUnavailable: "Kwishyura byahujwe, ariko iki gicuruzwa cy'ububiko ntikiratangazwa. Kora kandi wemeze Product ID muri App Store Connect cyangwa Play Console.",
    unlockRequired: "DateHeart Pro igomba gufungurwa.",
    featureNoAds: "Nta matangazo harimo",
    featurePlanner: "Utegura gahunda",
    featureWeek: "Gahunda y'icyumweru",
    featureChallenges: "Ibibazo by'urukundo",
    featureSync: "Ibyakunzwe musangiye",
    featureFilters: "Ubundi buryo bwo gutegura",
    featurePacks: "Udupaki twihariye",
    toolsTitle: "Ibikoresho bya Pro",
    tonightMode: "Uburyo bw'uyu munsi",
    weekPlan: "Tegura icyumweru",
    challenge: "Ikibazo gishya",
    copyAiPlanner: "Koporora utegura gahunda",
    shareFavorites: "Sangiza ibyukunzwe",
    noAdsIncluded: "Pro ikuraho amatangazo igihe ikora.",
    outputCopied: "Byakoporowe",
  },
  ha: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro yana cire talla kuma yana buɗe cikakken sashen shiryawa ga ma'aurata.",
    plusIntro: "Pro ya haɗa amfani ba tare da talla ba, mai tsara soyayya, shirin mako, ƙalubalen soyayya, abubuwan so na haɗin gwiwa da fakitin ra'ayoyi na musamman.",
    monthly: "Kowane wata",
    yearly: "Kowace shekara",
    monthSuffix: "/ wata",
    yearSuffix: "/ shekara",
    subscribeMonthly: "Fara kowane wata",
    subscribeYearly: "Fara kowace shekara",
    active: "Pro yana aiki",
    nativeBilling: "Saye cikin manhaja ta App Store ko Google Play.",
    nativeNoAdsBilling: "Saye sau ɗaya cikin manhaja ta App Store ko Google Play.",
    statusNote: "Biyan kuɗi a yanar gizo yana amfani da Stripe. iOS da Android suna amfani da saye cikin manhaja.",
    statusStarting: "Ana buɗe sayen Pro mai tsaro...",
    statusVerifying: "Ana duba rajistar Pro...",
    statusConfirmed: "DateHeart Pro yana aiki.",
    statusFailed: "Ba a iya fara sayen Pro ba. Sake gwadawa.",
    statusUnavailable: "An haɗa biyan kuɗi, amma wannan samfurin shago bai fara aiki ba. Ƙirƙiri kuma amince da Product ID a App Store Connect ko Play Console.",
    unlockRequired: "Ana buƙatar buɗe DateHeart Pro.",
    featureNoAds: "Ba tare da talla ba yana ciki",
    featurePlanner: "Mai tsara soyayya",
    featureWeek: "Shirin mako",
    featureChallenges: "Ƙalubalen soyayya",
    featureSync: "Abubuwan so na haɗin gwiwa",
    featureFilters: "Ƙarin hanyoyin shiryawa",
    featurePacks: "Fakitin musamman",
    toolsTitle: "Kayan aikin Pro",
    tonightMode: "Yanayin yau",
    weekPlan: "Gina mako",
    challenge: "Sabon ƙalubale",
    copyAiPlanner: "Kwafa mai tsara soyayya",
    shareFavorites: "Raba abubuwan so",
    noAdsIncluded: "Pro yana cire talla yayin da yake aiki.",
    outputCopied: "An kwafa",
  },
  ig: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro na-ewepụ mgbasa ozi ma meghee oyi akwa atụmatụ zuru ezu maka di na nwunye.",
    plusIntro: "Pro gụnyere iji na-enweghị mgbasa ozi, onye nhazi ịhụnanya, atụmatụ izu, ihe ịma aka ịhụnanya, ọkacha mmasị ekekọrịtara na ngwugwu echiche pụrụ iche.",
    monthly: "Kwa ọnwa",
    yearly: "Kwa afọ",
    monthSuffix: "/ ọnwa",
    yearSuffix: "/ afọ",
    subscribeMonthly: "Bido kwa ọnwa",
    subscribeYearly: "Bido kwa afọ",
    active: "Pro na-arụ ọrụ",
    nativeBilling: "Ịzụta n'ime ngwa site na App Store ma ọ bụ Google Play.",
    nativeNoAdsBilling: "Ịzụta otu ugboro n'ime ngwa site na App Store ma ọ bụ Google Play.",
    statusNote: "Ịkwụ ụgwọ webụ na-eji Stripe. iOS na Android na-eji ịzụta n'ime ngwa.",
    statusStarting: "A na-emepe ịzụta Pro dị nchebe...",
    statusVerifying: "A na-enyocha ndebanye Pro...",
    statusConfirmed: "DateHeart Pro na-arụ ọrụ.",
    statusFailed: "A naghị amalite ịzụta Pro. Gbalịa ọzọ.",
    statusUnavailable: "Ejikọtala ịkwụ ụgwọ, mana ngwaahịa ụlọ ahịa a adịghị ndụ. Mepụta ma kwado Product ID na App Store Connect ma ọ bụ Play Console.",
    unlockRequired: "A chọrọ imeghe DateHeart Pro.",
    featureNoAds: "Enweghị mgbasa ozi gụnyere",
    featurePlanner: "Onye nhazi ịhụnanya",
    featureWeek: "Atụmatụ izu",
    featureChallenges: "Ihe ịma aka ịhụnanya",
    featureSync: "Ọkacha mmasị ekekọrịtara",
    featureFilters: "Ụzọ atụmatụ ndị ọzọ",
    featurePacks: "Ngwugwu pụrụ iche",
    toolsTitle: "Ngwaọrụ Pro",
    tonightMode: "Ụdị taa",
    weekPlan: "Wulite izu",
    challenge: "Ihe ịma aka ọhụrụ",
    copyAiPlanner: "Detuo onye nhazi ịhụnanya",
    shareFavorites: "Kekọrịta ọkacha mmasị",
    noAdsIncluded: "Pro na-ewepụ mgbasa ozi mgbe ọ na-arụ ọrụ.",
    outputCopied: "Edepụtaghachiri",
  },
  yo: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro yọ ìpolówó kuro, o si ṣí ipele eto pipe fun awọn tọkọtaya.",
    plusIntro: "Pro ni lilo laisi ìpolówó, alakoso eto ìfẹ́, eto ọsẹ, ìpenija ìfẹ́, ayanfẹ apapọ ati akopọ ero pataki.",
    monthly: "Oṣooṣu",
    yearly: "Ọdọọdun",
    monthSuffix: "/ oṣu",
    yearSuffix: "/ ọdun",
    subscribeMonthly: "Bẹrẹ oṣooṣu",
    subscribeYearly: "Bẹrẹ ọdọọdun",
    active: "Pro n ṣiṣẹ",
    nativeBilling: "Rira inu ohun elo nipasẹ App Store tabi Google Play.",
    nativeNoAdsBilling: "Rira lẹẹkan inu ohun elo nipasẹ App Store tabi Google Play.",
    statusNote: "Ìsanwó oju opo wẹẹbu n lo Stripe. iOS ati Android n lo rira inu ohun elo.",
    statusStarting: "A n ṣí rira Pro to ni aabo...",
    statusVerifying: "A n ṣayẹwo alabapin Pro...",
    statusConfirmed: "DateHeart Pro n ṣiṣẹ.",
    statusFailed: "A ko le bẹrẹ rira Pro. Gbiyanju lẹẹkansi.",
    statusUnavailable: "Ìsanwó ti so mọ́, ṣugbọn ọja ile itaja yii ko tíì ṣiṣẹ. Ṣẹda ki o fọwọsi Product ID ni App Store Connect tabi Play Console.",
    unlockRequired: "A nilo ṣiṣi DateHeart Pro.",
    featureNoAds: "Laisi ìpolówó wa ninu rẹ",
    featurePlanner: "Alakoso eto ìfẹ́",
    featureWeek: "Eto ọsẹ",
    featureChallenges: "Ìpenija ìfẹ́",
    featureSync: "Ayanfẹ apapọ",
    featureFilters: "Awọn ipo eto diẹ sii",
    featurePacks: "Akopọ pataki",
    toolsTitle: "Irinṣẹ Pro",
    tonightMode: "Ipo oni",
    weekPlan: "Kọ ọsẹ",
    challenge: "Ìpenija tuntun",
    copyAiPlanner: "Daakọ alakoso eto ìfẹ́",
    shareFavorites: "Pín ayanfẹ",
    noAdsIncluded: "Pro yọ ìpolówó nigba ti o n ṣiṣẹ.",
    outputCopied: "Ti daakọ",
  },
  zu: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro isusa izikhangiso futhi ivula lonke ungqimba lokuhlela lwezithandani.",
    plusIntro: "Pro ifaka ukusebenzisa ngaphandle kwezikhangiso, umhleli wothando, izinhlelo zeviki, izinselelo zothando, okuthandwayo okwabiwe namaphakethe emibono akhethekile.",
    monthly: "Nyanga zonke",
    yearly: "Minyaka yonke",
    monthSuffix: "/ inyanga",
    yearSuffix: "/ unyaka",
    subscribeMonthly: "Qala nyanga zonke",
    subscribeYearly: "Qala minyaka yonke",
    active: "Pro iyasebenza",
    nativeBilling: "Ukuthenga ngaphakathi kohlelo lokusebenza nge-App Store noma Google Play.",
    nativeNoAdsBilling: "Ukuthenga kanye ngaphakathi kohlelo lokusebenza nge-App Store noma Google Play.",
    statusNote: "Inkokhelo yewebhu isebenzisa i-Stripe. iOS ne-Android zisebenzisa ukuthenga ngaphakathi kohlelo lokusebenza.",
    statusStarting: "Kuvulwa ukuthenga kwe-Pro okuphephile...",
    statusVerifying: "Kuhlolwa ukubhalisa kwe-Pro...",
    statusConfirmed: "DateHeart Pro iyasebenza.",
    statusFailed: "Ukuthenga kwe-Pro akukwazanga ukuqala. Zama futhi.",
    statusUnavailable: "Inkokhelo ixhunyiwe, kodwa lo mkhiqizo wesitolo awukasebenzi. Dala futhi ugunyaze ama-Product ID ku-App Store Connect noma Play Console.",
    unlockRequired: "Kudingeka ukuvula i-DateHeart Pro.",
    featureNoAds: "Ukungabi nezikhangiso kufakiwe",
    featurePlanner: "Umhleli wothando",
    featureWeek: "Uhlelo lweviki",
    featureChallenges: "Izinselelo zothando",
    featureSync: "Okuthandwayo okwabiwe",
    featureFilters: "Ezinye izindlela zokuhlela",
    featurePacks: "Amaphakethe akhethekile",
    toolsTitle: "Amathuluzi e-Pro",
    tonightMode: "Imodi yanamuhla",
    weekPlan: "Yakha iviki",
    challenge: "Inselelo entsha",
    copyAiPlanner: "Kopisha umhleli wothando",
    shareFavorites: "Yabelana ngokuthandwayo",
    noAdsIncluded: "Pro isusa izikhangiso uma isebenza.",
    outputCopied: "Kukopishiwe",
  },
  as: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro-এ বিজ্ঞাপন আঁতৰায় আৰু যোৰালোকৰ বাবে সম্পূৰ্ণ পৰিকল্পনা স্তৰ খোলে।",
    plusIntro: "Pro-ত বিজ্ঞাপনবিহীন ব্যৱহাৰ, ডেট পৰিকল্পনাকাৰী, সাপ্তাহিক পৰিকল্পনা, ডেট প্ৰত্যাহ্বান, ভাগ কৰা প্ৰিয় আৰু বিশেষ ধাৰণা পেক আছে।",
    monthly: "মাহিলি",
    yearly: "বাৰ্ষিক",
    monthSuffix: "/ মাহ",
    yearSuffix: "/ বছৰ",
    subscribeMonthly: "মাহিলি আৰম্ভ",
    subscribeYearly: "বাৰ্ষিক আৰম্ভ",
    active: "Pro সক্ৰিয়",
    nativeBilling: "App Store বা Google Play-ৰ জৰিয়তে অ্যাপৰ ভিতৰত ক্ৰয়।",
    nativeNoAdsBilling: "App Store বা Google Play-ৰ জৰিয়তে একবাৰৰ অ্যাপৰ ভিতৰত ক্ৰয়।",
    statusNote: "ৱেব পেমেণ্টে Stripe ব্যৱহাৰ কৰে। iOS আৰু Android-এ অ্যাপৰ ভিতৰৰ ক্ৰয় ব্যৱহাৰ কৰে।",
    statusStarting: "সুৰক্ষিত Pro ক্ৰয় খোলা হৈছে...",
    statusVerifying: "Pro সদস্যতা পৰীক্ষা কৰা হৈছে...",
    statusConfirmed: "DateHeart Pro সক্ৰিয়।",
    statusFailed: "Pro ক্ৰয় আৰম্ভ কৰিব পৰা নগ'ল। পুনৰ চেষ্টা কৰক।",
    statusUnavailable: "পেমেণ্ট সংযুক্ত, কিন্তু এই দোকানৰ উৎপাদন এতিয়াও মুকলি নহয়। App Store Connect বা Play Console-ত উৎপাদন ID সৃষ্টি আৰু অনুমোদন কৰক।",
    unlockRequired: "DateHeart Pro খুলিব লাগিব।",
    featureNoAds: "বিজ্ঞাপনবিহীন অন্তৰ্ভুক্ত",
    featurePlanner: "ডেট পৰিকল্পনাকাৰী",
    featureWeek: "সাপ্তাহিক পৰিকল্পনা",
    featureChallenges: "ডেট প্ৰত্যাহ্বান",
    featureSync: "ভাগ কৰা প্ৰিয়",
    featureFilters: "অধিক পৰিকল্পনা ধৰণ",
    featurePacks: "বিশেষ পেক",
    toolsTitle: "Pro সঁজুলি",
    tonightMode: "আজিৰ ধৰণ",
    weekPlan: "সপ্তাহ গঢ়ক",
    challenge: "নতুন প্ৰত্যাহ্বান",
    copyAiPlanner: "ডেট পৰিকল্পনাকাৰী নকল",
    shareFavorites: "প্ৰিয় শ্বেয়াৰ",
    noAdsIncluded: "Pro সক্ৰিয় থাকিলে বিজ্ঞাপন আঁতৰায়।",
    outputCopied: "নকল কৰা হ'ল",
  },
  my: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro သည် ကြော်ငြာများကို ဖယ်ရှားပြီး ချစ်သူစုံတွဲများအတွက် စီစဉ်မှုအလွှာအပြည့်ကို ဖွင့်ပေးသည်။",
    plusIntro: "Pro တွင် ကြော်ငြာမပါအသုံးပြုခြင်း၊ ဒိတ်စီစဉ်သူ၊ အပတ်စဉ်အစီအစဉ်၊ ဒိတ်စိန်ခေါ်မှုများ၊ မျှဝေထားသော နှစ်သက်ရာများနှင့် အထူးအကြံစုများ ပါဝင်သည်။",
    monthly: "လစဉ်",
    yearly: "နှစ်စဉ်",
    monthSuffix: "/ လ",
    yearSuffix: "/ နှစ်",
    subscribeMonthly: "လစဉ် စတင်မည်",
    subscribeYearly: "နှစ်စဉ် စတင်မည်",
    active: "Pro အသက်ဝင်နေသည်",
    nativeBilling: "App Store သို့မဟုတ် Google Play မှ အက်ပ်အတွင်းဝယ်ယူမှု။",
    nativeNoAdsBilling: "App Store သို့မဟုတ် Google Play မှ တစ်ကြိမ် အက်ပ်အတွင်းဝယ်ယူမှု။",
    statusNote: "ဝက်ဘ်ငွေပေးချေမှုသည် Stripe ကို သုံးသည်။ iOS နှင့် Android သည် အက်ပ်အတွင်းဝယ်ယူမှုကို သုံးသည်။",
    statusStarting: "လုံခြုံသော Pro ဝယ်ယူမှု ဖွင့်နေသည်...",
    statusVerifying: "Pro စာရင်းသွင်းမှု စစ်ဆေးနေသည်...",
    statusConfirmed: "DateHeart Pro အသက်ဝင်နေသည်။",
    statusFailed: "Pro ဝယ်ယူမှု စတင်မရပါ။ ထပ်မံကြိုးစားပါ။",
    statusUnavailable: "ငွေပေးချေမှု ချိတ်ဆက်ပြီးဖြစ်သော်လည်း ဤစတိုးထုတ်ကုန် မထုတ်ပြန်သေးပါ။ App Store Connect သို့မဟုတ် Play Console တွင် ထုတ်ကုန် ID များ ဖန်တီးပြီး အတည်ပြုပါ။",
    unlockRequired: "DateHeart Pro ကို ဖွင့်ရန် လိုအပ်သည်။",
    featureNoAds: "ကြော်ငြာမပါ ပါဝင်သည်",
    featurePlanner: "ဒိတ်စီစဉ်သူ",
    featureWeek: "အပတ်စဉ်အစီအစဉ်",
    featureChallenges: "ဒိတ်စိန်ခေါ်မှု",
    featureSync: "မျှဝေထားသော နှစ်သက်ရာ",
    featureFilters: "နောက်ထပ် စီစဉ်မှုမုဒ်",
    featurePacks: "အထူးအစု",
    toolsTitle: "Pro ကိရိယာများ",
    tonightMode: "ဒီနေ့မုဒ်",
    weekPlan: "အပတ် စီစဉ်မည်",
    challenge: "စိန်ခေါ်မှုအသစ်",
    copyAiPlanner: "ဒိတ်စီစဉ်သူ ကူးယူမည်",
    shareFavorites: "နှစ်သက်ရာ မျှဝေမည်",
    noAdsIncluded: "Pro အသက်ဝင်နေချိန် ကြော်ငြာများ ဖယ်ရှားသည်။",
    outputCopied: "ကူးယူပြီး",
  },
  km: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro ដកពាណិជ្ជកម្ម និងបើកស្រទាប់រៀបចំពេញលេញសម្រាប់គូស្នេហ៍។",
    plusIntro: "Pro រួមមានការប្រើគ្មានពាណិជ្ជកម្ម អ្នករៀបចំណាត់ជួប ផែនការប្រចាំសប្តាហ៍ បញ្ហាប្រឈមណាត់ជួប ចូលចិត្តរួម និងកញ្ចប់គំនិតពិសេស។",
    monthly: "ប្រចាំខែ",
    yearly: "ប្រចាំឆ្នាំ",
    monthSuffix: "/ ខែ",
    yearSuffix: "/ ឆ្នាំ",
    subscribeMonthly: "ចាប់ផ្តើមប្រចាំខែ",
    subscribeYearly: "ចាប់ផ្តើមប្រចាំឆ្នាំ",
    active: "Pro កំពុងដំណើរការ",
    nativeBilling: "ការទិញក្នុងកម្មវិធីតាម App Store ឬ Google Play។",
    nativeNoAdsBilling: "ការទិញក្នុងកម្មវិធីម្តងតាម App Store ឬ Google Play។",
    statusNote: "ការទូទាត់លើបណ្តាញប្រើ Stripe។ iOS និង Android ប្រើការទិញក្នុងកម្មវិធី។",
    statusStarting: "កំពុងបើកការទិញ Pro សុវត្ថិភាព...",
    statusVerifying: "កំពុងពិនិត្យការជាវ Pro...",
    statusConfirmed: "DateHeart Pro កំពុងដំណើរការ។",
    statusFailed: "មិនអាចចាប់ផ្តើមការទិញ Pro បានទេ។ សូមព្យាយាមម្តងទៀត។",
    statusUnavailable: "ការទូទាត់បានភ្ជាប់ ប៉ុន្តែផលិតផលក្នុងហាងនេះមិនទាន់ផ្សាយទេ។ បង្កើត និងអនុម័តលេខសម្គាល់ផលិតផលក្នុង App Store Connect ឬ Play Console។",
    unlockRequired: "ត្រូវបើក DateHeart Pro។",
    featureNoAds: "គ្មានពាណិជ្ជកម្មរួមបញ្ចូល",
    featurePlanner: "អ្នករៀបចំណាត់ជួប",
    featureWeek: "ផែនការសប្តាហ៍",
    featureChallenges: "បញ្ហាប្រឈមណាត់ជួប",
    featureSync: "ចូលចិត្តរួម",
    featureFilters: "របៀបរៀបចំបន្ថែម",
    featurePacks: "កញ្ចប់ពិសេស",
    toolsTitle: "ឧបករណ៍ Pro",
    tonightMode: "របៀបថ្ងៃនេះ",
    weekPlan: "រៀបចំសប្តាហ៍",
    challenge: "បញ្ហាប្រឈមថ្មី",
    copyAiPlanner: "ចម្លងអ្នករៀបចំណាត់ជួប",
    shareFavorites: "ចែករំលែកចូលចិត្ត",
    noAdsIncluded: "Pro ដកពាណិជ្ជកម្មពេលកំពុងដំណើរការ។",
    outputCopied: "បានចម្លង",
  },
  lo: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro ລຶບໂຄສະນາ ແລະເປີດຊັ້ນວາງແຜນເຕັມສໍາລັບຄູ່ຮັກ.",
    plusIntro: "Pro ມີການໃຊ້ບໍ່ມີໂຄສະນາ, ຜູ້ວາງແຜນນັດ, ແຜນອາທິດ, ຄວາມທ້າທາຍນັດ, ລາຍການມັກຮ່ວມ ແລະຊຸດແນວຄິດພິເສດ.",
    monthly: "ລາຍເດືອນ",
    yearly: "ລາຍປີ",
    monthSuffix: "/ ເດືອນ",
    yearSuffix: "/ ປີ",
    subscribeMonthly: "ເລີ່ມລາຍເດືອນ",
    subscribeYearly: "ເລີ່ມລາຍປີ",
    active: "Pro ເປີດໃຊ້",
    nativeBilling: "ການຊື້ໃນແອັບຜ່ານ App Store ຫຼື Google Play.",
    nativeNoAdsBilling: "ການຊື້ໃນແອັບຄັ້ງດຽວຜ່ານ App Store ຫຼື Google Play.",
    statusNote: "ການຊໍາລະເງິນເວັບໃຊ້ Stripe. iOS ແລະ Android ໃຊ້ການຊື້ໃນແອັບ.",
    statusStarting: "ກໍາລັງເປີດການຊື້ Pro ປອດໄພ...",
    statusVerifying: "ກໍາລັງກວດກາສະມາຊິກ Pro...",
    statusConfirmed: "DateHeart Pro ເປີດໃຊ້.",
    statusFailed: "ບໍ່ສາມາດເລີ່ມການຊື້ Pro ໄດ້. ລອງອີກຄັ້ງ.",
    statusUnavailable: "ການຊໍາລະເງິນເຊື່ອມແລ້ວ, ແຕ່ຜະລິດຕະພັນໃນຮ້ານນີ້ຍັງບໍ່ເຜີຍແຜ່. ສ້າງ ແລະອະນຸມັດ ID ຜະລິດຕະພັນໃນ App Store Connect ຫຼື Play Console.",
    unlockRequired: "ຕ້ອງເປີດ DateHeart Pro.",
    featureNoAds: "ລວມບໍ່ມີໂຄສະນາ",
    featurePlanner: "ຜູ້ວາງແຜນນັດ",
    featureWeek: "ແຜນອາທິດ",
    featureChallenges: "ຄວາມທ້າທາຍນັດ",
    featureSync: "ລາຍການມັກຮ່ວມ",
    featureFilters: "ໂໝດວາງແຜນເພີ່ມ",
    featurePacks: "ຊຸດພິເສດ",
    toolsTitle: "ເຄື່ອງມື Pro",
    tonightMode: "ໂໝດມື້ນີ້",
    weekPlan: "ສ້າງອາທິດ",
    challenge: "ຄວາມທ້າທາຍໃໝ່",
    copyAiPlanner: "ຄັດລອກຜູ້ວາງແຜນນັດ",
    shareFavorites: "ແບ່ງປັນລາຍການມັກ",
    noAdsIncluded: "Pro ລຶບໂຄສະນາເມື່ອເປີດໃຊ້.",
    outputCopied: "ຄັດລອກແລ້ວ",
  },
  or: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro ବିଜ୍ଞାପନ ହଟାଏ ଏବଂ ଜୋଡ଼ିମାନଙ୍କ ପାଇଁ ପୂରା ପରିକଳ୍ପନା ସ୍ତର ଖୋଲେ।",
    plusIntro: "Pro ରେ ବିଜ୍ଞାପନ ବିନା ବ୍ୟବହାର, ଡେଟ ପରିକଳ୍ପନାକାରୀ, ସାପ୍ତାହିକ ପରିକଳ୍ପନା, ଡେଟ ଚ୍ୟାଲେଞ୍ଜ, ଭାଗ ହୋଇଥିବା ପସନ୍ଦ ଓ ବିଶେଷ ଧାରଣା ପ୍ୟାକ ଅଛି।",
    monthly: "ମାସିକ",
    yearly: "ବାର୍ଷିକ",
    monthSuffix: "/ ମାସ",
    yearSuffix: "/ ବର୍ଷ",
    subscribeMonthly: "ମାସିକ ଆରମ୍ଭ",
    subscribeYearly: "ବାର୍ଷିକ ଆରମ୍ଭ",
    active: "Pro ସକ୍ରିୟ",
    nativeBilling: "App Store କିମ୍ବା Google Play ଦ୍ୱାରା ଆପ୍ ଭିତର କ୍ରୟ।",
    nativeNoAdsBilling: "App Store କିମ୍ବା Google Play ଦ୍ୱାରା ଏକଥର ଆପ୍ ଭିତର କ୍ରୟ।",
    statusNote: "ୱେବ ଦେୟ Stripe ବ୍ୟବହାର କରେ। iOS ଓ Android ଆପ୍ ଭିତର କ୍ରୟ ବ୍ୟବହାର କରେ।",
    statusStarting: "ସୁରକ୍ଷିତ Pro କ୍ରୟ ଖୋଲୁଛି...",
    statusVerifying: "Pro ସଦସ୍ୟତା ଯାଞ୍ଚ ହେଉଛି...",
    statusConfirmed: "DateHeart Pro ସକ୍ରିୟ।",
    statusFailed: "Pro କ୍ରୟ ଆରମ୍ଭ ହୋଇପାରିଲା ନାହିଁ। ପୁନି ଚେଷ୍ଟା କରନ୍ତୁ।",
    statusUnavailable: "ଦେୟ ଯୋଡ଼ାଯାଇଛି, କିନ୍ତୁ ଏହି ଦୋକାନ ଉତ୍ପାଦ ଏପର୍ଯ୍ୟନ୍ତ ପ୍ରକାଶିତ ନୁହେଁ। App Store Connect କିମ୍ବା Play Console ରେ ଉତ୍ପାଦ ID ସୃଷ୍ଟି ଓ ଅନୁମୋଦନ କରନ୍ତୁ।",
    unlockRequired: "DateHeart Pro ଖୋଲିବା ଦରକାର।",
    featureNoAds: "ବିଜ୍ଞାପନ ବିନା ଅନ୍ତର୍ଭୁକ୍ତ",
    featurePlanner: "ଡେଟ ପରିକଳ୍ପନାକାରୀ",
    featureWeek: "ସାପ୍ତାହିକ ପରିକଳ୍ପନା",
    featureChallenges: "ଡେଟ ଚ୍ୟାଲେଞ୍ଜ",
    featureSync: "ଭାଗ ହୋଇଥିବା ପସନ୍ଦ",
    featureFilters: "ଅଧିକ ପରିକଳ୍ପନା ମୋଡ",
    featurePacks: "ବିଶେଷ ପ୍ୟାକ",
    toolsTitle: "Pro ସାଧନ",
    tonightMode: "ଆଜି ମୋଡ",
    weekPlan: "ସପ୍ତାହ ଗଢ଼ନ୍ତୁ",
    challenge: "ନୂଆ ଚ୍ୟାଲେଞ୍ଜ",
    copyAiPlanner: "ଡେଟ ପରିକଳ୍ପନାକାରୀ ନକଲ",
    shareFavorites: "ପସନ୍ଦ ସେୟାର",
    noAdsIncluded: "Pro ସକ୍ରିୟ ଥିଲେ ବିଜ୍ଞାପନ ହଟାଏ।",
    outputCopied: "ନକଲ ହେଲା",
  },
  ps: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro اعلانونه لرې کوي او د جوړو لپاره بشپړه پلان جوړونې طبقه پرانیزي.",
    plusIntro: "Pro کې بې اعلانونو کارول، د لیدنې پلان جوړوونکی، اونیز پلانونه، د لیدنې ننګونې، شریکې خوښې او ځانګړي د مفکورو بنډلونه شامل دي.",
    monthly: "میاشتنی",
    yearly: "کلنی",
    monthSuffix: "/ میاشت",
    yearSuffix: "/ کال",
    subscribeMonthly: "میاشتنی پیل",
    subscribeYearly: "کلنی پیل",
    active: "Pro فعال دی",
    nativeBilling: "د App Store یا Google Play له لارې د اپ دننه پېرود.",
    nativeNoAdsBilling: "د App Store یا Google Play له لارې یو ځل د اپ دننه پېرود.",
    statusNote: "ویب تادیه Stripe کاروي. iOS او Android د اپ دننه پېرود کاروي.",
    statusStarting: "خوندي Pro پېرود پرانیستل کېږي...",
    statusVerifying: "د Pro ګډون کتل کېږي...",
    statusConfirmed: "DateHeart Pro فعال دی.",
    statusFailed: "د Pro پېرود پیل نه شو. بیا هڅه وکړئ.",
    statusUnavailable: "تادیه نښلول شوې، خو دا د پلورنځي محصول لا خپور نه دی. په App Store Connect یا Play Console کې د محصول ID جوړ او تایید کړئ.",
    unlockRequired: "DateHeart Pro پرانیستل اړین دي.",
    featureNoAds: "بې اعلانونو شامل",
    featurePlanner: "د لیدنې پلان جوړوونکی",
    featureWeek: "اونیز پلان",
    featureChallenges: "د لیدنې ننګونې",
    featureSync: "شریکې خوښې",
    featureFilters: "نور پلان جوړونې حالتونه",
    featurePacks: "ځانګړي بنډلونه",
    toolsTitle: "د Pro وسایل",
    tonightMode: "د نن حالت",
    weekPlan: "اونۍ جوړه کړئ",
    challenge: "نوې ننګونه",
    copyAiPlanner: "د لیدنې پلان جوړوونکی کاپي کړئ",
    shareFavorites: "خوښې شریکې کړئ",
    noAdsIncluded: "Pro د فعالېدو پر مهال اعلانونه لرې کوي.",
    outputCopied: "کاپي شو",
  },
  sd: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro اشتهار هٽائي ٿو ۽ جوڙن لاءِ مڪمل پلاننگ پرت کولي ٿو.",
    plusIntro: "Pro ۾ بغير اشتهارن استعمال، ڊيٽ پلان ڪندڙ، هفتيوار پلان، ڊيٽ چيلينج، گڏيل پسنديده ۽ خاص خيال پيڪ شامل آهن.",
    monthly: "ماهانه",
    yearly: "ساليانو",
    monthSuffix: "/ مهينو",
    yearSuffix: "/ سال",
    subscribeMonthly: "ماهانه شروع",
    subscribeYearly: "ساليانو شروع",
    active: "Pro فعال",
    nativeBilling: "App Store يا Google Play ذريعي ايپ اندر خريداري.",
    nativeNoAdsBilling: "App Store يا Google Play ذريعي هڪ دفعو ايپ اندر خريداري.",
    statusNote: "ويب ادائيگي Stripe استعمال ڪري ٿي. iOS ۽ Android ايپ اندر خريداري استعمال ڪن ٿا.",
    statusStarting: "محفوظ Pro خريداري کولجي رهي آهي...",
    statusVerifying: "Pro سبسڪرپشن جاچي پئي وڃي...",
    statusConfirmed: "DateHeart Pro فعال آهي.",
    statusFailed: "Pro خريداري شروع نه ٿي سگهي. ٻيهر ڪوشش ڪريو.",
    statusUnavailable: "ادائيگي ڳنڍيل آهي، پر هي اسٽور پيداوار اڃا شايع ناهي. App Store Connect يا Play Console ۾ پيداوار ID ٺاهيو ۽ منظور ڪريو.",
    unlockRequired: "DateHeart Pro کولڻ ضروري آهي.",
    featureNoAds: "بغير اشتهارن شامل",
    featurePlanner: "ڊيٽ پلان ڪندڙ",
    featureWeek: "هفتيوار پلان",
    featureChallenges: "ڊيٽ چيلينج",
    featureSync: "گڏيل پسنديده",
    featureFilters: "وڌيڪ پلاننگ طريقا",
    featurePacks: "خاص پيڪ",
    toolsTitle: "Pro اوزار",
    tonightMode: "اڄ جو موڊ",
    weekPlan: "هفتو ٺاهيو",
    challenge: "نئون چيلينج",
    copyAiPlanner: "ڊيٽ پلان ڪندڙ ڪاپي ڪريو",
    shareFavorites: "پسنديده شيئر ڪريو",
    noAdsIncluded: "Pro فعال هئڻ دوران اشتهار هٽائي ٿو.",
    outputCopied: "ڪاپي ٿيو",
  },
  ug: {
    button: "DateHeart Pro",
    label: "Pro",
    title: "DateHeart Pro",
    body: "Pro ئېلانلارنى چىقىرىۋېتىدۇ ۋە جۈپلەر ئۈچۈن تولۇق پىلانلاش قاتلىمىنى ئاچىدۇ.",
    plusIntro: "Pro دا ئېلانسىز ئىشلىتىش، ئۇچرىشىش پىلانلىغۇچى، ھەپتىلىك پىلان، ئۇچرىشىش رىقابەتلىرى، ئورتاق ياقتۇرغانلار ۋە ئالاھىدە پىكىر توپلاملىرى بار.",
    monthly: "ئايلىق",
    yearly: "يىللىق",
    monthSuffix: "/ ئاي",
    yearSuffix: "/ يىل",
    subscribeMonthly: "ئايلىق باشلاش",
    subscribeYearly: "يىللىق باشلاش",
    active: "Pro ئاكتىپ",
    nativeBilling: "App Store ياكى Google Play ئارقىلىق ئەپ ئىچى سېتىۋېلىش.",
    nativeNoAdsBilling: "App Store ياكى Google Play ئارقىلىق بىر قېتىملىق ئەپ ئىچى سېتىۋېلىش.",
    statusNote: "تور ھەق تۆلەش Stripe نى ئىشلىتىدۇ. iOS ۋە Android ئەپ ئىچى سېتىۋېلىشنى ئىشلىتىدۇ.",
    statusStarting: "بىخەتەر Pro سېتىۋېلىش ئېچىلىۋاتىدۇ...",
    statusVerifying: "Pro ئەزالىقى تەكشۈرۈلۈۋاتىدۇ...",
    statusConfirmed: "DateHeart Pro ئاكتىپ.",
    statusFailed: "Pro سېتىۋېلىشنى باشلىغىلى بولمىدى. قايتا سىناڭ.",
    statusUnavailable: "ھەق تۆلەش ئۇلاندى، ئەمما بۇ دۇكان مەھسۇلاتى تېخى ئېلان قىلىنمىدى. App Store Connect ياكى Play Console دا مەھسۇلات ID قۇرۇپ تەستىقلىتىڭ.",
    unlockRequired: "DateHeart Pro نى ئېچىش كېرەك.",
    featureNoAds: "ئېلانسىز ئىچىدە",
    featurePlanner: "ئۇچرىشىش پىلانلىغۇچى",
    featureWeek: "ھەپتىلىك پىلان",
    featureChallenges: "ئۇچرىشىش رىقابەتلىرى",
    featureSync: "ئورتاق ياقتۇرغانلار",
    featureFilters: "تېخىمۇ كۆپ پىلانلاش ھالىتى",
    featurePacks: "ئالاھىدە توپلاملار",
    toolsTitle: "Pro قوراللىرى",
    tonightMode: "بۈگۈن ھالىتى",
    weekPlan: "ھەپتە قۇرۇش",
    challenge: "يېڭى رىقابەت",
    copyAiPlanner: "ئۇچرىشىش پىلانلىغۇچىنى كۆچۈرۈش",
    shareFavorites: "ياقتۇرغانلارنى ھەمبەھىرلەش",
    noAdsIncluded: "Pro ئاكتىپ بولغاندا ئېلانلارنى چىقىرىۋېتىدۇ.",
    outputCopied: "كۆچۈرۈلدى",
  },
};

const adPrivacyCopy: Record<LanguageCode, string> = {
  en: "Ad privacy choices",
  "en-US": "Ad privacy choices",
  de: "Werbe-Datenschutz",
  pl: "Prywatność reklam",
  es: "Privacidad de anuncios",
  fr: "Confidentialité publicitaire",
  it: "Privacy annunci",
  pt: "Privacidade dos anúncios",
  hi: "विज्ञापन गोपनीयता",
  ar: "خصوصية الإعلانات",
  ja: "広告プライバシー",
  zh: "广告隐私设置",
  ru: "Конфиденциальность рекламы",
  ko: "광고 개인 정보",
  tr: "Reklam gizliliği",
  id: "Privasi iklan",
  nl: "Advertentieprivacy",
  sv: "Annonsintegritet",
  cs: "Soukromí reklam",
  uk: "Конфіденційність реклами",
  vi: "Quyền riêng tư quảng cáo",
  th: "ความเป็นส่วนตัวโฆษณา",
  da: "Privatliv for reklamer",
  fi: "Mainosten tietosuoja",
  ro: "Confidențialitatea reclamelor",
  hu: "Hirdetési adatvédelem",
  bn: "বিজ্ঞাপন গোপনীয়তা",
  ur: "اشتہاری رازداری",
  fa: "حریم خصوصی تبلیغات",
  he: "פרטיות פרסומות",
  el: "Απόρρητο διαφημίσεων",
  bg: "Поверителност на рекламите",
  hr: "Privatnost oglasa",
  sk: "Súkromie reklám",
  ms: "Privasi iklan",
  tl: "Pribasya ng mga patalastas",
  ta: "விளம்பர தனியுரிமை",
  te: "ప్రకటన గోప్యత",
  sw: "Faragha ya matangazo",
  mr: "जाहिरात गोपनीयता",
  gu: "જાહેરાત ગોપનીયતા",
  pa: "ਇਸ਼ਤਿਹਾਰ ਗੋਪਨੀਯਤਾ",
  kn: "ಜಾಹೀರಾತು ಗೌಪ್ಯತೆ",
  ml: "പരസ്യ സ്വകാര്യത",
  ne: "विज्ञापन गोपनीयता",
  si: "දැන්වීම් පෞද්ගලිකත්වය",
  et: "Reklaamide privaatsus",
  lt: "Reklamų privatumas",
  lv: "Reklāmu privātums",
  sl: "Zasebnost oglasov",
  ca: "Privacitat dels anuncis",
  eu: "Iragarkien pribatutasuna",
  gl: "Privacidade dos anuncios",
  ga: "Príobháideachas fógraí",
  is: "Persónuvernd auglýsinga",
  mt: "Privatezza tar-reklami",
  mk: "Приватност на реклами",
  sq: "Privatësia e reklamave",
  no: "Annonsepersonvern",
  sr: "Приватност реклама",
  bs: "Privatnost reklama",
  be: "Прыватнасць рэкламы",
  af: "Advertensieprivaatheid",
  az: "Reklam məxfiliyi",
  hy: "Գովազդի գաղտնիություն",
  ka: "რეკლამის კონფიდენციალურობა",
  am: "የማስታወቂያ ግላዊነት",
  om: "Iccitii beeksisaa",
  so: "Asturnaanta xayeysiiska",
  rw: "Ibanga ry'amatangazo",
  ha: "Sirrin talla",
  ig: "Nzuzo mgbasa ozi",
  yo: "Asiri ìpolówó",
  zu: "Ubumfihlo bezikhangiso",
  as: "বিজ্ঞাপন গোপনীয়তা",
  my: "ကြော်ငြာ ကိုယ်ရေးလုံခြုံမှု",
  km: "ឯកជនភាពពាណិជ្ជកម្ម",
  lo: "ຄວາມເປັນສ່ວນຕົວໂຄສະນາ",
  or: "ବିଜ୍ଞାପନ ଗୋପନୀୟତା",
  ps: "د اعلان محرمیت",
  sd: "اشتهار رازداري",
  ug: "ئېلان مەخپىيەتلىكى",
};

const supportEmailCopy: Record<LanguageCode, string> = {
  en: "Write support email",
  "en-US": "Write support email",
  de: "Support-Mail schreiben",
  pl: "Napisz do supportu",
  es: "Escribir a soporte",
  fr: "Écrire au support",
  it: "Scrivi al supporto",
  pt: "Escrever ao suporte",
  hi: "सहायता ईमेल लिखें",
  ar: "كتابة رسالة للدعم",
  ja: "サポートにメールを書く",
  zh: "撰写支持邮件",
  ru: "Написать в поддержку",
  ko: "지원팀에 이메일 쓰기",
  tr: "Desteğe e-posta yaz",
  id: "Tulis email dukungan",
  nl: "Supportmail schrijven",
  sv: "Skriv till support",
  cs: "Napsat podpoře",
  uk: "Написати в підтримку",
  vi: "Viết email hỗ trợ",
  th: "เขียนอีเมลถึงฝ่ายช่วยเหลือ",
  da: "Skriv til support",
  fi: "Kirjoita tukeen",
  ro: "Scrie către suport",
  hu: "Írás az ügyfélszolgálatnak",
  bn: "সহায়তায় ই-মেইল লিখুন",
  ur: "مدد کو ای میل لکھیں",
  fa: "به پشتیبانی ایمیل بنویسید",
  he: "כתבו אימייל לתמיכה",
  el: "Γράψτε email στην υποστήριξη",
  bg: "Пишете на поддръжката",
  hr: "Napiši email podršci",
  sk: "Napísať podpore",
  ms: "Tulis e-mel sokongan",
  tl: "Sumulat sa suporta",
  ta: "ஆதரவுக்கு மின்னஞ்சல் எழுதுங்கள்",
  te: "సహాయానికి ఇమెయిల్ రాయండి",
  sw: "Andika barua pepe kwa usaidizi",
  mr: "मदतीला ई-मेल लिहा",
  gu: "મદદને ઈ-મેલ લખો",
  pa: "ਮਦਦ ਨੂੰ ਈ-ਮੇਲ ਲਿਖੋ",
  kn: "ಸಹಾಯಕ್ಕೆ ಇ-ಮೇಲ್ ಬರೆಯಿರಿ",
  ml: "സഹായത്തിന് ഇ-മെയിൽ എഴുതുക",
  ne: "सहयोगलाई इ-मेल लेख्नुहोस्",
  si: "සහායට ඉ-මේල් ලියන්න",
  et: "Kirjuta toele e-kiri",
  lt: "Rašyti pagalbai el. laišką",
  lv: "Rakstīt atbalstam e-pastu",
  sl: "Piši podpori",
  ca: "Escriu al suport",
  eu: "Idatzi laguntzara",
  gl: "Escribir ao soporte",
  ga: "Scríobh chuig tacaíocht",
  is: "Skrifa til aðstoðar",
  mt: "Ikteb lill-appoġġ",
  mk: "Пишете до поддршка",
  sq: "Shkruaj mbështetjes",
  no: "Skriv til kundestøtte",
  sr: "Пишите подршци",
  bs: "Pišite podršci",
  be: "Напісаць у падтрымку",
  af: "Skryf aan ondersteuning",
  az: "Dəstəyə yaz",
  hy: "Գրել աջակցությանը",
  ka: "მიწერეთ მხარდაჭერას",
  am: "ወደ ድጋፍ ኢሜይል ጻፍ",
  om: "Gargaarsaaf imeelii barreessi",
  so: "U qor taageerada iimayl",
  rw: "Andikira ubufasha imeyili",
  ha: "Rubuta imel zuwa taimako",
  ig: "Dee nkwado imel",
  yo: "Kọ imeeli si atilẹyin",
  zu: "Bhala i-imeyili yosizo",
  as: "সহায়লৈ ইমেইল লিখক",
  my: "အကူအညီသို့ အီးမေးလ်ရေးမည်",
  km: "សរសេរអ៊ីមែលទៅជំនួយ",
  lo: "ຂຽນອີເມວຫາຊ່ວຍເຫຼືອ",
  or: "ସହାୟତାକୁ ଇମେଲ ଲେଖନ୍ତୁ",
  ps: "ملاتړ ته برېښنالیک ولیکئ",
  sd: "مدد ڏانهن اي ميل لکو",
  ug: "ياردەمگە ئېلخەت يېزىڭ",
};

const dateplannerLockCopy: Record<LanguageCode, { body: string; button: string }> = {
  en: {
    body: "Dateplanner is a Pro feature. Upgrade to unlock the full planning prompt.",
    button: "Unlock with Pro",
  },
  "en-US": {
    body: "Dateplanner is a Pro feature. Upgrade to unlock the full planning prompt.",
    button: "Unlock with Pro",
  },
  de: {
    body: "Dateplanner ist ein Pro-Feature. Mit Pro schaltest du den kompletten Plan frei.",
    button: "Mit Pro freischalten",
  },
  pl: {
    body: "Dateplanner to funkcja Pro. Przejdź na Pro, aby odblokować pełny prompt planowania.",
    button: "Odblokuj z Pro",
  },
  es: {
    body: "Dateplanner es una función Pro. Mejora a Pro para desbloquear el prompt completo de planificación.",
    button: "Desbloquear con Pro",
  },
  fr: {
    body: "Dateplanner est une fonction Pro. Passez à Pro pour débloquer le prompt complet de planification.",
    button: "Débloquer avec Pro",
  },
  it: {
    body: "Dateplanner è una funzione Pro. Passa a Pro per sbloccare il prompt di pianificazione completo.",
    button: "Sblocca con Pro",
  },
  pt: {
    body: "O Dateplanner é uma funcionalidade Pro. Faz upgrade para desbloquear o prompt completo de planeamento.",
    button: "Desbloquear com Pro",
  },
  hi: {
    body: "Dateplanner एक Pro सुविधा है. पूरा प्लानिंग prompt खोलने के लिए Pro लें.",
    button: "Pro से अनलॉक करें",
  },
  ar: {
    body: "Dateplanner ميزة Pro. رقّيا لفتح مطالبة التخطيط الكاملة.",
    button: "فتح عبر Pro",
  },
  ja: {
    body: "DateplannerはPro機能です。Proにアップグレードすると完全なプランニングプロンプトを解除できます。",
    button: "Proで解除",
  },
  zh: {
    body: "Dateplanner 是 Pro 功能。升级到 Pro 以解锁完整规划提示。",
    button: "用 Pro 解锁",
  },
  ru: {
    body: "Dateplanner — функция Pro. Перейдите на Pro, чтобы открыть полный запрос планирования.",
    button: "Разблокировать с Pro",
  },
  ko: {
    body: "Dateplanner는 Pro 기능입니다. 전체 계획 프롬프트를 열려면 Pro로 업그레이드하세요.",
    button: "Pro로 잠금 해제",
  },
  tr: {
    body: "Dateplanner bir Pro özelliğidir. Tam planlama istemini açmak için Pro'ya geçin.",
    button: "Pro ile aç",
  },
  id: {
    body: "Dateplanner adalah fitur Pro. Tingkatkan ke Pro untuk membuka prompt perencanaan lengkap.",
    button: "Buka dengan Pro",
  },
  nl: {
    body: "Dateplanner is een Pro-functie. Upgrade naar Pro om de volledige planningsprompt te ontgrendelen.",
    button: "Ontgrendel met Pro",
  },
  sv: {
    body: "Dateplanner är en Pro-funktion. Uppgradera till Pro för att låsa upp hela planeringsprompten.",
    button: "Lås upp med Pro",
  },
  cs: {
    body: "Dateplanner je funkce Pro. Upgradujte na Pro a odemkněte celý plánovací prompt.",
    button: "Odemknout s Pro",
  },
  uk: {
    body: "Dateplanner — функція Pro. Перейдіть на Pro, щоб відкрити повний запит планування.",
    button: "Розблокувати через Pro",
  },
  vi: {
    body: "Dateplanner là tính năng Pro. Nâng cấp lên Pro để mở khóa prompt lập kế hoạch đầy đủ.",
    button: "Mở khóa bằng Pro",
  },
  th: {
    body: "Dateplanner เป็นฟีเจอร์ Pro อัปเกรดเป็น Pro เพื่อปลดล็อกพรอมป์วางแผนฉบับเต็ม",
    button: "ปลดล็อกด้วย Pro",
  },
  da: {
    body: "Dateplanner er en Pro-funktion. Opgrader for at låse hele planlægningsprompten op.",
    button: "Lås op med Pro",
  },
  fi: {
    body: "Treffisuunnittelija on Pro-ominaisuus. Päivitä, niin saat koko suunnittelupromptin käyttöön.",
    button: "Avaa Prolla",
  },
  ro: {
    body: "Planificatorul de întâlniri este o funcție Pro. Fă upgrade pentru a debloca promptul complet de planificare.",
    button: "Deblochează cu Pro",
  },
  hu: {
    body: "A randitervező Pro-funkció. Frissíts Pro-ra a teljes tervezési prompt feloldásához.",
    button: "Feloldás Próval",
  },
  bn: {
    body: "ডেট পরিকল্পনাকারী একটি Pro সুবিধা। পূর্ণ পরিকল্পনা নির্দেশনা খুলতে Pro নিন।",
    button: "Pro দিয়ে আনলক করুন",
  },
  ur: {
    body: "ڈیٹ منصوبہ ساز Pro فیچر ہے۔ مکمل منصوبہ بندی پرامپٹ کھولنے کے لیے Pro لیں۔",
    button: "Pro سے کھولیں",
  },
  fa: {
    body: "برنامه‌ریز قرار یک قابلیت Pro است. برای باز کردن متن کامل برنامه‌ریزی، Pro را فعال کنید.",
    button: "باز کردن با Pro",
  },
  he: {
    body: "מתכנן הדייט הוא תכונת Pro. שדרגו כדי לפתוח את הנחיית התכנון המלאה.",
    button: "פתח עם Pro",
  },
  el: {
    body: "Ο σχεδιαστής ραντεβού είναι λειτουργία Pro. Αναβαθμίστε για να ξεκλειδώσετε την πλήρη οδηγία σχεδιασμού.",
    button: "Ξεκλείδωμα με Pro",
  },
  bg: {
    body: "Планировчикът на срещи е Pro функция. Надстройте, за да отключите пълната инструкция за планиране.",
    button: "Отключи с Pro",
  },
  hr: {
    body: "Planer spoja je Pro značajka. Nadogradite za otključavanje pune upute za planiranje.",
    button: "Otključaj s Pro",
  },
  sk: {
    body: "Plánovač rande je funkcia Pro. Inovujte a odomknite celú plánovaciu výzvu.",
    button: "Odomknúť s Pro",
  },
  ms: {
    body: "Perancang janji temu ialah ciri Pro. Naik taraf untuk membuka arahan perancangan penuh.",
    button: "Buka dengan Pro",
  },
  tl: {
    body: "Ang tagaplano ng tipanan ay bahagi ng Pro. Mag-upgrade para mabuksan ang buong gabay sa pagpaplano.",
    button: "Buksan gamit ang Pro",
  },
  ta: {
    body: "சந்திப்பு திட்டமிடுபவர் Pro அம்சம். முழு திட்டமிடல் வழிமுறையைத் திறக்க மேம்படுத்துங்கள்.",
    button: "Pro மூலம் திறக்கவும்",
  },
  te: {
    body: "సమావేశ ప్రణాళిక Pro సదుపాయం. పూర్తి ప్రణాళిక సూచనను తెరవడానికి అప్‌గ్రేడ్ చేయండి.",
    button: "Proతో తెరవండి",
  },
  sw: {
    body: "Mpangaji wa miadi ni kipengele cha Pro. Pata Pro ili kufungua mwongozo kamili wa kupanga.",
    button: "Fungua kwa Pro",
  },
  mr: {
    body: "भेट नियोजक हे Pro वैशिष्ट्य आहे. पूर्ण योजना मार्गदर्शक उघडण्यासाठी Pro घ्या.",
    button: "Pro ने उघडा",
  },
  gu: {
    body: "મુલાકાત યોજક Pro સુવિધા છે. સંપૂર્ણ આયોજન માર્ગદર્શિકા ખોલવા Pro લો.",
    button: "Pro થી ખોલો",
  },
  pa: {
    body: "ਮਿਲਣ ਯੋਜਕ Pro ਸੁਵਿਧਾ ਹੈ. ਪੂਰੀ ਯੋਜਨਾ ਰਹਿਨੁਮਾ ਖੋਲ੍ਹਣ ਲਈ Pro ਲਵੋ.",
    button: "Pro ਨਾਲ ਖੋਲ੍ਹੋ",
  },
  kn: {
    body: "ಭೇಟಿ ಯೋಜಕ Pro ವೈಶಿಷ್ಟ್ಯ. ಪೂರ್ಣ ಯೋಜನಾ ಮಾರ್ಗದರ್ಶಿ ತೆರೆಯಲು Pro ಪಡೆಯಿರಿ.",
    button: "Pro ಮೂಲಕ ತೆರೆಯಿರಿ",
  },
  ml: {
    body: "കൂടിക്കാഴ്ച പദ്ധതികർത്താവ് Pro സവിശേഷതയാണ്. പൂർണ്ണ പദ്ധതി മാർഗ്ഗനിർദ്ദേശം തുറക്കാൻ Pro എടുക്കുക.",
    button: "Pro ഉപയോഗിച്ച് തുറക്കുക",
  },
  ne: {
    body: "भेट योजनाकार Pro सुविधा हो. पूरा योजना मार्गदर्शन खोल्न Pro लिनुहोस्.",
    button: "Pro बाट खोल्नुहोस्",
  },
  si: {
    body: "හමුවීම් සැලසුම්කරු Pro විශේෂාංගයකි. සම්පූර්ණ සැලසුම් මාර්ගෝපදේශය විවෘත කිරීමට Pro ගන්න.",
    button: "Pro සමඟ විවෘත කරන්න",
  },
  et: {
    body: "Kohtinguplaanija on Pro funktsioon. Täieliku planeerimisjuhise avamiseks võtke Pro.",
    button: "Ava Proga",
  },
  lt: {
    body: "Pasimatymo planuotojas yra Pro funkcija. Atrakinkite visą planavimo gaires su Pro.",
    button: "Atrakinti su Pro",
  },
  lv: {
    body: "Randiņa plānotājs ir Pro funkcija. Atveriet pilno plānošanas vadlīniju ar Pro.",
    button: "Atvērt ar Pro",
  },
  sl: {
    body: "Načrtovalnik zmenka je funkcija Pro. S Pro odklenete celotno navodilo za načrtovanje.",
    button: "Odkleni s Pro",
  },
  ca: {
    body: "El planificador de cita és una funció Pro. Activeu Pro per obrir la guia completa de planificació.",
    button: "Obre amb Pro",
  },
  eu: {
    body: "Hitzordu-planifikatzailea Pro funtzioa da. Hartu Pro plangintza-gida osoa irekitzeko.",
    button: "Ireki Prorekin",
  },
  gl: {
    body: "O planificador de cita é unha función Pro. Activade Pro para abrir a guía completa de planificación.",
    button: "Abrir con Pro",
  },
  ga: {
    body: "Is gné Pro é an pleanálaí coinne. Faigh Pro chun an treoir iomlán pleanála a oscailt.",
    button: "Oscail le Pro",
  },
  is: {
    body: "Stefnumótaplanari er Pro-eiginleiki. Fáið Pro til að opna alla skipulagsleiðbeininguna.",
    button: "Opna með Pro",
  },
  mt: {
    body: "Il-pjanifikatur tad-date huwa karatteristika Pro. Ħudu Pro biex tifthu l-gwida sħiħa tal-ippjanar.",
    button: "Iftaħ b'Pro",
  },
  mk: {
    body: "Планерот за состанок е Pro функција. Активирајте Pro за да ја отворите целата водилка за планирање.",
    button: "Отвори со Pro",
  },
  sq: {
    body: "Planifikuesi i takimit është veçori Pro. Merrni Pro për të hapur udhëzuesin e plotë të planifikimit.",
    button: "Hap me Pro",
  },
  no: {
    body: "Dateplanleggeren er en Pro-funksjon. Få Pro for å åpne hele planleggingsveiledningen.",
    button: "Åpne med Pro",
  },
  sr: {
    body: "Планер састанка је Pro функција. Активирајте Pro да отворите цело упутство за планирање.",
    button: "Отвори уз Pro",
  },
  bs: {
    body: "Planer spoja je Pro funkcija. Aktivirajte Pro da otvorite cijeli vodič za planiranje.",
    button: "Otvori uz Pro",
  },
  be: {
    body: "Планавальнік спаткання - гэта Pro-функцыя. Атрымайце Pro, каб адкрыць поўны дапаможнік па планаванні.",
    button: "Адкрыць з Pro",
  },
  af: {
    body: "Die afspraakbeplanner is 'n Pro-funksie. Kry Pro om die volledige beplanningsgids oop te maak.",
    button: "Maak oop met Pro",
  },
  az: {
    body: "Görüş planlayıcısı Pro xüsusiyyətidir. Tam planlama bələdçisini açmaq üçün Pro əldə edin.",
    button: "Pro ilə aç",
  },
  hy: {
    body: "Ժամադրության պլանավորիչը Pro գործառույթ է։ Վերցրեք Pro՝ ամբողջական պլանավորման ուղեցույցը բացելու համար։",
    button: "Բացել Pro-ով",
  },
  ka: {
    body: "პაემნის დამგეგმავი Pro ფუნქციაა. მიიღეთ Pro სრული დაგეგმვის გზამკვლევის გასახსნელად.",
    button: "გახსნა Pro-ით",
  },
  am: {
    body: "የቀጠሮ አቅድ የPro ባህሪ ነው። ሙሉ የእቅድ መመሪያውን ለመክፈት Pro ይውሰዱ።",
    button: "በPro ክፈት",
  },
  om: {
    body: "Karoorsaan walargii amala Pro ti. Qajeelfama karooraa guutuu banuuf Pro argadhaa.",
    button: "Pro'n bani",
  },
  so: {
    body: "Qorsheeyaha shukaansigu waa astaanta Pro. Qaado Pro si aad u furto hagaha qorsheynta oo dhan.",
    button: "Ku fur Pro",
  },
  rw: {
    body: "Utegura gahunda ni umwihariko wa Pro. Fata Pro kugira ngo ufungure ubuyobozi bwose bwo gutegura.",
    button: "Fungura na Pro",
  },
  ha: {
    body: "Mai tsara soyayya fasalin Pro ne. Samu Pro don buɗe cikakkiyar jagorar shiri.",
    button: "Buɗe da Pro",
  },
  ig: {
    body: "Onye nhazi ịhụnanya bụ njirimara Pro. Were Pro ka ịmeghee nduzi atụmatụ zuru ezu.",
    button: "Mepee na Pro",
  },
  yo: {
    body: "Alakoso eto ìfẹ́ jẹ́ ẹya Pro. Gba Pro lati ṣí itọsọna eto pipe.",
    button: "Ṣí pẹlu Pro",
  },
  zu: {
    body: "Umhleli wothando uyisici se-Pro. Thola i-Pro ukuze uvule umhlahlandlela wokuhlela ophelele.",
    button: "Vula nge-Pro",
  },
  as: {
    body: "ডেট পৰিকল্পনাকাৰী Pro সুবিধা। সম্পূৰ্ণ পৰিকল্পনা নিৰ্দেশনা খুলিবলৈ Pro লওক।",
    button: "Pro-ৰে খোলক",
  },
  my: {
    body: "ဒိတ်စီစဉ်သူသည် Pro လုပ်ဆောင်ချက် ဖြစ်သည်။ အစီအစဉ်လမ်းညွှန်အပြည့်ကို ဖွင့်ရန် Pro ရယူပါ။",
    button: "Pro ဖြင့် ဖွင့်မည်",
  },
  km: {
    body: "អ្នករៀបចំណាត់ជួបគឺជាមុខងារ Pro។ យក Pro ដើម្បីបើកមគ្គុទ្ទេសក៍រៀបចំពេញលេញ។",
    button: "បើកដោយ Pro",
  },
  lo: {
    body: "ຜູ້ວາງແຜນນັດແມ່ນຟີເຈີ Pro. ເອົາ Pro ເພື່ອເປີດຄູ່ມືວາງແຜນເຕັມ.",
    button: "ເປີດດ້ວຍ Pro",
  },
  or: {
    body: "ଡେଟ ପରିକଳ୍ପନାକାରୀ Pro ସୁବିଧା। ପୂରା ପରିକଳ୍ପନା ନିର୍ଦ୍ଦେଶ ଖୋଲିବାକୁ Pro ନିଅନ୍ତୁ।",
    button: "Pro ଦ୍ୱାରା ଖୋଲନ୍ତୁ",
  },
  ps: {
    body: "د لیدنې پلان جوړوونکی د Pro ځانګړنه ده. د بشپړ پلان لارښود پرانیستلو لپاره Pro واخلئ.",
    button: "په Pro یې پرانیزئ",
  },
  sd: {
    body: "ڊيٽ پلان ڪندڙ Pro خاصيت آهي. مڪمل پلاننگ رهنمائي کولڻ لاءِ Pro وٺو.",
    button: "Pro سان کوليو",
  },
  ug: {
    body: "ئۇچرىشىش پىلانلىغۇچى Pro ئىقتىدارى. تولۇق پىلانلاش كۆرسەتمىسىنى ئېچىش ئۈچۈن Pro ئېلىڭ.",
    button: "Pro بىلەن ئېچىش",
  },
};

const plusPlannerPromptCopy: Record<LanguageCode, { intro: string; outro: string }> = {
  en: {
    intro: "Create a concrete DateHeart Pro date plan for a couple.",
    outro: "Return schedule, preparation, budget, timing, one challenge and a short share message.",
  },
  "en-US": {
    intro: "Create a concrete DateHeart Pro date plan for a couple.",
    outro: "Return schedule, preparation, budget, timing, one challenge and a short share message.",
  },
  de: {
    intro: "Erstelle einen konkreten DateHeart Pro Date-Plan für ein Paar.",
    outro: "Gib Ablauf, Vorbereitung, Budget, Zeitfenster, eine Challenge und eine kurze Nachricht zum Teilen aus.",
  },
  pl: {
    intro: "Utwórz konkretny plan randki DateHeart Pro dla pary.",
    outro: "Podaj przebieg, przygotowanie, budżet, ramy czasowe, jedno wyzwanie i krótką wiadomość do udostępnienia.",
  },
  es: {
    intro: "Crea un plan de cita concreto de DateHeart Pro para una pareja.",
    outro: "Devuelve horario, preparación, presupuesto, franja horaria, un reto y un mensaje breve para compartir.",
  },
  fr: {
    intro: "Crée un plan de rendez-vous DateHeart Pro concret pour un couple.",
    outro: "Indique le déroulé, la préparation, le budget, le créneau, un défi et un court message à partager.",
  },
  it: {
    intro: "Crea un piano DateHeart Pro concreto per un appuntamento di coppia.",
    outro: "Restituisci scaletta, preparazione, budget, orario, una sfida e un breve messaggio da condividere.",
  },
  pt: {
    intro: "Cria um plano de encontro DateHeart Pro concreto para um casal.",
    outro: "Inclui roteiro, preparação, orçamento, horário, um desafio e uma mensagem curta para partilhar.",
  },
  hi: {
    intro: "एक कपल के लिए ठोस DateHeart Pro डेट योजना बनाएँ.",
    outro: "क्रम, तैयारी, बजट, समय, एक चुनौती और साझा करने के लिए छोटा संदेश दें.",
  },
  ar: {
    intro: "أنشئ خطة موعد DateHeart Pro محددة لزوجين.",
    outro: "أعطِ الجدول والتحضير والميزانية والتوقيت وتحديًا واحدًا ورسالة قصيرة للمشاركة.",
  },
  ja: {
    intro: "カップル向けの具体的なDateHeart Proデートプランを作成してください。",
    outro: "流れ、準備、予算、時間帯、1つのチャレンジ、共有用の短いメッセージを返してください。",
  },
  zh: {
    intro: "为情侣创建一个具体的 DateHeart Pro 约会计划。",
    outro: "返回流程、准备、预算、时间安排、一个挑战和一条可分享的短消息。",
  },
  ru: {
    intro: "Создай конкретный план свидания DateHeart Pro для пары.",
    outro: "Дай расписание, подготовку, бюджет, время, одно задание и короткое сообщение для отправки.",
  },
  ko: {
    intro: "커플을 위한 구체적인 DateHeart Pro 데이트 계획을 만들어 주세요.",
    outro: "일정, 준비, 예산, 시간대, 챌린지 하나, 공유용 짧은 메시지를 작성해 주세요.",
  },
  tr: {
    intro: "Bir çift için somut bir DateHeart Pro randevu planı oluştur.",
    outro: "Akış, hazırlık, bütçe, zamanlama, bir görev ve paylaşmak için kısa bir mesaj ver.",
  },
  id: {
    intro: "Buat rencana kencan DateHeart Pro yang konkret untuk pasangan.",
    outro: "Berikan alur, persiapan, anggaran, waktu, satu tantangan, dan pesan singkat untuk dibagikan.",
  },
  nl: {
    intro: "Maak een concreet DateHeart Pro-dateplan voor een koppel.",
    outro: "Geef planning, voorbereiding, budget, tijdvenster, één uitdaging en een kort deelbericht.",
  },
  sv: {
    intro: "Skapa en konkret DateHeart Pro-dejtplan för ett par.",
    outro: "Ge upplägg, förberedelse, budget, tid, en utmaning och ett kort meddelande att dela.",
  },
  cs: {
    intro: "Vytvoř konkrétní plán rande DateHeart Pro pro pár.",
    outro: "Uveď průběh, přípravu, rozpočet, čas, jednu výzvu a krátkou zprávu ke sdílení.",
  },
  uk: {
    intro: "Створи конкретний план побачення DateHeart Pro для пари.",
    outro: "Дай розклад, підготовку, бюджет, час, один виклик і коротке повідомлення для поширення.",
  },
  vi: {
    intro: "Tạo một kế hoạch hẹn hò DateHeart Pro cụ thể cho một cặp đôi.",
    outro: "Trả về lịch trình, chuẩn bị, ngân sách, thời gian, một thử thách và tin nhắn ngắn để chia sẻ.",
  },
  th: {
    intro: "สร้างแผนเดต DateHeart Pro ที่ชัดเจนสำหรับคู่รัก",
    outro: "ส่งคืนลำดับกิจกรรม การเตรียมตัว งบประมาณ เวลา ความท้าทายหนึ่งข้อ และข้อความสั้นสำหรับแชร์",
  },
  da: {
    intro: "Lav en konkret DateHeart Pro-dateplan for et par.",
    outro: "Giv forløb, forberedelse, budget, tidsrum, én udfordring og en kort besked til deling.",
  },
  fi: {
    intro: "Luo parille konkreettinen DateHeart Pro -treffisuunnitelma.",
    outro: "Anna aikataulu, valmistelu, budjetti, ajankohta, yksi haaste ja lyhyt jaettava viesti.",
  },
  ro: {
    intro: "Creează un plan DateHeart Pro concret pentru o întâlnire de cuplu.",
    outro: "Oferă programul, pregătirea, bugetul, intervalul, o provocare și un mesaj scurt de distribuit.",
  },
  hu: {
    intro: "Készíts konkrét DateHeart Pro randitervet egy párnak.",
    outro: "Adj menetrendet, előkészítést, költségkeretet, időzítést, egy kihívást és egy rövid megosztható üzenetet.",
  },
  bn: {
    intro: "একটি জুটির জন্য নির্দিষ্ট DateHeart Pro ডেট পরিকল্পনা তৈরি করুন।",
    outro: "ধাপ, প্রস্তুতি, বাজেট, সময়, একটি চ্যালেঞ্জ এবং শেয়ার করার ছোট বার্তা দিন।",
  },
  ur: {
    intro: "ایک جوڑے کے لیے واضح DateHeart Pro ڈیٹ منصوبہ بنائیں۔",
    outro: "ترتیب، تیاری، بجٹ، وقت، ایک چیلنج اور شیئر کرنے کے لیے مختصر پیغام دیں۔",
  },
  fa: {
    intro: "برای یک زوج برنامه قرار مشخص DateHeart Pro بساز.",
    outro: "برنامه، آمادگی، بودجه، زمان‌بندی، یک چالش و پیام کوتاه قابل اشتراک بده.",
  },
  he: {
    intro: "צרו תכנית דייט ברורה של DateHeart Pro לזוג.",
    outro: "החזירו סדר פעולות, הכנה, תקציב, תזמון, אתגר אחד והודעה קצרה לשיתוף.",
  },
  el: {
    intro: "Δημιούργησε ένα συγκεκριμένο πλάνο DateHeart Pro για ένα ζευγάρι.",
    outro: "Δώσε πρόγραμμα, προετοιμασία, προϋπολογισμό, χρονισμό, μία πρόκληση και σύντομο μήνυμα για κοινοποίηση.",
  },
  bg: {
    intro: "Създай конкретен DateHeart Pro план за среща за двойка.",
    outro: "Дай график, подготовка, бюджет, време, едно предизвикателство и кратко съобщение за споделяне.",
  },
  hr: {
    intro: "Izradi konkretan DateHeart Pro plan spoja za par.",
    outro: "Vrati raspored, pripremu, budžet, vrijeme, jedan izazov i kratku poruku za dijeljenje.",
  },
  sk: {
    intro: "Vytvor konkrétny plán rande DateHeart Pro pre pár.",
    outro: "Uveď harmonogram, prípravu, rozpočet, načasovanie, jednu výzvu a krátku správu na zdieľanie.",
  },
  ms: {
    intro: "Cipta rancangan janji temu DateHeart Pro yang konkrit untuk pasangan.",
    outro: "Berikan jadual, persediaan, bajet, masa, satu cabaran dan mesej ringkas untuk dikongsi.",
  },
  tl: {
    intro: "Gumawa ng konkretong plano ng tipanan sa DateHeart Pro para sa magkasintahan.",
    outro: "Ibigay ang iskedyul, paghahanda, badyet, oras, isang hamon at maikling mensahe para ibahagi.",
  },
  ta: {
    intro: "ஒரு ஜோடிக்காக தெளிவான DateHeart Pro சந்திப்பு திட்டத்தை உருவாக்குங்கள்.",
    outro: "அட்டவணை, தயாரிப்பு, பட்ஜெட், நேரம், ஒரு சவால் மற்றும் பகிர சிறிய செய்தியைத் தருங்கள்.",
  },
  te: {
    intro: "జంట కోసం స్పష్టమైన DateHeart Pro సమావేశ ప్రణాళికను తయారు చేయండి.",
    outro: "షెడ్యూల్, తయారీ, బడ్జెట్, సమయం, ఒక సవాలు మరియు పంచుకోవడానికి చిన్న సందేశం ఇవ్వండి.",
  },
  sw: {
    intro: "Tengeneza mpango halisi wa miadi wa DateHeart Pro kwa wenzi.",
    outro: "Toa ratiba, maandalizi, bajeti, muda, changamoto moja na ujumbe mfupi wa kushiriki.",
  },
  mr: {
    intro: "जोडप्यासाठी स्पष्ट DateHeart Pro भेट योजना तयार करा.",
    outro: "क्रम, तयारी, बजेट, वेळ, एक आव्हान आणि शेअर करण्यासाठी छोटा संदेश द्या.",
  },
  gu: {
    intro: "જોડી માટે સ્પષ્ટ DateHeart Pro મુલાકાત યોજના બનાવો.",
    outro: "ક્રમ, તૈયારી, બજેટ, સમય, એક પડકાર અને શેર કરવા માટે ટૂંકો સંદેશ આપો.",
  },
  pa: {
    intro: "ਜੋੜੇ ਲਈ ਸਪਸ਼ਟ DateHeart Pro ਮਿਲਣ ਯੋਜਨਾ ਬਣਾਓ.",
    outro: "ਕ੍ਰਮ, ਤਿਆਰੀ, ਬਜਟ, ਸਮਾਂ, ਇੱਕ ਚੁਣੌਤੀ ਅਤੇ ਸਾਂਝਾ ਕਰਨ ਲਈ ਛੋਟਾ ਸੁਨੇਹਾ ਦਿਓ.",
  },
  kn: {
    intro: "ಜೋಡಿಗಾಗಿ ಸ್ಪಷ್ಟ DateHeart Pro ಭೇಟಿ ಯೋಜನೆ ರಚಿಸಿ.",
    outro: "ಕ್ರಮ, ತಯಾರಿ, ಬಜೆಟ್, ಸಮಯ, ಒಂದು ಸವಾಲು ಮತ್ತು ಹಂಚಿಕೊಳ್ಳಲು ಸಣ್ಣ ಸಂದೇಶ ನೀಡಿ.",
  },
  ml: {
    intro: "കൂട്ടുകാർക്കായി വ്യക്തമായ DateHeart Pro കൂടിക്കാഴ്ച പദ്ധതി തയ്യാറാക്കുക.",
    outro: "ക്രമം, തയ്യാറെടുപ്പ്, ബജറ്റ്, സമയം, ഒരു വെല്ലുവിളി, പങ്കിടാൻ ചെറിയ സന്ദേശം എന്നിവ നൽകുക.",
  },
  ne: {
    intro: "जोडीका लागि स्पष्ट DateHeart Pro भेट योजना बनाउनुहोस्.",
    outro: "क्रम, तयारी, बजेट, समय, एउटा चुनौती र साझा गर्न छोटो सन्देश दिनुहोस्.",
  },
  si: {
    intro: "යුවළකට පැහැදිලි DateHeart Pro හමුවීම් සැලැස්මක් සාදන්න.",
    outro: "අනුපිළිවෙල, සූදානම, අයවැය, කාලය, එක් අභියෝගයක් සහ බෙදාගැනීමට කෙටි පණිවිඩයක් දෙන්න.",
  },
  et: {
    intro: "Loo paarile konkreetne DateHeart Pro kohtinguplaan.",
    outro: "Anna ajakava, ettevalmistus, eelarve, aeg, üks väljakutse ja lühike jagamissõnum.",
  },
  lt: {
    intro: "Sukurkite porai konkretų DateHeart Pro pasimatymo planą.",
    outro: "Pateikite eigą, pasiruošimą, biudžetą, laiką, vieną iššūkį ir trumpą žinutę bendrinimui.",
  },
  lv: {
    intro: "Izveidojiet pārim konkrētu DateHeart Pro randiņa plānu.",
    outro: "Dodiet secību, sagatavošanos, budžetu, laiku, vienu izaicinājumu un īsu ziņu kopīgošanai.",
  },
  sl: {
    intro: "Ustvari konkreten načrt DateHeart Pro za zmenek para.",
    outro: "Vrni potek, pripravo, proračun, čas, en izziv in kratko sporočilo za deljenje.",
  },
  ca: {
    intro: "Creeu un pla concret de cita DateHeart Pro per a una parella.",
    outro: "Doneu horari, preparació, pressupost, temps, un repte i un missatge breu per compartir.",
  },
  eu: {
    intro: "Sortu bikote batentzako DateHeart Pro hitzordu-plan zehatza.",
    outro: "Eman ordutegia, prestaketa, aurrekontua, denbora, erronka bat eta partekatzeko mezu labur bat.",
  },
  gl: {
    intro: "Creade un plan concreto de cita DateHeart Pro para unha parella.",
    outro: "Dade horario, preparación, orzamento, tempo, un reto e unha mensaxe breve para compartir.",
  },
  ga: {
    intro: "Cruthaigh plean coinne DateHeart Pro coincréiteach do lánúin.",
    outro: "Tabhair sceideal, ullmhúchán, buiséad, am, dúshlán amháin agus teachtaireacht ghearr le comhroinnt.",
  },
  is: {
    intro: "Búið til skýrt DateHeart Pro stefnumótaplan fyrir par.",
    outro: "Skilið dagskrá, undirbúningi, fjárhagsáætlun, tíma, einni áskorun og stuttum skilaboðum til að deila.",
  },
  mt: {
    intro: "Oħolqu pjan konkret ta' DateHeart Pro għal koppja.",
    outro: "Agħtu skeda, preparazzjoni, baġit, ħin, sfida waħda u messaġġ qasir biex jinqasam.",
  },
  mk: {
    intro: "Создајте конкретен DateHeart Pro план за состанок за пар.",
    outro: "Дајте распоред, подготовка, буџет, време, еден предизвик и кратка порака за споделување.",
  },
  sq: {
    intro: "Krijoni një plan konkret takimi DateHeart Pro për një çift.",
    outro: "Jepni orar, përgatitje, buxhet, kohë, një sfidë dhe një mesazh të shkurtër për ndarje.",
  },
  no: {
    intro: "Lag en konkret DateHeart Pro-dateplan for et par.",
    outro: "Gi opplegg, forberedelse, budsjett, tidspunkt, én utfordring og en kort melding som kan deles.",
  },
  sr: {
    intro: "Направите конкретан DateHeart Pro план састанка за пар.",
    outro: "Дајте распоред, припрему, буџет, време, један изазов и кратку поруку за дељење.",
  },
  bs: {
    intro: "Napravite konkretan DateHeart Pro plan spoja za par.",
    outro: "Dajte raspored, pripremu, budžet, vrijeme, jedan izazov i kratku poruku za dijeljenje.",
  },
  be: {
    intro: "Стварыце канкрэтны DateHeart Pro план спаткання для пары.",
    outro: "Дайце расклад, падрыхтоўку, бюджэт, час, адзін выклік і кароткае паведамленне для абмену.",
  },
  af: {
    intro: "Skep 'n konkrete DateHeart Pro-afspraakplan vir 'n paartjie.",
    outro: "Gee skedule, voorbereiding, begroting, tyd, een uitdaging en 'n kort boodskap om te deel.",
  },
  az: {
    intro: "Bir cütlük üçün konkret DateHeart Pro görüş planı yaradın.",
    outro: "Cədvəl, hazırlıq, büdcə, vaxt, bir çağırış və paylaşmaq üçün qısa mesaj verin.",
  },
  hy: {
    intro: "Ստեղծեք կոնկրետ DateHeart Pro ժամադրության պլան զույգի համար։",
    outro: "Տվեք ժամանակացույց, պատրաստում, բյուջե, ժամանակ, մեկ մարտահրավեր և կիսվելու կարճ հաղորդագրություն։",
  },
  ka: {
    intro: "შექმენით კონკრეტული DateHeart Pro პაემნის გეგმა წყვილისთვის.",
    outro: "დააბრუნეთ განრიგი, მომზადება, ბიუჯეტი, დრო, ერთი გამოწვევა და მოკლე გასაზიარებელი შეტყობინება.",
  },
  am: {
    intro: "ለጥንድ ግልጽ የDateHeart Pro ቀጠሮ እቅድ ፍጠር።",
    outro: "ቅደም ተከተል፣ ዝግጅት፣ በጀት፣ ጊዜ፣ አንድ ፈተና እና ለመጋራት አጭር መልእክት መልስ።",
  },
  om: {
    intro: "Warra jaalallaniif karoora walargii DateHeart Pro ifa ta'e uumi.",
    outro: "Tartiiba, qophii, baajata, yeroo, qormaata tokko fi ergaa gabaabaa qoodamuu danda'u kenni.",
  },
  so: {
    intro: "Lammaane u samee qorshe shukaansi DateHeart Pro oo cad.",
    outro: "Soo celi jadwal, diyaarin, miisaaniyad, wakhti, hal caqabad iyo fariin gaaban oo la wadaagi karo.",
  },
  rw: {
    intro: "Tegura gahunda ifatika ya DateHeart Pro ku bakundana.",
    outro: "Tanga urutonde, imyiteguro, ingengo, igihe, ikibazo kimwe n'ubutumwa bugufi bwo gusangiza.",
  },
  ha: {
    intro: "Ƙirƙiri shirin soyayya na DateHeart Pro mai yiwuwa ga ma'aurata.",
    outro: "Bayar da jadawali, shiri, kasafi, lokaci, ƙalubale ɗaya da gajeren saƙon rabawa.",
  },
  ig: {
    intro: "Mepụta atụmatụ ịhụnanya DateHeart Pro doro anya maka di na nwunye.",
    outro: "Nye usoro, nkwadebe, mmefu ego, oge, otu ihe ịma aka na ozi mkpụmkpụ maka ịkekọrịta.",
  },
  yo: {
    intro: "Ṣẹda eto ìfẹ́ DateHeart Pro to ye fun tọkọtaya.",
    outro: "Fi iṣeto, ìmúrasílẹ̀, isuna, akoko, ìpenija kan ati ifiranṣẹ kukuru fun pínpín han.",
  },
  zu: {
    intro: "Dala uhlelo lothando lwe-DateHeart Pro olucacile lwezithandani.",
    outro: "Buyisa uhlelo, ukulungiselela, isabelomali, isikhathi, inselelo eyodwa nomyalezo omfishane wokwabelana.",
  },
  as: {
    intro: "যোৰালোকৰ বাবে স্পষ্ট DateHeart Pro ডেট পৰিকল্পনা সৃষ্টি কৰক।",
    outro: "সূচী, প্ৰস্তুতি, বাজেট, সময়, এটা প্ৰত্যাহ্বান আৰু শ্বেয়াৰ কৰিবলৈ চুটি বাৰ্তা দিয়ক।",
  },
  my: {
    intro: "ချစ်သူစုံတွဲအတွက် ရှင်းလင်းသော DateHeart Pro ဒိတ်အစီအစဉ် ဖန်တီးပါ။",
    outro: "အချိန်ဇယား၊ ပြင်ဆင်မှု၊ ဘတ်ဂျက်၊ အချိန်၊ စိန်ခေါ်မှုတစ်ခုနှင့် မျှဝေရန် စာတိုပေးပါ။",
  },
  km: {
    intro: "បង្កើតផែនការណាត់ជួប DateHeart Pro ច្បាស់សម្រាប់គូស្នេហ៍។",
    outro: "ផ្តល់កាលវិភាគ ការត្រៀម ថវិកា ពេលវេលា បញ្ហាប្រឈមមួយ និងសារខ្លីសម្រាប់ចែករំលែក។",
  },
  lo: {
    intro: "ສ້າງແຜນນັດ DateHeart Pro ທີ່ຊັດເຈນສໍາລັບຄູ່ຮັກ.",
    outro: "ໃຫ້ຕາຕະລາງ, ການກຽມ, ງົບ, ເວລາ, ຄວາມທ້າທາຍຫນຶ່ງ ແລະຂໍ້ຄວາມສັ້ນສໍາລັບແບ່ງປັນ.",
  },
  or: {
    intro: "ଜୋଡ଼ି ପାଇଁ ସ୍ପଷ୍ଟ DateHeart Pro ଡେଟ ପରିକଳ୍ପନା ତିଆରି କରନ୍ତୁ।",
    outro: "କ୍ରମସୂଚୀ, ପ୍ରସ୍ତୁତି, ବଜେଟ, ସମୟ, ଏକ ଚ୍ୟାଲେଞ୍ଜ ଓ ସେୟାର ପାଇଁ ଛୋଟ ବାର୍ତ୍ତା ଦିଅନ୍ତୁ।",
  },
  ps: {
    intro: "د یوې جوړې لپاره روښانه DateHeart Pro د لیدنې پلان جوړ کړئ.",
    outro: "مهالویش، چمتووالی، بودجه، وخت، یوه ننګونه او د شریکولو لنډ پیغام ورکړئ.",
  },
  sd: {
    intro: "جوڙي لاءِ صاف DateHeart Pro ڊيٽ پلان ٺاهيو.",
    outro: "شيڊول، تياري، بجيٽ، وقت، هڪ چيلينج ۽ شيئر ڪرڻ لاءِ ننڍو پيغام ڏيو.",
  },
  ug: {
    intro: "جۈپلەر ئۈچۈن ئېنىق DateHeart Pro ئۇچرىشىش پىلانى قۇرۇڭ.",
    outro: "جەدۋەل، تەييارلىق، خامچوت، ۋاقىت، بىر رىقابەت ۋە ھەمبەھىرلەيدىغان قىسقا ئۇچۇر بېرىڭ.",
  },
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
    | "mail"
    | "calendar",
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
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
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
        <button class="icon-button" id="plusButton" type="button" aria-label="DateHeart Pro" title="DateHeart Pro">
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
      <div class="ai-prompt-box" id="dateplannerBox">
        <span id="aiPromptLabel">Dateplanner</span>
        <p id="resultAiPrompt"></p>
        <button class="secondary-button wide dateplanner-unlock-button" id="dateplannerUnlockButton" type="button" hidden>Unlock with Pro</button>
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
      <p class="language-subtitle" id="languageSubtitle"></p>
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
      <nav class="legal-links" id="legalLinks" aria-label="Legal">
        <button class="legal-link-button" id="supportMenuButton" type="button" aria-expanded="false" aria-controls="supportDropdown">Support</button>
        <a id="privacyLink" href="${staticPageUrl("privacy.html")}" target="_blank" rel="noreferrer">Privacy</a>
        <a id="termsLink" href="${staticPageUrl("terms.html")}" target="_blank" rel="noreferrer">Terms</a>
        <a id="imprintLink" href="${staticPageUrl("impressum.html")}" target="_blank" rel="noreferrer">Imprint</a>
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
      <span class="result-label" id="purchaseLabel">Pro</span>
      <h2 id="purchaseTitle">DateHeart Pro</h2>
      <p id="plusBody">Pro removes ads and unlocks the full planning layer for couples.</p>
      <p class="plus-plan-intro" id="plusPlanIntro">Choose Pro for ad-free use, weekly plans, challenges, Dateplanner tools and shared favorites.</p>
      <div class="plus-plans" id="plusPlans">
        <button class="plus-plan-button" id="buyPlusMonthlyButton" type="button">
          <span id="plusMonthlyLabel">Monthly</span>
          <strong id="plusMonthlyPrice"></strong>
          <small id="plusMonthlySuffix"></small>
          <em id="plusMonthlyCta">Start monthly</em>
        </button>
        <button class="plus-plan-button preferred" id="buyPlusYearlyButton" type="button">
          <span id="plusYearlyLabel">Yearly</span>
          <strong id="plusYearlyPrice"></strong>
          <small id="plusYearlySuffix"></small>
          <em id="plusYearlyCta">Start yearly</em>
        </button>
      </div>
      <p class="payment-status" id="plusStatus" aria-live="polite"></p>
      <p class="plus-legal" id="plusLegalNote">
        <span id="plusLegalRenew">Subscriptions renew automatically until cancelled in your store account settings.</span>
        <a id="plusTermsLink" href="${NATIVE_PLATFORM === "ios" ? "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/" : staticPageUrl("terms.html")}" target="_blank" rel="noreferrer">Terms of Use (EULA)</a>
        <span aria-hidden="true">·</span>
        <a id="plusPrivacyLink" href="${staticPageUrl("privacy.html")}" target="_blank" rel="noreferrer">Privacy Policy</a>
      </p>
      <div class="plus-feature-grid" id="plusFeatureGrid">
        <span>${icon("heart")} <strong id="plusFeatureNoAds">Ad-free included</strong></span>
        <span>${icon("spark")} <strong id="plusFeaturePlanner">Dateplanner</strong></span>
        <span>${icon("calendar")} <strong id="plusFeatureWeek">Weekly plan</strong></span>
        <span>${icon("star")} <strong id="plusFeatureChallenges">Date challenges</strong></span>
        <span>${icon("share")} <strong id="plusFeatureSync">Couple export</strong></span>
        <span>${icon("sliders")} <strong id="plusFeatureFilters">More planning modes</strong></span>
        <span>${icon("heart")} <strong id="plusFeaturePacks">Exclusive packs</strong></span>
      </div>
      <section class="plus-tools" id="plusTools" aria-labelledby="plusToolsTitle">
        <h3 id="plusToolsTitle">Pro tools</h3>
        <div class="plus-tool-actions">
          <button class="secondary-button" id="tonightModeButton" type="button">Tonight mode</button>
          <button class="secondary-button" id="weeklyPlanButton" type="button">Build week</button>
          <button class="secondary-button" id="challengeButton" type="button">New challenge</button>
          <button class="secondary-button" id="copyPlusPromptButton" type="button">Copy Dateplanner</button>
          <button class="secondary-button span-button" id="shareFavoritesButton" type="button">Share favorites</button>
        </div>
        <div class="plus-output" id="plusOutput"></div>
      </section>
      <section class="no-ads-section" id="noAdsSection" aria-labelledby="noAdsTitle">
        <span class="section-kicker" id="noAdsKicker">Remove ads only</span>
        <h3 id="noAdsTitle">DateHeart without ads</h3>
        <strong class="price-pill" id="purchasePrice"></strong>
        <p id="purchaseBody">Remove future ad placements from DateHeart with a one-time purchase.</p>
        <p class="payment-status" id="paymentStatus" aria-live="polite"></p>
        <button class="primary-button wide" id="buyNoAdsButton" type="button">Buy</button>
      </section>
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
  resultCard: document.querySelector<HTMLElement>("#resultOverlay .result-card")!,
  resultTitle: document.querySelector<HTMLHeadingElement>("#resultTitle")!,
  resultPrompt: document.querySelector<HTMLParagraphElement>("#resultPrompt")!,
  resultMeta: document.querySelector<HTMLDivElement>("#resultMeta")!,
  resultPrep: document.querySelector<HTMLElement>("#resultPrep")!,
  resultPlan: document.querySelector<HTMLOListElement>("#resultPlan")!,
  dateplannerBox: document.querySelector<HTMLDivElement>("#dateplannerBox")!,
  resultAiPrompt: document.querySelector<HTMLParagraphElement>("#resultAiPrompt")!,
  dateplannerUnlockButton: document.querySelector<HTMLButtonElement>("#dateplannerUnlockButton")!,
  favoriteButton: document.querySelector<HTMLButtonElement>("#favoriteButton")!,
  shareButton: document.querySelector<HTMLButtonElement>("#shareButton")!,
  copyPlanButton: document.querySelector<HTMLButtonElement>("#copyPlanButton")!,
  againButton: document.querySelector<HTMLButtonElement>("#againButton")!,
  closeResultButton: document.querySelector<HTMLButtonElement>("#closeResultButton")!,
  filterActionButton: document.querySelector<HTMLButtonElement>("#filterActionButton")!,
  filterActionKicker: document.querySelector<HTMLSpanElement>("#filterActionKicker")!,
  filterActionLabel: document.querySelector<HTMLElement>("#filterActionLabel")!,
  filterActionDetail: document.querySelector<HTMLElement>("#filterActionDetail")!,
  plusButton: document.querySelector<HTMLButtonElement>("#plusButton")!,
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
  legalLinks: document.querySelector<HTMLElement>("#legalLinks")!,
  supportMenuButton: document.querySelector<HTMLButtonElement>("#supportMenuButton")!,
  privacyLink: document.querySelector<HTMLAnchorElement>("#privacyLink")!,
  termsLink: document.querySelector<HTMLAnchorElement>("#termsLink")!,
  imprintLink: document.querySelector<HTMLAnchorElement>("#imprintLink")!,
  supportDropdown: document.querySelector<HTMLDivElement>("#supportDropdown")!,
  supportEmailLink: document.querySelector<HTMLAnchorElement>("#supportEmailLink")!,
  adPrivacyButton: document.querySelector<HTMLButtonElement>("#adPrivacyButton")!,
  purchaseOverlay: document.querySelector<HTMLDivElement>("#purchaseOverlay")!,
  closePurchaseButton: document.querySelector<HTMLButtonElement>("#closePurchaseButton")!,
  purchaseLabel: document.querySelector<HTMLElement>("#purchaseLabel")!,
  purchaseTitle: document.querySelector<HTMLHeadingElement>("#purchaseTitle")!,
  plusBody: document.querySelector<HTMLParagraphElement>("#plusBody")!,
  plusPlanIntro: document.querySelector<HTMLParagraphElement>("#plusPlanIntro")!,
  plusPlans: document.querySelector<HTMLDivElement>("#plusPlans")!,
  plusMonthlyLabel: document.querySelector<HTMLElement>("#plusMonthlyLabel")!,
  plusMonthlyPrice: document.querySelector<HTMLElement>("#plusMonthlyPrice")!,
  plusMonthlySuffix: document.querySelector<HTMLElement>("#plusMonthlySuffix")!,
  plusMonthlyCta: document.querySelector<HTMLElement>("#plusMonthlyCta")!,
  plusYearlyLabel: document.querySelector<HTMLElement>("#plusYearlyLabel")!,
  plusYearlyPrice: document.querySelector<HTMLElement>("#plusYearlyPrice")!,
  plusYearlySuffix: document.querySelector<HTMLElement>("#plusYearlySuffix")!,
  plusYearlyCta: document.querySelector<HTMLElement>("#plusYearlyCta")!,
  buyPlusMonthlyButton: document.querySelector<HTMLButtonElement>("#buyPlusMonthlyButton")!,
  buyPlusYearlyButton: document.querySelector<HTMLButtonElement>("#buyPlusYearlyButton")!,
  plusStatus: document.querySelector<HTMLParagraphElement>("#plusStatus")!,
  plusFeatureNoAds: document.querySelector<HTMLElement>("#plusFeatureNoAds")!,
  plusFeaturePlanner: document.querySelector<HTMLElement>("#plusFeaturePlanner")!,
  plusFeatureWeek: document.querySelector<HTMLElement>("#plusFeatureWeek")!,
  plusFeatureChallenges: document.querySelector<HTMLElement>("#plusFeatureChallenges")!,
  plusFeatureSync: document.querySelector<HTMLElement>("#plusFeatureSync")!,
  plusFeatureFilters: document.querySelector<HTMLElement>("#plusFeatureFilters")!,
  plusFeaturePacks: document.querySelector<HTMLElement>("#plusFeaturePacks")!,
  plusTools: document.querySelector<HTMLElement>("#plusTools")!,
  plusToolsTitle: document.querySelector<HTMLElement>("#plusToolsTitle")!,
  tonightModeButton: document.querySelector<HTMLButtonElement>("#tonightModeButton")!,
  weeklyPlanButton: document.querySelector<HTMLButtonElement>("#weeklyPlanButton")!,
  challengeButton: document.querySelector<HTMLButtonElement>("#challengeButton")!,
  copyPlusPromptButton: document.querySelector<HTMLButtonElement>("#copyPlusPromptButton")!,
  shareFavoritesButton: document.querySelector<HTMLButtonElement>("#shareFavoritesButton")!,
  plusOutput: document.querySelector<HTMLDivElement>("#plusOutput")!,
  noAdsSection: document.querySelector<HTMLElement>("#noAdsSection")!,
  noAdsKicker: document.querySelector<HTMLElement>("#noAdsKicker")!,
  noAdsTitle: document.querySelector<HTMLElement>("#noAdsTitle")!,
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
  languageSubtitle: document.querySelector<HTMLParagraphElement>("#languageSubtitle")!,
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

function detectDeviceLanguage(): LanguageCode {
  // First run (no saved choice): match the device language so users see the
  // app in their own language instead of always-English. navigator.languages
  // is ordered by preference; try full tag (de-AT) then base (de).
  const prefs = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const pref of prefs) {
    if (!pref) continue;
    if (isLanguageCode(pref)) return pref;
    const base = pref.split("-")[0];
    if (isLanguageCode(base)) return base;
  }
  return "en";
}

function loadLanguage(): LanguageCode {
  const saved = localStorage.getItem(STORAGE_KEYS.language);
  if (isLanguageCode(saved)) return saved;
  return detectDeviceLanguage();
}

function uiCopy() {
  return resultCopy[activeLanguage] ?? resultCopy.en;
}

function plusUiCopy() {
  return plusCopy[activeLanguage];
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

type SoundKind = "click" | "heart";

let audioContext: AudioContext | undefined;
let lastClickSoundAt = 0;

function appAudioContext() {
  if (!ENABLE_UI_SOUNDS) return undefined;
  const AudioContextConstructor =
    window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextConstructor) return undefined;

  audioContext ??= new AudioContextConstructor();
  return audioContext;
}

async function unlockAppAudio() {
  const context = appAudioContext();
  if (!context) return;
  if (context.state === "suspended") {
    try {
      await context.resume();
    } catch {
      // The browser may still reject audio before a trusted user gesture.
    }
  }
}

async function playAppSound(kind: SoundKind) {
  const context = appAudioContext();
  if (!context) return;
  await unlockAppAudio();
  if (context.state !== "running") return;

  const now = performance.now();
  if (kind === "click" && now - lastClickSoundAt < 45) return;
  if (kind === "click") lastClickSoundAt = now;

  const start = context.currentTime;
  const tonePlan =
    kind === "heart"
      ? [
          { delay: 0, duration: 0.11, frequency: 392 },
          { delay: 0.075, duration: 0.16, frequency: 587.33 },
        ]
      : [{ delay: 0, duration: 0.055, frequency: 520 }];
  const master = context.createGain();
  const peak = kind === "heart" ? 0.09 : 0.05;
  const end = start + Math.max(...tonePlan.map((tone) => tone.delay + tone.duration)) + 0.035;

  master.gain.setValueAtTime(0.0001, start);
  master.gain.exponentialRampToValueAtTime(peak, start + 0.012);
  master.gain.exponentialRampToValueAtTime(0.0001, end);
  master.connect(context.destination);

  tonePlan.forEach((tone) => {
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const toneStart = start + tone.delay;
    const toneEnd = toneStart + tone.duration;

    oscillator.type = kind === "heart" ? "triangle" : "sine";
    oscillator.frequency.setValueAtTime(tone.frequency, toneStart);
    envelope.gain.setValueAtTime(0.0001, toneStart);
    envelope.gain.exponentialRampToValueAtTime(1, toneStart + 0.01);
    envelope.gain.exponentialRampToValueAtTime(0.0001, toneEnd);
    oscillator.connect(envelope);
    envelope.connect(master);
    oscillator.start(toneStart);
    oscillator.stop(toneEnd + 0.02);
  });
}

function playButtonClickSound(event: MouseEvent) {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const button = target.closest<HTMLButtonElement>("button");
  if (!button || button.disabled || button === elements.heartButton) return;
  void playAppSound("click");
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
  void hideBannerAd();
  setRestoreOpen(false);
}

function setPlusActive(sessionId?: string) {
  plusActive = true;
  plusStatus = "confirmed";
  localStorage.setItem(STORAGE_KEYS.plus, "true");
  if (sessionId) localStorage.setItem(STORAGE_KEYS.plusSession, sessionId);
  localStorage.removeItem(STORAGE_KEYS.pendingCheckoutSession);
  elements.adBanner.hidden = true;
  void hideBannerAd();
  setRestoreOpen(false);
}

function clearPlusActive() {
  plusActive = false;
  plusStatus = "note";
  localStorage.removeItem(STORAGE_KEYS.plus);
  localStorage.removeItem(STORAGE_KEYS.plusSession);
}

function adsRemoved() {
  return noAdsPurchased || plusActive;
}

let activeLanguage = loadLanguage();
let t = translations[activeLanguage];
let filters = normalizeFilters(loadJson<IdeaFilters>(STORAGE_KEYS.filters, defaultFilters));
let historyIds = loadJson<string[]>(STORAGE_KEYS.history, []);
let favoriteIds = new Set(loadJson<string[]>(STORAGE_KEYS.favorites, []));
let stats = normalizeStats(loadJson<PersistedStats>(STORAGE_KEYS.stats, { reveals: 0, adBreaks: 0 }));
let currentIdea: DateIdea | null = null;
let activeLibraryMode: "history" | "favorites" = "history";
let revealLocked = false;
let noAdsPurchased = localStorage.getItem(STORAGE_KEYS.noAds) === "true";
let plusActive = localStorage.getItem(STORAGE_KEYS.plus) === "true";
let paymentBusy = false;
let paymentStatusKey: PaymentStatusKey = "paymentNote";
let plusStatus: PlusStatus = plusActive ? "confirmed" : "note";
let restoreOpen = false;
let nativeStoreStatus: StorePurchaseStatus = storePurchaseStatus();

const ideaById = new Map(dateIdeas.map((entry) => [entry.id, entry]));

function updateNativeStoreStatus(status: StorePurchaseStatus) {
  nativeStoreStatus = status;
  applyTranslations();
}

function nativeStoreProductPrice(productId: StoreProductId, fallback: string) {
  return nativeStoreStatus.products[productId]?.price || fallback;
}

function isStoreProductUnavailable(errorMessage: string) {
  return errorMessage.toLowerCase().includes("not available");
}

function nativeStoreErrorMessage() {
  if (!nativeStoreStatus.error || isStoreProductUnavailable(nativeStoreStatus.error)) return "";
  return ` ${nativeStoreStatus.error}`;
}

function canUseLocalPurchaseTesting(errorMessage: string) {
  if (!ENABLE_LOCAL_PURCHASE_TESTING) return false;
  // In test builds (Simulator without StoreKit products), the store can also
  // report the product as "not found" (e.g. cdv-purchase #400). Treat that the
  // same as "not available" so the local purchase flow can be demoed/recorded.
  const lower = errorMessage.toLowerCase();
  return isStoreProductUnavailable(errorMessage) || lower.includes("not found") || lower.includes("#400");
}

function applyStoreEntitlement(entitlement: StoreEntitlement, productId: StoreProductId) {
  paymentBusy = false;
  paymentStatusKey = "paymentConfirmed";

  if (entitlement === "pro") {
    setPlusActive(productId);
  } else {
    setNoAdsPurchased();
  }

  applyTranslations();
  void syncBannerAd();
}

function ensureNativeStorePurchases() {
  if (!canUseStorePurchases()) return Promise.resolve(nativeStoreStatus);

  return initializeStorePurchases({
    onEntitlement: applyStoreEntitlement,
    onStatus: updateNativeStoreStatus,
  });
}

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
    this.heart.rotation.z = 0;
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
    // Real Bézier heart (Three.js canonical shape). The old sin³ point-sampling
    // produced a degenerate tail/kink at the bottom tip (visible on the live
    // app). This shape is symmetric by construction: two mirror Béziers meeting
    // at one clean bottom tip. Authored at scale 16 (x right, y up, tip near
    // origin), scaled by 0.16 to match the previous size; already upright, so
    // the constructor/animate rotation.z is 0 (was Math.PI to flip the old one).
    const s = 0.16;
    const shape = new THREE.Shape();
    shape.moveTo(0, 6 * s);
    shape.bezierCurveTo(0, 6.3 * s, -1.2 * s, 9 * s, -4 * s, 9 * s);
    shape.bezierCurveTo(-8.5 * s, 9 * s, -9 * s, 3.7 * s, -9 * s, 3.2 * s);
    shape.bezierCurveTo(-9 * s, -0.8 * s, -5.5 * s, -4.3 * s, 0, -8 * s);
    shape.bezierCurveTo(5.5 * s, -4.3 * s, 9 * s, -0.8 * s, 9 * s, 3.2 * s);
    shape.bezierCurveTo(9 * s, 3.7 * s, 8.5 * s, 9 * s, 4 * s, 9 * s);
    shape.bezierCurveTo(1.2 * s, 9 * s, 0, 6.3 * s, 0, 6 * s);
    shape.closePath();

    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.9,
      bevelEnabled: true,
      bevelThickness: 0.25,
      bevelSize: 0.22,
      bevelSegments: 16,
      curveSegments: 48,
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
    this.heart.rotation.z = pulse * 0.1 * this.pulseDirection;
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
  void playAppSound("heart");
  currentIdea = pickIdea();
  stats = {
    reveals: stats.reveals + 1,
    adBreaks: stats.adBreaks,
    nextAdRevealAt: stats.nextAdRevealAt,
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

    if (!adsRemoved() && ENABLE_INTERSTITIAL_AD && stats.reveals >= (stats.nextAdRevealAt ?? nextAdRevealTarget(stats.reveals))) {
      stats = { ...stats, nextAdRevealAt: nextAdRevealTarget(stats.reveals) };
      saveJson(STORAGE_KEYS.stats, stats);
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

function stripTrailingPunctuation(value: string) {
  return value.trim().replace(/[.!?。؟।]+$/u, "");
}

function buildDateplannerText(displayIdea: DateIdea) {
  const copy = uiCopy();
  return copy.aiPromptTemplate
    .replace("{title}", stripTrailingPunctuation(displayIdea.title))
    .replace("{prompt}", stripTrailingPunctuation(displayIdea.prompt))
    .replace("{prep}", stripTrailingPunctuation(displayIdea.prep));
}

function dateplannerLockedCopy() {
  return dateplannerLockCopy[activeLanguage];
}

function resetResultScroll() {
  elements.resultCard.scrollTo({ top: 0, behavior: "instant" });
  elements.resultOverlay.scrollTo({ top: 0, behavior: "instant" });
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
    ...(plusActive ? ["", `${uiCopy().aiPrompt}:`, buildDateplannerText(displayIdea)] : []),
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
  const dateplannerText = buildDateplannerText(displayIdea);
  const lockCopy = dateplannerLockedCopy();
  elements.dateplannerBox.classList.toggle("locked", !plusActive);
  elements.resultAiPrompt.textContent = plusActive ? dateplannerText : `${dateplannerText}\n\n${lockCopy.body}`;
  elements.dateplannerUnlockButton.hidden = plusActive;
  elements.dateplannerUnlockButton.textContent = lockCopy.button;
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
  resetResultScroll();
  elements.resultOverlay.hidden = false;
  elements.resultOverlay.classList.add("visible");
  window.requestAnimationFrame(resetResultScroll);
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

function setPlusOutput(title: string, lines: string[]) {
  const titleNode = document.createElement("strong");
  titleNode.textContent = title;
  const list = document.createElement("ul");
  list.replaceChildren(
    ...lines.map((line) => {
      const item = document.createElement("li");
      item.textContent = line;
      return item;
    }),
  );
  elements.plusOutput.replaceChildren(titleNode, list);
}

function requirePlus() {
  if (plusActive) return true;
  plusStatus = IS_NATIVE_APP ? "native" : "note";
  setPlusOutput(plusUiCopy().label, [plusUiCopy().unlockRequired]);
  applyTranslations();
  return false;
}

function plusIdeaPool(filterOverride?: IdeaFilters) {
  const source = filterIdeas(filterOverride ?? filters);
  return source.length > 0 ? source : dateIdeas;
}

function pickPlusIdeas(count: number, filterOverride?: IdeaFilters) {
  const source = plusIdeaPool(filterOverride);
  const picks: DateIdea[] = [];
  const usedFamilies = new Set<string>();
  let guard = 0;

  while (picks.length < count && guard < source.length * 4) {
    guard += 1;
    const candidate = source[randomIndex(source.length)];
    if (usedFamilies.has(candidate.family) && usedFamilies.size < source.length) continue;
    usedFamilies.add(candidate.family);
    if (!picks.some((entry) => entry.id === candidate.id)) picks.push(candidate);
  }

  return picks;
}

function localizedWeekdays(language: LanguageCode) {
  const firstMonday = Date.UTC(2026, 0, 5, 12);
  return Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(language, { weekday: "short", timeZone: "UTC" }).format(
      new Date(firstMonday + index * 24 * 60 * 60 * 1000),
    ),
  );
}

function activateTonightMode() {
  if (!requirePlus()) return;
  filters = { category: filters.category, budget: "Up to 40 EUR", duration: "Evening" };
  saveFilters();
  setPlusOutput(plusUiCopy().tonightMode, [
    labelFor("budget", filters.budget, activeLanguage, activeBudgetMarket()),
    labelFor("duration", filters.duration, activeLanguage),
  ]);
}

function buildWeeklyPlan() {
  if (!requirePlus()) return;

  const market = activeBudgetMarket();
  const days = localizedWeekdays(activeLanguage);
  const plan = pickPlusIdeas(7).map((idea, index) => {
    const displayIdea = localizeIdea(idea, activeLanguage, market);
    return `${days[index]}: ${displayIdea.title} · ${labelFor("duration", idea.duration, activeLanguage)}`;
  });

  setPlusOutput(plusUiCopy().weekPlan, plan);
}

function buildChallenge() {
  if (!requirePlus()) return;

  const challengeFilters: IdeaFilters = {
    category: ["Deep Talk", "Creative", "Movement", "Mini Adventure"][randomIndex(4)] as DateCategory,
    budget: filters.budget,
    duration: filters.duration,
  };
  const idea = pickPlusIdeas(1, normalizeFilters(challengeFilters))[0] ?? pickIdea();
  const displayIdea = localizeIdea(idea, activeLanguage, activeBudgetMarket());
  setPlusOutput(plusUiCopy().challenge, [displayIdea.title, displayIdea.prompt, `${t.prep}: ${displayIdea.prep}`]);
}

function plusPlannerPrompt() {
  const market = activeBudgetMarket();
  const favoriteTitles = [...favoriteIds]
    .slice(0, 8)
    .map((id) => ideaById.get(id))
    .filter(Boolean)
    .map((idea) => localizeIdea(idea as DateIdea, activeLanguage, market).title);
  const current = currentIdea ? localizeIdea(currentIdea, activeLanguage, market) : null;
  const filterSummary = [
    filters.category !== "All" ? labelFor("category", filters.category, activeLanguage) : t.all,
    filters.budget !== "All" ? labelFor("budget", filters.budget, activeLanguage, market) : t.all,
    filters.duration !== "All" ? labelFor("duration", filters.duration, activeLanguage) : t.all,
  ].join(" · ");

  const plannerCopy = plusPlannerPromptCopy[activeLanguage];

  return [
    plannerCopy.intro,
    `${t.filters}: ${filterSummary}`,
    current ? `${t.resultLabel} ${current.title}. ${current.prompt}` : "",
    favoriteTitles.length > 0 ? `${t.favorites}: ${favoriteTitles.join(", ")}` : "",
    plannerCopy.outro,
  ]
    .filter(Boolean)
    .join("\n");
}

async function copyPlusPlannerPrompt() {
  if (!requirePlus()) return;

  try {
    await copyText(plusPlannerPrompt());
    setPlusOutput(plusUiCopy().copyAiPlanner, [plusUiCopy().outputCopied]);
  } catch (error) {
    console.error(error);
  }
}

async function shareFavoritesExport() {
  if (!requirePlus()) return;

  const market = activeBudgetMarket();
  const favorites = [...favoriteIds]
    .map((id) => ideaById.get(id))
    .filter(Boolean)
    .slice(0, 20) as DateIdea[];

  if (favorites.length === 0) {
    setPlusOutput(plusUiCopy().shareFavorites, [t.emptyFavorites]);
    return;
  }

  const text = [
    `${APP_NAME} ${t.favorites}`,
    ...favorites.map((idea, index) => {
      const displayIdea = localizeIdea(idea, activeLanguage, market);
      return `${index + 1}. ${displayIdea.title} - ${displayIdea.prompt}`;
    }),
  ].join("\n");

  try {
    await copyText(text);
    setPlusOutput(plusUiCopy().shareFavorites, [plusUiCopy().outputCopied]);
  } catch (error) {
    console.error(error);
  }
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
  elements.restorePurchaseForm.hidden = IS_NATIVE_APP || !open;
  elements.restoreToggleButton.setAttribute("aria-expanded", String(!IS_NATIVE_APP && open));
}

async function showAdBreak() {
  if (canUseNativeAds()) {
    const shown = await showInterstitialAd();
    if (shown) {
      stats = { ...stats, adBreaks: stats.adBreaks + 1 };
      saveJson(STORAGE_KEYS.stats, stats);
      return;
    }

    if (!ENABLE_WEB_AD_PLACEHOLDER) return;
  }

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
  setSupportDropdown(false);
  applyTranslations();
  openPanel(elements.infoOverlay);
}

function plusStatusMessage() {
  const copy = plusUiCopy();
  if (plusActive) return copy.statusConfirmed;
  if (plusStatus === "starting") return copy.statusStarting;
  if (plusStatus === "verifying") return copy.statusVerifying;
  if (plusStatus === "confirmed") return copy.statusConfirmed;
  if (plusStatus === "failed") return copy.statusFailed;
  if (plusStatus === "unavailable") return `${copy.statusUnavailable}${nativeStoreErrorMessage()}`;
  if (IS_NATIVE_APP) return `${copy.nativeBilling}${nativeStoreErrorMessage()}`;
  if (plusStatus === "native") return copy.nativeBilling;
  return copy.statusNote;
}

function noAdsStatusMessage() {
  const copy = plusUiCopy();
  if (noAdsPurchased || plusActive) return t.paymentConfirmed;
  if (paymentStatusKey !== "paymentNote") return t[paymentStatusKey];
  if (IS_NATIVE_APP) return `${copy.nativeNoAdsBilling}${nativeStoreErrorMessage()}`;
  return t[paymentStatusKey];
}

function showPurchase() {
  if (!SHOW_PLUS_ENTRY) return;
  setRestoreOpen(false);
  paymentStatusKey = noAdsPurchased ? "paymentConfirmed" : "paymentNote";
  applyTranslations();
  openPanel(elements.purchaseOverlay);
}

function setNativeBannerLayout(visible: boolean) {
  const shouldReserveSpace = canUseNativeAds() && ENABLE_AD_BANNER && !adsRemoved() && (visible || IS_NATIVE_APP);
  document.documentElement.classList.toggle("native-ad-visible", shouldReserveSpace);
  document.body.classList.toggle("native-ad-visible", shouldReserveSpace);
  if (canUseNativeAds()) elements.adBanner.hidden = true;
}

async function syncBannerAd() {
  if (!canUseNativeAds()) {
    setNativeBannerLayout(false);
    elements.adBanner.hidden = adsRemoved() || !ENABLE_AD_BANNER;
    return;
  }

  elements.adBanner.hidden = true;
  if (adsRemoved()) {
    setNativeBannerLayout(false);
    await hideBannerAd();
    return;
  }

  const shown = await showBannerAd();
  setNativeBannerLayout(shown);
  elements.adBanner.hidden = shown || !ENABLE_WEB_AD_PLACEHOLDER;
}

async function buyPlus(plan: PlusPlan) {
  if (plusActive || paymentBusy) return;

  if (canUseStorePurchases()) {
    paymentBusy = true;
    plusStatus = "starting";
    applyTranslations();

    await ensureNativeStorePurchases();
    const result = await purchaseStoreProduct(plan);
    paymentBusy = false;

    if (result.ok) {
      plusStatus = "verifying";
    } else {
      const errorMessage = result.error || "Store purchase could not be started.";
      if (canUseLocalPurchaseTesting(errorMessage)) {
        nativeStoreStatus = { ...nativeStoreStatus, error: undefined };
        setPlusActive(plan);
      } else {
        nativeStoreStatus = { ...nativeStoreStatus, error: errorMessage };
        plusStatus = isStoreProductUnavailable(errorMessage) ? "unavailable" : "failed";
      }
    }

    applyTranslations();
    return;
  }

  paymentBusy = true;
  plusStatus = "starting";
  applyTranslations();

  const market = activeBudgetMarket();
  const returnUrl = cleanCheckoutUrl().toString();
  const endpoints = endpointCandidates(import.meta.env.VITE_CHECKOUT_ENDPOINT, [
    "/api/create-checkout-session",
    "/.netlify/functions/create-checkout-session",
  ]);

  try {
    const payload = await postJsonToFirstAvailable(endpoints, {
      clientReferenceId: purchaseClientId(),
      currency: market.currency,
      language: activeLanguage,
      locale: market.locale,
      product: plan === STORE_PRODUCTS.proYearly ? "dateheart_plus_yearly" : "dateheart_plus_monthly",
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
    plusStatus = error instanceof Error && error.message.includes("payment_unavailable") ? "unavailable" : "failed";
    applyTranslations();
  }
}

async function buyNoAds() {
  if (adsRemoved() || paymentBusy) return;

  if (canUseStorePurchases()) {
    paymentBusy = true;
    paymentStatusKey = "paymentStarting";
    applyTranslations();

    await ensureNativeStorePurchases();
    const result = await purchaseStoreProduct(STORE_PRODUCTS.noAds);
    paymentBusy = false;

    if (result.ok) {
      paymentStatusKey = "paymentVerifying";
    } else {
      const errorMessage = result.error || "Store purchase could not be started.";
      if (canUseLocalPurchaseTesting(errorMessage)) {
        nativeStoreStatus = { ...nativeStoreStatus, error: undefined };
        setNoAdsPurchased();
        paymentStatusKey = "paymentConfirmed";
      } else {
        nativeStoreStatus = { ...nativeStoreStatus, error: errorMessage };
        paymentStatusKey = isStoreProductUnavailable(errorMessage) ? "paymentUnavailable" : "paymentFailed";
      }
    }

    applyTranslations();
    return;
  }

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

async function verifyCheckoutSession(sessionId: string, showStatus: boolean, persistPending = true) {
  paymentBusy = true;
  paymentStatusKey = "paymentVerifying";
  plusStatus = "verifying";
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
    if (payload.plus === true) {
      setPlusActive(sessionId);
      paymentStatusKey = "paymentConfirmed";
    } else if (payload.paid === true || payload.noAds === true) {
      setNoAdsPurchased();
      paymentStatusKey = "paymentConfirmed";
      if (!persistPending) clearPlusActive();
    } else {
      if (persistPending) {
        paymentStatusKey = "paymentVerifying";
        plusStatus = "verifying";
        localStorage.setItem(STORAGE_KEYS.pendingCheckoutSession, sessionId);
      } else {
        clearPlusActive();
        paymentStatusKey = "paymentFailed";
      }
    }
  } catch (error) {
    console.error(error);
    paymentStatusKey = "paymentFailed";
    plusStatus = "failed";
  } finally {
    paymentBusy = false;
    applyTranslations();
  }
}

async function restoreNoAdsPurchase() {
  if (adsRemoved() || paymentBusy) return;

  if (IS_NATIVE_APP) {
    paymentBusy = true;
    paymentStatusKey = "restoreStarting";
    plusStatus = "verifying";
    applyTranslations();

    await ensureNativeStorePurchases();
    const result = await restoreStorePurchases();
    paymentBusy = false;

    if (result.ok) {
      paymentStatusKey = adsRemoved() ? "restoreConfirmed" : "restoreNotFound";
      plusStatus = plusActive ? "confirmed" : "note";
    } else {
      nativeStoreStatus = { ...nativeStoreStatus, error: result.error };
      paymentStatusKey = "paymentFailed";
      plusStatus = "failed";
    }

    applyTranslations();
    return;
  }

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
    if (payload.plus === true) {
      setPlusActive();
      paymentStatusKey = "restoreConfirmed";
    } else if (payload.paid === true || payload.noAds === true) {
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
  if (pendingSessionId && !adsRemoved()) {
    void verifyCheckoutSession(pendingSessionId, false);
  }

  const plusSessionId = localStorage.getItem(STORAGE_KEYS.plusSession);
  if (plusActive && plusSessionId) {
    void verifyCheckoutSession(plusSessionId, false, false);
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

  const availableCount = languages.filter((language) => language.available).length;
  const base = activeLanguage.split("-")[0];
  elements.languageSubtitle.textContent =
    base === "de" ? `${availableCount} Sprachen verfügbar`
    : base === "es" ? `${availableCount} idiomas disponibles`
    : base === "fr" ? `${availableCount} langues disponibles`
    : `${availableCount} languages available`;

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
  const noAdsPrice = nativeStoreProductPrice(STORE_PRODUCTS.noAds, formatNoAdsPrice(market));
  const plusMonthlyPrice = nativeStoreProductPrice(STORE_PRODUCTS.proMonthly, formatPlusPrice(market, "month"));
  const plusYearlyPrice = nativeStoreProductPrice(STORE_PRODUCTS.proYearly, formatPlusPrice(market, "year"));
  const paymentPrice = noAdsPriceForMarket(market);
  const plusCopy = plusUiCopy();

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
  elements.plusButton.setAttribute("aria-label", plusCopy.button);
  elements.plusButton.title = plusCopy.button;
  elements.plusButton.hidden = !SHOW_PLUS_ENTRY;
  elements.plusButton.classList.toggle("active", plusActive);
  elements.favoritesButton.setAttribute("aria-label", t.favorites);
  elements.favoritesButton.title = t.favorites;
  elements.historyButton.setAttribute("aria-label", t.history);
  elements.historyButton.title = t.history;
  elements.infoButton.setAttribute("aria-label", t.about);
  elements.infoButton.title = t.about;
  elements.adPrivacyButton.hidden = !canShowAdPrivacyOptions();
  elements.adPrivacyButton.querySelector("span")!.textContent = adPrivacyCopy[activeLanguage];
  elements.legalLinks.setAttribute("aria-label", t.legal);
  elements.supportMenuButton.textContent = t.support;
  elements.privacyLink.textContent = t.privacy;
  elements.termsLink.textContent = t.terms;
  elements.imprintLink.textContent = t.imprint;
  elements.supportEmailLink.querySelector("span")!.textContent = supportEmailCopy[activeLanguage];
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
  elements.purchaseLabel.textContent = plusCopy.label;
  elements.purchaseTitle.textContent = plusCopy.title;
  elements.plusBody.textContent = plusCopy.body;
  elements.plusPlanIntro.textContent = plusCopy.plusIntro;
  elements.plusMonthlyLabel.textContent = plusCopy.monthly;
  elements.plusMonthlyPrice.textContent = plusMonthlyPrice;
  elements.plusMonthlySuffix.textContent = plusCopy.monthSuffix;
  elements.plusMonthlyCta.textContent = plusActive ? plusCopy.active : plusCopy.subscribeMonthly;
  elements.plusYearlyLabel.textContent = plusCopy.yearly;
  elements.plusYearlyPrice.textContent = plusYearlyPrice;
  elements.plusYearlySuffix.textContent = plusCopy.yearSuffix;
  elements.plusYearlyCta.textContent = plusActive ? plusCopy.active : plusCopy.subscribeYearly;
  elements.buyPlusMonthlyButton.setAttribute("aria-label", `${plusCopy.subscribeMonthly}: ${plusMonthlyPrice}`);
  elements.buyPlusYearlyButton.setAttribute("aria-label", `${plusCopy.subscribeYearly}: ${plusYearlyPrice}`);
  elements.buyPlusMonthlyButton.disabled = plusActive || paymentBusy;
  elements.buyPlusYearlyButton.disabled = plusActive || paymentBusy;
  elements.plusStatus.textContent = plusStatusMessage();
  elements.plusFeatureNoAds.textContent = plusCopy.featureNoAds;
  elements.plusFeaturePlanner.textContent = plusCopy.featurePlanner;
  elements.plusFeatureWeek.textContent = plusCopy.featureWeek;
  elements.plusFeatureChallenges.textContent = plusCopy.featureChallenges;
  elements.plusFeatureSync.textContent = plusCopy.featureSync;
  elements.plusFeatureFilters.textContent = plusCopy.featureFilters;
  elements.plusFeaturePacks.textContent = plusCopy.featurePacks;
  elements.plusToolsTitle.textContent = plusCopy.toolsTitle;
  elements.tonightModeButton.textContent = plusCopy.tonightMode;
  elements.weeklyPlanButton.textContent = plusCopy.weekPlan;
  elements.challengeButton.textContent = plusCopy.challenge;
  elements.copyPlusPromptButton.textContent = plusCopy.copyAiPlanner;
  elements.shareFavoritesButton.textContent = plusCopy.shareFavorites;
  elements.plusTools.classList.toggle("locked", !plusActive);
  elements.noAdsKicker.textContent = t.removeAds;
  elements.noAdsTitle.textContent = t.removeAdsTitle;
  elements.purchasePrice.textContent = noAdsPrice;
  elements.purchasePrice.title = paymentPrice.currency;
  elements.purchaseBody.textContent = t.removeAdsBody;
  elements.paymentStatus.textContent = noAdsStatusMessage();
  elements.buyNoAdsButton.textContent = paymentBusy
    ? t.paymentStarting
    : adsRemoved()
      ? t.noAdsPurchased
      : t.buyNoAds.replace("{price}", noAdsPrice);
  elements.buyNoAdsButton.disabled = adsRemoved() || paymentBusy;
  elements.restoreToggleButton.textContent = t.restoreNoAds;
  elements.restoreToggleButton.disabled = adsRemoved() || paymentBusy;
  elements.restoreEmailInput.placeholder = t.restoreEmailPlaceholder;
  elements.restoreEmailInput.setAttribute("aria-label", t.restoreEmailPlaceholder);
  elements.restorePurchaseButton.textContent = paymentBusy ? t.restoreStarting : t.restoreNoAds;
  elements.restorePurchaseButton.disabled = adsRemoved() || paymentBusy;
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

document.addEventListener("pointerdown", () => void unlockAppAudio(), { capture: true });
document.addEventListener("click", playButtonClickSound, { capture: true });
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
elements.dateplannerUnlockButton.addEventListener("click", showPurchase);
elements.filterActionButton.addEventListener("click", () => openPanel(elements.filterPanel));
elements.plusButton.addEventListener("click", showPurchase);
elements.buyPlusMonthlyButton.addEventListener("click", () => void buyPlus(STORE_PRODUCTS.proMonthly));
elements.buyPlusYearlyButton.addEventListener("click", () => void buyPlus(STORE_PRODUCTS.proYearly));
elements.tonightModeButton.addEventListener("click", activateTonightMode);
elements.weeklyPlanButton.addEventListener("click", buildWeeklyPlan);
elements.challengeButton.addEventListener("click", buildChallenge);
elements.copyPlusPromptButton.addEventListener("click", () => void copyPlusPlannerPrompt());
elements.shareFavoritesButton.addEventListener("click", () => void shareFavoritesExport());
elements.buyNoAdsButton.addEventListener("click", buyNoAds);
elements.restoreToggleButton.addEventListener("click", () => {
  if (IS_NATIVE_APP) {
    void restoreNoAdsPurchase();
    return;
  }

  setRestoreOpen(!restoreOpen);
});
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
  void showAdPrivacyOptions().finally(() => {
    applyTranslations();
    void syncBannerAd();
  });
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

if (IS_NATIVE_APP && "serviceWorker" in navigator) {
  void navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => void registration.unregister());
  });
}

if (IS_NATIVE_APP && "caches" in window) {
  void caches.keys().then((cacheKeys) => {
    cacheKeys.forEach((cacheKey) => void caches.delete(cacheKey));
  });
}

if (!IS_NATIVE_APP && import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, {
      scope: import.meta.env.BASE_URL,
    });
  });
}

onBannerVisibilityChange(setNativeBannerLayout);
applyTranslations();
renderFilters();
renderLanguageList();
handleCheckoutReturn();
handleSharedLink();
updateCounter();
void ensureNativeStorePurchases().finally(() => applyTranslations());
void initializeAds().finally(() => {
  applyTranslations();
  void syncBannerAd();
  window.setTimeout(() => void syncBannerAd(), 1500);
  window.setTimeout(() => void syncBannerAd(), 5000);
});
