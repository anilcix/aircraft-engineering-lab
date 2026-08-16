#!/usr/bin/env python3
import datetime as dt
import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data' / 'wikidata-aviation-accident-discovery.json'
ENDPOINT = 'https://query.wikidata.org/sparql'

BASE_QUERY = r'''
SELECT DISTINCT ?event ?eventLabel ?date ?deaths ?operatorLabel ?aircraftLabel ?locationLabel ?countryLabel ?article WHERE {
  ?event wdt:P31 wd:Q744913 ;
         wdt:P585 ?date .
  FILTER(YEAR(?date) >= 1910)
  OPTIONAL { ?event wdt:P1120 ?deaths . }
  OPTIONAL { ?event wdt:P137 ?operator . }
  OPTIONAL { ?event wdt:P121 ?aircraft . }
  OPTIONAL { ?event wdt:P276 ?location . }
  OPTIONAL { ?event wdt:P17 ?country . }
  OPTIONAL {
    ?article schema:about ?event ;
             schema:isPartOf <https://en.wikipedia.org/> .
  }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,tr". }
}
ORDER BY DESC(?date)
LIMIT 12000
'''

COORD_QUERY = r'''
SELECT DISTINCT ?event ?eventCoord ?locationCoord WHERE {
  ?event wdt:P31 wd:Q744913 ;
         wdt:P585 ?date .
  FILTER(YEAR(?date) >= __START__ && YEAR(?date) <= __END__)
  OPTIONAL { ?event wdt:P625 ?eventCoord . }
  OPTIONAL {
    ?event wdt:P276 ?location .
    ?location wdt:P625 ?locationCoord .
  }
  FILTER(BOUND(?eventCoord) || BOUND(?locationCoord))
}
LIMIT 12000
'''


def family_for(text):
    s = (text or '').upper().replace('_', ' ')
    if '737' in s:
        if 'MAX' in s or re.search(r'737[- ]?(7|8|9|10)\b', s):
            return 'Boeing 737 MAX'
        if re.search(r'737[- ]?(600|700|800|900)', s):
            return 'Boeing 737 NG'
        return 'Boeing 737 Family'
    for token, family in [
        ('777', 'Boeing 777'), ('787', 'Boeing 787'), ('767', 'Boeing 767'), ('757', 'Boeing 757'), ('747', 'Boeing 747'),
        ('A380', 'Airbus A380'), ('A350', 'Airbus A350'), ('A340', 'Airbus A340'), ('A330', 'Airbus A330'),
        ('A321', 'Airbus A320 Family'), ('A320', 'Airbus A320 Family'), ('A319', 'Airbus A320 Family'), ('A318', 'Airbus A320 Family'),
        ('A310', 'Airbus A310'), ('A300', 'Airbus A300'), ('A220', 'Airbus A220'), ('ATR 72', 'ATR 72'), ('ATR72', 'ATR 72'), ('ATR 42', 'ATR 42'),
        ('CRJ', 'Bombardier CRJ'), ('E190', 'Embraer E-Jet'), ('E195', 'Embraer E-Jet'), ('E175', 'Embraer E-Jet'), ('E170', 'Embraer E-Jet'),
        ('EMBRAER 190', 'Embraer E-Jet'), ('EMBRAER 195', 'Embraer E-Jet'), ('MD-80', 'McDonnell Douglas MD-80'),
        ('DC-10', 'McDonnell Douglas DC-10'), ('L-1011', 'Lockheed L-1011'), ('DHC-6', 'DHC-6 Twin Otter'),
    ]:
        if token in s:
            return family
    return text or ''


def b(row, key):
    return row.get(key, {}).get('value', '')


def fetch_query(query, retries=4, timeout=90):
    encoded = urllib.parse.urlencode({'query': query, 'format': 'json'})
    url = ENDPOINT + '?' + encoded
    headers = {
        'Accept': 'application/sparql-results+json',
        'User-Agent': 'AircraftEngineeringLab/0.1 (GitHub Pages educational aviation safety index)'
    }
    last = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=timeout) as response:
                return json.loads(response.read().decode('utf-8'))
        except Exception as exc:
            last = exc
            time.sleep(3 * (attempt + 1))
    raise RuntimeError(f'Wikidata query failed after retries: {last}')


def parse_date(value):
    return value[:10] if value else ''


def int_or_none(value):
    try:
        return int(float(value))
    except Exception:
        return None


def parse_point(value):
    if not value:
        return None
    match = re.search(r'Point\(([-+0-9.]+)\s+([-+0-9.]+)\)', value)
    if not match:
        return None
    lon = float(match.group(1))
    lat = float(match.group(2))
    if not (-180 <= lon <= 180 and -90 <= lat <= 90):
        return None
    return lat, lon


