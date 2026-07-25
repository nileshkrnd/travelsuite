/** Employee master — HR record linked to a login User. */
export interface Employee {
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
  joiningDate: string;
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
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
  /** Display helpers when joins are present. */
  companyName?: string;
  branchName?: string;
  designationName?: string;
  departmentName?: string;
  accessRoleName?: string;
  countryName?: string;
  cityName?: string;
  reportingEmployeeName?: string;
}

export function employeeDisplayName(e: Pick<Employee, "title" | "firstName" | "lastName">): string {
  return `${e.title} ${e.firstName} ${e.lastName}`.replace(/\s+/g, " ").trim();
}
