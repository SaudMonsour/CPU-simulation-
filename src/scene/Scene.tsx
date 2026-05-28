import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Datapath } from './Datapath';
import { PipelineZones } from './PipelineZones';
import { useSim } from '../state/store';

// Fake bloom via carefully-tuned point lights per stage.
// Each stage colour-matches its unit, creating visible halos on the dark background.
function StageLights() {
  return (
    <>
      {/* IF — blue */}
      <pointLight position={[-11, 3.5, 0]} intensity={8}  color="#3b82f6" distance={10} decay={2} />
      {/* ID — green */}
      <pointLight position={[-4,  3.5, 0]} intensity={7}  color="#10b981" distance={11} decay={2} />
      {/* EX — red */}
      <pointLight position={[1.5, 3.5, 0]} intensity={9}  color="#ef4444" distance={9}  decay={2} />
      {/* MEM — purple */}
      <pointLight position={[6.5, 3.5, 0]} intensity={7}  color="#8b5cf6" distance={9}  decay={2} />
      {/* WB — cyan */}
      <pointLight position={[11,  3.5, 0]} intensity={7}  color="#22d3ee" distance={8}  decay={2} />
    </>
  );
}

export function Scene() {
  const select = useSim((s) => s.select);

  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 13, 28], fov: 46 }}
      shadows
      gl={{ antialias: true, alpha: false }}
      onPointerMissed={() => select(null)}
    >
      <color attach="background" args={['#050810']} />
      <fog attach="fog" args={['#050810', 28, 60]} />

      {/* Ambient fill — keep dark for contrast */}
      <ambientLight intensity={0.2} />

      {/* Key directional light */}
      <directionalLight
        position={[5, 18, 12]}
        intensity={0.65}
        color="#c8d8ff"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />

      {/* Per-stage accent point lights */}
      <StageLights />

      {/* Floor grid */}
      <gridHelper
        args={[80, 80, '#0f1e35', '#0a1528']}
        position={[0, -0.44, 0]}
      />

      {/* Pipeline stage zone backgrounds + latch dividers */}
      <PipelineZones />

      {/* All CPU blocks + animated buses */}
      <Datapath />

      <OrbitControls
        makeDefault
        enablePan
        target={[0, 0, 0]}
        minDistance={8}
        maxDistance={55}
        maxPolarAngle={Math.PI / 2.1}
      />
    </Canvas>
  );
}
