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
    name: 'Widebody Fuselage Primary Structure',
    category: 'Structure',
    material: 'Al-Li / CFRP hybrid demonstrator',
    function: 'Carries cabin pressure, global bending and local interface loads between wing, tail, floor, cargo and landing-gear regions.',
    loads: ['Cabin pressure', 'Global bending', 'Torsion', 'Landing / ground loads'],
    designDrivers: ['Fatigue & damage tolerance', 'Buckling', 'Pressure-cycle durability', 'Maintainability'],
    manufacturing: ['Shell panels', 'Frames & stringers', 'Drilling / fastening', 'Sealant & protective finish'],
    interfaces: ['Wing carry-through region', 'Empennage', 'Floor grid', 'Doors / cut-outs'],
  },
  wing: {
    id: 'wing',
    name: 'Widebody Wing Box',
    category: 'Structure + Aerodynamics',
    material: 'CFRP skins with metallic / composite substructure',
    function: 'Generates lift and transfers distributed aerodynamic and inertia loads through skins, stringers, ribs and spars toward the wing root and center structure.',
    loads: ['Distributed lift', 'Bending moment', 'Shear force', 'Torsion', 'Fuel / engine inertia'],
    designDrivers: ['Strength', 'Buckling', 'Aeroelastic stiffness', 'Fatigue / impact tolerance'],
    manufacturing: ['Skin manufacture', 'Spar / rib manufacture', 'Subassembly', 'Final drilling & joining'],
    interfaces: ['Pylon', 'High-lift system', 'Wing root', 'Fuel system'],
  },
  'front-spar': {
    id: 'front-spar',
    name: 'Front Spar',
    category: 'Primary Wing Structure',
    material: 'CFRP / high-strength metallic fittings concept',
    function: 'Forms the forward boundary of the wing box and carries a major share of vertical shear, bending-related axial load and torsional shear flow.',
    loads: ['Vertical shear', 'Axial tension / compression', 'Torsional shear flow', 'Local pylon / system reactions'],
    designDrivers: ['Web shear buckling', 'Cap strength', 'Joint load introduction', 'Damage tolerance'],
    manufacturing: ['Spar web / cap manufacture', 'Inspection', 'Drilling / interface preparation', 'Wing-box assembly'],
    interfaces: ['Upper skin', 'Lower skin', 'Ribs', 'Pylon / leading-edge structure'],
  },
  'rear-spar': {
    id: 'rear-spar',
    name: 'Rear Spar',
    category: 'Primary Wing Structure',
    material: 'CFRP / high-strength metallic fittings concept',
    function: 'Forms the aft boundary of the wing box, participates in bending and torsion load transfer and receives major high-lift / control-surface interface loads.',
    loads: ['Vertical shear', 'Axial load', 'Torsional shear flow', 'Flap / spoiler interface reactions'],
    designDrivers: ['Shear buckling', 'Joint strength', 'Actuator / hinge load introduction', 'Fatigue'],
    manufacturing: ['Spar manufacture', 'Fitting installation', 'Precision drilling', 'Wing-box closure'],
    interfaces: ['Skins', 'Ribs', 'Flap support structure', 'Actuation systems'],
  },
  rib: {
    id: 'rib',
    name: 'Wing Rib',
    category: 'Wing Substructure',
    material: 'Aluminium / CFRP rib concept',
    function: 'Maintains the wing aerodynamic section, stabilizes skins and spars, and redistributes local loads between the front and rear spars.',
    loads: ['Local aerodynamic pressure transfer', 'Fuel pressure / inertia', 'Skin stabilization reactions', 'Concentrated equipment loads'],
    designDrivers: ['Web buckling', 'Cut-out reinforcement', 'Fastener bearing', 'Weight efficiency'],
    manufacturing: ['Machining / forming', 'Cut-outs and edge finishing', 'Surface protection', 'Fastened installation'],
    interfaces: ['Front spar', 'Rear spar', 'Upper / lower skin', 'Systems brackets'],
  },
  stringer: {
    id: 'stringer',
    name: 'Wing Stringer',
    category: 'Skin Stiffening',
    material: 'CFRP stiffener / metallic concept',
    function: 'Stiffens the wing skin against buckling and carries spanwise axial load generated primarily by wing bending.',
    loads: ['Spanwise axial tension / compression', 'Local bending', 'Skin-stringer shear transfer'],
    designDrivers: ['Compression buckling', 'Bond / fastener integrity', 'Run-out design', 'Impact tolerance'],
    manufacturing: ['Pultrusion / layup or extrusion', 'Trim and inspection', 'Bond / fastening preparation', 'Skin integration'],
    interfaces: ['Upper / lower skin', 'Ribs', 'Spar caps', 'Stringer run-outs'],
  },
  engine: {
    id: 'engine',
    name: 'Large High-Bypass Turbofan Installation',
    category: 'Propulsion',
    material: 'Multi-material thermal / structural system',
    function: 'Provides thrust while transferring engine mass, thrust, torque and transient loads into the wing through the pylon.',
    loads: ['Thrust', 'Gyroscopic loads', 'Vibration', 'Thermal gradients', 'Maneuver inertia'],
    designDrivers: ['Thermal capability', 'Vibration / HCF', 'Containment', 'Fire-zone separation'],
    manufacturing: ['Machining', 'Casting / forging', 'Coatings', 'Precision assembly'],
    interfaces: ['Pylon mounts', 'Fuel', 'Electrical', 'Bleed / ECS interfaces'],
  },
  tail: {
    id: 'tail',
    name: 'Widebody Empennage',
    category: 'Stability & Control',
    material: 'CFRP primary structure concept',
    function: 'Provides longitudinal and directional stability and transfers control-surface loads into the aft fuselage.',
    loads: ['Tailplane lift', 'Rudder side load', 'Gust loads', 'Control actuator loads'],
    designDrivers: ['Stiffness', 'Control effectiveness', 'Flutter', 'Damage tolerance'],
    manufacturing: ['Composite skins', 'Spars / ribs', 'Bonded + fastened joints', 'Surface finishing'],
    interfaces: ['Aft fuselage', 'Elevator', 'Rudder', 'Actuation systems'],
  },
}

export const layers = ['Overview', 'Aerodynamics', 'Structure', 'Loads', 'Manufacturing', 'Systems'] as const
