import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import Sidebar from '../components/Sidebar'
import DiagnosticModal from '../components/DiagnosticModal'

const AI_LINES = [
  { prefix: '>', text: 'Connecting to ERP...',          type: 'cmd' },
  { prefix: '>', text: 'success',                       type: 'ok'  },
  { prefix: '>', text: 'Reading data from inventory',   type: 'cmd' },
  { prefix: '+', text: 'Hugo AI: We have 3 late items', type: 'ai'  },
  { prefix: '>', text: 'Thinking...',                   type: 'cmd' },
  { prefix: '+', text: 'Hugo AI: Follow up with suppliers', type: 'ai' },
  { prefix: '+', text: 'Hugo AI: Increase safety stock by 5', type: 'ai' },
]

const FMECA_SCORES = [
  { label: 'Severity (S)',    value: '8', color: 'text-error',         desc: 'Severity score 8 out of 10 — high impact' },
  { label: 'Occurrence (O)', value: '4', color: 'text-primary-fixed',  desc: 'Occurrence score 4 out of 10 — moderate frequency' },
  { label: 'Detection (D)',  value: '3', color: 'text-secondary',      desc: 'Detection score 3 out of 10 — detectable' },
]

function useScrapCost(initial = 12405.89) {
  const [cost, setCost] = useState(initial)
  useEffect(() => {
    const id = setInterval(() => {
      setCost(c => +(c + Math.random() * 12 + 2).toFixed(2))
    }, 1800)
    return () => clearInterval(id)
  }, [])
  return cost
}

