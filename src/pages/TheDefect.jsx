import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import Sidebar from '../components/Sidebar'
import DiagnosticModal from '../components/DiagnosticModal'
import { correlate, buildTerminalLines } from '../api'
import { useAnalysis } from '../AnalysisContext'

const STATIC_TERM_LINES = [
  { type: 'cmd', text: 'connecting · erp.coWoS.local' },
  { type: 'ok',  text: 'success · 12ms' },
  { type: 'cmd', text: 'reading batch data · last 50 batches' },
]

const TERM_COLOR = { cmd: 'text-text-dim', ok: 'text-ok', ai: 'text-cyan' }

function useScrap(initial = 12405.89) {
  const [c, setC] = useState(initial)
  useEffect(() => {
    const id = setInterval(() => setC(v => +(v + Math.random() * 12 + 2).toFixed(2)), 1800)
    return () => clearInterval(id)
  }, [])
  return c
}

export default function TheDefect() {
  const navigate = useNavigate()
  const { defectPattern, enrichment, correlation: cachedCorrelation, update } = useAnalysis()
  const [showDiag, setShowDiag] = useState(false)
  const [correlation, setCorrelation] = useState(cachedCorrelation)
  const [visibleLines, setVisibleLines] = useState(0)
  const scrap = useScrap()

  // Fetch correlation on mount if not cached
  useEffect(() => {
    if (cachedCorrelation) { setCorrelation(cachedCorrelation); return }
    correlate(defectPattern).then(data => {
      setCorrelation(data)
      update({ correlation: data })
    })
  }, [])

  // Build full terminal line list — static lines first, then dynamic once API returns.
  // The typewriter pauses at the loading line until correlation arrives.
  const allLines = useMemo(() => {
    if (!correlation) {
      return [...STATIC_TERM_LINES, { type: 'ai', text: 'Hugo: analyzing…' }]
    }
    return buildTerminalLines(correlation)
  }, [correlation])

  // Typewriter — pauses at the "analyzing…" placeholder until correlation loads
  useEffect(() => {
    if (visibleLines >= allLines.length) return
    const atLoadingLine = visibleLines === STATIC_TERM_LINES.length && !correlation
    if (atLoadingLine) return
    const id = setTimeout(() => setVisibleLines(v => v + 1), 700)
    return () => clearTimeout(id)
  }, [visibleLines, allLines.length, correlation])

  const fmeca    = enrichment?.assessment?.fmeca
  const ipc      = enrichment?.assessment?.ipc_a_610
  const jedec    = enrichment?.assessment?.jedec
  const diagnosis = enrichment?.assessment?.diagnosis
  const label    = enrichment?.assessment?.human_label ?? 'Edge-ring defect'

  // Fallback values match current design when no enrichment loaded yet
  const S   = fmeca?.severity   ?? 7
  const O   = fmeca?.occurrence ?? 6
  const D   = fmeca?.detection  ?? 4
  const RPN = fmeca?.rpn        ?? 168

  const violations = [
    [
      'IPC-A-610 Class 3',
      ipc?.class_3_outcome?.replace(/_/g, ' ').toLowerCase() ?? 'fail · aerospace/military',
    ],
    [
      'IPC-A-610 Class 2',
      ipc?.class_2_outcome?.replace(/_/g, ' ').toLowerCase() ?? 'fail · industrial/automotive',
    ],
    [
      'MIL-STD-1629A',
      fmeca?.mil_std_1629a_category ?? 'II — Critical',
    ],
  ]

  const rootCause = diagnosis?.likely_root_cause ?? 'Plasma etch non-uniformity or chamber edge effect'

  const [dollars, cents] = scrap.toFixed(2).split('.')
  const typewriterDone = visibleLines >= allLines.length

  return (
    <div className="min-h-screen bg-bg text-text font-sans">
      <TopBar onDiagnostic={() => setShowDiag(true)} />

      <div className="flex pt-16 h-screen">
        <Sidebar />

        <main id="main-content" className="flex-1 overflow-y-auto scrollbar-thin micro-grid">
          <div className="max-w-[1480px] mx-auto px-10 py-12 space-y-12">

            <header className="grid grid-cols-12 gap-8">
              <div className="col-span-12 lg:col-span-7">
                <div className="font-mono text-eyebrow text-danger mb-6 flex items-center gap-3">
                  <span className="w-8 h-px bg-danger" />
                  CRITICAL · STG-04 · COW_BONDING
                </div>
                <h1 className="font-display text-h-lg text-balance leading-[0.9]">
                  A defect <span className="italic text-danger">no human</span><br />
                  would have <span className="text-text-muted">caught</span>.
                </h1>
                <p className="mt-6 max-w-xl text-text-dim text-lead font-light">
                  <span className="font-mono text-text">{label}</span> — {rootCause.toLowerCase()}.
                  IPC-A-610 violation. Yield impact climbing 0.04% per minute.
                </p>
              </div>

              <div className="col-span-12 lg:col-span-5 relative grain glass corner-ticks p-7">
                <span className="tick-tr" /><span className="tick-bl" />
                <div className="flex items-center justify-between">
                  <span className="font-mono text-eyebrow text-danger">SCRAP · ACCRUING</span>
                  <span className="font-mono text-mono-xs text-danger blink">● LIVE</span>
                </div>
                <div className="mt-5 flex items-baseline gap-1 font-display tabular-nums">
                  <span className="text-text-muted text-h-sm leading-none">$</span>
                  <span className="text-metric leading-none text-text">{Number(dollars).toLocaleString()}</span>
                  <span className="text-h-sm leading-none text-text-muted">.{cents}</span>
                  <span className="ml-2 font-mono text-mono-xs text-text-muted">USD</span>
                </div>
                <div className="mt-4 h-px w-full bg-rule overflow-hidden">
                  <div className="h-full bg-danger animate-sweep w-1/3" />
                </div>
                <div className="mt-3 grid grid-cols-2 text-text-muted">
                  <div>
                    <div className="font-mono text-eyebrow">RATE / MIN</div>
                    <div className="font-mono text-data text-text mt-1">+$8.40</div>
                  </div>
                  <div>
                    <div className="font-mono text-eyebrow">SINCE</div>
                    <div className="font-mono text-data text-text mt-1">04:12 UTC</div>
                  </div>
                </div>
              </div>
            </header>

            <section
              className="relative bg-surface hairline-strong overflow-hidden h-[520px] corner-ticks"
              aria-label={`Defect visualization for ${label}`}
            >
              <span className="tick-tr" /><span className="tick-bl" />

              <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
                <span className="bg-danger/10 hairline border-danger px-3 py-1.5 font-mono text-mono-xs text-danger">
                  STG-04 · CRITICAL
                </span>
                <span className="bg-surface-2 hairline px-3 py-1.5 font-mono text-mono-xs text-text-dim">
                  IPC-A-610 violation
                </span>
              </div>
              <div className="absolute top-4 right-4 z-20 font-mono text-mono-xs text-text-muted">
                REF · {enrichment?.image_id?.toUpperCase() ?? 'A247293C3'}
              </div>

              <svg width="100%" height="100%" className="absolute inset-0 opacity-50" aria-hidden="true">
                <defs>
                  <pattern id="circuit" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
                    <rect width="80" height="80" fill="none" />
                    <line x1="0"  y1="40" x2="80" y2="40" stroke="#d6cfb9" strokeWidth="0.5" />
                    <line x1="40" y1="0"  x2="40" y2="80" stroke="#d6cfb9" strokeWidth="0.5" />
                    <rect x="20" y="20" width="40" height="40" fill="none" stroke="#c9c1a8" strokeWidth="0.5" />
                    <circle cx="40" cy="40" r="3" fill="#efeadb" stroke="#c9c1a8" strokeWidth="0.5" />
                    <line x1="20" y1="40" x2="30" y2="40" stroke="#8a8d96" strokeWidth="0.3" />
                    <line x1="50" y1="40" x2="60" y2="40" stroke="#8a8d96" strokeWidth="0.3" />
                  </pattern>
                  <radialGradient id="anomaly" cx="50%" cy="50%" r="50%">
                    <stop offset="0%"   stopColor="#dc2626" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <rect width="100%" height="100%" fill="url(#circuit)" />
                <ellipse cx="42%" cy="44%" rx="180" ry="140" fill="url(#anomaly)" />
                <rect x="34%" y="32%" width="20%" height="22%"
                  fill="rgba(220,38,38,0.05)" stroke="#dc2626" strokeWidth="1"
                  strokeDasharray="6 4" />
                <rect x="62%" y="58%" width="10%" height="10%"
                  fill="rgba(8,145,178,0.06)" stroke="#0891b2" strokeWidth="1"
                  strokeDasharray="3 3" />
              </svg>

              <div className="absolute left-0 right-0 h-px bg-cyan/40 animate-scanline pointer-events-none" aria-hidden="true" />

              <div className="absolute" style={{ top: '32%', left: '34%' }}>
                <div className="relative w-[260px] h-[170px] hairline border-danger">
                  <span className="absolute -top-7 left-0 bg-danger text-white font-mono text-mono-xs px-2 py-1">
                    {defectPattern} · primary
                  </span>
                  <span className="absolute -right-3 top-1/2 w-6 h-px bg-danger" />
                  <span className="absolute font-mono text-mono-xs text-danger" style={{ left: 'calc(100% + 16px)', top: 'calc(50% - 8px)' }}>
                    Δ +2.4°C
                  </span>
                </div>
              </div>

              <div className="absolute" style={{ top: '58%', left: '62%' }}>
                <div className="relative w-[110px] h-[110px] hairline border-cyan/60" />
                <span className="absolute font-mono text-mono-xs text-cyan -top-4">X219128</span>
              </div>

              {/* Hugo terminal — wired to real correlation data */}
              <div className="absolute bottom-5 left-5 w-[400px] glass corner-ticks p-5 shadow-lg">
                <span className="tick-tr" /><span className="tick-bl" />
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-eyebrow text-cyan">HUGO · ANALYSIS</span>
                  <span className="material-symbols-outlined text-cyan text-[14px]" aria-hidden="true">terminal</span>
                </div>
                <div className="font-mono text-mono-xs space-y-1 max-h-[180px] overflow-y-auto scrollbar-thin" role="log" aria-live="polite">
                  {allLines.slice(0, visibleLines).map((m, i) => (
                    <div key={i} className={`flex gap-2 animate-rise ${TERM_COLOR[m.type] ?? 'text-text-dim'}`}>
                      <span className="text-text-muted shrink-0" aria-hidden="true">{m.type === 'ai' ? '✦' : '›'}</span>
                      <span>{m.text}</span>
                    </div>
                  ))}
                  {!typewriterDone && (
                    <span className="inline-block w-2 h-3 bg-cyan animate-flicker mt-1" aria-hidden="true" />
                  )}
                </div>
                {typewriterDone && (
                  <button
                    onClick={() => navigate('/fix')}
                    className="mt-4 w-full bg-cyan text-white font-mono text-mono-xs uppercase tracking-[0.18em] py-2.5 hover:bg-cyan-deep transition-colors"
                  >
                    View fix protocol →
                  </button>
                )}
              </div>
            </section>

            <section className="grid grid-cols-12 gap-6">
              {/* FMECA section — real S/O/D/RPN from /enrich */}
              <div className="col-span-12 lg:col-span-8 bg-surface hairline-strong p-8 relative">
                <div className="flex items-center justify-between mb-6">
                  <span className="font-mono text-eyebrow text-text-muted">MOD · FMECA-01</span>
                  <span className="font-mono text-eyebrow text-danger">RPN ↗ CRITICAL</span>
                </div>
                <h2 className="font-display text-h-sm tracking-[-0.025em] mb-8">
                  Failure Mode &amp; Effects.
                </h2>

                <div className="grid grid-cols-3 gap-px bg-rule">
                  {[
                    { label: 'Severity',   value: S, color: 'text-danger', bar: 'bg-danger' },
                    { label: 'Occurrence', value: O, color: 'text-amber',  bar: 'bg-amber'  },
                    { label: 'Detection',  value: D, color: 'text-cyan',   bar: 'bg-cyan'   },
                  ].map(({ label, value, color, bar }) => (
                    <div key={label} className="bg-surface p-5">
                      <div className="font-mono text-eyebrow text-text-muted mb-3">{label.toUpperCase()}</div>
                      <div className="flex items-baseline gap-2">
                        <span className={`font-display text-h-md ${color}`}>{value}</span>
                        <span className="font-mono text-mono-sm text-text-muted">/ 10</span>
                      </div>
                      <div className="mt-3 h-px w-full bg-rule overflow-hidden">
                        <div className={`h-full ${bar}`} style={{ width: `${value * 10}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 pt-6 border-t border-rule flex items-end justify-between">
                  <div>
                    <div className="font-mono text-eyebrow text-text-muted mb-2">RISK PRIORITY NUMBER</div>
                    <div className="flex items-baseline gap-3">
                      <span className="font-display text-metric text-danger leading-none">{RPN}</span>
                      <span className="font-mono text-mono-sm text-text-muted">threshold &gt; 100</span>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/fix')}
                    className="group bg-cyan text-white px-6 py-3 font-mono text-mono-xs uppercase tracking-[0.18em] hover:bg-cyan-deep transition-colors flex items-center gap-3"
                  >
                    Initiate fix <span className="font-display text-base">→</span>
                  </button>
                </div>
              </div>

              {/* Standards violations — real IPC/MIL/JEDEC data */}
              <div className="col-span-12 lg:col-span-4 bg-surface hairline-strong p-8 flex flex-col">
                <div className="font-mono text-eyebrow text-text-muted mb-2">MOD · VIOLATION-02</div>
                <h2 className="font-display text-h-sm tracking-[-0.025em] mb-6">
                  Standards
                </h2>
                <ul className="space-y-4 flex-1">
                  {violations.map(([code, msg]) => (
                    <li key={code} className="flex gap-3 items-start pb-4 border-b border-rule last:border-0">
                      <span className="font-mono text-mono-xs text-danger shrink-0 w-2 h-2 mt-1.5 bg-danger" aria-hidden="true" />
                      <div className="flex-1">
                        <div className="font-mono text-mono-sm text-text">{code}</div>
                        <div className="font-mono text-mono-xs text-text-muted mt-1">{msg}</div>
                      </div>
                    </li>
                  ))}
                </ul>
                {jedec?.impact && (
                  <div className="pt-4 border-t border-rule">
                    <div className="font-mono text-eyebrow text-text-muted mb-1">JEDEC IMPACT</div>
                    <div className="font-mono text-mono-xs text-text-dim">{jedec.impact}</div>
                  </div>
                )}
              </div>
            </section>

          </div>
        </main>
      </div>

      {showDiag && <DiagnosticModal onClose={() => setShowDiag(false)} />}
    </div>
  )
}
