import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useNarrator } from '../NarratorContext'
import { NARRATION } from '../narration'

const SECTIONS = [
  { id: 'problem',     num: '01', label: 'Problem' },
  { id: 'market',      num: '02', label: 'Market' },
  { id: 'logistics',   num: '03', label: 'Logistics' },
  { id: 'founders',    num: '04', label: 'Founders' },
  { id: 'solution',    num: '05', label: 'Solution' },
  { id: 'architecture',num: '06', label: 'Architecture' },
  { id: 'demo',        num: '07', label: 'Demo' },
]

// Five-stage system architecture, real components, real ports, real numbers.
// Static — no clickability, no animation — same vibe as the SOLUTION grid.
const ARCHITECTURE_STAGES = [
  {
    num: '01',
    name: 'Dataset',
    title: 'WM-811K curated subset',
    body: '895 labelled wafer maps across nine WM-811K defect classes. Folder-per-class on disk, mirrored as the source of truth for every downstream stage.',
    chips: ['WM-811K', '9 classes', '~100/class'],
    role: 'INPUT',
  },
  {
    num: '02',
    name: 'Encord',
    title: 'Annotation + active learning',
    body: 'Project ontology with the same nine pattern values used end-to-end. Pre-labelled by Gemini 3.1, reviewed in the Encord queue, exported via the Python SDK.',
    chips: ['Encord SDK', 'Gemini 3.1 pre-label', 'Review queue', 'Workflow stages'],
    role: 'LABELLING',
  },
  {
    num: '03',
    name: 'Model',
    title: 'ResNet18 fine-tuned',
    body: 'Fine-tuned on the Encord-exported labels. Layer4 + classifier head trained, rest frozen. Hybrid serving with a Gemini fallback for low-confidence cases.',
    chips: ['ResNet18', 'PyTorch', '224×224 RGB', 'CNN + Gemini hybrid'],
    role: 'INFERENCE',
  },
  {
    num: '04',
    name: 'FMECA Engine',
    title: 'NASA + IPC + JEDEC mapping',
    body: 'Deterministic FMECA score per defect (S × O × D = RPN), then Pandas + LLM correlation against 200 simulated batches to surface root cause + corrective action.',
    chips: ['MIL-STD-1629A', 'IPC-A-610J', 'JEDEC JESD22', 'AIAG-VDA 2019', 'FastAPI :8000'],
    role: 'INTELLIGENCE',
  },
  {
    num: '05',
    name: 'Surface',
    title: 'Live dashboard + audit PDF',
    body: 'React frontend on Vite. Live monitor polls /sample → /classify → /enrich every 3.5s and lights up the stage map on real defects. Climax: a regulator-ready PDF.',
    chips: ['React 18', 'Vite', 'Tailwind', 'ReportLab PDF', 'ElevenLabs narration'],
    role: 'OUTPUT',
  },
]

// Live model provenance (wired to data/model_metrics.json shape so this can
// later be lifted from a fetch — kept inline for the static section).
const MODEL_PROVENANCE = [
  ['Architecture',     'ResNet18 · layer4 + fc fine-tuned'],
  ['Image size',       '224 × 224 RGB'],
  ['Trained on',       '895 WM-811K wafer maps · annotated in Encord'],
  ['Fallback model',   'Gemini 3.1 flash-lite (when CNN confidence < 0.75)'],
  ['Best val accuracy','82.7% across 9 classes'],
  ['Strongest classes','edge-ring 95% · none 95% · donut 90% · random 90%'],
]

const BACKERS = [
  { name: 'Operators & Friends', href: 'http://www.operatorsandfriends.com', domain: 'operatorsandfriends.com', lead: true },
  { name: 'NEA',                 href: 'https://www.nea.com/',               domain: 'nea.com' },
  { name: 'Transition',          href: 'https://transition.vc/',             domain: 'transition.vc' },
]

const POWERED = [
  { name: 'ElevenLabs',      href: 'https://elevenlabs.io/',                          domain: 'elevenlabs.io' },
  { name: 'OpenAI',          href: 'https://openai.com/',                             domain: 'openai.com' },
  { name: 'Google DeepMind', href: 'https://deepmind.google/',                        domain: 'deepmind.google' },
  { name: 'Encord',          href: 'https://encord.com/',                             domain: 'encord.com' },
  { name: 'Lovable',         href: 'https://lovable.dev/?via=operatorsandfriends',    domain: 'lovable.dev' },
]

const logoSrc = (domain) => `https://www.google.com/s2/favicons?domain=${domain}&sz=128`

