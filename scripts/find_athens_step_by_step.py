import requests
import json

URL = "https://yjxhhlsxgvrngdffxizy.supabase.co/rest/v1"
KEY = "sb_publishable_-Pogi1cI_mxGfy7fn3ekPA_u-tj6sDK"

headers = {
    "apikey": KEY,
    "Authorization": f"Bearer {KEY}",
    "Content-Type": "application/json"
}

# Search specifically for the Authentic Marathon in races table
params = {
    "select": "id,event_name",
    "event_name": "ilike.*Αυθεντικός.*"
}
r = requests.get(f"{URL}/races", headers=headers, params=params)
data = r.json()

print("Races found:")
print(json.dumps(data, indent=2, ensure_ascii=False))

if data:
    race_id = data[0]['id']
    print(f"\nQuerying sub_races for race_id: {race_id}")
    params_sub = {
        "select": "id,name,distance",
        "race_id": f"eq.{race_id}"
    }
    r_sub = requests.get(f"{URL}/sub_races", headers=headers, params=params_sub)
    print(json.dumps(r_sub.json(), indent=2, ensure_ascii=False))
