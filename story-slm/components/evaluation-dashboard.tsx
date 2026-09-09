'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, Chip, Tooltip } from '@mui/material'
import * as d3 from 'd3'
import { Activity, Cpu, Layers3, MousePointer2, Timer, TrendingUp } from 'lucide-react'
import { TokenQuadtree } from '@/components/token-quadtree'

type Metric = { label: string; value: string; detail: string }

const radarData = [
  { label: 'Accuracy', value: 62.63, display: '62.63%' },
  { label: 'Diversity', value: 88.91, display: '0.8891' },
  { label: 'Speed', value: 95.7, display: '287 tok/s' },
  { label: 'Compactness', value: 91, display: '113 MB' },
  { label: 'Consistency', value: 84, display: '0.4726 repeat' },
]

const trendData = [
  { step: '1k', value: 45.2 }, { step: '5k', value: 51.8 }, { step: '10k', value: 56.1 },
  { step: '15k', value: 59.4 }, { step: '20k', value: 62.63 },
]

const metrics: Metric[] = [
  { label: 'Next-token accuracy', value: '62.63%', detail: 'Exact match on validation' },
  { label: 'Generation speed', value: '287.11 tok/s', detail: 'Average burst inference' },
  { label: 'Model size', value: '113.03 MB', detail: 'In-memory tensor size' },
  { label: 'Vocabulary variety', value: '0.8891', detail: 'Distinct-2 phrase diversity' },
  { label: 'Average output', value: '107.8 tokens', detail: 'Sequence length generated' },
  { label: 'Trainable parameters', value: '29.63 M', detail: '29,630,976 exact parameters' },
]

function RadarChart({ active, onHover }: { active: number | null; onHover: (index: number | null) => void }) {
  const size = 330
  const center = size / 2
  const radius = 116
  const angle = (Math.PI * 2) / radarData.length
  const point = (index: number, value: number) => {
    const theta = index * angle - Math.PI / 2
    const distance = radius * value / 100
    return [center + Math.cos(theta) * distance, center + Math.sin(theta) * distance]
  }
  const polygon = radarData.map((item, index) => point(index, item.value).join(',')).join(' ')

  return <svg className="radar-chart" viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Interactive pentagonal model capability chart">
    {[25, 50, 75, 100].map((ring) => <polygon key={ring} points={radarData.map((_, index) => point(index, ring).join(',')).join(' ')} className="radar-ring" />)}
    {radarData.map((item, index) => {
      const [x, y] = point(index, 100)
      const [labelX, labelY] = point(index, 127)
      return <g key={item.label} onMouseEnter={() => onHover(index)} onMouseLeave={() => onHover(null)} className="radar-axis">
        <line x1={center} y1={center} x2={x} y2={y} />
        <circle cx={point(index, item.value)[0]} cy={point(index, item.value)[1]} r={active === index ? 7 : 4} className="radar-point" />
        <text x={labelX} y={labelY} textAnchor="middle">{item.label}</text>
      </g>
    })}
    <polygon points={polygon} className="radar-area" />
    {active !== null && <g className="radar-tooltip"><rect x={center - 46} y={center - 20} width="92" height="40" rx="10" /><text x={center} y={center - 1} textAnchor="middle">{radarData[active].display}</text><text x={center} y={center + 13} textAnchor="middle">{radarData[active].label}</text></g>}
  </svg>
}

function TrendChart() {
  const line = d3.line<{ step: string; value: number }>().x((_, i) => 12 + i * 66).y((item) => 150 - (item.value - 40) * 3.5).curve(d3.curveCatmullRom.alpha(.7))
  const area = d3.area<{ step: string; value: number }>().x((_, i) => 12 + i * 66).y0(150).y1((item) => 150 - (item.value - 40) * 3.5).curve(d3.curveCatmullRom.alpha(.7))
  return <svg className="trend-chart" viewBox="0 0 290 180" role="img" aria-label="Next-token accuracy trend by training step"><defs><linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--theme-accent)" stopOpacity=".34" /><stop offset="1" stopColor="var(--theme-accent)" stopOpacity="0" /></linearGradient></defs><path d={area(trendData) ?? undefined} fill="url(#trendFill)" /><path d={line(trendData) ?? undefined} className="trend-line" />{trendData.map((item, index) => <g key={item.step}><circle cx={12 + index * 66} cy={150 - (item.value - 40) * 3.5} r="4" className="trend-point" /><text x={12 + index * 66} y="173" textAnchor="middle">{item.step}</text></g>)}</svg>
}

export function EvaluationDashboard({ text }: { text?: string }) {
  const [active, setActive] = useState<number | null>(null)
  const [selectedMetric, setSelectedMetric] = useState(0)
  const selected = metrics[selectedMetric]
  const score = useMemo(() => Math.round(radarData.reduce((sum, item) => sum + item.value, 0) / radarData.length), [])

  return <section className="evaluation-section" aria-labelledby="evaluation-title">
    <div className="evaluation-intro"><p className="eyebrow">PHASE 01 · MODEL EVALUATION</p><h2 id="evaluation-title">Small footprint.<br /><em>Serious signal.</em></h2><p className="evaluation-copy">Story-SLM is built to be expressive without being expensive. Explore the first comprehensive evaluation through interactive views of quality, speed, and model efficiency.</p><div className="evaluation-badges"><Chip icon={<Activity size={14} />} label="Validated checkpoint" size="small" /><Chip icon={<Cpu size={14} />} label="Tesla T4 tested" size="small" /></div></div>
    <div className="evaluation-pentogrid">
      <Card className="chart-card radar-card"><CardContent><div className="chart-heading"><div><p className="eyebrow">CAPABILITY PROFILE</p><h3>Five signals, one model</h3></div><Tooltip title="Hover the vertices to inspect each signal"><MousePointer2 size={16} /></Tooltip></div><div className="radar-layout"><RadarChart active={active} onHover={setActive} /><div className="score-callout"><strong>{score}</strong><span>overall signal<br />index</span></div></div></CardContent></Card>
      <Card className="chart-card trend-card"><CardContent><div className="chart-heading"><div><p className="eyebrow">LEARNING CURVE</p><h3>Accuracy keeps climbing</h3></div><TrendingUp size={17} /></div><TrendChart /><div className="trend-caption"><span>Validation accuracy</span><b>+17.43 pts</b></div></CardContent></Card>
      <Card className="chart-card metric-board"><CardContent><div className="chart-heading"><div><p className="eyebrow">THE NUMBERS</p><h3>Evaluation at a glance</h3></div><Layers3 size={17} /></div><div className="metric-list">{metrics.map((metric, index) => <button key={metric.label} className={selectedMetric === index ? 'active' : ''} onClick={() => setSelectedMetric(index)}><span>{metric.label}</span><strong>{metric.value}</strong></button>)}</div><div className="selected-detail"><span>{selected.detail}</span><b>{selected.label}</b></div></CardContent></Card>
      <Card className="chart-card latency-card"><CardContent><div className="chart-heading"><div><p className="eyebrow">RUNTIME PROFILE</p><h3>Fast enough to feel alive</h3></div><Timer size={17} /></div><div className="latency-stat"><strong>375.47</strong><span>ms average inference latency</span></div><div className="latency-bars"><span style={{ width: '82%' }} /><span style={{ width: '64%' }} /><span style={{ width: '93%' }} /></div><div className="latency-labels"><span>latency</span><span>memory · 3.05 GB</span></div></CardContent></Card>
    </div>
    <TokenQuadtree text={text} />
  </section>
}
