import { useNavigate } from 'react-router-dom'

const NAV_ITEMS = [
  { label: 'Fleet', icon: 'precision_manufacturing', key: 'fleet', path: '/' },
  { label: 'Thermal', icon: 'thermostat', key: 'thermal', path: '/fix' },
  { label: 'Vacuum', icon: 'vibration', key: 'vacuum', path: '/' },
  { label: 'Logs', icon: 'database', key: 'logs', path: '/defect' },
]

export default function Sidebar({ active, onNewAnalysis }) {
  const navigate = useNavigate()

  return (
    <aside className="bg-surface-container-low w-64 border-r border-outline-variant flex flex-col h-full py-panel-padding z-40 flex-shrink-0">
      <div className="px-6 mb-8 flex items-center gap-4">
        <div className="w-10 h-10 rounded bg-surface-variant border border-outline-variant flex items-center justify-center">
          <span className="material-symbols-outlined text-primary-fixed">engineering</span>
        </div>
        <div>
          <div className="font-data-sm text-data-sm uppercase text-primary-fixed tracking-wider">
            OPERATOR_01
          </div>
          <div className="font-label-caps text-label-caps text-on-surface-variant">
            CoWoS-STATION-A42
          </div>
        </div>
      </div>

      <nav className="flex-1 flex flex-col gap-1 px-4">
        {NAV_ITEMS.map(({ label, icon, key, path }) => {
          const isActive = active === key
          return (
            <button
              key={key}
              onClick={() => navigate(path)}
              className={`flex items-center gap-3 px-4 py-3 w-full text-left transition-all duration-150 font-data-sm text-data-sm uppercase tracking-wider ${
                isActive
                  ? 'bg-primary-container text-on-primary-container font-bold border-l-4 border-primary'
                  : 'text-on-surface-variant hover:bg-surface-bright border-l-4 border-transparent'
              }`}
            >
              <span className="material-symbols-outlined text-sm">{icon}</span>
              {label}
            </button>
          )
        })}
      </nav>

      <div className="px-6 mt-auto">
        <button
          onClick={onNewAnalysis}
          className="w-full py-2 border border-secondary text-secondary font-data-sm text-data-sm uppercase tracking-wider hover:bg-secondary hover:text-on-secondary transition-colors duration-200 mb-6"
        >
          New Analysis
        </button>
        <div className="flex gap-4">
          <span className="material-symbols-outlined text-on-surface-variant hover:text-primary cursor-pointer select-none">
            help
          </span>
          <span className="material-symbols-outlined text-on-surface-variant hover:text-primary cursor-pointer select-none">
            code
          </span>
        </div>
      </div>
    </aside>
  )
}
