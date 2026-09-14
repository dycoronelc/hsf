/** Destinos de llamado en Consola Staff (monitor / voz). */
export const CALL_DESTINATIONS = [
  'Ventanilla 1',
  'Ventanilla 2',
  'Ventanilla 3',
  'Ventanilla 4',
  'Ventanilla 5',
  'Triage',
  'Toma de muestra',
  'Radiología',
] as const

export type CallDestination = (typeof CALL_DESTINATIONS)[number]

/** Destinos multi-puesto: permiten varios tickets llamados/en atención a la vez. */
export const MULTI_SLOT_CALL_DESTINATIONS = [
  'Toma de muestra',
  'Radiología',
  'Laboratorio', // legado
] as const

/** En Staff, estos destinos solo muestran / permiten llamar tickets transferidos. */
export const TRANSFER_ONLY_CALL_DESTINATIONS = MULTI_SLOT_CALL_DESTINATIONS

export function isCallDestination(value: string): value is CallDestination {
  return (CALL_DESTINATIONS as readonly string[]).includes(value)
}

export function isMultiSlotCallDestination(value: string): boolean {
  const dest = value.trim()
  return (MULTI_SLOT_CALL_DESTINATIONS as readonly string[]).includes(dest)
}

export function isTransferOnlyCallDestination(value: string): boolean {
  const dest = value.trim()
  return (TRANSFER_ONLY_CALL_DESTINATIONS as readonly string[]).includes(dest)
}
