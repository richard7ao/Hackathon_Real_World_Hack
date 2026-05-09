import { NavLink, useNavigate } from 'react-router-dom'

const NAV = [
  { label: 'PIPELINE',   sub: 'fleet · 8-stage line', icon: 'precision_manufacturing', path: '/',       index: '01' },
  { label: 'DEFECT',     sub: 'analysis · A247293C3', icon: 'biotech',                 path: '/defect', index: '02' },
  { label: 'RESOLUTION', sub: 'fix · RPN 187 → 42',   icon: 'auto_fix_high',           path: '/fix',    index: '03' },
]

const META = [
  ['UPTIME',  '413:21:08'],
  ['NODES',   '1,024 / 1,024'],
  ['REGION',  'TPE-N3 · A42'],
  ['BUILD',   'v2.4.1 · stable'],
]

export default function Sidebar() {
  const navigate = useNavigate()

  return (
    <aside className="w-72 shrink-0 border-r border-rule bg-bg/70 backdrop-blur flex flex-col h-full">
      <div className="px-6 pt-6 pb-5 border-b border-rule">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 grid place-items-center bg-cyan/10 hairline">
            <span className="font-mono text-cyan text-[18px] leading-none">◐</span>
          </div>
          <div className="leading-tight">
            <div className="font-display text-[20px] tracking-[-0.03em] leading-none">loopback</div>
            <div className="font-mono text-mono-xs text-text-muted mt-1.5">operator_01 · A42</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin py-3" aria-label="Primary">
        <div className="px-6 mb-3 flex items-center justify-between">
          <span className="font-mono text-eyebrow text-text-muted">SURFACES</span>
          <span className="font-mono text-eyebrow text-text-muted">{NAV.length}</span>
        </div>
        <ul className="px-3 flex flex-col gap-1">
          {NAV.map(({ label, sub, icon, path, index }) => (
            <li key={path}>
              <NavLink
                to={path}
                end={path === '/'}
                className={({ isActive }) =>
                  `group relative flex items-start gap-3 px-3 py-3 transition-all duration-200
                   ${isActive
                    ? 'bg-surface text-text shadow-sm'
                    : 'text-text-dim hover:bg-surface/60 hover:text-text'}`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`absolute left-0 top-3 bottom-3 w-px transition-all duration-300
                        ${isActive ? 'bg-cyan' : 'bg-transparent group-hover:bg-rule'}`}
                    />
                    <span className="font-mono text-mono-xs text-text-muted w-6 mt-1 tabular-nums">{index}</span>
                    <span className={`material-symbols-outlined text-[18px] mt-0.5 ${isActive ? 'text-cyan' : ''}`}>
                      {icon}
                    </span>
                    <span className="flex-1 leading-tight">
                      <span className="block font-display text-[15px] tracking-[-0.01em]">{label}</span>
                      <span className="block font-mono text-mono-xs text-text-muted mt-1">{sub}</span>
                    </span>
                    {isActive && <span className="material-symbols-outlined text-cyan text-[16px] mt-1">arrow_outward</span>}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="mt-8 mx-6 pt-5 border-t border-rule">
          <div className="font-mono text-eyebrow text-text-muted mb-3">TELEMETRY</div>
          <dl className="space-y-2.5">
            {META.map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-3">
                <dt className="font-mono text-mono-xs text-text-muted">{k}</dt>
                <dd className="font-mono text-mono-xs text-text tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </nav>

      <div className="p-5 border-t border-rule">
        <button
          onClick={() => navigate('/defect')}
          className="group relative w-full bg-cyan text-white font-display text-[14px] tracking-[-0.005em] py-3 px-4
                     flex items-center justify-between hover:bg-cyan-deep transition-colors"
        >
          <span>New analysis</span>
          <span className="font-mono text-mono-xs">↗</span>
        </button>
        <div className="flex items-center justify-between mt-4 px-1">
          <div className="flex gap-3 text-text-muted">
            <button className="material-symbols-outlined text-[18px] hover:text-cyan" aria-label="Help">help</button>
            <button className="material-symbols-outlined text-[18px] hover:text-cyan" aria-label="Terminal">terminal</button>
            <button className="material-symbols-outlined text-[18px] hover:text-cyan" aria-label="Settings">settings</button>
          </div>
          <span className="font-mono text-eyebrow text-text-muted">© 2026</span>
        </div>
      </div>
    </aside>
  )
}
