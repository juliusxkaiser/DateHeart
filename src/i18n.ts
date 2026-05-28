import type { DateIdea } from "./dateIdeas";

export type LanguageCode = "en" | "de";

export type LanguageOption = {
  code: string;
  flag: string;
  name: string;
  nativeName: string;
  dir?: "rtl";
  available: boolean;
};

export const verifiedLanguageCodes = ["en", "de"] as const satisfies readonly LanguageCode[];

const verifiedLanguageMeta: Record<LanguageCode, Pick<LanguageOption, "flag" | "name" | "nativeName">> = {
  en: { flag: "🇺🇸", name: "English", nativeName: "English" },
  de: { flag: "🇩🇪", name: "German", nativeName: "Deutsch" },
};

export const iso6391LanguageCodes = [
  "aa",
  "ab",
  "ae",
  "af",
  "ak",
  "am",
  "an",
  "ar",
  "as",
  "av",
  "ay",
  "az",
  "ba",
  "be",
  "bg",
  "bh",
  "bi",
  "bm",
  "bn",
  "bo",
  "br",
  "bs",
  "ca",
  "ce",
  "ch",
  "co",
  "cr",
  "cs",
  "cu",
  "cv",
  "cy",
  "da",
  "de",
  "dv",
  "dz",
  "ee",
  "el",
  "en",
  "eo",
  "es",
  "et",
  "eu",
  "fa",
  "ff",
  "fi",
  "fj",
  "fo",
  "fr",
  "fy",
  "ga",
  "gd",
  "gl",
  "gn",
  "gu",
  "gv",
  "ha",
  "he",
  "hi",
  "ho",
  "hr",
  "ht",
  "hu",
  "hy",
  "hz",
  "ia",
  "id",
  "ie",
  "ig",
  "ii",
  "ik",
  "io",
  "is",
  "it",
  "iu",
  "ja",
  "jv",
  "ka",
  "kg",
  "ki",
  "kj",
  "kk",
  "kl",
  "km",
  "kn",
  "ko",
  "kr",
  "ks",
  "ku",
  "kv",
  "kw",
  "ky",
  "la",
  "lb",
  "lg",
  "li",
  "ln",
  "lo",
  "lt",
  "lu",
  "lv",
  "mg",
  "mh",
  "mi",
  "mk",
  "ml",
  "mn",
  "mr",
  "ms",
  "mt",
  "my",
  "na",
  "nb",
  "nd",
  "ne",
  "ng",
  "nl",
  "nn",
  "no",
  "nr",
  "nv",
  "ny",
  "oc",
  "oj",
  "om",
  "or",
  "os",
  "pa",
  "pi",
  "pl",
  "ps",
  "pt",
  "qu",
  "rm",
  "rn",
  "ro",
  "ru",
  "rw",
  "sa",
  "sc",
  "sd",
  "se",
  "sg",
  "si",
  "sk",
  "sl",
  "sm",
  "sn",
  "so",
  "sq",
  "sr",
  "ss",
  "st",
  "su",
  "sv",
  "sw",
  "ta",
  "te",
  "tg",
  "th",
  "ti",
  "tk",
  "tl",
  "tn",
  "to",
  "tr",
  "ts",
  "tt",
  "tw",
  "ty",
  "ug",
  "uk",
  "ur",
  "uz",
  "ve",
  "vi",
  "vo",
  "wa",
  "wo",
  "xh",
  "yi",
  "yo",
  "za",
  "zh",
  "zu",
] as const;

const rtlLanguageCodes = new Set(["ar", "dv", "fa", "he", "ps", "sd", "ug", "ur", "yi"]);

