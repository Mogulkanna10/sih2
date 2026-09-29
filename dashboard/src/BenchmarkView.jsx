/**
 * BenchmarkView — Phase 07 performance data from GET /benchmark.
 *
 * Layout (Reference A style):
 *   Row 1: 3 glass KPI tiles with big numbers + sparklines
 *   Row 2: Latency area chart (left) + Verdict donut (right)
 *   Row 3: Clean table — one row per scenario, readable
 *
 * PRESENTATION ONLY — no business logic / API changes.
 */
import { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { motion } from 'framer-motion';
import { getBenchmark } from './api';
import GaugeDial from './GaugeDial';

const VERDICT_COLORS = { ACCEPT: '#3FA34D', ALERT: '#F0B429', REJECT: '#E5484D' };
const VERDICT_BG     = { ACCEPT: 'rgba(63,163,77,0.10)', ALERT: 'rgba(240,180,41,0.10)', REJECT: 'rgba(229,72,77,0.10)' };

// ── Tiny sparkline ──────────────────────────────────────────────────────────
function Spark({ data, color, w = 76, h = 32 }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 6) - 3;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`sg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polyline points={`0,${h} ${pts} ${w},${h}`} fill={`url(#sg-${color.replace('#','')})`} stroke="none" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ── Glass tooltip ───────────────────────────────────────────────────────────
const GlassTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip-glass">
      <div className="tt-label">{label}</div>
      {payload.map(p => (
        <div key={p.name} className="tt-row">
          <span className="tt-dot" style={{ background: p.stroke || p.fill || '#6A2C91' }} />
          <span style={{ color: 'var(--text-secondary)', minWidth: 60 }}>{p.name}:</span>
          <span style={{ fontWeight: 700 }}>{Number(p.value).toFixed(3)} ms</span>
        </div>
      ))}
    </div>
  );
};

// ── Donut inner label ───────────────────────────────────────────────────────
const DonutLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.06) return null;
  const R = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * R);
  const y = cy + r * Math.sin(-midAngle * R);
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central"
      fontSize={14} fontWeight={800} fontFamily="Inter, sans-serif">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const cardV = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.36, ease: 'easeOut' } },
};

