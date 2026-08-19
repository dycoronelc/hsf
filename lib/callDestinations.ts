/** Destinos de llamado en Consola Staff (monitor / voz). */
export const CALL_DESTINATIONS = [
  'Ventanilla 1',
  'Ventanilla 2',
  'Ventanilla 3',
  'Ventanilla 4',
  'Ventanilla 5',
  'Triage',
  'Laboratorio',
  'Radiología',
] as const

export type CallDestination = (typeof CALL_DESTINATIONS)[number]

export function isCallDestination(value: string): value is CallDestination {
  return (CALL_DESTINATIONS as readonly string[]).includes(value)
}
