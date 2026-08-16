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

type Point3 = [number, number, number]

const WING_PARTS = new Set(['wing', 'front-spar', 'rear-spar', 'rib', 'stringer'])

function SurfaceMaterial({ active, base = '#d9dde2', danger = false, opacity = 1 }: { active: boolean; base?: string; danger?: boolean; opacity?: number }) {
  return (
    <meshStandardMaterial
      color={danger ? '#ef4444' : active ? '#38bdf8' : base}
      metalness={0.22}
      roughness={0.46}
      emissive={active ? '#0b3550' : danger ? '#451010' : '#000000'}
      emissiveIntensity={active || danger ? 0.7 : 0}
      transparent={opacity < 1}
      opacity={opacity}
      depthWrite={opacity > 0.45}
    />
  )
}

function createFuselageGeometry() {
  const stations = [
    { x: -27.2, r: 0.18, cy: 0.7 },
    { x: -26.2, r: 0.72, cy: 0.62 },
    { x: -24.6, r: 1.55, cy: 0.48 },
    { x: -22.4, r: 2.2, cy: 0.3 },
    { x: -18.8, r: 2.52, cy: 0.12 },
    { x: -11.0, r: 2.63, cy: 0 },
    { x: 8.0, r: 2.64, cy: 0 },
    { x: 15.8, r: 2.6, cy: 0 },
    { x: 20.1, r: 2.3, cy: 0.02 },
    { x: 23.4, r: 1.65, cy: 0.04 },
    { x: 25.6, r: 0.78, cy: 0.05 },
    { x: 27.0, r: 0.12, cy: 0.05 },
  ]
  const radial = 56
  const vertices: number[] = []
  const indices: number[] = []

  stations.forEach((station) => {
    for (let i = 0; i < radial; i++) {
      const a = (i / radial) * Math.PI * 2
      vertices.push(station.x, station.cy + Math.cos(a) * station.r, Math.sin(a) * station.r)
    }
  })

  for (let s = 0; s < stations.length - 1; s++) {
    for (let i = 0; i < radial; i++) {
      const next = (i + 1) % radial
      const a = s * radial + i
      const b = s * radial + next
      const c = (s + 1) * radial + next
      const d = (s + 1) * radial + i
      indices.push(a, b, d, b, c, d)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function createPlanformGeometry(points: Array<[number, number]>, thickness: number) {
  const shape = new THREE.Shape()
  shape.moveTo(points[0][0], points[0][1])
  points.slice(1).forEach(([x, span]) => shape.lineTo(x, span))
  shape.closePath()
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelSize: 0.055,
    bevelThickness: 0.045,
    bevelSegments: 2,
  })
  geometry.rotateX(Math.PI / 2)
  return geometry
}

function Beam({ start, end, thickness, color, active, onClick }: { start: Point3; end: Point3; thickness: number; color: string; active: boolean; onClick: () => void }) {
  const { midpoint, length, quaternion } = useMemo(() => {
    const a = new THREE.Vector3(...start)
    const b = new THREE.Vector3(...end)
    const direction = b.clone().sub(a)
    const midpoint = a.clone().add(b).multiplyScalar(0.5)
    return {
      midpoint,
      length: direction.length(),
      quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize()),
    }
  }, [start, end])

  return (
    <mesh position={midpoint} quaternion={quaternion} castShadow onClick={(e) => { e.stopPropagation(); onClick() }}>
      <boxGeometry args={[thickness, length, thickness]} />
      <meshStandardMaterial color={active ? '#38bdf8' : color} metalness={0.42} roughness={0.36} emissive={active ? '#0b3550' : '#000000'} emissiveIntensity={active ? 1 : 0} />
    </mesh>
  )
}

function WingShell({ side, active, damaged, cutaway, onSelect }: { side: 1 | -1; active: boolean; damaged: boolean; cutaway: boolean; onSelect: () => void }) {
  const geometry = useMemo(() => createPlanformGeometry([
    [7.0, 2.1], [5.2, 7.0], [2.1, 14.5], [-1.5, 22.0], [-4.8, 29.5], [-6.2, 34.0], [-7.4, 35.3],
    [-8.1, 33.7], [-7.5, 29.0], [-6.4, 21.5], [-5.7, 14.0], [-5.9, 7.0], [-6.6, 2.1],
  ], 0.34), [])

  return (
    <mesh geometry={geometry} position={[0, 0.17, 0]} scale={[1, 1, side]} castShadow receiveShadow onClick={(e) => { e.stopPropagation(); onSelect() }}>
      <SurfaceMaterial active={active} base="#aeb6bf" danger={damaged} opacity={cutaway ? 0.14 : 1} />
    </mesh>
  )
}

