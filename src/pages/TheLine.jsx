import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import Sidebar from '../components/Sidebar'
import DiagnosticModal from '../components/DiagnosticModal'

const STAGES = [
  { id: 'STG-01', label: 'WAFER_IN',    icon: 'conveyor_belt', status: 'ok',    pos: 'down' },
  { id: 'STG-02', label: 'BUMPING',     icon: 'scatter_plot',  status: 'ok',    pos: 'up'   },
  { id: 'STG-03', label: 'INTERPOSER',  icon: 'layers',        status: 'ok',    pos: 'down' },
  { id: 'STG-04', label: 'COW_BONDING', icon: 'join_inner',    status: 'error', pos: 'up'   },
  { id: 'STG-05', label: 'UNDERFILL',   icon: 'water_drop',    status: 'ok',    pos: 'down' },
  { id: 'STG-06', label: 'WOS_ATTACH',  icon: 'memory',        status: 'ok',    pos: 'up'   },
  { id: 'STG-07', label: 'REFLOW',      icon: 'mode_heat',     status: 'ok',    pos: 'down' },
  { id: 'STG-08', label: 'FINAL_TEST',  icon: 'fact_check',    status: 'ok',    pos: 'up'   },
]

const TERMINAL_MSGS = {
  'STG-04': [
    { type: 'cmd', text: 'Connecting to ERP...' },
    { type: 'ok',  text: 'success' },
    { type: 'cmd', text: 'Reading thermal data logs...' },
    { type: 'err', text: 'WARN: Temp anomaly detected at zone 4' },
    { type: 'sub', text: 'Delta: +2.4°C / Threshold: 1.5°C' },
    { type: 'ai',  text: 'Initiating auto-calibration for heater block B. ETA: 45s.' },
  ],
  default: [
    { type: 'cmd', text: 'Connecting to ERP...' },
    { type: 'ok',  text: 'success' },
    { type: 'cmd', text: 'Running stage diagnostics...' },
    { type: 'ok',  text: 'STATUS: All parameters within normal range' },
    { type: 'sub', text: 'Throughput: 99.1% / Defect rate: 0.04%' },
    { type: 'ai',  text: 'No action required. Stage operating nominally.' },
  ],
}

function useFleetStats() {
  const [yieldPct, setYieldPct] = useState(94.2)
  useEffect(() => {
    const id = setInterval(() => {
      setYieldPct(y => Math.min(99.9, Math.max(90, +(y + (Math.random() - 0.52) * 0.08).toFixed(1))))
    }, 3000)
    return () => clearInterval(id)
  }, [])
  return yieldPct
}

function TerminalLine({ type, text }) {
  const cls =
    type === 'err' ? 'text-error' :
    type === 'ok'  ? 'text-primary-fixed' :
    type === 'ai'  ? 'text-secondary' :
    type === 'sub' ? 'text-on-surface-variant pl-4 border-l-2 border-error ml-1' :
    'text-on-surface'
  return (
    <div className={`flex gap-2 text-xs ${cls}`}>
      {type !== 'sub' && <span className="text-secondary shrink-0" aria-hidden="true">&gt;</span>}
      <span>{text}</span>
    </div>
  )
}

