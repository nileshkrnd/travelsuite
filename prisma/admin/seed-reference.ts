/** Seed payload for global Country / City / Currency masters (no Tenant / Company). */

export const COUNTRY_CITY_SEEDS: Array<{
  countryCode: string;
  countryName: string;
  dialCode: string;
  cities: Array<{ cityCode: string; cityName: string }>;
}> = [
  {
    countryCode: "US",
    countryName: "United States",
    dialCode: "+1",
    cities: [
      { cityCode: "NEW_YORK", cityName: "New York" },
      { cityCode: "LOS_ANGELES", cityName: "Los Angeles" },
      { cityCode: "CHICAGO", cityName: "Chicago" },
      { cityCode: "MIAMI", cityName: "Miami" },
    ],
  },
  {
    countryCode: "GB",
    countryName: "United Kingdom",
    dialCode: "+44",
    cities: [
      { cityCode: "LONDON", cityName: "London" },
      { cityCode: "MANCHESTER", cityName: "Manchester" },
      { cityCode: "BIRMINGHAM", cityName: "Birmingham" },
      { cityCode: "EDINBURGH", cityName: "Edinburgh" },
    ],
  },
  {
    countryCode: "IN",
    countryName: "India",
    dialCode: "+91",
    cities: [
      { cityCode: "MUMBAI", cityName: "Mumbai" },
      { cityCode: "DELHI", cityName: "Delhi" },
      { cityCode: "BENGALURU", cityName: "Bengaluru" },
      { cityCode: "HYDERABAD", cityName: "Hyderabad" },
    ],
  },
  {
    countryCode: "AE",
    countryName: "United Arab Emirates",
    dialCode: "+971",
    cities: [
      { cityCode: "DUBAI", cityName: "Dubai" },
      { cityCode: "ABU_DHABI", cityName: "Abu Dhabi" },
      { cityCode: "SHARJAH", cityName: "Sharjah" },
    ],
  },
  {
    countryCode: "FR",
    countryName: "France",
    dialCode: "+33",
    cities: [
      { cityCode: "PARIS", cityName: "Paris" },
      { cityCode: "LYON", cityName: "Lyon" },
      { cityCode: "MARSEILLE", cityName: "Marseille" },
      { cityCode: "NICE", cityName: "Nice" },
    ],
  },
  {
    countryCode: "DE",
    countryName: "Germany",
    dialCode: "+49",
    cities: [
      { cityCode: "BERLIN", cityName: "Berlin" },
      { cityCode: "MUNICH", cityName: "Munich" },
      { cityCode: "FRANKFURT", cityName: "Frankfurt" },
      { cityCode: "HAMBURG", cityName: "Hamburg" },
    ],
  },
  {
    countryCode: "IT",
    countryName: "Italy",
    dialCode: "+39",
    cities: [
      { cityCode: "ROME", cityName: "Rome" },
      { cityCode: "MILAN", cityName: "Milan" },
      { cityCode: "VENICE", cityName: "Venice" },
      { cityCode: "FLORENCE", cityName: "Florence" },
    ],
  },
  {
    countryCode: "ES",
    countryName: "Spain",
    dialCode: "+34",
    cities: [
      { cityCode: "MADRID", cityName: "Madrid" },
      { cityCode: "BARCELONA", cityName: "Barcelona" },
      { cityCode: "VALENCIA", cityName: "Valencia" },
      { cityCode: "SEVILLE", cityName: "Seville" },
    ],
  },
  {
    countryCode: "CA",
    countryName: "Canada",
    dialCode: "+1",
    cities: [
      { cityCode: "TORONTO", cityName: "Toronto" },
      { cityCode: "VANCOUVER", cityName: "Vancouver" },
      { cityCode: "MONTREAL", cityName: "Montreal" },
      { cityCode: "CALGARY", cityName: "Calgary" },
    ],
  },
  {
    countryCode: "AU",
    countryName: "Australia",
    dialCode: "+61",
    cities: [
      { cityCode: "SYDNEY", cityName: "Sydney" },
      { cityCode: "MELBOURNE", cityName: "Melbourne" },
      { cityCode: "BRISBANE", cityName: "Brisbane" },
      { cityCode: "PERTH", cityName: "Perth" },
    ],
  },
  {
    countryCode: "SG",
    countryName: "Singapore",
    dialCode: "+65",
    cities: [{ cityCode: "SINGAPORE", cityName: "Singapore" }],
  },
  {
    countryCode: "JP",
    countryName: "Japan",
    dialCode: "+81",
    cities: [
      { cityCode: "TOKYO", cityName: "Tokyo" },
      { cityCode: "OSAKA", cityName: "Osaka" },
      { cityCode: "KYOTO", cityName: "Kyoto" },
      { cityCode: "YOKOHAMA", cityName: "Yokohama" },
    ],
  },
  {
    countryCode: "CN",
    countryName: "China",
    dialCode: "+86",
    cities: [
      { cityCode: "SHANGHAI", cityName: "Shanghai" },
      { cityCode: "BEIJING", cityName: "Beijing" },
      { cityCode: "SHENZHEN", cityName: "Shenzhen" },
      { cityCode: "GUANGZHOU", cityName: "Guangzhou" },
    ],
  },
  {
    countryCode: "SA",
    countryName: "Saudi Arabia",
    dialCode: "+966",
    cities: [
      { cityCode: "RIYADH", cityName: "Riyadh" },
      { cityCode: "JEDDAH", cityName: "Jeddah" },
      { cityCode: "DAMMAM", cityName: "Dammam" },
    ],
  },
  {
    countryCode: "QA",
    countryName: "Qatar",
    dialCode: "+974",
    cities: [{ cityCode: "DOHA", cityName: "Doha" }],
  },
  {
    countryCode: "EG",
    countryName: "Egypt",
    dialCode: "+20",
    cities: [
      { cityCode: "CAIRO", cityName: "Cairo" },
      { cityCode: "ALEXANDRIA", cityName: "Alexandria" },
      { cityCode: "GIZA", cityName: "Giza" },
    ],
  },
  {
    countryCode: "ZA",
    countryName: "South Africa",
    dialCode: "+27",
    cities: [
      { cityCode: "JOHANNESBURG", cityName: "Johannesburg" },
      { cityCode: "CAPE_TOWN", cityName: "Cape Town" },
      { cityCode: "DURBAN", cityName: "Durban" },
    ],
  },
  {
    countryCode: "BR",
    countryName: "Brazil",
    dialCode: "+55",
    cities: [
      { cityCode: "SAO_PAULO", cityName: "São Paulo" },
      { cityCode: "RIO_DE_JANEIRO", cityName: "Rio de Janeiro" },
      { cityCode: "BRASILIA", cityName: "Brasília" },
    ],
  },
  {
    countryCode: "MX",
    countryName: "Mexico",
    dialCode: "+52",
    cities: [
      { cityCode: "MEXICO_CITY", cityName: "Mexico City" },
      { cityCode: "CANCUN", cityName: "Cancún" },
      { cityCode: "GUADALAJARA", cityName: "Guadalajara" },
    ],
  },
  {
    countryCode: "ID",
    countryName: "Indonesia",
    dialCode: "+62",
    cities: [
      { cityCode: "JAKARTA", cityName: "Jakarta" },
      { cityCode: "BALI", cityName: "Bali" },
      { cityCode: "SURABAYA", cityName: "Surabaya" },
    ],
  },
];

export const CURRENCY_SEEDS: Array<{
  currencyCode: string;
  currencyName: string;
  symbol: string;
  smallCurrencyName: string;
  significantDigit: number;
}> = [
  { currencyCode: "USD", currencyName: "US Dollar", symbol: "$", smallCurrencyName: "Cent", significantDigit: 2 },
  { currencyCode: "EUR", currencyName: "Euro", symbol: "€", smallCurrencyName: "Cent", significantDigit: 2 },
  { currencyCode: "GBP", currencyName: "British Pound", symbol: "£", smallCurrencyName: "Penny", significantDigit: 2 },
  { currencyCode: "INR", currencyName: "Indian Rupee", symbol: "₹", smallCurrencyName: "Paisa", significantDigit: 2 },
  { currencyCode: "AED", currencyName: "UAE Dirham", symbol: "د.إ", smallCurrencyName: "Fils", significantDigit: 2 },
];
