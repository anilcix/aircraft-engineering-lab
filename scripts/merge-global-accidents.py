#!/usr/bin/env python3
import datetime as dt
import json
import re
from pathlib import Path

root = Path(__file__).resolve().parents[1]
base_path = root / 'public' / 'aviation-accidents.json'
additions_path = root / 'data' / 'global-air-accident-additions.json'
discovery_path = root / 'data' / 'wikidata-aviation-accident-discovery.json'

base = json.loads(base_path.read_text(encoding='utf-8'))
additions = json.loads(additions_path.read_text(encoding='utf-8'))
discovery = json.loads(discovery_path.read_text(encoding='utf-8')) if discovery_path.exists() else {'items': []}


def norm(text):
    return re.sub(r'[^a-z0-9]+', '', str(text or '').lower())


def signature(item):
    return f"{item.get('date', '')}|{norm(item.get('title', ''))}"


def has_coords(item):
    return isinstance(item.get('latitude'), (int, float)) and isinstance(item.get('longitude'), (int, float))


def copy_coords(target, source):
    if not has_coords(target) and has_coords(source):
        target['latitude'] = source['latitude']
        target['longitude'] = source['longitude']
        target['coordinateSource'] = source.get('coordinateSource', 'Wikidata discovery match')


# Official/curated layer remains authoritative for cause, fatality and investigation findings.
official_seed = [item for item in base.get('items', []) if item.get('sourceTier') != 'discovery']
items_by_id = {}
official_signatures = set()
signature_to_official_id = {}

for item in official_seed:
    if not item.get('id'):
        continue
    item = dict(item)
    item.setdefault('sourceTier', 'official')
    item.setdefault('verificationStatus', 'official-source indexed')
    items_by_id[item['id']] = item
    sig = signature(item)
    official_signatures.add(sig)
    signature_to_official_id[sig] = item['id']

for item in additions.get('items', []):
    if not item.get('id'):
        continue
    item = dict(item)
    item['sourceTier'] = 'official'
    item.setdefault('verificationStatus', 'official-source indexed')
    items_by_id[item['id']] = item
    sig = signature(item)
    official_signatures.add(sig)
    signature_to_official_id[sig] = item['id']

# Discovery may enrich map coordinates on an already-official event, but never overwrite cause/status.
for item in discovery.get('items', []):
    sig = signature(item)
    official_id = signature_to_official_id.get(sig)
    if official_id:
        copy_coords(items_by_id[official_id], item)

# Wikidata is retained strictly as a broad coverage/discovery layer.
discovery_added = 0
for item in discovery.get('items', []):
    if not item.get('id'):
        continue
    sig = signature(item)
    if sig in official_signatures or item['id'] in items_by_id:
        continue
    item = dict(item)
    item['sourceTier'] = 'discovery'
    item['verificationStatus'] = 'secondary structured discovery — cause not authoritative'
    item['probableCause'] = ''
    items_by_id[item['id']] = item
    discovery_added += 1

items = list(items_by_id.values())
items.sort(key=lambda x: (x.get('date', ''), x.get('title', '')), reverse=True)

official_count = sum(1 for item in items if item.get('sourceTier') != 'discovery')
discovery_count = sum(1 for item in items if item.get('sourceTier') == 'discovery')
coordinate_count = sum(1 for item in items if has_coords(item))

base['items'] = items
base['updatedAt'] = dt.datetime.now(dt.timezone.utc).isoformat().replace('+00:00', 'Z')
base['coverageNote'] = (
    f"Federated global aviation safety index: {official_count} official/curated cases plus "
    f"{discovery_count} Wikidata discovery records for coverage. "
    "Discovery records are excluded from authoritative cause analysis until verified against an Annex 13 authority."
)
base['discoveryNote'] = (
    "Wikidata is used only to expand case, timeline and map coverage. "
    "Its discovery records are not treated as authoritative probable-cause or investigation findings."
)
base['ageNote'] = (
    'Aircraft ages are approximate where shown. Official-layer fatality/cause statistics use verified or curated records; '
    'discovery-layer values may be incomplete and are kept separate.'
)
base['mapNote'] = (
    f'{coordinate_count} indexed records currently include structured map coordinates. '
    'Discovery coordinates improve coverage but do not imply cause verification.'
)
base['counts'] = {
    'officialIndexed': official_count,
    'discovery': discovery_count,
    'totalVisible': len(items),
    'withCoordinates': coordinate_count,
}

base_path.write_text(json.dumps(base, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(
    f'Merged verified + discovery layers: {official_count} official, '
    f'{discovery_count} discovery ({discovery_added} accepted this run), '
    f'{coordinate_count} with coordinates, {len(items)} total.'
)
