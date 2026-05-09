import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

const TITLES = {
  '/':       { eyebrow: 'SURFACE / 01', title: 'Pipeline',   sub: 'Live fleet · 8-stage CoWoS-L line' },
  '/defect': { eyebrow: 'SURFACE / 02', title: 'Defect',     sub: 'Failure mode A247293C3 · STG-04' },
  '/fix':    { eyebrow: 'SURFACE / 03', title: 'Resolution', sub: 'Recommended corrective protocol' },
}

function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

const pad = (n) => String(n).padStart(2, '0')

export default function TopBar({ onDiagnostic }) {
  const { pathname } = useLocation()
  const t = TITLES[pathname] ?? TITLES['/']
  const now = useClock()
  const ts = `${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())} UTC`

  return (
    <header className="fixed top-0 inset-x-0 z-50 h-16 border-b border-rule bg-bg/85 backdrop-blur-md">
      <div className="h-full px-8 flex items-center justify-between gap-6">
        <div className="flex items-baseline gap-5 min-w-0">
          <span className="font-mono text-eyebrow text-cyan whitespace-nowrap">{t.eyebrow}</span>
          <span className="hidden sm:block w-px h-4 bg-rule" />
          <h1 className="font-display text-[22px] tracking-[-0.03em] leading-none truncate">
            {t.title}
            <span className="text-text-muted font-mono text-mono-sm tracking-normal ml-3">/ {t.sub}</span>
          </h1>
        </div>

        <div className="flex items-center gap-5 shrink-0">
          <div className="hidden lg:flex items-center gap-2 font-mono text-mono-xs text-text-dim">
            <span className="relative flex h-2 w-2">
              <span className="absolute inset-0 rounded-full bg-ok animate-ping2" />
              <span className="relative rounded-full bg-ok h-2 w-2" />
            </span>
            <span>SYS · NOMINAL</span>
            <span className="text-text-muted ml-3 tabular-nums">{ts}</span>
          </div>

          <button
            onClick={onDiagnostic}
            className="group relative pl-4 pr-3 py-2 bg-surface hairline-strong flex items-center gap-3
                       hover:bg-surface-2 transition-colors"
          >
            <span className="font-mono text-mono-xs uppercase tracking-[0.18em] text-text">
              Run diagnostic
            </span>
            <span className="font-mono text-mono-xs text-cyan border-l border-rule pl-3">⌘D</span>
          </button>

          <div className="flex gap-3 text-text-dim">
            <button className="material-symbols-outlined text-[20px] hover:text-cyan" aria-label="Notifications">notifications</button>
            <button className="material-symbols-outlined text-[20px] hover:text-cyan" aria-label="Profile">person</button>
          </div>
        </div>
      </div>
    </header>
  )
}
