import { InteractiveMap } from './interactive-map'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  DoorOpen,
  GraduationCap,
  Info,
  LockKeyhole,
  MapPin,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react'
import {
  buildings,
  getLockers,
  reserveLocker,
  type Locker,
} from '@/lib/lockers'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
export function LockerApp() {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [qrClaimUrl, setQrClaimUrl] = useState('')
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [buildingId, setBuildingId] = useState<1 | 5 | null>(null)
  const [lockers, setLockers] = useState<Locker[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<number | null>(null)
  const [onlyAvailable, setOnlyAvailable] = useState(false)
  const [reserving, setReserving] = useState(false)
  const [reserveError, setReserveError] = useState('')
  const [success, setSuccess] = useState<number | null>(null)
  const request = useRef(0)
  const building = buildings.find((b) => b.id === buildingId)
  const load = useCallback(async () => {
    const version = ++request.current
    setLoading(true)
    setError('')
    setLockers(null)
    try {
      const data = await getLockers()
      if (version !== request.current) return
      setLockers(data)
      setSelected((previous) =>
        data.some((l) => l.id === previous && !l.en_uso) ? previous : null,
      )
    } catch (e) {
      if (version === request.current) setError((e as Error).message)
    } finally {
      if (version === request.current) setLoading(false)
    }
  }, [])
  useEffect(() => {
    void load()
    return () => {
      request.current++
    }
  }, [load])
  const current = lockers?.filter((l) => l.edificio === buildingId) ?? []
  const available = current.filter((l) => !l.en_uso).length
  const byId = new Map(current.map((l) => [l.id, l]))
    async function reserve() {
    if (
      !building ||
      selected === null ||
      reserving ||
      loading ||
      !byId.has(selected) ||
      byId.get(selected)!.en_uso
    )
      return

    setReserving(true)
    setReserveError('')
    setSuccess(null)
    setQrDataUrl(null)
    setQrClaimUrl('')

    try {
      const result = await reserveLocker(selected)

      setQrDataUrl(result.qrDataUrl)
      setQrClaimUrl(result.claimUrl)
      setSuccess(selected)
      setSelected(null)
      setQrModalOpen(true)

      await load()
    } catch (e) {
      setReserveError((e as Error).message)
    } finally {
      setReserving(false)
    }
  }
  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="brand" href="/" aria-label="e-Lockers, inicio">
          <span className="brand-icon">
            <LockKeyhole size={23} strokeWidth={1.7} />
          </span>
          <span>
            e-Lockers<span className="brand-sub">FIME · UANL</span>
          </span>
        </a>
        <nav aria-label="Navegación principal">
          <a className="nav-active" href="#reservar">
            Reservar casillero
          </a>
        </nav>
        <span className="university">
          <GraduationCap size={21} />
          <span>
            Hecho para la
            <br />
            <strong>comunidad FIME</strong>
          </span>
        </span>
      </header>
      <main id="reservar" className="main-content">
        <div className="workspace">
          <section className="map-card" aria-labelledby="map-title">
            <div className="map-top">
              <div className="section-label">
                01 <span>ENCUENTRA TU ESPACIO</span>
              </div>
              <div className="map-breadcrumb">
                <button
                  disabled={reserving || !building}
                  onClick={() => {
                    setBuildingId(null)
                    setSelected(null)
                    setReserveError('')
                  }}
                >
                  <MapPin size={15} /> Vista general
                </button>
                {building && (
                  <span>/ {building?.name ?? 'Selecciona un edificio'}</span>
                )}
              </div>
            </div>
            <div className="map-heading">
              <div>
                <h2 id="map-title">{building?.name ?? 'Elige una zona'}</h2>
                <p>
                  <MapPin size={13} />
                  {building?.detail ??
                    'Haz clic en un edificio para ver sus casilleros'}
                </p>
              </div>
              <div className="availability">
                <span />
                {loading
                  ? 'Consultando…'
                  : lockers
                    ? `${building ? available : lockers.filter((l) => !l.en_uso).length} disponibles`
                    : 'Sin disponibilidad verificada'}
              </div>
            </div>
            {building && (
              <div className="map-toolbar">
                <div className="legend">
                  <span>
                    <i className="available-dot" />
                    Disponible
                  </span>
                  <span>
                    <i className="occupied-dot" />
                    Ocupado
                  </span>
                  <span>
                    <i className="selected-dot" />
                    Seleccionado
                  </span>
                </div>
                <label className="filter">
                  <input
                    type="checkbox"
                    checked={onlyAvailable}
                    onChange={(e) => setOnlyAvailable(e.target.checked)}
                  />
                  <span className="switch" />
                  Solo disponibles
                </label>
              </div>
            )}
            <div className="map-content" aria-busy={loading}>
              {loading ? (
                <div className="loading-state" role="status">
                  <div className="skeleton-map">
                    {Array.from({ length: 40 }, (_, i) => (
                      <i key={i} />
                    ))}
                  </div>
                  <strong>Consultando casilleros…</strong>
                  <p>El servicio puede tardar un momento en responder.</p>
                </div>
              ) : error ? (
                <div className="empty-state" role="alert">
                  <Info size={30} />
                  <h3>No pudimos cargar el mapa</h3>
                  <p>{error}</p>
                  <button
                    className="secondary-button"
                    onClick={() => void load()}
                  >
                    <RotateCcw size={15} />
                    Reintentar
                  </button>
                </div>
              ) : !building ? (
                <InteractiveMap
                  key="overview"
                  label="Mapa general de edificios"
                >
                  <div className="campus-map">
                    <span className="campus-map-label">
                      FIME · ZONAS DE CASILLEROS
                    </span>
                    <div className="campus-path" aria-hidden="true" />
                    {buildings.map((b) => (
                      <button
                        key={b.id}
                        className={`campus-zone zone-${b.id}`}
                        aria-label={`Ver casilleros de ${b.name}`}
                        disabled={reserving}
                        onClick={() => {
                          setBuildingId(b.id)
                          setSelected(null)
                          setReserveError('')
                        }}
                      >
                        <Building2 size={30} strokeWidth={1.4} />
                        <strong>{b.name}</strong>
                        <span>{b.total} casilleros</span>
                        <small>
                          {
                            lockers?.filter(
                              (l) => l.edificio === b.id && !l.en_uso,
                            ).length
                          }{' '}
                          disponibles
                        </small>
                        <span className="zone-enter">
                          Ver casilleros <ArrowRight size={14} />
                        </span>
                      </button>
                    ))}
                    <span className="campus-map-caption">
                      Selecciona una zona para entrar
                    </span>
                  </div>
                </InteractiveMap>
              ) : (
                <InteractiveMap
                  key={building.id}
                  width={(building.total / 4) * 45 + 90}
                  label={`Mapa de casilleros de ${building?.name ?? 'Selecciona un edificio'}`}
                >
                  <div
                    className={`floor-plan ${buildingId === 1 ? 'sports-plan' : ''}`}
                  >
                    <div className="floor-caption">
                      <span>
                        {buildingId === 5
                          ? 'EDIFICIO 5 / PLANTA BAJA'
                          : 'POLIDEPORTIVO / CASILLEROS'}
                      </span>
                      <span>N ↑</span>
                    </div>
                    <div className="floor-inner">
                      <div className="corridor">
                        <span>ÁREA DE CASILLEROS</span>
                        <span>↓</span>
                      </div>
                      <div
                        className="locker-grid"
                        style={{
                          gridTemplateRows: 'repeat(4, auto)',
                          gridTemplateColumns: `repeat(${building.total / 4}, minmax(40px, 1fr))`,
                        }}
                        aria-label={`Casilleros de ${building?.name ?? 'Selecciona un edificio'}`}
                      >
                        {Array.from({ length: building.total }, (_, index) => {
                          const id = building.start + index
                          const locker = byId.get(id)
                          if (!locker)
                            return (
                              <span
                                className="locker unknown"
                                key={id}
                                title={`${id}: sin datos`}
                              >
                                <span>{id}</span>
                                <small>—</small>
                              </span>
                            )
                          const occupied = locker.en_uso
                          return (
                            <button
                              type="button"
                              key={id}
                              className={`locker ${occupied ? 'occupied' : 'available'} ${selected === id ? 'selected' : ''} ${onlyAvailable && occupied ? 'filtered' : ''}`}
                              disabled={occupied || reserving}
                              aria-pressed={selected === id}
                              aria-label={`Casillero ${id}, ${occupied ? 'ocupado' : 'disponible'}`}
                              onClick={() => {
                                setSelected(id)
                                setReserveError('')
                                setSuccess(null)
                              }}
                            >
                              <span>{id}</span>
                              {selected === id ? (
                                <Check size={12} />
                              ) : (
                                <span className="locker-slot" />
                              )}
                            </button>
                          )
                        })}
                      </div>
                      <div className="entrance">
                        <DoorOpen size={15} /> ACCESO <ArrowDown size={13} />
                      </div>
                    </div>
                  </div>
                </InteractiveMap>
              )}
            </div>
            <div className="map-bottom">
              <p>
                <Info size={14} />
                Mapa esquemático · No es un plano oficial
                {lockers && building && current.length < building.total
                  ? ' · Los espacios sin datos no se pueden reservar.'
                  : ''}
              </p>
            </div>
          </section>
          <aside className="selection-column">
            <section className="selection-card">
              <div className="section-label">
                02 <span>TU SELECCIÓN</span>
              </div>
              <h2>Reserva tu casillero</h2>
              <div
                className={`selection-preview ${selected ? 'has-selection' : ''}`}
              >
                <div className="locker-illustration">
                  <div />
                  <span />
                  <i />
                  <b />
                </div>
                <strong>
                  {selected ? `Casillero ${selected}` : 'Elige tu casillero'}
                </strong>
                <p>
                  {selected
                    ? 'Este espacio está disponible para reservar.'
                    : building
                      ? 'Selecciona un espacio disponible en el mapa para continuar.'
                      : 'Haz clic en un edificio del mapa para ver sus casilleros.'}
                </p>
                {selected && (
                  <span className="selection-badge">
                    <span />
                    {building?.name ?? 'Selecciona un edificio'}
                  </span>
                )}
              </div>
              <dl className="selection-details">
                <div>
                  <dt>Ubicación</dt>
                  <dd>{building?.name ?? 'Selecciona un edificio'}</dd>
                </div>
                <div>
                  <dt>Casillero</dt>
                  <dd>{selected ? `#${selected}` : 'Sin seleccionar'}</dd>
                </div>
              </dl>
              <button
                className="reserve-button"
                disabled={selected === null || reserving || loading || !lockers}
                onClick={() => void reserve()}
              >
                {reserving ? 'Confirmando reserva…' : 'Confirmar reserva'}
                <ArrowRight size={18} />
              </button>
              <p className="secure-caption">
                <ShieldCheck size={13} />
                Confirmación directa con el servidor
              </p>
              {reserveError && (
                <div className="feedback error" role="alert">
                  {reserveError}
                  <button
                    className="secondary-button"
                    disabled={loading || reserving}
                    onClick={() => {
                      setReserveError('')
                      void load()
                    }}
                  >
                    <RotateCcw size={14} />
                    Actualizar disponibilidad
                  </button>
                </div>
              )}
              {success !== null && (
                <div className="feedback success" role="status">
                  <CheckCircle2 size={20} />
                  <span>
                    ¡Reserva confirmada! El casillero {success} ya está
                    reservado.
                    {error
                      ? ' No pudimos actualizar el mapa; pulsa Reintentar.'
                      : ''}
                  </span>
                </div>
              )}
            </section>
            <p className="campus-note">
              <MapPin size={14} />
              Ciudad Universitaria · San Nicolás, N.L.
            </p>
          </aside>
        </div>
        <div className="bottom-note">
          <ShieldCheck size={18} />
          <p>
            Disponibilidad consultada en tiempo real.
            <span> La reserva está sujeta a la confirmación del servidor.</span>
          </p>
        </div>
      </main>
      <footer>
        <a className="footer-brand" href="/">
          e-Lockers <span>/ FIME UANL</span>
        </a>
        <p>Más espacio para tu vida universitaria.</p>
        <span>Universidad Autónoma de Nuevo León</span>
      </footer>
    </div>
  )
}
