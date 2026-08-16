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

const WING_PARTS = new Set(['wing', 'front-spar', 'rear-spar', 'rib', 'stringer'])

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

function Beam({
  start,
  end,
  thickness,
  color,
  active,
  onClick,
}: {
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
    <mesh
      position={midpoint}
      quaternion={quaternion}
      castShadow
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
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

function WingShell({
  side,
  active,
  damaged,
  cutaway,
  onSelect,
}: {
  side: 1 | -1
  active: boolean
  damaged: boolean
  cutaway: boolean
  onSelect: () => void
}) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(4.7, 0.8)
    shape.lineTo(1.8, 14.5)
    shape.lineTo(-1.4, 25.4)
    shape.lineTo(-2.1, 26.5)
    shape.lineTo(-2.8, 24.7)
    shape.lineTo(-3.4, 15.5)
    shape.lineTo(-5.0, 0.8)
    shape.closePath()
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: 0.32,
      bevelEnabled: true,
      bevelSize: 0.08,
      bevelThickness: 0.06,
      bevelSegments: 2,
    })
    g.rotateX(Math.PI / 2)
    g.center()
    return g
  }, [])

  return (
    <mesh
      geometry={geometry}
      position={[0.8, -0.2, side * 13.1]}
      scale={[1, 1, side]}
      castShadow
      receiveShadow
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
    >
      <PartMaterial active={active} danger={damaged} opacity={cutaway ? 0.16 : 1} />
    </mesh>
  )
}

function WingStructure({ selected, onSelect }: { selected: string; onSelect: (part: string) => void }) {
  const y = -0.16
  const zRoot = 1.9
  const zTip = 25.1

  const frontRoot: [number, number, number] = [3.45, y, zRoot]
  const frontTip: [number, number, number] = [-0.9, y, zTip]
  const rearRoot: [number, number, number] = [-2.7, y, zRoot]
  const rearTip: [number, number, number] = [-2.05, y, zTip]

  const ribs = Array.from({ length: 11 }, (_, i) => {
    const t = (i + 1) / 12
    const z = THREE.MathUtils.lerp(zRoot, zTip, t)
    const frontX = THREE.MathUtils.lerp(frontRoot[0], frontTip[0], t)
    const rearX = THREE.MathUtils.lerp(rearRoot[0], rearTip[0], t)
    return { z, frontX, rearX, i }
  })

  const stringerFractions = [0.18, 0.34, 0.5, 0.66, 0.82]

  return (
    <group position={[0, 0, 0]}>
      <Beam
        start={frontRoot}
        end={frontTip}
        thickness={0.24}
        color="#d5a94d"
        active={selected === 'front-spar'}
        onClick={() => onSelect('front-spar')}
      />
      <Beam
        start={rearRoot}
        end={rearTip}
        thickness={0.24}
        color="#d5a94d"
        active={selected === 'rear-spar'}
        onClick={() => onSelect('rear-spar')}
      />

      {ribs.map(({ z, frontX, rearX, i }) => (
        <Beam
          key={`rib-${i}`}
          start={[frontX, y, z]}
          end={[rearX, y, z]}
          thickness={0.12}
          color="#78a6bc"
          active={selected === 'rib'}
          onClick={() => onSelect('rib')}
        />
      ))}

      {stringerFractions.map((fraction, i) => {
        const startX = THREE.MathUtils.lerp(frontRoot[0], rearRoot[0], fraction)
        const endX = THREE.MathUtils.lerp(frontTip[0], rearTip[0], fraction)
        return (
          <Beam
            key={`stringer-${i}`}
            start={[startX, y + 0.11, zRoot]}
            end={[endX, y + 0.11, zTip]}
            thickness={0.075}
            color="#8abf7a"
            active={selected === 'stringer'}
            onClick={() => onSelect('stringer')}
          />
        )
      })}

      <mesh position={[0.2, y, 2.4]} onClick={(e) => { e.stopPropagation(); onSelect('wing') }}>
        <boxGeometry args={[7.0, 0.55, 1.1]} />
        <meshStandardMaterial color="#667b8b" metalness={0.65} roughness={0.3} />
      </mesh>
    </group>
  )
}

function Engine({ side, active, onSelect }: { side: 1 | -1; active: boolean; onSelect: () => void }) {
  return (
    <group
      position={[4.6, -2.75, side * 9.9]}
      rotation={[0, 0, Math.PI / 2]}
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
    >
      <mesh castShadow>
        <cylinderGeometry args={[1.65, 2.1, 5.8, 56]} />
        <PartMaterial active={active} />
      </mesh>
      <mesh position={[0, 2.9, 0]}>
        <torusGeometry args={[1.46, 0.18, 18, 64]} />
        <meshStandardMaterial color="#171c23" metalness={0.85} roughness={0.22} />
      </mesh>
      <mesh position={[0.1, -2.35, 0]} rotation={[0, 0, -0.42]} castShadow>
        <boxGeometry args={[0.52, 1.9, 0.9]} />
        <meshStandardMaterial color="#9fb0bf" metalness={0.55} roughness={0.35} />
      </mesh>
    </group>
  )
}

