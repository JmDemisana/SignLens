import { fingerChains, palmChain, referenceAngle } from '../engine/referenceHands'
import { findTemplate } from '../engine/templates'
import type { HandLandmarks } from '../engine/types'

export function HandDiagram({ pose, sign, flip = false }: { pose: HandLandmarks; sign: string; flip?: boolean }) {
  const angle = referenceAngle(sign)
  const template = findTemplate(sign)
  const path = template?.path
  const points = pose.map(({ x, y, z }) => {
    const depth = -z * 3
    const center = (x - 0.5) * 2.2
    return {
      x: 125 + (flip ? -1 : 1) * (center * Math.cos(angle) + depth * Math.sin(angle)) * 143,
      y: 140 + (y - 0.5) * 295,
      depth: depth * Math.cos(angle) - center * Math.sin(angle),
    }
  })
  if (sign === 'X') {
    const root = points[5]
    const width = Math.hypot(points[17].x - root.x, points[17].y - root.y)
    const direction = flip ? -1 : 1
    points[6] = { ...points[6], x: root.x, y: root.y - width * 0.55 }
    points[7] = { ...points[7], x: root.x + direction * width * 0.12, y: root.y - width * 0.72 }
    points[8] = { ...points[8], x: root.x + direction * width * 0.25, y: root.y - width * 0.53 }
  }
  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  const size = Math.max(maxX - minX, maxY - minY, 40) + 46
  const viewX = (minX + maxX - size) / 2
  const viewY = (minY + maxY - size) / 2
  const outline = palmChain.map((i) => `${points[i].x},${points[i].y}`).join(' ')
  const fingers = fingerChains.flatMap((chain, finger) => chain.slice(1).map((end, j) => ({
    finger, end, start: chain[j], depth: (points[end].depth + points[chain[j]].depth) / 2,
  }))).sort((a, b) => a.depth - b.depth)
  // Matches the 5-finger color coding on the live camera overlay
  const colors = ['#facc15', '#38bdf8', '#4ade80', '#c084fc', '#f472b6']

  // Map template motion path onto the SVG diagram coordinates so dynamic signs show their directional trajectory arrow
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const pathPts = path && path.length >= 2
    ? path.map((p) => ({
        x: cx + (flip ? -1 : 1) * (p.x - 0.5) * size * 1.45,
        y: cy + (p.y - 0.5) * size * 1.45,
      }))
    : []
  const lastPt = pathPts.at(-1)
  const prevPt = pathPts.length >= 2 ? pathPts[pathPts.length - 2] : null
  const arrowAngle = lastPt && prevPt ? Math.atan2(lastPt.y - prevPt.y, lastPt.x - prevPt.x) * (180 / Math.PI) : 0

  return (
    <svg viewBox={`${viewX} ${viewY} ${size} ${size}`} role="img" aria-label={`Handshape diagram for ${sign}`} className="sl-hand-diagram">
      <polygon points={outline} fill="#274049" stroke="#6da2ae" strokeWidth="3.5" strokeLinejoin="round" />
      {[[0, 5], [0, 9], [0, 13], [0, 17]].map(([a, b]) => (
        <line key={b} x1={points[a].x} y1={points[a].y} x2={points[b].x} y2={points[b].y} stroke="#55808b" strokeWidth="2" />
      ))}
      {fingers.map(({ finger, start, end }) => (
        <g key={end} strokeLinecap="round">
          <line x1={points[start].x} y1={points[start].y} x2={points[end].x} y2={points[end].y} stroke="#13232b" strokeWidth="14" />
          <line x1={points[start].x} y1={points[start].y} x2={points[end].x} y2={points[end].y} stroke={colors[finger]} strokeWidth="8" />
          <circle cx={points[end].x} cy={points[end].y} r={end % 4 ? 2 : 3.25} fill="#f6ffff" />
        </g>
      ))}
      {pathPts.length >= 2 && lastPt && (
        <g>
          <polyline
            fill="none"
            stroke="#58cc02"
            strokeWidth="4.5"
            strokeDasharray="6 4"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={pathPts.map((p) => `${p.x},${p.y}`).join(' ')}
          />
          <circle cx={pathPts[0].x} cy={pathPts[0].y} r="5" fill="#facc15" stroke="#0b1218" strokeWidth="2" />
          <g transform={`translate(${lastPt.x},${lastPt.y}) rotate(${arrowAngle})`}>
            <polygon points="0,0 -12,-6 -12,6" fill="#58cc02" stroke="#0b1218" strokeWidth="1.5" />
          </g>
        </g>
      )}
    </svg>
  )
}
