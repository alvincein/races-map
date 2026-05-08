import requests
import json

URL = "https://yjxhhlsxgvrngdffxizy.supabase.co/rest/v1"
KEY = "sb_publishable_-Pogi1cI_mxGfy7fn3ekPA_u-tj6sDK"

headers = {
    "apikey": KEY,
    "Authorization": f"Bearer {KEY}",
    "Content-Type": "application/json"
}

race_id = "f2eed1c6-4a4d-4e85-b9df-da972fd1b46c"
params = {
    "select": "id,name,distance",
    "race_id": f"eq.{race_id}"
}
r = requests.get(f"{URL}/sub_races", headers=headers, params=params)
print(json.dumps(r.json(), indent=2, ensure_ascii=False))
