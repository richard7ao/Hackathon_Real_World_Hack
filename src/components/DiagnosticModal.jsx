import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const SEQUENCE = [
  { delay: 200,  type: 'cmd',   text: 'LOOPBACK DIAGNOSTIC SYSTEM v2.4.1' },
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

export default function DiagnosticModal({ onClose }) {
  const navigate = useNavigate()
  const [visible, setVisible] = useState([])
  const [done, setDone] = useState(false)

  useEffect(() => {
    const timers = SEQUENCE.map(({ delay, type, text }) =>
      setTimeout(() => setVisible(v => [...v, { type, text }]), delay)
    )
    const doneTimer = setTimeout(() => setDone(true), 6600)
    return () => { timers.forEach(clearTimeout); clearTimeout(doneTimer) }
  }, [])

  const colorFor = (type) => {
    if (type === 'error') return 'text-error'
    if (type === 'warn')  return 'text-yellow-400'
    if (type === 'ok')    return 'text-primary-fixed'
    if (type === 'ai')    return 'text-secondary'
    if (type === 'done')  return 'text-primary-container font-bold'
    if (type === 'sub')   return 'text-on-surface-variant'
    return 'text-on-surface'
  }

  const handleFix = () => { onClose(); navigate('/fix') }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-sm">
      <div className="w-[720px] max-h-[80vh] border border-secondary bg-surface-container-low flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-outline-variant px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-secondary text-sm">terminal</span>
            <span className="font-data-sm text-data-sm text-secondary uppercase tracking-wider">
              AI Diagnostic Terminal :: CoWoS-STATION-A42
            </span>
          </div>
          <button
            onClick={onClose}
            className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors select-none"
          >
            close
          </button>
        </div>

        {/* Terminal output */}
        <div className="flex-1 overflow-y-auto terminal-scroll px-6 py-4 font-data-sm text-data-sm space-y-1">
          {visible.map(({ type, text }, i) => (
            <div key={i} className={`flex gap-2 ${colorFor(type)}`}>
              {type !== 'sub' && <span className="text-outline shrink-0">&gt;</span>}
              {type === 'sub' && <span className="text-outline shrink-0 invisible">&gt;</span>}
              <span>{text}</span>
            </div>
          ))}
          {!done && (
            <div className="flex gap-2 text-on-surface">
              <span className="text-outline">&gt;</span>
              <span className="text-primary-fixed animate-pulse">_</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-outline-variant px-6 py-4 flex justify-between items-center">
          <span className="font-label-caps text-label-caps text-on-surface-variant">
            {done ? 'SCAN COMPLETE' : 'SCANNING...'}
          </span>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-outline text-on-surface-variant font-data-sm text-data-sm uppercase hover:bg-surface-bright transition-colors"
            >
              Dismiss
            </button>
            <button
              onClick={handleFix}
              disabled={!done}
              className={`px-4 py-2 font-data-sm text-data-sm uppercase transition-colors ${
                done
                  ? 'bg-primary-container text-on-primary-container hover:opacity-80 cursor-pointer'
                  : 'bg-surface-variant text-on-surface-variant cursor-not-allowed opacity-50'
              }`}
            >
              Initiate Fix Protocol →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
