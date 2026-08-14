export const STOP_SALE_TYPE_PROPERTY = "PROPERTY";
export const STOP_SALE_TYPE_ROOM = "ROOM_TYPE";
export const STOP_SALE_TYPE_RATE_PLAN = "RATE_PLAN";
export const STOP_SALE_TYPE_ROOM_RATE_PLAN = "ROOM_RATE_PLAN";

export const DEFAULT_STOP_SALE_TYPES = [
  { code: STOP_SALE_TYPE_PROPERTY, name: "Entire Property" },
  { code: STOP_SALE_TYPE_ROOM, name: "Room Type" },
  { code: STOP_SALE_TYPE_RATE_PLAN, name: "Rate Plan" },
  { code: STOP_SALE_TYPE_ROOM_RATE_PLAN, name: "Room + Rate Plan" },
] as const;

export function stopSaleTypeNeedsRoom(code: string): boolean {
  const upper = code.toUpperCase();
  return upper === STOP_SALE_TYPE_ROOM || upper === STOP_SALE_TYPE_ROOM_RATE_PLAN;
}

export function stopSaleTypeNeedsRatePlan(code: string): boolean {
  const upper = code.toUpperCase();
  return upper === STOP_SALE_TYPE_RATE_PLAN || upper === STOP_SALE_TYPE_ROOM_RATE_PLAN;
}

export function stopSaleTypeForbidsRoom(code: string): boolean {
  const upper = code.toUpperCase();
  return upper === STOP_SALE_TYPE_PROPERTY || upper === STOP_SALE_TYPE_RATE_PLAN;
}

export function stopSaleTypeForbidsRatePlan(code: string): boolean {
  const upper = code.toUpperCase();
  return upper === STOP_SALE_TYPE_PROPERTY || upper === STOP_SALE_TYPE_ROOM;
}
