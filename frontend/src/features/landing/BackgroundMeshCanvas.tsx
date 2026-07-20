import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function ParticleStarfield() {
  const count = 1000;
  const meshRef = useRef<THREE.Points>(null!);

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const colorChoices = [
      new THREE.Color('#6f4e37'), // Warm Coffee
      new THREE.Color('#d5bdaf'), // Coffee Medium / Cream
      new THREE.Color('#b45309'), // Warm Amber
      new THREE.Color('#9b5a68')  // Warm Terracotta
    ];

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 40;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 40;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 30;

      const chosen = colorChoices[Math.floor(Math.random() * colorChoices.length)];
      col[i * 3] = chosen.r;
      col[i * 3 + 1] = chosen.g;
      col[i * 3 + 2] = chosen.b;
    }
    return [pos, col];
  }, [count]);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.02;
      meshRef.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.15) * 0.04;
    }
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        vertexColors
        transparent
        opacity={0.45}
        sizeAttenuation
      />
    </points>
  );
}

function GlowingOrbs() {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(t * 0.4) * 0.4;
      groupRef.current.rotation.z = t * 0.015;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Orb 1: Warm Coffee */}
      <mesh position={[-6, 4, -8]}>
        <sphereGeometry args={[3.5, 32, 32]} />
        <meshBasicMaterial color="#6f4e37" transparent opacity={0.06} />
      </mesh>

      {/* Orb 2: Cream Coffee */}
      <mesh position={[7, -5, -10]}>
        <sphereGeometry args={[4.5, 32, 32]} />
        <meshBasicMaterial color="#d5bdaf" transparent opacity={0.08} />
      </mesh>

      {/* Orb 3: Terracotta */}
      <mesh position={[0, -2, -12]}>
        <sphereGeometry args={[5.5, 32, 32]} />
        <meshBasicMaterial color="#9b5a68" transparent opacity={0.05} />
      </mesh>
    </group>
  );
}

export default function BackgroundMeshCanvas() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      <Canvas
        camera={{ position: [0, 0, 15], fov: 60 }}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        dpr={[1, 1.5]}
      >
        <ambientLight intensity={0.8} />
        <ParticleStarfield />
        <GlowingOrbs />
      </Canvas>
    </div>
  );
}
