import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import Sidebar from '../components/Sidebar'
import DiagnosticModal from '../components/DiagnosticModal'

const HUGO_LINES = [
  { type: 'cmd', text: 'connecting · erp.coWoS.local' },
  { type: 'ok',  text: 'success · 12ms' },
  { type: 'cmd', text: 'reading inventory · subsystem A247293C3' },
  { type: 'ai',  text: 'Hugo: 3 late items detected.' },
  { type: 'cmd', text: 'analyzing thermal drift patterns…' },
  { type: 'ai',  text: 'Hugo: late items correlate with failure timeline.' },
  { type: 'cmd', text: 'thinking…' },
  { type: 'ai',  text: 'Hugo · action 01 — expedite suppliers immediately.' },
  { type: 'ai',  text: 'Hugo · action 02 — increase local safety stock by 5.' },
]

const TERM_COLOR = { cmd: 'text-text-dim', ok: 'text-ok', ai: 'text-cyan' }

function ReportModal({ onClose }) {
  const closeRef = useRef(null)
  useEffect(() => { closeRef.current?.focus() }, [])
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-ink/50 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-title"
    >
      <div className="relative w-[680px] max-w-[92vw] bg-surface hairline-strong corner-ticks shadow-2xl">
        <span className="tick-tr" /><span className="tick-bl" />

        <div className="flex items-center justify-between px-6 py-4 border-b border-rule">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-cyan text-[18px]" aria-hidden="true">description</span>
            <span id="report-title" className="font-mono text-mono-xs uppercase tracking-[0.18em] text-text-dim">
              FMECA report · A247293C3
            </span>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close report"
            className="material-symbols-outlined text-text-dim hover:text-cyan"
          >
            close
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <div className="font-mono text-eyebrow text-text-muted mb-2">SUMMARY</div>
            <h3 className="font-display text-h-sm tracking-[-0.025em]">
              Thermal overshoot at zone 4 · COW_BONDING.
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-px bg-rule">
            {[
              ['Failure Mode',   'Thermal Overshoot @ Zone 4'],
              ['Stage',          'STG-04 · COW_BONDING'],
              ['Severity (S)',   '8 / 10'],
              ['Occurrence (O)', '4 / 10'],
              ['Detection (D)',  '3 / 10'],
              ['Current RPN',    '187 — critical'],
              ['Projected RPN',  '42 — acceptable'],
              ['Cost Avoided',   '$24,500.00 USD'],
            ].map(([k, v]) => {
              const tone = k === 'Current RPN' ? 'text-danger' : k === 'Projected RPN' ? 'text-cyan' : 'text-text'
              return (
                <div key={k} className="bg-surface p-4">
                  <div className="font-mono text-eyebrow text-text-muted mb-1.5">{k.toUpperCase()}</div>
                  <div className={`font-mono text-data ${tone}`}>{v}</div>
                </div>
              )
            })}
          </div>
          <div className="hairline p-5">
            <div className="font-mono text-eyebrow text-text-muted mb-3">CORRECTIVE ACTIONS</div>
            <ol className="space-y-2 font-mono text-mono-sm text-text-dim">
              {[
                'Expedite 3 late supply items with suppliers',
                'Increase local safety stock by 5 units',
                'Recalibrate heater block B thermal profile',
                'Schedule 72h monitoring window post-fix',
              ].map((a, i) => (
                <li key={a} className="flex gap-3">
                  <span className="text-cyan tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                  <span>{a}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-rule bg-surface-2/40">
          <button
            onClick={onClose}
            className="px-4 py-2 hairline font-mono text-mono-xs uppercase tracking-[0.18em] text-text-dim hover:bg-surface-2"
          >
            Close
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-cyan text-white font-mono text-mono-xs uppercase tracking-[0.18em] hover:bg-cyan-deep"
          >
            Export PDF →
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TheFix() {
  const [showDiag, setShowDiag] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [n, setN] = useState(0)
  const [zoom, setZoom] = useState(1)
  const navigate = useNavigate()

  useEffect(() => {
    if (n >= HUGO_LINES.length) return
    const id = setTimeout(() => setN(v => v + 1), 700)
    return () => clearTimeout(id)
  }, [n])

  return (
    <div className="min-h-screen bg-bg text-text font-sans">
      <TopBar onDiagnostic={() => setShowDiag(true)} />

      <div className="flex pt-16 h-screen">
        <Sidebar />

        <main className="flex-1 overflow-y-auto scrollbar-thin micro-grid">
          <div className="max-w-[1480px] mx-auto px-10 py-12 space-y-12">

            <header className="grid grid-cols-12 gap-8">
              <div className="col-span-12 lg:col-span-7">
                <div className="font-mono text-eyebrow text-cyan mb-6 flex items-center gap-3">
                  <span className="w-8 h-px bg-cyan" />
                  RESOLUTION · REF-RES-992
                </div>
                <h1 className="font-display text-h-lg text-balance leading-[0.9]">
                  From <span className="text-danger">187</span>
                  <span className="text-text-muted"> to </span>
                  <span className="italic text-cyan">42</span>.
                </h1>
                <p className="mt-6 max-w-xl text-text-dim text-lead font-light">
                  Hugo's recommended corrective protocol drops Risk Priority below threshold
                  inside a four-hour predictive drift window — before scrap accumulates further.
                </p>
              </div>

              <div className="col-span-12 lg:col-span-5 relative grain glass corner-ticks p-7">
                <span className="tick-tr" /><span className="tick-bl" />
                <div className="flex items-center justify-between">
                  <span className="font-mono text-eyebrow text-cyan">COST · AVOIDED</span>
                  <span className="font-mono text-mono-xs text-cyan">+ projected</span>
                </div>
                <div className="mt-5 flex items-baseline gap-1 font-display tabular-nums">
                  <span className="text-text-muted text-h-sm leading-none">$</span>
                  <span className="text-metric leading-none text-text">24,500</span>
                  <span className="text-h-sm leading-none text-text-muted">.00</span>
                  <span className="ml-2 font-mono text-mono-xs text-text-muted">USD</span>
                </div>
                <div className="mt-6 grid grid-cols-3 gap-4 pt-5 border-t border-rule">
                  <div>
                    <div className="font-mono text-eyebrow text-text-muted mb-1">WINDOW</div>
                    <div className="font-mono text-data text-text">04:00:00</div>
                  </div>
                  <div>
                    <div className="font-mono text-eyebrow text-text-muted mb-1">CONF.</div>
                    <div className="font-mono text-data text-cyan">94%</div>
                  </div>
                  <div>
                    <div className="font-mono text-eyebrow text-text-muted mb-1">ETA</div>
                    <div className="font-mono text-data text-text">45s</div>
                  </div>
                </div>
              </div>
            </header>

            <section className="grid grid-cols-12 gap-6">
              <div className="col-span-12 lg:col-span-5 flex flex-col gap-6">
                <div className="bg-surface hairline-strong p-7">
                  <div className="font-mono text-eyebrow text-text-muted mb-5">RPN · DELTA</div>
                  <div className="flex items-center justify-between gap-6">
                    <div>
                      <div className="font-mono text-eyebrow text-text-muted mb-2">CURRENT</div>
                      <div className="font-display text-metric leading-none text-danger">187</div>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <span className="font-mono text-eyebrow text-text-muted">→</span>
                      <span className="material-symbols-outlined text-cyan text-[28px]" aria-hidden="true">trending_down</span>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-eyebrow text-text-muted mb-2">PROJECTED</div>
                      <div className="font-display text-metric leading-none text-cyan">042</div>
                    </div>
                  </div>

                  <div className="mt-6 pt-5 border-t border-rule">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-mono-xs text-text-dim">Predictive drift window</span>
                      <span className="font-mono text-mono-xs text-cyan tabular-nums">04:00:00</span>
                    </div>
                    <div className="h-1 w-full bg-surface-2 overflow-hidden">
                      <div className="h-full bg-cyan" style={{ width: '24%' }} />
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowReport(true)}
                  className="group bg-cyan text-white py-5 px-6 flex items-center justify-between hover:bg-cyan-deep transition-colors"
                >
                  <span className="font-display text-[20px] tracking-[-0.02em]">Generate FMECA report</span>
                  <span className="font-mono text-mono-xs">PDF · 1pg →</span>
                </button>

                <div className="bg-surface hairline-strong flex-1 min-h-[220px] flex flex-col">
                  <div className="flex items-center justify-between px-5 py-3 border-b border-rule bg-surface-2/40">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-cyan text-[16px]" aria-hidden="true">terminal</span>
                      <span className="font-mono text-mono-xs uppercase tracking-[0.18em] text-text-dim">
                        hugo · diagnostic trace
                      </span>
                    </div>
                    <span className="font-mono text-mono-xs text-cyan blink">● live</span>
                  </div>
                  <div className="px-5 py-4 font-mono text-mono-sm space-y-1.5 flex-1 overflow-y-auto scrollbar-thin" role="log" aria-live="polite">
                    {HUGO_LINES.slice(0, n).map((m, i) => (
                      <div key={i} className={`flex gap-2 animate-rise ${TERM_COLOR[m.type]}`}>
                        <span className="text-text-muted shrink-0" aria-hidden="true">{m.type === 'ai' ? '✦' : '›'}</span>
                        <span>{m.text}</span>
                      </div>
                    ))}
                    {n < HUGO_LINES.length && (
                      <span className="inline-block w-2 h-3 bg-cyan animate-flicker mt-1" aria-hidden="true" />
                    )}
                  </div>
                </div>
              </div>

              <div className="col-span-12 lg:col-span-7 relative bg-surface hairline-strong overflow-hidden corner-ticks min-h-[640px]">
                <span className="tick-tr" /><span className="tick-bl" />

                <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
                  <span className="font-mono text-mono-xs text-text-dim bg-surface-2 hairline px-3 py-1.5">
                    schematic · STG-04
                  </span>
                </div>
                <div className="absolute top-4 right-4 z-20 font-mono text-mono-xs text-text-muted">
                  ZOOM · {Math.round(zoom * 100)}%
                </div>

                <div
                  className="absolute inset-0 dot-grid transition-transform duration-500"
                  style={{ transform: `scale(${zoom})` }}
                >
                  <div className="absolute inset-[12%] hairline border-cyan/30" />
                  <div className="absolute inset-[12%] grid grid-cols-4 grid-rows-4 pointer-events-none">
                    {Array.from({ length: 16 }).map((_, i) => (
                      <div key={i} className="border-r border-b border-rule-soft" />
                    ))}
                  </div>

                  <div className="absolute" style={{ top: '38%', left: '28%' }}>
                    <div className="relative w-[260px] h-[170px] hairline border-cyan bg-cyan/5">
                      <span className="absolute -top-7 left-0 bg-cyan text-white font-mono text-mono-xs px-2 py-1">
                        A247293C3 · primary
                      </span>
                      <span className="absolute -right-3 top-1/2 w-6 h-px bg-cyan" />
                      <span className="absolute font-mono text-mono-xs text-cyan" style={{ left: 'calc(100% + 16px)', top: 'calc(50% - 8px)' }}>
                        critical point
                      </span>
                      <span className="absolute -bottom-1 -left-1 w-2 h-2 bg-cyan" />
                      <span className="absolute -bottom-1 -right-1 w-2 h-2 bg-cyan" />
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-cyan" />
                    </div>
                  </div>

                  <div className="absolute" style={{ top: '20%', right: '20%' }}>
                    <div className="relative w-[120px] h-[120px] hairline border-amber/60 bg-amber/5">
                      <span className="absolute -top-6 left-0 font-mono text-mono-xs text-amber">X219128</span>
                    </div>
                  </div>

                  <div className="absolute" style={{ bottom: '18%', right: '32%' }}>
                    <div className="relative px-3 py-2 hairline bg-surface-2/60">
                      <span className="font-mono text-mono-xs text-text-dim">heater_block_B</span>
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-4 right-4 flex hairline-strong divide-x divide-rule bg-surface/95 backdrop-blur z-10">
                  {[
                    { icon: 'add',                 fn: () => setZoom(z => Math.min(2, +(z + 0.2).toFixed(1))), label: 'Zoom in' },
                    { icon: 'remove',              fn: () => setZoom(z => Math.max(0.5, +(z - 0.2).toFixed(1))), label: 'Zoom out' },
                    { icon: 'center_focus_strong', fn: () => setZoom(1), label: 'Reset zoom' },
                  ].map(({ icon, fn, label }) => (
                    <button
                      key={icon}
                      onClick={fn}
                      aria-label={label}
                      className="w-10 h-10 grid place-items-center text-text-dim hover:text-cyan hover:bg-surface-2"
                    >
                      <span className="material-symbols-outlined text-[18px]">{icon}</span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => navigate('/defect')}
                  className="absolute bottom-4 left-4 z-10 px-4 py-2 hairline-strong bg-surface/95 backdrop-blur font-mono text-mono-xs uppercase tracking-[0.18em] text-text-dim hover:text-cyan"
                >
                  ← back to defect
                </button>
              </div>
            </section>

          </div>
        </main>
      </div>

      {showDiag   && <DiagnosticModal onClose={() => setShowDiag(false)} />}
      {showReport && <ReportModal    onClose={() => setShowReport(false)} />}
    </div>
  )
}
