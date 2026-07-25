import type { Employee } from "@/types";

export interface EmployeeRow {
  employeeId: number;
  title: string;
  firstName: string;
  lastName: string;
  gender: string;
  countryDialCode: string;
  phoneNumber: string;
  faxNumber: string | null;
  email: string;
  address: string;
  countryId: number;
  cityId: number;
  employeeNumber: string;
  designationId: number;
  joiningDate: Date | string;
  accessRoleId: number;
  departmentId: number | null;
  reportingEmployeeId: number | null;
  companyId: number;
  branchId: number;
  userId: number;
  employeeImage: string | null;
  tenantId: number;
  isActive: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  companyName?: string | null;
  branchName?: string | null;
  designationName?: string | null;
  departmentName?: string | null;
  accessRoleName?: string | null;
  countryName?: string | null;
  cityName?: string | null;
  reportingEmployeeName?: string | null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

export function toAppEmployee(row: EmployeeRow): Employee {
  return {
    employeeId: row.employeeId,
    title: row.title,
    firstName: row.firstName,
    lastName: row.lastName,
    gender: row.gender,
    countryDialCode: row.countryDialCode,
    phoneNumber: row.phoneNumber,
    faxNumber: row.faxNumber,
    email: row.email,
    address: row.address,
    countryId: row.countryId,
    cityId: row.cityId,
    employeeNumber: row.employeeNumber,
    designationId: row.designationId,
    joiningDate: toIso(row.joiningDate) ?? new Date().toISOString(),
    accessRoleId: row.accessRoleId,
    departmentId: row.departmentId,
    reportingEmployeeId: row.reportingEmployeeId,
    companyId: row.companyId,
    branchId: row.branchId,
    userId: row.userId,
    employeeImage: row.employeeImage,
    tenantId: row.tenantId,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdDtTm: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
    companyName: row.companyName ?? undefined,
    branchName: row.branchName ?? undefined,
    designationName: row.designationName ?? undefined,
    departmentName: row.departmentName ?? undefined,
    accessRoleName: row.accessRoleName ?? undefined,
    countryName: row.countryName ?? undefined,
    cityName: row.cityName ?? undefined,
    reportingEmployeeName: row.reportingEmployeeName ?? undefined,
  };
}
