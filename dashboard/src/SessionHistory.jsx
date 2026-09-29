/**
 * SessionHistory — Replay ledger / state-machine history view.
 *
 * Visual upgrades (presentation only):
 *   - Row avatars (icon chip per session type, Reference A table style)
 *   - Coloured pill badges for RESERVED→ACCEPTED/BLOCKED transitions
 *   - Light table header with subtle bg tint
 *   - Session count footer (pagination-style footer like Reference A)
 *   - Staggered row entrance animations
 *
 * No data / business logic changes.
 */
import { motion, AnimatePresence } from 'framer-motion';

function StateBadge({ state }) {
  return <span className={`state-badge ${state}`}>{state}</span>;
}

function VerdictBadge({ verdict }) {
  if (!verdict) return null;
  return <span className={`state-badge ${verdict}`}>{verdict}</span>;
}

// Row icon chip (like Reference A table avatar)
function RowAvatar({ type }) {
  const isAttack = type === 'attack';
  return (
    <div style={{
      width: 32, height: 32,
      borderRadius: 8,
      background: isAttack ? 'rgba(229,72,77,0.10)' : 'rgba(63,163,77,0.10)',
      color: isAttack ? 'var(--reject-red)' : 'var(--accept-green)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 15, flexShrink: 0,
    }}>
      {isAttack ? '⚔' : '✓'}
    </div>
  );
}

export default function SessionHistory({ sessions }) {
  const total = sessions.length;

  return (
    <div>
      <div className="card-header">
        <span className="card-title">
          <span className="card-title-icon">📋</span>
          Session Ledger — State Machine History
        </span>
        <span style={{
          fontSize: 11, color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
          background: 'rgba(106,44,145,0.06)',
          padding: '3px 10px', borderRadius: 100,
        }}>
          {total} {total === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      {total === 0 && (
        <div style={{
          color: 'var(--text-muted)', fontSize: 14,
          padding: '32px 0', textAlign: 'center',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 32, opacity: 0.2 }}>📋</span>
          No sessions yet. Create and verify a session above.
        </div>
      )}

      {total > 0 && (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table className="ledger-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th style={{ width: 40 }}></th>
                  <th>Session ID</th>
                  <th>Type</th>
                  <th>Transition</th>
                  <th>Verdict</th>
                  <th>Rule ID</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {[...sessions].reverse().map((s, i) => (
                    <motion.tr
                      key={s.sid}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.22, delay: i * 0.03 }}
                    >
                      {/* Index */}
                      <td style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                        {total - i}
                      </td>

                      {/* Avatar chip */}
                      <td><RowAvatar type={s.type} /></td>

                      {/* Session ID */}
                      <td style={{
                        color: 'var(--brand-purple)',
                        maxWidth: 130,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 11,
                        whiteSpace: 'nowrap',
                      }}>
                        {s.sid}
                      </td>

                      {/* Type pill */}
                      <td>
                        <span style={{
                          fontSize: 10.5, fontWeight: 700,
                          letterSpacing: '0.05em',
                          padding: '3px 9px', borderRadius: 100,
                          background: s.type === 'attack'
                            ? 'rgba(229,72,77,0.09)' : 'rgba(63,163,77,0.09)',
                          color: s.type === 'attack' ? 'var(--reject-red)' : 'var(--accept-green)',
                          border: `1px solid ${s.type === 'attack' ? 'rgba(229,72,77,0.20)' : 'rgba(63,163,77,0.20)'}`,
                          whiteSpace: 'nowrap',
                        }}>
                          {s.type === 'attack' ? `⚔ ${s.attackName ?? 'Attack'}` : '✓ Honest'}
                        </span>
                      </td>

                      {/* State transition */}
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>RESERVED</span>
                        <span style={{ color: 'var(--text-muted)', margin: '0 6px', fontSize: 12 }}>→</span>
                        <StateBadge state={
                          s.verdict === 'ACCEPT' ? 'ACCEPTED'
                          : s.verdict === 'REJECT' ? 'BLOCKED'
                          : s.verdict === 'ALERT'  ? 'BLOCKED'
                          : 'RESERVED'
                        } />
                      </td>

                      {/* Verdict */}
                      <td><VerdictBadge verdict={s.verdict} /></td>

                      {/* Rule ID */}
                      <td style={{
                        color: 'var(--text-muted)', fontSize: 10.5,
                        maxWidth: 180, whiteSpace: 'nowrap',
                        overflow: 'hidden', textOverflow: 'ellipsis',
                        fontFamily: 'var(--font-mono)',
                      }}>
                        {s.ruleId}
                      </td>

                      {/* Timestamp */}
                      <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: 12 }}>
                        {s.timestamp}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Pagination-style footer (Reference A style) */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginTop: 16, paddingTop: 14,
            borderTop: '1px solid rgba(0,0,0,0.05)',
            fontSize: 12, color: 'var(--text-muted)',
          }}>
            <span>
              Showing <strong style={{ color: 'var(--text-primary)' }}>{total}</strong> of {total} sessions
            </span>
            <div style={{ display: 'flex', gap: 12, fontWeight: 600 }}>
              <span style={{ color: 'var(--accept-green)' }}>
                ✓ {sessions.filter(s => s.verdict === 'ACCEPT').length} ACCEPT
              </span>
              <span style={{ color: 'var(--alert-amber)' }}>
                ⚠ {sessions.filter(s => s.verdict === 'ALERT').length} ALERT
              </span>
              <span style={{ color: 'var(--reject-red)' }}>
                ✗ {sessions.filter(s => s.verdict === 'REJECT').length} REJECT
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