const languageNameFallbacks: Record<string, string> = {
  aa: "Afar",
  ab: "Abkhazian",
  ae: "Avestan",
  af: "Afrikaans",
  ak: "Akan",
  am: "Amharic",
  an: "Aragonese",
  ar: "Arabic",
  as: "Assamese",
  av: "Avaric",
  ay: "Aymara",
  az: "Azerbaijani",
  ba: "Bashkir",
  be: "Belarusian",
  bg: "Bulgarian",
  bh: "Bihari languages",
  bi: "Bislama",
  bm: "Bambara",
  bn: "Bengali",
  bo: "Tibetan",
  br: "Breton",
  bs: "Bosnian",
  ca: "Catalan",
  ce: "Chechen",
  ch: "Chamorro",
  co: "Corsican",
  cr: "Cree",
  cs: "Czech",
  cu: "Church Slavic",
  cv: "Chuvash",
  cy: "Welsh",
  da: "Danish",
  de: "German",
  dv: "Divehi",
  dz: "Dzongkha",
  ee: "Ewe",
  el: "Greek",
  en: "English",
  eo: "Esperanto",
  es: "Spanish",
  et: "Estonian",
  eu: "Basque",
  fa: "Persian",
  ff: "Fulah",
  fi: "Finnish",
  fj: "Fijian",
  fo: "Faroese",
  fr: "French",
  fy: "Western Frisian",
  ga: "Irish",
  gd: "Scottish Gaelic",
  gl: "Galician",
  gn: "Guarani",
  gu: "Gujarati",
  gv: "Manx",
  ha: "Hausa",
  he: "Hebrew",
  hi: "Hindi",
  ho: "Hiri Motu",
  hr: "Croatian",
  ht: "Haitian",
  hu: "Hungarian",
  hy: "Armenian",
  hz: "Herero",
  ia: "Interlingua",
  id: "Indonesian",
  ie: "Interlingue",
  ig: "Igbo",
  ii: "Sichuan Yi",
  ik: "Inupiaq",
  io: "Ido",
  is: "Icelandic",
  it: "Italian",
  iu: "Inuktitut",
  ja: "Japanese",
  jv: "Javanese",
  ka: "Georgian",
  kg: "Kongo",
  ki: "Kikuyu",
  kj: "Kuanyama",
  kk: "Kazakh",
  kl: "Kalaallisut",
  km: "Khmer",
  kn: "Kannada",
  ko: "Korean",
  kr: "Kanuri",
  ks: "Kashmiri",
  ku: "Kurdish",
  kv: "Komi",
  kw: "Cornish",
  ky: "Kyrgyz",
  la: "Latin",
  lb: "Luxembourgish",
  lg: "Ganda",
  li: "Limburgish",
  ln: "Lingala",
  lo: "Lao",
  lt: "Lithuanian",
  lu: "Luba-Katanga",
  lv: "Latvian",
  mg: "Malagasy",
  mh: "Marshallese",
  mi: "Maori",
  mk: "Macedonian",
  ml: "Malayalam",
  mn: "Mongolian",
  mr: "Marathi",
  ms: "Malay",
  mt: "Maltese",
  my: "Burmese",
  na: "Nauru",
  nb: "Norwegian Bokmal",
  nd: "North Ndebele",
  ne: "Nepali",
  ng: "Ndonga",
  nl: "Dutch",
  nn: "Norwegian Nynorsk",
  no: "Norwegian",
  nr: "South Ndebele",
  nv: "Navajo",
  ny: "Nyanja",
  oc: "Occitan",
  oj: "Ojibwa",
  om: "Oromo",
  or: "Odia",
  os: "Ossetian",
  pa: "Punjabi",
  pi: "Pali",
  pl: "Polish",
  ps: "Pashto",
  pt: "Portuguese",
  qu: "Quechua",
  rm: "Romansh",
  rn: "Rundi",
  ro: "Romanian",
  ru: "Russian",
  rw: "Kinyarwanda",
  sa: "Sanskrit",
  sc: "Sardinian",
  sd: "Sindhi",
  se: "Northern Sami",
  sg: "Sango",
  si: "Sinhala",
  sk: "Slovak",
  sl: "Slovenian",
  sm: "Samoan",
  sn: "Shona",
  so: "Somali",
  sq: "Albanian",
  sr: "Serbian",
  ss: "Swati",
  st: "Southern Sotho",
  su: "Sundanese",
  sv: "Swedish",
  sw: "Swahili",
  ta: "Tamil",
  te: "Telugu",
  tg: "Tajik",
  th: "Thai",
  ti: "Tigrinya",
  tk: "Turkmen",
  tl: "Tagalog",
  tn: "Tswana",
  to: "Tongan",
  tr: "Turkish",
  ts: "Tsonga",
  tt: "Tatar",
  tw: "Twi",
  ty: "Tahitian",
  ug: "Uyghur",
  uk: "Ukrainian",
  ur: "Urdu",
  uz: "Uzbek",
  ve: "Venda",
  vi: "Vietnamese",
  vo: "Volapuk",
  wa: "Walloon",
  wo: "Wolof",
  xh: "Xhosa",
  yi: "Yiddish",
  yo: "Yoruba",
  za: "Zhuang",
  zh: "Chinese",
  zu: "Zulu",
};

function displayName(code: string, locale: string) {
  if (locale === "en" && languageNameFallbacks[code]) {
    return languageNameFallbacks[code];
  }

  try {
    const name = new Intl.DisplayNames([locale], { type: "language" }).of(code);
    if (name && name.toLowerCase() !== code) return name;
  } catch {
    // Browser ICU data differs by platform; static ISO names keep the list readable.
  }

  return languageNameFallbacks[code] ?? code.toUpperCase();
}

