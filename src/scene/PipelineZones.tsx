import { Html, Line } from '@react-three/drei';
import * as THREE from 'three';

interface Zone {
  id: string;
  label: string;
  sublabel: string;
  x: number;
  width: number;
  depth: number;
  color: string;
}

const ZONES: Zone[] = [
  { id: 'IF',  label: 'IF',  sublabel: 'Instruction Fetch',  x: -9.75, width: 6.5,  depth: 8.5, color: '#3b82f6' },
  { id: 'ID',  label: 'ID',  sublabel: 'Decode / RegRead',   x: -4,    width: 7.5,  depth: 8.5, color: '#10b981' },
  { id: 'EX',  label: 'EX',  sublabel: 'Execute',            x:  1.5,  width: 5.5,  depth: 8.5, color: '#ef4444' },
  { id: 'MEM', label: 'MEM', sublabel: 'Memory Access',      x:  6.5,  width: 5.0,  depth: 8.5, color: '#8b5cf6' },
  { id: 'WB',  label: 'WB',  sublabel: 'Write Back',         x: 11.0,  width: 3.5,  depth: 8.5, color: '#22d3ee' },
];

// Pipeline register latches between stages
const LATCHES = [
  { x: -6.75, label: 'IF/ID' },
  { x: -0.75, label: 'ID/EX' },
  { x:  4.25, label: 'EX/MEM' },
  { x:  9.25, label: 'MEM/WB' },
];

function StageZone({ zone }: { zone: Zone }) {
  return (
    <group position={[zone.x, -0.36, 0]}>
      {/* Floor panel */}
      <mesh receiveShadow>
        <boxGeometry args={[zone.width - 0.06, 0.04, zone.depth]} />
        <meshStandardMaterial
          color={zone.color}
          emissive={zone.color}
          emissiveIntensity={0.06}
          transparent
          opacity={0.18}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Border frame — front edge */}
      <mesh position={[0, 0.04, zone.depth / 2]}>
        <boxGeometry args={[zone.width - 0.06, 0.04, 0.03]} />
        <meshBasicMaterial color={zone.color} transparent opacity={0.5} toneMapped={false} />
      </mesh>
      {/* Border frame — back edge */}
      <mesh position={[0, 0.04, -zone.depth / 2]}>
        <boxGeometry args={[zone.width - 0.06, 0.04, 0.03]} />
        <meshBasicMaterial color={zone.color} transparent opacity={0.5} toneMapped={false} />
      </mesh>
      {/* Stage label above the back */}
      <Html
        position={[0, 0.3, -zone.depth / 2 - 0.2]}
        center
        distanceFactor={14}
        style={{ pointerEvents: 'none' }}
      >
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
        }}>
          <span style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: 11,
            fontWeight: 700,
            color: zone.color,
            letterSpacing: '3px',
            textShadow: `0 0 8px ${zone.color}`,
          }}>
            {zone.label}
          </span>
          <span style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: 8,
            color: zone.color,
            opacity: 0.65,
            letterSpacing: '1.5px',
            whiteSpace: 'nowrap',
          }}>
            {zone.sublabel}
          </span>
        </div>
      </Html>
    </group>
  );
}

function PipelineLatch({ x, label }: { x: number; label: string }) {
  return (
    <group position={[x, 0, 0]}>
      {/* Vertical divider bar */}
      <mesh>
        <boxGeometry args={[0.12, 3.8, 0.14]} />
        <meshStandardMaterial
          color="#4b6a90"
          emissive="#4b6a90"
          emissiveIntensity={0.4}
          metalness={0.9}
          roughness={0.15}
        />
      </mesh>
      {/* Top cap glow */}
      <mesh position={[0, 2.0, 0]}>
        <sphereGeometry args={[0.18, 8, 8]} />
        <meshBasicMaterial color="#6b9ab8" toneMapped={false} />
      </mesh>
      {/* Bottom cap glow */}
      <mesh position={[0, -2.0, 0]}>
        <sphereGeometry args={[0.18, 8, 8]} />
        <meshBasicMaterial color="#6b9ab8" toneMapped={false} />
      </mesh>
      {/* Label */}
      <Html
        position={[0, 2.6, 0]}
        center
        distanceFactor={16}
        style={{ pointerEvents: 'none' }}
      >
        <div style={{
          fontFamily: 'ui-monospace, monospace',
          fontSize: 8,
          color: '#6b9ab8',
          letterSpacing: '1px',
          whiteSpace: 'nowrap',
          textShadow: '0 0 6px #4b6a90',
        }}>
          {label}
        </div>
      </Html>
    </group>
  );
}

// Decorative circuit traces on the floor
function CircuitTraces() {
  type Pt = [number, number, number];
  const traces: [Pt, Pt][] = [
    [[-13, -0.34, 3],    [13, -0.34, 3]],
    [[-13, -0.34, -3],   [13, -0.34, -3]],
    [[-13, -0.34, 0],    [-7, -0.34, 0]],
    [[4,   -0.34, -1.5], [4,  -0.34, -4]],
    [[9,   -0.34,  1.5], [9,  -0.34,  4]],
  ];
  return (
    <group>
      {traces.map((pts, i) => (
        <Line
          key={i}
          points={pts}
          color="#1a2d4a"
          lineWidth={1}
          transparent
          opacity={0.6}
        />
      ))}
    </group>
  );
}

export function PipelineZones() {
  return (
    <group>
      {ZONES.map((z) => <StageZone key={z.id} zone={z} />)}
      {LATCHES.map((l) => <PipelineLatch key={l.label} x={l.x} label={l.label} />)}
      <CircuitTraces />
    </group>
  );
}
