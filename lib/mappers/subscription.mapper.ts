import type {
  SubscriptionModule,
  SubscriptionModuleAccess,
  SubscriptionModuleMenu,
  SubscriptionProduct,
} from "@/types";

export interface SubscriptionProductRow {
  subscriptionProductId: number;
  subscriptionProductName: string;
  description: string;
  isActive: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
}

export interface SubscriptionModuleRow {
  subscriptionModuleId: number;
  subscriptionProductId: number;
  subscriptionModuleName: string;
  description: string;
  sortOrder?: number;
  isActive: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  product?: { subscriptionProductName: string } | null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

export function toAppSubscriptionProduct(row: SubscriptionProductRow): SubscriptionProduct {
  return {
    subscriptionProductId: row.subscriptionProductId,
    subscriptionProductName: row.subscriptionProductName,
    description: row.description ?? "",
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdDtTm: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
  };
}

export function toAppSubscriptionModule(row: SubscriptionModuleRow): SubscriptionModule {
  return {
    subscriptionModuleId: row.subscriptionModuleId,
    subscriptionProductId: row.subscriptionProductId,
    subscriptionModuleName: row.subscriptionModuleName,
    description: row.description ?? "",
    sortOrder: row.sortOrder ?? 0,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdDtTm: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
    subscriptionProductName: row.product?.subscriptionProductName,
  };
}

export interface SubscriptionModuleAccessRow {
  subscriptionModuleAccessId: number;
  subscriptionModuleId: number;
  tenantId: number;
  isActive: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  module?: {
    subscriptionModuleName: string;
    product?: { subscriptionProductName: string } | null;
  } | null;
  tenant?: { tenantName: string; tenantCode: string } | null;
}

export function toAppSubscriptionModuleAccess(
  row: SubscriptionModuleAccessRow
): SubscriptionModuleAccess {
  return {
    subscriptionModuleAccessId: row.subscriptionModuleAccessId,
    subscriptionModuleId: row.subscriptionModuleId,
    tenantId: row.tenantId,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdDtTm: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
    subscriptionModuleName: row.module?.subscriptionModuleName,
    subscriptionProductName: row.module?.product?.subscriptionProductName,
    tenantName: row.tenant?.tenantName,
    tenantCode: row.tenant?.tenantCode,
  };
}

export interface SubscriptionModuleMenuRow {
  subscriptionModuleMenuId: number;
  subscriptionModuleId: number;
  parentMenuId: number | null;
  menuName: string;
  menuUrl: string;
  menuIcon: string;
  sortOrder: number;
  isActive: boolean;
  createdBy: number;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  module?: {
    subscriptionModuleName: string;
    sortOrder?: number;
    product?: { subscriptionProductName: string } | null;
  } | null;
  parent?: { menuName: string } | null;
}

export function toAppSubscriptionModuleMenu(
  row: SubscriptionModuleMenuRow
): SubscriptionModuleMenu {
  return {
    subscriptionModuleMenuId: row.subscriptionModuleMenuId,
    subscriptionModuleId: row.subscriptionModuleId,
    parentMenuId: row.parentMenuId ?? null,
    menuName: row.menuName,
    menuUrl: row.menuUrl,
    menuIcon: row.menuIcon || "Layers",
    sortOrder: row.sortOrder ?? 0,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdDtTm: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
    subscriptionModuleName: row.module?.subscriptionModuleName,
    subscriptionProductName: row.module?.product?.subscriptionProductName,
    parentMenuName: row.parent?.menuName,
    moduleSortOrder: row.module?.sortOrder ?? 0,
  };
}
