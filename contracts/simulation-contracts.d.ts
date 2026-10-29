// AUTO-GENERATED FROM `functions/contracts.py` VIA `functions/contract_export.py`.
// DO NOT EDIT MANUALLY — enforced by `functions/tests/test_contracts.py`.
// Regenerate with: `python functions/contract_export.py --write`

export type ContractSchemaVersion = "1.0";

// Canonical CSV bundle keys returned by default in `SimulationResponseEnvelope.csvBundle`
export type DefaultCsvKey =
  | "input_data"
  | "hourly_simulation"
  | "daily_averages"
  | "twenty_year_daily"
  | "financial_expenses"
  | "revenue"
  | "solar_heatmap"
  | "monthly_heatmap"
  | "yearly_summary";

// Years 2..20 on-demand hourly CSV keys (`hourly_year_02` .. `hourly_year_20`), fetched via `?keys=`
export type OnDemandHourlyYearKey =
  | "hourly_year_02"
  | "hourly_year_03"
  | "hourly_year_04"
  | "hourly_year_05"
  | "hourly_year_06"
  | "hourly_year_07"
  | "hourly_year_08"
  | "hourly_year_09"
  | "hourly_year_10"
  | "hourly_year_11"
  | "hourly_year_12"
  | "hourly_year_13"
  | "hourly_year_14"
  | "hourly_year_15"
  | "hourly_year_16"
  | "hourly_year_17"
  | "hourly_year_18"
  | "hourly_year_19"
  | "hourly_year_20";

export type AnySimulationCsvKey = DefaultCsvKey | OnDemandHourlyYearKey;

// Exact required CSV column header tuples validated by `validate_csv_bundle_schema()`
export interface ExpectedCsvColumnsMap {
  readonly hourly_simulation: readonly ["Datetime", "load_kW", "solar_kW", "wind_kW", "diesel_kW", "net_energy_kW", "battery_soc_kWh", "load_not_serviced_kW", "load_serviced_kW"];
  readonly daily_averages: readonly ["day", "avg_load_kW", "avg_solar_kW", "avg_wind_kW", "avg_diesel_kW", "avg_net_kW", "avg_load_serviced_kW", "avg_load_not_serviced_kW"];
  readonly yearly_summary: readonly ["year", "load_kWh", "solar_kWh", "wind_kWh", "battery_discharge_kWh", "diesel_kWh", "unmet_kWh", "served_kWh", "excess_kWh", "fuel_liters", "battery_usable_kWh", "solar_output_factor"];
  readonly twenty_year_daily: readonly ["day", "load_serviced_kW"];
  readonly financial_expenses: readonly ["year", "battery_expenses", "generator_expenses", "solar_expenses", "wind_expenses", "total_expenses", "cumulative_expenses"];
  readonly revenue: readonly ["year", "annual_revenue", "cumulative_revenue"];
  readonly solar_heatmap: readonly ["day", "hour_0", "hour_1", "hour_2", "hour_3", "hour_4", "hour_5", "hour_6", "hour_7", "hour_8", "hour_9", "hour_10", "hour_11", "hour_12", "hour_13", "hour_14", "hour_15", "hour_16", "hour_17", "hour_18", "hour_19", "hour_20", "hour_21", "hour_22", "hour_23"];
  readonly monthly_heatmap: readonly ["month", "day_1", "day_2", "day_3", "day_4", "day_5", "day_6", "day_7", "day_8", "day_9", "day_10", "day_11", "day_12", "day_13", "day_14", "day_15", "day_16", "day_17", "day_18", "day_19", "day_20", "day_21", "day_22", "day_23", "day_24", "day_25", "day_26", "day_27", "day_28", "day_29", "day_30", "day_31"];
}

// High-level evaluative summary metrics (`SimulationSummaryKPIs`)
export interface SimulationSummaryKPIs {
  readonly total_load_kwh: number;
  readonly total_solar_kwh: number;
  readonly total_wind_kwh: number;
  readonly total_diesel_kwh: number;
  readonly total_load_serviced_kwh: number;
  readonly total_load_not_serviced_kwh: number;
  readonly unmet_load_fraction: number;
  readonly renewable_fraction: number;
  readonly total_initial_capex: number;
  readonly year_20_cumulative_expenses: number;
  readonly year_20_cumulative_revenue: number;
  readonly net_20_year_cashflow: number;
}

// Compact native JSON summaries (< 15 KB) stored in Firestore & returned in `tier1Summaries`
export interface Tier1SimulationSummaries {
  readonly financial_expenses_20yr: Record<string, number[]>;
  readonly revenue_20yr?: Record<string, number[]> | null;
  readonly monthly_solar_averages?: number[] | null;
}

// Request JSON body accepted by `POST /run_simulation_post`
// Requires HTTP header: `Authorization: Bearer <Firebase ID Token matching userId>`
export interface SimulationRequestPayload {
  userId: string;
  projectId: string;
  latitude?: number | null;
  longitude?: number | null;
  loadInputs?: number[];
  usingSolarPanel?: boolean;
  usingWindTurbine?: boolean;
  usingGenerator?: boolean;
  usingBattery?: boolean;
  // Solar inputs (used when `usingSolarPanel` is true; losses sent as 0..100 percentages)
  wireLosses?: number;
  moduleMismatch?: number;
  moduleAging?: number;
  dustDirt?: number;
  converter?: number;
  solarArraySize?: number;
  solarCapex?: number;
  solarOpex?: number;
  solarLifespan?: number;
  solarReplacement?: number;
  // Wind inputs (used when `usingWindTurbine` is true)
  namePlateCapacity?: number;
  ratedPower?: number;
  cutInSpeed?: number;
  ratedSpeed?: number;
  cutOutSpeed?: number;
  windCapex?: number;
  windOpex?: number;
  windLifespan?: number;
  windReplacement?: number;
  // Diesel generator inputs (used when `usingGenerator` is true)
  generatorCapacity?: number;
  generatorCapex?: number;
  generatorOpex?: number;
  generatorLifespan?: number;
  generatorReplacement?: number;
  // Battery storage inputs (used when `usingBattery` is true)
  batteryType?: "lithium-ion" | "lead-acid" | string;
  chargeCapacity?: number;
  maximumStorage?: number;
  batteryCapex?: number;
  batteryOpex?: number;
  batteryLifespan?: number;
  batteryReplacement?: number;
  // Project financial & stochastic parameters
  inflation?: number;
  laborCost?: number;
  landLeasingCost?: number;
  licensingCost?: number;
  otherCapex?: number;
  energyPrice?: number;
  seed?: number;
}

// Validated response envelope returned by `POST /run_simulation_post` (`SimulationResponseContract`)
export interface SimulationResponseEnvelope {
  readonly storagePath: string | null;
  readonly csvKeys: AnySimulationCsvKey[];
  readonly csvBundle: Partial<Record<DefaultCsvKey, string | null>>;
  readonly schemaVersion: ContractSchemaVersion;
  readonly runId?: number;
  readonly summaryKpis?: SimulationSummaryKPIs;
  readonly tier1Summaries?: Tier1SimulationSummaries;
}

// Validated response envelope returned by `GET /get_stored_simulation?userId=...&projectId=...&keys=...`
// Requires HTTP header: `Authorization: Bearer <Firebase ID Token matching userId>`
export interface StoredSimulationResponseEnvelope {
  readonly csvBundle: Partial<Record<AnySimulationCsvKey, string>>;
  readonly schemaVersion: ContractSchemaVersion;
}
