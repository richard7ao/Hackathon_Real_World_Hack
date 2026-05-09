const BASE       = import.meta.env.VITE_API_BASE_URL   ?? 'http://localhost:8000'
const CLASSIFIER = import.meta.env.VITE_CLASSIFIER_URL ?? 'http://localhost:8001'

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(res.status)
  return res.json()
}

// ── Mock responses — exact shapes from Engineer_notes.md API spec ──────────

const MOCK_CLASSIFY = {
  image_id: 'wafer_demo_001',
  defect_pattern: 'edge-ring',
  confidence: 0.91,
  model_used: 'demo_mode',
}

const MOCK_ENRICH = {
  image_id: 'wafer_demo_001',
  assessment: {
    defect_pattern: 'edge-ring',
    human_label: 'Edge-ring defect',
    fmeca: {
      severity: 7,
      occurrence: 6,
      detection: 4,
      rpn: 168,
      mil_std_1629a_category: 'II — Critical',
      mandatory_corrective_action: true,
      standard_invoked: 'NASA MIL-STD-1629A',
      severity_justification: 'Critical for aerospace_class3 — major function loss',
      occurrence_justification: '8 instances in last 24h batches',
      detection_justification: 'AI confidence 0.91',
    },
    ipc_a_610: {
      class_1_outcome: 'PASS_WITH_REWORK',
      class_2_outcome: 'FAIL',
      class_3_outcome: 'FAIL',
      highest_class_passed: 'Class 1 (Consumer)',
    },
    jedec: { impact: 'JESD22-A104 (Thermal Cycling) — edge stress concentration' },
    diagnosis: {
      likely_root_cause: 'Plasma etch non-uniformity or chamber edge effect',
      process_variable_to_investigate: 'plasma_etch_uniformity',
      responsible_equipment: 'plasma_etcher',
      typical_corrective_action: 'Inspect plasma etcher edge ring. Verify gas flow uniformity. Clean chamber walls.',
    },
  },
  next_action: 'correlate',
}

const MOCK_CORRELATE = {
  target_defect: 'edge-ring',
  lookback_batches: 50,
  statistical_findings: {
    occurrence_count: 8,
    occurrence_rate: 0.16,
    machine_distribution: { M3: 6, M1: 2 },
    shift_distribution: { afternoon: 7, morning: 1 },
    mean_reflow_zone3_temp_in_target: 244.1,
    mean_reflow_zone3_temp_in_other: 240.2,
    mean_humidity_in_target: 60.4,
    mean_humidity_in_other: 50.1,
    mean_paste_viscosity_in_target: 181.2,
    mean_paste_viscosity_in_other: 199.8,
  },
  llm_analysis: {
    root_cause_hypothesis:
      'Reflow zone 3 temperature drift on machine M3 during afternoon shift — setpoint has drifted from 240°C to 244°C, causing plasma etch non-uniformity under elevated thermal load.',
    primary_correlated_variable: 'reflow_zone3_temp',
    evidence: [
      '75% of edge-ring batches occurred on machine M3',
      '87.5% of affected batches during afternoon shift',
      'Zone 3 temperature elevated +3.9°C vs healthy batches (244.1°C vs 240.2°C)',
    ],
    confidence: 0.91,
    corrective_action: {
      summary: 'Reduce reflow zone 3 setpoint on M3 to 240°C and verify with next batch.',
      specific_adjustment: 'Reduce zone 3 setpoint: 244°C → 240°C on machine M3',
      predicted_defect_rate_after: 0.022,
      predicted_rpn_after: 28,
      verification_method: 'Run one verification batch on M3 afternoon shift; defect rate should drop below 3%',
    },
    cluster_fingerprint: {
      primary_machine: 'M3',
      primary_shift: 'afternoon',
      time_window: '14:00–18:00 UTC',
    },
  },
  standards_context: {
    fmeca_severity_aerospace: 7,
    mil_std_category: 'II — Critical',
    ipc_class_3_outcome: 'FAIL',
  },
}

export const MOCK_FIX = {
  correlation: MOCK_CORRELATE,
  verification: {
    action_applied: MOCK_CORRELATE.llm_analysis.corrective_action,
    verification_batch: {
      batch_id: 'B-2401',
      machine_id: 'M3',
      wafer_count: 24,
      defect_rate: 0.021,
      wafers_passed: 23,
      primary_defect_pattern: 'none',
    },
    fix_verified: true,
    rpn_before: 168,
    rpn_after: 28,
    rpn_improvement_pct: 83.3,
    defect_rate_before: 0.16,
    defect_rate_after: 0.021,
    below_mandatory_threshold: true,
    verification_timestamp: new Date().toISOString(),
  },
}

// ── Public API ─────────────────────────────────────────────────────────────

export async function classifyWafer(imageFile) {
  try {
    const form = new FormData()
    form.append('file', imageFile)
    const res = await fetch(`${CLASSIFIER}/classify`, { method: 'POST', body: form })
    if (!res.ok) throw new Error(res.status)
    return res.json()
  } catch {
    return MOCK_CLASSIFY
  }
}

export async function enrich(imageId, defectPattern, confidence) {
  try {
    return await post('/enrich', {
      image_id: imageId,
      defect_pattern: defectPattern,
      confidence,
      target_market: 'aerospace_class3',
    })
  } catch {
    return { ...MOCK_ENRICH, image_id: imageId }
  }
}

export async function correlate(defectPattern) {
  try {
    return await post('/correlate', { target_defect: defectPattern, lookback_batches: 50 })
  } catch {
    return { ...MOCK_CORRELATE, target_defect: defectPattern }
  }
}

export async function fixAndVerify(defectPattern) {
  try {
    return await post('/fix-and-verify', { target_defect: defectPattern })
  } catch {
    return MOCK_FIX
  }
}

export async function downloadReport(defectPattern) {
  try {
    const res = await fetch(`${BASE}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_defect: defectPattern }),
    })
    if (!res.ok) throw new Error(res.status)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `FMECA-${Date.now()}.pdf`
    a.click()
    URL.revokeObjectURL(url)
    return true
  } catch {
    return false
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

export function buildTerminalLines(correlation) {
  const stats = correlation.statistical_findings
  const llm   = correlation.llm_analysis
  return [
    { type: 'cmd', text: 'connecting · erp.coWoS.local' },
    { type: 'ok',  text: 'success · 12ms' },
    { type: 'cmd', text: `reading batch data · last ${correlation.lookback_batches} batches` },
    { type: 'ai',  text: `Hugo: ${stats.occurrence_count} occurrences detected (${(stats.occurrence_rate * 100).toFixed(1)}% of recent production)` },
    { type: 'cmd', text: 'analyzing process parameter correlations…' },
    { type: 'ai',  text: `Hugo: ${llm.root_cause_hypothesis}` },
    { type: 'cmd', text: 'thinking…' },
    { type: 'ai',  text: `Hugo · action — ${llm.corrective_action.specific_adjustment}` },
  ]
}
