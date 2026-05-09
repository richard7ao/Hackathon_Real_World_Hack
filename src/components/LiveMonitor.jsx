import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { classifyWafer, enrich } from '../api'
import { useAnalysis } from '../AnalysisContext'

const CLASSIFIER = import.meta.env.VITE_CLASSIFIER_URL ?? 'http://localhost:8001'
const TICK_MS = 3500

const HUMAN_LABEL = {
  'center':    'Center cluster',
  'donut':     'Donut ring',
  'edge-loc':  'Edge-localised',
  'edge-ring': 'Edge ring',
  'loc':       'Localised cluster',
  'random':    'Random scatter',
  'scratch':   'Scratch',
  'near-full': 'Near-full failure',
  'none':      'Pass',
}

async function fetchSample() {
  // Hit the classifier service's /sample endpoint to get a real wafer image
  // from the WM811k dataset, plus the ground-truth label in a header.
  // ?_=<ts> defeats any browser/proxy caching that would otherwise pin the
  // first image returned for the whole session.
  const res = await fetch(`${CLASSIFIER}/sample?_=${Date.now()}`, {
    cache: 'no-store',
    headers: { 'cache-control': 'no-cache', pragma: 'no-cache' },
  })
  if (!res.ok) throw new Error(`/sample ${res.status}`)
  const trueLabel = res.headers.get('x-true-label') ?? '?'
  const blob = await res.blob()
  return {
    file: new File([blob], `wafer-${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' }),
    objectUrl: URL.createObjectURL(blob),
    trueLabel,
  }
}

function StatusPill({ pattern }) {
  const isDefect = pattern && pattern !== 'none'
  return (
    <span className={`font-mono text-eyebrow uppercase px-2 py-0.5 ${
      isDefect
        ? 'bg-danger/10 text-danger hairline border-danger'
        : 'bg-ok/10 text-ok hairline'
    }`}>
      {isDefect ? 'DEFECT' : 'PASS'}
    </span>
  )
}

export default function LiveMonitor({ onDefect }) {
  const navigate = useNavigate()
  const { update } = useAnalysis()
  const [running, setRunning] = useState(true)
  const [current, setCurrent] = useState(null)
  const [feed, setFeed] = useState([])
  const [counts, setCounts] = useState({ total: 0, defects: 0 })
  const [error, setError] = useState(null)
  const [latestDefect, setLatestDefect] = useState(null)
  const tickRef = useRef(null)
  const aliveRef = useRef(true)

  // Mark this instance alive so background fetches can no-op after unmount.
  // We deliberately do NOT revoke object URLs here — the latest defect's URL
  // is promoted into AnalysisContext and read by /defect and /fix. Revoking
  // would blank those pages whenever the user navigates away from /demo.
  // AnalysisContext owns its own URL lifecycle.
  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
    }
  }, [])

  async function runOne() {
    try {
      const sample = await fetchSample()
      const classified = await classifyWafer(sample.file)
      let enrichment = null
      try {
        enrichment = await enrich(classified.image_id, classified.defect_pattern, classified.confidence)
      } catch (e) {
        console.warn('[monitor] enrich failed', e)
      }

      if (!aliveRef.current) {
        URL.revokeObjectURL(sample.objectUrl)
        return
      }

      const isDefect = classified.defect_pattern !== 'none'
      const event = {
        ts: new Date(),
        pattern: classified.defect_pattern,
        confidence: classified.confidence,
        modelUsed: classified.model_used,
        trueLabel: sample.trueLabel,
        rpn: enrichment?.assessment?.fmeca?.rpn ?? null,
        milStd: enrichment?.assessment?.fmeca?.mil_std_1629a_category ?? null,
        category: enrichment?.assessment?.diagnosis?.likely_root_cause ?? null,
        objectUrl: sample.objectUrl,
        imageId: classified.image_id,
        enrichment,
      }

      setCurrent(prev => {
        if (prev?.objectUrl) URL.revokeObjectURL(prev.objectUrl)
        return event
      })
      setFeed(prev => [event, ...prev].slice(0, 8))
      setCounts(prev => ({ total: prev.total + 1, defects: prev.defects + (isDefect ? 1 : 0) }))
      setError(null)

      if (isDefect) {
        setLatestDefect(event)
        // Push real classifier output into the global analysis context so the
        // /defect and /fix pages render THIS defect (not the hardcoded
        // edge-ring fallback).
        update({
          defectPattern: classified.defect_pattern,
          imageId: classified.image_id,
          confidence: classified.confidence,
          enrichment,
          imagePreviewUrl: sample.objectUrl,
          correlation: null,
          fixResult: null,
        })
        if (onDefect) onDefect(event)
      }
    } catch (e) {
      console.error('[monitor]', e)
      setError(e.message ?? String(e))
    }
  }

  useEffect(() => {
    if (!running) return
    runOne()
    tickRef.current = setInterval(runOne, TICK_MS)
    return () => clearInterval(tickRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])

  return (
    <div className="bg-surface hairline-strong">
      <div className="flex items-center justify-between px-5 py-3 border-b border-rule bg-surface-2/40">
        <div className="flex items-center gap-3">
          <span className={`w-2 h-2 ${running ? 'bg-cyan animate-pulse' : 'bg-text-muted'}`} aria-hidden="true" />
          <span className="font-mono text-mono-xs uppercase tracking-[0.18em] text-text-dim">
            live monitor / cowos-station-a42
          </span>
        </div>
        <div className="flex items-center gap-4 font-mono text-mono-xs">
          <span className="text-text-muted">
            inspected <span className="text-text">{counts.total}</span> ·
            defects <span className="text-danger">{counts.defects}</span>
          </span>
          <button
            onClick={() => setRunning(r => !r)}
            className="font-mono text-mono-xs uppercase tracking-[0.18em] text-cyan hover:text-cyan-deep"
          >
            {running ? 'pause' : 'resume'}
          </button>
        </div>
      </div>

      {/* Escalation banner — fires the moment a defect is detected. Pushes
          the user into the FMECA pipeline so the demo stays continuous. */}
      {latestDefect && (
        <div className="flex items-center justify-between gap-4 px-5 py-3 bg-danger/10 border-b border-danger/40">
          <div className="flex items-center gap-3 font-mono text-mono-xs">
            <span className="bg-danger text-white px-2 py-0.5 uppercase tracking-[0.18em]">
              defect escalated
            </span>
            <span className="text-text">
              <strong>{latestDefect.pattern}</strong> on {latestDefect.imageId} ·
              RPN {latestDefect.rpn ?? '—'} ·
              {latestDefect.milStd ?? 'category pending'}
            </span>
          </div>
          <button
            onClick={() => navigate('/defect')}
            className="font-mono text-mono-xs uppercase tracking-[0.18em] bg-danger text-white px-4 py-1.5 hover:bg-danger/80"
          >
            investigate →
          </button>
        </div>
      )}

      <div className="grid grid-cols-12 gap-0">
        {/* Current wafer */}
        <div className="col-span-12 md:col-span-5 relative bg-ink h-[260px] flex items-center justify-center overflow-hidden">
          {current ? (
            <>
              <img
                src={current.objectUrl}
                alt={`Live wafer · ${HUMAN_LABEL[current.pattern]}`}
                className="absolute inset-0 m-auto h-full w-full object-contain p-6"
              />
              <div className="absolute top-3 left-3 flex items-center gap-2">
                <StatusPill pattern={current.pattern} />
                <span className="font-mono text-mono-xs text-bg/70">{current.imageId}</span>
              </div>
              <div className="absolute bottom-3 left-3 right-3 font-mono text-mono-xs text-bg/80 leading-snug">
                <div>
                  <span className="text-cyan">predicted</span> {current.pattern} ·
                  <span className="text-bg/60"> conf </span>{(current.confidence * 100).toFixed(1)}%
                </div>
                {current.rpn !== null && (
                  <div className="mt-0.5">
                    <span className="text-cyan">RPN</span> {current.rpn} ·
                    <span className="text-bg/60"> {current.milStd ?? ''}</span>
                  </div>
                )}
                <div className="mt-0.5 text-bg/50">via {current.modelUsed}</div>
              </div>
            </>
          ) : error ? (
            <div className="text-danger font-mono text-mono-xs px-4 text-center">
              monitor offline — {error}
            </div>
          ) : (
            <div className="text-bg/50 font-mono text-mono-xs">awaiting first sample…</div>
          )}
        </div>

        {/* Recent feed */}
        <div className="col-span-12 md:col-span-7 max-h-[260px] overflow-y-auto scrollbar-thin">
          <table className="w-full font-mono text-mono-xs">
            <thead className="sticky top-0 bg-surface-2/95 text-text-muted">
              <tr>
                <th className="text-left px-4 py-2 font-normal">time</th>
                <th className="text-left px-2 py-2 font-normal">predicted</th>
                <th className="text-left px-2 py-2 font-normal">conf</th>
                <th className="text-left px-2 py-2 font-normal">true</th>
                <th className="text-left px-2 py-2 font-normal">RPN</th>
              </tr>
            </thead>
            <tbody>
              {feed.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-text-muted">no events yet</td></tr>
              )}
              {feed.map((e) => (
                <tr key={e.ts.toISOString() + e.imageId} className="border-t border-rule">
                  <td className="px-4 py-1.5 text-text-muted tabular-nums">
                    {e.ts.toTimeString().slice(0, 8)}
                  </td>
                  <td className="px-2 py-1.5">
                    <span className={e.pattern === 'none' ? 'text-text-dim' : 'text-danger'}>
                      {e.pattern}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-text-dim tabular-nums">
                    {(e.confidence * 100).toFixed(0)}%
                  </td>
                  <td className="px-2 py-1.5 text-text-muted">{e.trueLabel}</td>
                  <td className="px-2 py-1.5 tabular-nums">
                    {e.rpn === null ? '—' : (
                      <span className={e.rpn >= 100 ? 'text-danger' : 'text-text-dim'}>{e.rpn}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
