import requests
import json

URL = "https://yjxhhlsxgvrngdffxizy.supabase.co/rest/v1"
KEY = "sb_publishable_-Pogi1cI_mxGfy7fn3ekPA_u-tj6sDK"

headers = {
    "apikey": KEY,
    "Authorization": f"Bearer {KEY}",
    "Content-Type": "application/json"
}

# Query for sub-races and their parent races
params = {
    "select": "id,name,distance,race_id,races(event_name)"
}

r = requests.get(f"{URL}/sub_races", headers=headers, params=params)
data = r.json()

target_races = ["Zagori", "Olympus", "Athens", "Spartathlon", "Meteora", "Metsovo", "Ursa"]

results = []
for sub in data:
    event_name = sub.get('races', {}).get('event_name', '')
    if any(t.lower() in event_name.lower() for t in target_races):
        results.append({
            "sub_race_id": sub['id'],
            "event_name": event_name,
            "sub_name": sub['name'],
            "distance": sub['distance']
        })

print(json.dumps(results, indent=2, ensure_ascii=False))
