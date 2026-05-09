import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import Sidebar from '../components/Sidebar'
import DiagnosticModal from '../components/DiagnosticModal'

const AI_LINES = [
  { type: 'cmd', text: 'Connecting to ERP...',                           prefix: '>' },
  { type: 'ok',  text: 'success',                                        prefix: '>' },
  { type: 'cmd', text: 'Reading data from inventory',                    prefix: '>' },
  { type: 'ai',  text: 'We have 3 late items for subsystem A247293C3.',  prefix: '✦ Hugo AI:' },
  { type: 'cmd', text: 'Analyzing thermal drift patterns...',             prefix: '>' },
  { type: 'ai',  text: 'Correlating late items with failure timeline.',   prefix: '✦ Hugo AI:' },
  { type: 'cmd', text: 'Thinking...',                                     prefix: '>' },
  { type: 'ai',  text: 'Action 1: Follow up with suppliers immediately.', prefix: '✦ Hugo AI:' },
  { type: 'ai',  text: 'Action 2: Increase local safety stock by 5 units.', prefix: '✦ Hugo AI:' },
]

const ZOOM_CONTROLS = [
  { icon: 'zoom_in',            label: 'Zoom in',    fn: (z) => Math.min(2, +(z + 0.2).toFixed(1)) },
  { icon: 'zoom_out',           label: 'Zoom out',   fn: (z) => Math.max(0.5, +(z - 0.2).toFixed(1)) },
  { icon: 'center_focus_strong',label: 'Reset zoom', fn: () => 1 },
]

