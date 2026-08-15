import type { ReadinessStatus, ReadinessCategory } from "@/config/propertyReadiness";

export type { ReadinessStatus, ReadinessCategory };

export type PropertyReadinessOverallStatus = "notReady" | "readyForReview" | "readyToGoLive";

export interface ReadinessStep {
  stepCode: string;
  stepName: string;
  category: ReadinessCategory;
  status: ReadinessStatus;
  isMandatory: boolean;
  isApplicable: boolean;
  weight: number;
  completedCount: number;
  requiredCount: number;
  detail: string;
  blockingReason: string | null;
  route: string;
}

export interface ReadinessNextAction {
  stepCode: string;
  label: string;
  description: string;
  route: string;
}

export interface ReadinessSummaryItem {
  stepCode: string;
  label: string;
  detail: string;
}

export interface GoLiveValidationCheck {
  code: string;
  label: string;
  passed: boolean;
  mandatory: boolean;
  message?: string;
}

export interface PropertyReadiness {
  propertyId: number;
  propertyName: string;
  propertyCode: string;
  contractId: number | null;
  contractNumber: string | null;
  overallStatus: PropertyReadinessOverallStatus;
  completionPercentage: number;
  mandatoryRemaining: { code: string; name: string }[];
  nextAction: ReadinessNextAction | null;
  steps: ReadinessStep[];
  completedSummary: ReadinessSummaryItem[];
  pendingSummary: ReadinessSummaryItem[];
  goLiveValidation: {
    isReady: boolean;
    checks: GoLiveValidationCheck[];
  };
}
