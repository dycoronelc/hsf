import { AgentState } from './enums';

/** Estados en los que el agente puede llamar o recibir asignación de tickets. */
export function isAgentOperational(agentState: AgentState | null | undefined): boolean {
  return agentState === AgentState.EN_LINEA || agentState === AgentState.MANUAL;
}
