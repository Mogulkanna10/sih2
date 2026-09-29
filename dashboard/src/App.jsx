/**
 * QUASAR-TDS Dashboard — Egreen Quanta v4 (Reference A Layout)
 * Cleaner layout: KPI summary row → circuit → action → verdict → chart
 */
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './index.css';

import { createSession, verifySession } from './api';
import TeleportationCircuit from './TeleportationCircuit';
import VerdictPanel from './VerdictPanel';
import ErrorRateChart from './ErrorRateChart';
import AttackPicker from './AttackPicker';
import SessionHistory from './SessionHistory';
import BenchmarkView from './BenchmarkView';

// ── Reference A sparkline (tiny SVG corner chart) ─────────────────────────────
function Sparkline({ data, color, width = 80, height = 36 }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 6) - 3;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const fillPts = `0,${height} ${pts} ${width},${height}`;
  return (
    <svg width={width} height={height} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={`s-fill-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.30" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polyline points={fillPts} fill={`url(#s-fill-${color.replace('#','')})`} stroke="none" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ── Mini KPI tile (Reference A style) ────────────────────────────────────────
function KpiTile({ label, value, sub, trend, trendUp, sparkData, sparkColor, tintClass }) {
  return (
    <div className={`metric-tile ${tintClass}`}>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      {sub && <div className="metric-sub">{sub}</div>}
      {trend && (
        <div className={`metric-trend ${trendUp ? 'up' : 'down'}`}>
          {trendUp ? '↑' : '↓'} {trend}
        </div>
      )}
      {sparkData && (
        <div className="metric-sparkline-corner">
          <Sparkline data={sparkData} color={sparkColor} />
        </div>
      )}
    </div>
  );
}

function ts() {
  return new Date().toLocaleTimeString('en-IN', { hour12: false });
}

const NAV = [
  { id: 'verify', label: 'Verify Session', icon: '⚖' },
  { id: 'attack', label: 'Attack Lab',     icon: '⚔' },
  { id: 'bench',  label: 'Benchmarks',     icon: '📊' },
  { id: 'ledger', label: 'Session Ledger', icon: '📋' },
];

const pageVariants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: 'easeOut', staggerChildren: 0.06 } },
  exit:    { opacity: 0, y: -10, transition: { duration: 0.20 } },
};
const cardV = {
  hidden:  { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.36, ease: 'easeOut' } },
};