function ReportModal({ onClose }) {
  const closeRef = useRef(null)

  useEffect(() => { closeRef.current?.focus() }, [])
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const rows = [
    ['Failure Mode',    'Thermal Overshoot @ Zone 4'],
    ['Stage',           'STG-04 COW_BONDING'],
    ['Severity (S)',    '8 / 10'],
    ['Occurrence (O)', '4 / 10'],
    ['Detection (D)',  '3 / 10'],
    ['Current RPN',    '187 — CRITICAL'],
    ['Projected RPN',  '42 — Acceptable'],
    ['Cost Avoided',   '$24,500.00 USD'],
  ]

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-title"
    >
      <div className="w-[640px] border border-primary-fixed bg-surface-container-low">
        <div className="flex justify-between items-center border-b border-outline-variant px-6 py-3">
          <span id="report-title" className="font-data-sm text-data-sm text-primary-fixed uppercase tracking-wider">
            FMECA Report :: A247293C3
          </span>
          <button
            ref={closeRef}
            type="button"
            aria-label="Close report"
            onClick={onClose}
            className="p-1 text-on-surface-variant hover:text-primary transition-colors duration-200 cursor-pointer rounded"
          >
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>
        <div className="p-6 font-data-sm text-data-sm space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {rows.map(([k, v]) => (
              <div key={k} className="border border-outline-variant p-3">
                <div className="font-label-caps text-label-caps text-on-surface-variant mb-1">{k}</div>
                <div className={
                  k === 'Current RPN' ? 'text-error' :
                  k === 'Projected RPN' ? 'text-primary-fixed' :
                  'text-on-surface'
                }>{v}</div>
              </div>
            ))}
          </div>
          <div className="border border-outline-variant p-4">
            <div className="font-label-caps text-label-caps text-on-surface-variant mb-2">CORRECTIVE ACTIONS</div>
            <ol className="space-y-1 text-on-surface list-decimal list-inside">
              <li>Expedite 3 late supply items with suppliers</li>
              <li>Increase local safety stock by 5 units</li>
              <li>Recalibrate heater block B thermal profile</li>
              <li>Schedule 72h monitoring window post-fix</li>
            </ol>
          </div>
        </div>
        <div className="border-t border-outline-variant px-6 py-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-outline text-on-surface-variant font-data-sm text-data-sm uppercase hover:bg-surface-bright transition-colors duration-200 cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-primary-container text-on-primary-container font-data-sm text-data-sm uppercase hover:opacity-80 transition-opacity duration-200 cursor-pointer"
          >
            Export PDF
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TheFix() {
  const navigate = useNavigate()
  const [showDiag, setShowDiag]     = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [visibleLines, setVisibleLines] = useState(0)
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    if (visibleLines >= AI_LINES.length) return
    const id = setTimeout(() => setVisibleLines(v => v + 1), 700)
    return () => clearTimeout(id)
  }, [visibleLines])

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen blueprint-grid flex flex-col">
      <TopBar onDiagnostic={() => setShowDiag(true)} />

      <div className="flex h-[calc(100vh-64px)] mt-16 overflow-hidden">
        <Sidebar active="thermal" onNewAnalysis={() => navigate('/defect')} />

        <main id="main-content" className="flex-1 overflow-y-auto p-8 relative">
          <div className="relative z-10 grid grid-cols-12 gap-4 max-w-[1440px] mx-auto h-full">

            {/* Left column */}
            <div className="col-span-12 lg:col-span-5 flex flex-col gap-4">

              {/* The Fix Card */}
              <div className="glass-panel border border-primary/20 p-panel-padding relative">
                <div className="absolute top-2 right-2 font-label-caps text-label-caps text-on-surface-variant border border-outline px-1" aria-hidden="true">
                  REF-RES-992
                </div>
                <div className="mb-6">
                  <h1 className="font-headline-lg text-headline-lg text-primary mb-2">The Fix</h1>
                  <p className="font-data-display text-data-display text-on-surface-variant">
                    Recommended Corrective Action
                  </p>
                </div>

                {/* RPN comparison */}
                <div className="bg-surface-container-low border border-outline-variant p-4 mb-6">
                  <div className="flex justify-between items-center border-b border-outline-variant pb-4 mb-4">
                    <div>
                      <div className="font-label-caps text-label-caps text-on-surface-variant mb-1">CURRENT RPN</div>
                      <div className="font-headline-xl text-headline-xl text-error" aria-label="Current risk priority number: 187, critical">187</div>
                    </div>
                    <span className="material-symbols-outlined text-primary text-3xl" aria-hidden="true">arrow_right_alt</span>
                    <div className="text-right">
                      <div className="font-label-caps text-label-caps text-on-surface-variant mb-1">PROJECTED RPN</div>
                      <div className="font-headline-xl text-headline-xl text-primary-fixed" aria-label="Projected risk priority number after fix: 42">42</div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-data-sm text-data-sm text-on-surface">Predictive Drift Window</span>
                      <span className="font-data-sm text-data-sm text-primary-fixed border border-primary-fixed px-2 py-0.5">
                        04:00:00
                      </span>
                    </div>
                    <div className="h-1 bg-surface-bright w-full" role="progressbar" aria-valuenow={25} aria-valuemin={0} aria-valuemax={100} aria-label="Drift window consumed">
                      <div className="h-1 bg-primary-fixed w-1/4 relative">
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-primary" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <div className="font-label-caps text-label-caps text-on-surface-variant mb-2">ESTIMATED COST AVOIDED</div>
                  <div className="font-data-display text-primary text-2xl tracking-widest">
                    $24,500.00 <span className="text-on-surface-variant text-sm">USD</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowReport(true)}
                  className="w-full bg-primary-fixed text-on-primary-fixed font-data-display py-4 hover:bg-primary-fixed-dim transition-colors duration-200 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined" aria-hidden="true">summarize</span>
                  GENERATE FMECA REPORT
                </button>
              </div>

              {/* AI Terminal */}
              <div className="flex-1 glass-panel border border-secondary/30 p-panel-padding relative flex flex-col min-h-[240px]">
                <div className="absolute top-2 right-2 font-label-caps text-label-caps text-secondary border border-secondary/50 px-1" aria-hidden="true">
                  TERM-AI-ACT
                </div>
                <div className="flex items-center gap-2 mb-4 text-secondary" aria-hidden="true">
                  <span className="material-symbols-outlined text-sm">terminal</span>
                  <span className="font-data-sm uppercase">Diagnostic Trace</span>
                </div>
                <div
                  role="log"
                  aria-live="polite"
                  aria-label="AI diagnostic trace"
                  className="flex-1 font-data-sm text-data-sm text-on-surface-variant space-y-2 overflow-y-auto terminal-scroll pr-2"
                >
                  {AI_LINES.slice(0, visibleLines).map(({ type, text, prefix }, i) => (
                    <div key={i} className={`flex gap-2 ${type === 'ai' ? 'pl-4' : ''}`}>
                      <span className={type === 'ai' ? 'text-secondary shrink-0' : 'text-outline shrink-0'} aria-hidden="true">{prefix}</span>
                      <span className={type === 'ok' ? 'text-primary-fixed' : type === 'ai' ? 'text-on-surface' : ''}>{text}</span>
                    </div>
                  ))}
                  {visibleLines < AI_LINES.length && (
                    <div className="flex gap-2" aria-hidden="true">
                      <span className="text-primary-fixed animate-pulse">_</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right column — Machine Schematic */}
            <div className="col-span-12 lg:col-span-7 relative border border-outline-variant bg-surface-container-lowest/50 flex items-center justify-center overflow-hidden min-h-[500px]">
              <div
                className="absolute inset-0 opacity-30 pointer-events-none"
                aria-hidden="true"
                style={{
                  backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 49px, #8e9378 50px), repeating-linear-gradient(90deg, transparent, transparent 49px, #8e9378 50px)',
                  backgroundSize: '50px 50px'
                }}
              />

              {/* Schematic */}
              <div
                className="relative w-[80%] h-[80%] border border-primary-fixed/50 p-4 transition-transform duration-300"
                style={{ transform: `scale(${zoom})` }}
                aria-label={`Machine schematic at ${Math.round(zoom * 100)}% zoom`}
              >
                {/* Grid lines */}
                {['top-1/4', 'top-1/2', 'top-3/4'].map(t => (
                  <div key={t} className={`absolute ${t} left-0 w-full h-px border-t border-dashed border-outline-variant`} aria-hidden="true" />
                ))}
                {['left-1/4', 'left-1/2', 'left-3/4'].map(l => (
                  <div key={l} className={`absolute ${l} top-0 w-px h-full border-l border-dashed border-outline-variant`} aria-hidden="true" />
                ))}

                {/* Primary target */}
                <div className="absolute top-1/2 left-1/3 w-56 h-40 border-2 border-primary-fixed bg-primary-fixed/10 z-10 p-2">
                  <div className="absolute -top-6 -left-px bg-primary-fixed text-on-primary-fixed font-data-sm px-2 py-1 text-xs">
                    A247293C3
                  </div>
                  <div className="absolute -right-2 top-1/2 w-14 h-px bg-primary-fixed" aria-hidden="true" />
                  <div className="absolute font-data-sm text-primary-fixed text-xs" style={{ right: '-72px', top: 'calc(50% - 10px)' }}>
                    CRITICAL POINT
                  </div>
                </div>

                {/* Secondary target */}
                <div className="absolute top-1/4 right-1/4 w-28 h-28 border border-secondary bg-secondary/5 z-10">
                  <div className="absolute -top-5 -left-px text-secondary font-data-sm text-xs">X219128</div>
                </div>
              </div>

              {/* Zoom controls */}
              <div className="absolute bottom-4 right-4 flex gap-2 z-20" role="group" aria-label="Schematic zoom controls">
                {ZOOM_CONTROLS.map(({ icon, label, fn }) => (
                  <button
                    key={icon}
                    type="button"
                    aria-label={label}
                    onClick={() => setZoom(fn)}
                    className="w-10 h-10 border border-outline-variant bg-surface text-on-surface hover:bg-surface-bright flex items-center justify-center transition-colors duration-200 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm" aria-hidden="true">{icon}</span>
                  </button>
                ))}
              </div>

              {/* Zoom indicator */}
              <div className="absolute top-4 left-4 font-label-caps text-label-caps text-on-surface-variant border border-outline px-2 py-1" aria-live="polite">
                ZOOM: {Math.round(zoom * 100)}%
              </div>
            </div>
          </div>
        </main>
      </div>

      {showDiag   && <DiagnosticModal onClose={() => setShowDiag(false)} />}
      {showReport && <ReportModal    onClose={() => setShowReport(false)} />}
    </div>
  )
}
