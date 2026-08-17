/** Standard market type catalog — used for seeding and the contract market rule form. */
export type MarketTypeCatalogEntry = {
  code: string;
  name: string;
};

export const DEFAULT_MARKET_TYPES: MarketTypeCatalogEntry[] = [
  { code: "COUNTRY", name: "Country" },
  { code: "REGION", name: "Region" },
  { code: "CITY", name: "City" },
  { code: "MARKET_GROUP", name: "Market Group" },
];
