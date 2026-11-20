import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { API } from '@/lib/lockers'

export const Route = createFileRoute('/locker/claim')({
  component: ClaimPage,
})

function ClaimPage() {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  async function confirmClaim() {
    const token = new URLSearchParams(window.location.hash.slice(1)).get('token')

    if (!token) {
      setMessage('Este enlace no contiene un token válido. Escanea nuevamente el QR de tu reserva.')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const response = await fetch(`${API}/qr/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
        cache: 'no-store',
      })

      const data = (await response.json()) as {
        message?: string
        locker_id?: number
      }

      if (!response.ok) {
        throw new Error(data.message ?? 'No se pudo confirmar el QR.')
      }

      setConfirmed(true)
      setMessage(`QR confirmado para el casillero ${data.locker_id}.`)
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Ocurrió un error al confirmar el QR.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto max-w-lg p-8 text-center">
      <h1 className="text-2xl font-semibold">Confirmar reserva</h1>
      <p className="my-4">
        Escaneaste el código QR de una reserva. Pulsa para validar el casillero.
      </p>
      <button
        type="button"
        onClick={() => void confirmClaim()}
        disabled={loading || confirmed}
        className="rounded-md bg-primary px-4 py-2 font-semibold text-white disabled:opacity-50"
      >
        {loading ? 'Confirmando…' : confirmed ? 'QR confirmado' : 'Confirmar QR'}
      </button>
      {message && <p className="mt-4" role="status">{message}</p>}
      <a className="mt-6 inline-block underline" href="/">
        Volver al inicio
      </a>
    </main>
  )
}
