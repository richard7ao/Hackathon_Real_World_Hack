import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { classifyWafer, downloadReport, enrich } from '../api'
import { useAnalysis } from '../AnalysisContext'

const CLASSIFIER = import.meta.env.VITE_CLASSIFIER_URL ?? 'http://localhost:8001'
const STAGGER_MS = 220

// Map each defect's responsible_equipment (returned in /enrich) to the
// production stage where the audience can "see" it. Driven from the
// FMECA defect_map source of truth.
const EQUIPMENT_TO_STAGE = {
  wafer_chuck:           { id: 'STG-01', label: 'Wafer in' },
  spin_coater:           { id: 'STG-02', label: 'Bumping (spin / PEB)' },
  edge_bead_remover:     { id: 'STG-02', label: 'Bumping (edge bead)' },
  plasma_etcher:         { id: 'STG-04', label: 'CoW bonding (etch)' },
  cleanroom_environment: { id: 'STG-03', label: 'Interposer (cleanroom)' },
  wafer_handler_robot:   { id: 'STG-01', label: 'Wafer handler' },
  process_control_system:{ id: 'STG-04', label: 'Recipe / process control' },
  general_process:       { id: 'STG-08', label: 'Final test (process drift)' },
}

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

function StatusDot({ status }) {
  const cls =
    status === 'pending'   ? 'bg-text-muted/40' :
    status === 'running'   ? 'bg-cyan animate-pulse' :
    status === 'pass'      ? 'bg-ok' :
    status === 'defect'    ? 'bg-danger' :
    'bg-text-muted/40'
  return <span className={`block w-2 h-2 ${cls}`} aria-hidden="true" />
}

async function fetchBatchManifest() {
  const r = await fetch(`${CLASSIFIER}/demo-batch`)
  if (!r.ok) throw new Error(`/demo-batch ${r.status}`)
  return r.json()
}

async function fetchBatchImage(url) {
  const r = await fetch(`${CLASSIFIER}${url}`, { cache: 'no-store' })
  if (!r.ok) throw new Error(`${url} ${r.status}`)
  const trueLabel = r.headers.get('x-true-label') ?? '?'
  const blob = await r.blob()
  return { blob, trueLabel, file: new File([blob], url.split('/').pop(), { type: blob.type || 'image/jpeg' }) }
}

