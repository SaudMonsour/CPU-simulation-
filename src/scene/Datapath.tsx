import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import { UNITS, BUSES, busId, UnitMeta, Bus, Vec3 } from './units';
import { useSim } from '../state/store';
import type { Snapshot } from '../engine/types';

// ─── Activity resolver ────────────────────────────────────────────────────────
function activity(snap: Snapshot): { units: Set<string>; buses: Set<string> } {
  const units = new Set<string>();
  const buses = new Set<string>();
  const s = snap.signals;
  if (snap.cycle === 0 && snap.decoded.name === 'unknown') return { units, buses };

  const aluActive = snap.decoded.name !== 'lui';
  units.add('pc'); units.add('imem'); units.add('control'); units.add('regs');
  if (s.aluSrc) units.add('imm');
  if (aluActive) units.add('alu');
  if (s.memRead || s.memWrite) units.add('dmem');
  if (s.regWrite) units.add('wb');

  const on = (b: Bus) => buses.add(busId(b));
  for (const b of BUSES) {
    const id = `${b.from}-${b.to}`;
    switch (id) {
      case 'pc-imem':
      case 'imem-regs':
      case 'imem-control': on(b); break;
      case 'imem-imm': if (s.aluSrc) on(b); break;
      case 'regs-alu':
      case 'control-alu': if (aluActive) on(b); break;
      case 'imm-alu': if (s.aluSrc) on(b); break;
      case 'regs-dmem': if (s.memWrite) on(b); break;
      case 'alu-dmem': if (s.memRead || s.memWrite) on(b); break;
      case 'alu-wb': if (s.regWrite && !s.memToReg) on(b); break;
      case 'dmem-wb': if (s.memToReg) on(b); break;
      case 'wb-regs': if (s.regWrite) on(b); break;
    }
  }
  return { units, buses };
}

// ─── Colour constants ─────────────────────────────────────────────────────────
const DATA_COLOR  = '#38e0c8';
const CTRL_COLOR  = '#f5b942';
const PC_COLOR    = '#60a5fa';
const IDLE_COLOR  = '#162035';

