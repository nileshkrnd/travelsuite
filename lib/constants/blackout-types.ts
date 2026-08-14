export const BLACKOUT_TYPE_PROPERTY = "PROPERTY";
export const BLACKOUT_TYPE_ROOM = "ROOM_TYPE";
export const BLACKOUT_TYPE_RATE_PLAN = "RATE_PLAN";
export const BLACKOUT_TYPE_ROOM_RATE_PLAN = "ROOM_RATE_PLAN";

export const DEFAULT_BLACKOUT_TYPES = [
  { code: BLACKOUT_TYPE_PROPERTY, name: "Entire Property" },
  { code: BLACKOUT_TYPE_ROOM, name: "Room Type" },
  { code: BLACKOUT_TYPE_RATE_PLAN, name: "Rate Plan" },
  { code: BLACKOUT_TYPE_ROOM_RATE_PLAN, name: "Room + Rate Plan" },
] as const;

export function blackoutTypeNeedsRoom(code: string): boolean {
  const upper = code.toUpperCase();
  return upper === BLACKOUT_TYPE_ROOM || upper === BLACKOUT_TYPE_ROOM_RATE_PLAN;
}

export function blackoutTypeNeedsRatePlan(code: string): boolean {
  const upper = code.toUpperCase();
  return upper === BLACKOUT_TYPE_RATE_PLAN || upper === BLACKOUT_TYPE_ROOM_RATE_PLAN;
}

export function blackoutTypeForbidsRoom(code: string): boolean {
  const upper = code.toUpperCase();
  return upper === BLACKOUT_TYPE_PROPERTY || upper === BLACKOUT_TYPE_RATE_PLAN;
}

export function blackoutTypeForbidsRatePlan(code: string): boolean {
  const upper = code.toUpperCase();
  return upper === BLACKOUT_TYPE_PROPERTY || upper === BLACKOUT_TYPE_ROOM;
}