export default function BatchRunner({ onTopDefect }) {
  const navigate = useNavigate()
  const { update } = useAnalysis()

  const [manifest, setManifest] = useState(null)
  const [results, setResults]   = useState([])      // per-wafer rows
  const [phase, setPhase]       = useState('idle')   // idle | classifying | enriching | done
  const [error, setError]       = useState(null)
  const [topDefect, setTopDefect] = useState(null)
  const [downloading, setDownloading] = useState(false)
  const aliveRef = useRef(true)

  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
      // Intentionally NOT revoking object URLs here. The top defect's URL is
      // promoted to AnalysisContext and consumed by /defect and /fix; revoking
      // on unmount would blank those pages out. AnalysisContext owns its own
      // URL lifecycle (see AnalysisContext.jsx).
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    fetchBatchManifest().then(setManifest).catch(e => setError(e.message))
  }, [])

  async function classifyOne(entry) {
    try {
      const { file, trueLabel, blob } = await fetchBatchImage(entry.url)
      const classified = await classifyWafer(file)
      return {
        ...entry,
        true_label: trueLabel,
        predicted: classified.defect_pattern,
        confidence: classified.confidence,
        modelUsed: classified.model_used,
        objectUrl: URL.createObjectURL(blob),
        status: classified.defect_pattern === 'none' ? 'pass' : 'defect',
        enrichment: null,
      }
    } catch (e) {
      console.error('[batch]', entry.filename, e)
      return { ...entry, status: 'pass', error: e.message }
    }
  }

  async function runBatch() {
    if (!manifest || phase === 'classifying' || phase === 'enriching') return
    setPhase('classifying')
    setError(null)
    setTopDefect(null)
    setResults(manifest.wafers.map(w => ({ ...w, status: 'pending' })))

    // Fire one classify per wafer with a tiny stagger so the audience can see
    // wafers light up across the strip. Each call hits the real /classify
    // endpoint — this is the actual model, not a mock.
    const finished = []
    for (let i = 0; i < manifest.wafers.length; i++) {
      const entry = manifest.wafers[i]
      setResults(prev => prev.map(r => r.sequence === entry.sequence ? { ...r, status: 'running' } : r))
      const row = await classifyOne(entry)
      if (!aliveRef.current) return
      finished.push(row)
      setResults(prev => prev.map(r => r.sequence === entry.sequence ? row : r))
      if (i < manifest.wafers.length - 1) {
        await new Promise(res => setTimeout(res, STAGGER_MS))
      }
    }

    setPhase('enriching')

    // Enrich every defect — gives us the FMECA scoring for ranking.
    const enriched = []
    for (const row of finished) {
      if (row.predicted && row.predicted !== 'none') {
        try {
          const e = await enrich(row.filename, row.predicted, row.confidence)
          enriched.push({ ...row, enrichment: e })
        } catch (err) {
          console.warn('[batch enrich]', row.filename, err)
          enriched.push(row)
        }
      } else {
        enriched.push(row)
      }
    }
    if (!aliveRef.current) return

    setResults(enriched)
    const ranked = enriched
      .filter(r => r.status === 'defect' && r.enrichment?.assessment?.fmeca?.rpn != null)
      .sort((a, b) => b.enrichment.assessment.fmeca.rpn - a.enrichment.assessment.fmeca.rpn)
    const top = ranked[0] ?? null
    setTopDefect(top)
    setPhase('done')

    if (top) {
      update({
        defectPattern: top.predicted,
        imageId: top.filename,
        confidence: top.confidence,
        enrichment: top.enrichment,
        imagePreviewUrl: top.objectUrl,
        correlation: null,
        fixResult: null,
      })
      if (onTopDefect) onTopDefect(top)
    }
  }

  async function handleExport() {
    if (!topDefect) return
    setDownloading(true)
    try {
      await downloadReport(topDefect.predicted)
    } finally {
      setDownloading(false)
    }
  }

  const counts = useMemo(() => {
    const total = results.length || 0
    const passes = results.filter(r => r.status === 'pass').length
    const defects = results.filter(r => r.status === 'defect').length
    const pending = results.filter(r => r.status === 'pending' || r.status === 'running').length
    return { total, passes, defects, pending }
  }, [results])

  const ranked = useMemo(() =>
    results
      .filter(r => r.status === 'defect' && r.enrichment?.assessment?.fmeca?.rpn != null)
      .sort((a, b) => b.enrichment.assessment.fmeca.rpn - a.enrichment.assessment.fmeca.rpn)
  , [results])

  const topAssess = topDefect?.enrichment?.assessment
  const stage = topAssess?.diagnosis?.responsible_equipment
    ? EQUIPMENT_TO_STAGE[topAssess.diagnosis.responsible_equipment]
    : null

  return (
    <div className="bg-surface hairline-strong">
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-rule bg-surface-2/40">
        <div className="flex items-center gap-3">
          <span className="font-mono text-eyebrow text-cyan tracking-[0.18em]">
            BATCH {manifest?.batch_id ?? 'B-…'}
          </span>
          <span className="font-mono text-mono-xs text-text-muted">
            {manifest?.count ?? '…'} wafers · cowos-station-a42 · 0512 UTC
          </span>
        </div>
        <div className="flex items-center gap-4 font-mono text-mono-xs">
          {phase !== 'idle' && (
            <span className="text-text-muted">
              pass <span className="text-ok">{counts.passes}</span> ·
              defects <span className="text-danger">{counts.defects}</span>
              {counts.pending > 0 && <> · pending <span className="text-cyan">{counts.pending}</span></>}
            </span>
          )}
          <button
            onClick={runBatch}
            disabled={!manifest || phase === 'classifying' || phase === 'enriching'}
            className="bg-cyan text-white font-mono text-mono-xs uppercase tracking-[0.18em] px-4 py-1.5 hover:bg-cyan-deep disabled:opacity-50"
          >
            {phase === 'idle'        ? 'inspect batch →' :
             phase === 'classifying' ? 'inspecting…' :
             phase === 'enriching'   ? 'grading…' :
             'reinspect ↻'}
          </button>
        </div>
      </div>

      {error && (
        <div className="px-5 py-3 bg-danger/10 text-danger font-mono text-mono-xs">
          batch error — {error}
        </div>
      )}

      {/* Wafer strip — 30 thumbnails showing classification progress */}
      <div className="px-5 py-4 border-b border-rule">
        <div className="grid grid-cols-10 gap-1.5">
          {(results.length ? results : manifest?.wafers ?? []).map((r) => (
            <div
              key={r.sequence}
              className={`relative aspect-square hairline ${
                r.status === 'defect' ? 'border-danger bg-danger/5'
                : r.status === 'pass' ? 'border-ok/30 bg-ok/5'
                : r.status === 'running' ? 'border-cyan bg-cyan/5'
                : 'border-rule bg-surface-2'
              }`}
              title={`#${String(r.sequence).padStart(2, '0')} · true=${r.true_label}${r.predicted ? ` · pred=${r.predicted}` : ''}`}
            >
              {r.objectUrl && (
                <img src={r.objectUrl} alt="" className="absolute inset-1 h-[calc(100%-8px)] w-[calc(100%-8px)] object-contain opacity-90" />
              )}
              <span className="absolute top-0.5 left-0.5 font-mono text-[8px] text-text-muted bg-surface/70 px-1">
                {String(r.sequence).padStart(2, '0')}
              </span>
              <span className="absolute bottom-1 right-1">
                <StatusDot status={r.status} />
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Defect ranking (after enrich) */}
      {ranked.length > 0 && (
        <div className="grid grid-cols-12 gap-0">
          <div className="col-span-12 lg:col-span-7 border-r border-rule">
            <div className="px-5 py-3 border-b border-rule bg-surface-2/40">
              <span className="font-mono text-eyebrow text-text-muted tracking-[0.18em]">
                DEFECTS RANKED · highest RPN first
              </span>
            </div>
            <table className="w-full font-mono text-mono-xs">
              <thead className="text-text-muted bg-surface-2/40">
                <tr>
                  <th className="text-left px-4 py-2 font-normal">#</th>
                  <th className="text-left px-2 py-2 font-normal">predicted</th>
                  <th className="text-left px-2 py-2 font-normal">true</th>
                  <th className="text-left px-2 py-2 font-normal">conf</th>
                  <th className="text-left px-2 py-2 font-normal">RPN</th>
                  <th className="text-left px-2 py-2 font-normal">MIL-STD-1629A</th>
                  <th className="text-left px-2 py-2 font-normal">IPC-A-610 cls 3</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((r, i) => {
                  const a = r.enrichment.assessment
                  const isTop = i === 0
                  return (
                    <tr key={r.sequence}
                      className={`border-t border-rule ${isTop ? 'bg-danger/5' : ''}`}>
                      <td className="px-4 py-2 text-text-muted tabular-nums">
                        {String(r.sequence).padStart(2, '0')}{isTop && <span className="text-danger ml-1">★</span>}
                      </td>
                      <td className="px-2 py-2 text-danger">{r.predicted}</td>
                      <td className="px-2 py-2 text-text-muted">{r.true_label}</td>
                      <td className="px-2 py-2 text-text-dim tabular-nums">
                        {(r.confidence * 100).toFixed(0)}%
                      </td>
                      <td className="px-2 py-2 tabular-nums">
                        <span className={a.fmeca.rpn >= 100 ? 'text-danger' : 'text-amber'}>
                          {a.fmeca.rpn}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-text-dim">{a.fmeca.mil_std_1629a_category}</td>
                      <td className="px-2 py-2 text-text-dim">{a.ipc_a_610.class_3_outcome.replace(/_/g, ' ').toLowerCase()}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Top-defect deep dive */}
          {topDefect && topAssess && (
            <div className="col-span-12 lg:col-span-5 p-5 bg-surface-2/30">
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-danger text-white font-mono text-mono-xs px-2 py-0.5 uppercase tracking-[0.18em]">
                  top defect
                </span>
                <span className="font-mono text-mono-xs text-text-muted">
                  wafer #{String(topDefect.sequence).padStart(2, '0')}
                </span>
              </div>

              <div className="flex gap-4 mb-4">
                <div className="w-20 h-20 bg-ink hairline shrink-0 relative">
                  {topDefect.objectUrl && (
                    <img src={topDefect.objectUrl} alt="" className="absolute inset-1 h-[calc(100%-8px)] w-[calc(100%-8px)] object-contain" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display text-[18px] tracking-[-0.02em] text-text">
                    {HUMAN_LABEL[topDefect.predicted]}
                  </div>
                  <div className="font-mono text-mono-xs text-text-muted mt-1">
                    {topAssess.diagnosis.likely_root_cause}
                  </div>
                </div>
              </div>

              <dl className="space-y-2 font-mono text-mono-xs mb-5">
                <div className="flex items-baseline gap-3 border-b border-rule pb-2">
                  <dt className="text-text-muted shrink-0 w-24 uppercase tracking-[0.16em]">RPN</dt>
                  <dd>
                    <span className="text-danger tabular-nums text-[15px]">{topAssess.fmeca.rpn}</span>
                    <span className="text-text-muted"> · S{topAssess.fmeca.severity} × O{topAssess.fmeca.occurrence} × D{topAssess.fmeca.detection}</span>
                  </dd>
                </div>
                <div className="flex items-baseline gap-3 border-b border-rule pb-2">
                  <dt className="text-text-muted shrink-0 w-24 uppercase tracking-[0.16em]">MIL-STD</dt>
                  <dd className="text-text-dim">{topAssess.fmeca.mil_std_1629a_category}</dd>
                </div>
                <div className="flex items-baseline gap-3 border-b border-rule pb-2">
                  <dt className="text-text-muted shrink-0 w-24 uppercase tracking-[0.16em]">IPC-A-610</dt>
                  <dd className="text-text-dim">
                    cls 3 {topAssess.ipc_a_610.class_3_outcome.replace(/_/g, ' ').toLowerCase()} ·
                    cls 2 {topAssess.ipc_a_610.class_2_outcome.replace(/_/g, ' ').toLowerCase()}
                  </dd>
                </div>
                <div className="flex items-baseline gap-3 border-b border-rule pb-2">
                  <dt className="text-text-muted shrink-0 w-24 uppercase tracking-[0.16em]">JEDEC</dt>
                  <dd className="text-text-dim">{topAssess.jedec.impact}</dd>
                </div>
                <div className="flex items-baseline gap-3 border-b border-rule pb-2">
                  <dt className="text-text-muted shrink-0 w-24 uppercase tracking-[0.16em]">SOURCE</dt>
                  <dd className="text-text-dim">
                    {topAssess.diagnosis.responsible_equipment} ·
                    {stage ? <span className="text-cyan"> {stage.id} {stage.label}</span> : ' (unmapped)'}
                  </dd>
                </div>
                <div className="flex items-baseline gap-3">
                  <dt className="text-text-muted shrink-0 w-24 uppercase tracking-[0.16em]">ACTION</dt>
                  <dd className="text-text-dim">{topAssess.diagnosis.typical_corrective_action}</dd>
                </div>
              </dl>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => navigate('/defect')}
                  className="bg-surface hairline-strong px-3 py-2 font-mono text-mono-xs uppercase tracking-[0.18em] text-text-dim hover:text-cyan"
                >
                  inspect →
                </button>
                <button
                  onClick={handleExport}
                  disabled={downloading}
                  className="bg-cyan text-white px-3 py-2 font-mono text-mono-xs uppercase tracking-[0.18em] hover:bg-cyan-deep disabled:opacity-50"
                >
                  {downloading ? 'generating…' : 'fmeca pdf →'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty / pre-run guidance */}
      {phase === 'idle' && (
        <div className="px-5 py-4 font-mono text-mono-xs text-text-muted">
          Inline inspection · {manifest?.count ?? 30} wafers awaiting grading.
          Defects scored to MIL-STD-1629A · IPC-A-610J · JEDEC JESD22 · routed to source equipment.
        </div>
      )}
    </div>
  )
}