export function isLanguageCode(value: string | null | undefined): value is LanguageCode {
  return value === "en" || value === "de";
}

export const languages: LanguageOption[] = iso6391LanguageCodes
  .map((code) => {
    const verified = isLanguageCode(code);
    const meta = verified ? verifiedLanguageMeta[code] : undefined;

    return {
      code,
      flag: meta?.flag ?? "🌐",
      name: meta?.name ?? displayName(code, "en"),
      nativeName: meta?.nativeName ?? languageNameFallbacks[code] ?? displayName(code, code),
      dir: rtlLanguageCodes.has(code) ? ("rtl" as const) : undefined,
      available: verified,
    };
  })
  .sort((left, right) => {
    if (left.available !== right.available) return left.available ? -1 : 1;
    return left.name.localeCompare(right.name, "en");
  });

type Translation = {
  ready: string;
  tapCopy: string;
  resultLabel: string;
  prep: string;
  save: string;
  saved: string;
  share: string;
  copied: string;
  next: string;
  filters: string;
  removeAds: string;
  removeAdsTitle: string;
  removeAdsBody: string;
  buyNoAds: string;
  noAdsPurchased: string;
  category: string;
  budget: string;
  duration: string;
  all: string;
  reset: string;
  history: string;
  favorites: string;
  emptyHistory: string;
  emptyFavorites: string;
  language: string;
  about: string;
  aboutTitle: string;
  aboutBody: string;
  aboutPoint1: string;
  aboutPoint2: string;
  aboutPoint3: string;
  close: string;
};

export const translations: Record<LanguageCode, Translation> = {
  en: {
    ready: "Choose a vibe",
    tapCopy: "Tap the heart. Get your next date cue.",
    resultLabel: "Your date idea:",
    prep: "Prepare",
    save: "Save",
    saved: "Saved",
    share: "Share",
    copied: "Copied",
    next: "New idea",
    filters: "Filters",
    removeAds: "Remove ads",
    removeAdsTitle: "DateHeart without ads",
    removeAdsBody: "Remove future ad placements from DateHeart with a one-time purchase.",
    buyNoAds: "Buy for 4,99 EUR",
    noAdsPurchased: "Purchased",
    category: "Category",
    budget: "Budget",
    duration: "Duration",
    all: "All",
    reset: "Allow all ideas",
    history: "History",
    favorites: "Favorites",
    emptyHistory: "No date idea yet.",
    emptyFavorites: "No saved ideas yet.",
    language: "Language",
    about: "About",
    aboutTitle: "What is DateHeart?",
    aboutBody: "DateHeart gives couples practical date ideas with one tap. Choose a language, set a vibe, then save the ideas you actually want to do.",
    aboutPoint1: "Practical date ideas",
    aboutPoint2: "Favorites and history",
    aboutPoint3: "Free app concept",
    close: "Close",
  },
  de: {
    ready: "Wählt eine Stimmung",
    tapCopy: "Tippt auf das Herz und bekommt eure nächste Date-Idee.",
    resultLabel: "Eure Date-Idee:",
    prep: "Vorbereiten",
    save: "Merken",
    saved: "Gemerkt",
    share: "Teilen",
    copied: "Kopiert",
    next: "Neue Idee",
    filters: "Filter",
    removeAds: "Ohne Werbung",
    removeAdsTitle: "DateHeart ohne Werbung",
    removeAdsBody: "Entfernt zukünftige Werbeplätze in DateHeart mit einem einmaligen Kauf.",
    buyNoAds: "Für 4,99 EUR kaufen",
    noAdsPurchased: "Gekauft",
    category: "Kategorie",
    budget: "Budget",
    duration: "Dauer",
    all: "Alle",
    reset: "Alle Ideen zulassen",
    history: "Verlauf",
    favorites: "Favoriten",
    emptyHistory: "Noch keine Date-Idee gezogen.",
    emptyFavorites: "Noch keine Idee gemerkt.",
    language: "Sprache",
    about: "Info",
    aboutTitle: "Was ist DateHeart?",
    aboutBody: "DateHeart gibt Paaren mit einem Tippen praktische Date-Ideen. Wählt Sprache, Stimmung, Budget und Dauer und merkt euch die Ideen, die ihr wirklich machen wollt.",
    aboutPoint1: "Praktische Date-Ideen",
    aboutPoint2: "Favoriten und Verlauf",
    aboutPoint3: "Kostenloses App-Konzept",
    close: "Schließen",
  },
};

export const categoryLabels: Record<LanguageCode, Partial<Record<string, string>>> = {
  en: {},
  de: {
    Home: "Zuhause",
    Outdoors: "Draußen",
    Food: "Essen",
    Creative: "Kreativ",
    Movement: "Bewegung",
    "Mini Adventure": "Mini-Abenteuer",
    Culture: "Kultur",
    "Deep Talk": "Tiefgang",
    "Rainy Day": "Regen",
    Seasonal: "Saisonal",
  },
};

