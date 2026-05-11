const OPERATIONAL_STATES = new Set(['en_linea', 'manual'])

export function isAgentOperational(agentState?: string | null): boolean {
  if (!agentState) return true
  return OPERATIONAL_STATES.has(agentState)
}