# Preserve any already-known coordinates if a later batch is temporarily unavailable.
existing_coords = {}
if OUT.exists():
    try:
        old = json.loads(OUT.read_text(encoding='utf-8'))
        for item in old.get('items', []):
            if isinstance(item.get('latitude'), (int, float)) and isinstance(item.get('longitude'), (int, float)):
                existing_coords[item.get('id', '').replace('WIKIDATA-', '')] = (
                    item['latitude'], item['longitude'], item.get('coordinateSource', 'previous discovery run')
                )
    except Exception:
        pass

base_data = fetch_query(BASE_QUERY)
rows = base_data.get('results', {}).get('bindings', [])

coordinate_map = dict(existing_coords)
coordinate_failures = []
for start, end in [(1970, 1979), (1980, 1989), (1990, 1999), (2000, 2009), (2010, 2019), (2020, 2026)]:
    query = COORD_QUERY.replace('__START__', str(start)).replace('__END__', str(end))
    try:
        data = fetch_query(query, retries=3, timeout=75)
        coord_rows = data.get('results', {}).get('bindings', [])
        batch_added = 0
        for row in coord_rows:
            event_url = b(row, 'event')
            if not event_url:
                continue
            qid = event_url.rsplit('/', 1)[-1]
            point = parse_point(b(row, 'eventCoord'))
            source = 'Wikidata event coordinate'
            if point is None:
                point = parse_point(b(row, 'locationCoord'))
                source = 'Wikidata event-location coordinate'
            if point is not None and qid not in coordinate_map:
                coordinate_map[qid] = (point[0], point[1], source)
                batch_added += 1
        print(f'Coordinate batch {start}-{end}: {len(coord_rows)} rows, {batch_added} new mapped events.')
    except Exception as exc:
        coordinate_failures.append(f'{start}-{end}: {exc}')
        print(f'WARNING coordinate batch {start}-{end} failed: {exc}')
    time.sleep(1)

by_event = {}
for row in rows:
    event_url = b(row, 'event')
    if not event_url:
        continue
    qid = event_url.rsplit('/', 1)[-1]
    title = b(row, 'eventLabel') or qid
    date = parse_date(b(row, 'date'))
    if not date:
        continue

    rec = by_event.setdefault(qid, {
        'id': f'WIKIDATA-{qid}',
        'date': date,
        'title': title,
        'authority': 'Wikidata discovery',
        'status': 'Discovery record — official verification pending',
        'summary': 'Structured discovery record from Wikidata. Use the linked source to identify the responsible Annex 13 investigation authority before treating causal or fatality data as authoritative.',
        'sourceUrl': event_url,
        'sourceTier': 'discovery',
        'verificationStatus': 'secondary structured discovery',
    })

    if date < rec.get('date', date):
        rec['date'] = date

    operator = b(row, 'operatorLabel')
    if operator and not rec.get('operator'):
        rec['operator'] = operator

    aircraft = b(row, 'aircraftLabel')
    if aircraft and not rec.get('aircraft'):
        rec['aircraft'] = aircraft
        rec['family'] = family_for(aircraft)

    location = b(row, 'locationLabel')
    country = b(row, 'countryLabel')
    location_text = ', '.join(dict.fromkeys(x for x in [location, country] if x))
    if location_text and not rec.get('location'):
        rec['location'] = location_text

    coordinate = coordinate_map.get(qid)
    if coordinate and 'latitude' not in rec:
        rec['latitude'], rec['longitude'], rec['coordinateSource'] = coordinate

    deaths = int_or_none(b(row, 'deaths'))
    if deaths is not None:
        rec['fatalities'] = max(deaths, rec.get('fatalities', 0))

    article = b(row, 'article')
    if article:
        rec['discoveryArticleUrl'] = article

items = list(by_event.values())
items.sort(key=lambda x: (x.get('date', ''), x.get('title', '')), reverse=True)
coord_count = sum(1 for item in items if 'latitude' in item and 'longitude' in item)

payload = {
    'updatedAt': dt.datetime.now(dt.timezone.utc).isoformat().replace('+00:00', 'Z'),
    'source': 'Wikidata Query Service / aviation accident (Q744913)',
    'license': 'Wikidata structured data is CC0',
    'coverageNote': 'Broad secondary discovery layer. Records are not treated as official investigation findings until linked to the responsible national investigation authority.',
    'coordinateNote': f'{coord_count} discovery records include an event or event-location coordinate for the 1970-2026 map timeline.',
    'coordinateBatchWarnings': coordinate_failures,
    'items': items,
}
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'Wrote {OUT}: {len(items)} discovery records, {coord_count} with coordinates, from {len(rows)} base query rows.')
