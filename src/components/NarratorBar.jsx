import { useNarrator } from '../NarratorContext'

export default function NarratorBar() {
  const { toggle, speaking } = useNarrator()

  return (
    <div className="fixed bottom-6 right-6 z-[200] flex items-center gap-3">
      {speaking && (
        <div className="flex items-center gap-2 bg-surface/95 hairline backdrop-blur-md px-3 py-2 animate-rise">
          <span className="w-1.5 h-1.5 bg-cyan rounded-full animate-ping" aria-hidden="true" />
          <span className="font-mono text-mono-xs text-cyan">Hugo · narrating</span>
        </div>
      )}
      <button
        onClick={toggle}
        aria-label={speaking ? 'Stop narration' : 'Play narration'}
        title={speaking ? 'Stop narration' : 'Play narration'}
        className={`w-10 h-10 grid place-items-center hairline transition-all duration-200 backdrop-blur-md
          ${speaking
            ? 'bg-cyan/10 border-cyan text-cyan hover:bg-cyan/20'
            : 'bg-surface/80 text-text-dim hover:text-cyan hover:border-cyan'
          }`}
      >
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
          {speaking ? 'stop' : 'volume_up'}
        </span>
      </button>
    </div>
  )
}
