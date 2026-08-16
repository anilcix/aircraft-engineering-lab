# Aircraft Engineering Lab — AEL-180

V0.1 interactive aircraft engineering demonstrator. The AEL-180 is an original, generic commercial transport concept created for educational visualization; it does not use OEM CAD data.

## What is included

- Original parametric-style commercial aircraft geometry rendered in the browser
- Clickable fuselage, wing, engine and empennage regions
- Engineering information panel
- Engineering layer tabs
- Conceptual wing damage toggle
- GitHub Pages deployment workflow

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Production build

```bash
npm run build
```

The static website is generated under `out/`.

## Roadmap

1. V0.1 — interactive aircraft shell and engineering panel
2. V0.2 — wing cutaway: skins, spars, ribs, stringers, fasteners
3. V0.3 — animated load path and load redistribution after damage
4. V0.4 — manufacturing / assembly sequence and GD&T knowledge objects
5. V0.5 — propulsion thermal / structural layer
6. V0.6 — systems networks and technology news feed

## Engineering disclaimer

This project is an educational engineering visualization. Values, geometries and risk states are not approved aircraft design data and must not be used for airworthiness, maintenance or operational decisions.
