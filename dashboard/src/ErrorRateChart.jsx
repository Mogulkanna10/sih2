/**
 * ErrorRateChart — Per-basis error rates vs. Hoeffding thresholds.
 *
 * Visual:
 *   - AreaChart (Recharts) with smooth monotoneX curves + soft gradient fills
 *   - Custom floating glass-card tooltip (Reference A style)
 *   - Light axis/grid — no dark theme remnants
 *
 * No business logic changes. Props: { payload }
 */
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Legend,
} from 'recharts';
import { motion } from 'framer-motion';

// Per-basis brand colours
const BASIS_COLORS = {
  X:    '#6A2C91',
  Y:    '#8B5CF6',
  Z:    '#3FA34D',
  Bell: '#F0B429',
};

// ── Floating glass tooltip card (Reference A) ────────────────────────────────
const GlassTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip-glass" style={{ minWidth: 140 }}>
      <div className="tt-label">{label} basis</div>
      {payload.map(p => (
        <div key={p.name} className="tt-row">
          <span className="tt-dot" style={{ background: p.color }} />
          <span style={{ color: 'var(--text-secondary)', minWidth: 64 }}>{p.name}:</span>
          <span style={{ fontWeight: 700, color: p.color }}>
            {(p.value * 100).toFixed(3)}%
          </span>
        </div>
      ))}
    </div>
  );
};

// ── Gradient defs helper ─────────────────────────────────────────────────────
function GradientDefs() {
  return (
    <defs>
      {Object.entries(BASIS_COLORS).map(([k, c]) => (
        <linearGradient key={k} id={`grad-${k}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%"  stopColor={c} stopOpacity={0.22} />
          <stop offset="95%" stopColor={c} stopOpacity={0.02} />
        </linearGradient>
      ))}
      <linearGradient id="grad-threshold" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%"  stopColor="#E5484D" stopOpacity={0.12} />
        <stop offset="95%" stopColor="#E5484D" stopOpacity={0.02} />
      </linearGradient>
    </defs>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ErrorRateChart({ payload }) {
  if (!payload) {
    return (
      <div style={{
        height: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 8,
      }}>
        <div style={{ fontSize: 28, opacity: 0.2 }}>📊</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          Run a session to see error-rate chart.
        </div>
      </div>
    );
  }

  const ev  = payload.evidence_values ?? {};
  const thr = payload.thresholds ?? {};

  // Build chart data — one row per basis
  const data = ['X', 'Y', 'Z', 'Bell'].map(b => ({
    basis:         b,
    'Error Rate':  ev[`e_${b}`] ?? 0,
    'Threshold τ': thr[b] ?? 0,
  }));

  const avgThreshold = Object.values(thr).reduce((a, v) => a + v, 0) /
                       Math.max(Object.values(thr).length, 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="chart-wrapper"
    >
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart
          data={data}
          margin={{ top: 10, right: 20, left: -4, bottom: 0 }}
        >
          <GradientDefs />

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(106,44,145,0.07)"
            vertical={false}
          />
          <XAxis
            dataKey="basis"
            tick={{ fill: '#6B7280', fontSize: 11.5, fontFamily: 'Inter' }}
            axisLine={{ stroke: 'rgba(106,44,145,0.10)' }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={v => `${(v * 100).toFixed(1)}%`}
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'var(--font-mono)' }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            content={<GlassTooltip />}
            cursor={{ stroke: 'rgba(106,44,145,0.15)', strokeWidth: 1, strokeDasharray: '4 3' }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, color: '#6B7280', paddingTop: 12 }}
            formatter={(value) => (
              <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{value}</span>
            )}
          />

          {/* Reference line at avg threshold */}
          <ReferenceLine
            y={avgThreshold}
            stroke="#E5484D"
            strokeWidth={1.5}
            strokeDasharray="5 3"
            label={{ value: 'τ', position: 'right', fill: '#E5484D', fontSize: 11, fontWeight: 700 }}
          />

          {/* Error Rate — multi-colour per basis via separate Areas */}
          <Area
            type="monotone"
            dataKey="Error Rate"
            stroke="#6A2C91"
            strokeWidth={2.5}
            fill="url(#grad-X)"
            dot={{ r: 4, fill: '#6A2C91', stroke: '#fff', strokeWidth: 2 }}
            activeDot={{ r: 6, fill: '#6A2C91', stroke: '#fff', strokeWidth: 2, filter: 'drop-shadow(0 0 4px rgba(106,44,145,0.4))' }}
          />
          <Area
            type="monotone"
            dataKey="Threshold τ"
            stroke="#E5484D"
            strokeWidth={1.5}
            strokeDasharray="5 3"
            fill="url(#grad-threshold)"
            dot={false}
            activeDot={false}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Footer metadata */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap',
        gap: 6, marginTop: 10,
        fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)',
      }}>
        <span>τ = μ̂ + δ_cal + δ_ver (Hoeffding §11.1)</span>
        <span style={{ color: 'var(--text-secondary)' }}>
          μ̂=1.00% · n_cal=1000 · n_ver=500 · ε=1.25×10⁻⁴
        </span>
      </div>
    </motion.div>
  );
}
