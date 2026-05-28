import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Datapath } from './Datapath';
import { useSim } from '../state/store';

export function Scene() {
  const select = useSim((s) => s.select);

  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [-1, 7, 17], fov: 46 }}
      onPointerMissed={() => select(null)}
    >
      <color attach="background" args={['#070a12']} />
      <fog attach="fog" args={['#070a12', 20, 46]} />

      <ambientLight intensity={0.75} />
      <directionalLight position={[7, 13, 9]} intensity={0.85} />
      <pointLight position={[-9, 6, -6]} intensity={0.5} color="#2dd4bf" />

      <gridHelper args={[80, 80, '#1b2740', '#0e1626']} position={[0, -1.3, 0]} />

      <Datapath />

      <OrbitControls makeDefault enablePan target={[-1, 0, 0]} minDistance={6} maxDistance={44} />
    </Canvas>
  );
}
