export const DEFAULT_STOP_SALE_REASONS = [
  { code: "FULLY_BOOKED", name: "Fully Booked" },
  { code: "PROPERTY_REQUEST", name: "Property Request" },
  { code: "MAINTENANCE", name: "Maintenance" },
  { code: "RENOVATION", name: "Renovation" },
  { code: "SPECIAL_EVENT", name: "Special Event" },
  { code: "LOW_AVAILABILITY", name: "Low Availability" },
  { code: "CONTRACT_RESTRICTION", name: "Contract Restriction" },
  { code: "TEMPORARY_CLOSURE", name: "Temporary Closure" },
  { code: "OTHER", name: "Other" },
] as const;
