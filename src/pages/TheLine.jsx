import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import Sidebar from '../components/Sidebar'
import DiagnosticModal from '../components/DiagnosticModal'

const STAGES = [
  { id: 'STG-01', label: 'WAFER_IN',    icon: 'conveyor_belt', status: 'ok',    yield: 98.1 },
  { id: 'STG-02', label: 'BUMPING',     icon: 'scatter_plot',  status: 'ok',    yield: 97.4 },
  { id: 'STG-03', label: 'INTERPOSER',  icon: 'layers',        status: 'ok',    yield: 96.8 },
  { id: 'STG-04', label: 'COW_BONDING', icon: 'join_inner',    status: 'error', yield: 84.2 },
  { id: 'STG-05', label: 'UNDERFILL',   icon: 'water_drop',    status: 'ok',    yield: 96.1 },
  { id: 'STG-06', label: 'WOS_ATTACH',  icon: 'memory',        status: 'ok',    yield: 95.5 },
  { id: 'STG-07', label: 'REFLOW',      icon: 'mode_heat',     status: 'warn',  yield: 95.1 },
  { id: 'STG-08', label: 'FINAL_TEST',  icon: 'fact_check',    status: 'ok',    yield: 97.0 },
]

const TERMINAL = {
  'STG-04': [
    { type: 'cmd',  text: 'connecting · erp.coWoS.local' },
    { type: 'ok',   text: 'handshake ✓ — auth via mTLS' },
    { type: 'cmd',  text: 'reading thermal logs / zone-4' },
    { type: 'err',  text: 'WARN · temp anomaly @ heater_block_B' },
    { type: 'sub',  text: 'Δ +2.4°C  threshold ±1.5°C  duration 38s' },
    { type: 'ai',   text: 'Hugo: auto-calibration queued · ETA 45s' },
  ],
  'STG-07': [
    { type: 'cmd',  text: 'reflow profile · sampling 200ms' },
    { type: 'warn', text: 'temp variation ±0.8°C — monitor' },
    { type: 'sub',  text: 'within tolerance — soft warning only' },
  ],
  default: [
    { type: 'cmd', text: 'stage diagnostic · all parameters nominal' },
    { type: 'ok',  text: 'throughput 99.1% · defect rate 0.04%' },
    { type: 'ai',  text: 'Hugo: no action required' },
  ],
}

const TERM_COLOR = {
  cmd: 'text-text-dim', ok: 'text-ok', err: 'text-danger',
  warn: 'text-amber',   sub: 'text-text-muted', ai: 'text-cyan',
}

function useFleet() {
  const [y, setY] = useState(94.2)
  useEffect(() => {
    const id = setInterval(() => {
      setY(v => +Math.min(99.9, Math.max(90, v + (Math.random() - 0.52) * 0.08)).toFixed(1))
    }, 2400)
    return () => clearInterval(id)
  }, [])
  return y
}

function StageNode({ stage, isSelected, onClick, idx }) {
  const isError = stage.status === 'error'
  const isWarn  = stage.status === 'warn'

  return (
    <button
      onClick={onClick}
      aria-pressed={isSelected}
      className={`group relative flex flex-col gap-2 text-left p-4 transition-all duration-200 hairline bg-surface
        ${isSelected ? '!border-cyan shadow-md' : 'hover:hairline-strong hover:shadow-sm'}
        ${isError ? '!border-danger' : ''}`}
    >
      {isError && <span className="absolute -top-1 -right-1 w-2 h-2 bg-danger animate-ping2" />}
      {isError && <span className="absolute -top-1 -right-1 w-2 h-2 bg-danger" />}

      <div className="flex items-center justify-between">
        <span className="font-mono text-eyebrow text-text-muted">{idx}</span>
        <span className={`font-mono text-eyebrow tabular-nums
          ${isError ? 'text-danger' : isWarn ? 'text-amber' : 'text-text-muted'}`}>
          {stage.id}
        </span>
      </div>

      <span className={`material-symbols-outlined text-[24px]
        ${isError ? 'text-danger' : isWarn ? 'text-amber' : 'text-text-dim group-hover:text-cyan'}`}
        aria-hidden="true">
        {stage.icon}
      </span>

      <div className="font-display text-[15px] tracking-[-0.015em] leading-tight">
        {stage.label.toLowerCase().replace('_', ' ')}
      </div>

      <div className="mt-1 flex items-baseline justify-between">
        <span className="font-mono text-mono-xs tabular-nums text-text-dim">
          {stage.yield.toFixed(1)}<span className="text-text-muted">%</span>
        </span>
        <span className={`font-mono text-eyebrow uppercase
          ${isError ? 'text-danger' : isWarn ? 'text-amber' : 'text-ok'}`}>
          {isError ? 'critical' : isWarn ? 'warning' : 'nominal'}
        </span>
      </div>

      <div className="h-px w-full bg-rule overflow-hidden">
        <div
          className={`h-full transition-all duration-700
            ${isError ? 'bg-danger' : isWarn ? 'bg-amber' : 'bg-ok'}`}
          style={{ width: `${stage.yield}%` }}
        />
      </div>
    </button>
  )
}

