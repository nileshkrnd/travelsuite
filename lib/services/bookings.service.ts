import { mockDelay } from "@/lib/utils";
import { bookings } from "@/mock/data/bookings";
import { users } from "@/mock/data/users";
import { exchangeRatesToUsd } from "@/mock/data/exchangeRates";
import type { Booking, CurrencyCode, Money, Role } from "@/types";

function scopeToRole(list: Booking[], role: Role, userId?: string): Booking[] {
  if (!userId) return list;
  switch (role) {
    case "agent":
      return list.filter((b) => b.agentId === userId);
    case "sub_agent":
      return list.filter((b) => b.subAgentId === userId);
    case "hotelier":
      return list.filter((b) => b.hotelierId === userId);
    case "supplier":
      return list.filter((b) => b.supplierId === userId);
    case "dmc":
      return list.filter((b) => b.dmcId === userId);
    case "corporate_customer":
      return list.filter((b) => b.corporateId === userId);
    default:
      return list;
  }
}

/** Deterministic pseudo-random int in [min, max) seeded from a string — stable across reloads, no Math.random(). */
function seededInt(seed: string, min: number, max: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return min + (hash % (max - min));
}

function toUsd(money: Money): number {
  return money.value / exchangeRatesToUsd[money.currencyCode];
}

export async function getBookings(tenantId: string, role: Role, userId?: string): Promise<Booking[]> {
  // TODO(Phase 2): replace with `await fetch(`/api/tenants/${tenantId}/bookings?role=${role}&userId=${userId}`).then(r => r.json())`
  await mockDelay();
  return scopeToRole(
    bookings.filter((b) => b.tenantId === tenantId),
    role,
    userId
  );
}

export interface BookingsTrendPoint {
  month: string;
  count: number;
}

export async function getBookingsTrend(
  tenantId: string,
  role: Role,
  userId?: string
): Promise<BookingsTrendPoint[]> {
  // TODO(Phase 2): replace with `await fetch(`/api/tenants/${tenantId}/bookings/trend?role=${role}&userId=${userId}`).then(r => r.json())`
  await mockDelay();
  const scoped = scopeToRole(
    bookings.filter((b) => b.tenantId === tenantId),
    role,
    userId
  );
  const anchor = new Date("2026-07-22T00:00:00.000Z");
  const points: BookingsTrendPoint[] = [];
  for (let i = 5; i >= 0; i--) {
    const monthDate = new Date(anchor);
    monthDate.setUTCMonth(monthDate.getUTCMonth() - i, 1);
    const count = scoped.filter((b) => {
      const bookedAt = new Date(b.bookingDate);
      return (
        bookedAt.getUTCFullYear() === monthDate.getUTCFullYear() &&
        bookedAt.getUTCMonth() === monthDate.getUTCMonth()
      );
    }).length;
    points.push({ month: monthDate.toLocaleString("en", { month: "short" }), count });
  }
  return points;
}

export interface RevenueByCurrencyPoint {
  currencyCode: CurrencyCode;
  total: number;
}

export async function getRevenueByCurrency(
  tenantId: string,
  role: Role,
  userId?: string
): Promise<RevenueByCurrencyPoint[]> {
  // TODO(Phase 2): replace with `await fetch(`/api/tenants/${tenantId}/bookings/revenue-by-currency?role=${role}&userId=${userId}`).then(r => r.json())`
  await mockDelay();
  const scoped = scopeToRole(
    bookings.filter((b) => b.tenantId === tenantId && b.status !== "cancelled"),
    role,
    userId
  );
  const totals = new Map<CurrencyCode, number>();
  for (const b of scoped) {
    totals.set(b.amount.currencyCode, (totals.get(b.amount.currencyCode) ?? 0) + b.amount.value);
  }
  return [...totals.entries()].map(([currencyCode, total]) => ({ currencyCode, total }));
}

export interface TopDestinationPoint {
  destination: string;
  count: number;
}

export async function getTopDestinations(
  tenantId: string,
  role: Role,
  userId?: string,
  limit = 5
): Promise<TopDestinationPoint[]> {
  // TODO(Phase 2): replace with `await fetch(`/api/tenants/${tenantId}/bookings/top-destinations?role=${role}&userId=${userId}&limit=${limit}`).then(r => r.json())`
  await mockDelay();
  const scoped = scopeToRole(
    bookings.filter((b) => b.tenantId === tenantId),
    role,
    userId
  );
  const counts = new Map<string, number>();
  for (const b of scoped) counts.set(b.destination, (counts.get(b.destination) ?? 0) + 1);
  return [...counts.entries()]
    .map(([destination, count]) => ({ destination, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export interface DashboardKpis {
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  totalRevenue: Money;
  avgBookingValue: Money;
  commissionEarned: Money;
  walletBalance: Money;
  creditLimit: Money;
  activeUsers: number;
  servicesListed: number;
  destinationPackages: number;
  occupancyRate: number;
  policyComplianceRate: number;
  pendingApprovals: number;
}

export async function getDashboardKpis(
  tenantId: string,
  role: Role,
  userId?: string
): Promise<DashboardKpis> {
  // TODO(Phase 2): replace with `await fetch(`/api/tenants/${tenantId}/dashboard/kpis?role=${role}&userId=${userId}`).then(r => r.json())`
  await mockDelay();
  const scoped = scopeToRole(
    bookings.filter((b) => b.tenantId === tenantId),
    role,
    userId
  );
  const nonCancelled = scoped.filter((b) => b.status !== "cancelled");
  const totalRevenueUsd = nonCancelled.reduce((sum, b) => sum + toUsd(b.amount), 0);
  const avgBookingValueUsd = nonCancelled.length ? totalRevenueUsd / nonCancelled.length : 0;
  const seed = userId ?? role;

  return {
    totalBookings: scoped.length,
    pendingBookings: scoped.filter((b) => b.status === "pending").length,
    confirmedBookings: scoped.filter((b) => b.status === "confirmed").length,
    totalRevenue: { value: Math.round(totalRevenueUsd), currencyCode: "USD" },
    avgBookingValue: { value: Math.round(avgBookingValueUsd), currencyCode: "USD" },
    commissionEarned: { value: Math.round(totalRevenueUsd * 0.08), currencyCode: "USD" },
    walletBalance: { value: seededInt(`${seed}-wallet`, 4200, 28000), currencyCode: "USD" },
    creditLimit: { value: seededInt(`${seed}-credit`, 10000, 50000), currencyCode: "USD" },
    activeUsers: users.filter((u) => u.tenantId === tenantId && u.status === "active").length,
    servicesListed: seededInt(`${seed}-services`, 8, 32),
    destinationPackages: seededInt(`${seed}-packages`, 4, 20),
    occupancyRate: seededInt(`${seed}-occupancy`, 55, 95),
    policyComplianceRate: seededInt(`${seed}-policy`, 75, 99),
    pendingApprovals: scoped.filter((b) => b.status === "pending").length,
  };
}
