#!/usr/bin/env python3
import csv
import datetime as dt
import json
import os
import re
import subprocess
import sys
from collections import defaultdict

if len(sys.argv) < 3:
    raise SystemExit('usage: build-ntsb-accident-stats.py <database.mdb> <output.json>')

mdb_path = sys.argv[1]
out_path = sys.argv[2]

CAUSE_RULES = [
    ('Pilot / flight crew', [
        r'\bpilot\b', r'flight crew', r'cockpit crew', r'crew performance', r'aircraft control',
        r'decision[- ]making', r'situational awareness', r'procedur(?:e|al)', r'visual lookout',
        r'failure to maintain', r'failure to follow', r'fatigue', r'spatial disorientation',
    ]),
    ('Maintenance / inspection', [
        r'maintenance', r'inspection', r'mechanic', r'servic(?:e|ing)', r'improper repair',
        r'inadequate repair', r'overhaul', r'quality control', r'quality assurance', r'workmanship',
    ]),
    ('Structural / material', [
        r'structur(?:e|al)', r'fatigue crack', r'\bcrack(?:ed|ing)?\b', r'fracture', r'corrosion',
        r'buckl(?:e|ing)', r'delamination', r'material failure', r'airframe', r'adhesive bond',
        r'composite', r'metal fatigue', r'separation of .*structure',
    ]),
    ('Engine / powerplant', [
        r'engine', r'powerplant', r'turbine', r'compressor', r'combustor', r'propeller',
        r'thrust', r'power loss', r'engine failure', r'rotor',
    ]),
    ('Aircraft systems / component', [
        r'hydraulic', r'electrical', r'flight control', r'avionic', r'landing gear', r'actuator',
        r'sensor', r'instrument', r'autopilot', r'component failure', r'system failure', r'control cable',
    ]),
    ('Weather / environment', [
        r'weather', r'icing', r'ice accretion', r'wind shear', r'thunderstorm', r'turbulence',
        r'visibility', r'\bfog\b', r'\brain\b', r'\bsnow\b', r'crosswind', r'convective', r'lightning',
    ]),
    ('ATC / airport / ground infrastructure', [
        r'air traffic control', r'controller', r'runway', r'taxiway', r'airport', r'ground control',
        r'runway incursion', r'runway excursion', r'airfield', r'lighting system', r'signage',
    ]),
    ('Fuel / fire / explosion', [
        r'fuel', r'fire', r'explosion', r'flammable', r'combustion', r'fuel starvation', r'fuel exhaustion',
    ]),
]

COMPILED_CAUSE_RULES = [(name, [re.compile(p, re.I) for p in patterns]) for name, patterns in CAUSE_RULES]


def norm(value):
    return re.sub(r'[^a-z0-9]', '', str(value or '').lower())


def get(row, *aliases):
    lookup = {norm(k): v for k, v in row.items()}
    for alias in aliases:
        key = norm(alias)
        if key in lookup and str(lookup[key]).strip():
            return str(lookup[key]).strip()
    return ''


def number(value):
    try:
        if value is None or str(value).strip() == '':
            return None
        return float(str(value).replace(',', '').strip())
    except Exception:
        return None


def integer(value):
    n = number(value)
    return int(n) if n is not None else None


def parse_date(value):
    text = str(value or '').strip()
    date_token = text.split()[0] if text else ''
    for candidate in (text, date_token):
        for fmt in ('%m/%d/%Y %H:%M:%S', '%m/%d/%y %H:%M:%S', '%m/%d/%Y', '%m/%d/%y', '%Y-%m-%d', '%Y/%m/%d'):
            try:
                return dt.datetime.strptime(candidate, fmt).date()
            except Exception:
                pass
    try:
        return dt.datetime.fromisoformat(text.replace('Z', '+00:00')).date()
    except Exception:
        return None


