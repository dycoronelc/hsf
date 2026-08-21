const OPERATIONAL_STATES = new Set(['en_linea', 'manual'])

/** Estados en los que se puede elegir destino del llamado en Consola Staff. */
export const DESTINATION_UNLOCK_STATES = new Set([
  'en_linea',
  'manual',
  'fuera_de_linea',
])

export function isAgentOperational(agentState?: string | null): boolean {
  if (!agentState) return false
  return OPERATIONAL_STATES.has(agentState)
}

export function canSelectCallDestination(agentState?: string | null): boolean {
  if (!agentState) return false
  return DESTINATION_UNLOCK_STATES.has(agentState)
}
