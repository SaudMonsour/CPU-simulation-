import { useEffect, useState } from 'react';
import { Scene } from './scene/Scene';
import { Controls } from './ui/Controls';
import { Editor } from './ui/Editor';
import { RegisterPanel } from './ui/RegisterPanel';
import { MemoryPanel } from './ui/MemoryPanel';
import { InstructionPanel } from './ui/InstructionPanel';
import { InspectPanel } from './ui/InspectPanel';
import { Glossary } from './ui/Glossary';
import { useSim } from './state/store';

function Legend() {
  return (
    <div className="legend">
      <span><i className="swatch data" /> data bus</span>
      <span><i className="swatch ctrl" /> control</span>
      <span><i className="swatch active" /> active unit</span>
      <span><i className="swatch idle" /> idle</span>
    </div>
  );
}

export default function App() {
  const running = useSim((s) => s.running);
  const speedHz = useSim((s) => s.speedHz);
  const step = useSim((s) => s.step);
  const [glossary, setGlossary] = useState(false);

  // The clock. While running, fire step() at the chosen frequency.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(step, 1000 / speedHz);
    return () => clearInterval(id);
  }, [running, speedHz, step]);

  return (
    <div className="app">
      <header className="topbar">
        <div className="title">RV32I <span>visual datapath</span></div>
        <div className="sub-title">single-cycle RISC-V, engine-accurate</div>
        <span className="spacer" />
        <button className="btn" onClick={() => setGlossary(true)}>Glossary</button>
      </header>

      <aside className="left">
        <Editor />
        <Controls />
      </aside>

      <main className="stage">
        <Scene />
        <Legend />
      </main>

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