def family_for(make, model):
    m = f'{make} {model}'.upper().replace('_', ' ')
    if 'BOEING' in m:
        if '777' in m: return 'Boeing 777'
        if '787' in m: return 'Boeing 787'
        if '767' in m: return 'Boeing 767'
        if '757' in m: return 'Boeing 757'
        if '747' in m: return 'Boeing 747'
        if '737' in m:
            if 'MAX' in m or re.search(r'737[- ]?(7|8|9|10)\b', m): return 'Boeing 737 MAX'
            if re.search(r'737[- ]?(600|700|800|900)', m): return 'Boeing 737 NG'
            return 'Boeing 737 Family'
    if 'AIRBUS' in m:
        if any(x in m for x in ('A318', 'A319', 'A320', 'A321')): return 'Airbus A320 Family'
        if 'A300' in m: return 'Airbus A300'
        if 'A310' in m: return 'Airbus A310'
        if 'A330' in m: return 'Airbus A330'
        if 'A340' in m: return 'Airbus A340'
        if 'A350' in m: return 'Airbus A350'
        if 'A380' in m: return 'Airbus A380'
    if 'MCDONNELL' in m or 'DOUGLAS' in m:
        if 'DC-10' in m or 'DC10' in m: return 'McDonnell Douglas DC-10'
        if 'MD-11' in m or 'MD11' in m: return 'McDonnell Douglas MD-11'
        if re.search(r'MD[- ]?(80|81|82|83|87|88)', m): return 'McDonnell Douglas MD-80'
    if 'LOCKHEED' in m and ('L-1011' in m or 'L1011' in m): return 'Lockheed L-1011'
    if 'ATR' in m:
        if '72' in m: return 'ATR 72'
        if '42' in m: return 'ATR 42'
    if 'BOMBARDIER' in m or 'CANADAIR' in m:
        if 'CRJ' in m: return 'Bombardier CRJ'
    if 'EMBRAER' in m:
        if any(x in m for x in ('ERJ', 'EMB-145', 'EMB 145')): return 'Embraer ERJ'
        if any(x in m for x in ('E170', 'E175', 'E190', 'E195', '170', '175', '190', '195')): return 'Embraer E-Jet'
    return ''


def export_table(table):
    proc = subprocess.run(['mdb-export', mdb_path, table], check=True, capture_output=True, text=True, errors='replace')
    return list(csv.DictReader(proc.stdout.splitlines()))


def row_text(row):
    parts = []
    for value in row.values():
        text = str(value or '').strip()
        if len(text) >= 3 and re.search(r'[A-Za-z]', text):
            parts.append(text)
    return ' | '.join(parts)


def classify_text(text):
    if not text:
        return set()
    matches = set()
    for category, patterns in COMPILED_CAUSE_RULES:
        if any(pattern.search(text) for pattern in patterns):
            matches.add(category)
    return matches


def cause_rows(event_ids, event_causes):
    counts = defaultdict(int)
    for event_id in event_ids:
        categories = event_causes.get(event_id) or {'Other / uncategorized'}
        for category in categories:
            counts[category] += 1
    denom = max(1, len(event_ids))
    rows = [
        {'category': category, 'count': count, 'percentOfEvents': round(count * 100 / denom, 1)}
        for category, count in counts.items()
    ]
    return sorted(rows, key=lambda x: (-x['count'], x['category']))


tables_raw = subprocess.run(['mdb-tables', '-1', mdb_path], check=True, capture_output=True, text=True).stdout.splitlines()
tables = [x.strip() for x in tables_raw if x.strip()]
by_norm = {norm(t): t for t in tables}


def pick_table(*names, required=True):
    for name in names:
        n = norm(name)
        if n in by_norm:
            return by_norm[n]
    for table in tables:
        if any(norm(name) in norm(table) for name in names):
            return table
    if required:
        raise RuntimeError(f'Could not find table {names}. Available tables: {tables}')
    return None


events_table = pick_table('events', 'event')
aircraft_table = pick_table('aircraft')
findings_table = pick_table('Findings', required=False)
narratives_table = pick_table('narratives', required=False)