export default function TheDefect() {
  const navigate = useNavigate()
  const [showDiag, setShowDiag]           = useState(false)
  const [visibleLines, setVisibleLines]   = useState(0)
  const scrapCost                         = useScrapCost()

  useEffect(() => {
    if (visibleLines >= AI_LINES.length) return
    const id = setTimeout(() => setVisibleLines(v => v + 1), 750)
    return () => clearTimeout(id)
  }, [visibleLines])

  const [dollars, cents] = scrapCost.toFixed(2).split('.')

  return (
    <div className="bg-background text-on-surface font-body-md min-h-screen flex flex-col antialiased">
      <TopBar onDiagnostic={() => setShowDiag(true)} />

      <div className="flex flex-1 mt-16 overflow-hidden">
        <Sidebar active="fleet" onNewAnalysis={() => window.location.reload()} />

        <main id="main-content" className="flex-1 overflow-y-auto blueprint-grid">
          <div className="p-panel-padding max-w-[1600px] mx-auto space-y-6">

            {/* Hero — Defect Visualization */}
            <section
              className="relative w-full h-[520px] bg-surface-container-lowest border border-outline-variant overflow-hidden"
              aria-label="Defect visualization for component A247293C3"
            >
              <div className="absolute top-4 right-4 z-20 bg-surface-container/80 backdrop-blur-md px-2 py-1 border border-outline-variant">
                <span className="font-label-caps text-label-caps text-on-surface-variant">REF-A247293C3</span>
              </div>

              {/* CSS SEM-like visualization */}
              <div className="absolute inset-0 bg-surface-container-lowest" aria-hidden="true">
                <svg width="100%" height="100%" className="opacity-40">
                  <defs>
                    <pattern id="circuit" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
                      <rect width="80" height="80" fill="none" />
                      <line x1="0" y1="40" x2="80" y2="40" stroke="#444933" strokeWidth="0.5" />
                      <line x1="40" y1="0" x2="40" y2="80" stroke="#444933" strokeWidth="0.5" />
                      <rect x="20" y="20" width="40" height="40" fill="none" stroke="#333533" strokeWidth="0.5" />
                      <circle cx="40" cy="40" r="3" fill="#1a1c1a" stroke="#444933" strokeWidth="0.5" />
                      <line x1="20" y1="40" x2="30" y2="40" stroke="#8e9378" strokeWidth="0.3" />
                      <line x1="50" y1="40" x2="60" y2="40" stroke="#8e9378" strokeWidth="0.3" />
                    </pattern>
                    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#c7f300" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="#121412" stopOpacity="0" />
                    </radialGradient>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#circuit)" />
                  <ellipse cx="45%" cy="38%" rx="120" ry="90" fill="url(#glow)" />
                  {Array.from({ length: 20 }, (_, i) => (
                    <g key={i}>
                      <line x1={i * 90} y1="0" x2={i * 90} y2="100%" stroke="#1a1c1a" strokeWidth="1.5" />
                      <line x1="0" y1={i * 60} x2="100%" y2={i * 60} stroke="#1a1c1a" strokeWidth="1.5" />
                    </g>
                  ))}
                  <rect x="38%" y="28%" width="16%" height="18%"
                    fill="rgba(199,243,0,0.05)" stroke="#c7f300" strokeWidth="1.5"
                    strokeDasharray="6 3" />
                </svg>
              </div>

              {/* Overlay markers */}
              <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                <div className="absolute" style={{ top: '28%', left: '38%' }}>
                  <div className="w-32 h-24 border-2 border-primary-fixed bg-primary-fixed/10 relative">
                    <div className="absolute -top-6 -left-px bg-primary-fixed text-on-primary-fixed font-data-sm px-2 py-1 text-xs">
                      A247293C3
                    </div>
                  </div>
                </div>
                <div className="absolute" style={{ bottom: '25%', right: '28%' }}>
                  <div className="w-16 h-16 border border-secondary bg-secondary/10 relative">
                    <div className="absolute -top-5 -left-px text-secondary font-data-sm text-xs">X219128</div>
                  </div>
                </div>
                {/* Scan line — hidden when reduce-motion is preferred via CSS */}
                <div className="absolute left-0 right-0 h-px bg-primary-fixed/30 scanline" aria-hidden="true" />
              </div>

              {/* AI Terminal overlay */}
              <div
                className="absolute bottom-6 left-6 w-80 bg-surface-container/90 backdrop-blur-xl border border-secondary p-4 shadow-2xl z-10"
                role="complementary"
                aria-label="AI analysis output"
              >
                <div className="flex justify-between items-center mb-4 border-b border-secondary/30 pb-2">
                  <span className="font-data-sm text-data-sm text-secondary">A247293C3_ANALYSIS</span>
                  <span className="material-symbols-outlined text-secondary text-sm" aria-hidden="true">terminal</span>
                </div>
                <div role="log" aria-live="polite" className="font-data-sm text-data-sm text-on-surface space-y-1">
                  {AI_LINES.slice(0, visibleLines).map(({ prefix, text, type }, i) => (
                    <p key={i} className={type === 'ai' ? 'pl-4 border-l border-secondary/30 text-secondary' : 'opacity-70'}>
                      <span aria-hidden="true" className="mr-1">{type === 'ai' ? '+' : prefix}</span>
                      {text}
                    </p>
                  ))}
                  {visibleLines < AI_LINES.length && (
                    <div className="flex items-center gap-1 mt-2" aria-hidden="true">
                      <span className="w-2 h-4 bg-secondary animate-pulse inline-block" />
                    </div>
                  )}
                </div>
                {visibleLines >= AI_LINES.length && (
                  <button
                    type="button"
                    onClick={() => navigate('/fix')}
                    className="mt-4 w-full py-2 bg-primary-container text-on-primary-container font-data-sm text-data-sm uppercase hover:opacity-80 transition-opacity duration-200 cursor-pointer"
                  >
                    View Fix Protocol →
                  </button>
                )}
              </div>

              {/* Stage badge */}
              <div className="absolute top-4 left-4 z-10">
                <div className="bg-error-container border border-error px-3 py-1" role="status">
                  <span className="font-label-caps text-label-caps text-on-error-container">
                    STG-04 COW_BONDING :: CRITICAL
                  </span>
                </div>
              </div>
            </section>

            {/* Data panels */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* FMECA Card */}
              <section className="bg-surface-container border border-outline-variant p-6 relative col-span-1 lg:col-span-2" aria-label="FMECA scoring">
                <div className="absolute top-4 right-4" aria-hidden="true">
                  <span className="font-label-caps text-label-caps text-on-surface-variant">MOD-FMECA-01</span>
                </div>
                <h2 className="font-headline-lg text-headline-lg text-primary mb-6">FMECA Scoring</h2>

                <div className="grid grid-cols-3 gap-4 mb-8" role="list" aria-label="Risk scores">
                  {FMECA_SCORES.map(({ label, value, color, desc }) => (
                    <div key={label} className="border border-outline/30 p-4" role="listitem">
                      <span className="font-label-caps text-label-caps text-on-surface-variant block mb-1">{label}</span>
                      <span className={`font-data-display text-2xl ${color}`} aria-label={desc}>{value}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-end justify-between border-t border-outline-variant pt-4">
                  <div>
                    <span className="font-label-caps text-label-caps text-on-surface-variant block mb-1">
                      Risk Priority Number (RPN)
                    </span>
                    <span className="font-headline-xl text-headline-xl text-primary" aria-label="Total RPN: 96">96</span>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <div className="bg-error-container text-on-error px-3 py-1 border border-error" role="alert">
                      <span className="font-data-sm text-data-sm uppercase">Critical Threshold Exceeded</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate('/fix')}
                      className="bg-primary-container text-on-primary-container px-4 py-2 font-data-sm text-data-sm uppercase hover:opacity-80 transition-opacity duration-200 cursor-pointer"
                    >
                      Initiate Fix Protocol →
                    </button>
                  </div>
                </div>
              </section>

              {/* Live Scrap Cost */}
              <section className="bg-surface-container border border-outline-variant p-6 relative flex flex-col justify-between" aria-label="Live scrap cost counter">
                <div className="absolute top-4 right-4" aria-hidden="true">
                  <span className="font-label-caps text-label-caps text-on-surface-variant">MOD-COST-02</span>
                </div>
                <div>
                  <h2 className="font-data-display text-data-display text-on-surface-variant mb-2 uppercase">
                    Live Scrap Cost
                  </h2>
                  <div
                    className="font-headline-xl text-headline-xl text-primary-fixed font-data-display tracking-tighter tabular-nums"
                    aria-live="polite"
                    aria-atomic="true"
                    aria-label={`Current scrap cost: $${dollars}.${cents}`}
                  >
                    ${dollars}<span className="text-xl text-primary-fixed-dim">.{cents}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="w-2 h-2 rounded-full bg-error animate-pulse" aria-hidden="true" />
                    <span className="font-label-caps text-label-caps text-error" aria-hidden="true">LIVE</span>
                  </div>
                </div>
                <div className="mt-8 border-t border-outline-variant pt-4">
                  <p className="font-data-sm text-data-sm text-on-surface-variant">IPC-A-610 Standards Violation</p>
                  <ul className="mt-2 space-y-1" aria-label="Specific violations">
                    <li className="font-data-sm text-data-sm text-error">&gt; Target pad misalignment &gt; 25%</li>
                    <li className="font-data-sm text-data-sm text-error">&gt; Solder bridge detected on pins 4-5</li>
                  </ul>
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>

      <style>{`
        .scanline {
          animation: scanline 4s linear infinite;
        }
        @keyframes scanline {
          0%   { top: 0%;   opacity: 0; }
          5%   { opacity: 1; }
          95%  { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .scanline { animation: none; display: none; }
        }
      `}</style>

      {showDiag && <DiagnosticModal onClose={() => setShowDiag(false)} />}
    </div>
  )
}
