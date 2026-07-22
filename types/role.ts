export type Role =
  | "company_employee"
  | "hotelier"
  | "supplier"
  | "dmc"
  | "agent"
  | "sub_agent"
  | "corporate_customer";

export const ROLES: Role[] = [
  "company_employee",
  "hotelier",
  "supplier",
  "dmc",
  "agent",
  "sub_agent",
  "corporate_customer",
];

export const ROLE_LABELS: Record<Role, string> = {
  company_employee: "Company Employee",
  hotelier: "Hotelier",
  supplier: "Supplier",
  dmc: "DMC",
  agent: "Agent",
  sub_agent: "Sub-Agent",
  corporate_customer: "Corporate Customer",
};
