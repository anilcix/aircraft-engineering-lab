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

const WING_PARTS = new Set([
  'wing',
  'front-spar',
  'rear-spar',
  'rib',
  'stringer',
  'side-of-body-rib',
  'tank-end-rib',
  'wing-center-section',
  'landing-gear-beam',
  'leading-edge-slat',
  'spoiler',
  'flap',
  'flaperon',
  'aileron',
])

function PartMaterial({ active, danger = false, opacity = 1 }: { active: boolean; danger?: boolean; opacity?: number }) {
  return (
    <meshStandardMaterial
      color={danger ? '#ef4444' : active ? '#38bdf8' : '#dce6ee'}
      metalness={0.38}
      roughness={0.42}
      emissive={active ? '#0b3550' : danger ? '#451010' : '#000000'}
      emissiveIntensity={active || danger ? 0.75 : 0}
      transparent={opacity < 1}
      opacity={opacity}
      depthWrite={opacity > 0.5}
    />
  )
}

function Beam({ start, end, thickness, color, active, onClick }: {
  start: [number, number, number]
  end: [number, number, number]
  thickness: number
  color: string
  active: boolean
  onClick: () => void
}) {
  const { midpoint, length, quaternion } = useMemo(() => {
    const a = new THREE.Vector3(...start)
    const b = new THREE.Vector3(...end)
    const direction = b.clone().sub(a)
    const length = direction.length()
    const midpoint = a.clone().add(b).multiplyScalar(0.5)
    const quaternion = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.clone().normalize(),
    )
    return { midpoint, length, quaternion }
  }, [start, end])

  return (
    <mesh position={midpoint} quaternion={quaternion} castShadow onClick={(e) => { e.stopPropagation(); onClick() }}>
      <boxGeometry args={[thickness, length, thickness]} />
      <meshStandardMaterial
        color={active ? '#38bdf8' : color}
        metalness={0.5}
        roughness={0.35}
        emissive={active ? '#0b3550' : '#000000'}
        emissiveIntensity={active ? 1 : 0}
      />
    </mesh>
  )
}

function PanelBox({ position, rotation = [0, 0, 0], size, color, active, onClick }: {
  position: [number, number, number]
  rotation?: [number, number, number]
  size: [number, number, number]
  color: string
  active: boolean
  onClick: () => void
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow onClick={(e) => { e.stopPropagation(); onClick() }}>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={active ? '#38bdf8' : color}
        metalness={0.45}
        roughness={0.38}
        emissive={active ? '#0b3550' : '#000000'}
        emissiveIntensity={active ? 0.9 : 0}
      />
    </mesh>
  )
}

function WingShell({ side, active, damaged, cutaway, onSelect }: {
  side: 1 | -1
  active: boolean
  damaged: boolean
  cutaway: boolean
  onSelect: () => void
}) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(6.0, 0.4)
    shape.lineTo(4.8, 3.8)
    shape.lineTo(3.1, 11.5)
    shape.lineTo(1.6, 21.0)
    shape.lineTo(0.9, 29.0)
    shape.lineTo(0.7, 34.7)
    shape.lineTo(-0.5, 39.2)
    shape.lineTo(-1.15, 42.0)
    shape.lineTo(-1.85, 43.8)
    shape.lineTo(-2.4, 42.8)
    shape.lineTo(-2.8, 38.8)
    shape.lineTo(-3.2, 30.8)
    shape.lineTo(-3.75, 21.8)
    shape.lineTo(-4.85, 11.0)
    shape.lineTo(-6.4, 0.4)
    shape.closePath()
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: 0.34,
      bevelEnabled: true,
      bevelSize: 0.05,
      bevelThickness: 0.05,
      bevelSegments: 2,
    })
    g.rotateX(Math.PI / 2)
    g.center()
    return g
  }, [])

  return (
    <mesh geometry={geometry} position={[0.7, -0.16, side * 19.7]} scale={[1, 1, side]} castShadow receiveShadow onClick={(e) => { e.stopPropagation(); onSelect() }}>
      <PartMaterial active={active} danger={damaged} opacity={cutaway ? 0.16 : 1} />
    </mesh>
  )
}

