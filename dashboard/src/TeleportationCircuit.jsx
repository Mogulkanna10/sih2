/**
 * TeleportationCircuit — Reference B Node-Graph
 * REDESIGNED: larger nodes, bold readable text, strong colours,
 * high-contrast labels, wider spacing.
 *
 * PRESENTATION ONLY — no business logic / prop changes.
 * Props: { sessionId, verdict }
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ─────────────────────────────────────────────────────────────────
   NODE DEFINITIONS  (bigger radii, wider spread)
   viewBox: 0 0 1300 500
───────────────────────────────────────────────────────────────── */
const NODES = [
  {
    id: 'alice', cx: 110, cy: 200,
    stage: 'STAGE 1', title: 'Alice Signer',
    detail: '|ψ⟩ & C_A', color: '#7C3AAD', r: 52,
    icon: '⊗',
    role: 'Prepares BB84 state material and creates binding commitments',
  },
  {
    id: 'bell', cx: 320, cy: 200,
    stage: 'STAGE 2', title: 'EPR Bell Source',
    detail: '|Φ⁺⟩', color: '#8B5CF6', r: 52,
    icon: '⊕',
    role: 'Distributes entangled Bell pairs between Alice and Bob',
  },
  {
    id: 'tele', cx: 530, cy: 200,
    stage: 'STAGE 3', title: 'Teleportation',
    detail: 'BSM + Pauli', color: '#059669', r: 52,
    icon: '↕',
    role: 'Bell-state measurement and conditional Pauli correction',
  },
  {
    id: 'pbtdf', cx: 760, cy: 115,
    stage: 'STAGE 4', title: 'PB-DTF',
    detail: 'e_b ≤ τ_b', color: '#6A2C91', r: 52,
    icon: '⊡',
    role: 'Statistical Hoeffding threshold gate (X, Y, Z bases)',
  },
  {
    id: 'dbev', cx: 760, cy: 360,
    stage: 'SURVEILLANCE', title: 'DBEV Decoy',
    detail: 'e_Bell', color: '#D97706', r: 46,
    icon: '◎',
    role: 'Cross-Basis decoy state audit for eavesdropping',
  },
  {
    id: 'qtam', cx: 1000, cy: 240,
    stage: 'FORENSICS', title: 'Q-TAM Engine',
    detail: 'Rules 1–9', color: '#DC2626', r: 52,
    icon: '⬡',
    role: 'Deterministic threat attribution rule table',
  },
  {
    id: 'verdict', cx: 1205, cy: 240,
    stage: 'FINAL OUTCOME', title: 'Verdict Gate',
    detail: 'ACCEPT · ALERT\nREJECT', color: '#16A34A', r: 66,
    icon: '⚖',
    role: 'Final gate — outputs protocol decision',
    isVerdict: true,
  },
];

const EDGES = [
  { id: 'e1', from: 'alice',  to: 'bell',    label: 'State |ψ⟩' },
  { id: 'e2', from: 'bell',   to: 'tele',    label: 'EPR Pairs' },
  { id: 'e3', from: 'tele',   to: 'pbtdf',   label: 'Test Qubits X,Y,Z' },
  { id: 'e4', from: 'tele',   to: 'dbev',    label: 'Decoy positions' },
  { id: 'e5', from: 'pbtdf',  to: 'qtam',    label: 'Basis error rates' },
  { id: 'e6', from: 'dbev',   to: 'qtam',    label: 'e_Bell' },
  { id: 'e7', from: 'qtam',   to: 'verdict', label: 'Decision D' },
  { id: 'e8', from: 'pbtdf',  to: 'verdict', label: 'Pass (all e_b ≤ τ_b)', dashed: true },
];

function getNode(id) { return NODES.find(n => n.id === id); }

/* bezier path + midpoint for label */
function bezierPath(from, to) {
  const src = getNode(from);
  const tgt = getNode(to);
  if (!src || !tgt) return { d: '', mx: 0, my: 0 };

  const dx = tgt.cx - src.cx;
  const dy = tgt.cy - src.cy;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;

  const sx = src.cx + (dx / dist) * src.r;
  const sy = src.cy + (dy / dist) * src.r;
  const ex = tgt.cx - (dx / dist) * tgt.r;
  const ey = tgt.cy - (dy / dist) * tgt.r;

  const mx   = (sx + ex) / 2;
  const my   = (sy + ey) / 2;
  const perp = 0.22;
  const cpx  = mx - dy * perp;
  const cpy  = my + dx * perp;

  const lx = 0.25 * sx + 0.5 * cpx + 0.25 * ex;
  const ly = 0.25 * sy + 0.5 * cpy + 0.25 * ey;

  return { d: `M ${sx} ${sy} Q ${cpx} ${cpy} ${ex} ${ey}`, mx: lx, my: ly };
}

