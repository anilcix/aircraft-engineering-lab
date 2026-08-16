'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Grid, Html, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { useMemo, useRef, useState } from 'react'
import type { EquipmentLocatorRequest } from '@/components/equipment-locator-types'

type Props = {
  selected: string
  onSelect: (part: string) => void
  damaged: boolean
  equipmentLocator?: EquipmentLocatorRequest | null
  onClearEquipmentLocator?: () => void
}

type Point3 = [number, number, number]
type LocatorSurface = 'fuselage' | 'wing' | 'engine' | 'tail'
type LocatorPose = {
  position: Point3
  cameraPosition: Point3
  target: Point3
  internal: boolean
  surface: LocatorSurface
}

const AIRCRAFT_YAW = -0.05

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

function hashUnit(text: string, salt = 0) {
  let hash = 2166136261 ^ salt
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) / 4294967295
}

function spread(text: string, magnitude: number, salt = 0) {
  return (hashUnit(text, salt) * 2 - 1) * magnitude
}

function rotatedAircraftPoint(point: Point3): Point3 {
  const v = new THREE.Vector3(...point)
  v.applyAxisAngle(new THREE.Vector3(0, 1, 0), AIRCRAFT_YAW)
  return [v.x, v.y, v.z]
}

function getEquipmentLocatorPose(locator: EquipmentLocatorRequest): LocatorPose {
  const key = `${locator.region} ${locator.location} ${locator.name}`.toLowerCase()
  const propulsion = Number(locator.ata) >= 70
  const side: 1 | -1 = hashUnit(locator.id, 11) > 0.5 ? 1 : -1
  let position: Point3
  let surface: LocatorSurface = 'fuselage'
  let internal = true

  if (propulsion || key.includes('engine') || key.includes('nacelle') || key.includes('pylon')) {
    surface = 'engine'
    position = [3.0 + spread(locator.id, 1.3, 1), -2.0 + spread(locator.id, 0.65, 2), side * (13.4 + spread(locator.id, 1.05, 3))]
  } else if (locator.ata === '49' || key.includes('apu') || key.includes('tail cone') || key.includes('aft fuselage') || key.includes('vertical tail')) {
    surface = 'tail'
    position = [-24.6 + spread(locator.id, 2.2, 4), -0.35 + spread(locator.id, 0.85, 5), spread(locator.id, 1.15, 6)]
  } else if (key.includes('main gear') || key.includes('landing gear bay') || key.includes('wheel well')) {
    surface = 'wing'
    position = [-1.4 + spread(locator.id, 1.0, 7), -2.55, side * (6.4 + spread(locator.id, 1.1, 8))]
  } else if (key.includes('nose gear')) {
    surface = 'fuselage'
    position = [20.7 + spread(locator.id, 0.8, 9), -2.15, spread(locator.id, 0.45, 10)]
  } else if (key.includes('wing-body') || key.includes('wing body') || key.includes('center fuselage') || key.includes('wing center')) {
    surface = 'fuselage'
    position = [spread(locator.id, 2.9, 12), -1.3 + spread(locator.id, 0.5, 13), spread(locator.id, 2.0, 14)]
  } else if (key.includes('wing') || key.includes('fuel tank') || key.includes('slat') || key.includes('flap') || key.includes('aileron') || key.includes('spoiler')) {
    surface = 'wing'
    const z = 8 + hashUnit(locator.id, 15) * 19
    const x = THREE.MathUtils.lerp(2.2, -7.0, (z - 8) / 19) + spread(locator.id, 1.1, 16)
    position = [x, 0.42 + spread(locator.id, 0.3, 17), side * z]
  } else if (key.includes('cockpit') || key.includes('flight deck') || key.includes('nose')) {
    surface = 'fuselage'
    position = [22.4 + spread(locator.id, 1.5, 18), 0.7 + spread(locator.id, 0.9, 19), spread(locator.id, 1.1, 20)]
  } else if (key.includes('e/e') || key.includes('avionics') || key.includes('electrical equipment bay')) {
    surface = 'fuselage'
    position = [16.7 + spread(locator.id, 2.0, 21), -1.0 + spread(locator.id, 0.55, 22), spread(locator.id, 1.25, 23)]
  } else if (key.includes('cabin') || key.includes('galley') || key.includes('lavatory') || key.includes('passenger')) {
    surface = 'fuselage'
    position = [spread(locator.id, 13.0, 24), 0.7 + spread(locator.id, 0.8, 25), spread(locator.id, 1.25, 26)]
  } else if (key.includes('external') || key.includes('skin') || key.includes('light')) {
    surface = 'fuselage'
    internal = false
    position = [spread(locator.id, 16.0, 27), 1.2 + spread(locator.id, 1.1, 28), side * 2.5]
  } else {
    surface = 'fuselage'
    position = [spread(locator.id, 17.0, 29), -0.1 + spread(locator.id, 1.4, 30), spread(locator.id, 1.55, 31)]
  }

  const target = rotatedAircraftPoint(position)
  let cameraPosition: Point3
  if (surface === 'engine') cameraPosition = [target[0] + 11, target[1] + 8, target[2] + side * 13]
  else if (surface === 'wing') cameraPosition = [target[0] + 12, target[1] + 11, target[2] + side * 14]
  else if (surface === 'tail') cameraPosition = [target[0] - 11, target[1] + 10, target[2] + 16]
  else cameraPosition = [target[0] + 12, target[1] + 10, target[2] + 17]

  return { position, cameraPosition, target, internal, surface }
}

