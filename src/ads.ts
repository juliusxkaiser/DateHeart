import { Capacitor } from "@capacitor/core";
import type { AdMobPlugin } from "@capacitor-community/admob";

type AdMobModule = typeof import("@capacitor-community/admob");
type NativePlatform = "android" | "ios";

type AdState = {
  initialized: boolean;
  canRequestAds: boolean;
  interstitialReady: boolean;
  bannerVisible: boolean;
  privacyOptionsAvailable: boolean;
};

type BannerVisibilityListener = (visible: boolean) => void;

const TEST_BANNER_IDS: Record<NativePlatform, string> = {
  android: "ca-app-pub-3940256099942544/6300978111",
  ios: "ca-app-pub-3940256099942544/2934735716",
};

const TEST_INTERSTITIAL_IDS: Record<NativePlatform, string> = {
  android: "ca-app-pub-3940256099942544/1033173712",
  ios: "ca-app-pub-3940256099942544/4411468910",
};

const REAL_BANNER_IDS: Partial<Record<NativePlatform, string>> = {
  android: "ca-app-pub-5889615344998591/3027335192",
  ios: "ca-app-pub-5889615344998591/7951828587",
};

const REAL_INTERSTITIAL_IDS: Partial<Record<NativePlatform, string>> = {
  android: "ca-app-pub-5889615344998591/3985193642",
  ios: "ca-app-pub-5889615344998591/7179848568",
};

const state: AdState = {
  initialized: false,
  canRequestAds: false,
  interstitialReady: false,
  bannerVisible: false,
  privacyOptionsAvailable: false,
};

let adMob: AdMobPlugin | null = null;
let adMobModule: AdMobModule | null = null;
let initializePromise: Promise<AdState> | null = null;
let preparingInterstitial = false;
let adListenersRegistered = false;
const bannerVisibilityListeners = new Set<BannerVisibilityListener>();

function setBannerVisible(visible: boolean) {
  if (state.bannerVisible === visible) return;
  state.bannerVisible = visible;
  bannerVisibilityListeners.forEach((listener) => listener(visible));
}

function nativePlatform(): NativePlatform | null {
  const platform = Capacitor.getPlatform();
  return platform === "android" || platform === "ios" ? platform : null;
}

