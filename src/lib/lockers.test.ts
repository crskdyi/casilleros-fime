import { afterEach, describe, expect, it, vi } from 'vitest'
import { API, getLockers, parseLockers, reserveLocker } from './lockers'

afterEach(() => vi.unstubAllGlobals())
const record = (id: number, edificio: number, en_uso = false) => ({
  id,
  edificio,
  en_uso,
})

describe('contrato de casilleros', () => {
  it('acepta los 324 registros de ambos edificios y sus extremos', () => {
    const data = [
      ...Array.from({ length: 100 }, (_, i) => record(5001 + i, 5)),
      ...Array.from({ length: 224 }, (_, i) => record(1001 + i, 1)),
    ]
    expect(parseLockers(data)).toEqual(data)
  })
  it('acepta respuestas parciales sin inventar registros', () => {
    expect(parseLockers([record(5100, 5), record(1224, 1)])).toHaveLength(2)
    expect(parseLockers([])).toEqual([])
  })
  it.each(
    [
      null,
      {},
      { lockers: [] },
      [null],
      [record(5000, 5)],
      [record(5101, 5)],
      [record(1000, 1)],
      [record(1225, 1)],
      [record(5001, 1)],
      [record(1001, 5)],
      [record(5001, 2)],
      [{ id: '5001', edificio: 5, en_uso: false }],
      [{ id: 5001, edificio: 5, en_uso: 0 }],
      [{ id: 5001.5, edificio: 5, en_uso: false }],
      [{ id: 5001, edificio: 5 }],
    ].map((data) => ({ data })),
  )('rechaza datos inválidos: $data', ({ data }) => {
    expect(() => parseLockers(data)).toThrow()
  })
  it('rechaza IDs duplicados', () => {
    expect(() =>
      parseLockers([record(5001, 5), record(5001, 5, true)]),
    ).toThrow(/duplicados/)
  })
})

describe('integración HTTP', () => {
  it('envía exactamente { id } para reservar', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    await reserveLocker(5001)
    expect(fetchMock).toHaveBeenCalledWith(
      `${API}/reserve`,
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 5001 }),
      }),
    )
  })
  it.each([400, 409, 500])('rechaza reservas HTTP %i', async (status) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status })),
    )
    await expect(reserveLocker(5001)).rejects.toThrow()
  })
  it('informa un error HTTP en consulta', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 503 })),
    )
    await expect(getLockers()).rejects.toThrow(/HTTP 503/)
  })
  it('informa JSON inválido', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>')))
    await expect(getLockers()).rejects.toThrow(/JSON inválida/)
  })
  it('informa un fallo de red', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    )
    await expect(getLockers()).rejects.toThrow(/conectar/)
  })
})