function SurfaceMaterial({ active, base = '#dce2e8', danger = false, opacity = 1 }: { active: boolean; base?: string; danger?: boolean; opacity?: number }) {
  return (
    <meshStandardMaterial
      color={danger ? '#ef4444' : active ? '#38bdf8' : base}
      metalness={0.28}
      roughness={0.42}
      emissive={active ? '#0b3550' : danger ? '#451010' : '#000000'}
      emissiveIntensity={active || danger ? 0.8 : 0}
      transparent={opacity < 1}
      opacity={opacity}
      depthWrite={opacity > 0.45}
    />
  )
}

function createFuselageGeometry() {
  const controls = [
    { x: -29.0, r: 0.10 },
    { x: -28.2, r: 0.48 },
    { x: -26.8, r: 1.10 },
    { x: -24.8, r: 1.85 },
    { x: -21.5, r: 2.42 },
    { x: -16.0, r: 2.60 },
    { x: -8.0, r: 2.66 },
    { x: 8.5, r: 2.66 },
    { x: 15.5, r: 2.62 },
    { x: 20.5, r: 2.46 },
    { x: 24.0, r: 1.95 },
    { x: 26.2, r: 1.25 },
    { x: 28.0, r: 0.48 },
    { x: 29.1, r: 0.08 },
  ]

  const profile: THREE.Vector2[] = []
  for (let i = 0; i < controls.length - 1; i++) {
    const a = controls[i]
    const b = controls[i + 1]
    const steps = 5
    for (let s = 0; s < steps; s++) {
      const t = s / steps
      const smooth = t * t * (3 - 2 * t)
      profile.push(new THREE.Vector2(
        THREE.MathUtils.lerp(a.r, b.r, smooth),
        THREE.MathUtils.lerp(a.x, b.x, t),
      ))
    }
  }
  const last = controls[controls.length - 1]
  profile.push(new THREE.Vector2(last.r, last.x))

  const geometry = new THREE.LatheGeometry(profile, 72)
  geometry.rotateZ(-Math.PI / 2)
  geometry.computeVertexNormals()
  return geometry
}

function createPlanformGeometry(points: Array<[number, number]>, thickness: number) {
  const shape = new THREE.Shape()
  shape.moveTo(points[0][0], points[0][1])
  points.slice(1).forEach(([x, z]) => shape.lineTo(x, z))
  shape.closePath()
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelSize: 0.055,
    bevelThickness: 0.04,
    bevelSegments: 2,
  })
  geometry.rotateX(Math.PI / 2)
  return geometry
}

function Beam({ start, end, thickness, color, active, onClick }: {
  start: Point3
  end: Point3
  thickness: number
  color: string
  active: boolean
  onClick: () => void
}) {
  const { midpoint, length, quaternion } = useMemo(() => {
    const a = new THREE.Vector3(...start)
    const b = new THREE.Vector3(...end)
    const direction = b.clone().sub(a)
    return {
      midpoint: a.clone().add(b).multiplyScalar(0.5),
      length: direction.length(),
      quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize()),
    }
  }, [start, end])

  return (
    <mesh position={midpoint} quaternion={quaternion} renderOrder={8} castShadow onClick={(e) => { e.stopPropagation(); onClick() }}>
      <boxGeometry args={[thickness, length, thickness]} />
      <meshStandardMaterial color={active ? '#38bdf8' : color} metalness={0.25} roughness={0.34} emissive={active ? '#0b3550' : color} emissiveIntensity={active ? 1.4 : 0.18} />
    </mesh>
  )
}

