// filename: frontend/src/components/RiskBreakdown/index.jsx

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

function getBarColor(contribution) {
  if (contribution >= 50) return '#ef4444';
  if (contribution >= 25) return '#f59e0b';
  return '#22c55e';
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { factor, contribution, description } = payload[0]?.payload ?? {};
  const color = getBarColor(contribution);

  return (
    <div
      style={{
        background: '#0d0d1a',
        border: '1px solid rgba(99,102,241,0.25)',
        borderRadius: '8px',
        padding: '10px 14px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        maxWidth: '220px',
      }}
    >
      <div
        style={{
          fontSize: '12px',
          fontWeight: '600',
          color: '#e2e8f0',
          fontFamily: "'Inter', system-ui",
          marginBottom: '4px',
        }}
      >
        {factor}
      </div>
      <div
        style={{
          fontSize: '20px',
          fontWeight: '700',
          fontFamily: "'JetBrains Mono', monospace",
          color,
          marginBottom: '6px',
        }}
      >
        +{contribution}
      </div>
      {description && (
        <div
          style={{
            fontSize: '11px',
            color: '#94a3b8',
            fontFamily: "'Inter', system-ui",
            lineHeight: '1.4',
          }}
        >
          {description}
        </div>
      )}
    </div>
  );
};

const CustomLabel = ({ x, y, width, value, height, name }) => {
  if (!value) return null;
  const color = getBarColor(value);
  return (
    <text
      x={x + width + 6}
      y={y + height / 2}
      fill={color}
      fontSize={11}
      fontFamily="'JetBrains Mono', monospace"
      fontWeight="700"
      dominantBaseline="middle"
    >
      +{value}
    </text>
  );
};

export function RiskBreakdown({ factors = [] }) {
  if (!factors.length) {
    return (
      <div
        style={{
          padding: '24px',
          textAlign: 'center',
          color: '#64748b',
          fontFamily: "'Inter', system-ui",
          fontSize: '13px',
        }}
      >
        No risk factors to display
      </div>
    );
  }

  const sorted = [...factors].sort((a, b) => (b.contribution ?? 0) - (a.contribution ?? 0));

  return (
    <div>
      <div
        style={{
          fontSize: '11px',
          letterSpacing: '2px',
          color: '#64748b',
          fontFamily: "'Inter', system-ui",
          marginBottom: '16px',
          fontWeight: '600',
        }}
      >
        RISK FACTOR ANALYSIS
      </div>

      <ResponsiveContainer width="100%" height={Math.max(180, sorted.length * 36 + 40)}>
        <BarChart
          data={sorted}
          layout="vertical"
          margin={{ top: 0, right: 60, left: 10, bottom: 0 }}
          barSize={14}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(99,102,241,0.08)"
            horizontal={false}
          />

          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fill: '#64748b', fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}
            axisLine={{ stroke: 'rgba(99,102,241,0.1)' }}
            tickLine={false}
          />

          <YAxis
            type="category"
            dataKey="factor"
            width={130}
            tick={({ x, y, payload }) => (
              <text
                x={x - 4}
                y={y}
                fill="#94a3b8"
                fontSize={11}
                fontFamily="'Inter', system-ui"
                textAnchor="end"
                dominantBaseline="middle"
              >
                {payload.value}
              </text>
            )}
            axisLine={false}
            tickLine={false}
          />

          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.06)' }} />

          <Bar dataKey="contribution" radius={[0, 3, 3, 0]} label={<CustomLabel />}>
            {sorted.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getBarColor(entry.contribution)}
                fillOpacity={0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Total */}
      <div
        style={{
          marginTop: '12px',
          paddingTop: '12px',
          borderTop: '1px solid rgba(99,102,241,0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: '12px', color: '#64748b', fontFamily: "'Inter', system-ui" }}>
          Combined contribution
        </span>
        <span
          style={{
            fontSize: '18px',
            fontWeight: '700',
            fontFamily: "'JetBrains Mono', monospace",
            color: getBarColor(sorted.reduce((s, f) => s + (f.contribution ?? 0), 0) / sorted.length),
          }}
        >
          {sorted.reduce((s, f) => s + (f.contribution ?? 0), 0)}
        </span>
      </div>
    </div>
  );
}

export default RiskBreakdown;
