/** Tax application basis lookup — Per Person / Per Adult / Per Booking / Per Vehicle, … Global. */
export interface TaxApplicationBasis {
  taxApplicationBasisId: number;
  taxApplicationBasisCode: string;
  taxApplicationBasisName: string;
  isActive: boolean;
  displayOrder: number;
}
