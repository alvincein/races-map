import requests
import json

URL = "https://yjxhhlsxgvrngdffxizy.supabase.co/rest/v1"
KEY = "sb_publishable_-Pogi1cI_mxGfy7fn3ekPA_u-tj6sDK"

headers = {
    "apikey": KEY,
    "Authorization": f"Bearer {KEY}",
    "Content-Type": "application/json"
}

# Search specifically for the missing ones
search_terms = ["Athens Marathon", "Spartathlon", "Meteora"]
results = []

for term in search_terms:
    params = {
        "select": "id,name,distance,race_id,races(event_name)",
        "races.event_name": f"ilike.*{term}*"
    }
    r = requests.get(f"{URL}/sub_races", headers=headers, params=params)
    data = r.json()
    for sub in data:
        if sub.get('races'):
            results.append({
                "sub_race_id": sub['id'],
                "event_name": sub['races']['event_name'],
                "sub_name": sub['name'],
                "distance": sub['distance']
            })

print(json.dumps(results, indent=2, ensure_ascii=False))