function envList(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function envFlag(value: string | undefined, fallback: boolean) {
  if (value === undefined || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function configuredInterstitialAdId(platform: NativePlatform) {
  const override =
    platform === "android" ? import.meta.env.VITE_ADMOB_ANDROID_INTERSTITIAL_ID : import.meta.env.VITE_ADMOB_IOS_INTERSTITIAL_ID;

  return override?.trim() || REAL_INTERSTITIAL_IDS[platform]?.trim() || "";
}

function configuredBannerAdId(platform: NativePlatform) {
  const override = platform === "android" ? import.meta.env.VITE_ADMOB_ANDROID_BANNER_ID : import.meta.env.VITE_ADMOB_IOS_BANNER_ID;
  return override?.trim() || REAL_BANNER_IDS[platform]?.trim() || "";
}

function useTestAds(platform: NativePlatform) {
  return envFlag(import.meta.env.VITE_ADMOB_TEST_MODE, false) || !configuredInterstitialAdId(platform) || !configuredBannerAdId(platform);
}

function interstitialAdId(platform: NativePlatform) {
  return useTestAds(platform) ? TEST_INTERSTITIAL_IDS[platform] : configuredInterstitialAdId(platform);
}

function bannerAdId(platform: NativePlatform) {
  return useTestAds(platform) ? TEST_BANNER_IDS[platform] : configuredBannerAdId(platform);
}

function consentDebugGeography(module: AdMobModule) {
  const value = import.meta.env.VITE_ADMOB_CONSENT_DEBUG_GEOGRAPHY?.trim().toUpperCase();
  if (!value) return undefined;

  const options = module.AdmobConsentDebugGeography;
  if (value === "EEA") return options.EEA;
  if (value === "US") return options.US;
  if (value === "OTHER") return options.OTHER;
  return undefined;
}

function adRequestOptions(platform: NativePlatform) {
  return {
    adId: interstitialAdId(platform),
    isTesting: useTestAds(platform),
    npa: envFlag(import.meta.env.VITE_ADMOB_NON_PERSONALIZED, true),
    immersiveMode: true,
  };
}

function bannerRequestOptions(module: AdMobModule, platform: NativePlatform) {
  return {
    adId: bannerAdId(platform),
    adSize: module.BannerAdSize.ADAPTIVE_BANNER,
    position: module.BannerAdPosition.BOTTOM_CENTER,
    margin: 0,
    isTesting: useTestAds(platform),
    npa: envFlag(import.meta.env.VITE_ADMOB_NON_PERSONALIZED, true),
  };
}

function registerAdListeners() {
  if (!adMob || !adMobModule || adListenersRegistered) return;

  adListenersRegistered = true;
  void adMob.addListener(adMobModule.BannerAdPluginEvents.Loaded, () => {
    setBannerVisible(true);
    console.info("DateHeart AdMob banner loaded.");
  });
  void adMob.addListener(adMobModule.BannerAdPluginEvents.FailedToLoad, (error) => {
    setBannerVisible(false);
    console.warn("DateHeart AdMob banner failed to load.", error);
  });
  void adMob.addListener(adMobModule.InterstitialAdPluginEvents.Loaded, () => {
    state.interstitialReady = true;
    console.info("DateHeart AdMob interstitial loaded.");
  });
  void adMob.addListener(adMobModule.InterstitialAdPluginEvents.FailedToLoad, (error) => {
    state.interstitialReady = false;
    console.warn("DateHeart AdMob interstitial failed to load.", error);
  });
}

async function prepareInterstitial() {
  const platform = nativePlatform();
  if (!platform || !adMob || !state.canRequestAds || preparingInterstitial || state.interstitialReady) return;

  preparingInterstitial = true;
  try {
    await adMob.prepareInterstitial(adRequestOptions(platform));
    state.interstitialReady = true;
  } catch (error) {
    state.interstitialReady = false;
    console.warn("DateHeart AdMob interstitial could not be prepared.", error);
  } finally {
    preparingInterstitial = false;
  }
}

async function initializeNativeAds() {
  const platform = nativePlatform();
  if (!platform) return state;

  try {
    adMobModule = await import("@capacitor-community/admob");
    adMob = adMobModule.AdMob;
    registerAdListeners();

    const testDeviceIds = envList(import.meta.env.VITE_ADMOB_TEST_DEVICE_IDS);
    const testAds = useTestAds(platform);
    await adMob.initialize({
      initializeForTesting: testAds || testDeviceIds.length > 0,
      testingDevices: testDeviceIds,
      maxAdContentRating: adMobModule.MaxAdContentRating.Teen,
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
    });

    state.initialized = true;
    state.canRequestAds = false;
    state.privacyOptionsAvailable = false;

    try {
      let consentInfo = await adMob.requestConsentInfo({
        debugGeography: consentDebugGeography(adMobModule),
        testDeviceIdentifiers: testDeviceIds,
        tagForUnderAgeOfConsent: false,
      });

      if (!consentInfo.canRequestAds && consentInfo.isConsentFormAvailable) {
        consentInfo = await adMob.showConsentForm();
      }

      // Ads may be requested when consent is OBTAINED *or* simply NOT REQUIRED
      // (most non-EEA users, and any setup where no UMP message is published yet).
      // Relying on canRequestAds alone left it false on every device when no consent
      // form exists in the AdMob dashboard → zero ads, no error. Treat "not required"
      // as permission to serve.
      const consentNotRequired =
        consentInfo.status === adMobModule!.AdmobConsentStatus.NOT_REQUIRED ||
        (!consentInfo.isConsentFormAvailable && consentInfo.privacyOptionsRequirementStatus !== "REQUIRED");
      state.canRequestAds = consentInfo.canRequestAds || consentNotRequired || testAds;
      state.privacyOptionsAvailable = consentInfo.privacyOptionsRequirementStatus === "REQUIRED";
      console.info("DateHeart AdMob consent checked.", {
        consentCanRequestAds: consentInfo.canRequestAds,
        privacyOptionsAvailable: state.privacyOptionsAvailable,
      });
    } catch (error) {
      state.canRequestAds = testAds;
      state.privacyOptionsAvailable = false;
      console.warn("DateHeart AdMob consent check failed.", error);
    }

    console.info("DateHeart AdMob initialized.", {
      platform,
      testAds,
      canRequestAds: state.canRequestAds,
      privacyOptionsAvailable: state.privacyOptionsAvailable,
    });

    if (state.canRequestAds) {
      await prepareInterstitial();
    }
  } catch (error) {
    console.warn("DateHeart AdMob initialization skipped.", error);
    state.initialized = false;
    state.canRequestAds = false;
    state.interstitialReady = false;
    setBannerVisible(false);
    state.privacyOptionsAvailable = false;
  }

  return state;
}

export function canUseNativeAds() {
  return nativePlatform() !== null;
}

export function canShowAdPrivacyOptions() {
  return canUseNativeAds() && state.privacyOptionsAvailable;
}

export function initializeAds() {
  if (!initializePromise) {
    initializePromise = initializeNativeAds();
  }

  return initializePromise;
}

export function onBannerVisibilityChange(listener: BannerVisibilityListener) {
  bannerVisibilityListeners.add(listener);
  listener(state.bannerVisible);
  return () => bannerVisibilityListeners.delete(listener);
}

export async function showInterstitialAd() {
  const platform = nativePlatform();
  if (!platform) return false;

  await initializeAds();
  if (!adMob || !state.canRequestAds) return false;

  if (!state.interstitialReady) {
    await prepareInterstitial();
  }

  if (!state.interstitialReady) return false;

  try {
    await adMob.showInterstitial();
    state.interstitialReady = false;
    void prepareInterstitial();
    return true;
  } catch (error) {
    state.interstitialReady = false;
    console.warn("DateHeart AdMob interstitial could not be shown.", error);
    void prepareInterstitial();
    return false;
  }
}

export async function showBannerAd() {
  const platform = nativePlatform();
  if (!platform) return false;

  await initializeAds();
  if (!adMob || !adMobModule || !state.canRequestAds) return false;
  if (state.bannerVisible) return true;

  try {
    await adMob.showBanner(bannerRequestOptions(adMobModule, platform));
    setBannerVisible(true);
    return true;
  } catch (error) {
    setBannerVisible(false);
    console.warn("DateHeart AdMob banner could not be shown.", error);
    return false;
  }
}

export async function hideBannerAd() {
  if (!adMob || !state.bannerVisible) return false;

  try {
    await adMob.removeBanner();
    setBannerVisible(false);
    return true;
  } catch (error) {
    console.warn("DateHeart AdMob banner could not be removed.", error);
    return false;
  }
}

export async function showAdPrivacyOptions() {
  await initializeAds();
  if (!adMob) return false;

  try {
    await adMob.showPrivacyOptionsForm();
    const consentInfo = await adMob.requestConsentInfo();
    state.canRequestAds = consentInfo.canRequestAds;
    state.privacyOptionsAvailable = consentInfo.privacyOptionsRequirementStatus === "REQUIRED";
    if (state.canRequestAds) void prepareInterstitial();
    return true;
  } catch (error) {
    console.warn("DateHeart AdMob privacy options could not be shown.", error);
    return false;
  }
}
