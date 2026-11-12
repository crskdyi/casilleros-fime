import { afterEach, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LockerApp } from './locker-app'
import { API } from '@/lib/lockers'

const data = [
  { id: 5001, edificio: 5, en_uso: false },
  { id: 5002, edificio: 5, en_uso: true },
  { id: 1001, edificio: 1, en_uso: false },
]
const json = (value: unknown) =>
  new Response(JSON.stringify(value), {
    headers: { 'Content-Type': 'application/json' },
  })
afterEach(() => vi.unstubAllGlobals())

async function enterBuilding(name = 'Edificio 5') {
  await userEvent.click(
    await screen.findByRole('button', { name: `Ver casilleros de ${name}` }),
  )
}

it('muestra el error de API sin presentar casilleros ficticios y permite reintentar', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(new Response(null, { status: 503 }))
    .mockResolvedValueOnce(json(data))
  vi.stubGlobal('fetch', fetchMock)
  render(<LockerApp />)
  expect(await screen.findByRole('alert')).toHaveTextContent('HTTP 503')
  expect(
    screen.queryByRole('button', { name: /Casillero 5001/ }),
  ).not.toBeInTheDocument()
  expect(screen.queryByText(/\d+ disponibles/)).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
  await enterBuilding()
  expect(
    await screen.findByRole('button', { name: 'Casillero 5001, disponible' }),
  ).toBeEnabled()
})

it('no muestra disponibilidad cuando la respuesta tiene formato inesperado', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(json({ error: 'unexpected' })),
  )
  render(<LockerApp />)
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'formato inesperado',
  )
  expect(
    screen.queryByRole('button', { name: /Casillero 5001/ }),
  ).not.toBeInTheDocument()
})

it('selecciona disponibles con ratón, Enter y Espacio, y bloquea ocupados', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(data)))
  const user = userEvent.setup()
  render(<LockerApp />)
  await enterBuilding()
  const available = await screen.findByRole('button', {
    name: 'Casillero 5001, disponible',
  })
  const occupied = screen.getByRole('button', {
    name: 'Casillero 5002, ocupado',
  })
  expect(occupied).toBeDisabled()
  await user.click(occupied)
  expect(
    screen.getByRole('button', { name: 'Confirmar reserva' }),
  ).toBeDisabled()
  available.focus()
  await user.keyboard('{Enter}')
  expect(available).toHaveAttribute('aria-pressed', 'true')
  await user.keyboard(' ')
  expect(available).toHaveAttribute('aria-pressed', 'true')
  await user.click(available)
  expect(
    screen.getByRole('button', { name: 'Confirmar reserva' }),
  ).toBeEnabled()
})

it('cambia edificio, mapa y conteo, y limpia la selección', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(data)))
  render(<LockerApp />)
  await enterBuilding()
  await userEvent.click(
    await screen.findByRole('button', { name: 'Casillero 5001, disponible' }),
  )
  await userEvent.click(screen.getByRole('button', { name: 'Vista general' }))
  await enterBuilding('Polideportivo')
  expect(
    screen.getByRole('heading', { name: 'Polideportivo' }),
  ).toBeInTheDocument()
  expect(
    screen.getByRole('button', { name: 'Casillero 1001, disponible' }),
  ).toBeEnabled()
  expect(
    screen.queryByRole('button', { name: /Casillero 5001/ }),
  ).not.toBeInTheDocument()
  expect(screen.getByText('1 disponibles')).toBeInTheDocument()
  expect(
    screen.getByRole('button', { name: 'Confirmar reserva' }),
  ).toBeDisabled()
})

it('envía { id } y conserva la selección si la reserva falla con HTTP 400', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(json(data))
    .mockResolvedValueOnce(new Response(null, { status: 400 }))
  vi.stubGlobal('fetch', fetchMock)
  render(<LockerApp />)
  await enterBuilding()
  const available = await screen.findByRole('button', {
    name: 'Casillero 5001, disponible',
  })
  await userEvent.click(available)
  await userEvent.click(
    screen.getByRole('button', { name: 'Confirmar reserva' }),
  )
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Tu selección se conserva',
  )
  expect(available).toHaveAttribute('aria-pressed', 'true')
  expect(
    screen.getByRole('button', { name: 'Confirmar reserva' }),
  ).toBeEnabled()
  expect(fetchMock).toHaveBeenNthCalledWith(
    2,
    `${API}/reserve`,
    expect.objectContaining({ body: '{"id":5001}', method: 'POST' }),
  )
  expect(screen.queryByText(/¡Reserva confirmada!/)).not.toBeInTheDocument()
})

it('actualiza la disponibilidad después de una reserva HTTP exitosa', async () => {
  const updated = data.map((l) => (l.id === 5001 ? { ...l, en_uso: true } : l))
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(json(data))
    .mockResolvedValueOnce(new Response(null, { status: 204 }))
    .mockResolvedValueOnce(json(updated))
  vi.stubGlobal('fetch', fetchMock)
  render(<LockerApp />)
  await enterBuilding()
  await userEvent.click(
    await screen.findByRole('button', { name: 'Casillero 5001, disponible' }),
  )
  await userEvent.click(
    screen.getByRole('button', { name: 'Confirmar reserva' }),
  )
  expect(
    await screen.findByRole('button', { name: 'Casillero 5001, ocupado' }),
  ).toBeDisabled()
  expect(screen.getByText(/¡Reserva confirmada!/)).toBeInTheDocument()
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))
  expect(fetchMock).toHaveBeenNthCalledWith(
    3,
    `${API}/lockers`,
    expect.objectContaining({ cache: 'no-store' }),
  )
})

it('distingue una reserva confirmada de un fallo posterior al actualizar el mapa', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(json(data))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 503 })),
  )
  render(<LockerApp />)
  await enterBuilding()
  await userEvent.click(
    await screen.findByRole('button', { name: 'Casillero 5001, disponible' }),
  )
  await userEvent.click(
    screen.getByRole('button', { name: 'Confirmar reserva' }),
  )
  expect(await screen.findByRole('alert')).toHaveTextContent('HTTP 503')
  expect(screen.getByText(/¡Reserva confirmada!/)).toHaveTextContent(
    'No pudimos actualizar el mapa',
  )
  expect(
    screen.queryByRole('button', { name: /Casillero 5001/ }),
  ).not.toBeInTheDocument()
})

it('inicia en vista general y entra a zonas con un clic manteniendo cuatro filas y reiniciando la cámara', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(data)))
  const { container } = render(<LockerApp />)
  expect(
    await screen.findByRole('region', { name: 'Mapa general de edificios' }),
  ).toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: /Casillero 5001/ }),
  ).not.toBeInTheDocument()
  await enterBuilding()
  expect(container.querySelector('.locker-grid')).toHaveStyle({
    gridTemplateRows: 'repeat(4, auto)',
    gridTemplateColumns: 'repeat(25, minmax(40px, 1fr))',
  })
  await userEvent.click(screen.getByRole('button', { name: 'Acercar mapa' }))
  expect(screen.getByText('125%')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Vista general' }))
  expect(screen.getByText('100%')).toBeInTheDocument()
  await enterBuilding('Polideportivo')
  expect(container.querySelector('.locker-grid')).toHaveStyle({
    gridTemplateRows: 'repeat(4, auto)',
    gridTemplateColumns: 'repeat(56, minmax(40px, 1fr))',
  })
  expect(container.querySelectorAll('.locker')).toHaveLength(224)
  expect(screen.getByText('100%')).toBeInTheDocument()
})