export const budgetLabels: Record<LanguageCode, Partial<Record<string, string>>> = {
  en: {},
  de: {
    Free: "kostenlos",
    "Up to 15 EUR": "bis 15 EUR",
    "Up to 40 EUR": "bis 40 EUR",
    "Up to 100 EUR": "bis 100 EUR",
    Unlimited: "unbegrenzt",
  },
};

export const durationLabels: Record<LanguageCode, Partial<Record<string, string>>> = {
  en: {},
  de: {
    "30 min": "30 Minuten",
    "60-90 min": "60-90 Minuten",
    "2-3 hours": "2-3 Stunden",
    "Half day": "halber Tag",
    Evening: "Abend",
  },
};

const deTags: Record<string, string> = {
  analog: "analog",
  anniversary: "Jahrestag",
  appreciation: "Wertschätzung",
  art: "Kunst",
  autumn: "Herbst",
  arcade: "Arcade",
  archery: "Bogenschießen",
  aquarium: "Aquarium",
  bike: "Radfahren",
  books: "Bücher",
  bowling: "Bowling",
  breakfast: "Frühstück",
  building: "Bauen",
  budget: "Budget",
  care: "achtsam",
  canoe: "Kanu",
  city: "Stadt",
  clarity: "Klarheit",
  classic: "klassisch",
  clay: "Knete",
  climbing: "Klettern",
  close: "nah",
  coffee: "Kaffee",
  comedy: "Comedy",
  cooking: "Kochen",
  cozy: "gemütlich",
  craft: "Basteln",
  creative: "kreativ",
  culture: "Kultur",
  deep: "tiefgehend",
  design: "Design",
  dinner: "Dinner",
  discover: "entdecken",
  drink: "Drinks",
  easy: "leicht",
  explore: "erkunden",
  film: "Film",
  focus: "Fokus",
  food: "Essen",
  fun: "lustig",
  future: "Zukunft",
  game: "Spiel",
  gift: "Geschenk",
  garden: "Garten",
  "hands-on": "praktisch",
  history: "Geschichte",
  home: "Zuhause",
  ice: "Eis",
  jump: "Springen",
  karaoke: "Karaoke",
  kindness: "hilfsbereit",
  luxury: "besonders",
  market: "Markt",
  minigolf: "Minigolf",
  memory: "Erinnerung",
  mindful: "achtsam",
  morning: "Morgen",
  movie: "Film",
  music: "Musik",
  nature: "Natur",
  night: "Nacht",
  offline: "offline",
  outdoors: "draußen",
  park: "Park",
  personal: "persönlich",
  photo: "Foto",
  picnic: "Picknick",
  plant: "Pflanzen",
  pottery: "Töpfern",
  puzzle: "Rätsel",
  planning: "Planung",
  playful: "spielerisch",
  premium: "besonders",
  quiet: "ruhig",
  rain: "Regen",
  random: "spontan",
  reading: "Lesen",
  relationship: "Beziehung",
  relax: "Entspannung",
  romantic: "romantisch",
  safe: "sicher",
  seasonal: "saisonal",
  sharing: "teilen",
  short: "kurz",
  slow: "entschleunigt",
  sport: "sportlich",
  spring: "Frühling",
  story: "Geschichte",
  streetart: "Streetart",
  streetfood: "Streetfood",
  style: "Stil",
  summer: "Sommer",
  surprise: "Überraschung",
  sunset: "Sonnenuntergang",
  sweet: "süß",
  talk: "Gespräch",
  taste: "Geschmack",
  team: "Team",
  trip: "Ausflug",
  treasure: "Schatzsuche",
  workshop: "Workshop",
  sushi: "Sushi",
  view: "Ausblick",
  walk: "Spaziergang",
  warm: "warm",
  water: "Wasser",
  weatherproof: "wetterfest",
  wind: "Wind",
  winter: "Winter",
  writing: "Schreiben",
};

