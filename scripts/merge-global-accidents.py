#!/usr/bin/env python3
import datetime as dt
import json
import re
from pathlib import Path

root = Path(__file__).resolve().parents[1]
base_path = root / 'public' / 'aviation-accidents.json'
additions_path = root / 'data' / 'global-air-accident-additions.json'

base = json.loads(base_path.read_text(encoding='utf-8'))
additions = json.loads(additions_path.read_text(encoding='utf-8'))


def norm(text):
    return re.sub(r'[^a-z0-9]+', '', str(text or '').lower())


def signature(item):
    return f"{item.get('date', '')}|{norm(item.get('title', ''))}"


def has_coords(item):
    return isinstance(item.get('latitude'), (int, float)) and isinstance(item.get('longitude'), (int, float))


# Keep only non-discovery records from the existing index. This intentionally
# removes the old Wikidata-derived discovery layer.
official_seed = [item for item in base.get('items', []) if item.get('sourceTier') != 'discovery' and not str(item.get('id', '')).startswith('WIKIDATA-')]
items_by_id = {}
signatures = set()

for item in official_seed:
    if not item.get('id'):
        continue
    item = dict(item)
    item.setdefault('sourceTier', 'official')
    item.setdefault('verificationStatus', 'official-source indexed')
    items_by_id[item['id']] = item
    signatures.add(signature(item))

# Curated official-source additions always win over older rows.
for item in additions.get('items', []):
    if not item.get('id'):
        continue
    item = dict(item)
    item['sourceTier'] = 'official'
    item.setdefault('verificationStatus', 'official-source indexed')
    items_by_id[item['id']] = item
    signatures.add(signature(item))

items = list(items_by_id.values())
items.sort(key=lambda x: (x.get('date', ''), x.get('title', '')), reverse=True)

official_count = len(items)
coordinate_count = sum(1 for item in items if has_coords(item))

base['items'] = items
base['updatedAt'] = dt.datetime.now(dt.timezone.utc).isoformat().replace('+00:00', 'Z')
base['coverageNote'] = (
    f"Curated global aviation safety index: {official_count} official-source indexed cases. "
    "Wikidata and unverified structured-discovery records are excluded. "
    "This is an expanding verified index, not a complete worldwide accident census."
)
base['discoveryNote'] = (
    "Unverified Wikidata discovery has been disabled. New cases should enter through "
    "official investigation authorities or curated high-quality aviation sources."
)
base['ageNote'] = (
    'Aircraft ages are approximate where shown. Fatality and cause totals reflect only indexed records '
    'that remain in the verified/curated layer.'
)
base['mapNote'] = (
    f'{coordinate_count} indexed records currently include map coordinates. '
    'Records without coordinates remain searchable in the case library but are omitted from the map.'
)
base['counts'] = {
    'officialIndexed': official_count,
    'discovery': 0,
    'totalVisible': len(items),
    'withCoordinates': coordinate_count,
}

base_path.write_text(json.dumps(base, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'Rebuilt verified accident index: {official_count} official/curated, 0 discovery, {coordinate_count} with coordinates.')