const FOUNDERS = [
  {
    name: 'Richard Lao',
    role: 'Co-founder · CEO',
    bio: 'Previously building autonomous ops at PLP. Twelve years across embedded firmware, supply-chain ML, and process control.',
    init: 'RL',
  },
  {
    name: 'Co-founder · CTO',
    role: 'Engineering',
    bio: 'Ex-foundry process engineer turned platform builder. Spent two years inside a leading-edge fab debugging CoWoS yield excursions by hand.',
    init: '02',
  },
  {
    name: 'Co-founder · CSO',
    role: 'Standards & GTM',
    bio: 'Quality-systems lead with deep IPC, JEDEC, and SEMI standards lineage. Wrote FMECA playbooks now used across three OSATs.',
    init: '03',
  },
]

const NUMBERS = [
  { metric: '$627.6B', label: 'Global semi sales · 2024',           note: 'SIA / WSTS · +19.1% YoY' },
  { metric: '10–30%',  label: 'Revenue lost to poor quality',        note: 'Juran / ASQ · industry standard' },
  { metric: '$60–190B',label: 'Annual yield-loss envelope',          note: 'Derived · COPQ × 2024 sales' },
  { metric: '~1 in 5', label: 'Blackwell packages scrapped',         note: 'Epoch AI · CoWoS-L Monte Carlo' },
]

const LOGISTICS = [
  ['$544K',     'on the floor when one 25-wafer 3nm cassette drops'],
  ['12–18 mo',  'CoWoS waitlist for Nvidia and AMD'],
  ['~70%',      'of TSMC CoWoS-L 2025 capacity booked by Nvidia'],
  ['$21M',      'cost per inline-undetected excursion · KLA'],
  ['67,000',    'unfilled US semi jobs by 2030 · SIA / Oxford Economics'],
  ['1–2 mo',    'cross-departmental root-cause investigations · MST 2024'],
]

const SOLUTION = [
  {
    icon: 'biotech',
    title: 'Reads SEMI E142 wafer maps',
    body: 'Native ingest of XML wafer / strip / tray maps and KLARF defect files. Speaks the language every fab and OSAT already emits.',
  },
  {
    icon: 'fact_check',
    title: 'IPC-A-610J Class 3 grading',
    body: 'Acceptable / Process Indicator / Defect classification for life-critical assemblies. JEDEC JESD22 stress-test alignment built in.',
  },
  {
    icon: 'monitoring',
    title: 'Predictive RPN delta',
    body: 'FMECA-style scoring with Action Priority lookup (AIAG-VDA 2019). Surfaces drift four hours before threshold, every shift.',
  },
  {
    icon: 'auto_fix_high',
    title: 'Hugo · the autonomous engineer',
    body: 'Correlates 1.4M telemetry points/sec with ERP, supplier feeds, and recipe history. Suggests corrective protocol, not just an alert.',
  },
]

function useReveal() {
  const ref = useRef(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    if (!ref.current) return
    const io = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setShown(true),
      { threshold: 0.15 }
    )
    io.observe(ref.current)
    return () => io.disconnect()
  }, [])
  return [ref, shown]
}