function PanelBox({ position, size, color, active, onClick }: {
  position: Point3
  size: Point3
  color: string
  active: boolean
  onClick: () => void
}) {
  return (
    <mesh position={position} renderOrder={7} castShadow onClick={(e) => { e.stopPropagation(); onClick() }}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={active ? '#38bdf8' : color} metalness={0.28} roughness={0.36} emissive={active ? '#0b3550' : color} emissiveIntensity={active ? 1.2 : 0.12} />
    </mesh>
  )
}

const WING_POINTS: Array<[number, number]> = [
  [6.3, 2.5], [4.7, 7.0], [1.1, 15.5], [-3.2, 24.5], [-7.0, 32.5], [-9.7, 38.0], [-10.8, 40.2],
  [-11.6, 39.0], [-10.4, 33.0], [-8.4, 25.0], [-6.6, 15.5], [-5.7, 7.0], [-5.4, 2.5],
]

function WingShell({ side, active, damaged, cutaway, opacity = 1, onSelect }: {
  side: 1 | -1
  active: boolean
  damaged: boolean
  cutaway: boolean
  opacity?: number
  onSelect: () => void
}) {
  const geometry = useMemo(() => createPlanformGeometry(WING_POINTS, 0.34), [])
  if (cutaway) return null
  return (
    <mesh geometry={geometry} position={[0, 0.15, 0]} scale={[1, 1, side]} castShadow receiveShadow onClick={(e) => { e.stopPropagation(); onSelect() }}>
      <SurfaceMaterial active={active} base="#aeb7c0" danger={damaged} opacity={opacity} />
    </mesh>
  )
}

function WingStructure({ selected, onSelect }: { selected: string; onSelect: (part: string) => void }) {
  const y = 0.58
  const zRoot = 3.3
  const zTip = 36.8
  const frontRoot: Point3 = [3.7, y, zRoot]
  const frontTip: Point3 = [-8.9, y, zTip]
  const rearRoot: Point3 = [-2.8, y, zRoot]
  const rearTip: Point3 = [-10.1, y, zTip]
  const ribs = Array.from({ length: 18 }, (_, i) => {
    const t = (i + 1) / 19
    return { z: THREE.MathUtils.lerp(zRoot, zTip, t), frontX: THREE.MathUtils.lerp(frontRoot[0], frontTip[0], t), rearX: THREE.MathUtils.lerp(rearRoot[0], rearTip[0], t), i }
  })

  return (
    <group>
      <PanelBox position={[0.2, y - 0.12, 0]} size={[9.4, 0.55, 5.2]} color="#596c7d" active={selected === 'wing-center-section'} onClick={() => onSelect('wing-center-section')} />
      <Beam start={frontRoot} end={frontTip} thickness={0.34} color="#f2b84b" active={selected === 'front-spar'} onClick={() => onSelect('front-spar')} />
      <Beam start={rearRoot} end={rearTip} thickness={0.34} color="#f2b84b" active={selected === 'rear-spar'} onClick={() => onSelect('rear-spar')} />
      {ribs.map(({ z, frontX, rearX, i }) => <Beam key={`rib-${i}`} start={[frontX, y, z]} end={[rearX, y, z]} thickness={0.18} color="#68c4e8" active={selected === 'rib'} onClick={() => onSelect('rib')} />)}
      {[0.16, 0.30, 0.44, 0.58, 0.72, 0.86].map((fraction, i) => <Beam key={`stringer-${i}`} start={[THREE.MathUtils.lerp(frontRoot[0], rearRoot[0], fraction), y + 0.14, zRoot]} end={[THREE.MathUtils.lerp(frontTip[0], rearTip[0], fraction), y + 0.14, zTip]} thickness={0.10} color="#8bd17c" active={selected === 'stringer'} onClick={() => onSelect('stringer')} />)}
      <Beam start={[3.25, y, 5.5]} end={[-3.15, y, 5.5]} thickness={0.24} color="#f08f75" active={selected === 'side-of-body-rib'} onClick={() => onSelect('side-of-body-rib')} />
      <Beam start={[-5.7, y, 29.7]} end={[-8.9, y, 29.7]} thickness={0.24} color="#f08f75" active={selected === 'tank-end-rib'} onClick={() => onSelect('tank-end-rib')} />
      <Beam start={[-0.6, y - 0.08, 3.4]} end={[-3.6, y - 0.08, 8.5]} thickness={0.28} color="#c79b6f" active={selected === 'landing-gear-beam'} onClick={() => onSelect('landing-gear-beam')} />
      <PanelBox position={[2.0, y + 0.02, 10.0]} size={[0.24, 0.16, 11.2]} color="#b4c3d1" active={selected === 'leading-edge-slat'} onClick={() => onSelect('leading-edge-slat')} />
      <PanelBox position={[-3.2, y + 0.05, 14.4]} size={[1.5, 0.15, 5.0]} color="#8295a8" active={selected === 'flap'} onClick={() => onSelect('flap')} />
      <PanelBox position={[-5.1, y + 0.05, 21.0]} size={[1.2, 0.15, 4.0]} color="#8093a5" active={selected === 'flaperon'} onClick={() => onSelect('flaperon')} />
      <PanelBox position={[-7.8, y + 0.05, 29.3]} size={[1.0, 0.15, 5.2]} color="#7c8fa1" active={selected === 'aileron'} onClick={() => onSelect('aileron')} />
      <PanelBox position={[-2.0, y + 0.18, 18.0]} size={[1.5, 0.12, 3.8]} color="#6d8296" active={selected === 'spoiler'} onClick={() => onSelect('spoiler')} />
    </group>
  )
}

