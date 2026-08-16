export type EngineeringPart = {
  id: string
  name: string
  category: string
  material: string
  function: string
  loads: string[]
  designDrivers: string[]
  manufacturing: string[]
  interfaces: string[]
}

export const engineeringParts: Record<string, EngineeringPart> = {
  fuselage: {
    id: 'fuselage',
    name: 'Fuselage Primary Structure',
    category: 'Structure',
    material: 'Al-Li / CFRP hybrid demonstrator',
    function: 'Carries cabin pressure, global bending and local interface loads between wing, tail and landing gear regions.',
    loads: ['Cabin pressure', 'Global bending', 'Torsion', 'Landing / ground loads'],
    designDrivers: ['Fatigue & damage tolerance', 'Buckling', 'Pressure-cycle durability', 'Maintainability'],
    manufacturing: ['Shell panels', 'Frames & stringers', 'Drilling / fastening', 'Sealant & protective finish'],
    interfaces: ['Wing carry-through region', 'Empennage', 'Floor grid', 'Doors / cut-outs'],
  },
  wing: {
    id: 'wing',
    name: 'Wing Box',
    category: 'Structure + Aerodynamics',
    material: 'CFRP skins + metallic fittings',
    function: 'Generates lift and transfers distributed aerodynamic loads into the center wing / fuselage structure.',
    loads: ['Lift distribution', 'Bending moment', 'Shear force', 'Torsion', 'Fuel / inertia loads'],
    designDrivers: ['Strength', 'Buckling', 'Flutter stiffness', 'Fatigue / impact tolerance'],
    manufacturing: ['Composite skin layup', 'Spars & ribs', 'Cure / inspection', 'Final drilling & assembly'],
    interfaces: ['Pylon', 'Flaps / spoilers', 'Wing root fittings', 'Fuel system'],
  },
  engine: {
    id: 'engine',
    name: 'High-Bypass Turbofan Installation',
    category: 'Propulsion',
    material: 'Multi-material thermal / structural system',
    function: 'Provides thrust while transferring engine weight, thrust, torque and transient loads through the pylon.',
    loads: ['Thrust', 'Gyroscopic loads', 'Vibration', 'Thermal gradients', 'Maneuver inertia'],
    designDrivers: ['Thermal capability', 'Vibration / HCF', 'Containment', 'Fire-zone separation'],
    manufacturing: ['Machining', 'Casting / forging', 'Coatings', 'Precision assembly'],
    interfaces: ['Pylon mounts', 'Fuel', 'Electrical', 'Bleed / ECS interfaces'],
  },
  tail: {
    id: 'tail',
    name: 'Empennage',
    category: 'Stability & Control',
    material: 'CFRP primary structure',
    function: 'Provides longitudinal and directional stability and transmits control-surface loads into the aft fuselage.',
    loads: ['Tailplane lift', 'Rudder side load', 'Gust loads', 'Control actuator loads'],
    designDrivers: ['Stiffness', 'Control effectiveness', 'Flutter', 'Damage tolerance'],
    manufacturing: ['Composite skins', 'Spars / ribs', 'Bonded + fastened joints', 'Surface finishing'],
    interfaces: ['Aft fuselage', 'Elevator', 'Rudder', 'Actuation systems'],
  },
}

export const layers = ['Overview', 'Aerodynamics', 'Structure', 'Loads', 'Manufacturing', 'Systems'] as const