event_rows = export_table(events_table)
aircraft_rows = export_table(aircraft_table)
finding_rows = export_table(findings_table) if findings_table else []
narrative_rows = export_table(narratives_table) if narratives_table else []

events = {}
for row in event_rows:
    event_id = get(row, 'ev_id', 'EventId', 'event_id')
    if not event_id:
        continue
    investigation_type = get(row, 'ev_type', 'InvestigationType', 'event_type')
    if investigation_type and 'ACC' not in investigation_type.upper() and 'ACCIDENT' not in investigation_type.upper():
        continue
    date = parse_date(get(row, 'ev_date', 'EventDate', 'event_date'))
    if not date:
        continue
    events[event_id] = {
        'date': date,
        'fatalities': integer(get(row, 'inj_tot_f', 'TotalFatalInjuries', 'total_fatal_injuries')) or 0,
        'country': get(row, 'ev_country', 'Country', 'country'),
        'injury': get(row, 'ev_highest_injury', 'injury_severity', 'InjurySeverity'),
    }

finding_text = defaultdict(list)
for row in finding_rows:
    event_id = get(row, 'ev_id', 'EventId', 'event_id')
    if event_id in events:
        text = row_text(row)
        if text:
            finding_text[event_id].append(text)

narrative_text = defaultdict(list)
for row in narrative_rows:
    event_id = get(row, 'ev_id', 'EventId', 'event_id')
    if event_id in events:
        text = ' | '.join(filter(None, [
            get(row, 'narr_cause', 'prob_cause', 'probable_cause', 'cause'),
            get(row, 'narr_accp', 'narrative', 'factual', 'analysis'),
        ]))
        if text:
            narrative_text[event_id].append(text)

event_causes = {}
for event_id in events:
    primary = ' '.join(finding_text.get(event_id, []))
    categories = classify_text(primary)
    if not categories:
        categories = classify_text(' '.join(narrative_text.get(event_id, [])))
    event_causes[event_id] = categories

recognized_records = 0
recognized_event_ids = set()
family_data = defaultdict(lambda: {
    'events': set(),
    'fatal_events': set(),
    'fatalities_by_event': {},
    'ages': [],
    'models': defaultdict(int),
    'makes': defaultdict(int),
    'operator_data': defaultdict(lambda: {
        'events': set(), 'fatal_events': set(), 'fatalities_by_event': {}, 'ages': []
    }),
})

for row in aircraft_rows:
    event_id = get(row, 'ev_id', 'EventId', 'event_id')
    event = events.get(event_id)
    if not event:
        continue
    make = get(row, 'acft_make', 'Make', 'manufacturer')
    model = get(row, 'acft_model', 'Model', 'aircraft_model')
    family = family_for(make, model)
    if not family:
        continue

    recognized_records += 1
    recognized_event_ids.add(event_id)
    bucket = family_data[family]
    bucket['events'].add(event_id)
    if event['fatalities'] > 0:
        bucket['fatal_events'].add(event_id)
        bucket['fatalities_by_event'][event_id] = event['fatalities']

    age = None
    year = integer(get(row, 'acft_year', 'AircraftYear', 'year_mfr', 'year_of_manufacture'))
    if year and 1900 <= year <= event['date'].year:
        candidate = event['date'].year - year
        if 0 <= candidate <= 80:
            age = float(candidate)
            bucket['ages'].append(age)

    operator = get(row, 'oper_name', 'operator', 'AirCarrier', 'air_carrier')
    if operator and operator.upper() not in {'NONE', 'UNKNOWN', 'UNK', 'N/A'}:
        ob = bucket['operator_data'][operator]
        ob['events'].add(event_id)
        if event['fatalities'] > 0:
            ob['fatal_events'].add(event_id)
            ob['fatalities_by_event'][event_id] = event['fatalities']
        if age is not None:
            ob['ages'].append(age)

    if model:
        bucket['models'][model] += 1
    if make:
        bucket['makes'][make] += 1

