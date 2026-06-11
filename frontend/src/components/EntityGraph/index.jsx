// filename: frontend/src/components/EntityGraph/index.jsx

import React, { useRef, useEffect, useState, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { AlertTriangle, X } from 'lucide-react';

function getNodeColor(node) {
  if (node.suspicious) return '#ef4444';
  if (node.type === 'employee') return '#6366f1';
  if (node.type === 'external') return '#22c55e';
  return '#64748b';
}

function getLinkColor(link) {
  if (link.suspicious) return '#ef4444';
  return 'rgba(99,102,241,0.2)';
}

function getLinkWidth(link) {
  if (link.suspicious) return 2.5;
  return 1;
}

function NodeInfoPanel({ node, onClose }) {
  if (!node) return null;
  const color = getNodeColor(node);

  return (
    <div
      style={{
        position: 'absolute',
        top: '12px',
        right: '12px',
        width: '240px',
        background: '#0d0d1a',
        border: `1px solid ${node.suspicious ? 'rgba(239,68,68,0.4)' : 'rgba(99,102,241,0.25)'}`,
        borderRadius: '10px',
        padding: '14px',
        boxShadow: node.suspicious
          ? '0 0 24px rgba(239,68,68,0.2)'
          : '0 8px 32px rgba(0,0,0,0.4)',
        zIndex: 10,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: color,
              boxShadow: `0 0 8px ${color}`,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: '13px',
              fontWeight: '600',
              color: '#e2e8f0',
              fontFamily: "'Inter', system-ui",
            }}
          >
            {node.name ?? node.id}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }}
        >
          <X size={14} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <InfoRow label="Type" value={node.type ?? 'Unknown'} />
        <InfoRow label="Department" value={node.department ?? '—'} />
        <InfoRow label="Role" value={node.role ?? '—'} />
        {node.riskScore != null && (
          <InfoRow
            label="Risk Score"
            value={node.riskScore}
            valueColor={getNodeColor(node)}
          />
        )}
        {node.connections != null && (
          <InfoRow label="Connections" value={node.connections} />
        )}
        {node.suspicious && (
          <div
            style={{
              marginTop: '8px',
              padding: '8px',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: '6px',
              fontSize: '11px',
              color: '#ef4444',
              fontFamily: "'Inter', system-ui",
              display: 'flex',
              gap: '6px',
              alignItems: 'flex-start',
            }}
          >
            <AlertTriangle size={12} style={{ marginTop: '1px', flexShrink: 0 }} />
            {node.suspicionReason ?? 'Anomalous behavior detected'}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value, valueColor }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span
        style={{
          fontSize: '11px',
          color: '#64748b',
          fontFamily: "'Inter', system-ui",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: '11px',
          fontWeight: '600',
          color: valueColor ?? '#e2e8f0',
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        {value}
      </span>
    </div>
  );
}

export function EntityGraph({ graphData, anomalyDescription }) {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const [selectedNode, setSelectedNode] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);

  const nodes = graphData?.nodes ?? [];
  const links = graphData?.edges ?? graphData?.links ?? [];

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });
    ro.observe(containerRef.current);
    setDimensions({
      width: containerRef.current.offsetWidth,
      height: containerRef.current.offsetHeight,
    });
    return () => ro.disconnect();
  }, []);

  const nodeCanvasObject = useCallback(
    (node, ctx, globalScale) => {
      const isHovered = hoveredNode?.id === node.id;
      const isSelected = selectedNode?.id === node.id;
      const color = getNodeColor(node);
      const baseRadius = node.type === 'employee' ? 7 : 5;
      const radius = isHovered || isSelected ? baseRadius + 2 : baseRadius;

      // Glow for suspicious
      if (node.suspicious) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 8, 0, 2 * Math.PI);
        const grd = ctx.createRadialGradient(node.x, node.y, radius, node.x, node.y, radius + 8);
        grd.addColorStop(0, 'rgba(239,68,68,0.3)');
        grd.addColorStop(1, 'rgba(239,68,68,0)');
        ctx.fillStyle = grd;
        ctx.fill();
      }

      // Selection ring
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 4, 0, 2 * Math.PI);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.6;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Main circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();

      // Inner highlight
      ctx.beginPath();
      ctx.arc(node.x - radius * 0.25, node.y - radius * 0.25, radius * 0.35, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fill();

      // Label
      const label = node.name ?? node.id ?? '';
      const fontSize = Math.max(9, 11 / globalScale);
      ctx.font = `${fontSize}px Inter, system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = node.suspicious ? '#ef4444' : (isHovered ? '#e2e8f0' : '#94a3b8');
      ctx.fillText(
        label.length > 12 ? label.slice(0, 10) + '…' : label,
        node.x,
        node.y + radius + 3
      );
    },
    [hoveredNode, selectedNode]
  );

  if (!nodes.length) {
    return (
      <div
        style={{
          height: '400px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#64748b',
          fontFamily: "'Inter', system-ui",
          fontSize: '13px',
        }}
      >
        No graph data available
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
      {/* Graph container */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          position: 'relative',
          borderRadius: '10px',
          overflow: 'hidden',
          background: 'rgba(6,6,20,0.8)',
          border: '1px solid rgba(99,102,241,0.12)',
          minHeight: '400px',
        }}
      >
        <ForceGraph2D
          width={dimensions.width}
          height={dimensions.height}
          graphData={{ nodes, links }}
          nodeCanvasObject={nodeCanvasObject}
          nodeCanvasObjectMode={() => 'replace'}
          linkColor={(link) => getLinkColor(link)}
          linkWidth={(link) => getLinkWidth(link)}
          linkDirectionalArrowLength={4}
          linkDirectionalArrowRelPos={1}
          linkDirectionalArrowColor={(link) => getLinkColor(link)}
          backgroundColor="transparent"
          d3VelocityDecay={0.3}
          warmupTicks={50}
          cooldownTicks={100}
          onNodeClick={(node) => {
            setSelectedNode((prev) => (prev?.id === node.id ? null : node));
          }}
          onNodeHover={(node) => setHoveredNode(node)}
          nodeRelSize={6}
        />

        {/* Node info panel */}
        <NodeInfoPanel
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
        />

        {/* Legend */}
        <div
          style={{
            position: 'absolute',
            bottom: '12px',
            left: '12px',
            display: 'flex',
            gap: '14px',
          }}
        >
          {[
            { color: '#6366f1', label: 'Employee' },
            { color: '#22c55e', label: 'External' },
            { color: '#ef4444', label: 'Suspicious' },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: color,
                  boxShadow: `0 0 5px ${color}`,
                }}
              />
              <span
                style={{
                  fontSize: '10px',
                  color: '#64748b',
                  fontFamily: "'Inter', system-ui",
                  letterSpacing: '0.5px',
                }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Anomaly banner */}
      {anomalyDescription && (
        <div
          style={{
            padding: '12px 16px',
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: '8px',
            display: 'flex',
            gap: '10px',
            alignItems: 'flex-start',
          }}
        >
          <AlertTriangle size={16} color="#ef4444" style={{ marginTop: '1px', flexShrink: 0 }} />
          <div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: '700',
                color: '#ef4444',
                letterSpacing: '1.5px',
                fontFamily: "'Inter', system-ui",
                marginBottom: '3px',
              }}
            >
              ANOMALY DETECTED
            </div>
            <div
              style={{
                fontSize: '12px',
                color: '#fca5a5',
                fontFamily: "'Inter', system-ui",
                lineHeight: '1.5',
              }}
            >
              {anomalyDescription}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EntityGraph;
