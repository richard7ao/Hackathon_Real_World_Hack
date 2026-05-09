import { useNavigate, useLocation } from 'react-router-dom'

export default function TopBar({ onDiagnostic }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const navBtn = (label, path) => {
    const active = pathname === path || (path !== '/' && pathname.startsWith(path))
    return (
      <button
        onClick={() => navigate(path)}
        className={`font-data-sm text-data-sm uppercase tracking-wider transition-colors duration-200 ${
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
        <span className="font-data-display font-bold text-primary-fixed uppercase tracking-widest text-sm">
          LOOPBACK
        </span>
        <nav className="hidden md:flex gap-6 items-center">
          {navBtn('FMECA', '/defect')}
          {navBtn('Telemetry', '/fix')}
          {navBtn('System Status', '/')}
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <button
          onClick={onDiagnostic}
          className="bg-primary-container text-on-primary-container font-data-sm text-data-sm uppercase px-4 py-2 border border-primary-container hover:bg-transparent hover:text-primary-container transition-colors duration-200"
        >
          Execute AI Diagnostic
        </button>
        <div className="flex gap-4">
          <span className="material-symbols-outlined text-on-surface-variant hover:text-primary cursor-pointer select-none">
            notifications_active
          </span>
          <span className="material-symbols-outlined text-on-surface-variant hover:text-primary cursor-pointer select-none">
            settings
          </span>
          <span
            className="material-symbols-outlined text-on-surface-variant hover:text-primary cursor-pointer select-none"
            onClick={onDiagnostic}
          >
            terminal
          </span>
        </div>
      </div>
    </header>
  )
}
