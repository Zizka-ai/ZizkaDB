import type { TokenUsagePayload } from '@/lib/api'

/**
 * Pure helpers for the Token Usage report. Centralised here so every
 * sub-component (summary, breakdown, top consumers) shares one definition of
 * "is there any data" and one currency formatter — no re-derivation, no risk
 * of the empty-state check drifting between components.
 */

/** True when the payload has at least one token_usage-carrying event in range. */
export function hasAnyData(payload: TokenUsagePayload): boolean {
  return payload.totals.total_requests > 0
}

const USD = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
})

/** Format a dollar amount. Sub-cent costs (common for small requests) keep up
 * to 4 decimal places so a real non-zero cost never rounds away to "$0.00". */
export function formatCost(n: number): string {
  return USD.format(n)
}

const NUM = new Intl.NumberFormat('en-US')

/** Thousands-separated integer token count. Shared so every KPI/table/chart
 * formats token counts identically (no visual mismatch between totals). */
export function formatTokens(n: number): string {
  return NUM.format(Math.round(n))
}
