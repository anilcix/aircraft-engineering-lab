#!/usr/bin/env python3
import datetime as dt
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
base_path = root / 'public' / 'aviation-accidents.json'
additions_path = root / 'data' / 'global-air-accident-additions.json'

base = json.loads(base_path.read_text(encoding='utf-8'))
additions = json.loads(additions_path.read_text(encoding='utf-8'))

items_by_id = {item['id']: item for item in base.get('items', []) if item.get('id')}
for item in additions.get('items', []):
    if item.get('id'):
        items_by_id[item['id']] = item

items = list(items_by_id.values())
items.sort(key=lambda x: (x.get('date', ''), x.get('title', '')), reverse=True)

base['items'] = items
base['updatedAt'] = dt.datetime.now(dt.timezone.utc).isoformat().replace('+00:00', 'Z')
base['coverageNote'] = additions.get('coverageNote', base.get('coverageNote', ''))
base['ageNote'] = (
    'Aircraft ages are approximate where shown. Global accident counts and fatality totals reflect only indexed, '
    'verified records currently present in the federated dataset; ongoing investigations and ground-fatality totals '
    'may be incomplete until the responsible authority publishes reconciled figures.'
)

base_path.write_text(json.dumps(base, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'Merged {len(additions.get("items", []))} expansion records; global index now has {len(items)} unique cases.')
