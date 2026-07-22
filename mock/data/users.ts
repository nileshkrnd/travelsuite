import type { User } from "@/types";
import { DEFAULT_TENANT_ID } from "./tenants";

export const users: User[] = [
  {
    id: "user_emp_1",
    tenantId: DEFAULT_TENANT_ID,
    name: "Priya Sharma",
    email: "priya.sharma@horizon-travel.com",
    role: "company_employee",
    department: "Operations",
    status: "active",
    createdAt: "2024-02-11T09:00:00.000Z",
  },
  {
    id: "user_hotelier_1",
    tenantId: DEFAULT_TENANT_ID,
    name: "Marco Rossi",
    email: "marco.rossi@grandpiazza-hotel.com",
    role: "hotelier",
    status: "active",
    createdAt: "2024-03-04T09:00:00.000Z",
  },
  {
    id: "user_supplier_1",
    tenantId: DEFAULT_TENANT_ID,
    name: "Aiko Tanaka",
    email: "aiko.tanaka@swifttransfers.com",
    role: "supplier",
    status: "active",
    createdAt: "2024-01-22T09:00:00.000Z",
  },
  {
    id: "user_dmc_1",
    tenantId: DEFAULT_TENANT_ID,
    name: "Sofia Marchetti",
    email: "sofia.marchetti@romadmc.com",
    role: "dmc",
    status: "active",
    createdAt: "2024-02-27T09:00:00.000Z",
  },
  {
    id: "user_agent_1",
    tenantId: DEFAULT_TENANT_ID,
    name: "David Okafor",
    email: "david.okafor@travelwise-agency.com",
    role: "agent",
    status: "active",
    createdAt: "2023-11-30T09:00:00.000Z",
  },
  {
    id: "user_subagent_1",
    tenantId: DEFAULT_TENANT_ID,
    name: "Elena Petrova",
    email: "elena.petrova@travelwise-agency.com",
    role: "sub_agent",
    status: "active",
    createdAt: "2024-05-14T09:00:00.000Z",
  },
  {
    id: "user_corporate_1",
    tenantId: DEFAULT_TENANT_ID,
    name: "James Whitfield",
    email: "james.whitfield@acme-corp.com",
    role: "corporate_customer",
    department: "Global Mobility",
    status: "active",
    createdAt: "2024-04-02T09:00:00.000Z",
  },
];

export const MOCK_PASSWORD = "password123";