/* Animated pulse dot along a path */
function PulseDot({ pathId, color, delay = 0 }) {
  return (
    <circle r={5} fill={color} fillOpacity={0.9}>
      <animateMotion dur="2.8s" begin={`${delay}s`} repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1">
        <mpath href={`#${pathId}`} />
      </animateMotion>
      <animate attributeName="opacity" values="0;1;1;0" dur="2.8s" begin={`${delay}s`} repeatCount="indefinite" />
    </circle>
  );
}

function verdictNodeColor(verdict, node) {
  if (!verdict || node.id !== 'verdict') return node.color;
  return verdict === 'ACCEPT' ? '#16A34A' : verdict === 'REJECT' ? '#DC2626' : '#D97706';
}

/* ─────────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────────── */
export default function TeleportationCircuit({ sessionId, verdict }) {
  const [hovered,    setHovered]    = useState(null);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') setFullscreen(false); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  function renderSVG() {
    const W = 1300, H = 500;

    return (
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: '100%', display: 'block', overflow: 'visible' }}
        role="img" aria-label="QUASAR-TDS Pipeline — Teleportation Circuit and Bell-Decoy Flow"
      >
        <defs>
          {/* Glow filter */}
          <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="glow-sm" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>

          {/* Node glass gradients */}
          {NODES.map(n => (
            <radialGradient key={n.id} id={`ng-${n.id}`} cx="36%" cy="32%" r="68%">
              <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.82" />
              <stop offset="60%"  stopColor={n.color} stopOpacity="0.12" />
              <stop offset="100%" stopColor={n.color} stopOpacity="0.22" />
            </radialGradient>
          ))}

          {/* Hidden edge paths for pulse dots */}
          {EDGES.map(e => {
            const { d } = bezierPath(e.from, e.to);
            return <path key={e.id} id={`path-${e.id}`} d={d} fill="none" />;
          })}
        </defs>

        {/* ── EDGES ──────────────────────────────────────────── */}
        {EDGES.map((edge, i) => {
          const { d, mx, my } = bezierPath(edge.from, edge.to);
          const srcColor = getNode(edge.from)?.color ?? '#6A2C91';
          return (
            <g key={edge.id}>
              {/* Line */}
              <path d={d} fill="none"
                stroke="rgba(106,44,145,0.30)"
                strokeWidth={2.5}
                strokeDasharray={edge.dashed ? '8 6' : undefined}
                strokeLinecap="round"
              />

              {/* Label chip */}
              <g>
                <rect x={mx - 56} y={my - 12} width={112} height={24} rx={12}
                  fill="rgba(255,255,255,0.88)"
                  stroke="rgba(106,44,145,0.18)"
                  strokeWidth={1}
                  style={{ filter: 'drop-shadow(0 2px 4px rgba(106,44,145,0.12))' }}
                />
                <text x={mx} y={my + 1} textAnchor="middle" dominantBaseline="central"
                  fontSize={10} fontWeight={700} fill="#374151"
                  fontFamily="Inter, sans-serif" letterSpacing="0.02em">
                  {edge.label}
                </text>
              </g>

              {/* Pulse dot */}
              <PulseDot pathId={`path-${edge.id}`} color={srcColor} delay={i * 0.38} />
            </g>
          );
        })}

        {/* ── NODES ──────────────────────────────────────────── */}
        {NODES.map(node => {
          const isHov = hovered === node.id;
          const ringColor = verdictNodeColor(verdict, node);
          const isVerdict = node.isVerdict;

          return (
            <g key={node.id}
              transform={`translate(${node.cx}, ${node.cy})`}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHovered(node.id)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* Outer glow ring (verdict node pulsing) */}
              {isVerdict && !verdict && (
                <circle r={node.r + 20} fill="none" stroke={ringColor} strokeWidth={2} strokeOpacity={0.20}>
                  <animate attributeName="r" values={`${node.r+14};${node.r+24};${node.r+14}`} dur="3s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.35;0.08;0.35" dur="3s" repeatCount="indefinite" />
                </circle>
              )}

              {/* Ring 2 — accent outer border */}
              <circle r={node.r + 8}
                fill="none"
                stroke={ringColor}
                strokeWidth={isHov ? 3.5 : 2.5}
                strokeOpacity={isHov ? 1.0 : isVerdict ? 0.85 : 0.55}
                filter={isVerdict || isHov ? 'url(#glow-sm)' : undefined}
                style={{ transition: 'all 0.2s' }}
              />

              {/* Ring 1 — tight inner ring */}
              <circle r={node.r + 2}
                fill="none"
                stroke={ringColor}
                strokeWidth={1}
                strokeOpacity={0.30}
              />

              {/* Glass fill */}
              <circle r={node.r}
                fill={`url(#ng-${node.id})`}
                stroke="rgba(255,255,255,0.80)"
                strokeWidth={2}
                style={{
                  filter: isHov ? `drop-shadow(0 6px 18px ${ringColor}66)` : undefined,
                  transition: 'filter 0.2s',
                }}
              />

              {/* Centre icon */}
              <text y={-8}
                textAnchor="middle" dominantBaseline="central"
                fontSize={isVerdict ? 28 : 22}
                fill={ringColor}
                fontFamily="Inter, system-ui, sans-serif"
                fontWeight="700"
                filter={isVerdict ? 'url(#glow-sm)' : undefined}
              >
                {node.icon}
              </text>

              {/* Detail text (formula/value) */}
              <text y={14}
                textAnchor="middle" dominantBaseline="central"
                fontSize={isVerdict ? 11 : 10}
                fill={ringColor}
                fontFamily="'JetBrains Mono', monospace"
                fontWeight="600"
                fillOpacity={0.85}
              >
                {node.detail.split('\n').map((line, li) => (
                  <tspan key={li} x={0} dy={li === 0 ? 0 : 13}>{line}</tspan>
                ))}
              </text>

              {/* Stage label ABOVE node */}
              <text y={-(node.r + 18)}
                textAnchor="middle"
                fontSize={10} fontWeight={800}
                fill={ringColor} fillOpacity={0.75}
                fontFamily="Inter, sans-serif"
                letterSpacing="0.10em"
              >
                {node.stage}
              </text>

              {/* Node title BELOW node */}
              <text y={node.r + 20}
                textAnchor="middle"
                fontSize={isVerdict ? 15 : 13}
                fontWeight={800}
                fill="#1A1523"
                fontFamily="Inter, sans-serif"
                letterSpacing="-0.01em"
              >
                {node.title}
              </text>
            </g>
          );
        })}

        {/* ── HOVER TOOLTIP ──────────────────────────────────── */}
        {hovered && (() => {
          const n = getNode(hovered);
          if (!n) return null;
          const tx = n.cx < 700 ? n.cx + n.r + 14 : n.cx - n.r - 200;
          const ty = Math.max(10, n.cy - 50);
          return (
            <g>
              <rect x={tx} y={ty} width={186} height={78} rx={14}
                fill="rgba(255,255,255,0.94)"
                stroke="rgba(255,255,255,0.85)"
                strokeWidth={1.5}
                style={{ filter: 'drop-shadow(0 8px 24px rgba(106,44,145,0.18))' }}
              />
              {/* Colour accent bar */}
              <rect x={tx} y={ty} width={4} height={78} rx={2} fill={n.color} />
              <text x={tx + 16} y={ty + 20} fontSize={12} fontWeight={800} fill={n.color} fontFamily="Inter, sans-serif">
                {n.title}
              </text>
              <foreignObject x={tx + 12} y={ty + 28} width={166} height={46}>
                <p xmlns="http://www.w3.org/1999/xhtml" style={{
                  margin: 0, fontSize: 10.5, fontFamily: 'Inter, sans-serif',
                  color: '#6B7280', lineHeight: 1.5,
                }}>
                  {n.role}
                </p>
              </foreignObject>
            </g>
          );
        })()}

        {/* ── VERDICT BADGE on gate ────────────────────────── */}
        {verdict && (() => {
          const vn = getNode('verdict');
          const vc = verdict === 'ACCEPT' ? '#16A34A' : verdict === 'REJECT' ? '#DC2626' : '#D97706';
          const vi = verdict === 'ACCEPT' ? '✓' : verdict === 'REJECT' ? '✗' : '⚠';
          return (
            <g transform={`translate(${vn.cx}, ${vn.cy + vn.r + 40})`}>
              <rect x={-52} y={-18} width={104} height={36} rx={18}
                fill={vc}
                style={{ filter: `drop-shadow(0 4px 14px ${vc}55)` }}
              />
              <text textAnchor="middle" dominantBaseline="central"
                fontSize={15} fontWeight={900} fill="#fff"
                fontFamily="Inter, sans-serif" letterSpacing="0.03em">
                {vi} {verdict}
              </text>
            </g>
          );
        })()}
      </svg>
    );
  }

  /* ─────────────────────────────────────────────────────────────
     RENDER
  ──────────────────────────────────────────────────────────────*/
  return (
    <>
      {/* Inline view */}
      <div style={{ position: 'relative' }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <button
            onClick={() => setFullscreen(true)}
            style={{
              background: 'rgba(106,44,145,0.08)',
              border: '1px solid rgba(106,44,145,0.18)',
              borderRadius: 100, padding: '5px 14px',
              fontSize: 11.5, fontWeight: 600,
              color: 'var(--brand-purple)',
              cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              display: 'flex', alignItems: 'center', gap: 6,
              transition: 'all 0.15s',
            }}
          >
            ⛶ Fullscreen
          </button>
        </div>

        {/* SVG diagram */}
        <div style={{
          width: '100%',
          height: 'clamp(260px, 40vw, 460px)',
          background: 'rgba(255,255,255,0.18)',
          borderRadius: 16,
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.50)',
        }}>
          {renderSVG()}
        </div>

        {/* Node legend */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 14,
          padding: '12px 16px',
          background: 'rgba(255,255,255,0.35)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.55)',
          borderRadius: 12,
        }}>
          {NODES.map(n => (
            <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 500 }}>
              <span style={{
                width: 12, height: 12, borderRadius: '50%',
                background: n.color, display: 'inline-block', flexShrink: 0,
                boxShadow: `0 0 5px ${n.color}66`,
              }} />
              <span style={{ color: 'var(--text-primary)' }}>{n.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Fullscreen modal ─────────────────────────────────── */}
      <AnimatePresence>
        {fullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(240,235,255,0.88)',
              backdropFilter: 'blur(32px)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: '40px 28px',
            }}
            onClick={e => { if (e.target === e.currentTarget) setFullscreen(false); }}
          >
            <motion.div
              initial={{ scale: 0.92, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 14 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              style={{
                background: 'rgba(255,255,255,0.62)',
                backdropFilter: 'blur(28px)',
                border: '1px solid rgba(255,255,255,0.72)',
                borderRadius: 26,
                boxShadow: '0 28px 80px rgba(106,44,145,0.20)',
                padding: '28px 32px',
                width: '100%', maxWidth: 1240,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#1A1523', letterSpacing: '-0.02em' }}>
                    Teleportation Circuit &amp; Bell-Decoy Flow
                  </div>
                  <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
                    §6–§15 QUASAR-TDS Pipeline · Full Stage View
                  </div>
                </div>
                <button onClick={() => setFullscreen(false)} style={{
                  background: 'rgba(106,44,145,0.08)',
                  border: '1px solid rgba(106,44,145,0.18)',
                  borderRadius: 100, padding: '7px 18px',
                  fontSize: 12.5, fontWeight: 700,
                  color: 'var(--brand-purple)', cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                }}>
                  ✕ Close
                </button>
              </div>

              <div style={{ width: '100%', height: 460 }}>
                {renderSVG()}
              </div>

              {/* Stage detail cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: 10, marginTop: 20,
              }}>
                {NODES.map(n => (
                  <div key={n.id} style={{
                    display: 'flex', gap: 12, alignItems: 'flex-start',
                    background: 'rgba(255,255,255,0.48)',
                    border: '1px solid rgba(255,255,255,0.68)',
                    borderRadius: 12, padding: '11px 14px',
                    borderLeft: `3px solid ${n.color}`,
                  }}>
                    <span style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: n.color + '18',
                      border: `2px solid ${n.color}55`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16, flexShrink: 0,
                    }}>
                      {n.icon}
                    </span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#1A1523', marginBottom: 3 }}>{n.title}</div>
                      <div style={{ fontSize: 10.5, color: '#6B7280', lineHeight: 1.5 }}>{n.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
