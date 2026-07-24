export interface Country {
  /** ISO 3166-1 alpha-2 code, e.g. "US". */
  code: string;
  name: string;
  dialCode: string;
  cities: string[];
}

/** Curated set of countries relevant to a global travel SaaS — Phase 1 mock, not an exhaustive ISO list. */
export const COUNTRIES: Country[] = [
  { code: "US", name: "United States", dialCode: "+1", cities: ["New York", "Los Angeles", "Chicago", "Miami"] },
  { code: "GB", name: "United Kingdom", dialCode: "+44", cities: ["London", "Manchester", "Birmingham", "Edinburgh"] },
  { code: "IN", name: "India", dialCode: "+91", cities: ["Mumbai", "Delhi", "Bengaluru", "Hyderabad"] },
  { code: "AE", name: "United Arab Emirates", dialCode: "+971", cities: ["Dubai", "Abu Dhabi", "Sharjah"] },
  { code: "FR", name: "France", dialCode: "+33", cities: ["Paris", "Lyon", "Marseille", "Nice"] },
  { code: "DE", name: "Germany", dialCode: "+49", cities: ["Berlin", "Munich", "Frankfurt", "Hamburg"] },
  { code: "IT", name: "Italy", dialCode: "+39", cities: ["Rome", "Milan", "Venice", "Florence"] },
  { code: "ES", name: "Spain", dialCode: "+34", cities: ["Madrid", "Barcelona", "Valencia", "Seville"] },
  { code: "CA", name: "Canada", dialCode: "+1", cities: ["Toronto", "Vancouver", "Montreal", "Calgary"] },
  { code: "AU", name: "Australia", dialCode: "+61", cities: ["Sydney", "Melbourne", "Brisbane", "Perth"] },
  { code: "SG", name: "Singapore", dialCode: "+65", cities: ["Singapore"] },
  { code: "JP", name: "Japan", dialCode: "+81", cities: ["Tokyo", "Osaka", "Kyoto", "Yokohama"] },
  { code: "CN", name: "China", dialCode: "+86", cities: ["Shanghai", "Beijing", "Shenzhen", "Guangzhou"] },
  { code: "SA", name: "Saudi Arabia", dialCode: "+966", cities: ["Riyadh", "Jeddah", "Dammam"] },
  { code: "QA", name: "Qatar", dialCode: "+974", cities: ["Doha"] },
  { code: "EG", name: "Egypt", dialCode: "+20", cities: ["Cairo", "Alexandria", "Giza"] },
  { code: "ZA", name: "South Africa", dialCode: "+27", cities: ["Johannesburg", "Cape Town", "Durban"] },
  { code: "BR", name: "Brazil", dialCode: "+55", cities: ["São Paulo", "Rio de Janeiro", "Brasília"] },
  { code: "MX", name: "Mexico", dialCode: "+52", cities: ["Mexico City", "Cancún", "Guadalajara"] },
  { code: "ID", name: "Indonesia", dialCode: "+62", cities: ["Jakarta", "Bali", "Surabaya"] },
];

export function getCountry(code: string): Country | undefined {
  return COUNTRIES.find((c) => c.code === code);
}

export function getCitiesForCountry(code: string): string[] {
  return getCountry(code)?.cities ?? [];
}
