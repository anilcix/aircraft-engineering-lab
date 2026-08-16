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

# Remove the previous generated discovery layer on every run so stale Wikidata
# records do not remain indefinitely if the discovery source changes.
official_seed = [item for item in base.get('items', []) if item.get('sourceTier') != 'discovery']
items_by_id = {}
official_signatures = set()

for item in official_seed:
    if not item.get('id'):
        continue
    item = dict(item)
    item.setdefault('sourceTier', 'official')
    item.setdefault('verificationStatus', 'official-source indexed')
    items_by_id[item['id']] = item
    official_signatures.add(signature(item))

# Explicit official-source additions always win over older records.
for item in additions.get('items', []):
    if not item.get('id'):
        continue
    item = dict(item)
    item['sourceTier'] = 'official'
    item.setdefault('verificationStatus', 'official-source indexed')
    items_by_id[item['id']] = item
    official_signatures.add(signature(item))

# Broad CC0 discovery records fill coverage gaps but never overwrite a matching
# official record. Exact title/date duplicates are suppressed.
discovery_added = 0
for item in discovery.get('items', []):
    if not item.get('id'):
        continue
    sig = signature(item)
    if sig in official_signatures:
        continue
    if item['id'] in items_by_id:
        continue
    item = dict(item)
    item['sourceTier'] = 'discovery'
    item.setdefault('verificationStatus', 'secondary structured discovery')
    items_by_id[item['id']] = item
    discovery_added += 1

items = list(items_by_id.values())
items.sort(key=lambda x: (x.get('date', ''), x.get('title', '')), reverse=True)

official_count = sum(1 for item in items if item.get('sourceTier') != 'discovery')
discovery_count = sum(1 for item in items if item.get('sourceTier') == 'discovery')

base['items'] = items
base['updatedAt'] = dt.datetime.now(dt.timezone.utc).isoformat().replace('+00:00', 'Z')
base['coverageNote'] = (
    f"Federated global aviation safety index: {official_count} official-source indexed cases plus "
    f"{discovery_count} secondary discovery records awaiting authority-level verification. "
    "This is an expanding index, not a complete worldwide accident census."
)
base['discoveryNote'] = discovery.get('coverageNote', '')
base['ageNote'] = (
    'Aircraft ages are approximate where shown. Official-layer fatality totals reflect only indexed, verified records. '
    'Discovery-layer values may be incomplete or inconsistent and are excluded from official dashboard totals until verified.'
)
base['counts'] = {
    'officialIndexed': official_count,
    'discovery': discovery_count,
    'totalVisible': len(items),
}

base_path.write_text(json.dumps(base, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(
    f'Merged official + discovery layers: {official_count} official, '
    f'{discovery_count} discovery ({discovery_added} newly accepted this run), {len(items)} total.'
)