// ═══════════════════════════════════════════════════════════════════════════
export default function BenchmarkView() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [filter,  setFilter]  = useState('ALL'); // ALL | ACCEPT | ALERT | REJECT

  useEffect(() => {
    getBenchmark()
      .then(d  => setData(d))
      .catch(e => setError(e?.response?.data?.detail ?? e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-muted)', padding: '40px 0' }}>
      <div className="spinner" /> Loading Phase 07 benchmark data…
    </div>
  );
  if (error)  return <div className="error-box">⚠ {error}</div>;
  if (!data)  return null;

  // Derived data
  const rows  = data.rows;
  const honest = rows.filter(r => r.scenario_category === 'Honest Baseline');
  const attack = rows.filter(r => r.scenario_category !== 'Honest Baseline');

  const avgHonestLatency = honest.reduce((s, r) => s + r.latency_ms, 0) / (honest.length || 1);
  const avgAttackLatency = attack.reduce((s, r) => s + r.latency_ms, 0) / (attack.length || 1);

  const verdictCounts = { ACCEPT: 0, ALERT: 0, REJECT: 0 };
  rows.forEach(r => { if (r.verdict in verdictCounts) verdictCounts[r.verdict]++; });
  const donutData = Object.entries(verdictCounts).map(([k, v]) => ({ name: k, value: v }));

  const chartData = rows.map(r => ({
    name: r.scenario_name.replace('Honest Baseline (', '').replace('Attack: ', '').replace(')', ''),
    latency: r.latency_ms,
    verdict: r.verdict,
    category: r.scenario_category,
  }));

  // Latency sparklines for KPI tiles
  const honestLatencies = honest.map(r => r.latency_ms);
  const attackLatencies = attack.map(r => r.latency_ms);
  const allLatencies    = rows.map(r => r.latency_ms);

  // Filter for table
  const filtered = filter === 'ALL' ? rows : rows.filter(r => r.verdict === filter);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── KPI tiles ──────────────────────────────────────────── */}
      <div className="kpi-grid">
        {/* Total */}
        <motion.div variants={cardV} initial="hidden" animate="visible"
          transition={{ delay: 0 }} className="metric-tile bg-lavender">
          <div className="metric-label">Total Scenarios</div>
          <div className="metric-value">{data.row_count}</div>
          <div className="metric-sub">{honest.length} honest · {attack.length} attack</div>
          <div className="metric-trend up">Phase 07 §17.1</div>
          <div className="metric-sparkline-corner">
            <Spark data={rows.map((_, i) => i + 1)} color="#6A2C91" />
          </div>
        </motion.div>

        {/* Classical fast-path */}
        <motion.div variants={cardV} initial="hidden" animate="visible"
          transition={{ delay: 0.06 }} className="metric-tile bg-mint">
          <div className="metric-label">Avg Honest Latency</div>
          <div className="metric-value">{avgHonestLatency.toFixed(2)}<span style={{ fontSize: 16, fontWeight: 600 }}>ms</span></div>
          <div className="metric-sub">~{Math.round(1000 / avgHonestLatency).toLocaleString()} sessions/sec</div>
          <div className="metric-trend up">within spec</div>
          <div className="metric-sparkline-corner">
            <Spark data={honestLatencies} color="#3FA34D" />
          </div>
        </motion.div>

        {/* Quantum pipeline */}
        <motion.div variants={cardV} initial="hidden" animate="visible"
          transition={{ delay: 0.12 }} className="metric-tile bg-sky">
          <div className="metric-label">Avg Attack Latency</div>
          <div className="metric-value">{avgAttackLatency.toFixed(2)}<span style={{ fontSize: 16, fontWeight: 600 }}>ms</span></div>
          <div className="metric-sub">overhead over honest: {(avgAttackLatency - avgHonestLatency).toFixed(2)}ms</div>
          <div className="metric-sparkline-corner">
            <Spark data={attackLatencies} color="#6A2C91" />
          </div>
        </motion.div>
      </div>

      {/* ── Chart row ──────────────────────────────────────────── */}
      <div className="two-col">

        {/* Latency area chart */}
        <motion.div variants={cardV} initial="hidden" animate="visible"
          transition={{ delay: 0.15 }} className="glass-card">
          <div className="card-header">
            <span className="card-title">
              <span className="card-title-icon">⏱</span>
              Verification Latency by Scenario
            </span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>ms</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 80 }}>
              <defs>
                <linearGradient id="lat-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6A2C91" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#6A2C91" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(106,44,145,0.07)" vertical={false} />
              <XAxis dataKey="name"
                tick={{ fontSize: 8.5, fill: '#9CA3AF', fontFamily: 'Inter' }}
                angle={-38} textAnchor="end" interval={0} height={82}
                axisLine={{ stroke: 'rgba(106,44,145,0.08)' }} tickLine={false}
              />
              <YAxis tickFormatter={v => `${v.toFixed(1)}`}
                tick={{ fontSize: 9.5, fill: '#9CA3AF', fontFamily: 'var(--font-mono)' }}
                axisLine={false} tickLine={false} width={36}
              />
              <Tooltip content={<GlassTooltip />}
                cursor={{ stroke: 'rgba(106,44,145,0.14)', strokeWidth: 1, strokeDasharray: '4 3' }}
              />
              <Area type="monotone" dataKey="latency" name="Latency"
                stroke="#6A2C91" strokeWidth={2.5}
                fill="url(#lat-grad)"
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  return <circle key={`dot-${payload.name}`} cx={cx} cy={cy} r={4}
                    fill={VERDICT_COLORS[payload.verdict] ?? '#6A2C91'}
                    stroke="#fff" strokeWidth={2} />;
                }}
                activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
          {/* Colour legend */}
          <div style={{ display: 'flex', gap: 14, marginTop: 4, fontSize: 11, fontWeight: 600 }}>
            {Object.entries(VERDICT_COLORS).map(([k, c]) => (
              <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-secondary)' }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: c, display: 'inline-block' }} />
                {k}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Verdict donut */}
        <motion.div variants={cardV} initial="hidden" animate="visible"
          transition={{ delay: 0.20 }} className="glass-card">
          <div className="card-header">
            <span className="card-title">
              <span className="card-title-icon">🧩</span>
              Verdict Distribution
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <ResponsiveContainer width={170} height={170}>
              <PieChart>
                <Pie data={donutData} cx="50%" cy="50%"
                  innerRadius={44} outerRadius={76}
                  paddingAngle={3} dataKey="value"
                  labelLine={false} label={DonutLabel}
                  isAnimationActive animationDuration={600} animationEasing="ease-out">
                  {donutData.map(entry => (
                    <Cell key={entry.name} fill={VERDICT_COLORS[entry.name]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {donutData.map(d => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    width: 32, height: 32, borderRadius: 9,
                    background: VERDICT_BG[d.name],
                    border: `1.5px solid ${VERDICT_COLORS[d.name]}44`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, flexShrink: 0,
                  }}>
                    {d.name === 'ACCEPT' ? '✓' : d.name === 'REJECT' ? '✗' : '⚠'}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{d.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {d.value} scenario{d.value !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <span className={`state-badge ${d.name}`} style={{ fontSize: 12, fontWeight: 800 }}>
                    {d.value}
                  </span>
                </div>
              ))}

              {/* Quick stat */}
              <div style={{
                marginTop: 6, padding: '8px 12px',
                background: 'rgba(106,44,145,0.05)',
                borderRadius: 10, fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5,
              }}>
                <strong style={{ color: 'var(--brand-purple)' }}>Detection rate:</strong><br />
                {((verdictCounts.ALERT + verdictCounts.REJECT) / rows.length * 100).toFixed(0)}%
                of attacks flagged
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Scenario table ─────────────────────────────────────── */}
      <motion.div variants={cardV} initial="hidden" animate="visible"
        transition={{ delay: 0.25 }} className="glass-card" style={{ padding: '22px 24px 20px' }}>
        <div className="card-header">
          <span className="card-title">
            <span className="card-title-icon">📊</span>
            Phase 07 Experiment Matrix — §17.1 &amp; §17.3 Disclosures
          </span>

          {/* Filter pills */}
          <div style={{ display: 'flex', gap: 6 }}>
            {['ALL', 'ACCEPT', 'ALERT', 'REJECT'].map(v => (
              <button key={v} onClick={() => setFilter(v)}
                style={{
                  padding: '4px 12px', borderRadius: 100, border: 'none',
                  fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                  background: filter === v
                    ? (v === 'ALL' ? 'var(--brand-purple)' : VERDICT_COLORS[v])
                    : 'rgba(106,44,145,0.07)',
                  color: filter === v ? '#fff' : 'var(--text-secondary)',
                  transition: 'all 0.15s',
                }}>
                {v}
              </button>
            ))}
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['#', 'Scenario', 'Category', 'e_X', 'e_Y', 'e_Z', 'e_Bell', 'Latency', 'Rule', 'Verdict'].map(h => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '10px 14px',
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                    textTransform: 'uppercase', color: 'var(--text-muted)',
                    background: 'rgba(106,44,145,0.04)',
                    borderBottom: '1px solid rgba(106,44,145,0.08)',
                    whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => {
                const isHonest = r.scenario_category === 'Honest Baseline';
                const vc = VERDICT_COLORS[r.verdict] ?? '#6B7280';

                // Format: e_X etc as small gauge strip
                const gaugeCell = (val, thr) => {
                  const over = val > thr;
                  const pct  = (val * 100).toFixed(1);
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      {/* Mini bar */}
                      <div style={{ width: 40, height: 6, borderRadius: 3, background: 'rgba(0,0,0,0.07)', overflow: 'hidden', flexShrink: 0 }}>
                        <div style={{
                          width: `${Math.min(val / thr * 100, 100)}%`,
                          height: '100%',
                          borderRadius: 3,
                          background: over
                            ? 'linear-gradient(90deg, #F0B429, #E5484D)'
                            : 'linear-gradient(90deg, #3FA34D, #22c55e)',
                          transition: 'width 0.5s ease',
                        }} />
                      </div>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: 11,
                        fontWeight: 600,
                        color: over ? 'var(--reject-red)' : 'var(--accept-green)',
                      }}>
                        {pct}%
                      </span>
                    </div>
                  );
                };

                return (
                  <motion.tr key={r.scenario_id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.025, duration: 0.25 }}
                    style={{ transition: 'background 0.12s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(106,44,145,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* # */}
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid rgba(0,0,0,0.04)', color: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                      {i + 1}
                    </td>

                    {/* Scenario name */}
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid rgba(0,0,0,0.04)', maxWidth: 200 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                        {r.scenario_name}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                        {r.noise_model}
                      </div>
                    </td>

                    {/* Category */}
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid rgba(0,0,0,0.04)', whiteSpace: 'nowrap' }}>
                      <span style={{
                        fontSize: 10.5, fontWeight: 700, padding: '3px 9px',
                        borderRadius: 100,
                        background: isHonest ? 'rgba(63,163,77,0.10)' : 'rgba(106,44,145,0.08)',
                        color: isHonest ? 'var(--accept-green)' : 'var(--brand-purple)',
                        border: `1px solid ${isHonest ? 'rgba(63,163,77,0.20)' : 'rgba(106,44,145,0.15)'}`,
                      }}>
                        {isHonest ? '✓ Honest' : '⚔ Attack'}
                      </span>
                    </td>

                    {/* Error rate mini-bars */}
                    {[r.empirical_e_X, r.empirical_e_Y, r.empirical_e_Z, r.empirical_e_Bell].map((val, ei) => (
                      <td key={ei} style={{ padding: '12px 14px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                        {gaugeCell(val ?? 0, 0.1718)}
                      </td>
                    ))}

                    {/* Latency */}
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700,
                        color: r.latency_ms > 5 ? 'var(--alert-amber)' : 'var(--accept-green)',
                      }}>
                        {r.latency_ms.toFixed(2)}ms
                      </span>
                    </td>

                    {/* Rule ID */}
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid rgba(0,0,0,0.04)', maxWidth: 160 }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: 9.5,
                        color: 'var(--brand-purple)',
                        background: 'rgba(106,44,145,0.07)',
                        padding: '2px 7px', borderRadius: 6,
                        whiteSpace: 'nowrap',
                        display: 'block',
                        overflow: 'hidden', textOverflow: 'ellipsis',
                        maxWidth: 150,
                      }}>
                        {r.rule_id}
                      </span>
                    </td>

                    {/* Verdict */}
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                      <span className={`state-badge ${r.verdict}`}>{r.verdict}</span>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginTop: 16, paddingTop: 14,
          borderTop: '1px solid rgba(0,0,0,0.05)',
          fontSize: 12, color: 'var(--text-muted)',
        }}>
          <span>
            Showing <strong style={{ color: 'var(--text-primary)' }}>{filtered.length}</strong> of {rows.length} scenarios
          </span>
          <span style={{ fontStyle: 'italic', fontSize: 10.5 }}>
            §17.3 — single confirmatory runs (rows 7–18); not n=200 batches from Phase 05.
          </span>
        </div>
      </motion.div>
    </div>
  );
}
