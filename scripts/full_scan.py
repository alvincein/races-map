import requests
import json

URL = "https://yjxhhlsxgvrngdffxizy.supabase.co/rest/v1"
KEY = "sb_publishable_-Pogi1cI_mxGfy7fn3ekPA_u-tj6sDK"

headers = {
    "apikey": KEY,
    "Authorization": f"Bearer {KEY}",
    "Content-Type": "application/json"
}

params = {
    "select": "id,event_name"
}
r = requests.get(f"{URL}/races", headers=headers, params=params)
data = r.json()

results = [race for race in data if "Μαραθώνιος" in race['event_name'] or "Athens Marathon" in race['event_name']]

print(json.dumps(results, indent=2, ensure_ascii=False))
