/** Standardized application basis codes for tax calculation — what the tax is charged against. */
export type TaxApplicationBasisEntry = {
  code: string;
  label: string;
  description: string;
};

export const TAX_APPLICATION_BASIS_OPTIONS: TaxApplicationBasisEntry[] = [
  { code: "ROOM_RATE", label: "Room rate", description: "Tax calculated on room rate" },
  { code: "ROOM_NIGHT", label: "Room / night", description: "Fixed amount per room per night" },
  { code: "PERSON", label: "Per person", description: "Per person" },
  { code: "PERSON_NIGHT", label: "Person / night", description: "Per person per night" },
  { code: "MEAL", label: "Per meal", description: "Per meal" },
  { code: "SUPPLEMENT", label: "On supplement", description: "On supplement" },
  { code: "TOTAL", label: "Taxable total", description: "On taxable total" },
];
