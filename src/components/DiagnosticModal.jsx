import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const SEQUENCE = [
  { delay: 200,  type: 'cmd',   text: 'COWOS DIAGNOSTIC SYSTEM v2.4.1' },
  { delay: 500,  type: 'cmd',   text: 'Scanning all 8 CoWoS-L stages...' },
  { delay: 900,  type: 'ok',    text: 'STG-01 WAFER_IN ............. NOMINAL  (98.1%)' },
  { delay: 1200, type: 'ok',    text: 'STG-02 BUMPING .............. NOMINAL  (97.4%)' },
  { delay: 1500, type: 'ok',    text: 'STG-03 INTERPOSER ........... NOMINAL  (96.8%)' },
  { delay: 1900, type: 'error', text: 'STG-04 COW_BONDING .......... CRITICAL !!!' },
  { delay: 2200, type: 'sub',   text: '  └─ Thermal anomaly at zone 4: +2.4°C above threshold' },
  { delay: 2500, type: 'sub',   text: '  └─ Defect code: A247293C3 / IPC-A-610 violation' },
  { delay: 2800, type: 'sub',   text: '  └─ Est. yield impact: -4.2% / Scrap accumulating' },
  { delay: 3200, type: 'warn',  text: 'STG-07 REFLOW ............... WARNING  (95.1%)' },
  { delay: 3500, type: 'sub',   text: '  └─ Temp variation: ±0.8°C — monitor closely' },
  { delay: 3800, type: 'ok',    text: 'STG-05/06/08 ................ NOMINAL' },
  { delay: 4300, type: 'ai',    text: '✦ Hugo AI: Analyzing root cause correlation...' },
  { delay: 4800, type: 'ai',    text: '✦ Hugo AI: Thermal runaway linked to heater block B' },
  { delay: 5200, type: 'ai',    text: '✦ Hugo AI: 3 late supply items correlate with onset' },
  { delay: 5700, type: 'ai',    text: '✦ Hugo AI: Fix protocol ready — RPN 187 → 42' },
  { delay: 6300, type: 'done',  text: 'DIAGNOSIS COMPLETE. Execute fix protocol to resolve.' },
]

const COLORS = {
  cmd:   'text-text-dim',
  ok:    'text-ok',
  warn:  'text-amber',
  error: 'text-danger',
  sub:   'text-text-muted',
  ai:    'text-cyan',
  done:  'text-cyan font-medium',
}

export default function DiagnosticModal({ onClose }) {
  const navigate = useNavigate()
  const [visible, setVisible] = useState([])
  const [done, setDone] = useState(false)
  const closeRef = useRef(null)
  const outputRef = useRef(null)

  useEffect(() => { closeRef.current?.focus() }, [])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    const timers = SEQUENCE.map(({ delay, type, text }) =>
      setTimeout(() => {
        setVisible((v) => [...v, { type, text }])
        requestAnimationFrame(() => {
          if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight
        })
      }, delay)
    )
    const doneTimer = setTimeout(() => setDone(true), 6600)
    return () => {
      timers.forEach(clearTimeout)
      clearTimeout(doneTimer)
    }
  }, [])

  const handleFix = () => { onClose(); navigate('/fix') }

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-ink/50 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="diag-title"
    >
      <div className="relative w-[760px] max-w-[92vw] max-h-[80vh] bg-surface hairline-strong corner-ticks flex flex-col overflow-hidden shadow-2xl">
        <span className="tick-tr" />
        <span className="tick-bl" />

        <div className="flex items-center justify-between px-6 py-4 border-b border-rule">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-cyan text-[18px]" aria-hidden="true">terminal</span>
            <span id="diag-title" className="font-mono text-mono-xs uppercase tracking-[0.18em] text-text-dim">
              ai_diagnostic · CoWoS-STATION-A42
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className={`font-mono text-mono-xs ${done ? 'text-ok' : 'text-amber blink'}`} aria-live="polite">
              {done ? '● COMPLETE' : '● SCANNING'}
            </span>
            <button
              ref={closeRef}
              onClick={onClose}
              aria-label="Close diagnostic modal"
              className="material-symbols-outlined text-text-dim hover:text-cyan transition-colors"
            >
              close
            </button>
          </div>
        </div>

        <div
          ref={outputRef}
          role="log"
          aria-live="polite"
          className="flex-1 overflow-y-auto scrollbar-thin px-6 py-5 font-mono text-mono-sm space-y-1.5 bg-surface-2/40"
        >
          {visible.map(({ type, text }, i) => (
            <div key={i} className={`flex gap-2 animate-rise ${COLORS[type]}`}>
              <span className="text-text-muted shrink-0" aria-hidden="true">{type === 'sub' ? ' ' : '›'}</span>
              <span className="whitespace-pre">{text}</span>
            </div>
          ))}
          {!done && (
            <div className="flex gap-2 text-text-dim" aria-hidden="true">
              <span className="text-text-muted">›</span>
              <span className="bg-cyan text-white px-1 animate-flicker">█</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-rule bg-surface-2/40">
          <div className="font-mono text-mono-xs text-text-muted">
            <span className="text-text-dim">events</span>
            <span className="ml-2 tabular-nums text-text">{visible.length}</span>
            <span className="text-text-muted">/</span>
            <span className="tabular-nums text-text-muted">{SEQUENCE.length}</span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 hairline font-mono text-mono-xs uppercase tracking-[0.18em] text-text-dim hover:bg-surface-2 transition-colors"
            >
              Dismiss
            </button>
            <button
              onClick={handleFix}
              disabled={!done}
              className={`group relative px-5 py-2 font-mono text-mono-xs uppercase tracking-[0.18em] flex items-center gap-2 transition-colors
                ${done ? 'bg-cyan text-white hover:bg-cyan-deep cursor-pointer' : 'bg-surface-2 text-text-muted cursor-not-allowed'}`}
            >
              Initiate fix protocol <span className="text-base leading-none">→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