function Engine({ side, active, opacity = 1, onSelect }: { side: 1 | -1; active: boolean; opacity?: number; onSelect: () => void }) {
  const fanBlades = Array.from({ length: 12 }, (_, i) => (i / 12) * Math.PI * 2)
  return (
    <group position={[3.0, -2.15, side * 13.4]} rotation={[0, 0, Math.PI / 2]} onClick={(e) => { e.stopPropagation(); onSelect() }}>
      <mesh castShadow><cylinderGeometry args={[1.86, 2.20, 6.7, 72]} /><SurfaceMaterial active={active} base="#c7cdd3" opacity={opacity} /></mesh>
      <mesh position={[0, 3.35, 0]}><torusGeometry args={[1.72, 0.18, 24, 72]} /><meshStandardMaterial color="#eef2f5" metalness={0.45} roughness={0.22} transparent={opacity < 1} opacity={opacity} /></mesh>
      <mesh position={[0, 3.31, 0]} rotation={[Math.PI / 2, 0, 0]}><circleGeometry args={[1.48, 56]} /><meshStandardMaterial color="#10151b" metalness={0.75} roughness={0.22} /></mesh>
      {fanBlades.map((angle) => <mesh key={angle} position={[0, 3.28, 0]} rotation={[Math.PI / 2, 0, angle]}><boxGeometry args={[0.11, 0.82, 0.035]} /><meshStandardMaterial color="#737f8a" metalness={0.78} roughness={0.25} /></mesh>)}
      <mesh position={[0, 3.30, 0]} rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[0.38, 0.78, 24]} /><meshStandardMaterial color="#edf2f5" metalness={0.7} roughness={0.2} /></mesh>
      <mesh position={[-0.2, -2.50, 0]} rotation={[0, 0, -0.48]} castShadow><boxGeometry args={[0.56, 2.0, 1.02]} /><meshStandardMaterial color="#a7b3bd" metalness={0.5} roughness={0.34} /></mesh>
    </group>
  )
}

function HorizontalTail({ side, active, onSelect }: { side: 1 | -1; active: boolean; onSelect: () => void }) {
  const geometry = useMemo(() => createPlanformGeometry([[-20.2, 1.5], [-21.8, 4.7], [-24.6, 9.2], [-26.2, 11.0], [-27.2, 11.3], [-27.8, 10.2], [-26.4, 5.2], [-25.4, 1.5]], 0.28), [])
  return <mesh geometry={geometry} position={[0, 0.25, 0]} scale={[1, 1, side]} castShadow onClick={(e) => { e.stopPropagation(); onSelect() }}><SurfaceMaterial active={active} base="#adb6bf" /></mesh>
}

