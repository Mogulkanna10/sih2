/**
 * GaugeDial — Reusable semicircle gauge component.
 * Used for EVERY numeric measurement in the app.
 * Props:
 *   value         — current value
 *   min / max     — range
 *   threshold     — pass/fail boundary (optional)
 *   higherIsBetter — invert color logic (default false)
 *   format        — 'percent' | 'latency' | 'number'
 *   label         — string shown below gauge
 *   size          — px width (default 110)
 *   sparkData     — array of numbers for mini sparkline (optional)
 */
import { useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

// ── Tiny Sparkline (svg polyline) ────────────────────────────────────────────
function Sparkline({ data = [], color = '#6A2C91', width = 60, height = 24 }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={`spark-fill-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {/* Fill area */}
      <polyline
        points={`0,${height} ${pts} ${width},${height}`}
        fill={`url(#spark-fill-${color.replace('#','')})`}
        stroke="none"
      />
      {/* Line */}
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── GaugeDial ─────────────────────────────────────────────────────────────────
export default function GaugeDial({
  value      = 0,
  min        = 0,
  max        = 100,
  label      = '',
  threshold  = null,
  higherIsBetter = false,
  format     = 'number',
  size       = 110,
  sparkData  = null,
}) {
  // SVG geometry — semicircle
  const R  = 44;
  const cx = 56;
  const cy = 56;
  const strokeWidth = 9;
  // Arc from 180° to 0° (left→right along the bottom half of the circle)
  const arcLen = Math.PI * R;   // half circumference

  // Clamp
  const clamped  = Math.max(min, Math.min(max, value ?? 0));
  const fraction = (clamped - min) / (max - min || 1);

  // Zone colour
  let trackColor = '#6A2C91';   // default purple
  if (threshold !== null) {
    if (higherIsBetter) {
      if (value >= threshold)          trackColor = '#3FA34D';
      else if (value >= threshold * 0.8) trackColor = '#F0B429';
      else                              trackColor = '#E5484D';
    } else {
      if (value <= threshold)          trackColor = '#3FA34D';
      else if (value <= threshold * 1.2) trackColor = '#F0B429';
      else                              trackColor = '#E5484D';
    }
  }

  // Animated dash offset
  const dashOffset = arcLen * (1 - fraction);

  // Format display value
  let display = value;
  if (format === 'percent') {
    display = `${((value ?? 0) * 100).toFixed(1)}%`;
  } else if (format === 'latency') {
    display = `${(value ?? 0).toFixed(2)}ms`;
  } else if (typeof value === 'number' && !Number.isInteger(value)) {
    display = (value ?? 0).toFixed(3);
  }

  const viewSize = size;
  const svgViewBox = '0 0 112 64';  // wide enough for semicircle

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: viewSize }}>
      <div style={{ position: 'relative', width: viewSize, height: viewSize * 0.6 }}>
        <svg
          viewBox={svgViewBox}
          width={viewSize}
          height={viewSize * 0.6}
          style={{ overflow: 'visible', display: 'block' }}
        >
          {/* Background track */}
          <path
            d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`}
            fill="none"
            stroke="rgba(106,44,145,0.09)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Threshold tick mark */}
          {threshold !== null && (() => {
            const thrFrac = Math.max(0, Math.min(1, (threshold - min) / (max - min || 1)));
            const angle   = Math.PI * (1 - thrFrac);
            const tx = cx + R * Math.cos(Math.PI - angle);
            const ty = cy - R * Math.sin(Math.PI - angle);
            // tick inward
            const tx2 = cx + (R - strokeWidth - 2) * Math.cos(Math.PI - angle);
            const ty2 = cy - (R - strokeWidth - 2) * Math.sin(Math.PI - angle);
            return (
              <line x1={tx} y1={ty} x2={tx2} y2={ty2}
                stroke="#E5484D" strokeWidth={1.5} strokeLinecap="round" opacity={0.7} />
            );
          })()}

          {/* Animated value arc */}
          <motion.path
            d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`}
            fill="none"
            stroke={trackColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={arcLen}
            initial={{ strokeDashoffset: arcLen }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
          />
        </svg>

        {/* Centre value overlay */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0, right: 0,
          textAlign: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{
            fontSize: size >= 100 ? 18 : size >= 70 ? 13 : 10,
            fontWeight: 800,
            color: trackColor,
            lineHeight: 1,
            letterSpacing: '-0.02em',
          }}>
            {display}
          </div>
        </div>
      </div>

      {/* Label */}
      {label && (
        <div style={{
          fontSize: size >= 100 ? 10.5 : 9,
          fontWeight: 600,
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          textAlign: 'center',
          lineHeight: 1.2,
        }}>
          {label}
        </div>
      )}

      {/* Sparkline strip (Reference B side-panel style) */}
      {sparkData && sparkData.length > 1 && (
        <div style={{ marginTop: 2 }}>
          <Sparkline data={sparkData} color={trackColor} width={size - 8} height={20} />
        </div>
      )}
    </div>
  );
}
