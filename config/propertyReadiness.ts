/**
 * Single source of truth for the Property Readiness / Go-Live checklist shown on the
 * Extranet "Select Property" dashboard. Only the server-side readiness computation
 * (lib/api/property-readiness-helpers.ts) reads this — the frontend never re-derives
 * status, it only renders what the API returns.
 */

export type ReadinessStatus =
  | "completed"
  | "inProgress"
  | "pending"
  | "blocked"
  | "notApplicable"
  | "optional";

export type ReadinessCategory = "property" | "contract";

export interface ReadinessStepDef {
  code: string;
  name: string;
  category: ReadinessCategory;
  isMandatory: boolean;
  /** Percentage points this step contributes toward overall completion. Sums to 100. */
  weight: number;
  /** Step codes that must be "completed" before this step can be attempted. */
  dependsOn: string[];
}

export const READINESS_STEPS: ReadinessStepDef[] = [
  {
    code: "propertySeason",
    name: "Property Season",
    category: "property",
    isMandatory: true,
    weight: 10,
    dependsOn: [],
  },
  {
    code: "propertyRoom",
    name: "Property Room",
    category: "property",
    isMandatory: true,
    weight: 10,
    dependsOn: [],
  },
  {
    code: "contract",
    name: "Create Contract",
    category: "contract",
    isMandatory: true,
    weight: 10,
    dependsOn: [],
  },
  {
    code: "seasonPeriod",
    name: "Contract Season Periods",
    category: "contract",
    isMandatory: true,
    weight: 10,
    dependsOn: ["contract", "propertySeason"],
  },
  {
    code: "ratePlan",
    name: "Rate Plan",
    category: "contract",
    isMandatory: true,
    weight: 15,
    dependsOn: ["contract"],
  },
  {
    code: "contractRates",
    name: "Contract Rates",
    category: "contract",
    isMandatory: true,
    weight: 20,
    dependsOn: ["ratePlan", "seasonPeriod", "propertyRoom"],
  },
  {
    code: "inventory",
    name: "Inventory / Allotment",
    category: "contract",
    isMandatory: true,
    weight: 15,
    dependsOn: ["contractRates"],
  },
  {
    code: "supplements",
    name: "Supplements",
    category: "contract",
    isMandatory: false,
    weight: 5,
    dependsOn: ["contract"],
  },
  {
    code: "childPolicies",
    name: "Child Policies",
    category: "contract",
    isMandatory: false,
    weight: 2.5,
    dependsOn: ["contract"],
  },
  {
    code: "cancellationPolicy",
    name: "Cancellation Policy",
    category: "contract",
    isMandatory: false,
    weight: 2.5,
    dependsOn: ["contract"],
  },
];
