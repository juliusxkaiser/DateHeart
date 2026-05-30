export const PRODUCT_ID = "dateheart_no_ads";
export const PRODUCT_NAME = "DateHeart without ads";

export const noAdsPriceByCurrency = {
  AED: 17.99,
  ARS: 4999,
  AUD: 7.99,
  BDT: 599,
  BGN: 9.99,
  BRL: 24.99,
  CAD: 6.99,
  CHF: 4.99,
  COP: 19900,
  CNY: 38,
  CZK: 119,
  DKK: 39,
  EUR: 4.99,
  GBP: 4.99,
  HKD: 38,
  HUF: 1990,
  IDR: 79000,
  ILS: 17.99,
  INR: 499,
  JPY: 700,
  KRW: 6900,
  LKR: 1490,
  MXN: 99,
  MYR: 22.9,
  NOK: 59,
  NPR: 699,
  NZD: 8.99,
  PHP: 279,
  PKR: 1399,
  PLN: 19.99,
  RON: 24.99,
  RUB: 449,
  SAR: 17.99,
  SEK: 59,
  SGD: 6.98,
  THB: 179,
  TRY: 149.99,
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

export function stripeUnitAmountForCurrency(input) {
  const price = noAdsPriceForCurrency(input);
  const unitAmount = zeroDecimalCurrencies.has(price.currency) ? Math.round(price.amount) : Math.round(price.amount * 100);
  return {
    ...price,
    unitAmount,
  };
}
