import { expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InteractiveMap } from './interactive-map'

it('acerca con la rueda alrededor del cursor, respeta límites y restablece la posición', async () => {
  render(
    <InteractiveMap width={1200} label="Mapa de prueba">
      <button>Casillero</button>
    </InteractiveMap>,
  )
  const viewport = screen.getByRole('region', { name: 'Mapa de prueba' })
  viewport.scrollLeft = 100
  viewport.scrollTop = 20
  fireEvent.wheel(viewport, { deltaY: -100, clientX: 200, clientY: 100 })
  expect(screen.getByText('122%')).toBeInTheDocument()
  expect(viewport.scrollLeft).toBeCloseTo(300 * Math.exp(0.2) - 200)
  expect(viewport.scrollTop).toBeCloseTo(120 * Math.exp(0.2) - 100)
  fireEvent.wheel(viewport, { deltaY: -10000 })
  expect(screen.getByText('200%')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Acercar mapa' })).toBeDisabled()
  fireEvent.wheel(viewport, { deltaY: 10000 })
  expect(screen.getByText('100%')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Alejar mapa' })).toBeDisabled()
  await userEvent.click(screen.getByRole('button', { name: 'Acercar mapa' }))
  expect(screen.getByText('125%')).toBeInTheDocument()
  await userEvent.click(
    screen.getByRole('button', { name: 'Restablecer vista' }),
  )
  expect(screen.getByText('100%')).toBeInTheDocument()
  expect(viewport.scrollLeft).toBe(0)
  expect(viewport.scrollTop).toBe(0)
})

it('arrastra desde un casillero sin activarlo y permite seleccionar después con ratón o teclado', async () => {
  const select = vi.fn()
  render(
    <InteractiveMap width={1200} label="Mapa de prueba">
      <button onClick={select}>Casillero</button>
    </InteractiveMap>,
  )
  const viewport = screen.getByRole('region', { name: 'Mapa de prueba' })
  const locker = screen.getByRole('button', { name: 'Casillero' })
  viewport.scrollLeft = 200
  fireEvent.mouseDown(locker, { button: 0, clientX: 150, clientY: 100 })
  fireEvent.mouseMove(window, { clientX: 100, clientY: 80 })
  expect(viewport.scrollLeft).toBe(250)
  expect(viewport.scrollTop).toBe(20)
  fireEvent.mouseUp(window)
  fireEvent.click(locker, { detail: 1 })
  expect(select).not.toHaveBeenCalled()
  locker.focus()
  await userEvent.keyboard('{Enter}')
  expect(select).toHaveBeenCalledTimes(1)
  await userEvent.click(locker)
  expect(select).toHaveBeenCalledTimes(2)
})
