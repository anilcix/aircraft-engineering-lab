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
        metalness={0.45}
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
    shape.moveTo(5.8, 0.5)
    shape.lineTo(3.3, 9.8)
    shape.lineTo(1.5, 18.5)
    shape.lineTo(0.9, 26.5)
    shape.lineTo(1.1, 31.8)
    shape.lineTo(-0.2, 35.2)
    shape.lineTo(-1.1, 34.2)
    shape.lineTo(-1.9, 26.8)
    shape.lineTo(-2.5, 19.5)
    shape.lineTo(-4.2, 8.8)
    shape.lineTo(-6.2, 0.5)
    shape.closePath()
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: 0.34,
      bevelEnabled: true,
      bevelSize: 0.06,
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
      position={[1.4, -0.1, side * 16.2]}
      scale={[1, 1, side]}
      castShadow
      receiveShadow
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
    >
      <PartMaterial active={active} danger={damaged} opacity={cutaway ? 0.15 : 1} />
    </mesh>
  )
}

function WingStructure({ selected, onSelect }: { selected: string; onSelect: (part: string) => void }) {
  const y = -0.05
  const zRoot = 3.3
  const zTip = 31.3

  const frontRoot: [number, number, number] = [4.7, y, zRoot]
  const frontTip: [number, number, number] = [-0.35, y, zTip]
  const rearRoot: [number, number, number] = [-3.2, y, zRoot]
  const rearTip: [number, number, number] = [-1.45, y, zTip]

  const ribs = Array.from({ length: 13 }, (_, i) => {
    const t = (i + 1) / 14
    const z = THREE.MathUtils.lerp(zRoot, zTip, t)
    const frontX = THREE.MathUtils.lerp(frontRoot[0], frontTip[0], t)
    const rearX = THREE.MathUtils.lerp(rearRoot[0], rearTip[0], t)
    return { z, frontX, rearX, i }
  })

  const stringerFractions = [0.14, 0.28, 0.42, 0.56, 0.7, 0.84]

  return (
    <group>
      <Beam start={frontRoot} end={frontTip} thickness={0.28} color="#d5a94d" active={selected === 'front-spar'} onClick={() => onSelect('front-spar')} />
      <Beam start={rearRoot} end={rearTip} thickness={0.28} color="#d5a94d" active={selected === 'rear-spar'} onClick={() => onSelect('rear-spar')} />

      {ribs.map(({ z, frontX, rearX, i }) => (
        <Beam
          key={`rib-${i}`}
          start={[frontX, y, z]}
          end={[rearX, y, z]}
          thickness={0.13}
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
            start={[startX, y + 0.12, zRoot]}
            end={[endX, y + 0.12, zTip]}
            thickness={0.075}
            color="#8abf7a"
            active={selected === 'stringer'}
            onClick={() => onSelect('stringer')}
          />
        )
      })}

      <mesh position={[0.3, y, 3.1]} onClick={(e) => { e.stopPropagation(); onSelect('wing') }}>
        <boxGeometry args={[8.8, 0.65, 1.4]} />
        <meshStandardMaterial color="#667b8b" metalness={0.6} roughness={0.32} />
      </mesh>
    </group>
  )
}

function Engine({ side, active, onSelect }: { side: 1 | -1; active: boolean; onSelect: () => void }) {
  return (
    <group
      position={[5.4, -3.2, side * 12.2]}
      rotation={[0, 0, Math.PI / 2]}
      onClick={(e) => { e.stopPropagation(); onSelect() }}
    >
      <mesh castShadow>
        <cylinderGeometry args={[1.85, 2.25, 6.6, 56]} />
        <PartMaterial active={active} />
      </mesh>
      <mesh position={[0, 3.25, 0]}>
        <torusGeometry args={[1.55, 0.2, 18, 64]} />
        <meshStandardMaterial color="#171c23" metalness={0.85} roughness={0.22} />
      </mesh>
      <mesh position={[-0.25, -2.6, 0]} rotation={[0, 0, -0.55]} castShadow>
        <boxGeometry args={[0.55, 1.95, 1.1]} />
        <meshStandardMaterial color="#9fb0bf" metalness={0.6} roughness={0.35} />
      </mesh>
    </group>
  )
}

