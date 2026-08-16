'use client'

import { Canvas } from '@react-three/fiber'
import { Grid, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { useMemo, useState } from 'react'

type Props = {
  selected: string
  onSelect: (part: string) => void
  damaged: boolean
}

function PartMaterial({ active, danger = false }: { active: boolean; danger?: boolean }) {
  return (
    <meshStandardMaterial
      color={danger ? '#ef4444' : active ? '#38bdf8' : '#d8e2ea'}
      metalness={0.55}
      roughness={0.38}
      emissive={active ? '#0b3550' : danger ? '#451010' : '#000000'}
      emissiveIntensity={active || danger ? 0.8 : 0}
    />
  )
}

function Wing({ side, active, damaged, onSelect }: { side: 1 | -1; active: boolean; damaged: boolean; onSelect: () => void }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(2.7, 0.8)
    shape.lineTo(0.4, 14.5)
    shape.lineTo(-1.5, 14.5)
    shape.lineTo(-2.7, 0.8)
    shape.closePath()
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.22, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.05, bevelSegments: 2 })
    g.rotateX(Math.PI / 2)
    g.center()
    return g
  }, [])

  return (
    <mesh geometry={geometry} position={[0, -0.2, side * 7.2]} scale={[1, 1, side]} castShadow receiveShadow onClick={(e) => { e.stopPropagation(); onSelect() }}>
      <PartMaterial active={active} danger={damaged} />
    </mesh>
  )
}

function Engine({ side, active, onSelect }: { side: 1 | -1; active: boolean; onSelect: () => void }) {
  return (
    <group position={[1.3, -1.7, side * 6.2]} rotation={[0, 0, Math.PI / 2]} onClick={(e) => { e.stopPropagation(); onSelect() }}>
      <mesh castShadow>
        <cylinderGeometry args={[1.15, 1.45, 4.1, 48]} />
        <PartMaterial active={active} />
      </mesh>
      <mesh position={[0, 2.05, 0]}>
        <torusGeometry args={[0.95, 0.12, 16, 48]} />
        <meshStandardMaterial color="#151a21" metalness={0.8} roughness={0.25} />
      </mesh>
    </group>
  )
}

function Aircraft({ selected, onSelect, damaged }: Props) {
  const [hover, setHover] = useState<string | null>(null)
  const active = (part: string) => selected === part || hover === part

  return (
    <group rotation={[0, -0.13, 0]} position={[0, 0.2, 0]}>
      <group onPointerOver={(e) => { e.stopPropagation(); setHover('fuselage') }} onPointerOut={() => setHover(null)} onClick={(e) => { e.stopPropagation(); onSelect('fuselage') }}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <capsuleGeometry args={[1.65, 22, 10, 32]} />
          <PartMaterial active={active('fuselage')} />
        </mesh>
        <mesh position={[12.2, 0, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
          <coneGeometry args={[1.62, 4.3, 32]} />
          <PartMaterial active={active('fuselage')} />
        </mesh>
      </group>

      <group onPointerOver={() => setHover('wing')} onPointerOut={() => setHover(null)}>
        <Wing side={1} active={active('wing')} damaged={damaged} onSelect={() => onSelect('wing')} />
        <Wing side={-1} active={active('wing')} damaged={damaged} onSelect={() => onSelect('wing')} />
      </group>

      <group onPointerOver={() => setHover('engine')} onPointerOut={() => setHover(null)}>
        <Engine side={1} active={active('engine')} onSelect={() => onSelect('engine')} />
        <Engine side={-1} active={active('engine')} onSelect={() => onSelect('engine')} />
      </group>

      <group onPointerOver={() => setHover('tail')} onPointerOut={() => setHover(null)} onClick={(e) => { e.stopPropagation(); onSelect('tail') }}>
        <mesh position={[-10.3, 2.0, 0]} rotation={[0, 0, -0.12]} castShadow>
          <boxGeometry args={[4.6, 0.25, 11.5]} />
          <PartMaterial active={active('tail')} />
        </mesh>
        <mesh position={[-10.4, 2.8, 0]} rotation={[0, 0, -0.22]} castShadow>
          <boxGeometry args={[4.5, 5.7, 0.28]} />
          <PartMaterial active={active('tail')} />
        </mesh>
      </group>

      {damaged && (
        <mesh position={[0.7, 0.2, 9.0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.8, 0.12, 16, 48]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={3} />
        </mesh>
      )}
    </group>
  )
}

export default function AircraftScene(props: Props) {
  return (
    <Canvas camera={{ position: [25, 16, 29], fov: 42 }} shadows dpr={[1, 1.7]}>
      <color attach="background" args={['#071019']} />
      <fog attach="fog" args={['#071019', 38, 75]} />
      <ambientLight intensity={0.8} />
      <directionalLight position={[14, 20, 12]} intensity={3.5} castShadow />
      <Aircraft {...props} />
      <Grid position={[0, -3.2, 0]} args={[80, 80]} cellSize={2} sectionSize={10} fadeDistance={55} fadeStrength={1.5} />
      <OrbitControls makeDefault enablePan minDistance={15} maxDistance={60} target={[0, 0, 0]} />
    </Canvas>
  )
}
