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

const TEST_BANNER_IDS: Record<NativePlatform, string> = {
  android: "ca-app-pub-3940256099942544/6300978111",
  ios: "ca-app-pub-3940256099942544/2934735716",
};

const TEST_INTERSTITIAL_IDS: Record<NativePlatform, string> = {
  android: "ca-app-pub-3940256099942544/1033173712",
  ios: "ca-app-pub-3940256099942544/4411468910",
};

const REAL_BANNER_IDS: Partial<Record<NativePlatform, string>> = {};

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

function interstitialAdId(platform: NativePlatform) {
  return configuredInterstitialAdId(platform) || TEST_INTERSTITIAL_IDS[platform];
}

function bannerAdId(platform: NativePlatform) {
  return configuredBannerAdId(platform) || TEST_BANNER_IDS[platform];
}

function isTestMode(configuredAdId: string) {
  if (!configuredAdId) return true;
  return envFlag(import.meta.env.VITE_ADMOB_TEST_MODE, false);
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
    isTesting: isTestMode(configuredInterstitialAdId(platform)),
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
    isTesting: isTestMode(configuredBannerAdId(platform)),
    npa: envFlag(import.meta.env.VITE_ADMOB_NON_PERSONALIZED, true),
  };
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

    const testDeviceIds = envList(import.meta.env.VITE_ADMOB_TEST_DEVICE_IDS);
    await adMob.initialize({
      initializeForTesting:
        isTestMode(configuredInterstitialAdId(platform)) || isTestMode(configuredBannerAdId(platform)) || testDeviceIds.length > 0,
      testingDevices: testDeviceIds,
      maxAdContentRating: adMobModule.MaxAdContentRating.Teen,
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
    });

    let consentInfo = await adMob.requestConsentInfo({
      debugGeography: consentDebugGeography(adMobModule),
      testDeviceIdentifiers: testDeviceIds,
      tagForUnderAgeOfConsent: false,
    });

    if (!consentInfo.canRequestAds && consentInfo.isConsentFormAvailable) {
      consentInfo = await adMob.showConsentForm();
    }

    state.initialized = true;
    state.canRequestAds = consentInfo.canRequestAds;
    state.privacyOptionsAvailable = consentInfo.privacyOptionsRequirementStatus === "REQUIRED";

    if (state.canRequestAds) {
      await prepareInterstitial();
    }
  } catch (error) {
    console.warn("DateHeart AdMob initialization skipped.", error);
    state.initialized = false;
    state.canRequestAds = false;
    state.interstitialReady = false;
    state.bannerVisible = false;
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
  if (!adMob || !adMobModule || !state.canRequestAds || state.bannerVisible) return false;

  try {
    await adMob.showBanner(bannerRequestOptions(adMobModule, platform));
    state.bannerVisible = true;
    return true;
  } catch (error) {
    state.bannerVisible = false;
    console.warn("DateHeart AdMob banner could not be shown.", error);
    return false;
  }
}

export async function hideBannerAd() {
  if (!adMob || !state.bannerVisible) return false;

  try {
    await adMob.removeBanner();
    state.bannerVisible = false;
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
