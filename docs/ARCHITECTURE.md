# Architecture

## Core rule
The AEL aircraft is a fictional educational demonstrator. Geometry, loads and risk indicators are explicitly separated from OEM / certified aircraft data.

## Frontend
- Next.js App Router
- React + TypeScript
- React Three Fiber / Three.js
- Static export for early GitHub Pages deployment

## Domain model (planned)
`Aircraft -> Zone -> Assembly -> Part -> Feature -> Interface -> LoadPath -> FailureMode -> ManufacturingStep -> Requirement -> Source`

Every selectable 3D object should eventually reference a stable engineering object ID rather than embedding engineering data directly in the mesh component.

## Simulation strategy
The project should use three levels:
1. **Illustrative** — qualitative arrows / color fields.
2. **Reduced-order engineering models** — transparent equations and assumptions executed in-browser.
3. **Imported analysis results** — optional precomputed FEA / CFD datasets later.

Do not present illustrative or reduced-order results as certified aircraft analysis.

## Data separation
- `/components`: visualization and UI
- `/lib`: typed domain data / calculation helpers
- `/public/models`: future GLB assets
- `/public/data`: future static engineering datasets
- `/docs`: architecture, assumptions and verification notes
