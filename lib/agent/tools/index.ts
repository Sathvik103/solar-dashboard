import { calculateSolarOutputTool, CalculateSolarOutputSchema } from './calculateSolarOutput'
import { calculateSystemCostTool, CalculateSystemCostSchema } from './calculateSystemCost'
import { calculateSavingsTool, CalculateSavingsSchema } from './calculateSavings'
import { calculatePaybackTool, CalculatePaybackSchema } from './calculatePayback'
import { calculateROITool, CalculateROISchema } from './calculateROI'
import { getSolarProfileTool, GetSolarProfileSchema } from './getSolarProfile'
import { getTariffInformationTool, GetTariffInformationSchema } from './getTariffInformation'
import { compareSystemsTool, CompareSystemsSchema } from './compareSystems'
import { searchKnowledgeTool, SearchKnowledgeSchema } from './searchKnowledge'
import { createSolarPlanTool, CreateSolarPlanSchema } from './createSolarPlan'
import { getConsumptionHistoryTool, GetConsumptionHistorySchema } from './getConsumptionHistory'
import { getRegionalStatisticsTool, GetRegionalStatisticsSchema } from './getRegionalStatistics'
import { getMLPredictionsTool, GetMLPredictionsSchema } from './getMLPredictions'

export type AgentToolDefinition = {
  name: string
  description: string
  schema: any
  execute: (input: any) => Promise<any>
}

export const AGENT_TOOLS: Record<string, AgentToolDefinition> = {
  searchKnowledge: {
    name: 'searchKnowledge',
    description: 'Searches authoritative Telangana solar regulations, TGERC rules, TGREDCO guidelines, and PM Surya Ghar subsidy policies.',
    schema: SearchKnowledgeSchema,
    execute: searchKnowledgeTool,
  },
  calculateSolarOutput: {
    name: 'calculateSolarOutput',
    description: 'Calculates monthly and annual solar generation in kWh for a given capacity (kW) and sunlight hours.',
    schema: CalculateSolarOutputSchema,
    execute: calculateSolarOutputTool,
  },
  calculateSystemCost: {
    name: 'calculateSystemCost',
    description: 'Calculates gross system cost, PM Surya Ghar subsidy, and net cost for a solar rooftop capacity.',
    schema: CalculateSystemCostSchema,
    execute: calculateSystemCostTool,
  },
  calculateSavings: {
    name: 'calculateSavings',
    description: 'Calculates monthly and annual electricity bill savings based on Telangana TSSPDCL slab tariffs.',
    schema: CalculateSavingsSchema,
    execute: calculateSavingsTool,
  },
  calculatePayback: {
    name: 'calculatePayback',
    description: 'Calculates simple and dynamic payback period in years for a solar investment.',
    schema: CalculatePaybackSchema,
    execute: calculatePaybackTool,
  },
  calculateROI: {
    name: 'calculateROI',
    description: 'Calculates 25-year Net Present Value (NPV), cumulative profit, and financial viability.',
    schema: CalculateROISchema,
    execute: calculateROITool,
  },
  getSolarProfile: {
    name: 'getSolarProfile',
    description: 'Retrieves the authenticated user solar profile (monthly usage, bill, roof area, location).',
    schema: GetSolarProfileSchema,
    execute: getSolarProfileTool,
  },
  getTariffInformation: {
    name: 'getTariffInformation',
    description: 'Retrieves Telangana electricity tariff slab structure and net metering buyback rates.',
    schema: GetTariffInformationSchema,
    execute: getTariffInformationTool,
  },
  compareSystems: {
    name: 'compareSystems',
    description: 'Compares multiple solar system capacities (e.g. 2kW, 3kW, 5kW, 7kW, 10kW) with costs, generation, and payback.',
    schema: CompareSystemsSchema,
    execute: compareSystemsTool,
  },
  createSolarPlan: {
    name: 'createSolarPlan',
    description: 'Generates a full end-to-end solar proposal with recommended capacity, financial metrics, roadmap steps, and required documents.',
    schema: CreateSolarPlanSchema,
    execute: createSolarPlanTool,
  },
  getConsumptionHistory: {
    name: 'getConsumptionHistory',
    description: "Summarises the signed-in user's recorded monthly electricity bills (never invented; reports when none exist).",
    schema: GetConsumptionHistorySchema,
    execute: getConsumptionHistoryTool,
  },
  getRegionalStatistics: {
    name: 'getRegionalStatistics',
    description: 'Measured monthly solar irradiance and temperature (ERA5) for a Telangana district, plus curated regional statistics when available.',
    schema: GetRegionalStatisticsSchema,
    execute: getRegionalStatisticsTool,
  },
  getMLPredictions: {
    name: 'getMLPredictions',
    description: 'Reads forecasts produced by the external ML pipeline for the signed-in user; reports when none exist.',
    schema: GetMLPredictionsSchema,
    execute: getMLPredictionsTool,
  },
}
