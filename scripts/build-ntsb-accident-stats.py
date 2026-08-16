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
    for fmt in ('%m/%d/%Y', '%Y-%m-%d', '%m/%d/%y', '%Y/%m/%d'):
        try:
            return dt.datetime.strptime(text[:10], fmt).date()
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


tables_raw = subprocess.run(['mdb-tables', '-1', mdb_path], check=True, capture_output=True, text=True).stdout.splitlines()
tables = [x.strip() for x in tables_raw if x.strip()]
by_norm = {norm(t): t for t in tables}

def pick_table(*names):
    for name in names:
        n = norm(name)
        if n in by_norm:
            return by_norm[n]
    for table in tables:
        if any(norm(name) in norm(table) for name in names):
            return table
    raise RuntimeError(f'Could not find table {names}. Available tables: {tables}')

events_table = pick_table('events', 'event')
aircraft_table = pick_table('aircraft')

event_rows = export_table(events_table)
aircraft_rows = export_table(aircraft_table)

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
        'injury': get(row, 'injury_severity', 'InjurySeverity'),
    }

recognized_records = 0
family_data = defaultdict(lambda: {
    'events': set(),
    'fatal_events': set(),
    'fatalities_by_event': {},
    'ages': [],
    'operators': defaultdict(int),
    'models': defaultdict(int),
    'makes': defaultdict(int),
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
    bucket = family_data[family]
    bucket['events'].add(event_id)
    if event['fatalities'] > 0:
        bucket['fatal_events'].add(event_id)
        bucket['fatalities_by_event'][event_id] = event['fatalities']

    year = integer(get(row, 'acft_year', 'AircraftYear', 'year_mfr', 'year_of_manufacture'))
    if year and 1900 <= year <= event['date'].year:
        age = event['date'].year - year
        if 0 <= age <= 80:
            bucket['ages'].append(float(age))

    operator = get(row, 'operator', 'AirCarrier', 'air_carrier', 'oper_name')
    if operator and operator.upper() not in {'NONE', 'UNKNOWN', 'UNK'}:
        bucket['operators'][operator] += 1
    if model:
        bucket['models'][model] += 1
    if make:
        bucket['makes'][make] += 1

stats = []
for family, bucket in family_data.items():
    ages = bucket['ages']
    make = max(bucket['makes'], key=bucket['makes'].get) if bucket['makes'] else ''
    model = max(bucket['models'], key=bucket['models'].get) if bucket['models'] else ''
    operators = [name for name, _ in sorted(bucket['operators'].items(), key=lambda kv: (-kv[1], kv[0]))[:8]]
    item = {
        'family': family,
        'make': make,
        'model': model,
        'accidents': len(bucket['events']),
        'fatalAccidents': len(bucket['fatal_events']),
        'fatalities': sum(bucket['fatalities_by_event'].values()),
        'sampleOperators': operators,
    }
    if ages:
        item['avgAgeYears'] = round(sum(ages) / len(ages), 1)
        item['minAgeYears'] = round(min(ages), 1)
        item['maxAgeYears'] = round(max(ages), 1)
    stats.append(item)

stats.sort(key=lambda x: (-x['accidents'], -x['fatalities'], x['family']))

payload = {
    'generatedAt': dt.datetime.now(dt.timezone.utc).isoformat().replace('+00:00', 'Z'),
    'coverageNote': 'Official NTSB downloadable aviation dataset, 1982-present. Dashboard type counts represent recognized transport-aircraft families involved in NTSB accident events; this is not a global accident census.',
    'totalAccidents': len(events),
    'totalAircraftRecords': recognized_records,
    'types': stats[:120],
}

os.makedirs(os.path.dirname(out_path) or '.', exist_ok=True)
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(payload, f, ensure_ascii=False, indent=2)
    f.write('\n')

print(f'Wrote {out_path}: {len(events)} accident events, {recognized_records} recognized transport-aircraft records, {len(stats)} families')
