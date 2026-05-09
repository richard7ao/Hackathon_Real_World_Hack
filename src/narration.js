// All narration scripts for Hugo's voice-over.
// Written for ElevenLabs TTS: punctuation controls pacing, no abbreviations that mispronounce.

export const NARRATION = {
  // ── Landing page ─────────────────────────────────────────────────────────────
  landing_problem:
    'One hundred billion dollars bleeds out of chip manufacturing every year. ' +
    'Scratched wafers. Broken bonds. Defective dies escaping into data centers. ' +
    "It's getting worse — because the chip the world wants most is also the hardest to build.",

  landing_market:
    'The semiconductor industry shipped 627 billion dollars in 2024 — its first 600 billion dollar year. ' +
    'Between 10 and 30 percent is silently lost to yield loss. ' +
    'Apply that to 2024 revenue and the envelope is undeniable — up to 190 billion dollars, evaporating every year.',

  landing_logistics:
    'One in five Blackwell packages hits the bin. Each one carrying $4,300 of integrated silicon. ' +
    'Drop a 25-wafer cassette and you have dropped $544,000 on the floor. ' +
    'And it takes a junior engineer two weeks to read the wafer map that caused it. ' +
    '67,000 unfilled US semiconductor jobs by 2030. There are not enough seniors.',

  landing_solution:
    'CoWoS is the autonomous AI process engineer. ' +
    'It reads wafer maps natively, grades defects against IPC-A-610 Class 3, ' +
    'scores failure modes with FMECA, and hands engineers a corrective protocol — not just an alert. ' +
    "That's Hugo.",

  landing_demo:
    "Let's see it live. Eight stages. One critical excursion. " +
    'Hugo takes the Risk Priority Number from 168 down to 28, in under four hours.',

  // ── TheLine — the pipeline ────────────────────────────────────────────────────
  line_mount:
    'Welcome to CoWoS Station A42. Eight stages, live. ' +
    'Hugo is correlating 1.4 million telemetry points per second. ' +
    'Stage 4 has a critical excursion — chip-on-wafer bonding is down to 84.2 percent yield.',

  line_stage_critical:
    'Stage 4, CoW Bonding. Critical. Yield at 84.2 percent. ' +
    'Hugo has detected a thermal anomaly at heater block B — ' +
    'plus 2.4 degrees Celsius above threshold, sustained for 38 seconds. ' +
    'Risk Priority Number: 168.',

  line_stage_warn:
    'Stage 7, Reflow. Warning. Temperature variation at plus or minus 0.8 degrees Celsius. ' +
    'Within tolerance — soft warning only. Hugo is monitoring.',

  line_stage_ok: (stage) =>
    `${stage.label.replace(/_/g, ' ').toLowerCase()} — ${stage.id}. ` +
    `Yield at ${stage.yield} percent. Nominal. No corrective action required.`,

  line_classifying:
    'Hugo is reading the wafer map. Running defect pattern classification.',

  line_enriching:
    'Pattern identified. Hugo is running the full FMECA assessment — ' +
    'cross-referencing IPC-A-610, MIL-STD-1629A, and JEDEC JESD22.',

  // ── TheDefect — root cause ────────────────────────────────────────────────────
  defect_mount:
    'Critical defect confirmed at Stage 4. IPC-A-610 Class 3 violation. ' +
    'Scrap is accruing at $8.40 per minute. Hugo is running correlation analysis now.',

  defect_analysis_done:
    'Analysis complete. Root cause isolated. ' +
    'Risk Priority Number 168 — above the critical threshold of 100. ' +
    'Corrective protocol is ready.',

  // ── TheFix — resolution ───────────────────────────────────────────────────────
  fix_mount: (before, after) =>
    `Resolution protocol initiated. ` +
    `Hugo's corrective action will reduce the Risk Priority Number from ${before} down to ${after}. ` +
    `Action: reduce Zone 3 reflow setpoint from 244 to 240 degrees Celsius on machine M3.`,

  fix_verified:
    'Fix verified. Verification batch passed. ' +
    'Defect rate dropped from 16 to 2.1 percent. ' +
    '$24,500 in scrap cost avoided. Loop closed.',
}
