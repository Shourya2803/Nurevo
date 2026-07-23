import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { RoundedBox, Float } from '@react-three/drei';
import * as THREE from 'three';

// 1. OCR Scanning Document
function OCRScene() {
  const laserRef = useRef<THREE.Mesh>(null!);
  const docRef = useRef<THREE.Group>(null!);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (laserRef.current) {
      laserRef.current.position.y = Math.sin(t * 2.5) * 0.9;
    }
    if (docRef.current) {
      docRef.current.rotation.y = Math.sin(t * 0.5) * 0.2;
    }
  });

  return (
    <group ref={docRef}>
      <RoundedBox args={[1.6, 2.2, 0.08]} radius={0.06}>
        <meshPhysicalMaterial color="#5a3f2d" roughness={0.3} metalness={0.2} />
      </RoundedBox>
      <mesh ref={laserRef} position={[0, 0, 0.06]}>
        <boxGeometry args={[1.8, 0.06, 0.02]} />
        <meshBasicMaterial color="#b45309" />
      </mesh>
    </group>
  );
}

// 2. AI Semantic Search
function SearchScene() {
  const beamRef = useRef<THREE.Group>(null!);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (beamRef.current) {
      beamRef.current.rotation.z = t * 1.2;
      beamRef.current.position.x = Math.sin(t) * 0.4;
    }
  });

  return (
    <group>
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial color="#6f4e37" wireframe />
      </mesh>
      <group ref={beamRef}>
        <mesh position={[0.8, 0, 0]}>
          <ringGeometry args={[0.3, 0.4, 32]} />
          <meshBasicMaterial color="#b45309" side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}

// 3. Workflow Automation
function WorkflowScene() {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.8;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh position={[-0.8, 0, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color="#6f4e37" emissive="#4f3824" />
      </mesh>
      <mesh position={[0.8, 0.5, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color="#b45309" emissive="#78350f" />
      </mesh>
      <mesh position={[0.4, -0.6, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color="#9b5a68" emissive="#6f4e37" />
      </mesh>
    </group>
  );
}

// 4. Version History
function VersionScene() {
  const stackRef = useRef<THREE.Group>(null!);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (stackRef.current) {
      stackRef.current.rotation.y = t * 0.5;
    }
  });

  return (
    <group ref={stackRef}>
      <RoundedBox position={[0, -0.4, 0]} args={[1.5, 1.8, 0.06]} radius={0.04}>
        <meshPhysicalMaterial color="#483224" opacity={0.6} transparent />
      </RoundedBox>
      <RoundedBox position={[0, 0, 0.2]} args={[1.5, 1.8, 0.06]} radius={0.04}>
        <meshPhysicalMaterial color="#5a3f2d" opacity={0.8} transparent />
      </RoundedBox>
      <RoundedBox position={[0, 0.4, 0.4]} args={[1.5, 1.8, 0.06]} radius={0.04}>
        <meshPhysicalMaterial color="#6f4e37" />
      </RoundedBox>
    </group>
  );
}

// 5. Security Vault Shield
function SecurityScene() {
  const shieldRef = useRef<THREE.Group>(null!);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (shieldRef.current) {
      shieldRef.current.rotation.y = Math.sin(t) * 0.4;
    }
  });

  return (
    <group ref={shieldRef}>
      <mesh>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#6f4e37" emissive="#4f3824" wireframe />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshBasicMaterial color="#b45309" />
      </mesh>
    </group>
  );
}

// 6. Cloud Sync
function CloudScene() {
  const cloudRef = useRef<THREE.Group>(null!);

  useFrame((_, delta) => {
    if (cloudRef.current) {
      cloudRef.current.rotation.y += delta * 0.6;
    }
  });

  return (
    <group ref={cloudRef}>
      <mesh position={[0, 0, 0]}>
        <torusGeometry args={[0.8, 0.2, 16, 32]} />
        <meshStandardMaterial color="#b45309" emissive="#78350f" />
      </mesh>
      <Float speed={3} floatIntensity={1}>
        <mesh position={[0, 0.8, 0]}>
          <boxGeometry args={[0.2, 0.3, 0.02]} />
          <meshBasicMaterial color="#6f4e37" />
        </mesh>
      </Float>
    </group>
  );
}

export default function Feature3DCanvas({ type }: { type: 'ocr' | 'search' | 'workflow' | 'version' | 'security' | 'cloud' }) {
  return (
    <div className="w-full h-36 relative overflow-hidden rounded-2xl bg-amber-50/50">
      <Canvas
        camera={{ position: [0, 0, 4.2], fov: 45 }}
        gl={{ alpha: true, antialias: true }}
        dpr={[1, 1.5]}
      >
        <ambientLight intensity={1.2} />
        <pointLight position={[5, 5, 5]} intensity={1.5} color="#b45309" />
        
        {type === 'ocr' && <OCRScene />}
        {type === 'search' && <SearchScene />}
        {type === 'workflow' && <WorkflowScene />}
        {type === 'version' && <VersionScene />}
        {type === 'security' && <SecurityScene />}
        {type === 'cloud' && <CloudScene />}
      </Canvas>
    </div>
  );
}
