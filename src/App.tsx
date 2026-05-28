import { useEffect, useState } from 'react';
import { Scene } from './scene/Scene';
import { Controls } from './ui/Controls';
import { Editor } from './ui/Editor';
import { RegisterPanel } from './ui/RegisterPanel';
import { MemoryPanel } from './ui/MemoryPanel';
import { InstructionPanel } from './ui/InstructionPanel';
import { InspectPanel } from './ui/InspectPanel';
import { SignalsPanel } from './ui/SignalsPanel';
import { Glossary } from './ui/Glossary';
import { useSim } from './state/store';

function Legend() {
  return (
    <div className="legend">
      <span><i className="swatch data" /> data</span>
      <span><i className="swatch ctrl" /> control</span>
      <span><i className="swatch pc"   /> PC</span>
      <span><i className="swatch active" /> active unit</span>
      <span><i className="swatch idle"   /> idle</span>
    </div>
  );
}

function CycleOverlay() {
  const { snapshot, retired } = useSim((s) => ({ snapshot: s.snapshot, retired: s.retired }));
  const cpi = retired > 0 ? (snapshot.cycle / retired).toFixed(2) : '—';
  return (
    <div className="cycle-overlay">
      <span style={{ fontSize: 9, letterSpacing: '0.8px', color: 'var(--muted)', textTransform: 'uppercase' }}>
        Cycle
      </span>
      <span className="co-val">{snapshot.cycle}</span>
      <span style={{ fontSize: 9, color: 'var(--muted)' }}>CPI {cpi}</span>
    </div>
  );
}

export default function App() {
  const running  = useSim((s) => s.running);
  const speedHz  = useSim((s) => s.speedHz);
  const step     = useSim((s) => s.step);
  const snapshot = useSim((s) => s.snapshot);
  const retired  = useSim((s) => s.retired);
  const [glossary, setGlossary] = useState(false);

  // Clock driver
  useEffect(() => {
    if (!running) return;
    const id = setInterval(step, 1000 / speedHz);
    return () => clearInterval(id);
  }, [running, speedHz, step]);

  const halted  = snapshot.halted;
  const stateLabel = halted ? 'HALTED' : running ? 'RUNNING' : 'PAUSED';
  const stateColor = halted ? 'red' : running ? 'green' : 'yellow';
  const cpi     = retired > 0 ? (snapshot.cycle / retired).toFixed(2) : '—';

  return (
    <div className="app">
      {/* ── Top bar ───────────────────────────────────────────── */}
      <header className="topbar">
        <div className="brand">
          <div className="title">RV32I <span>Visual Datapath</span></div>
          <span className="badge">RISC-V</span>
        </div>

        <div className="topbar-stats">
          <div className="topbar-stat">
            <span className="ts-label">Cycle</span>
            <span className="ts-val">{snapshot.cycle}</span>
          </div>
          <div className="topbar-stat">
            <span className="ts-label">Retired</span>
            <span className="ts-val">{retired}</span>
          </div>
          <div className="topbar-stat">
            <span className="ts-label">CPI</span>
            <span className="ts-val">{cpi}</span>
          </div>
          <div className="topbar-stat">
            <span className="ts-label">State</span>
            <span className={`ts-val ${stateColor}`}>{stateLabel}</span>
          </div>
          <div className="topbar-stat">
            <span className="ts-label">PC</span>
            <span className="ts-val" style={{ fontSize: 11 }}>
              0x{(snapshot.pc >>> 0).toString(16).padStart(8, '0')}
            </span>
          </div>
        </div>

        <span className="spacer" />
        <button className="btn" onClick={() => setGlossary(true)}>Glossary</button>
      </header>

      {/* ── Left sidebar ───────────────────────────────────────── */}
      <aside className="left">
        <Editor />
        <Controls />
        <SignalsPanel />
      </aside>

      {/* ── 3D Stage ──────────────────────────────────────────── */}
      <main className="stage">
        <Scene />
        <Legend />
        <CycleOverlay />
      </main>

      {/* ── Right sidebar ──────────────────────────────────────── */}
      <aside className="right">
        <InstructionPanel />
        <RegisterPanel />
        <MemoryPanel />
        <InspectPanel />
      </aside>

      <Glossary open={glossary} onClose={() => setGlossary(false)} />
    </div>
  );
}
