import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Simulates network latency for mock service calls. Remove once real fetch()s land in Phase 2. */
export function mockDelay(ms = 350) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function initials(name: string): string {
  const words = name.trim().split(/\s+/)
  return words.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?"
}

export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffMins = Math.round(diffMs / 60000)
  if (diffMins < 60) return `${Math.max(diffMins, 1)}m ago`
  const diffHours = Math.round(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.round(diffHours / 24)
  return `${diffDays}d ago`
}
