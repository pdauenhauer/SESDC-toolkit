import type { SimulationResult } from "../../services/simulation";
import { parseNumericCsv, sumColumn, lastFinite } from "./parseNumericCsv";

export type SimulationMetrics = {
  /** Energy totals over the simulated year (kWh). Hourly kW == kWh per step. */
  totalLoadKwh: number;
  totalSolarKwh: number;
  totalWindKwh: number;
  totalDieselKwh: number;
  totalServicedKwh: number;
  totalUnservedKwh: number;
  /** Fraction of demand met, 0..1. */
  servedFraction: number;
  /** Renewable share of total generation, 0..1. */
  renewableFraction: number;

  /** 20-year lifecycle figures (nominal dollars). */
  totalExpenses20y: number;
  totalRevenue20y: number;
  netCashflow20y: number;
  /** First year index (1-based) where cumulative revenue >= cumulative cost, or null. */
  paybackYear: number | null;
  /** Simplified undiscounted levelized cost of energy ($/kWh), or null. */
  lcoe: number | null;

  /** Per-year cumulative series for charting (length up to 20). */
  cumulativeExpenses: number[];
  cumulativeRevenue: number[];
};

function safeFraction(numerator: number, denominator: number): number {
  if (!Number.isFinite(denominator) || denominator <= 0) return 0;
  return numerator / denominator;
}

/**
 * Derive headline KPIs from the simulation CSV bundle. Returns null when the
 * hourly table is missing or empty (nothing meaningful to summarize).
 */
export function computeSimulationMetrics(
  result: SimulationResult
): SimulationMetrics | null {
  const hourlyCsv = result["hourly_simulation"];
  if (!hourlyCsv) return null;

  const hourly = parseNumericCsv(hourlyCsv);
  if (hourly.rowCount === 0) return null;

  const totalLoadKwh = sumColumn(hourly.columns["load_kW"]);
  const totalSolarKwh = sumColumn(hourly.columns["solar_kW"]);
  const totalWindKwh = sumColumn(hourly.columns["wind_kW"]);
  const totalDieselKwh = sumColumn(hourly.columns["diesel_kW"]);
  const totalServicedKwh = sumColumn(hourly.columns["load_serviced_kW"]);
  const totalUnservedKwh = sumColumn(hourly.columns["load_not_serviced_kW"]);

  const renewableGen = totalSolarKwh + totalWindKwh;
  const totalGen = renewableGen + totalDieselKwh;

  // Financials
  const finCsv = result["financial_expenses"];
  const revCsv = result["revenue"];
  const fin = finCsv ? parseNumericCsv(finCsv) : null;
  const rev = revCsv ? parseNumericCsv(revCsv) : null;

  const cumulativeExpenses = fin?.columns["cumulative_expenses"] ?? [];
  const cumulativeRevenue = rev?.columns["cumulative_revenue"] ?? [];

  const totalExpenses20y = lastFinite(cumulativeExpenses);
  const totalRevenue20y = lastFinite(cumulativeRevenue);

  let paybackYear: number | null = null;
  const horizon = Math.min(cumulativeExpenses.length, cumulativeRevenue.length);
  for (let y = 0; y < horizon; y += 1) {
    if (cumulativeRevenue[y] >= cumulativeExpenses[y]) {
      paybackYear = y + 1;
      break;
    }
  }

  // Simplified LCOE: lifetime cost / lifetime energy served (undiscounted).
  let lcoe: number | null = null;
  const twentyCsv = result["twenty_year_daily"];
  if (twentyCsv && totalExpenses20y > 0) {
    const twenty = parseNumericCsv(twentyCsv);
    const lifetimeServedKwh = sumColumn(twenty.columns["load_serviced_kW"]) * 24;
    if (lifetimeServedKwh > 0) lcoe = totalExpenses20y / lifetimeServedKwh;
  }

  return {
    totalLoadKwh,
    totalSolarKwh,
    totalWindKwh,
    totalDieselKwh,
    totalServicedKwh,
    totalUnservedKwh,
    servedFraction: safeFraction(totalServicedKwh, totalLoadKwh),
    renewableFraction: safeFraction(renewableGen, totalGen),
    totalExpenses20y,
    totalRevenue20y,
    netCashflow20y: totalRevenue20y - totalExpenses20y,
    paybackYear,
    lcoe,
    cumulativeExpenses,
    cumulativeRevenue,
  };
}
