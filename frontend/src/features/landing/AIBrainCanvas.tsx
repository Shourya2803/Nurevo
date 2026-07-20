import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function ParticleBrainSphere() {
  const count = 800;
  const pointsRef = useRef<THREE.Points>(null!);

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 2.2 + Math.sin(theta * 4) * 0.2 + Math.cos(phi * 4) * 0.2;

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);

      const isCoffee = Math.random() > 0.5;
      col[i * 3] = isCoffee ? 0.43 : 0.7;     // R
      col[i * 3 + 1] = isCoffee ? 0.3 : 0.32;   // G
      col[i * 3 + 2] = isCoffee ? 0.21 : 0.03;  // B
    }

    return [pos, col];
  }, [count]);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.2;
      pointsRef.current.rotation.x = Math.sin(t * 0.3) * 0.1;
    }
  });

  return (
    <group>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.08}
          vertexColors
          transparent
          opacity={0.8}
        />
      </points>

      {/* Inner Glowing Warm Core */}
      <mesh>
        <sphereGeometry args={[1.2, 32, 32]} />
        <meshBasicMaterial color="#6f4e37" transparent opacity={0.2} wireframe />
      </mesh>
    </group>
  );
}

export default function AIBrainCanvas() {
  return (
    <div className="w-full h-[400px] sm:h-[480px] relative">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 50 }}
        gl={{ alpha: true, antialias: true }}
        dpr={[1, 1.5]}
      >
        <ambientLight intensity={1.2} />
        <pointLight position={[5, 5, 5]} intensity={2} color="#b45309" />
        <ParticleBrainSphere />
      </Canvas>
    </div>
  );
}