// ═════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [activeNav,    setActiveNav]    = useState('verify');
  const [message,      setMessage]      = useState('Hello, QUASAR-TDS!');
  const [verifying,    setVerifying]    = useState(false);
  const [verifyErr,    setVerifyErr]    = useState(null);
  const [honestResult, setHonestResult] = useState(null);
  const [currentSid,   setCurrentSid]   = useState(null);
  const [attackResult, setAttackResult] = useState(null);
  const [sessions,     setSessions]     = useState([]);

  const displayResult = activeNav === 'attack' ? attackResult : honestResult;

  async function handleVerify() {
    setVerifying(true);
    setVerifyErr(null);
    setHonestResult(null);
    try {
      const created = await createSession(message);
      const sid = created.sid;
      setCurrentSid(sid);
      const result = await verifySession(sid);
      setHonestResult(result);
      setSessions(prev => [...prev, {
        sid, type: 'honest',
        verdict:   result.payload.verdict,
        ruleId:    result.payload.rule_id,
        timestamp: ts(),
      }]);
    } catch (e) {
      setVerifyErr(e?.response?.data?.detail ?? e.message ?? 'Verification failed');
    } finally {
      setVerifying(false);
    }
  }

  const handleAttackResult = useCallback((result) => {
    setAttackResult(result);
    setSessions(prev => [...prev, {
      sid:        result.sid,
      type:       'attack',
      attackName: result.attack_name,
      verdict:    result.payload.verdict,
      ruleId:     result.payload.rule_id,
      timestamp:  ts(),
    }]);
  }, []);

  const acceptCount = sessions.filter(s => s.verdict === 'ACCEPT').length;
  const alertCount  = sessions.filter(s => s.verdict === 'ALERT').length;
  const rejectCount = sessions.filter(s => s.verdict === 'REJECT').length;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* Decorative background orbs — vivid so glass blur is visible */}
      <div className="bg-orb orb-1" aria-hidden="true" />
      <div className="bg-orb orb-2" aria-hidden="true" />
      <div className="bg-orb orb-3" aria-hidden="true" />

      <div className="app-shell">

        {/* ── Sidebar ─────────────────────────────────────────── */}
        <nav className="app-sidebar" role="navigation">
          <div className="sidebar-logo">
            <img src="/logo.png" alt="Egreen Quanta" className="logo-icon-img" />
            <div>
              <div className="logo-text">QUASAR-TDS</div>
              <div className="logo-sub">Quantum Threat Detection · SIH26141</div>
            </div>
          </div>

          <div className="sidebar-section-label">Navigation</div>

          {NAV.map(item => (
            <div
              key={item.id}
              id={`nav-${item.id}`}
              role="button"
              tabIndex={0}
              className={`nav-item ${activeNav === item.id ? 'active' : ''}`}
              onClick={() => setActiveNav(item.id)}
              onKeyDown={e => e.key === 'Enter' && setActiveNav(item.id)}
            >
              {activeNav === item.id && (
                <motion.div
                  layoutId="activePill"
                  className="nav-item-active-bg"
                  transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                />
              )}
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </div>
          ))}

          {/* Session counter widget */}
          <div className="sidebar-session-widget">
            <div className="sw-label">Sessions this run</div>
            <div className="sw-count">{sessions.length}</div>
            <div className="sw-sub">total pipeline runs</div>
            <div className="sw-verdicts">
              <span style={{ color: 'var(--accept-green)' }}>✓ {acceptCount}</span>
              <span style={{ color: 'var(--alert-amber)' }}>⚠ {alertCount}</span>
              <span style={{ color: 'var(--reject-red)' }}>✗ {rejectCount}</span>
            </div>
          </div>
        </nav>

        {/* ── Main ────────────────────────────────────────────── */}
        <main className="app-main" role="main">
          <AnimatePresence mode="wait">

            {/* ══ VERIFY ══════════════════════════════════════ */}
            {activeNav === 'verify' && (
              <motion.div key="verify" variants={pageVariants} initial="hidden" animate="visible" exit="exit"
                style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                {/* Page title */}
                <motion.div variants={cardV}>
                  <div className="page-title">Verification Pipeline</div>
                  <div className="page-subtitle">
                    Sign a message, run the full §15 quantum verification pipeline, and see the live verdict below.
                  </div>
                </motion.div>

                {/* Reference A KPI row — session summary */}
                <motion.div variants={cardV}>
                  <div className="kpi-grid">
                    <KpiTile
                      label="Total Sessions"
                      value={sessions.length}
                      sub="this browser run"
                      sparkData={sessions.length > 0 ? sessions.map((_, i) => i + 1) : [0]}
                      sparkColor="#6A2C91"
                      tintClass="bg-lavender"
                    />
                    <KpiTile
                      label="Accepted"
                      value={acceptCount}
                      sub={sessions.length > 0 ? `${((acceptCount / sessions.length) * 100).toFixed(0)}% pass rate` : 'no sessions yet'}
                      trendUp={true}
                      trend={acceptCount > 0 ? `${acceptCount} clean` : null}
                      sparkData={sessions.map(s => s.verdict === 'ACCEPT' ? 1 : 0)}
                      sparkColor="#3FA34D"
                      tintClass="bg-mint"
                    />
                    <KpiTile
                      label="Blocked / Alert"
                      value={rejectCount + alertCount}
                      sub={`${rejectCount} REJECT · ${alertCount} ALERT`}
                      trendUp={false}
                      trend={(rejectCount + alertCount) > 0 ? `${rejectCount + alertCount} flagged` : null}
                      sparkData={sessions.map(s => (s.verdict === 'REJECT' || s.verdict === 'ALERT') ? 1 : 0)}
                      sparkColor="#E5484D"
                      tintClass="bg-peach"
                    />
                  </div>
                </motion.div>

                {/* Message input + run button */}
                <motion.div variants={cardV} className="glass-card">
                  <div className="card-header">
                    <span className="card-title">
                      <span className="card-title-icon">✉</span>
                      Create &amp; Verify Session
                    </span>
                    {currentSid && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--text-muted)', background: 'rgba(106,44,145,0.06)', padding: '3px 8px', borderRadius: 100 }}>
                        SID: {currentSid}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <input
                      id="message-input"
                      className="input-field"
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder="Enter message to sign…"
                    />
                    <button
                      id="verify-btn"
                      className="btn btn-primary"
                      onClick={handleVerify}
                      disabled={verifying || !message.trim()}
                      style={{ whiteSpace: 'nowrap', minWidth: 160 }}
                    >
                      {verifying
                        ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Verifying…</>
                        : '▶ Run Verification'}
                    </button>
                  </div>
                  {verifyErr && <div className="error-box" style={{ marginTop: 10 }}>⚠ {verifyErr}</div>}
                </motion.div>

                {/* Circuit diagram */}
                <motion.div variants={cardV} className="glass-card" style={{ padding: '20px 20px 16px' }}>
                  <div className="card-header">
                    <span className="card-title">
                      <span className="card-title-icon">⚛</span>
                      Teleportation Circuit &amp; Bell-Decoy Flow
                    </span>
                  </div>
                  <TeleportationCircuit sessionId={currentSid} verdict={honestResult?.payload?.verdict} />
                </motion.div>

                {/* Verdict + chart side by side */}
                <motion.div variants={cardV} className="two-col">
                  <VerdictPanel result={honestResult} loading={verifying} />
                  <div className="glass-card">
                    <div className="card-header">
                      <span className="card-title">
                        <span className="card-title-icon">📈</span>
                        Error Rates vs. Thresholds
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Hoeffding §11.1</span>
                    </div>
                    <ErrorRateChart payload={honestResult?.payload} />
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* ══ ATTACK LAB ══════════════════════════════════ */}
            {activeNav === 'attack' && (
              <motion.div key="attack" variants={pageVariants} initial="hidden" animate="visible" exit="exit"
                style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                <motion.div variants={cardV}>
                  <div className="page-title">Attack Scenario Lab</div>
                  <div className="page-subtitle">
                    Trigger any of the 12 §14 attack injectors. Each click creates a fresh isolated session.
                  </div>
                </motion.div>

                {/* Attack status KPIs */}
                <motion.div variants={cardV}>
                  <div className="kpi-grid">
                    <KpiTile label="Total Attacks Run" value={sessions.filter(s => s.type === 'attack').length}
                      sub="isolated sessions" tintClass="bg-peach"
                      sparkData={sessions.filter(s=>s.type==='attack').map((_,i)=>i+1)} sparkColor="#E5484D" />
                    <KpiTile label="Detection Rate" value={sessions.filter(s=>s.type==='attack').length > 0
                      ? `${((sessions.filter(s=>s.type==='attack'&&s.verdict!=='ACCEPT').length / sessions.filter(s=>s.type==='attack').length)*100).toFixed(0)}%`
                      : '—'} sub="attacks detected" trendUp={false} tintClass="bg-lavender" />
                    <KpiTile label="Last Verdict" value={attackResult?.payload?.verdict ?? '—'}
                      sub={attackResult?.attack_name?.replace('Attack: ','') ?? 'no attack run'} tintClass="bg-sky" />
                  </div>
                </motion.div>

                <div className="two-col">
                  <motion.div variants={cardV} className="glass-card">
                    <AttackPicker onResult={handleAttackResult} />
                  </motion.div>

                  <motion.div variants={cardV} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {attackResult && (
                      <div className="glass-card tint-peach" style={{ padding: '10px 16px', fontSize: 12, color: 'var(--text-secondary)' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--reject-red)', fontWeight: 700 }}>
                          ⚔ {attackResult.attack_name}
                        </span>
                      </div>
                    )}
                    <VerdictPanel result={attackResult} loading={false} />
                  </motion.div>
                </div>

                <motion.div variants={cardV} className="glass-card">
                  <div className="card-header">
                    <span className="card-title"><span className="card-title-icon">📈</span>Attack Evidence — Error Rates vs. Thresholds</span>
                  </div>
                  <ErrorRateChart payload={attackResult?.payload} />
                </motion.div>

                {attackResult && (
                  <motion.div variants={cardV} className="glass-card" style={{ padding: '20px 20px 16px' }}>
                    <div className="card-header">
                      <span className="card-title"><span className="card-title-icon">⚛</span>Attack Circuit Flow</span>
                    </div>
                    <TeleportationCircuit sessionId={attackResult.sid} verdict={attackResult.payload?.verdict} />
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* ══ BENCHMARKS ══════════════════════════════════ */}
            {activeNav === 'bench' && (
              <motion.div key="bench" variants={pageVariants} initial="hidden" animate="visible" exit="exit"
                style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <motion.div variants={cardV}>
                  <div className="page-title">Performance Benchmarks</div>
                  <div className="page-subtitle">
                    Phase 07 §17.1 matrix — 6 honest baselines + 12 attack scenarios with full §17.3 disclosure.
                  </div>
                </motion.div>
                <motion.div variants={cardV}><BenchmarkView /></motion.div>
              </motion.div>
            )}

            {/* ══ LEDGER ══════════════════════════════════════ */}
            {activeNav === 'ledger' && (
              <motion.div key="ledger" variants={pageVariants} initial="hidden" animate="visible" exit="exit"
                style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <motion.div variants={cardV}>
                  <div className="page-title">Session Ledger</div>
                  <div className="page-subtitle">
                    State-machine history for all sessions in this browser run. RESERVED → ACCEPTED or BLOCKED.
                  </div>
                </motion.div>
                <motion.div variants={cardV} className="glass-card">
                  <SessionHistory sessions={sessions} />
                </motion.div>
                <motion.div variants={cardV} className="glass-card tint-peach" style={{ borderColor: 'rgba(240,140,41,0.25)' }}>
                  <div style={{ fontSize: 13, color: '#7c5000', lineHeight: 1.7 }}>
                    <strong>⚠ Mandatory Disclaimer (§12.2, §23)</strong><br />
                    All verdicts are <em>rule-based, model-based hypotheses</em> — not forensic certainty.
                    QUASAR-TDS uses deterministic threshold tests and an ordered rule table.
                    No AI or ML is used at any point. Verdicts are attack-hypothesis attributions only.
                  </div>
                </motion.div>
              </motion.div>
            )}

          </AnimatePresence>
        </main>
      </div>
    </>
  );
}