function WingStructure({ selected, onSelect }: { selected: string; onSelect: (part: string) => void }) {
  const y = 0.25
  const zRoot = 3.0
  const zTip = 31.5
  const frontRoot: Point3 = [5.0, y, zRoot]
  const frontTip: Point3 = [-5.65, y, zTip]
  const rearRoot: Point3 = [-4.5, y, zRoot]
  const rearTip: Point3 = [-6.9, y, zTip]
  const ribs = Array.from({ length: 14 }, (_, i) => {
    const t = (i + 1) / 15
    return {
      z: THREE.MathUtils.lerp(zRoot, zTip, t),
      frontX: THREE.MathUtils.lerp(frontRoot[0], frontTip[0], t),
      rearX: THREE.MathUtils.lerp(rearRoot[0], rearTip[0], t),
      i,
    }
  })

  return (
    <group>
      <Beam start={frontRoot} end={frontTip} thickness={0.28} color="#d6a94c" active={selected === 'front-spar'} onClick={() => onSelect('front-spar')} />
      <Beam start={rearRoot} end={rearTip} thickness={0.28} color="#d6a94c" active={selected === 'rear-spar'} onClick={() => onSelect('rear-spar')} />
      {ribs.map(({ z, frontX, rearX, i }) => <Beam key={`rib-${i}`} start={[frontX, y, z]} end={[rearX, y, z]} thickness={0.12} color="#79a7ba" active={selected === 'rib'} onClick={() => onSelect('rib')} />)}
      {[0.16, 0.3, 0.44, 0.58, 0.72, 0.86].map((fraction, i) => (
        <Beam key={`str-${i}`} start={[THREE.MathUtils.lerp(frontRoot[0], rearRoot[0], fraction), y + 0.12, zRoot]} end={[THREE.MathUtils.lerp(frontTip[0], rearTip[0], fraction), y + 0.12, zTip]} thickness={0.075} color="#85b878" active={selected === 'stringer'} onClick={() => onSelect('stringer')} />
      ))}
    </group>
  )
}

function Engine({ side, active, onSelect }: { side: 1 | -1; active: boolean; onSelect: () => void }) {
  const z = side * 12.2
  return (
    <group position={[3.8, -2.55, z]} onClick={(e) => { e.stopPropagation(); onSelect() }}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[1.92, 2.22, 6.7, 64]} />
        <SurfaceMaterial active={active} base="#c7ccd1" />
      </mesh>
      <mesh position={[3.45, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[2.24, 2.24, 0.34, 64]} />
        <meshStandardMaterial color="#30363d" metalness={0.62} roughness={0.26} />
      </mesh>
      <mesh position={[3.63, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <circleGeometry args={[1.7, 48]} />
        <meshStandardMaterial color="#20262d" metalness={0.78} roughness={0.26} />
      </mesh>
      <mesh position={[-2.9, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[1.15, 1.4, 0.9, 48]} />
        <meshStandardMaterial color="#7f8993" metalness={0.48} roughness={0.38} />
      </mesh>
      <mesh position={[-0.5, 1.4, 0]} rotation={[0, 0, -0.35]} castShadow>
        <boxGeometry args={[2.5, 0.48, 0.9]} />
        <meshStandardMaterial color="#8d97a0" metalness={0.42} roughness={0.38} />
      </mesh>
    </group>
  )
}

function HorizontalTail({ side, active, onSelect }: { side: 1 | -1; active: boolean; onSelect: () => void }) {
  const geometry = useMemo(() => createPlanformGeometry([
    [-17.8, 1.8], [-19.7, 5.0], [-22.1, 9.2], [-23.9, 11.4], [-24.8, 11.8], [-25.4, 10.7], [-25.0, 6.0], [-24.8, 1.8],
  ], 0.28), [])
  return (
    <mesh geometry={geometry} position={[0, 0.3, 0]} scale={[1, 1, side]} castShadow onClick={(e) => { e.stopPropagation(); onSelect() }}>
      <SurfaceMaterial active={active} base="#aab2ba" />
    </mesh>
  )
}

function VerticalTail({ active, onSelect }: { active: boolean; onSelect: () => void }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-22.0, 1.6)
    shape.lineTo(-23.2, 5.3)
    shape.lineTo(-24.4, 9.2)
    shape.lineTo(-25.7, 10.5)
    shape.lineTo(-27.0, 2.2)
    shape.closePath()
    return new THREE.ExtrudeGeometry(shape, { depth: 0.34, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.035, bevelSegments: 2 })
  }, [])
  return (
    <mesh geometry={geometry} position={[0, 0, -0.17]} castShadow onClick={(e) => { e.stopPropagation(); onSelect() }}>
      <SurfaceMaterial active={active} base="#aab2ba" />
    </mesh>
  )
}

