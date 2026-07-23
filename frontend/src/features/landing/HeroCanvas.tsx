import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

// 3D Floating Document Sheet Component in Warm Coffee Theme
function FloatingDocumentCard({ position, rotation, color = '#6f4e37' }: { position: [number, number, number]; rotation: [number, number, number]; color?: string }) {
  const cardRef = useRef<THREE.Group>(null!);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (cardRef.current) {
      cardRef.current.position.y += Math.sin(t * 1.5 + position[0]) * 0.003;
      cardRef.current.rotation.z += Math.cos(t * 1.2 + position[1]) * 0.002;
    }
  });

  return (
    <group ref={cardRef} position={position} rotation={rotation}>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
        {/* Document Sheet Body */}
        <RoundedBox args={[1.8, 2.4, 0.08]} radius={0.08} smoothness={4}>
          <meshPhysicalMaterial
            color={color}
            metalness={0.1}
            roughness={0.2}
            transmission={0.4}
            thickness={0.5}
            transparent
            opacity={0.9}
            clearcoat={1}
            clearcoatRoughness={0.1}
          />
        </RoundedBox>

        {/* Text / Code Lines Mockup on Document */}
        <mesh position={[0, 0.6, 0.05]}>
          <planeGeometry args={[1.2, 0.15]} />
          <meshBasicMaterial color="#ffffff" opacity={0.95} transparent />
        </mesh>
        <mesh position={[-0.2, 0.3, 0.05]}>
          <planeGeometry args={[0.8, 0.08]} />
          <meshBasicMaterial color="#d5bdaf" opacity={0.8} transparent />
        </mesh>
        <mesh position={[-0.1, 0.05, 0.05]}>
          <planeGeometry args={[1.0, 0.08]} />
          <meshBasicMaterial color="#d5bdaf" opacity={0.7} transparent />
        </mesh>
        <mesh position={[-0.3, -0.2, 0.05]}>
          <planeGeometry args={[0.6, 0.08]} />
          <meshBasicMaterial color="#b45309" opacity={0.9} transparent />
        </mesh>

        {/* Floating Badge / AI Node Dot */}
        <mesh position={[0.6, 0.9, 0.06]}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshBasicMaterial color="#d97706" />
        </mesh>
      </Float>
    </group>
  );
}

// 3D AI Core Sphere with Holographic Warm Rings
function AICoreSphere() {
  const coreRef = useRef<THREE.Mesh>(null!);
  const ring1Ref = useRef<THREE.Mesh>(null!);
  const ring2Ref = useRef<THREE.Mesh>(null!);
  const ring3Ref = useRef<THREE.Mesh>(null!);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    if (coreRef.current) {
      coreRef.current.rotation.y += delta * 0.4;
      coreRef.current.rotation.x = Math.sin(t * 0.5) * 0.2;
    }
    if (ring1Ref.current) ring1Ref.current.rotation.z += delta * 0.5;
    if (ring2Ref.current) ring2Ref.current.rotation.x += delta * 0.6;
    if (ring3Ref.current) ring3Ref.current.rotation.y += delta * 0.7;
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Glowing Warm Inner Core */}
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[1.1, 2]} />
        <meshStandardMaterial
          color="#6f4e37"
          emissive="#5a3f2d"
          emissiveIntensity={1.2}
          wireframe
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Holographic Orbit Rings */}
      <mesh ref={ring1Ref}>
        <torusGeometry args={[1.8, 0.02, 16, 100]} />
        <meshBasicMaterial color="#b45309" transparent opacity={0.7} />
      </mesh>

      <mesh ref={ring2Ref} rotation={[Math.PI / 4, 0, 0]}>
        <torusGeometry args={[2.2, 0.025, 16, 100]} />
        <meshBasicMaterial color="#6f4e37" transparent opacity={0.6} />
      </mesh>

      <mesh ref={ring3Ref} rotation={[0, Math.PI / 3, Math.PI / 6]}>
        <torusGeometry args={[2.6, 0.02, 16, 100]} />
        <meshBasicMaterial color="#d5bdaf" transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

// Connected Beam Lines between Core and Floating Documents
function NeuralConnections() {
  const lineRef = useRef<THREE.LineSegments>(null!);

  const geometry = useMemo(() => {
    const points: number[] = [];
    const targets: [number, number, number][] = [
      [-2.4, 1.8, 1],
      [2.5, 1.5, -0.5],
      [-2.8, -1.6, -1],
      [2.2, -1.8, 0.8],
      [0, 2.8, -1.5]
    ];

    targets.forEach((t) => {
      points.push(0, 0, 0);
      points.push(t[0], t[1], t[2]);
    });

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    return geom;
  }, []);

  useFrame((state) => {
    if (lineRef.current) {
      const mat = lineRef.current.material as THREE.LineBasicMaterial;
      mat.opacity = 0.35 + Math.sin(state.clock.getElapsedTime() * 3) * 0.2;
    }
  });

  return (
    <lineSegments ref={lineRef} geometry={geometry}>
      <lineBasicMaterial color="#b45309" transparent opacity={0.5} linewidth={1.5} />
    </lineSegments>
  );
}

// Scene Container with Mouse Parallax Camera Tracking
function SceneContent() {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame((state) => {
    const { x, y } = state.pointer;
    if (groupRef.current) {
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, x * 0.25, 0.05);
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, -y * 0.25, 0.05);
    }
  });

  return (
    <group ref={groupRef}>
      <AICoreSphere />
      <NeuralConnections />
      <FloatingDocumentCard position={[-2.4, 1.8, 1]} rotation={[0.2, 0.4, -0.1]} color="#6f4e37" />
      <FloatingDocumentCard position={[2.5, 1.5, -0.5]} rotation={[-0.1, -0.3, 0.1]} color="#5a3f2d" />
      <FloatingDocumentCard position={[-2.8, -1.6, -1]} rotation={[0.3, -0.2, 0.2]} color="#9b5a68" />
      <FloatingDocumentCard position={[2.2, -1.8, 0.8]} rotation={[-0.2, 0.3, -0.1]} color="#483224" />
      <FloatingDocumentCard position={[0, 2.8, -1.5]} rotation={[0.4, 0, 0]} color="#6f4e37" />
    </group>
  );
}

export default function HeroCanvas() {
  return (
    <div className="w-full h-[520px] sm:h-[620px] relative">
      <Canvas
        camera={{ position: [0, 0, 7.5], fov: 50 }}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        dpr={[1, 1.5]}
      >
        <ambientLight intensity={1.2} />
        <pointLight position={[10, 10, 10]} intensity={1.8} color="#b45309" />
        <pointLight position={[-10, -10, -10]} intensity={1.2} color="#6f4e37" />
        <directionalLight position={[0, 5, 5]} intensity={1} />
        
        <SceneContent />
      </Canvas>
    </div>
  );
}
