export const PRODUCT_ID = "dateheart_no_ads";
export const PRODUCT_NAME = "DateHeart without ads";
export const PLUS_PRODUCT_ID = "dateheart_plus";
export const PLUS_PRODUCT_NAME = "DateHeart Pro";

export const checkoutProducts = {
  noAds: "dateheart_no_ads",
  plusMonthly: "dateheart_plus_monthly",
  plusYearly: "dateheart_plus_yearly",
};

export const noAdsPriceByCurrency = {
  AED: 17.99,
  AFN: 349,
  ALL: 499,
  AMD: 1990,
  ARS: 4999,
  AUD: 7.99,
  AZN: 8.99,
  BAM: 9.99,
  BDT: 599,
  BGN: 9.99,
  BRL: 24.99,
  BYN: 16.99,
  CAD: 6.99,
  CHF: 4.99,
  COP: 19900,
  CNY: 38,
  CZK: 119,
  DKK: 39,
  EUR: 4.99,
  ETB: 299,
  GBP: 4.99,
  GEL: 14.99,
  HKD: 38,
  HUF: 1990,
  IDR: 79000,
  ILS: 17.99,
  INR: 499,
  ISK: 790,
  JPY: 700,
  KES: 650,
  KHR: 19900,
  LAK: 109000,
  KRW: 6900,
  LKR: 1490,
  MKD: 299,
  MMK: 14900,
  MXN: 99,
  MYR: 22.9,
  NGN: 7900,
  NOK: 59,
  NPR: 699,
  NZD: 8.99,
  PHP: 279,
  PKR: 1399,
  PLN: 19.99,
  RON: 24.99,
  RSD: 599,
  RUB: 449,
  SAR: 17.99,
  SEK: 59,
  SGD: 6.98,
  SOS: 24900,
  RWF: 5900,
  THB: 179,
  TRY: 149.99,
  TZS: 13000,
  TWD: 159,
  UAH: 199,
  USD: 4.99,
  VND: 119000,
  ZAR: 89.99,
};

export const zeroDecimalCurrencies = new Set([
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "ISK",
  "JPY",
  "KMF",
  "KRW",
  "PYG",
  "RWF",
  "UGX",
  "VND",
  "VUV",
  "XAF",
  "XOF",
]);

const plusMonthlyOverrides = {
  EUR: 1.99,
  GBP: 1.99,
  USD: 1.99,
};

const plusYearlyOverrides = {
  EUR: 14.99,
  GBP: 14.99,
  USD: 14.99,
};

function roundPrice(amount, currency) {
  if (zeroDecimalCurrencies.has(currency)) return Math.max(1, Math.round(amount));
  return Math.max(0.99, Math.round(amount * 100) / 100);
}

export const plusMonthlyPriceByCurrency = Object.fromEntries(
  Object.entries(noAdsPriceByCurrency).map(([currency, amount]) => [
    currency,
    plusMonthlyOverrides[currency] ?? roundPrice(amount * 0.4, currency),
  ]),
);

export const plusYearlyPriceByCurrency = Object.fromEntries(
  Object.entries(noAdsPriceByCurrency).map(([currency, amount]) => [
    currency,
    plusYearlyOverrides[currency] ?? roundPrice(amount * 3, currency),
  ]),
);

export function supportedPaymentCurrency(input) {
  const currency = typeof input === "string" ? input.trim().toUpperCase() : "";
  return noAdsPriceByCurrency[currency] === undefined ? "EUR" : currency;
}

export function noAdsPriceForCurrency(input) {
  const currency = supportedPaymentCurrency(input);
  return {
    amount: noAdsPriceByCurrency[currency],
    currency,
  };
}

export function supportedSubscriptionCurrency(input) {
  const currency = typeof input === "string" ? input.trim().toUpperCase() : "";
  return plusMonthlyPriceByCurrency[currency] === undefined ? "EUR" : currency;
}

export function plusPriceForCurrency(input, interval) {
  const currency = supportedSubscriptionCurrency(input);
  const yearly = interval === "year";
  return {
    amount: yearly ? plusYearlyPriceByCurrency[currency] : plusMonthlyPriceByCurrency[currency],
    currency,
    interval: yearly ? "year" : "month",
  };
}

export function stripeUnitAmountForCurrency(input) {
  const price = noAdsPriceForCurrency(input);
  const unitAmount = zeroDecimalCurrencies.has(price.currency) ? Math.round(price.amount) : Math.round(price.amount * 100);
  return {
    ...price,
    unitAmount,
  };
}

export function stripeSubscriptionUnitAmountForCurrency(input, interval) {
  const price = plusPriceForCurrency(input, interval);
  const unitAmount = zeroDecimalCurrencies.has(price.currency) ? Math.round(price.amount) : Math.round(price.amount * 100);
  return {
    ...price,
    unitAmount,
  };
}