function MainLandingGear({ side }: { side: 1 | -1 }) {
  return (
    <group position={[-4.9, -5.55, side * 4.3]}>
      <mesh position={[0, 1.6, 0]} rotation={[0, 0, 0.1 * side]} castShadow>
        <cylinderGeometry args={[0.14, 0.14, 3.4, 14]} />
        <meshStandardMaterial color="#8b98a5" metalness={0.85} roughness={0.25} />
      </mesh>
      {[-1.05, -0.35, 0.35, 1.05].map((x) => (
        <mesh key={x} position={[x, 0.05, 0.52]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[0.37, 0.14, 14, 32]} />
          <meshStandardMaterial color="#111418" roughness={0.92} metalness={0.15} />
        </mesh>
      ))}
      {[-1.05, -0.35, 0.35, 1.05].map((x) => (
        <mesh key={`b-${x}`} position={[x, 0.05, -0.52]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[0.37, 0.14, 14, 32]} />
          <meshStandardMaterial color="#111418" roughness={0.92} metalness={0.15} />
        </mesh>
      ))}
    </group>
  )
}

function NoseGear() {
  return (
    <group position={[15.2, -5.05, 0]}>
      <mesh position={[0, 1.15, 0]} castShadow>
        <cylinderGeometry args={[0.11, 0.11, 2.35, 14]} />
        <meshStandardMaterial color="#8b98a5" metalness={0.85} roughness={0.25} />
      </mesh>
      {[-0.28, 0.28].map((z) => (
        <mesh key={z} position={[0, -0.05, z]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[0.29, 0.11, 14, 28]} />
          <meshStandardMaterial color="#111418" roughness={0.9} metalness={0.15} />
        </mesh>
      ))}
    </group>
  )
}

function Aircraft({ selected, onSelect, damaged }: Props) {
  const [hover, setHover] = useState<string | null>(null)
  const active = (part: string) => selected === part || hover === part
  const wingCutaway = WING_PARTS.has(selected)

  return (
    <group rotation={[0, -0.18, 0]} position={[0, 0.1, 0]}>
      <group
        onPointerOver={(e) => { e.stopPropagation(); setHover('fuselage') }}
        onPointerOut={() => setHover(null)}
        onClick={(e) => { e.stopPropagation(); onSelect('fuselage') }}
      >
        <mesh position={[0.3, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <capsuleGeometry args={[2.75, 36, 14, 40]} />
          <PartMaterial active={active('fuselage')} />
        </mesh>
        <mesh position={[19.0, 0.12, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
          <coneGeometry args={[2.68, 7.2, 40]} />
          <PartMaterial active={active('fuselage')} />
        </mesh>
        <mesh position={[-20.2, 0.18, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <coneGeometry args={[1.92, 4.8, 32]} />
          <PartMaterial active={active('fuselage')} />
        </mesh>
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

      <group
        onPointerOver={() => setHover('tail')}
        onPointerOut={() => setHover(null)}
        onClick={(e) => { e.stopPropagation(); onSelect('tail') }}
      >
        <mesh position={[-16.9, 2.9, 0]} rotation={[0, 0, -0.09]} castShadow>
          <boxGeometry args={[10.2, 0.34, 18.8]} />
          <PartMaterial active={active('tail')} />
        </mesh>
        <mesh position={[-18.7, 6.0, 0]} rotation={[0, 0, -0.14]} castShadow>
          <boxGeometry args={[7.4, 10.8, 0.36]} />
          <PartMaterial active={active('tail')} />
        </mesh>
      </group>

      <NoseGear />
      <MainLandingGear side={1} />
      <MainLandingGear side={-1} />

      {damaged && (
        <mesh position={[4.0, -0.1, 15.2]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.05, 0.14, 18, 48]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={3} />
        </mesh>
      )}
    </group>
  )
}

export default function AircraftScene(props: Props) {
  return (
    <Canvas camera={{ position: [40, 24, 34], fov: 34 }} shadows dpr={[1, 1.7]}>
      <color attach="background" args={['#071019']} />
      <fog attach="fog" args={['#071019', 48, 105]} />
      <ambientLight intensity={0.82} />
      <directionalLight position={[20, 26, 16]} intensity={3.6} castShadow />
      <Aircraft {...props} />
      <Grid position={[0, -5.8, 0]} args={[140, 140]} cellSize={2} sectionSize={10} fadeDistance={90} fadeStrength={1.6} />
      <OrbitControls makeDefault enablePan minDistance={20} maxDistance={85} target={[0, 0, 0]} />
    </Canvas>
  )
}