function WingControlSurfaces({ side, selected, onSelect }: { side: 1 | -1; selected: string; onSelect: (part: string) => void }) {
  const s = side
  return (
    <group>
      <PanelBox position={[2.4, -0.06, s * 11.4]} rotation={[0, 0.05 * s, 0]} size={[0.26, 0.12, 12.3]} color="#adbccc" active={selected === 'leading-edge-slat'} onClick={() => onSelect('leading-edge-slat')} />
      <PanelBox position={[-0.8, 0.12, s * 16.0]} rotation={[0, 0.05 * s, 0]} size={[2.2, 0.09, 4.4]} color="#7d8ea2" active={selected === 'spoiler'} onClick={() => onSelect('spoiler')} />
      <PanelBox position={[-2.2, -0.18, s * 13.4]} rotation={[0, 0.05 * s, 0]} size={[1.8, 0.1, 6.2]} color="#6f7f91" active={selected === 'flap'} onClick={() => onSelect('flap')} />
      <PanelBox position={[-2.0, -0.18, s * 21.1]} rotation={[0, 0.05 * s, 0]} size={[1.5, 0.1, 4.2]} color="#6f7f91" active={selected === 'flaperon'} onClick={() => onSelect('flaperon')} />
      <PanelBox position={[-2.05, -0.18, s * 29.1]} rotation={[0, 0.05 * s, 0]} size={[1.25, 0.1, 5.6]} color="#728496" active={selected === 'aileron'} onClick={() => onSelect('aileron')} />
    </group>
  )
}

function WingStructure({ selected, onSelect }: { selected: string; onSelect: (part: string) => void }) {
  const y = -0.12
  const zRoot = 2.4
  const zTip = 38.6
  const frontRoot: [number, number, number] = [4.25, y, zRoot]
  const frontTip: [number, number, number] = [-0.95, y, zTip]
  const rearRoot: [number, number, number] = [-2.8, y, zRoot]
  const rearTip: [number, number, number] = [-2.25, y, zTip]
  const ribs = Array.from({ length: 16 }, (_, i) => {
    const t = (i + 1) / 17
    const z = THREE.MathUtils.lerp(zRoot, zTip, t)
    const frontX = THREE.MathUtils.lerp(frontRoot[0], frontTip[0], t)
    const rearX = THREE.MathUtils.lerp(rearRoot[0], rearTip[0], t)
    return { z, frontX, rearX, i }
  })
  const stringerFractions = [0.14, 0.28, 0.42, 0.56, 0.7, 0.84]

  return (
    <group>
      <PanelBox position={[0.35, y - 0.03, 0]} size={[8.8, 0.55, 4.4]} color="#64798a" active={selected === 'wing-center-section'} onClick={() => onSelect('wing-center-section')} />
      <Beam start={frontRoot} end={frontTip} thickness={0.25} color="#d5a94d" active={selected === 'front-spar'} onClick={() => onSelect('front-spar')} />
      <Beam start={rearRoot} end={rearTip} thickness={0.25} color="#d5a94d" active={selected === 'rear-spar'} onClick={() => onSelect('rear-spar')} />

      {ribs.map(({ z, frontX, rearX, i }) => (
        <Beam key={`rib-${i}`} start={[frontX, y, z]} end={[rearX, y, z]} thickness={0.1} color="#7da8be" active={selected === 'rib'} onClick={() => onSelect('rib')} />
      ))}

      {stringerFractions.map((fraction, i) => {
        const startX = THREE.MathUtils.lerp(frontRoot[0], rearRoot[0], fraction)
        const endX = THREE.MathUtils.lerp(frontTip[0], rearTip[0], fraction)
        return (
          <Beam key={`stringer-${i}`} start={[startX, y + 0.12, zRoot]} end={[endX, y + 0.12, zTip]} thickness={0.07} color="#8abf7a" active={selected === 'stringer'} onClick={() => onSelect('stringer')} />
        )
      })}

      <Beam start={[4.1, y, 5.6]} end={[-2.7, y, 5.6]} thickness={0.15} color="#c58f7b" active={selected === 'side-of-body-rib'} onClick={() => onSelect('side-of-body-rib')} />
      <Beam start={[3.25, y, 28.4]} end={[-2.25, y, 28.4]} thickness={0.15} color="#c58f7b" active={selected === 'tank-end-rib'} onClick={() => onSelect('tank-end-rib')} />
      <Beam start={[-0.7, y - 0.1, 3.1]} end={[-3.25, y - 0.1, 7.4]} thickness={0.22} color="#9b7d63" active={selected === 'landing-gear-beam'} onClick={() => onSelect('landing-gear-beam')} />
    </group>
  )
}

