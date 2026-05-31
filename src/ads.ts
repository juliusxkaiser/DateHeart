import { Capacitor } from "@capacitor/core";
import type { AdMobPlugin } from "@capacitor-community/admob";

type AdMobModule = typeof import("@capacitor-community/admob");
type NativePlatform = "android" | "ios";

type AdState = {
  initialized: boolean;
  canRequestAds: boolean;
  interstitialReady: boolean;
  privacyOptionsAvailable: boolean;
};

const TEST_INTERSTITIAL_IDS: Record<NativePlatform, string> = {
  android: "ca-app-pub-3940256099942544/1033173712",
  ios: "ca-app-pub-3940256099942544/4411468910",
};

const REAL_INTERSTITIAL_IDS: Partial<Record<NativePlatform, string>> = {
  android: "ca-app-pub-5889615344998591/3985193642",
};

const state: AdState = {
  initialized: false,
  canRequestAds: false,
  interstitialReady: false,
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

function interstitialAdId(platform: NativePlatform) {
  return configuredInterstitialAdId(platform) || TEST_INTERSTITIAL_IDS[platform];
}

function isTestMode(platform: NativePlatform) {
  if (!configuredInterstitialAdId(platform)) return true;
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
    isTesting: isTestMode(platform),
    npa: envFlag(import.meta.env.VITE_ADMOB_NON_PERSONALIZED, true),
    immersiveMode: true,
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
      initializeForTesting: isTestMode(platform) || testDeviceIds.length > 0,
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