export default function TheLine() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState('STG-04')
  const [showModal, setShowModal] = useState(false)
  const fleetYield = useFleet()
  const stage = STAGES.find(s => s.id === selected)
  const term = TERMINAL[selected] ?? TERMINAL.default
  const errorCount = STAGES.filter(s => s.status === 'error').length
  const warnCount  = STAGES.filter(s => s.status === 'warn').length

  return (
    <div className="min-h-screen bg-bg text-text font-sans">
      <TopBar onDiagnostic={() => setShowModal(true)} />

      <div className="flex pt-16 h-screen">
        <Sidebar />

        <main className="flex-1 overflow-y-auto scrollbar-thin relative micro-grid">
          <div className="max-w-[1480px] mx-auto px-10 py-12">

            <header className="grid grid-cols-12 gap-8 mb-12">
              <div className="col-span-12 lg:col-span-8">
                <div className="font-mono text-eyebrow text-cyan mb-6 flex items-center gap-3">
                  <span className="w-8 h-px bg-cyan" />
                  LIVE · 2026.05.09
                </div>
                <h1 className="font-display text-h-lg text-balance leading-[0.9]">
                  Eight stages.<br />
                  <span className="text-text-muted">One </span>
                  <span className="italic text-cyan">silent</span>
                  <span className="text-text-muted"> defect.</span>
                </h1>
                <p className="mt-6 max-w-xl text-text-dim text-lead font-light">
                  Every wafer through CoWoS-Station-A42 lands here.
                  Hugo correlates 1.4M telemetry points / sec to surface failure
                  modes before yield slips.
                </p>
              </div>

              <div className="col-span-12 lg:col-span-4 relative grain glass corner-ticks p-7">
                <span className="tick-tr" /><span className="tick-bl" />
                <div className="flex items-center justify-between">
                  <span className="font-mono text-eyebrow text-text-muted">FLEET · YIELD</span>
                  <span className="font-mono text-mono-xs text-cyan blink">● LIVE</span>
                </div>
                <div className="mt-5 flex items-baseline gap-2">
                  <span className="font-display text-metric tabular-nums text-text">{fleetYield}</span>
                  <span className="font-display text-h-sm text-text-muted">%</span>
                </div>
                <div className="mt-1 font-mono text-mono-xs text-text-muted">
                  rolling · 24h window
                </div>

                <div className="mt-6 grid grid-cols-3 gap-4 pt-5 border-t border-rule">
                  <div>
                    <div className="font-mono text-eyebrow text-text-muted mb-1">NODES</div>
                    <div className="font-mono text-data text-text tabular-nums">1,024</div>
                  </div>
                  <div>
                    <div className="font-mono text-eyebrow text-text-muted mb-1">WARN</div>
                    <div className="font-mono text-data text-amber tabular-nums">{warnCount}</div>
                  </div>
                  <div>
                    <div className="font-mono text-eyebrow text-text-muted mb-1">FAIL</div>
                    <div className="font-mono text-data text-danger tabular-nums">{errorCount}</div>
                  </div>
                </div>
              </div>
            </header>

            <div className="flex items-center gap-4 mb-6">
              <span className="font-mono text-eyebrow text-text-muted">/ STAGE MAP</span>
              <div className="flex-1 h-px bg-rule" />
              <span className="font-mono text-mono-xs text-text-muted">
                {STAGES.length} stations · click to inspect
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-12">
              {STAGES.map((s, i) => (
                <StageNode
                  key={s.id}
                  stage={s}
                  idx={String(i + 1).padStart(2, '0')}
                  isSelected={selected === s.id}
                  onClick={() => setSelected(s.id)}
                />
              ))}
            </div>

            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-12 lg:col-span-7 relative bg-surface hairline-strong">
                <div className="flex items-center justify-between px-5 py-3 border-b border-rule bg-surface-2/40">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-cyan text-[16px]" aria-hidden="true">terminal</span>
                    <span className="font-mono text-mono-xs uppercase tracking-[0.18em] text-text-dim">
                      inspector / {stage.id} · {stage.label.toLowerCase()}
                    </span>
                  </div>
                  <span className={`font-mono text-mono-xs
                    ${stage.status === 'error' ? 'text-danger' : stage.status === 'warn' ? 'text-amber' : 'text-ok'}`}>
                    {stage.status === 'error' ? 'A247293C3' : stage.status === 'warn' ? 'observing' : 'nominal'}
                  </span>
                </div>
                <div className="px-5 py-4 font-mono text-mono-sm space-y-1.5 min-h-[200px]" role="log" aria-live="polite">
                  {term.map((m, i) => (
                    <div key={i} className={`flex gap-2 animate-rise ${TERM_COLOR[m.type]}`}>
                      <span className="text-text-muted shrink-0" aria-hidden="true">{m.type === 'sub' ? ' ' : '›'}</span>
                      <span>{m.text}</span>
                    </div>
                  ))}
                  <div className="flex gap-2 pt-1">
                    <span className="text-text-muted">›</span>
                    <span className="bg-cyan text-white px-1 animate-flicker">█</span>
                  </div>
                </div>
              </div>

              <div className="col-span-12 lg:col-span-5 flex flex-col gap-4">
                <div className="bg-surface hairline p-6">
                  <div className="font-mono text-eyebrow text-text-muted mb-3">CURRENT STAGE</div>
                  <div className="font-display text-h-sm tracking-[-0.025em]">
                    {stage.label.toLowerCase().replace('_', ' ')}
                  </div>
                  <div className="mt-1 font-mono text-mono-sm text-text-muted">{stage.id} · yield {stage.yield}%</div>

                  <div className="mt-5 grid grid-cols-3 divide-x divide-rule border-t border-rule pt-5">
                    <div className="pr-3">
                      <div className="font-mono text-eyebrow text-text-muted">RPN</div>
                      <div className={`font-display text-[24px] mt-1 ${stage.status === 'error' ? 'text-danger' : 'text-text-dim'}`}>
                        {stage.status === 'error' ? '187' : '—'}
                      </div>
                    </div>
                    <div className="px-3">
                      <div className="font-mono text-eyebrow text-text-muted">MTBF</div>
                      <div className="font-display text-[24px] mt-1 text-text">412h</div>
                    </div>
                    <div className="pl-3">
                      <div className="font-mono text-eyebrow text-text-muted">EVENTS</div>
                      <div className="font-display text-[24px] mt-1 text-text tabular-nums">{term.length}</div>
                    </div>
                  </div>
                </div>

                {stage.status === 'error' ? (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => navigate('/defect')}
                      className="group bg-surface hairline-strong px-5 py-4 text-left flex flex-col gap-2 hover:bg-surface-2 transition-colors"
                    >
                      <span className="font-mono text-eyebrow text-danger">02 · DEFECT</span>
                      <span className="font-display text-[18px] tracking-[-0.02em]">View root cause</span>
                      <span className="font-mono text-mono-xs text-text-muted group-hover:text-cyan">A247293C3 →</span>
                    </button>
                    <button
                      onClick={() => navigate('/fix')}
                      className="group bg-cyan text-white px-5 py-4 text-left flex flex-col gap-2 hover:bg-cyan-deep transition-colors"
                    >
                      <span className="font-mono text-eyebrow opacity-80">03 · RESOLUTION</span>
                      <span className="font-display text-[18px] tracking-[-0.02em]">Fix protocol</span>
                      <span className="font-mono text-mono-xs">RPN 187 → 42 →</span>
                    </button>
                  </div>
                ) : (
                  <div className="bg-surface hairline p-6 flex items-center gap-4">
                    <span className="material-symbols-outlined text-ok" aria-hidden="true">verified</span>
                    <div className="flex-1">
                      <div className="font-display text-[16px]">No corrective action</div>
                      <div className="font-mono text-mono-xs text-text-muted mt-1">
                        Stage operating within tolerance.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-16 font-mono text-mono-xs text-text-muted leading-[1.4] select-none whitespace-pre overflow-hidden opacity-70">
{`▓▓░░  loopback · cowos-l · operator_01  ░░▓▓ ─── streaming ${(fleetYield * 1.4 | 0).toLocaleString()} events/s · region tpe-n3 · build 2.4.1
░░▓▓  ─────────────────────────────────────────────────────────────────────  ▓▓░░`}
            </div>

          </div>
        </main>
      </div>

      {showModal && <DiagnosticModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