function Engine({ side, active, onSelect }: { side: 1 | -1; active: boolean; onSelect: () => void }) {
  const fanBlades = Array.from({ length: 10 }, (_, i) => (i / 10) * Math.PI * 2)
  return (
    <group position={[5.0, -2.45, side * 12.6]} rotation={[0, 0, Math.PI / 2]} onClick={(e) => { e.stopPropagation(); onSelect() }}>
      <mesh castShadow>
        <cylinderGeometry args={[1.82, 2.08, 6.25, 72]} />
        <PartMaterial active={active} />
      </mesh>
      <mesh position={[0, 3.15, 0]}>
        <torusGeometry args={[1.58, 0.16, 20, 72]} />
        <meshStandardMaterial color="#dfe7ee" metalness={0.5} roughness={0.26} />
      </mesh>
      <mesh position={[0, 3.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.36, 48]} />
        <meshStandardMaterial color="#11161d" metalness={0.8} roughness={0.22} />
      </mesh>
      {fanBlades.map((angle) => (
        <mesh key={angle} position={[0, 3.06, 0]} rotation={[Math.PI / 2, 0, angle]}>
          <boxGeometry args={[0.11, 0.72, 0.03]} />
          <meshStandardMaterial color="#7e8b98" metalness={0.75} roughness={0.28} />
        </mesh>
      ))}
      <mesh position={[0, 3.08, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.36, 0.75, 20]} />
        <meshStandardMaterial color="#e6edf2" metalness={0.7} roughness={0.2} />
      </mesh>
      <mesh position={[-0.08, -2.45, 0]} rotation={[0, 0, -0.5]} castShadow>
        <boxGeometry args={[0.48, 1.8, 0.92]} />
        <meshStandardMaterial color="#aab8c4" metalness={0.55} roughness={0.35} />
      </mesh>
    </group>
  )
}

function Tail({ active, onSelect }: { active: boolean; onSelect: () => void }) {
  return (
    <group onClick={(e) => { e.stopPropagation(); onSelect() }}>
      <mesh position={[-15.6, 1.85, 0]} rotation={[0, 0, -0.05]} castShadow>
        <boxGeometry args={[8.8, 0.26, 18.4]} />
        <PartMaterial active={active} />
      </mesh>
      <mesh position={[-17.0, 5.3, 0]} rotation={[0, 0, -0.18]} castShadow>
        <boxGeometry args={[6.0, 9.8, 0.3]} />
        <PartMaterial active={active} />
      </mesh>
    </group>
  )
}

function Aircraft({ selected, onSelect, damaged }: Props) {
  const [hover, setHover] = useState<string | null>(null)
  const active = (part: string) => selected === part || hover === part
  const wingMode = WING_PARTS.has(selected)

  return (
    <group rotation={[0, -0.18, 0]} position={[0, 0.25, 0]}>
      <group onPointerOver={(e) => { e.stopPropagation(); setHover('fuselage') }} onPointerOut={() => setHover(null)} onClick={(e) => { e.stopPropagation(); onSelect('fuselage') }}>
        <mesh position={[0.25, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <capsuleGeometry args={[2.55, 34.5, 14, 40]} />
          <PartMaterial active={active('fuselage')} />
        </mesh>
        <mesh position={[18.4, 0.04, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
          <coneGeometry args={[2.48, 6.6, 40]} />
          <PartMaterial active={active('fuselage')} />
        </mesh>
        <mesh position={[-19.3, 0.12, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <coneGeometry args={[1.76, 4.8, 32]} />
          <PartMaterial active={active('fuselage')} />
        </mesh>
      </group>

      <group onPointerOver={() => setHover('wing')} onPointerOut={() => setHover(null)}>
        <WingShell side={1} active={active('wing')} damaged={damaged} cutaway={wingMode} onSelect={() => onSelect('wing')} />
        <WingShell side={-1} active={active('wing')} damaged={damaged} cutaway={false} onSelect={() => onSelect('wing')} />
      </group>

      <WingControlSurfaces side={1} selected={selected} onSelect={onSelect} />
      <WingControlSurfaces side={-1} selected={selected} onSelect={onSelect} />
      {wingMode && <WingStructure selected={selected} onSelect={onSelect} />}

      <group onPointerOver={() => setHover('engine')} onPointerOut={() => setHover(null)}>
        <Engine side={1} active={active('engine')} onSelect={() => onSelect('engine')} />
        <Engine side={-1} active={active('engine')} onSelect={() => onSelect('engine')} />
      </group>

      <group onPointerOver={() => setHover('tail')} onPointerOut={() => setHover(null)}>
        <Tail active={active('tail')} onSelect={() => onSelect('tail')} />
      </group>

      {damaged && (
        <mesh position={[1.8, 0.04, 16.2]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.0, 0.13, 18, 48]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={3} />
        </mesh>
      )}
    </group>
  )
}

export default function AircraftScene(props: Props) {
  return (
    <Canvas camera={{ position: [38, 20, 36], fov: 35 }} shadows dpr={[1, 1.7]}>
      <color attach="background" args={['#071019']} />
      <fog attach="fog" args={['#071019', 45, 96]} />
      <ambientLight intensity={0.85} />
      <directionalLight position={[18, 24, 16]} intensity={3.5} castShadow />
      <Aircraft {...props} />
      <Grid position={[0, -4.8, 0]} args={[130, 130]} cellSize={2} sectionSize={10} fadeDistance={84} fadeStrength={1.6} />
      <OrbitControls makeDefault enablePan minDistance={18} maxDistance={82} target={[0, 0, 0]} />
    </Canvas>
  )
}