function TrustStrip() {
  return (
    <section
      aria-label="Backed by and powered by"
      className="relative bg-bg border-y border-rule"
    >
      <div className="max-w-[1280px] mx-auto px-8 md:px-16 py-14">
        {/* BACKED BY */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-10 items-center">
          <div className="md:col-span-3">
            <div className="font-mono text-eyebrow text-cyan mb-2">BACKED BY</div>
            <div className="font-mono text-mono-xs text-text-muted leading-relaxed">
              Sponsored by Operators &amp; Friends<br />
              with NEA &amp; Transition.
            </div>
          </div>
          <div className="md:col-span-9 flex flex-wrap items-center gap-x-10 gap-y-5">
            {BACKERS.map(({ name, href, domain, lead }) => (
              <a
                key={name}
                href={href}
                target="_blank"
                rel="noreferrer noopener"
                className={`group relative flex items-center gap-3 font-display tracking-[-0.02em] text-text hover:text-cyan transition-colors
                  ${lead ? 'text-[28px] md:text-[32px]' : 'text-[24px] md:text-[28px]'}`}
              >
                <img
                  src={logoSrc(domain)}
                  alt=""
                  width={32}
                  height={32}
                  loading="lazy"
                  className={`rounded-sm grayscale group-hover:grayscale-0 transition-[filter] duration-200
                    ${lead ? 'w-8 h-8' : 'w-7 h-7'}`}
                />
                <span>{name}</span>
                <span className="absolute -bottom-1 left-0 right-0 h-px bg-cyan scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-300" />
              </a>
            ))}
          </div>
        </div>

        {/* divider */}
        <div className="my-10 grid grid-cols-12 gap-4 items-center">
          <span className="col-span-3 font-mono text-eyebrow text-text-muted">— · —</span>
          <span className="col-span-9 h-px bg-rule" />
        </div>

        {/* POWERED BY */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-10 items-center">
          <div className="md:col-span-3">
            <div className="font-mono text-eyebrow text-cyan mb-2">POWERED BY</div>
            <div className="font-mono text-mono-xs text-text-muted leading-relaxed">
              Built on the model and tooling stack
              shipping at the frontier.
            </div>
          </div>
          <div className="md:col-span-9 flex flex-wrap items-center gap-x-8 gap-y-4">
            {POWERED.map(({ name, href, domain }) => (
              <a
                key={name}
                href={href}
                target="_blank"
                rel="noreferrer noopener"
                className="group relative flex items-center gap-2.5 font-display text-[20px] md:text-[22px] tracking-[-0.015em] text-text-dim hover:text-text transition-colors"
              >
                <img
                  src={logoSrc(domain)}
                  alt=""
                  width={24}
                  height={24}
                  loading="lazy"
                  className="w-6 h-6 rounded-sm grayscale group-hover:grayscale-0 transition-[filter] duration-200"
                />
                <span>{name}</span>
                <span className="absolute -bottom-1 left-0 right-0 h-px bg-cyan scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-300" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function Section({ id, eyebrow, num, children, tone = 'cream' }) {
  const palette = {
    cream: 'bg-bg text-text',
    paper: 'bg-surface text-text',
    ink:   'bg-ink text-bg',
    glow:  'bg-bg text-text',
  }[tone]

  return (
    <section id={id} className={`relative ${palette} py-28 md:py-36`}>
      <div className="max-w-[1280px] mx-auto px-8 md:px-16">
        {(eyebrow || num) && (
          <div className="flex items-center gap-4 mb-12">
            {num && <span className={`font-mono text-eyebrow ${tone === 'ink' ? 'text-cyan' : 'text-cyan'}`}>/ {num}</span>}
            {eyebrow && (
              <span className={`font-mono text-eyebrow ${tone === 'ink' ? 'text-bg/60' : 'text-text-muted'}`}>
                {eyebrow}
              </span>
            )}
            <div className={`flex-1 h-px ${tone === 'ink' ? 'bg-bg/15' : 'bg-rule'}`} />
          </div>
        )}
        {children}
      </div>
    </section>
  )
}

function MetricCard({ metric, label, note, dark = false }) {
  const [ref, shown] = useReveal()
  return (
    <div
      ref={ref}
      className={`relative p-6 corner-ticks transition-all duration-700
        ${dark ? 'bg-surface-3/10 hairline' : 'bg-surface hairline'}
        ${shown ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}`}
    >
      <span className="tick-tr" /><span className="tick-bl" />
      <div className="font-display text-h-md tracking-[-0.04em] tabular-nums leading-none">
        {metric}
      </div>
      <div className="mt-4 font-display text-[15px] leading-snug">
        {label}
      </div>
      <div className={`mt-2 font-mono text-mono-xs ${dark ? 'text-bg/50' : 'text-text-muted'}`}>
        {note}
      </div>
    </div>
  )
}

const SECTION_SCRIPTS = {
  problem:   NARRATION.landing_problem,
  market:    NARRATION.landing_market,
  logistics: NARRATION.landing_logistics,
  solution:  NARRATION.landing_solution,
  demo:      NARRATION.landing_demo,
}

export default function Landing() {
  const [active, setActive] = useState('problem')
  const { queue } = useNarrator()
  const narratedRef = useRef(new Set())

  // Active-section tracker (for sidebar dots)
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id) })
      },
      { rootMargin: '-40% 0px -40% 0px' }
    )
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) obs.observe(el)
    })
    return () => obs.disconnect()
  }, [])

  // Narration — fires once per section on first entry
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          const id = e.target.id
          if (e.isIntersecting && !narratedRef.current.has(id) && SECTION_SCRIPTS[id]) {
            narratedRef.current.add(id)
            queue(SECTION_SCRIPTS[id])
          }
        })
      },
      { threshold: 0.3 }
    )
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) obs.observe(el)
    })
    return () => obs.disconnect()
  }, [queue])

  return (
    <div className="min-h-screen bg-bg text-text font-sans">
      {/* TOP NAV */}
      <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-md bg-bg/80 border-b border-rule">
        <div className="max-w-[1280px] mx-auto px-8 md:px-16 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <span className="w-7 h-7 grid place-items-center bg-cyan/15 hairline">
              <span className="font-mono text-cyan text-[14px]">◐</span>
            </span>
            <span className="font-display text-[20px] tracking-[-0.03em]">cowos</span>
            <span className="font-mono text-mono-xs text-text-muted hidden sm:inline">/ pitch · 2026.05.10</span>
          </Link>
          <div className="hidden md:flex items-center gap-6 font-mono text-mono-xs uppercase tracking-[0.18em] text-text-dim">
            <a href="#problem"   className="hover:text-cyan">Problem</a>
            <a href="#market"    className="hover:text-cyan">Market</a>
            <a href="#founders"  className="hover:text-cyan">Founders</a>
            <a href="#solution"  className="hover:text-cyan">Solution</a>
          </div>
          <Link
            to="/demo"
            className="bg-cyan text-white font-mono text-mono-xs uppercase tracking-[0.18em] px-4 py-2 hover:bg-cyan-deep transition-colors flex items-center gap-2"
          >
            Live demo <span className="text-base leading-none">→</span>
          </Link>
        </div>
      </nav>

      {/* SIDE PROGRESS DOTS */}
      <aside className="fixed left-6 top-1/2 -translate-y-1/2 z-40 hidden xl:block">
        <ol className="space-y-3">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className={`group flex items-center gap-3 font-mono text-eyebrow transition-colors
                  ${active === s.id ? 'text-cyan' : 'text-text-muted hover:text-text-dim'}`}
              >
                <span className={`block h-px transition-all duration-300
                  ${active === s.id ? 'w-10 bg-cyan' : 'w-3 bg-rule group-hover:w-5'}`} />
                <span>{s.num} · {s.label}</span>
              </a>
            </li>
          ))}
        </ol>
      </aside>

      {/* HERO — PROBLEM */}
      <section id="problem" className="relative min-h-screen pt-24 pb-16 flex items-center overflow-hidden">
        <div className="absolute inset-0 micro-grid opacity-60 pointer-events-none" />
        <div className="absolute -top-32 -right-20 w-[640px] h-[640px] rounded-full bg-cyan/8 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -left-20 w-[520px] h-[520px] rounded-full bg-amber/10 blur-3xl pointer-events-none" />

        <div className="relative max-w-[1280px] mx-auto px-8 md:px-16 w-full">

          {/* HERO TOP CREDITS RIBBON */}
          <div className="mb-14 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center pb-6 border-b border-rule">
            <div className="lg:col-span-5 flex items-center gap-3">
              <span className="font-mono text-eyebrow text-text-muted whitespace-nowrap">SPONSORED BY</span>
              <span className="h-px w-6 bg-rule" />
              <div className="flex items-center gap-x-5 flex-wrap gap-y-2">
                {BACKERS.map(({ name, href, domain }) => (
                  <a
                    key={name}
                    href={href}
                    target="_blank"
                    rel="noreferrer noopener"
                    title={name}
                    className="group flex items-center gap-2 text-text-dim hover:text-text transition-colors"
                  >
                    <img
                      src={logoSrc(domain)}
                      alt=""
                      width={20}
                      height={20}
                      loading="lazy"
                      className="w-5 h-5 rounded-sm grayscale group-hover:grayscale-0 transition-[filter] duration-200"
                    />
                    <span className="font-display text-[14px] tracking-[-0.01em] whitespace-nowrap">{name}</span>
                  </a>
                ))}
              </div>
            </div>

            <div className="lg:col-span-7 flex items-center gap-3 lg:justify-end">
              <span className="font-mono text-eyebrow text-text-muted whitespace-nowrap">POWERED BY</span>
              <span className="h-px w-6 bg-rule" />
              <div className="flex items-center gap-x-5 flex-wrap gap-y-2">
                {POWERED.map(({ name, href, domain }) => (
                  <a
                    key={name}
                    href={href}
                    target="_blank"
                    rel="noreferrer noopener"
                    title={name}
                    className="group flex items-center gap-2 text-text-dim hover:text-text transition-colors"
                  >
                    <img
                      src={logoSrc(domain)}
                      alt=""
                      width={18}
                      height={18}
                      loading="lazy"
                      className="w-[18px] h-[18px] rounded-sm grayscale group-hover:grayscale-0 transition-[filter] duration-200"
                    />
                    <span className="font-display text-[13px] tracking-[-0.01em] whitespace-nowrap">{name}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="font-mono text-eyebrow text-cyan mb-8 flex items-center gap-3">
            <span className="w-8 h-px bg-cyan" />
            01 · THE OPENING PUNCH
          </div>

          <h1 className="font-display text-[80px] md:text-[128px] leading-[0.86] tracking-[-0.05em] text-balance">
            <span className="text-text-muted">$100 billion</span><br />
            bleeds out of<br />
            chip <span className="italic text-cyan">manufacturing</span>.<br />
            <span className="text-text-muted">Every year.</span>
          </h1>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-12 gap-10 items-end">
            <p className="md:col-span-7 max-w-2xl text-text-dim text-[20px] md:text-[22px] leading-[1.45] font-light">
              The semiconductor industry shipped <span className="font-mono text-text">$627.6B</span> of chips
              in 2024 — its first $600B year. Between <span className="font-mono text-text">10% and 30%</span>{' '}
              is silently lost to yield. Scratched wafers. Broken bonds. Warped packages. Defective dies that
              escape into datacenters. <span className="text-text">It's getting worse, not better</span>{' '}
              — because the chip we want most is also the hardest to build.
            </p>

            <div className="md:col-span-4 md:col-start-9 grain glass corner-ticks p-7 relative">
              <span className="tick-tr" /><span className="tick-bl" />
              <div className="font-mono text-eyebrow text-text-muted mb-3">REFERENCE · PITCH PACK</div>
              <div className="font-display text-h-sm tracking-[-0.025em] mb-2">
                Saturday, 9 May 2026 · NEA HQ
              </div>
              <div className="font-mono text-mono-xs text-text-muted leading-relaxed">
                Every figure on this page is grep-able to a primary source.
                Numbers flagged "modeled" or "derived" are never asserted as primary disclosure.
              </div>
            </div>
          </div>

          <a
            href="#market"
            className="mt-20 inline-flex items-center gap-3 font-mono text-mono-xs uppercase tracking-[0.18em] text-text-dim hover:text-cyan transition-colors"
          >
            <span className="w-12 h-px bg-text-muted" />
            scroll · the numbers
            <span className="material-symbols-outlined text-[16px]">south</span>
          </a>
        </div>
      </section>

      {/* TRUST STRIP — backed by / powered by */}
      <TrustStrip />

      {/* MARKET — costs */}
      <Section id="market" num="02" eyebrow="MARKET / COST OF POOR QUALITY" tone="cream">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-end mb-14">
          <h2 className="md:col-span-8 font-display text-h-lg leading-[0.92] tracking-[-0.04em] text-balance">
            A <span className="italic text-cyan">$630B</span> industry,
            bleeding <span className="text-amber">$100B</span> a year.
          </h2>
          <p className="md:col-span-4 text-text-dim text-lead font-light">
            Cost of Poor Quality is the canonical Juran/ASQ benchmark.
            Apply 10–30% to 2024 silicon revenue and the envelope is undeniable.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {NUMBERS.map((n) => <MetricCard key={n.label} {...n} />)}
        </div>

        {/* Quote */}
        <figure className="mt-20 max-w-3xl">
          <blockquote className="font-display text-[32px] md:text-[40px] tracking-[-0.025em] leading-[1.15] text-balance">
            "It is not the shortage of AI chips.
            <br />It is the shortage of our <span className="italic text-cyan">CoWoS capacity</span>."
          </blockquote>
          <figcaption className="mt-6 font-mono text-mono-sm text-text-muted">
            — Mark Liu · TSMC Chairman · September 2023
          </figcaption>
        </figure>
      </Section>

      {/* LOGISTICS */}
      <Section id="logistics" num="03" eyebrow="LOGISTICS / THE BOTTLENECK" tone="ink">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mb-16">
          <h2 className="md:col-span-9 font-display text-h-lg leading-[0.92] tracking-[-0.04em] text-balance">
            One in five <span className="italic text-cyan">Blackwell</span> packages
            <br />hits the bin —<br />
            <span className="text-bg/60">each carrying ~$4,300 of integrated silicon.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
          <div className="md:col-span-7 space-y-6 text-bg/80 text-lead font-light">
            <p>
              A single TSMC 3nm wafer now costs <span className="text-bg font-mono">$18,000–$22,000</span> —
              triple a 28nm wafer a decade ago. Drop a 25-wafer cassette and you've dropped <span className="text-bg font-mono">$544,000</span>{' '}
              on the floor.
            </p>
            <p>
              CoWoS — chip-on-wafer-on-substrate — is where the AI economy is bottlenecked.
              Nvidia booked <span className="text-bg font-mono">~70%</span> of TSMC's CoWoS-L 2025 capacity.
              SK Hynix sold out HBM through 2026. The waitlist runs <span className="text-bg font-mono">12 to 18 months</span>.
            </p>
            <p>
              And when a yield excursion hits, a junior engineer needs <span className="text-bg font-mono">two weeks</span> to read a wafer map.
              A senior glances and knows. There aren't enough seniors.
              <span className="text-bg"> 67,000 unfilled US jobs by 2030.</span> A million-person global skills gap.
            </p>
          </div>

          <div className="md:col-span-5">
            <div className="border-t border-bg/15">
              {LOGISTICS.map(([k, v]) => (
                <div key={k} className="grid grid-cols-12 gap-4 py-5 border-b border-bg/15">
                  <div className="col-span-4 font-display text-h-sm tracking-[-0.025em] tabular-nums text-bg leading-none">
                    {k}
                  </div>
                  <div className="col-span-8 font-mono text-mono-sm text-bg/70 self-center">{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <figure className="mt-24 max-w-3xl">
          <blockquote className="font-display text-[28px] md:text-[34px] tracking-[-0.025em] leading-[1.2] text-bg text-balance">
            "Mechanical stress and warpage. Coefficient of thermal expansion mismatch
            between the silicon dies, bridges, organic interposer, and substrate."
            <br />
            <span className="text-bg/60">Translation: the package bends, and the bond cracks.</span>
          </blockquote>
          <figcaption className="mt-6 font-mono text-mono-sm text-bg/50">
            — SemiAnalysis · Blackwell Reworked · 2024
          </figcaption>
        </figure>
      </Section>

      {/* FOUNDERS */}
      <Section id="founders" num="04" eyebrow="FOUNDERS / THE TEAM" tone="cream">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mb-14">
          <h2 className="md:col-span-9 font-display text-h-lg leading-[0.92] tracking-[-0.04em] text-balance">
            Built by people who've spent
            <br />years in <span className="italic text-cyan">leading-edge fabs</span>.
          </h2>
          <p className="md:col-span-3 text-text-dim text-body">
            Process engineers, quality systems, and platform builders.
            We have read the wafer map at 3 a.m.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {FOUNDERS.map((f) => (
            <article key={f.role} className="bg-surface hairline-strong p-7 relative corner-ticks">
              <span className="tick-tr" /><span className="tick-bl" />
              <div className="flex items-start gap-4 mb-6">
                <div className="w-14 h-14 grid place-items-center bg-ink text-bg font-display text-[20px] tracking-[-0.04em]">
                  {f.init}
                </div>
                <div className="flex-1 leading-tight">
                  <div className="font-display text-[20px] tracking-[-0.025em]">{f.name}</div>
                  <div className="font-mono text-mono-xs text-cyan mt-1.5 uppercase tracking-[0.18em]">{f.role}</div>
                </div>
              </div>
              <p className="text-text-dim text-body leading-[1.55]">{f.bio}</p>
            </article>
          ))}
        </div>
      </Section>

      {/* SOLUTION */}
      <Section id="solution" num="05" eyebrow="SOLUTION / COWOS" tone="paper">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-end mb-16">
          <h2 className="md:col-span-8 font-display text-h-lg leading-[0.92] tracking-[-0.04em] text-balance">
            The autonomous AI <span className="italic text-cyan">process engineer</span>
            <br />that closes the loop.
          </h2>
          <div className="md:col-span-4 text-text-dim text-lead font-light">
            In the <span className="font-mono text-text">standards language</span> fabs already speak —
            MIL-STD, IPC-A-610J, JEDEC JESD22, SEMI E142.
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-16">
          {SOLUTION.map((s) => (
            <article key={s.title} className="relative bg-bg hairline p-7 corner-ticks">
              <span className="tick-tr" /><span className="tick-bl" />
              <div className="flex items-start gap-5">
                <span className="material-symbols-outlined text-cyan text-[28px] mt-1">{s.icon}</span>
                <div>
                  <div className="font-display text-[22px] tracking-[-0.025em] mb-2">{s.title}</div>
                  <p className="text-text-dim text-body leading-[1.55]">{s.body}</p>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Stack badges */}
        <div className="border-t border-rule pt-10">
          <div className="font-mono text-eyebrow text-text-muted mb-5">SPEAKS NATIVELY</div>
          <div className="flex flex-wrap gap-2">
            {[
              'MIL-STD-1629A', 'IPC-A-610J', 'J-STD-001J', 'JEDEC JESD22', 'JEDEC JESD47',
              'SEMI E10', 'SEMI E79', 'SEMI E142', 'KLARF', 'SAE J1739:2021', 'AIAG-VDA 2019',
            ].map((s) => (
              <span key={s} className="font-mono text-mono-xs hairline px-3 py-1.5 text-text-dim">{s}</span>
            ))}
          </div>
        </div>
      </Section>

      {/* ARCHITECTURE — five-stage system overview, real components, real numbers */}
      <Section id="architecture" num="06" eyebrow="ARCHITECTURE / SYSTEM" tone="cream">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-end mb-14">
          <h2 className="md:col-span-8 font-display text-h-lg leading-[0.92] tracking-[-0.04em] text-balance">
            One pipeline, <span className="italic text-cyan">five stages</span>,
            <br />every component live in this demo.
          </h2>
          <p className="md:col-span-4 text-text-dim text-lead font-light">
            No mocks. No stubs. Each block below is a service running on this
            laptop right now — Encord on the labelling side, FastAPI on the
            intelligence side, React on the surface.
          </p>
        </div>

        {/* Five-stage horizontal flow */}
        <ol className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-14" aria-label="System architecture stages">
          {ARCHITECTURE_STAGES.map((s, i) => (
            <li key={s.num} className="relative bg-surface hairline-strong p-5 corner-ticks flex flex-col">
              <span className="tick-tr" /><span className="tick-bl" />
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-eyebrow text-text-muted">/ {s.num}</span>
                <span className="font-mono text-eyebrow text-cyan uppercase tracking-[0.18em]">
                  {s.role}
                </span>
              </div>
              <div className="font-display text-[22px] tracking-[-0.025em] leading-tight">
                {s.name}
              </div>
              <div className="font-mono text-mono-xs text-text-muted mt-1 mb-4">
                {s.title}
              </div>
              <p className="text-text-dim text-body leading-[1.5] mb-5 flex-1">
                {s.body}
              </p>
              <div className="flex flex-wrap gap-1.5 pt-4 border-t border-rule">
                {s.chips.map((c) => (
                  <span key={c} className="font-mono text-mono-xs hairline px-2 py-0.5 text-text-dim">
                    {c}
                  </span>
                ))}
              </div>
              {i < ARCHITECTURE_STAGES.length - 1 && (
                <span
                  aria-hidden="true"
                  className="hidden md:block absolute top-1/2 -right-2 -translate-y-1/2 font-mono text-cyan text-[18px] z-10"
                >
                  →
                </span>
              )}
            </li>
          ))}
        </ol>

        {/* Two-column: process ledger + Encord-trained model provenance */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-7 bg-surface hairline-strong p-7 relative corner-ticks">
            <span className="tick-tr" /><span className="tick-bl" />
            <div className="font-mono text-eyebrow text-text-muted mb-5">/ DATA FLOW</div>
            <pre className="font-mono text-mono-xs text-text-dim leading-[1.65] whitespace-pre-wrap">
{`wafer image
   ↓  POST /classify           classifier_service · :8001  (ResNet18 + Gemini fallback)
{defect_pattern, confidence}
   ↓  POST /enrich             loopback_api · :8000
{S, O, D, RPN, MIL-STD-1629A, IPC-A-610J class, JEDEC impact}
   ↓  POST /correlate          loopback_api · :8000
{root_cause, primary_correlated_variable, evidence[], confidence}
   ↓  POST /fix-and-verify     loopback_api · :8000
{rpn_before → rpn_after, verification_batch, fix_verified}
   ↓  POST /report             loopback_api · :8000
FMECA-YYYYMMDD-XXXXXX.pdf  (regulator-ready)`}
            </pre>
          </div>

          <div className="md:col-span-5 bg-surface hairline-strong p-7 relative corner-ticks flex flex-col">
            <span className="tick-tr" /><span className="tick-bl" />
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-eyebrow text-text-muted">/ MODEL PROVENANCE</span>
              <a
                href="https://encord.com/"
                target="_blank"
                rel="noreferrer noopener"
                className="font-mono text-eyebrow text-cyan hover:underline tracking-[0.18em]"
              >
                ↗ ENCORD
              </a>
            </div>
            <dl className="space-y-3 flex-1">
              {MODEL_PROVENANCE.map(([k, v]) => (
                <div key={k} className="flex items-baseline gap-3 border-b border-rule pb-2 last:border-0">
                  <dt className="font-mono text-eyebrow text-text-muted shrink-0 w-28 uppercase tracking-[0.16em]">
                    {k}
                  </dt>
                  <dd className="font-mono text-mono-xs text-text-dim leading-snug">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-5 pt-4 border-t border-rule font-mono text-mono-xs text-text-muted leading-relaxed">
              The Encord platform owns the entire labelling lifecycle: ontology,
              pre-label suggestions, human review queue, and SDK export. The
              dashboard you saw was trained on that exported CSV, end-to-end.
            </div>
          </div>
        </div>
      </Section>

      {/* DEMO CTA */}
      <section id="demo" className="relative bg-ink text-bg py-32 md:py-44 overflow-hidden">
        <div className="absolute inset-0 dot-grid opacity-20 pointer-events-none" />
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-cyan/15 blur-3xl pointer-events-none" />

        <div className="relative max-w-[1280px] mx-auto px-8 md:px-16 text-center">
          <div className="font-mono text-eyebrow text-cyan mb-10 flex items-center justify-center gap-3">
            <span className="w-8 h-px bg-cyan" />
            07 · LIVE DEMO
            <span className="w-8 h-px bg-cyan" />
          </div>

          <h2 className="font-display text-[64px] md:text-[112px] leading-[0.9] tracking-[-0.05em] text-balance">
            See cowos<br />
            <span className="italic text-cyan">on a real line</span>.
          </h2>

          <p className="mt-10 max-w-2xl mx-auto text-bg/70 text-[20px] leading-[1.5] font-light">
            Eight stages, one critical excursion, RPN 187 → 42 in four hours.
            The same flow Hugo runs at <span className="font-mono text-bg">CoWoS-Station-A42</span>.
          </p>

          <Link
            to="/demo"
            className="group mt-14 inline-flex items-center gap-5 bg-cyan text-ink hover:bg-bg transition-colors px-8 py-5"
          >
            <span className="font-display text-[24px] tracking-[-0.02em]">Go to demo</span>
            <span className="font-mono text-mono-xs uppercase tracking-[0.18em] border-l border-ink/20 pl-5">
              /demo · STG-04
            </span>
            <span className="material-symbols-outlined text-[24px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
          </Link>

          <div className="mt-10 font-mono text-mono-xs text-bg/50">
            no login · no setup · ~30 sec walkthrough
          </div>
        </div>

        {/* footer line */}
        <div className="relative mt-32 max-w-[1280px] mx-auto px-8 md:px-16">
          {/* credits row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-10 border-b border-bg/15">
            <div>
              <div className="font-mono text-eyebrow text-cyan mb-3">BACKED BY</div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-3 font-display text-[18px] tracking-[-0.02em]">
                {BACKERS.map(({ name, href, domain }) => (
                  <a
                    key={name}
                    href={href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="group flex items-center gap-2 text-bg hover:text-cyan transition-colors"
                  >
                    <img
                      src={logoSrc(domain)}
                      alt=""
                      width={22}
                      height={22}
                      loading="lazy"
                      className="w-[22px] h-[22px] rounded-sm bg-bg/90 p-0.5 group-hover:scale-110 transition-transform"
                    />
                    <span>{name}</span>
                  </a>
                ))}
              </div>
            </div>
            <div>
              <div className="font-mono text-eyebrow text-cyan mb-3">POWERED BY</div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-3 font-display text-[15px] tracking-[-0.015em]">
                {POWERED.map(({ name, href, domain }) => (
                  <a
                    key={name}
                    href={href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="group flex items-center gap-2 text-bg/80 hover:text-cyan transition-colors"
                  >
                    <img
                      src={logoSrc(domain)}
                      alt=""
                      width={18}
                      height={18}
                      loading="lazy"
                      className="w-[18px] h-[18px] rounded-sm bg-bg/90 p-0.5 group-hover:scale-110 transition-transform"
                    />
                    <span>{name}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 font-mono text-mono-xs text-bg/50">
            <div>cowos · the autonomous AI process engineer · 2026</div>
            <div className="flex gap-6">
              <a href="#problem" className="hover:text-cyan">Top</a>
              <Link to="/demo" className="hover:text-cyan">Demo</Link>
              <a href="mailto:hello@cowos.ai" className="hover:text-cyan">hello@cowos.ai</a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