function VerticalTail({ active, onSelect }: { active: boolean; onSelect: () => void }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-21.0, 0.0); shape.lineTo(-23.0, 4.8); shape.lineTo(-25.8, 10.5); shape.lineTo(-27.2, 11.4); shape.lineTo(-28.2, 1.1); shape.closePath()
    return new THREE.ExtrudeGeometry(shape, { depth: 0.32, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.035, bevelSegments: 2 })
  }, [])
  return <mesh geometry={geometry} position={[0, 0.0, -0.16]} castShadow onClick={(e) => { e.stopPropagation(); onSelect() }}><SurfaceMaterial active={active} base="#adb6bf" /></mesh>
}

function EquipmentMarker({ locator, onClear }: { locator: EquipmentLocatorRequest; onClear?: () => void }) {
  const pose = useMemo(() => getEquipmentLocatorPose(locator), [locator])
  const pulseRef = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!pulseRef.current) return
    const pulse = 1 + Math.sin(clock.elapsedTime * 4.5) * 0.16
    pulseRef.current.scale.setScalar(pulse)
  })

  return (
    <group position={pose.position}>
      <pointLight color="#a78bfa" intensity={5} distance={8} />
      <group ref={pulseRef}>
        <mesh renderOrder={20}><sphereGeometry args={[0.38, 24, 24]} /><meshStandardMaterial color="#ddd6fe" emissive="#8b5cf6" emissiveIntensity={4} depthTest={false} /></mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} renderOrder={19}><torusGeometry args={[0.72, 0.075, 16, 48]} /><meshStandardMaterial color="#a78bfa" emissive="#7c3aed" emissiveIntensity={3} depthTest={false} /></mesh>
      </group>
      <Html position={[0, 1.45, 0]} center distanceFactor={11} zIndexRange={[100, 0]}>
        <div style={{ width: 210, padding: '9px 10px', borderRadius: 9, border: '1px solid #8b5cf6', background: 'rgba(10,16,27,.94)', color: '#e9e5ff', boxShadow: '0 10px 32px rgba(0,0,0,.45)', pointerEvents: 'auto', fontFamily: 'system-ui, sans-serif' }}>
          <div style={{ color: '#c4b5fd', fontSize: 9, fontWeight: 900, letterSpacing: '.08em' }}>ATA {locator.ata} · APPROX. TRAINING LOCATION</div>
          <div style={{ fontSize: 12, fontWeight: 900, marginTop: 3 }}>{locator.short}</div>
          <div style={{ color: '#b6c6d2', fontSize: 9, lineHeight: 1.35, marginTop: 3 }}>{locator.name}</div>
          <div style={{ color: '#7895a8', fontSize: 8.5, lineHeight: 1.35, marginTop: 5 }}>{locator.location}</div>
          {onClear && <button onClick={(e) => { e.stopPropagation(); onClear() }} style={{ marginTop: 7, border: '1px solid #40566a', borderRadius: 6, background: '#101d28', color: '#c9d9e4', padding: '4px 7px', fontSize: 8.5, cursor: 'pointer' }}>Locator kapat</button>}
        </div>
      </Html>
    </group>
  )
}

function EquipmentCameraController({ locator }: { locator?: EquipmentLocatorRequest | null }) {
  const { camera, controls } = useThree()
  const animationRef = useRef({ id: '', active: false })

  useFrame((_, delta) => {
    if (!locator) {
      animationRef.current.id = ''
      animationRef.current.active = false
      return
    }
    if (animationRef.current.id !== locator.id) {
      animationRef.current.id = locator.id
      animationRef.current.active = true
    }
    if (!animationRef.current.active) return

    const pose = getEquipmentLocatorPose(locator)
    const desiredCamera = new THREE.Vector3(...pose.cameraPosition)
    const desiredTarget = new THREE.Vector3(...pose.target)
    const alpha = 1 - Math.exp(-delta * 4.3)
    camera.position.lerp(desiredCamera, alpha)

    const orbit = controls as { target?: THREE.Vector3; update?: () => void } | null
    if (orbit?.target) orbit.target.lerp(desiredTarget, alpha)
    camera.lookAt(orbit?.target || desiredTarget)
    orbit?.update?.()

    if (camera.position.distanceTo(desiredCamera) < 0.08 && (!orbit?.target || orbit.target.distanceTo(desiredTarget) < 0.05)) {
      camera.position.copy(desiredCamera)
      if (orbit?.target) orbit.target.copy(desiredTarget)
      orbit?.update?.()
      animationRef.current.active = false
    }
  })

  return null
}