const deSpecificActivities: Record<string, { title: string; prompt: string; prep: string }> = {
  "air-dry-clay-portraits": {
    title: "Kleine Ton-Porträts",
    prompt: "Kauft lufttrocknende Knete oder Ton und modelliert eine kleine Figur, ein Tier oder ein Symbol für die andere Person.",
    prep: "Knete oder lufttrocknenden Ton, Unterlage und feuchtes Tuch bereitlegen",
  },
  "knete-character-duel": {
    title: "Knete-Figuren bauen",
    prompt: "Baut euch gegenseitig als kleine Knete-Figur und übertreibt drei typische Details liebevoll.",
    prep: "Knete, Timer und Tablett bereitlegen",
  },
  "pottery-painting-studio": {
    title: "Keramik bemalen",
    prompt: "Bucht einen Keramik-Malplatz und bemalt Tassen, Teller oder Schalen, die ihr später wirklich benutzt.",
    prep: "Keramikstudio buchen und ein einfaches Motiv überlegen",
  },
  "canoe-ride": {
    title: "Kanufahrt",
    prompt: "Leiht ein Kanu und paddelt eine ruhige Strecke mit einem festen Snack-Stopp am Ufer.",
    prep: "Kanuverleih, Drybag, Wasser und Wechselshirt einplanen",
  },
  "pedal-boat-date": {
    title: "Tretboot-Date",
    prompt: "Leiht ein Tretboot und nehmt ein Getränk oder einen kleinen Snack für die Mitte des Sees mit.",
    prep: "Tretbootverleih und Wetter prüfen",
  },
  "stand-up-paddle-tryout": {
    title: "Stand-up-Paddling ausprobieren",
    prompt: "Leiht SUP-Boards oder bucht einen Anfängertermin und macht das Ziel einfach: draufbleiben und lachen.",
    prep: "SUP-Verleih, Badekleidung und Handtuch einplanen",
  },
  "geocaching-hunt": {
    title: "Geocaching-Schatzsuche",
    prompt: "Sucht drei Geocaches in eurer Nähe und tragt euch zusammen ins Logbuch ein.",
    prep: "Geocaching-App, Stift und kleines Tauschobjekt mitnehmen",
  },
  "kite-flying-field": {
    title: "Drachen steigen lassen",
    prompt: "Kauft oder leiht einen Drachen und testet ihn auf einer offenen Wiese oder am Strand.",
    prep: "Drachen und Windcheck vorbereiten",
  },
  "restaurant-roulette": {
    title: "Restaurant-Roulette",
    prompt: "Wählt drei Restaurants, die preislich wirklich passen, würfelt und reserviert den Gewinner.",
    prep: "Drei Restaurantoptionen und Reservierung vorbereiten",
  },
  "sushi-rolling-class": {
    title: "Sushi rollen",
    prompt: "Bucht einen Sushi-Kurs oder macht zuhause Sushi mit Bambusmatte und einfachen Füllungen.",
    prep: "Kurs oder Sushi-Set, Reis, Füllung und Sojasauce vorbereiten",
  },
  "dumpling-folding-night": {
    title: "Dumplings falten",
    prompt: "Faltet zusammen Dumplings, vergleicht die Formen und kocht sie direkt danach.",
    prep: "Teigblätter, Füllung und Dip vorbereiten",
  },
  "pasta-from-scratch": {
    title: "Pasta selber machen",
    prompt: "Macht frischen Pastateig, rollt ihn aus und serviert ihn mit einer einfachen Sauce.",
    prep: "Mehl, Eier und Sauce vorbereiten",
  },
  "escape-room": {
    title: "Escape Room",
    prompt: "Bucht einen Escape Room auf eurem Level und spielt als Team statt gegeneinander.",
    prep: "Escape Room buchen und pünktliche Anfahrt planen",
  },
  "arcade-token-night": {
    title: "Arcade-Abend",
    prompt: "Setzt ein Token-Budget und spielt Air Hockey, Racing, Greifautomaten und ein albernes Spiel.",
    prep: "Arcade und Token-Budget festlegen",
  },
  "bowling-lane-date": {
    title: "Bowling-Date",
    prompt: "Bucht eine Bowlingbahn und gebt jeder Runde eine andere Regel.",
    prep: "Bowlingbahn buchen und Socken einpacken",
  },
  "trampoline-park": {
    title: "Trampolinpark",
    prompt: "Bucht eine Stunde im Trampolinpark und beendet das Date mit einem Getränk zum Runterkommen.",
    prep: "Slot buchen und Sportkleidung mitnehmen",
  },
  "ice-skating": {
    title: "Schlittschuhlaufen",
    prompt: "Geht Schlittschuhlaufen und macht eine gemeinsame Runde Hand in Hand zum Ziel.",
    prep: "Öffnungszeiten, Handschuhe und Schlittschuhverleih prüfen",
  },
  "salsa-trial-class": {
    title: "Salsa-Probestunde",
    prompt: "Bucht eine Anfänger-Stunde für Salsa, Bachata oder Swing und geht danach auf ein Getränk.",
    prep: "Tanzkurs buchen und bequeme Schuhe wählen",
  },
  "aquarium-slow-walk": {
    title: "Aquarium-Spaziergang",
    prompt: "Besucht ein Aquarium und wählt das Tier, das am besten zu eurer Stimmung passt.",
    prep: "Tickets und Öffnungszeiten prüfen",
  },
  "planetarium-show": {
    title: "Planetarium",
    prompt: "Bucht eine Planetariumsshow und sprecht danach darüber, wohin ihr zusammen reisen wollt.",
    prep: "Planetariumstickets buchen",
  },
  "comedy-night": {
    title: "Comedy-Abend",
    prompt: "Bucht eine kleine Comedy-Show und wählt danach einen Witz als neuen Insider.",
    prep: "Tickets und Showzeit prüfen",
  },
  "jazz-bar": {
    title: "Jazzbar",
    prompt: "Geht in eine kleine Jazzbar oder Live-Musik-Bar und bleibt mindestens ein ganzes Set.",
    prep: "Tisch oder Tickets reservieren",
  },
  "karaoke-booth": {
    title: "Karaoke-Raum",
    prompt: "Mietet einen privaten Karaoke-Raum und wählt je drei Songs: sicher, mutig und komplett albern.",
    prep: "Karaoke buchen und Songliste vorbereiten",
  },
  "flea-market-mission": {
    title: "Flohmarkt-Mission",
    prompt: "Geht auf einen Flohmarkt und kauft der anderen Person das beste kleine Objekt unter einem festen Preis.",
    prep: "Bargeld, Marktzeiten und Budget klären",
  },
  "ikea-showroom-date": {
    title: "Showroom-Date",
    prompt: "Lauft durch ein Möbelhaus und plant eine fiktive Wohnung für eure Zukunftsversion.",
    prep: "Route und Snack-Stopp einplanen",
  },
  "photo-booth-hunt": {
    title: "Fotoautomaten-Jagd",
    prompt: "Findet einen alten Fotoautomaten und macht einen ernsten und einen komplett absurden Fotostreifen.",
    prep: "Fotoautomat suchen und Kleingeld mitnehmen",
  },
  "board-game-cafe": {
    title: "Brettspiel-Café",
    prompt: "Geht in ein Brettspiel-Café und lasst euch ein kooperatives Spiel empfehlen.",
    prep: "Café-Zeiten oder Reservierung prüfen",
  },
  "indoor-mini-golf": {
    title: "Indoor-Minigolf",
    prompt: "Spielt Indoor- oder Schwarzlicht-Minigolf und macht jede Bahn zu einer kleinen Challenge.",
    prep: "Slot buchen und bequeme Schuhe anziehen",
  },
  "strawberry-picking": {
    title: "Erdbeeren pflücken",
    prompt: "Geht Erdbeeren, Äpfel, Beeren oder Blumen pflücken und macht danach ein Dessert daraus.",
    prep: "Hofzeiten und Behälter prüfen",
  },
  "outdoor-cinema-blanket-night": {
    title: "Open-Air-Kino",
    prompt: "Geht ins Open-Air-Kino und nehmt Decke, Snacks und eine warme Schicht mit.",
    prep: "Tickets, Decke und Snacks vorbereiten",
  },
};

