/** Standard tax type catalog — used for seeding and the tax master form. */
export type TaxTypeCatalogEntry = {
  code: string;
  name: string;
};

export const DEFAULT_TAX_TYPES: TaxTypeCatalogEntry[] = [
  { code: "VAT", name: "Value Added Tax" },
  { code: "GST", name: "Goods & Services Tax" },
  { code: "TOURISM_TAX", name: "Tourism Tax" },
  { code: "CITY_TAX", name: "City Tax" },
  { code: "MUNICIPAL_TAX", name: "Municipal Tax" },
  { code: "SERVICE_CHARGE", name: "Service Charge" },
  { code: "RESORT_FEE", name: "Resort Fee" },
  { code: "ENVIRONMENTAL_TAX", name: "Environmental Tax" },
  { code: "BED_TAX", name: "Bed Tax" },
  { code: "DESTINATION_FEE", name: "Destination Fee" },
];
