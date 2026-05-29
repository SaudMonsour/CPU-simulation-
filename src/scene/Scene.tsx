import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Datapath } from './Datapath';
import { PipelineZones } from './PipelineZones';
import { useSim } from '../state/store';

// Per-stage point lights give each zone its own colour halo — the closest thing
// to bloom without the postprocessing dependency.
function StageLights() {
  return (
    <>
      {/* IF — blue */}
      <pointLight position={[-10, 4.5, 1]}  intensity={18} color="#3b82f6" distance={13} decay={2} />
      {/* ID — green */}
      <pointLight position={[-4,  4.5, 1]}  intensity={16} color="#10b981" distance={14} decay={2} />
      {/* EX — red */}
      <pointLight position={[1.5, 4.5, 1]}  intensity={20} color="#ef4444" distance={12} decay={2} />
      {/* MEM — purple */}
      <pointLight position={[6.5, 4.5, 1]}  intensity={16} color="#8b5cf6" distance={12} decay={2} />
      {/* WB — cyan */}
      <pointLight position={[11,  4.5, 1]}  intensity={16} color="#22d3ee" distance={10} decay={2} />
      {/* Top fill — warm white */}
      <pointLight position={[0,   10,  0]}  intensity={5}  color="#c8d8ff" distance={40} decay={2} />
    </>
  );
}

export function Scene() {
  const select = useSim((s) => s.select);

  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 14, 26], fov: 48 }}
      shadows
      gl={{ antialias: true, alpha: false, toneMappingExposure: 1.2 }}
      onPointerMissed={() => select(null)}
    >
      <color attach="background" args={['#040710']} />
      <fog attach="fog" args={['#040710', 32, 65]} />

      {/* Very dark ambient — emissive does the heavy lifting */}
      <ambientLight intensity={0.25} color="#8090c0" />

      {/* Top-right key light */}
      <directionalLight
        position={[8, 20, 14]}
        intensity={0.5}
        color="#c8d8ff"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />

      {/* Per-stage accent halos */}
      <StageLights />

      {/* PCB floor grid */}
      <gridHelper
        args={[90, 90, '#0d1c30', '#081525']}
        position={[0, -0.44, 0]}
      />

      {/* Pipeline stage zones + pipeline register latches */}
      <PipelineZones />

      {/* CPU units + animated data buses */}
      <Datapath />

      <OrbitControls
        makeDefault
        enablePan
        target={[0, 0.5, 0]}
        minDistance={7}
        maxDistance={60}
        maxPolarAngle={Math.PI / 2.05}
      />
    </Canvas>
  );
}