// ─── Staggered particles along a bus ─────────────────────────────────────────
function Particle({
  a, b, color, speed, offset,
}: {
  a: Vec3; b: Vec3; color: string; speed: number; offset: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const t = useRef(offset);
  useFrame((_, dt) => {
    t.current = (t.current + dt * speed) % 1;
    const k = t.current;
    if (ref.current) {
      ref.current.position.set(
        a[0] + (b[0] - a[0]) * k,
        a[1] + (b[1] - a[1]) * k,
        a[2] + (b[2] - a[2]) * k,
      );
    }
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.09, 10, 10]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  );
}

function DataBus({ bus, active }: { bus: Bus; active: boolean }) {
  const a = UNITS[bus.from].pos;
  const b = UNITS[bus.to].pos;
  const color = bus.kind === 'control' ? CTRL_COLOR : bus.kind === 'pc' ? PC_COLOR : DATA_COLOR;
  const speed = bus.kind === 'control' ? 0.6 : 0.9;
  const offsets = [0, 0.34, 0.67];

  return (
    <group>
      <Line
        points={[a, b]}
        color={active ? color : IDLE_COLOR}
        lineWidth={active ? 2.2 : 1}
        transparent
        opacity={active ? 1.0 : 0.5}
      />
      {active && offsets.map((off, i) => (
        <Particle key={i} a={a} b={b} color={color} speed={speed} offset={off} />
      ))}
    </group>
  );
}

// ─── Chip decorative circuit traces ──────────────────────────────────────────
function ChipTraces({ w, d, color }: { w: number; d: number; color: string }) {
  const hw = w / 2 - 0.18;
  const hd = d / 2 - 0.18;
  const segs = useMemo(() => [
    [[-hw, 0, 0], [hw, 0, 0]],
    [[0, 0, -hd], [0, 0, hd]],
    [[-hw * 0.5, 0, -hd * 0.5], [-hw * 0.5, 0, hd * 0.5]],
    [[hw * 0.5, 0, -hd * 0.5], [hw * 0.5, 0, hd * 0.5]],
  ] as [number, number, number][][], [hw, hd]);

  return (
    <group>
      {segs.map((pts, i) => (
        <Line
          key={i}
          points={pts}
          color={color}
          lineWidth={0.6}
          transparent
          opacity={0.22}
        />
      ))}
    </group>
  );
}

// ─── Solder bump pads (corner dots) ──────────────────────────────────────────
function SolderBumps({ w, d, color }: { w: number; d: number; color: string }) {
  const hw = w / 2 - 0.12;
  const hd = d / 2 - 0.12;
  const corners: [number, number, number][] = [
    [-hw, 0, -hd], [hw, 0, -hd], [-hw, 0, hd], [hw, 0, hd],
  ];
  return (
    <group>
      {corners.map((pos, i) => (
        <mesh key={i} position={pos}>
          <cylinderGeometry args={[0.07, 0.07, 0.06, 8]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} metalness={0.9} roughness={0.1} />
        </mesh>
      ))}
    </group>
  );
}

// ─── CPU block (chip) ─────────────────────────────────────────────────────────
function Unit({
  meta, active, selected, onSelect,
}: {
  meta: UnitMeta; active: boolean; selected: boolean; onSelect: (id: string) => void;
}) {
  const bodyMat  = useRef<THREE.MeshStandardMaterial>(null);
  const glowMat  = useRef<THREE.MeshBasicMaterial>(null);
  const ringRef  = useRef<THREE.Mesh>(null);
  const ringMat  = useRef<THREE.MeshBasicMaterial>(null);
  const frameRef = useRef<number>(0);

  useFrame((_, dt) => {
    frameRef.current += dt;

    if (bodyMat.current) {
      const target = active ? 1.4 : 0.08;
      bodyMat.current.emissiveIntensity +=
        (target - bodyMat.current.emissiveIntensity) * 0.14;
    }
    if (glowMat.current) {
      const target = active ? 0.18 : 0;
      glowMat.current.opacity +=
        (target - glowMat.current.opacity) * 0.1;
    }
    if (ringRef.current && ringMat.current) {
      const target = active ? 0.55 : 0;
      ringMat.current.opacity +=
        (target - ringMat.current.opacity) * 0.09;
      // Pulse scale when active
      if (active) {
        const pulse = 1 + Math.sin(frameRef.current * 3.5) * 0.04;
        ringRef.current.scale.set(pulse, 1, pulse);
      }
    }
  });

  const [w, h, d] = meta.size;

  return (
    <group position={meta.pos}>
      {/* Chip substrate shadow pad */}
      <mesh position={[0, -h / 2 - 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w + 0.3, d + 0.3]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.35} />
      </mesh>

      {/* Main chip body */}
      <mesh
        onClick={(e) => { e.stopPropagation(); onSelect(meta.id); }}
        castShadow
      >
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial
          ref={bodyMat}
          color={meta.color}
          emissive={meta.color}
          emissiveIntensity={0.08}
          metalness={0.55}
          roughness={0.35}
        />
      </mesh>

      {/* Top glow plane */}
      <mesh position={[0, h / 2 + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w * 0.88, d * 0.88]} />
        <meshBasicMaterial
          ref={glowMat}
          color={meta.color}
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>

      {/* Pulse ring */}
      <mesh ref={ringRef} position={[0, h / 2 + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[Math.max(w, d) * 0.52, Math.max(w, d) * 0.62, 36]} />
        <meshBasicMaterial
          ref={ringMat}
          color={meta.color}
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>

      {/* Circuit traces on top face */}
      <group position={[0, h / 2 + 0.02, 0]}>
        <ChipTraces w={w} d={d} color={meta.color} />
      </group>

      {/* Solder bumps */}
      <group position={[0, h / 2 + 0.04, 0]}>
        <SolderBumps w={w} d={d} color={meta.color} />
      </group>

      {/* Selection wireframe */}
      {selected && (
        <mesh>
          <boxGeometry args={[w + 0.16, h + 0.16, d + 0.16]} />
          <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.7} />
        </mesh>
      )}

      {/* Label above */}
      <Html
        position={[0, h / 2 + 0.55, 0]}
        center
        distanceFactor={12}
        style={{ pointerEvents: 'none' }}
      >
        <div
          className={`unit-label${active ? ' active' : ''}`}
          style={{ '--uc': meta.color } as React.CSSProperties}
        >
          {meta.label}
        </div>
      </Html>
    </group>
  );
}

// ─── Main Datapath component ──────────────────────────────────────────────────
export function Datapath() {
  const snapshot = useSim((s) => s.snapshot);
  const selected = useSim((s) => s.selected);
  const select   = useSim((s) => s.select);
  const { units, buses } = activity(snapshot);

  return (
    <group>
      {/* Buses first so they render behind chips */}
      {BUSES.map((b) => (
        <DataBus
          key={busId(b)}
          bus={b}
          active={buses.has(busId(b))}
        />
      ))}

      {/* CPU blocks */}
      {Object.values(UNITS).map((m) => (
        <Unit
          key={m.id}
          meta={m}
          active={units.has(m.id)}
          selected={selected === m.id}
          onSelect={select}
        />
      ))}
    </group>
  );
}