stats = []
all_operator_data = defaultdict(lambda: {
    'events': set(), 'fatal_events': set(), 'fatalities_by_event': {}, 'families': set(), 'ages': []
})

for family, bucket in family_data.items():
    ages = bucket['ages']
    make = max(bucket['makes'], key=bucket['makes'].get) if bucket['makes'] else ''
    model = max(bucket['models'], key=bucket['models'].get) if bucket['models'] else ''

    operator_stats = []
    for operator, ob in bucket['operator_data'].items():
        item = {
            'operator': operator,
            'accidents': len(ob['events']),
            'fatalAccidents': len(ob['fatal_events']),
            'fatalities': sum(ob['fatalities_by_event'].values()),
        }
        if ob['ages']:
            item['avgAccidentAircraftAgeYears'] = round(sum(ob['ages']) / len(ob['ages']), 1)
        operator_stats.append(item)

        global_ob = all_operator_data[operator]
        global_ob['events'].update(ob['events'])
        global_ob['fatal_events'].update(ob['fatal_events'])
        global_ob['fatalities_by_event'].update(ob['fatalities_by_event'])
        global_ob['families'].add(family)
        global_ob['ages'].extend(ob['ages'])

    operator_stats.sort(key=lambda x: (-x['accidents'], -x['fatalities'], x['operator']))

    item = {
        'family': family,
        'make': make,
        'model': model,
        'accidents': len(bucket['events']),
        'fatalAccidents': len(bucket['fatal_events']),
        'fatalities': sum(bucket['fatalities_by_event'].values()),
        'causeCategories': cause_rows(bucket['events'], event_causes),
        'operatorStats': operator_stats[:20],
        'sampleOperators': [x['operator'] for x in operator_stats[:8]],
    }
    if ages:
        item['avgAgeYears'] = round(sum(ages) / len(ages), 1)
        item['minAgeYears'] = round(min(ages), 1)
        item['maxAgeYears'] = round(max(ages), 1)
    stats.append(item)

stats.sort(key=lambda x: (-x['accidents'], -x['fatalities'], x['family']))

operator_dashboard = []
for operator, ob in all_operator_data.items():
    row = {
        'operator': operator,
        'accidents': len(ob['events']),
        'fatalAccidents': len(ob['fatal_events']),
        'fatalities': sum(ob['fatalities_by_event'].values()),
        'families': sorted(ob['families']),
    }
    if ob['ages']:
        row['avgAccidentAircraftAgeYears'] = round(sum(ob['ages']) / len(ob['ages']), 1)
    operator_dashboard.append(row)
operator_dashboard.sort(key=lambda x: (-x['accidents'], -x['fatalities'], x['operator']))

payload = {
    'generatedAt': dt.datetime.now(dt.timezone.utc).isoformat().replace('+00:00', 'Z'),
    'coverageNote': 'Official NTSB downloadable aviation dataset, 1982-present. Type and operator counts are NTSB-scope accident records, not a global accident census.',
    'causeMethodNote': 'Cause/contributing-factor categories are AEL multi-label groupings derived primarily from NTSB Findings text, with narrative fallback when no finding category matches. They are not an official NTSB single-cause taxonomy; one event may appear in multiple categories.',
    'totalAccidents': len(events),
    'recognizedAccidentEvents': len(recognized_event_ids),
    'totalAircraftRecords': recognized_records,
    'causeCategories': cause_rows(recognized_event_ids, event_causes),
    'operatorStats': operator_dashboard[:80],
    'types': stats[:120],
}

os.makedirs(os.path.dirname(out_path) or '.', exist_ok=True)
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(payload, f, ensure_ascii=False, indent=2)
    f.write('\n')

print(
    f'Wrote {out_path}: {len(events)} accident events, '
    f'{len(recognized_event_ids)} recognized transport-family events, '
    f'{recognized_records} recognized aircraft records, {len(stats)} families'
)