type GermanTemplateSet = {
  titles: string[];
  prompts: string[];
  prep: string[];
};

const germanIdeaTemplates: Record<string, GermanTemplateSet> = {
  Home: {
    titles: ["Zuhause-Date mit {mood}", "Wohnzimmermoment für zwei", "Gemütliches Date daheim", "Kleines Ritual zuhause"],
    prompts: [
      "Macht es euch zuhause bewusst schön: Licht dimmen, etwas Kleines vorbereiten und euch ohne Ablenkung Zeit füreinander nehmen.",
      "Verwandelt einen normalen Abend in ein bewusstes Date mit einer klaren kleinen Aktion und einem ruhigen gemeinsamen Abschluss.",
      "Bleibt zuhause, aber macht den Rahmen besonders: ein Tisch, eine Decke, Musik oder ein Mini-Spiel reichen schon.",
      "Nutzt euer Zuhause als Date-Ort und baut einen Moment ein, über den ihr später noch sprechen wollt.",
    ],
    prep: ["Licht, Getränk und eine kleine Aktivität vorbereiten", "Handys weglegen und einen gemütlichen Platz schaffen", "Musik, Snack und 30 Minuten ungestörte Zeit einplanen"],
  },
  Outdoors: {
    titles: ["Draußen-Date mit {mood}", "Spaziergang mit Ziel", "Frische-Luft-Moment", "Kleiner Ausflug nach draußen"],
    prompts: [
      "Geht zusammen raus und gebt dem Weg ein Ziel: ein schöner Blick, ein ruhiger Platz oder ein Ort, den ihr selten bewusst wahrnehmt.",
      "Macht aus einem Spaziergang ein Date, indem ihr unterwegs eine kleine Aufgabe, ein Foto oder eine Frage einbaut.",
      "Sucht euch eine sichere Route und bleibt langsam genug, damit das Gespräch nicht nebenbei passiert.",
      "Lasst Wetter und Umgebung Teil des Dates werden und entscheidet erst unterwegs, wo ihr kurz stehen bleibt.",
    ],
    prep: ["Route, Wetter und bequeme Schuhe prüfen", "Getränk mitnehmen und einen Treffpunkt festlegen", "Jacke, Wasser und eine kleine Frage vorbereiten"],
  },
  Food: {
    titles: ["Essensdate mit {mood}", "Genussmoment für zwei", "Kleines Food-Date", "Gemeinsam probieren"],
    prompts: [
      "Baut das Date um Essen herum: kochen, teilen, probieren oder einen Ort testen, den ihr noch nicht kennt.",
      "Wählt etwas, das ihr beide selten macht, und macht daraus ein bewusstes gemeinsames Geschmackserlebnis.",
      "Teilt mehrere kleine Dinge statt einer großen Portion und entscheidet am Ende gemeinsam, was gewonnen hat.",
      "Macht Essen zum Gesprächsanlass: Was erinnert euch daran, was mögt ihr daran, was würdet ihr ändern?",
    ],
    prep: ["Zutaten, Reservierung oder Öffnungszeiten prüfen", "Budget festlegen und zwei Optionen bereithalten", "Servietten, Getränk und eine kleine Überraschung vorbereiten"],
  },
  Creative: {
    titles: ["Kreativ-Date mit {mood}", "Etwas Gemeinsames gestalten", "Mini-Projekt für zwei", "Kreativer Moment"],
    prompts: [
      "Gestaltet etwas Kleines zusammen, das ihr behalten, fotografieren oder später weiterentwickeln könnt.",
      "Setzt euch ein einfaches kreatives Ziel und nehmt Perfektion komplett raus: Hauptsache, ihr macht es gemeinsam.",
      "Nutzt Papier, Kamera, Musik oder einfache Materialien und gebt eurem Ergebnis einen Namen.",
      "Macht aus einer Idee ein Mini-Projekt, das nach dem Date sichtbar bleibt.",
    ],
    prep: ["Papier, Stifte oder Kamera bereitlegen", "Materialien und eine einfache Vorlage vorbereiten", "Timer stellen und Ergebnis nicht bewerten"],
  },
  Movement: {
    titles: ["Aktives Date mit {mood}", "Bewegung für zwei", "Spielerisch in Bewegung", "Körper-Date ohne Druck"],
    prompts: [
      "Bewegt euch gemeinsam, ohne Leistung daraus zu machen: Es geht um Energie, Lachen und ein gutes Gefühl danach.",
      "Wählt eine Aktivität, bei der ihr nebeneinander oder miteinander statt gegeneinander unterwegs seid.",
      "Baut eine kleine Challenge ein, aber haltet sie leicht genug, dass sie Spaß macht.",
      "Macht Bewegung zum Anlass, den Kopf frei zu bekommen und danach kurz zusammen runterzukommen.",
    ],
    prep: ["Bequeme Kleidung, Wasser und sichere Route vorbereiten", "Kleine Challenge festlegen und locker bleiben", "Ort, Wetter und Ausrüstung prüfen"],
  },
  "Mini Adventure": {
    titles: ["Mini-Abenteuer mit {mood}", "Kleiner Ausbruch aus dem Alltag", "Spontaner Paar-Moment", "Entdeckungsdate"],
    prompts: [
      "Sucht euch ein kleines Ziel, das sich neu anfühlt, ohne den ganzen Tag kompliziert zu planen.",
      "Macht etwas in eurer Nähe, das ihr sonst überseht, und behandelt es wie einen kleinen Urlaub.",
      "Lasst eine Person den Start bestimmen und die andere den Abschluss, damit das Date überraschend bleibt.",
      "Verlasst kurz eure Routine und sammelt eine kleine Geschichte, die nur zu diesem Date gehört.",
    ],
    prep: ["Route, Ticket oder Rückweg klären", "Budget und Zeitfenster festlegen", "Eine Überraschung und einen Plan B vorbereiten"],
  },
  Culture: {
    titles: ["Kultur-Date mit {mood}", "Gemeinsam etwas entdecken", "Kleiner Kulturabend", "Inspiration für zwei"],
    prompts: [
      "Besucht einen Ort, ein Event oder ein Werk und sprecht danach darüber, was bei euch hängen geblieben ist.",
      "Nehmt euch weniger vor und schaut genauer hin: Jede Person wählt einen Moment aus, der etwas auslöst.",
      "Macht Kultur nicht steif, sondern persönlich: Was würdet ihr mitnehmen, verschenken oder nie vergessen?",
      "Sucht ein kleines kulturelles Erlebnis und kombiniert es mit einem ruhigen Abschluss zu zweit.",
    ],
    prep: ["Öffnungszeiten, Tickets oder Programm prüfen", "Eine Frage für danach vorbereiten", "Anfahrt und ruhigen Abschluss planen"],
  },
  "Deep Talk": {
    titles: ["Tiefgang-Date mit {mood}", "Ehrliches Gespräch für zwei", "Beziehungscheck ohne Druck", "Ruhiger Zukunftsmoment"],
    prompts: [
      "Nehmt euch Zeit für ein echtes Gespräch und bleibt bei einer Frage, statt alles auf einmal klären zu wollen.",
      "Sprecht über Wünsche, Erinnerungen oder Zukunft, ohne daraus eine Problembesprechung zu machen.",
      "Wählt einen ruhigen Ort und beendet das Gespräch mit einem konkreten kleinen Wunsch füreinander.",
      "Macht Nähe bewusst: zuhören, nachfragen, ausreden lassen und am Ende etwas Positives benennen.",
    ],
    prep: ["Eine gute Frage und einen ruhigen Ort wählen", "Handys weglegen und genug Zeit lassen", "Notiz oder gemeinsames Abschlussritual vorbereiten"],
  },
  "Rainy Day": {
    titles: ["Regen-Date mit {mood}", "Wetterfestes Date", "Gemütlicher Regentag", "Drinnen schön machen"],
    prompts: [
      "Lasst schlechtes Wetter nicht stören, sondern macht es zum Teil des Dates: warm, langsam und bewusst.",
      "Sucht euch eine trockene, gemütliche Option und baut einen kleinen gemeinsamen Fokus ein.",
      "Macht Regen zum Anlass für etwas Ruhiges, Wärmendes oder Kreatives zu zweit.",
      "Bleibt flexibel und entscheidet euch für ein Date, das auch ohne Sonne richtig gut funktioniert.",
    ],
    prep: ["Schirm, warme Getränke oder gemütlichen Ort vorbereiten", "Drinnen-Alternative und kleine Aktivität planen", "Wetter prüfen und warme Kleidung bereitlegen"],
  },
  Seasonal: {
    titles: ["Saison-Date mit {mood}", "Moment der Jahreszeit", "Saisonales Date für zwei", "Jetzt-oder-nie-Date"],
    prompts: [
      "Nutzt die aktuelle Jahreszeit bewusst: Farben, Licht, Essen, Wetter oder kleine Events machen das Date besonders.",
      "Sucht euch etwas, das nur jetzt richtig passt, und macht daraus einen gemeinsamen Moment.",
      "Verbindet die Jahreszeit mit einer Erinnerung, einem Foto oder einem kleinen Ritual.",
      "Plant ein Date, das zur Stimmung draußen passt und trotzdem leicht umsetzbar bleibt.",
    ],
    prep: ["Wetter, Saisonangebot oder Eventzeiten prüfen", "Kleidung und kleines Erinnerungsfoto einplanen", "Eine saisonale Kleinigkeit vorbereiten"],
  },
};

