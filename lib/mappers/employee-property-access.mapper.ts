import type { EmployeePropertyGrant } from "@/types";

export interface EmployeePropertyAccessRow {
  employeePropertyAccessId: bigint | number;
  tenantId: number;
  companyId: number;
  employeeId: number;
  propertyId: number | null;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canSubmit: boolean;
  canApprove: boolean;
  isActive: boolean;
  validFrom: Date | string | null;
  validTo: Date | string | null;
  createdBy: number;
  createdDtTm: Date | string;
  employee?: { title: string; firstName: string; lastName: string } | null;
  property?: { propertyCode: string; propertyName: string | null } | null;
}

function toIso(value: Date | string): string {
  return typeof value === "string" ? value : value.toISOString();
}

function toDateOnly(value: Date | string | null): string | null {
  if (value == null) return null;
  const iso = typeof value === "string" ? value : value.toISOString();
  return iso.slice(0, 10);
}

/** Groups the flat per-row rows (one row per property, or one NULL-property row) into one grant per employee. */
export function toAppEmployeePropertyGrants(rows: EmployeePropertyAccessRow[]): EmployeePropertyGrant[] {
  const byEmployee = new Map<number, EmployeePropertyAccessRow[]>();
  for (const row of rows) {
    const list = byEmployee.get(row.employeeId);
    if (list) list.push(row);
    else byEmployee.set(row.employeeId, [row]);
  }

  return [...byEmployee.entries()].map(([employeeId, group]) => {
    const first = group[0]!;
    const allRow = group.find((r) => r.propertyId == null);
    const isAllProperties = !!allRow;
    const flagsSource = allRow ?? first;
    return {
      employeeId,
      employeeName: first.employee
        ? `${first.employee.title} ${first.employee.firstName} ${first.employee.lastName}`.trim()
        : undefined,
      tenantKey: first.tenantId,
      companyKey: first.companyId,
      isAllProperties,
      properties: isAllProperties
        ? []
        : group
            .filter((r) => r.propertyId != null)
            .map((r) => ({
              propertyId: r.propertyId as number,
              propertyCode: r.property?.propertyCode,
              propertyName: r.property?.propertyName ?? undefined,
            })),
      canView: flagsSource.canView,
      canCreate: flagsSource.canCreate,
      canEdit: flagsSource.canEdit,
      canSubmit: flagsSource.canSubmit,
      canApprove: flagsSource.canApprove,
      isActive: flagsSource.isActive,
      validFrom: toDateOnly(flagsSource.validFrom),
      validTo: toDateOnly(flagsSource.validTo),
      createdBy: flagsSource.createdBy,
      createdAt: toIso(flagsSource.createdDtTm),
    };
  });
}
