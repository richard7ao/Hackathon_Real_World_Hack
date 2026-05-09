import { useNarrator } from '../NarratorContext'

export default function NarratorBar() {
  const { muted, toggleMuted, speaking } = useNarrator()

  return (
    <div className="fixed bottom-6 right-6 z-[200] flex items-center gap-3">
      {speaking && !muted && (
        <div className="flex items-center gap-2 bg-surface/95 hairline backdrop-blur-md px-3 py-2 animate-rise">
          <span className="w-1.5 h-1.5 bg-cyan rounded-full animate-ping" aria-hidden="true" />
          <span className="font-mono text-mono-xs text-cyan">Hugo · narrating</span>
        </div>
      )}
      <button
        onClick={toggleMuted}
        aria-label={muted ? 'Enable narration' : 'Mute narration'}
        title={muted ? 'Enable narration' : 'Mute narration'}
        className={`w-10 h-10 grid place-items-center hairline transition-all duration-200 backdrop-blur-md
          ${muted
            ? 'bg-surface/80 text-text-dim hover:text-cyan hover:border-cyan'
            : 'bg-cyan/10 border-cyan text-cyan hover:bg-cyan/20'
          }`}
      >
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
          {muted ? 'mic_off' : 'mic'}
        </span>
      </button>
    </div>
  )
}
