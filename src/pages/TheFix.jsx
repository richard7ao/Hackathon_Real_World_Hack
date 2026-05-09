import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import Sidebar from '../components/Sidebar'
import DiagnosticModal from '../components/DiagnosticModal'
import { fixAndVerify, buildTerminalLines, downloadReport } from '../api'
import { useAnalysis } from '../AnalysisContext'
import { useNarrator } from '../NarratorContext'
import { NARRATION } from '../narration'

const TERM_COLOR = { cmd: 'text-text-dim', ok: 'text-ok', ai: 'text-cyan' }

function ReportModal({ onClose, fixResult, defectPattern, enrichment }) {
  const closeRef = useRef(null)
  const [downloading, setDownloading] = useState(false)
  const { speak, stop, speaking } = useNarrator()

  useEffect(() => { closeRef.current?.focus() }, [])
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const v   = fixResult?.verification
  const llm = fixResult?.correlation?.llm_analysis
  const fmeca = enrichment?.assessment?.fmeca

  const rows = [
    ['Failure Mode',    enrichment?.assessment?.human_label ?? 'Edge-ring defect'],
    ['Stage',          'STG-04 · COW_BONDING'],
    ['Severity (S)',   `${fmeca?.severity ?? 7} / 10`],
    ['Occurrence (O)', `${fmeca?.occurrence ?? 6} / 10`],
    ['Detection (D)',  `${fmeca?.detection ?? 4} / 10`],
    ['Current RPN',    `${v?.rpn_before ?? 168} — critical`],
    ['Projected RPN',  `${v?.rpn_after ?? 28} — acceptable`],
    ['Cost Avoided',   '$24,500.00 USD'],
  ]

  const actions = [
    llm?.corrective_action?.summary ?? 'Reduce reflow zone 3 setpoint to 240°C on machine M3',
    llm?.corrective_action?.specific_adjustment ?? 'Reduce zone 3 setpoint: 244°C → 240°C',
    llm?.corrective_action?.verification_method ?? 'Run verification batch; defect rate should drop below 3%',
    'Schedule 72h monitoring window post-fix',
  ]

  async function handleExport() {
    setDownloading(true)
    const ok = await downloadReport(defectPattern)
    setDownloading(false)
    if (ok) onClose()
  }

  function handleNarrate() {
    if (speaking) { stop(); return }
    const label   = enrichment?.assessment?.human_label ?? 'Edge-ring defect'
    const llm     = fixResult?.correlation?.llm_analysis
    const summary = llm?.corrective_action?.summary ?? 'Reduce reflow zone 3 setpoint on M3 to 240 degrees Celsius.'
    const adj     = llm?.corrective_action?.specific_adjustment ?? 'Reduce zone 3 setpoint from 244 to 240 degrees Celsius.'
    const method  = llm?.corrective_action?.verification_method ?? 'Run a verification batch. Defect rate should drop below 3 percent.'
    const rpnB    = v?.rpn_before ?? 168
    const rpnA    = v?.rpn_after  ?? 28
    const fmeca   = enrichment?.assessment?.fmeca
    const S = fmeca?.severity ?? 7
    const O = fmeca?.occurrence ?? 6
    const D = fmeca?.detection  ?? 4
    speak(
      `FMECA Report. ${label}. Stage 4, CoW Bonding. ` +
      `Severity ${S}, Occurrence ${O}, Detection ${D}. ` +
      `Current Risk Priority Number: ${rpnB} — critical. ` +
      `Projected after fix: ${rpnA} — acceptable. ` +
      `Corrective actions: ${summary}. ${adj}. ${method}. ` +
      `Schedule a 72-hour monitoring window post-fix. ` +
      `Cost avoided: $24,500 USD. ` +
      (v?.fix_verified
        ? `Fix verified. Defect rate dropped from ${((v.defect_rate_before ?? 0.16) * 100).toFixed(0)} to ${((v.defect_rate_after ?? 0.021) * 100).toFixed(1)} percent. Loop closed.`
        : '')
    )
  }

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
              FMECA report · {enrichment?.image_id?.toUpperCase() ?? 'A247293C3'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleNarrate}
              aria-label={speaking ? 'Stop narration' : 'Narrate report'}
              title={speaking ? 'Stop narration' : 'Narrate report'}
              className={`w-8 h-8 grid place-items-center hairline transition-all duration-200
                ${speaking
                  ? 'bg-cyan/10 border-cyan text-cyan hover:bg-cyan/20'
                  : 'bg-surface text-text-dim hover:text-cyan hover:border-cyan'
                }`}
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                {speaking ? 'stop' : 'volume_up'}
              </span>
            </button>
            <button
              ref={closeRef}
              onClick={onClose}
              aria-label="Close report"
              className="material-symbols-outlined text-text-dim hover:text-cyan"
            >
              close
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <div className="font-mono text-eyebrow text-text-muted mb-2">SUMMARY</div>
            <h3 className="font-display text-h-sm tracking-[-0.025em]">
              {llm?.corrective_action?.summary ?? 'Reduce reflow zone 3 setpoint on M3 to 240°C.'}
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-px bg-rule">
            {rows.map(([k, v_]) => {
              const tone = k === 'Current RPN' ? 'text-danger' : k === 'Projected RPN' ? 'text-cyan' : 'text-text'
              return (
                <div key={k} className="bg-surface p-4">
                  <div className="font-mono text-eyebrow text-text-muted mb-1.5">{k.toUpperCase()}</div>
                  <div className={`font-mono text-data ${tone}`}>{v_}</div>
                </div>
              )
            })}
          </div>

          <div className="hairline p-5">
            <div className="font-mono text-eyebrow text-text-muted mb-3">CORRECTIVE ACTIONS</div>
            <ol className="space-y-2 font-mono text-mono-sm text-text-dim">
              {actions.map((a, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-cyan tabular-nums shrink-0">{String(i + 1).padStart(2, '0')}</span>
                  <span>{a}</span>
                </li>
              ))}
            </ol>
          </div>

          {v?.fix_verified && (
            <div className="flex items-center gap-3 px-4 py-3 bg-ok/10 hairline border-ok">
              <span className="material-symbols-outlined text-ok text-[18px]" aria-hidden="true">verified</span>
              <span className="font-mono text-mono-xs text-ok">
                Fix verified · defect rate {((v.defect_rate_after ?? 0.021) * 100).toFixed(1)}% (was {((v.defect_rate_before ?? 0.16) * 100).toFixed(1)}%)
              </span>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-rule bg-surface-2/40">
          <button
            onClick={onClose}
            className="px-4 py-2 hairline font-mono text-mono-xs uppercase tracking-[0.18em] text-text-dim hover:bg-surface-2"
          >
            Close
          </button>
          <button
            onClick={handleExport}
            disabled={downloading}
            className="px-5 py-2 bg-cyan text-white font-mono text-mono-xs uppercase tracking-[0.18em] hover:bg-cyan-deep disabled:opacity-50 transition-colors"
          >
            {downloading ? 'Generating…' : 'Export PDF →'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TheFix() {
  const navigate  = useNavigate()
  const { defectPattern, enrichment, fixResult: cachedFix, update } = useAnalysis()
  const { speak, queue } = useNarrator()
  const [showDiag, setShowDiag]     = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [fixResult, setFixResult]   = useState(cachedFix)
  const [zoom, setZoom]             = useState(1)
  const [visibleLines, setVisibleLines] = useState(0)
  const verifiedNarrated = useRef(false)

  // Queue mount narration for speaker button
  useEffect(() => {
    queue(NARRATION.fix_mount(168, 28))
  }, [])

  useEffect(() => {
    if (cachedFix) { setFixResult(cachedFix); return }
    fixAndVerify(defectPattern).then(data => {
      setFixResult(data)
      update({ fixResult: data })
    })
  }, [])

  const hugoLines = fixResult
    ? buildTerminalLines(fixResult.correlation)
    : [
        { type: 'cmd', text: 'connecting · erp.coWoS.local' },
        { type: 'ok',  text: 'success · 12ms' },
        { type: 'ai',  text: 'Hugo: verifying corrective action…' },
      ]

  useEffect(() => {
    if (visibleLines >= hugoLines.length) return
    const id = setTimeout(() => setVisibleLines(v => v + 1), 700)
    return () => clearTimeout(id)
  }, [visibleLines, hugoLines.length])

  const v         = fixResult?.verification
  const rpnBefore = v?.rpn_before        ?? 168
  const rpnAfter  = v?.rpn_after         ?? 28
  const impPct    = v?.rpn_improvement_pct ?? 83.3
  const conf      = fixResult?.correlation?.llm_analysis?.confidence ?? 0.91
  const action    = v?.action_applied

  // Queue fix-verified narration so speaker button updates to latest message
  useEffect(() => {
    if (v?.fix_verified && !verifiedNarrated.current) {
      verifiedNarrated.current = true
      queue(NARRATION.fix_verified)
    }
  }, [v?.fix_verified])

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
                  From <span className="text-danger">{rpnBefore}</span>
                  <span className="text-text-muted"> to </span>
                  <span className="italic text-cyan">{String(rpnAfter).padStart(3, '0')}</span>.
                </h1>
                <p className="mt-6 max-w-xl text-text-dim text-lead font-light">
                  {action?.summary ?? "Hugo's recommended corrective protocol drops Risk Priority below threshold inside a four-hour predictive drift window — before scrap accumulates further."}
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
                    <div className="font-mono text-data text-cyan">{Math.round(conf * 100)}%</div>
                  </div>
                  <div>
                    <div className="font-mono text-eyebrow text-text-muted mb-1">IMPROVE</div>
                    <div className="font-mono text-data text-ok">{impPct.toFixed(0)}%</div>
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
                      <div className="font-display text-metric leading-none text-danger">{rpnBefore}</div>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <span className="font-mono text-eyebrow text-text-muted">→</span>
                      <span className="material-symbols-outlined text-cyan text-[28px]" aria-hidden="true">trending_down</span>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-eyebrow text-text-muted mb-2">PROJECTED</div>
                      <div className="font-display text-metric leading-none text-cyan">{String(rpnAfter).padStart(3, '0')}</div>
                    </div>
                  </div>

                  <div className="mt-6 pt-5 border-t border-rule">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-mono-xs text-text-dim">
                        {action?.specific_adjustment ?? 'Reduce zone 3 setpoint: 244°C → 240°C on machine M3'}
                      </span>
                    </div>
                    <div className="h-1 w-full bg-surface-2 overflow-hidden">
                      <div className="h-full bg-cyan transition-all duration-700" style={{ width: `${impPct}%` }} />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="font-mono text-mono-xs text-text-muted">0</span>
                      <span className="font-mono text-mono-xs text-cyan">{impPct.toFixed(0)}% RPN reduction</span>
                    </div>
                  </div>

                  {v?.fix_verified && (
                    <div className="mt-4 flex items-center gap-2 px-3 py-2 bg-ok/10 hairline border-ok">
                      <span className="material-symbols-outlined text-ok text-[16px]" aria-hidden="true">verified</span>
                      <span className="font-mono text-mono-xs text-ok">
                        Verification batch {v.verification_batch?.batch_id} · {v.verification_batch?.wafers_passed}/{v.verification_batch?.wafer_count} passed
                      </span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setShowReport(true)}
                  className="group bg-cyan text-white py-5 px-6 flex items-center justify-between hover:bg-cyan-deep transition-colors"
                >
                  <span className="font-display text-[20px] tracking-[-0.02em]">Generate FMECA report</span>
                  <span className="font-mono text-mono-xs">PDF · MIL-STD-1629A →</span>
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
                    {hugoLines.slice(0, visibleLines).map((m, i) => (
                      <div key={i} className={`flex gap-2 animate-rise ${TERM_COLOR[m.type] ?? 'text-text-dim'}`}>
                        <span className="text-text-muted shrink-0" aria-hidden="true">{m.type === 'ai' ? '✦' : '›'}</span>
                        <span>{m.text}</span>
                      </div>
                    ))}
                    {visibleLines < hugoLines.length && (
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
                        {defectPattern} · primary
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
                      <span className="absolute -top-6 left-0 font-mono text-mono-xs text-amber">
                        {fixResult?.correlation?.llm_analysis?.cluster_fingerprint?.primary_machine ?? 'M3'}
                      </span>
                    </div>
                  </div>

                  <div className="absolute" style={{ bottom: '18%', right: '32%' }}>
                    <div className="relative px-3 py-2 hairline bg-surface-2/60">
                      <span className="font-mono text-mono-xs text-text-dim">
                        {fixResult?.correlation?.llm_analysis?.cluster_fingerprint?.primary_shift ?? 'afternoon'} shift
                      </span>
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
      {showReport && (
        <ReportModal
          onClose={() => setShowReport(false)}
          fixResult={fixResult}
          defectPattern={defectPattern}
          enrichment={enrichment}
        />
      )}
    </div>
  )
}
