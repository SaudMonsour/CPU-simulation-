import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import { UNITS, BUSES, busId, UnitMeta, Bus, Vec3 } from './units';
import { useSim } from '../state/store';
import type { Snapshot } from '../engine/types';

// Decide what lights up this cycle, straight from the control signals.
function activity(snap: Snapshot): { units: Set<string>; buses: Set<string> } {
  const units = new Set<string>();
  const buses = new Set<string>();
  const s = snap.signals;
  const inFlight = snap.cycle > 0 && snap.decoded.name !== 'unknown';
  if (!inFlight) return { units, buses };

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

function Unit({ meta, active, selected, onSelect }: {
  meta: UnitMeta; active: boolean; selected: boolean; onSelect: (id: string) => void;
}) {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(() => {
    if (!mat.current) return;
    const target = active ? 0.85 : 0.04;
    mat.current.emissiveIntensity += (target - mat.current.emissiveIntensity) * 0.18;
  });

  return (
    <group position={meta.pos}>
      <mesh onClick={(e) => { e.stopPropagation(); onSelect(meta.id); }}>
        <boxGeometry args={meta.size} />
        <meshStandardMaterial
          ref={mat} color={meta.color} emissive={meta.color}
          emissiveIntensity={0.04} metalness={0.3} roughness={0.55}
        />
      </mesh>
      {selected && (
        <mesh>
          <boxGeometry args={[meta.size[0] + 0.14, meta.size[1] + 0.14, meta.size[2] + 0.14]} />
          <meshBasicMaterial color="#ffffff" wireframe />
        </mesh>
      )}
      <Html position={[0, meta.size[1] / 2 + 0.4, 0]} center distanceFactor={11}
        style={{ pointerEvents: 'none' }}>
        <div className="unit-label">{meta.label}</div>
      </Html>
    </group>
  );
}

function Pulse({ a, b, color }: { a: Vec3; b: Vec3; color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  const t = useRef(Math.random());
  useFrame((_, dt) => {
    t.current = (t.current + dt * 0.75) % 1;
    const k = t.current;
    ref.current?.position.set(
      a[0] + (b[0] - a[0]) * k,
      a[1] + (b[1] - a[1]) * k,
      a[2] + (b[2] - a[2]) * k,
    );
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.13, 12, 12]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  );
}

const DATA_COLOR = '#38e0c8';
const CTRL_COLOR = '#f5b942';

export function Datapath() {
  const snapshot = useSim((s) => s.snapshot);
  const selected = useSim((s) => s.selected);
  const select = useSim((s) => s.select);
  const { units, buses } = activity(snapshot);

  return (
    <group>
      {BUSES.map((b) => {
        const a = UNITS[b.from].pos;
        const c = UNITS[b.to].pos;
        const on = buses.has(busId(b));
        const color = b.kind === 'control' ? CTRL_COLOR : DATA_COLOR;
        return (
          <group key={busId(b)}>
            <Line
              points={[a, c]}
              color={on ? color : '#243150'}
              lineWidth={on ? 3 : 1.4}
              transparent
              opacity={on ? 1 : 0.55}
            />
            {on && <Pulse a={a} b={c} color={color} />}
          </group>
        );
      })}

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
