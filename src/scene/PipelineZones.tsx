import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
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
  { id: 'IF',  label: 'IF',  sublabel: 'Instruction Fetch', x: -9.75, width: 6.5, depth: 9,   color: '#3b82f6' },
  { id: 'ID',  label: 'ID',  sublabel: 'Decode / RegRead',  x: -4,    width: 7.5, depth: 9,   color: '#10b981' },
  { id: 'EX',  label: 'EX',  sublabel: 'Execute',           x:  1.5,  width: 5.5, depth: 9,   color: '#ef4444' },
  { id: 'MEM', label: 'MEM', sublabel: 'Memory Access',     x:  6.5,  width: 5.0, depth: 9,   color: '#8b5cf6' },
  { id: 'WB',  label: 'WB',  sublabel: 'Write Back',        x: 11.0,  width: 3.5, depth: 9,   color: '#22d3ee' },
];

const LATCHES = [
  { x: -6.75, label: 'IF/ID'   },
  { x: -0.75, label: 'ID/EX'   },
  { x:  4.25, label: 'EX/MEM'  },
  { x:  9.25, label: 'MEM/WB'  },
];

function StageZone({ zone }: { zone: Zone }) {
  const floorMat = useRef<THREE.MeshStandardMaterial>(null);
  const t        = useRef(Math.random() * Math.PI * 2);

  useFrame((_, dt) => {
    t.current += dt * 0.6;
    if (floorMat.current) {
      floorMat.current.emissiveIntensity = 0.12 + Math.sin(t.current) * 0.04;
    }
  });

  const hw = zone.width / 2;
  const hd = zone.depth / 2;
  const corners: [THREE.Vector3, THREE.Vector3][] = [
    [new THREE.Vector3(-hw, 0, -hd), new THREE.Vector3( hw, 0, -hd)],
    [new THREE.Vector3( hw, 0, -hd), new THREE.Vector3( hw, 0,  hd)],
    [new THREE.Vector3( hw, 0,  hd), new THREE.Vector3(-hw, 0,  hd)],
    [new THREE.Vector3(-hw, 0,  hd), new THREE.Vector3(-hw, 0, -hd)],
  ];

  return (
    <group position={[zone.x, -0.38, 0]}>
      {/* Floor panel */}
      <mesh receiveShadow>
        <boxGeometry args={[zone.width - 0.08, 0.04, zone.depth]} />
        <meshStandardMaterial
          ref={floorMat}
          color={zone.color}
          emissive={zone.color}
          emissiveIntensity={0.12}
          transparent
          opacity={0.28}
        />
      </mesh>

      {/* Glowing border corners (additive blending) */}
      {corners.map(([a, b], i) => (
        <Line
          key={i}
          points={[a, b]}
          color={zone.color}
          lineWidth={1.8}
          transparent
          opacity={0.7}
        />
      ))}

      {/* Extra bright front/back edge lines */}
      <mesh position={[0, 0.06, hd]}>
        <boxGeometry args={[zone.width, 0.05, 0.04]} />
        <meshBasicMaterial color={zone.color} transparent opacity={0.6}
          blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.06, -hd]}>
        <boxGeometry args={[zone.width, 0.05, 0.04]} />
        <meshBasicMaterial color={zone.color} transparent opacity={0.6}
          blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* Stage label — back edge, above */}
      <Html
        position={[0, 0.4, -hd - 0.15]}
        center
        distanceFactor={14}
        style={{ pointerEvents: 'none' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <span style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: 13,
            fontWeight: 800,
            color: zone.color,
            letterSpacing: '4px',
            textShadow: `0 0 12px ${zone.color}, 0 0 24px ${zone.color}66`,
          }}>
            {zone.label}
          </span>
          <span style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: 8,
            color: zone.color,
            opacity: 0.7,
            letterSpacing: '2px',
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
  const mat  = useRef<THREE.MeshStandardMaterial>(null);
  const capL = useRef<THREE.MeshBasicMaterial>(null);
  const capR = useRef<THREE.MeshBasicMaterial>(null);
  const t    = useRef(Math.random() * Math.PI * 2);

  useFrame((_, dt) => {
    t.current += dt * 1.2;
    const p = 0.4 + Math.sin(t.current) * 0.2;
    if (mat.current)  mat.current.emissiveIntensity  = p;
    if (capL.current) capL.current.opacity = p * 0.7;
    if (capR.current) capR.current.opacity = p * 0.7;
  });

  return (
    <group position={[x, 0, 0]}>
      {/* Bar */}
      <mesh>
        <boxGeometry args={[0.1, 4.2, 0.12]} />
        <meshStandardMaterial ref={mat} color="#4b7aaa" emissive="#4b7aaa"
          emissiveIntensity={0.4} metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Top cap glow */}
      <mesh position={[0, 2.2, 0]}>
        <sphereGeometry args={[0.16, 8, 8]} />
        <meshBasicMaterial ref={capL} color="#7ab8f5" transparent opacity={0.6}
          blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {/* Bottom cap glow */}
      <mesh position={[0, -2.2, 0]}>
        <sphereGeometry args={[0.16, 8, 8]} />
        <meshBasicMaterial ref={capR} color="#7ab8f5" transparent opacity={0.6}
          blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {/* Label */}
      <Html position={[0, 2.9, 0]} center distanceFactor={16} style={{ pointerEvents: 'none' }}>
        <div style={{
          fontFamily: 'ui-monospace, monospace', fontSize: 8,
          color: '#7ab8f5', letterSpacing: '1.5px', whiteSpace: 'nowrap',
          textShadow: '0 0 8px #4b7aaa',
        }}>
          {label}
        </div>
      </Html>
    </group>
  );
}

export function PipelineZones() {
  return (
    <group>
      {ZONES.map((z)   => <StageZone key={z.id}       zone={z}  />)}
      {LATCHES.map((l) => <PipelineLatch key={l.label} x={l.x} label={l.label} />)}
    </group>
  );
}