function Aircraft({ selected, onSelect, damaged, equipmentLocator, onClearEquipmentLocator }: Props) {
  const [hover, setHover] = useState<string | null>(null)
  const active = (part: string) => selected === part || hover === part
  const wingMode = WING_PARTS.has(selected)
  const fuselageGeometry = useMemo(() => createFuselageGeometry(), [])
  const locatorPose = equipmentLocator ? getEquipmentLocatorPose(equipmentLocator) : null
  const fuselageOpacity = locatorPose?.internal && (locatorPose.surface === 'fuselage' || locatorPose.surface === 'tail') ? 0.24 : 1
  const wingOpacity = locatorPose?.internal && locatorPose.surface === 'wing' ? 0.2 : 1
  const engineOpacity = locatorPose?.internal && locatorPose.surface === 'engine' ? 0.28 : 1

  return (
    <group rotation={[0, AIRCRAFT_YAW, 0]}>
      <group onPointerOver={(e) => { e.stopPropagation(); setHover('fuselage') }} onPointerOut={() => setHover(null)} onClick={(e) => { e.stopPropagation(); onSelect('fuselage') }}>
        <mesh geometry={fuselageGeometry} castShadow receiveShadow><SurfaceMaterial active={active('fuselage')} base="#dfe4e8" opacity={fuselageOpacity} /></mesh>
      </group>

      <group onPointerOver={() => setHover('wing')} onPointerOut={() => setHover(null)}>
        <WingShell side={1} active={active('wing')} damaged={damaged} cutaway={wingMode} opacity={wingOpacity} onSelect={() => onSelect('wing')} />
        <WingShell side={-1} active={active('wing')} damaged={damaged} cutaway={false} opacity={wingOpacity} onSelect={() => onSelect('wing')} />
      </group>
      {wingMode && <WingStructure selected={selected} onSelect={onSelect} />}

      <group onPointerOver={() => setHover('engine')} onPointerOut={() => setHover(null)}>
        <Engine side={1} active={active('engine')} opacity={engineOpacity} onSelect={() => onSelect('engine')} />
        <Engine side={-1} active={active('engine')} opacity={engineOpacity} onSelect={() => onSelect('engine')} />
      </group>

      <group onPointerOver={() => setHover('tail')} onPointerOut={() => setHover(null)}>
        <HorizontalTail side={1} active={active('tail')} onSelect={() => onSelect('tail')} />
        <HorizontalTail side={-1} active={active('tail')} onSelect={() => onSelect('tail')} />
        <VerticalTail active={active('tail')} onSelect={() => onSelect('tail')} />
      </group>

      {equipmentLocator && <EquipmentMarker locator={equipmentLocator} onClear={onClearEquipmentLocator} />}

      {damaged && wingMode && <mesh position={[-1.4, 0.72, 16.8]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[1.0, 0.13, 18, 48]} /><meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={3} /></mesh>}
    </group>
  )
}

export default function AircraftScene(props: Props) {
  return (
    <Canvas camera={{ position: [18, 48, 42], fov: 34 }} shadows dpr={[1, 1.7]}>
      <color attach="background" args={['#071019']} />
      <fog attach="fog" args={['#071019', 70, 125]} />
      <ambientLight intensity={1.05} />
      <directionalLight position={[20, 30, 16]} intensity={3.3} castShadow />
      <directionalLight position={[-20, 12, -18]} intensity={1.3} />
      <Aircraft {...props} />
      <Grid position={[0, -4.4, 0]} args={[150, 150]} cellSize={2} sectionSize={10} fadeDistance={100} fadeStrength={1.5} />
      <OrbitControls makeDefault enablePan minDistance={8} maxDistance={92} target={[0, 0, 0]} />
      <EquipmentCameraController locator={props.equipmentLocator} />
    </Canvas>
  )
}
