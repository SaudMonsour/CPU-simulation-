import { useRef } from 'react';
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
      case 'imem-imm':     if (s.aluSrc) on(b); break;
      case 'regs-alu':
      case 'control-alu': if (aluActive) on(b); break;
      case 'imm-alu':     if (s.aluSrc) on(b); break;
      case 'regs-dmem':   if (s.memWrite) on(b); break;
      case 'alu-dmem':    if (s.memRead || s.memWrite) on(b); break;
      case 'alu-wb':      if (s.regWrite && !s.memToReg) on(b); break;
      case 'dmem-wb':     if (s.memToReg) on(b); break;
      case 'wb-regs':     if (s.regWrite) on(b); break;
    }
  }
  return { units, buses };
}

// ─── Colour palette ───────────────────────────────────────────────────────────
const DATA_COLOR = '#38e0c8';
const CTRL_COLOR = '#f5b942';
const PC_COLOR   = '#60a5fa';
const IDLE_LINE  = '#1e3455';

// ─── Glow particle (multi-layer additive blending = convincing bloom) ─────────
function Particle({ a, b, color, speed, offset }: {
  a: Vec3; b: Vec3; color: string; speed: number; offset: number;
}) {
  const ref = useRef<THREE.Group>(null);
  const t   = useRef(offset);

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
    <group ref={ref}>
      {/* Bright solid core */}
      <mesh>
        <sphereGeometry args={[0.09, 8, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {/* Inner glow halo */}
      <mesh>
        <sphereGeometry args={[0.22, 8, 8]} />
        <meshBasicMaterial
          color={color} transparent opacity={0.38}
          blending={THREE.AdditiveBlending} depthWrite={false}
        />
      </mesh>
      {/* Mid glow halo */}
      <mesh>
        <sphereGeometry args={[0.44, 8, 8]} />
        <meshBasicMaterial
          color={color} transparent opacity={0.14}
          blending={THREE.AdditiveBlending} depthWrite={false}
        />
      </mesh>
      {/* Soft wide glow */}
      <mesh>
        <sphereGeometry args={[0.72, 8, 8]} />
        <meshBasicMaterial
          color={color} transparent opacity={0.05}
          blending={THREE.AdditiveBlending} depthWrite={false}
        />
      </mesh>
    </group>
  );
}

// ─── Bus ──────────────────────────────────────────────────────────────────────
function DataBus({ bus, active }: { bus: Bus; active: boolean }) {
  const a     = UNITS[bus.from].pos;
  const b     = UNITS[bus.to].pos;
  const color = bus.kind === 'control' ? CTRL_COLOR : bus.kind === 'pc' ? PC_COLOR : DATA_COLOR;
  const speed = bus.kind === 'control' ? 0.55 : 0.85;

  return (
    <group>
      {/* Bus line — glow overlay when active */}
      <Line
        points={[a, b]}
        color={active ? color : IDLE_LINE}
        lineWidth={active ? 2.5 : 1.2}
        transparent
        opacity={active ? 1 : 0.5}
      />
      {active && (
        <Line
          points={[a, b]}
          color={color}
          lineWidth={6}
          transparent
          opacity={0.07}
        />
      )}
      {/* 4 staggered particles */}
      {active && [0, 0.25, 0.5, 0.75].map((off, i) => (
        <Particle key={i} a={a} b={b} color={color} speed={speed} offset={off} />
      ))}
    </group>
  );
}

// ─── Chip interior grid (transistor-like dots) ─────────────────────────────
function ChipInterior({ w, d, color, active }: { w: number; d: number; color: string; active: boolean }) {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const t   = useRef(Math.random() * Math.PI * 2);

  useFrame((_, dt) => {
    t.current += dt * (active ? 2.2 : 0.8);
    if (mat.current) {
      const base = active ? 1.0 : 0.35;
      mat.current.emissiveIntensity = base + Math.sin(t.current) * (active ? 0.4 : 0.12);
    }
  });

  // Small cross-pattern lines on top face
  const hw = w / 2 - 0.2, hd = d / 2 - 0.2;
  return (
    <group>
      {/* Horizontal trace */}
      <Line
        points={[[-hw, 0, 0] as Vec3, [hw, 0, 0] as Vec3]}
        color={color} lineWidth={0.8} transparent opacity={0.25}
      />
      {/* Vertical trace */}
      <Line
        points={[[0, 0, -hd] as Vec3, [0, 0, hd] as Vec3]}
        color={color} lineWidth={0.8} transparent opacity={0.25}
      />
      {/* Center node */}
      <mesh>
        <cylinderGeometry args={[0.1, 0.1, 0.08, 8]} />
        <meshStandardMaterial
          ref={mat}
          color={color} emissive={color}
          emissiveIntensity={0.35}
          metalness={0.9} roughness={0.1}
        />
      </mesh>
      {/* Corner pads */}
      {([[-hw * 0.6, 0, -hd * 0.6], [hw * 0.6, 0, -hd * 0.6],
         [-hw * 0.6, 0,  hd * 0.6], [hw * 0.6, 0,  hd * 0.6]] as Vec3[]).map((pos, i) => (
        <mesh key={i} position={pos}>
          <cylinderGeometry args={[0.06, 0.06, 0.06, 6]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} metalness={0.9} roughness={0.1} />
        </mesh>
      ))}
    </group>
  );
}

// ─── CPU block (chip) ─────────────────────────────────────────────────────────
function Unit({ meta, active, selected, onSelect }: {
  meta: UnitMeta; active: boolean; selected: boolean; onSelect: (id: string) => void;
}) {
  const bodyMat  = useRef<THREE.MeshStandardMaterial>(null);
  const glow1    = useRef<THREE.MeshBasicMaterial>(null);
  const glow2    = useRef<THREE.MeshBasicMaterial>(null);
  const glow3    = useRef<THREE.MeshBasicMaterial>(null);
  const ringMat  = useRef<THREE.MeshBasicMaterial>(null);
  const frameRef = useRef(Math.random() * Math.PI * 2); // unique phase per unit

  useFrame((_, dt) => {
    frameRef.current += dt;
    const time   = frameRef.current;
    const phase  = meta.pos[0] * 0.35; // spatial phase offset

    // Body emissive — breathing idle + blazing when active
    if (bodyMat.current) {
      const idleBase = 0.55 + Math.sin(time * 1.3 + phase) * 0.18;
      const target   = active ? 2.5 : idleBase;
      const speed    = active ? 0.18 : 0.04;
      bodyMat.current.emissiveIntensity += (target - bodyMat.current.emissiveIntensity) * speed;
    }

    // Glow halos — additive blending layers
    const idleG1 = 0.14 + Math.sin(time * 1.3 + phase) * 0.05;
    const idleG2 = 0.06 + Math.sin(time * 1.3 + phase) * 0.02;
    const idleG3 = 0.02 + Math.sin(time * 1.3 + phase) * 0.01;
    if (glow1.current) {
      const t = active ? 0.52 : idleG1;
      glow1.current.opacity += (t - glow1.current.opacity) * 0.12;
    }
    if (glow2.current) {
      const t = active ? 0.22 : idleG2;
      glow2.current.opacity += (t - glow2.current.opacity) * 0.10;
    }
    if (glow3.current) {
      const t = active ? 0.09 : idleG3;
      glow3.current.opacity += (t - glow3.current.opacity) * 0.08;
    }
    if (ringMat.current) {
      const t = active ? 0.55 : 0.08 + Math.sin(time * 1.3 + phase) * 0.03;
      ringMat.current.opacity += (t - ringMat.current.opacity) * 0.10;
    }
  });

  const [w, h, d] = meta.size;

  return (
    <group position={meta.pos}>
      {/* Ground shadow */}
      <mesh position={[0, -h / 2 - 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w + 0.5, d + 0.5]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.5} depthWrite={false} />
      </mesh>

      {/* Main chip body */}
      <mesh onClick={(e) => { e.stopPropagation(); onSelect(meta.id); }} castShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial
          ref={bodyMat}
          color={meta.color}
          emissive={meta.color}
          emissiveIntensity={0.55}
          metalness={0.5}
          roughness={0.4}
        />
      </mesh>

      {/* Top face glow layers (additive blending = real glow look) */}
      <group position={[0, h / 2 + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh>
          <planeGeometry args={[w * 1.2, d * 1.2]} />
          <meshBasicMaterial ref={glow1} color={meta.color} transparent opacity={0.14}
            blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
        <mesh>
          <planeGeometry args={[w * 2.2, d * 2.2]} />
          <meshBasicMaterial ref={glow2} color={meta.color} transparent opacity={0.06}
            blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
        <mesh>
          <planeGeometry args={[w * 3.8, d * 3.8]} />
          <meshBasicMaterial ref={glow3} color={meta.color} transparent opacity={0.02}
            blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      </group>

      {/* Chip interior details */}
      <group position={[0, h / 2 + 0.04, 0]}>
        <ChipInterior w={w} d={d} color={meta.color} active={active} />
      </group>

      {/* Pulse ring */}
      <mesh position={[0, h / 2 + 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[Math.max(w, d) * 0.55, Math.max(w, d) * 0.68, 40]} />
        <meshBasicMaterial ref={ringMat} color={meta.color} transparent opacity={0.08}
          blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>

      {/* Selection wireframe */}
      {selected && (
        <mesh>
          <boxGeometry args={[w + 0.18, h + 0.18, d + 0.18]} />
          <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.8} />
        </mesh>
      )}

      {/* 3D label */}
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

// ─── Main Datapath ────────────────────────────────────────────────────────────
export function Datapath() {
  const snapshot = useSim((s) => s.snapshot);
  const selected = useSim((s) => s.selected);
  const select   = useSim((s) => s.select);
  const { units, buses } = activity(snapshot);

  return (
    <group>
      {BUSES.map((b) => (
        <DataBus key={busId(b)} bus={b} active={buses.has(busId(b))} />
      ))}
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
