import { prisma } from "@/lib/db";
import { READINESS_STEPS, type ReadinessStatus } from "@/config/propertyReadiness";

export interface ReadinessStepResult {
  stepCode: string;
  stepName: string;
  category: "property" | "contract";
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

export interface PropertyReadinessResult {
  propertyId: number;
  propertyName: string;
  propertyCode: string;
  contractId: number | null;
  contractNumber: string | null;
  overallStatus: "notReady" | "readyForReview" | "readyToGoLive";
  completionPercentage: number;
  mandatoryRemaining: { code: string; name: string }[];
  nextAction: { stepCode: string; label: string; description: string; route: string } | null;
  steps: ReadinessStepResult[];
  completedSummary: { stepCode: string; label: string; detail: string }[];
  pendingSummary: { stepCode: string; label: string; detail: string }[];
  goLiveValidation: {
    isReady: boolean;
    checks: { code: string; label: string; passed: boolean; mandatory: boolean; message?: string }[];
  };
}

function route(role: string, path: string, propertyId: number): string {
  return `/${role}/extranet/${path}?propertyId=${propertyId}`;
}

function contractTabRoute(role: string, contractId: number, tab: string): string {
  return `/${role}/extranet/contracts/${contractId}?tab=${tab}`;
}

/** Computes the full Property Readiness / Go-Live checklist for one property, fully derived from live data — nothing is cached or persisted. */
export async function computePropertyReadiness(
  role: string,
  { tenantId, companyId, propertyId }: { tenantId: number; companyId?: number; propertyId: number }
): Promise<PropertyReadinessResult> {
  const companyFilter = companyId ? { companyId } : {};

  const property = await prisma.property.findUnique({
    where: { propertyId },
    select: { propertyId: true, propertyName: true, propertyCode: true, propertyDisplayName: true },
  });
  if (!property) {
    throw new Error("Property not found");
  }

  const [seasonCount, roomCount, activeContract] = await Promise.all([
    prisma.propertySeason.count({ where: { tenantId, propertyId, isActive: true, ...companyFilter } }),
    prisma.propertyRoom.count({ where: { tenantId, propertyId, isActive: true, ...companyFilter } }),
    prisma.propertyContract.findFirst({
      where: { tenantId, propertyId, isActive: true, ...companyFilter },
      orderBy: { createdDtTm: "desc" },
      select: { propertyContractId: true, contractNumber: true, contractName: true },
    }),
  ]);

  const contractId = activeContract ? Number(activeContract.propertyContractId) : null;

  const [
    contractCount,
    seasonPeriodCount,
    ratePlanCount,
    ratedRoomIds,
    stockedRoomIds,
    supplementCount,
    childPolicyCount,
    cancellationPolicyCount,
  ] = await Promise.all([
    prisma.propertyContract.count({ where: { tenantId, propertyId, isActive: true, ...companyFilter } }),
    contractId
      ? prisma.propertyContractSeasonPeriod.count({
          where: { tenantId, propertyContractId: contractId, isActive: true, ...companyFilter },
        })
      : Promise.resolve(0),
    contractId
      ? prisma.propertyContractRatePlan.count({
          where: { tenantId, propertyContractId: contractId, isActive: true, ...companyFilter },
        })
      : Promise.resolve(0),
    contractId
      ? prisma.propertyContractRate.findMany({
          where: { tenantId, propertyContractId: contractId, isActive: true, ...companyFilter },
          select: { propertyRoomId: true },
          distinct: ["propertyRoomId"],
        })
      : Promise.resolve([]),
    contractId
      ? prisma.propertyContractInventory.findMany({
          where: { tenantId, propertyContractId: contractId, isActive: true, ...companyFilter },
          select: { propertyRoomId: true },
          distinct: ["propertyRoomId"],
        })
      : Promise.resolve([]),
    contractId
      ? prisma.propertyContractSupplement.count({
          where: { tenantId, propertyContractId: contractId, isActive: true, ...companyFilter },
        })
      : Promise.resolve(0),
    contractId
      ? prisma.propertyContractChildPolicy.count({
          where: { tenantId, propertyContractId: contractId, isActive: true, ...companyFilter },
        })
      : Promise.resolve(0),
    contractId
      ? prisma.propertyContractCancellationPolicy.count({
          where: { tenantId, propertyContractId: contractId, isActive: true, ...companyFilter },
        })
      : Promise.resolve(0),
  ]);

  const ratedRoomCount = ratedRoomIds.length;
  const stockedRoomCount = stockedRoomIds.length;

  // Raw counts per step, keyed by step code — the numbers behind status derivation below.
  const counts: Record<string, { completed: number; required: number }> = {
    propertySeason: { completed: seasonCount, required: 1 },
    propertyRoom: { completed: roomCount, required: 1 },
    contract: { completed: contractCount, required: 1 },
    seasonPeriod: { completed: seasonPeriodCount, required: 1 },
    ratePlan: { completed: ratePlanCount, required: 1 },
    // "Fully configured" for rates/inventory means every active room type is covered.
    contractRates: { completed: ratedRoomCount, required: Math.max(roomCount, 1) },
    inventory: { completed: stockedRoomCount, required: Math.max(roomCount, 1) },
    supplements: { completed: supplementCount, required: 1 },
    childPolicies: { completed: childPolicyCount, required: 1 },
    cancellationPolicy: { completed: cancellationPolicyCount, required: 1 },
  };

  const details: Record<string, { completed: string; inProgress: string; pending: string }> = {
    propertySeason: {
      completed: `${seasonCount} Season${seasonCount === 1 ? "" : "s"} configured`,
      inProgress: "",
      pending: "No property seasons configured",
    },
    propertyRoom: {
      completed: `${roomCount} Room Type${roomCount === 1 ? "" : "s"} configured`,
      inProgress: "",
      pending: "No room types configured",
    },
    contract: {
      completed: activeContract ? `${activeContract.contractName} (${activeContract.contractNumber})` : "",
      inProgress: "",
      pending: "No active contract for this property",
    },
    seasonPeriod: {
      completed: `${seasonPeriodCount} season period${seasonPeriodCount === 1 ? "" : "s"} on this contract`,
      inProgress: "",
      pending: "No season periods on this contract",
    },
    ratePlan: {
      completed: `${ratePlanCount} Rate Plan${ratePlanCount === 1 ? "" : "s"} configured`,
      inProgress: "",
      pending: "No rate plans configured",
    },
    contractRates: {
      completed: `${ratedRoomCount} of ${roomCount} room types have rates`,
      inProgress: `${ratedRoomCount} of ${roomCount} room types have rates`,
      pending: "No contract rates configured",
    },
    inventory: {
      completed: `${stockedRoomCount} of ${roomCount} room types have inventory`,
      inProgress: `${stockedRoomCount} of ${roomCount} room types have inventory`,
      pending: "No inventory / allotment configured",
    },
    supplements: {
      completed: `${supplementCount} Supplement${supplementCount === 1 ? "" : "s"} configured`,
      inProgress: "",
      pending: "Not configured",
    },
    childPolicies: {
      completed: `${childPolicyCount} Child Polic${childPolicyCount === 1 ? "y" : "ies"} configured`,
      inProgress: "",
      pending: "Not configured",
    },
    cancellationPolicy: {
      completed: `${cancellationPolicyCount} Cancellation Polic${cancellationPolicyCount === 1 ? "y" : "ies"} configured`,
      inProgress: "",
      pending: "Not configured",
    },
  };

  const routes: Record<string, string> = {
    propertySeason: route(role, "seasons", propertyId),
    propertyRoom: route(role, "rooms", propertyId),
    contract: route(role, "contracts", propertyId),
    seasonPeriod: contractId ? contractTabRoute(role, contractId, "season-periods") : route(role, "contracts", propertyId),
    ratePlan: contractId ? contractTabRoute(role, contractId, "rate-plans") : route(role, "contracts", propertyId),
    contractRates: route(role, "rates", propertyId),
    inventory: route(role, "inventory", propertyId),
    supplements: route(role, "supplement", propertyId),
    childPolicies: route(role, "child-policies", propertyId),
    cancellationPolicy: route(role, "cancellation-policies", propertyId),
  };

  const statusByCode = new Map<string, ReadinessStatus>();
  const steps: ReadinessStepResult[] = [];

  for (const def of READINESS_STEPS) {
    const unmetDependency = def.dependsOn.find((dep) => statusByCode.get(dep) !== "completed");
    const { completed, required } = counts[def.code];
    const detail = details[def.code];

    let status: ReadinessStatus;
    let blockingReason: string | null = null;

    if (unmetDependency) {
      status = "blocked";
      const depDef = READINESS_STEPS.find((s) => s.code === unmetDependency)!;
      blockingReason = `Complete ${depDef.name} first`;
    } else if (completed <= 0) {
      status = def.isMandatory ? "pending" : "optional";
    } else if (completed < required) {
      status = "inProgress";
    } else {
      status = "completed";
    }

    statusByCode.set(def.code, status);

    const detailText =
      status === "completed"
        ? detail.completed
        : status === "inProgress"
          ? detail.inProgress || detail.pending
          : detail.pending;

    steps.push({
      stepCode: def.code,
      stepName: def.name,
      category: def.category,
      status,
      isMandatory: def.isMandatory,
      isApplicable: true,
      weight: def.weight,
      completedCount: completed,
      requiredCount: required,
      detail: detailText,
      blockingReason,
      route: unmetDependency ? routes[unmetDependency] : routes[def.code],
    });
  }

  const totalWeight = READINESS_STEPS.reduce((sum, s) => sum + s.weight, 0);
  const completedWeight = steps
    .filter((s) => s.status === "completed")
    .reduce((sum, s) => sum + s.weight, 0);
  const completionPercentage = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;

  const mandatorySteps = steps.filter((s) => s.isMandatory);
  const mandatoryRemaining = mandatorySteps
    .filter((s) => s.status !== "completed")
    .map((s) => ({ code: s.stepCode, name: s.stepName }));
  const optionalSteps = steps.filter((s) => !s.isMandatory);
  const allOptionalDone = optionalSteps.every((s) => s.status === "completed");

  const overallStatus: PropertyReadinessResult["overallStatus"] =
    mandatoryRemaining.length > 0 ? "notReady" : allOptionalDone ? "readyToGoLive" : "readyForReview";

  const firstIncompleteMandatory = mandatorySteps.find((s) => s.status !== "completed");
  const firstIncompleteOptional = optionalSteps.find((s) => s.status !== "completed");
  const nextStep = firstIncompleteMandatory ?? firstIncompleteOptional ?? null;
  const nextAction = nextStep
    ? {
        stepCode: nextStep.stepCode,
        label: `Configure ${nextStep.stepName}`,
        description:
          nextStep.blockingReason ??
          `${nextStep.stepName} is the next step required before this property can go live.`,
        route: nextStep.route,
      }
    : null;

  const completedSummary = steps
    .filter((s) => s.status === "completed")
    .map((s) => ({ stepCode: s.stepCode, label: s.stepName, detail: s.detail }));
  const pendingSummary = steps
    .filter((s) => s.status !== "completed")
    .map((s) => ({ stepCode: s.stepCode, label: s.stepName, detail: s.detail }));

  const goLiveValidation = {
    isReady: mandatoryRemaining.length === 0,
    checks: steps.map((s) => ({
      code: s.stepCode,
      label: `${s.stepName} configured`,
      passed: s.status === "completed",
      mandatory: s.isMandatory,
      message: s.status === "completed" ? undefined : (s.blockingReason ?? s.detail),
    })),
  };

  return {
    propertyId: property.propertyId,
    propertyName: property.propertyDisplayName || property.propertyName || property.propertyCode,
    propertyCode: property.propertyCode,
    contractId,
    contractNumber: activeContract?.contractNumber ?? null,
    overallStatus,
    completionPercentage,
    mandatoryRemaining,
    nextAction,
    steps,
    completedSummary,
    pendingSummary,
    goLiveValidation,
  };
}
