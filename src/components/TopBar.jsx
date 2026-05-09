import { useNavigate, useLocation } from 'react-router-dom'

const ICON_BTN = 'p-1 text-on-surface-variant hover:text-primary cursor-pointer transition-colors duration-200 rounded'

export default function TopBar({ onDiagnostic }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const isActive = (path) =>
    path === '/' ? pathname === '/' : pathname.startsWith(path)

  const navBtn = (label, path) => {
    const active = isActive(path)
    return (
      <button
        type="button"
        onClick={() => navigate(path)}
        aria-current={active ? 'page' : undefined}
        className={`font-data-sm text-data-sm uppercase tracking-wider transition-colors duration-200 cursor-pointer ${
          active
            ? 'text-primary border-b-2 border-primary pb-1'
            : 'text-on-surface-variant hover:text-primary'
        }`}
      >
        {label}
      </button>
    )
  }

  return (
    <header className="bg-background border-b border-outline-variant flex justify-between items-center px-8 h-16 w-full z-50 fixed top-0">
      <div className="flex items-center gap-6">
        <span
          className="font-data-display font-bold text-primary-fixed uppercase tracking-widest text-sm"
          aria-label="Loopback — Advanced Packaging OS"
        >
          LOOPBACK
        </span>
        <nav aria-label="Primary navigation" className="hidden md:flex gap-6 items-center">
          {navBtn('FMECA', '/defect')}
          {navBtn('Telemetry', '/fix')}
          {navBtn('System Status', '/')}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onDiagnostic}
          className="bg-primary-container text-on-primary-container font-data-sm text-data-sm uppercase px-4 py-2 border border-primary-container hover:bg-transparent hover:text-primary-container transition-colors duration-200 cursor-pointer"
        >
          Execute AI Diagnostic
        </button>

        <div className="flex gap-1" role="toolbar" aria-label="App controls">
          <button
            type="button"
            aria-label="Notifications"
            className={ICON_BTN}
          >
            <span className="material-symbols-outlined">notifications_active</span>
          </button>
          <button
            type="button"
            aria-label="Settings"
            className={ICON_BTN}
          >
            <span className="material-symbols-outlined">settings</span>
          </button>
          <button
            type="button"
            aria-label="Open diagnostic terminal"
            onClick={onDiagnostic}
            className={ICON_BTN}
          >
            <span className="material-symbols-outlined">terminal</span>
          </button>
        </div>
      </div>
    </header>
  )
}