export default function TheLine() {
  const navigate = useNavigate()
  const [selectedStage, setSelectedStage] = useState('STG-04')
  const [showModal, setShowModal] = useState(false)
  const yieldPct = useFleetStats()

  const msgs = TERMINAL_MSGS[selectedStage] || TERMINAL_MSGS.default
  const selected = STAGES.find(s => s.id === selectedStage)

  const handleStageKey = (e, stage) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setSelectedStage(stage.id)
    }
  }

  return (
    <div className="bg-background text-on-surface font-body-md overflow-x-hidden min-h-screen flex flex-col">
      <TopBar onDiagnostic={() => setShowModal(true)} />

      <div className="flex flex-1 mt-16 h-[calc(100vh-64px)] overflow-hidden">
        <Sidebar active="fleet" onNewAnalysis={() => navigate('/defect')} />

        <main id="main-content" className="flex-1 relative overflow-auto p-8 bg-technical-grid bg-grid">

          {/* Fleet Status Panel */}
          <div
            className="absolute top-8 right-8 bg-glass border border-outline-variant p-4 w-64 z-20"
            aria-label="Fleet status summary"
          >
            <div className="font-label-caps text-label-caps text-on-surface-variant mb-2">SYS-FLT-STS</div>
            <div className="flex items-end gap-2 mb-4">
              <span className="font-headline-lg text-headline-lg text-primary" aria-label={`${yieldPct}% yield`}>
                {yieldPct}%
              </span>
              <span className="font-data-sm text-data-sm text-primary-fixed-dim uppercase mb-1">Yield</span>
            </div>
            <div className="space-y-2" role="list">
              <div className="flex justify-between items-center text-xs" role="listitem">
                <span className="text-on-surface-variant font-data-sm">Active Nodes</span>
                <span className="text-primary font-data-display">1,024</span>
              </div>
              <div className="flex justify-between items-center text-xs" role="listitem">
                <span className="text-on-surface-variant font-data-sm">Warnings</span>
                <span className="text-error font-data-display">3</span>
              </div>
              <div className="h-1 bg-surface-variant mt-2 w-full" role="progressbar" aria-valuenow={yieldPct} aria-valuemin={0} aria-valuemax={100} aria-label="Yield progress">
                <div className="h-full bg-primary-fixed transition-all duration-1000" style={{ width: `${yieldPct}%` }} />
              </div>
            </div>
          </div>

          {/* Pipeline Visualization */}
          <div className="w-full min-w-[1100px] mt-24 relative h-80 flex items-center justify-between px-12">

            {/* SVG connector lines — decorative */}
            <svg className="absolute inset-0 w-full h-full z-0" aria-hidden="true" style={{ pointerEvents: 'none' }}>
              <line className="blueprint-line" x1="5%" x2="95%" y1="50%" y2="50%" />
              {[12.5, 25, 37.5, 62.5, 75, 87.5].map(x => (
                <line key={x} className="blueprint-line"
                  x1={`${x}%`} x2={`${x}%`}
                  y1="50%" y2={[12.5, 62.5, 87.5].includes(x) ? '70%' : '30%'}
                />
              ))}
              <line stroke="#ffb4ab" strokeDasharray="0" strokeWidth="2"
                x1="50%" x2="50%" y1="50%" y2="30%" />
            </svg>

            {/* Stage nodes */}
            <div role="list" aria-label="CoWoS-L production stages" className="contents">
              {STAGES.map((stage) => {
                const isDown = stage.pos === 'down'
                const isError = stage.status === 'error'
                const isSelected = selectedStage === stage.id
                return (
                  <button
                    key={stage.id}
                    type="button"
                    role="listitem"
                    aria-label={`${stage.label} — ${isError ? 'Error' : 'Nominal'}`}
                    aria-pressed={isSelected}
                    onClick={() => setSelectedStage(stage.id)}
                    onKeyDown={(e) => handleStageKey(e, stage)}
                    className={`relative z-10 flex flex-col items-center cursor-pointer group select-none bg-transparent border-0 p-0
                      transition-transform duration-200 hover:scale-105
                      ${isDown ? 'translate-y-14' : '-translate-y-14'}`}
                  >
                    {isError && (
                      <div
                        className="absolute w-24 h-24 bg-error/20 rounded-full animate-ping z-0"
                        style={{ top: '-16px', left: '-16px' }}
                        aria-hidden="true"
                      />
                    )}
                    <div className={`w-16 h-16 flex items-center justify-center relative z-10 transition-all duration-200
                      ${isError
                        ? 'bg-surface border-2 border-error'
                        : isSelected
                          ? 'bg-surface border-2 border-primary-fixed'
                          : 'bg-surface border border-outline-variant group-hover:border-primary-fixed-dim'
                      }`}
                    >
                      <span className={`material-symbols-outlined ${isError ? 'text-error' : 'text-primary-fixed-dim'}`} aria-hidden="true">
                        {stage.icon}
                      </span>
                    </div>
                    <div className={`mt-3 px-2 py-1 font-label-caps text-label-caps
                      ${isError ? 'bg-error-container text-on-error-container' : 'bg-surface-variant text-on-surface'}`}
                    >
                      {stage.label}
                    </div>
                    <div className={`font-data-sm text-data-sm mt-1 ${isError ? 'text-error' : 'text-on-surface-variant'}`}>
                      {isError ? `ERR-${stage.id}` : stage.id}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Inline Diagnostic Terminal */}
          <div
            className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[600px] bg-glass border border-secondary p-6 font-data-display z-30"
            aria-live="polite"
            aria-label={`Diagnostic terminal for stage ${selectedStage}`}
          >
            <div className="flex justify-between items-center mb-4 border-b border-outline pb-2">
              <span className="text-secondary uppercase text-xs tracking-wider">
                Diagnostic Terminal :: {selectedStage}
              </span>
              <span className="text-on-surface-variant text-xs">
                {selected?.status === 'error' ? 'A247293C3' : 'NOMINAL'}
              </span>
            </div>
            <div className="space-y-2 text-sm">
              {msgs.map((m, i) => <TerminalLine key={i} {...m} />)}
              <div className="flex gap-2 mt-4" aria-hidden="true">
                <span className="text-primary-fixed animate-pulse">_</span>
              </div>
            </div>
            {selected?.status === 'error' && (
              <div className="mt-4 flex gap-2 pt-4 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => navigate('/defect')}
                  className="flex-1 py-2 bg-error-container text-on-error-container font-data-sm text-data-sm uppercase hover:opacity-80 transition-opacity duration-200 cursor-pointer"
                >
                  View Defect Analysis →
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/fix')}
                  className="flex-1 py-2 bg-primary-container text-on-primary-container font-data-sm text-data-sm uppercase hover:opacity-80 transition-opacity duration-200 cursor-pointer"
                >
                  View Fix Protocol →
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      {showModal && <DiagnosticModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