function Aircraft({ selected, onSelect, damaged }: Props) {
  const [hover, setHover] = useState<string | null>(null)
  const active = (part: string) => selected === part || hover === part
  const wingCutaway = WING_PARTS.has(selected) && selected !== 'fuselage'
  const fuselageGeometry = useMemo(() => createFuselageGeometry(), [])

  return (
    <group rotation={[0, -0.08, 0]}>
      <group onPointerOver={(e) => { e.stopPropagation(); setHover('fuselage') }} onPointerOut={() => setHover(null)} onClick={(e) => { e.stopPropagation(); onSelect('fuselage') }}>
        <mesh geometry={fuselageGeometry} castShadow receiveShadow><SurfaceMaterial active={active('fuselage')} base="#e2e5e8" /></mesh>
        <mesh position={[-2.0, -1.1, 0]} scale={[5.8, 1.0, 3.3]}><sphereGeometry args={[1, 32, 18]} /><meshStandardMaterial color="#b9c0c7" metalness={0.2} roughness={0.5} /></mesh>
      </group>

      <group onPointerOver={() => setHover('wing')} onPointerOut={() => setHover(null)}>
        <WingShell side={1} active={active('wing')} damaged={damaged} cutaway={wingCutaway} onSelect={() => onSelect('wing')} />
        <WingShell side={-1} active={active('wing')} damaged={damaged} cutaway={false} onSelect={() => onSelect('wing')} />
      </group>
      {wingCutaway && <WingStructure selected={selected} onSelect={onSelect} />}

      <group onPointerOver={() => setHover('engine')} onPointerOut={() => setHover(null)}>
        <Engine side={1} active={active('engine')} onSelect={() => onSelect('engine')} />
        <Engine side={-1} active={active('engine')} onSelect={() => onSelect('engine')} />
      </group>

      <group onPointerOver={() => setHover('tail')} onPointerOut={() => setHover(null)}>
        <HorizontalTail side={1} active={active('tail')} onSelect={() => onSelect('tail')} />
        <HorizontalTail side={-1} active={active('tail')} onSelect={() => onSelect('tail')} />
        <VerticalTail active={active('tail')} onSelect={() => onSelect('tail')} />
      </group>

      {damaged && wingCutaway && <mesh position={[-0.6, 0.55, 14.5]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.95, 0.13, 18, 48]} /><meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={3} /></mesh>}
    </group>
  )
}

export default function AircraftScene(props: Props) {
  return (
    <Canvas camera={{ position: [8, 51, 36], fov: 36 }} shadows dpr={[1, 1.7]}>
      <color attach="background" args={['#071019']} />
      <fog attach="fog" args={['#071019', 62, 120]} />
      <ambientLight intensity={1.0} />
      <directionalLight position={[18, 30, 16]} intensity={3.2} castShadow />
      <directionalLight position={[-18, 14, -16]} intensity={1.1} />
      <Aircraft {...props} />
      <Grid position={[0, -4.3, 0]} args={[150, 150]} cellSize={2} sectionSize={10} fadeDistance={100} fadeStrength={1.7} />
      <OrbitControls makeDefault enablePan minDistance={22} maxDistance={95} target={[0, 0, 0]} />
    </Canvas>
  )
}
