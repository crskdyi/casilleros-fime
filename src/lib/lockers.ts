export interface Locker {
  id: number
  edificio: 1 | 5
  en_uso: boolean
}
export const buildings = [
  {
    id: 5 as const,
    name: 'Edificio 5',
    total: 100,
    start: 5001,
    end: 5100,
    detail: 'Área de casilleros · Planta baja',
  },
  {
    id: 1 as const,
    name: 'Polideportivo',
    total: 224,
    start: 1001,
    end: 1224,
    detail: 'Área de casilleros · Polideportivo',
  },
]
export const API = 'https://elockers.onrender.com/api'

export function parseLockers(data: unknown): Locker[] {
  if (!Array.isArray(data))
    throw new Error(
      'La API devolvió un formato inesperado. Se esperaba una lista de casilleros.',
    )
  const ids = new Set<number>()
  return data.map((item: unknown) => {
    if (!item || typeof item !== 'object')
      throw new Error('La API devolvió un registro de casillero inválido.')
    const record = item as Record<string, unknown>
    const building = buildings.find((b) => b.id === record.edificio)
    if (
      !building ||
      typeof record.id !== 'number' ||
      !Number.isInteger(record.id) ||
      record.id < building.start ||
      record.id > building.end ||
      typeof record.en_uso !== 'boolean'
    ) {
      throw new Error(
        'La API devolvió un casillero con datos o rango de ID inválidos.',
      )
    }
    if (ids.has(record.id))
      throw new Error('La API devolvió IDs de casillero duplicados.')
    ids.add(record.id)
    return { id: record.id, edificio: building.id, en_uso: record.en_uso }
  })
}

export async function getLockers(): Promise<Locker[]> {
  let response: Response
  try {
    response = await fetch(`${API}/lockers`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(60000),
    })
  } catch {
    throw new Error(
      'No pudimos conectar con el servicio de casilleros. Comprueba tu conexión y vuelve a intentar.',
    )
  }
  if (!response.ok)
    throw new Error(
      `No pudimos consultar la disponibilidad (HTTP ${response.status}). Vuelve a intentar.`,
    )
  let data: unknown
  try {
    data = await response.json()
  } catch {
    throw new Error(
      'El servicio devolvió una respuesta JSON inválida. Vuelve a intentar.',
    )
  }
  return parseLockers(data)
}

export async function reserveLocker(id: number): Promise<void> {
  let response: Response
  try {
    response = await fetch(`${API}/reserve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
      signal: AbortSignal.timeout(60000),
    })
  } catch {
    throw new Error(
      'No pudimos confirmar la reserva. Tu selección se conserva; vuelve a intentar.',
    )
  }
  if (!response.ok) {
    if (response.status === 400 || response.status === 409)
      throw new Error(
        'No se pudo reservar: el casillero puede estar ocupado o ya no existir. Tu selección se conserva; consulta de nuevo la disponibilidad.',
      )
    throw new Error(
      `No pudimos confirmar la reserva (HTTP ${response.status}). Tu selección se conserva.`,
    )
  }
}