export function labelFor(
  kind: "category" | "budget" | "duration",
  value: string,
  language: LanguageCode,
) {
  const source = kind === "category" ? categoryLabels : kind === "budget" ? budgetLabels : durationLabels;
  return source[language]?.[value] ?? value;
}

export function localizeIdea(idea: DateIdea, language: LanguageCode): DateIdea {
  if (language === "en") return idea;

  const index = Number.parseInt(idea.id.replace(/\D/g, ""), 10) || 1;
  const templates = germanIdeaTemplates[idea.category] ?? germanIdeaTemplates.Home;
  const tags = idea.tags.map((tag) => deTags[tag] ?? tag.toLowerCase()).slice(0, 4);
  const specific = deSpecificActivities[idea.family];

  if (specific) {
    return {
      ...idea,
      title: specific.title,
      prompt: specific.prompt,
      prep: `${specific.prep}. Dauer: ${labelFor("duration", idea.duration, "de")}. Budget: ${labelFor("budget", idea.budget, "de")}.`,
      tags,
    };
  }

  const mood = tags[0] ?? "gemeinsam";
  const title = templates.titles[index % templates.titles.length].replace("{mood}", mood);
  const prompt = templates.prompts[(index + 1) % templates.prompts.length];
  const prep = `${templates.prep[(index + 2) % templates.prep.length]}. Dauer: ${labelFor("duration", idea.duration, "de")}. Budget: ${labelFor("budget", idea.budget, "de")}.`;

  return {
    ...idea,
    title,
    prompt,
    prep,
    tags,
  };
}
