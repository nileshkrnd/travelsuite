import type { Booking, BookingStatus, CurrencyCode } from "@/types";
import { DEFAULT_TENANT_ID } from "./tenants";

const DESTINATIONS = ["Paris", "Dubai", "Bali", "Rome", "Goa", "New York", "Bangkok", "Barcelona"];
const CURRENCIES: CurrencyCode[] = ["USD", "EUR", "GBP", "INR", "AED"];
const STATUSES: BookingStatus[] = ["confirmed", "pending", "completed", "confirmed", "cancelled"];
const CUSTOMER_NAMES = [
  "Liam Carter",
  "Sophie Nguyen",
  "Rahul Mehta",
  "Isabella Rossi",
  "Omar Al-Farsi",
  "Chloe Dubois",
  "Kenji Watanabe",
  "Fatima Zahra",
  "Noah Schmidt",
  "Ava Thompson",
  "Diego Fernandez",
  "Mei Lin",
];

type BookingOwnerField = "agentId" | "subAgentId" | "hotelierId" | "supplierId" | "dmcId" | "corporateId";

const ROLE_OWNERS: { field: BookingOwnerField; id: string }[] = [
  { field: "agentId", id: "user_agent_1" },
  { field: "subAgentId", id: "user_subagent_1" },
  { field: "hotelierId", id: "user_hotelier_1" },
  { field: "supplierId", id: "user_supplier_1" },
  { field: "dmcId", id: "user_dmc_1" },
  { field: "corporateId", id: "user_corporate_1" },
];

const ANCHOR = new Date("2026-07-22T00:00:00.000Z");

function generateBookings(): Booking[] {
  const list: Booking[] = [];

  for (let i = 0; i < 48; i++) {
    const monthsAgo = i % 6;
    const dayOfMonth = 1 + ((i * 7) % 27);
    const bookingDate = new Date(ANCHOR);
    bookingDate.setUTCMonth(bookingDate.getUTCMonth() - monthsAgo, dayOfMonth);

    const travelDate = new Date(bookingDate);
    travelDate.setUTCDate(travelDate.getUTCDate() + 14 + (i % 10));

    const owner = ROLE_OWNERS[i % ROLE_OWNERS.length];
    const value = 380 + ((i * 137) % 3400);

    const booking: Booking = {
      id: `bk_${String(i + 1).padStart(3, "0")}`,
      tenantId: DEFAULT_TENANT_ID,
      reference: `TS-2026${String(1001 + i)}`,
      destination: DESTINATIONS[i % DESTINATIONS.length],
      status: STATUSES[i % STATUSES.length],
      bookingDate: bookingDate.toISOString(),
      travelDate: travelDate.toISOString(),
      amount: { value, currencyCode: CURRENCIES[i % CURRENCIES.length] },
      customerName: CUSTOMER_NAMES[i % CUSTOMER_NAMES.length],
    };
    booking[owner.field] = owner.id;

    list.push(booking);
  }

  return list;
}

export const bookings: Booking[] = generateBookings();
