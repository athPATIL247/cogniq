// filename: frontend/src/components/RiskTimeline/index.jsx

import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  defs,
  linearGradient,
  stop,
} from 'recharts';

function getRiskColor(score) {
  if (score >= 80) return '#ef4444';
  if (score >= 60) return '#f97316';
  if (score >= 35) return '#f59e0b';
  return '#22c55e';
}

function getMaxRiskColor(data) {
  const max = Math.max(...(data.map((d) => d.riskScore ?? d.risk_score ?? 0)));
  return getRiskColor(max);
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const score = payload[0]?.value;
  const eventType = payload[0]?.payload?.eventType ?? payload[0]?.payload?.event_type;
  const action = payload[0]?.payload?.action ?? payload[0]?.payload?.decision;
  const color = getRiskColor(score);

  return (
    <div
      style={{
        background: '#0d0d1a',
        border: '1px solid rgba(16,185,129,0.25)',
        borderRadius: '8px',
        padding: '10px 14px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
      }}
    >
      <div
        style={{
          fontSize: '11px',
          color: '#64748b',
          fontFamily: "'Inter', system-ui",
          marginBottom: '4px',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: '22px',
          fontWeight: '700',
          fontFamily: "'JetBrains Mono', monospace",
          color,
          textShadow: `0 0 10px ${color}60`,
        }}
      >
        {score}
      </div>
      {eventType && (
        <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: "'Inter', system-ui", marginTop: '4px' }}>
          {eventType}
        </div>
      )}
      {action && (
        <div
          style={{
            marginTop: '4px',
            fontSize: '10px',
            fontWeight: '700',
            letterSpacing: '1px',
            fontFamily: "'Inter', system-ui",
            color: action === 'BLOCKED' ? '#ef4444' : action === 'OTP' ? '#f59e0b' : '#22c55e',
          }}
        >
          {action}
        </div>
      )}
    </div>
  );
};

export function RiskTimeline({ data = [], userId }) {
  const formattedData = useMemo(() => {
    return data.map((d) => ({
      ...d,
      riskScore: d.riskScore ?? d.risk_score ?? 0,
      date: (() => {
        try {
          const ts = d.timestamp ?? d.date ?? d.createdAt;
          if (typeof ts === 'string') {
              // format dates simply
              const dt = new Date(ts);
              return `${dt.toLocaleString('default', { month: 'short' })} ${dt.getDate()}`;
          }
          if (typeof ts === 'number') {
              const dt = new Date(ts);
              return `${dt.toLocaleString('default', { month: 'short' })} ${dt.getDate()}`;
          }
          return '—';
        } catch {
          return '—';
        }
      })(),
    }));
  }, [data]);

  const dominantColor = useMemo(() => getMaxRiskColor(formattedData), [formattedData]);
  const maxScore = useMemo(
    () => Math.max(...formattedData.map((d) => d.riskScore), 0),
    [formattedData]
  );

  if (!data.length) {
    return (
      <div
        style={{
          height: '200px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#64748b',
          fontFamily: "'Inter', system-ui",
          fontSize: '13px',
        }}
      >
        No timeline data available
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '12px',
              letterSpacing: '2px',
              color: '#64748b',
              fontFamily: "'Inter', system-ui",
            }}
          >
            30-DAY RISK HISTORY
          </div>
          {userId && (
            <div
              style={{
                fontSize: '11px',
                color: '#10b981',
                fontFamily: "'JetBrains Mono', monospace",
                marginTop: '2px',
              }}
            >
              {userId}
            </div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            background: `${dominantColor}15`,
            borderRadius: '4px',
            border: `1px solid ${dominantColor}40`,
          }}
        >
          <span
            style={{
              fontSize: '11px',
              color: '#64748b',
              fontFamily: "'Inter', system-ui",
            }}
          >
            Peak
          </span>
          <span
            style={{
              fontSize: '16px',
              fontWeight: '700',
              fontFamily: "'JetBrains Mono', monospace",
              color: dominantColor,
            }}
          >
            {maxScore}
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id={`riskGrad-${userId ?? 'default'}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={dominantColor} stopOpacity={0.35} />
              <stop offset="95%" stopColor={dominantColor} stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(16,185,129,0.08)"
            vertical={false}
          />

          <XAxis
            dataKey="date"
            tick={{ fill: '#64748b', fontSize: 10, fontFamily: "'Inter', system-ui" }}
            axisLine={{ stroke: 'rgba(16,185,129,0.1)' }}
            tickLine={false}
            interval="preserveStartEnd"
          />

          <YAxis
            domain={[0, 100]}
            tick={{ fill: '#64748b', fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}
            axisLine={false}
            tickLine={false}
            ticks={[0, 35, 60, 80, 100]}
          />

          <Tooltip content={<CustomTooltip />} />

          {/* Reference lines */}
          <ReferenceLine
            y={35}
            stroke="#f59e0b"
            strokeDasharray="4 4"
            strokeOpacity={0.4}
            label={{ value: 'MED', position: 'insideTopRight', fill: '#f59e0b', fontSize: 9 }}
          />
          <ReferenceLine
            y={60}
            stroke="#f97316"
            strokeDasharray="4 4"
            strokeOpacity={0.4}
            label={{ value: 'HIGH', position: 'insideTopRight', fill: '#f97316', fontSize: 9 }}
          />
          <ReferenceLine
            y={80}
            stroke="#ef4444"
            strokeDasharray="4 4"
            strokeOpacity={0.4}
            label={{ value: 'CRIT', position: 'insideTopRight', fill: '#ef4444', fontSize: 9 }}
          />

          <Area
            type="monotone"
            dataKey="riskScore"
            stroke={dominantColor}
            strokeWidth={2}
            fill={`url(#riskGrad-${userId ?? 'default'})`}
            dot={false}
            activeDot={{
              r: 4,
              fill: dominantColor,
              stroke: '#0d0d1a',
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default RiskTimeline;
