import { AGENT_TOOLS } from './tools'
import type { ToolExecutionRecord } from './types'

const MAX_AGENT_STEPS = 6

/**
 * Safely executes a list of scheduled agent tools.
 */
export async function executeAgentTools(
  toolsToRun: { toolName: string; params: Record<string, any> }[]
): Promise<ToolExecutionRecord[]> {
  const records: ToolExecutionRecord[] = []
  const stepsToExecute = toolsToRun.slice(0, MAX_AGENT_STEPS)

  for (const item of stepsToExecute) {
    const toolDef = AGENT_TOOLS[item.toolName]
    if (!toolDef) {
      records.push({
        tool: item.toolName,
        input: item.params,
        output: { error: `Tool ${item.toolName} not found in agent registry.` },
        durationMs: 0,
        success: false,
      })
      continue
    }

    const startTime = Date.now()
    try {
      const parsedInput = toolDef.schema ? toolDef.schema.parse(item.params) : item.params
      const result = await toolDef.execute(parsedInput)
      const durationMs = Date.now() - startTime

      records.push({
        tool: item.toolName,
        input: parsedInput,
        output: result,
        durationMs,
        success: true,
      })
    } catch (err: any) {
      records.push({
        tool: item.toolName,
        input: item.params,
        output: { error: err.message || 'Tool execution error' },
        durationMs: Date.now() - startTime,
        success: false,
      })
    }
  }

  return records
}
