'use client'

import { useMemo, useRef, useState, useEffect } from 'react'
import * as d3 from 'd3'
import { Braces, CircleHelp, GitBranch, Sparkles } from 'lucide-react'

const palette = ['#75e4d0', '#9ac8ff', '#c7f3dd', '#d9b8ff']

export function TokenQuadtree({ text }: { text?: string }) {
  const width = 760
  const height = 330
  const [active, setActive] = useState<string | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const sentence = text || 'The moonlight found its way through the cedar trees.'

  const tokenData = useMemo(() => {
    const tokens = sentence.match(/\b\w+\b|[^\w\s]/g) || ['...']
    const limitedTokens = tokens.slice(0, 16)
    
    const getProb = (str: string, index: number) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
      return 0.5 + (Math.abs(hash * (index + 1)) % 50) / 100;
    }

    return limitedTokens.map((t, i) => [t, getProb(t, i)] as [string, number])
  }, [sentence])

  const [nodesData, setNodesData] = useState<{ points: any[], cells: any[] }>({ points: [], cells: [] })

  useEffect(() => {
    const points = tokenData.map(([token, probability], index) => ({
      token,
      probability: probability as number,
      index,
      x: width / 2 + (Math.random() - 0.5) * 100,
      y: height / 2 + (Math.random() - 0.5) * 100,
      radius: 12 + (probability as number) * 19,
    }))

    const simulation = d3.forceSimulation(points)
      .force('charge', d3.forceManyBody().strength(-180))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius((d: any) => d.radius + 18).iterations(3))
      .force('x', d3.forceX(width / 2).strength(0.08))
      .force('y', d3.forceY(height / 2).strength(0.08))

    // Run simulation synchronously to get immediate layout
    simulation.tick(150)
    simulation.stop()

    // Build the quadtree from the settled points
    const quadtree = d3.quadtree<{ x: number; y: number }>()
      .x(d => d.x)
      .y(d => d.y)
      .extent([[0, 0], [width, height]])
      .addAll(points)

    const cells: { x0: number, y0: number, x1: number, y1: number }[] = []
    quadtree.visit((node: any, x0, y0, x1, y1) => {
      cells.push({ x0, y0, x1, y1 })
      return false
    })

    setNodesData({ points, cells })
  }, [tokenData])

  const { points: nodes, cells } = nodesData
  const selected = nodes.find((node) => node.token === active) ?? nodes[0] ?? { token: '...', probability: 0.5, index: 0, x: 50, y: 48, radius: 15 }

  return (
    <section className="token-quadtree-section" aria-labelledby="token-quadtree-title">
      <div className="token-quadtree-heading">
        <div>
          <p className="eyebrow">D3.JS · TOKEN PROBABILITY FIELD</p>
          <h2 id="token-quadtree-title">See the sentence<br /><em>become a thought.</em></h2>
        </div>
        <p>Every word is split into a token, then placed into a quadtree spatial index. Brighter, larger nodes carry more confidence; the branches reveal how the model distributes attention across the sequence.</p>
      </div>
      <div className="token-quadtree-card">
        <div className="token-quadtree-toolbar">
          <span><GitBranch size={14} /> QUADTREE / 4 DEPTH LEVELS</span>
          <span><Sparkles size={14} /> HOVER A TOKEN TO INSPECT</span>
        </div>
        <div className="token-quadtree-stage">
          <svg ref={svgRef} className="token-quadtree-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Quadtree visualization of sentence tokens and their probabilities">
            <defs>
              <filter id="token-glow"><feGaussianBlur stdDeviation="4" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
              <linearGradient id="token-flow" x1="0" x2="1"><stop stopColor="#75e4d0" stopOpacity=".14" /><stop offset="1" stopColor="#9ac8ff" stopOpacity=".5" /></linearGradient>
            </defs>
            <g className="token-connection-layer" aria-hidden="true">
              {nodes.slice(0, -1).map((node, index) => {
                const next = nodes[index + 1]
                const midX = (node.x + next.x) / 2
                const curve = index % 2 === 0 ? -18 : 18
                return <path key={`connection-${index}`} className="token-connection-line" d={`M ${node.x} ${node.y} Q ${midX} ${((node.y + next.y) / 2) + curve} ${next.x} ${next.y}`} />
              })}
            </g>
            <path className="token-flow-line" d="M22 270 C170 236 210 285 350 244 S560 200 738 245" />
            <path className="token-flow-line faint" d="M22 70 C160 113 220 45 360 92 S580 130 738 74" />
            <g className="quadtree-cells-layer">
              {cells.map((cell, i) => (
                <rect key={`cell-${i}`} x={cell.x0} y={cell.y0} width={cell.x1 - cell.x0} height={cell.y1 - cell.y0} fill="none" stroke="var(--theme-accent, #80d7d1)" strokeOpacity="0.15" strokeDasharray="2 4" />
              ))}
            </g>
            {nodes.map((node, index) => {
              const isActive = active === node.token
              const color = palette[index % palette.length]
              return <g key={`${node.token}-${index}`} className={`token-node ${isActive ? 'active' : ''}`} transform={`translate(${node.x}, ${node.y})`} onMouseEnter={() => setActive(node.token)} onFocus={() => setActive(node.token)} onMouseLeave={() => setActive(null)} onBlur={() => setActive(null)} tabIndex={0} role="button" aria-label={`${node.token}, ${Math.round(node.probability * 100)} percent probability`}>
                <circle className="token-quadtree-cell" r={node.radius + 13} stroke={color} strokeOpacity={.09 + node.probability * .1} />
                <circle className="token-node-orbit" r={node.radius + 6} stroke={color} strokeOpacity={.3} />
                <circle className="token-node-core" r={node.radius} fill={color} fillOpacity={.22 + node.probability * .32} stroke={color} filter={isActive ? 'url(#token-glow)' : undefined} />
                <text className="token-node-label" y="4">{node.token}</text>
                <text className="token-node-probability" y={node.radius + 18}>{Math.round(node.probability * 100)}%</text>
              </g>
            })}
            <g className="token-axis"><line x1="26" y1="296" x2="734" y2="296" /><text x="26" y="316">CONTEXT START</text><text x="650" y="316">NEXT TOKEN</text></g>
          </svg>
          <div className="quadtree-selection"><span className="selection-kicker"><CircleHelp size={12} /> INSPECTED NODE</span><strong>{selected.token}</strong><b>{Math.round(selected.probability * 100)}% probability</b><small>Token {selected.index + 1} of {nodes.length} · confidence radius {Math.round(selected.radius)}px</small></div>
        </div>
        <div className="token-quadtree-footer"><span><Braces size={14} /> {sentence}</span><span>Probability is represented by node scale + luminance</span></div>
      </div>
    </section>
  )
}