function MainLandingGear({ side }: { side: 1 | -1 }) {
  return (
    <group position={[-3.0, -4.45, side * 3.5]}>
      <mesh position={[0, 1.2, 0]} rotation={[0, 0, 0.12 * side]} castShadow>
        <cylinderGeometry args={[0.12, 0.12, 2.55, 14]} />
        <meshStandardMaterial color="#8b98a5" metalness={0.85} roughness={0.25} />
      </mesh>
      {[-0.75, 0, 0.75].flatMap((x) => [-0.48, 0.48].map((z) => (
        <mesh key={`${x}-${z}`} position={[x, 0.02, z]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[0.35, 0.14, 14, 32]} />
          <meshStandardMaterial color="#111418" roughness={0.9} metalness={0.15} />
        </mesh>
      )))}
    </group>
  )
}

function NoseGear() {
  return (
    <group position={[11.8, -4.0, 0]}>
      <mesh position={[0, 1.0, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.1, 2.0, 14]} />
        <meshStandardMaterial color="#8b98a5" metalness={0.85} roughness={0.25} />
      </mesh>
      {[-0.27, 0.27].map((z) => (
        <mesh key={z} position={[0, -0.04, z]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[0.28, 0.11, 14, 28]} />
          <meshStandardMaterial color="#111418" roughness={0.9} metalness={0.15} />
        </mesh>
      ))}
    </group>
  )
}

function Aircraft({ selected, onSelect, damaged }: Props) {
  const [hover, setHover] = useState<string | null>(null)
  const active = (part: string) => selected === part || hover === part
  const wingMode = WING_PARTS.has(selected)

  return (
    <group rotation={[0, -0.18, 0]} position={[0, 0.25, 0]}>
      <group
        onPointerOver={(e) => { e.stopPropagation(); setHover('fuselage') }}
        onPointerOut={() => setHover(null)}
        onClick={(e) => { e.stopPropagation(); onSelect('fuselage') }}
      >
        <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <capsuleGeometry args={[2.45, 30.5, 14, 40]} />
          <PartMaterial active={active('fuselage')} />
        </mesh>
        <mesh position={[16.45, 0.05, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
          <coneGeometry args={[2.35, 5.9, 40]} />
          <PartMaterial active={active('fuselage')} />
        </mesh>
        <mesh position={[-17.1, 0.15, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <coneGeometry args={[1.65, 4.3, 32]} />
          <PartMaterial active={active('fuselage')} />
        </mesh>
      </group>

      <group onPointerOver={() => setHover('wing')} onPointerOut={() => setHover(null)}>
        <WingShell side={1} active={active('wing')} damaged={damaged} cutaway={wingMode} onSelect={() => onSelect('wing')} />
        <WingShell side={-1} active={active('wing')} damaged={damaged} cutaway={false} onSelect={() => onSelect('wing')} />
      </group>

      {wingMode && <WingStructure selected={selected} onSelect={onSelect} />}

      <group onPointerOver={() => setHover('engine')} onPointerOut={() => setHover(null)}>
        <Engine side={1} active={active('engine')} onSelect={() => onSelect('engine')} />
        <Engine side={-1} active={active('engine')} onSelect={() => onSelect('engine')} />
      </group>

      <group
        onPointerOver={() => setHover('tail')}
        onPointerOut={() => setHover(null)}
        onClick={(e) => { e.stopPropagation(); onSelect('tail') }}
      >
        <mesh position={[-13.8, 2.2, 0]} rotation={[0, 0, -0.08]} castShadow>
          <boxGeometry args={[7.8, 0.32, 16.8]} />
          <PartMaterial active={active('tail')} />
        </mesh>
        <mesh position={[-15.3, 5.0, 0]} rotation={[0, 0, -0.16]} castShadow>
          <boxGeometry args={[6.4, 8.8, 0.36]} />
          <PartMaterial active={active('tail')} />
        </mesh>
      </group>

      <NoseGear />
      <MainLandingGear side={1} />
      <MainLandingGear side={-1} />

      {damaged && (
        <mesh position={[2.2, 0.1, 11.4]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.9, 0.13, 18, 48]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={3} />
        </mesh>
      )}
    </group>
  )
}

export default function AircraftScene(props: Props) {
  return (
    <Canvas camera={{ position: [35, 18, 34], fov: 37 }} shadows dpr={[1, 1.7]}>
      <color attach="background" args={['#071019']} />
      <fog attach="fog" args={['#071019', 45, 92]} />
      <ambientLight intensity={0.85} />
      <directionalLight position={[18, 24, 16]} intensity={3.5} castShadow />
      <Aircraft {...props} />
      <Grid position={[0, -4.65, 0]} args={[120, 120]} cellSize={2} sectionSize={10} fadeDistance={82} fadeStrength={1.6} />
      <OrbitControls makeDefault enablePan minDistance={18} maxDistance={78} target={[0, 0, 0]} />
    </Canvas>
  )
}
