import os
import requests

def load_env():
    env = {}
    env_path = '/Users/theo/Documents/Projects/races-map/.env.local'
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                if '=' in line and not line.startswith('#'):
                    k, v = line.strip().split('=', 1)
                    env[k] = v
    return env

def main():
    env = load_env()
    supabase_url = env.get('NEXT_PUBLIC_SUPABASE_URL')
    
    # Priority: Env service role key > Env local service role key > Anon key
    service_role_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
    if not service_role_key:
        service_role_key = env.get('SUPABASE_SERVICE_ROLE_KEY')
        
    anon_key = env.get('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    key = service_role_key or anon_key
    
    if not supabase_url or not key:
        print("Error: NEXT_PUBLIC_SUPABASE_URL and authorization key are required.")
        return

    print(f"Using Supabase URL: {supabase_url}")
    print(f"Using upload key: {'Service Role Key (from env)' if service_role_key else 'Anon Key (upload may fail)'}")
    
    # PostgREST headers to query sub_races
    postgrest_headers = {
        "apikey": anon_key or key,
        "Authorization": f"Bearer {anon_key or key}",
        "Content-Type": "application/json"
    }

    # 1. Fetch all sub-races with has_gpx = true from the new DB
    print("\nFetching sub-races with has_gpx=true from the new database...")
    db_url = f"{supabase_url}/rest/v1/sub_races?has_gpx=eq.true"
    try:
        r = requests.get(db_url, headers=postgrest_headers)
        if r.status_code != 200:
            print(f"Failed to fetch sub-races: {r.status_code} - {r.text}")
            return
        sub_races = r.json()
    except Exception as e:
        print(f"Exception fetching sub-races: {e}")
        return

    print(f"Found {len(sub_races)} sub-races with GPX tracks configured in the database.")

    # 2. Upload headers for the new storage
    upload_headers = {
        "Authorization": f"Bearer {key}",
        "apikey": key,
        "Content-Type": "application/json",
        "x-upsert": "true"
    }

    old_base_url = "https://lgdmbvsajwirgpqfexsz.supabase.co/storage/v1/object/public/race-tracks"
    success_count = 0
    fail_count = 0

    for idx, sub in enumerate(sub_races, 1):
        sub_id = sub['id']
        sub_name = sub.get('name') or "Unnamed"
        print(f"\n[{idx}/{len(sub_races)}] Processing sub-race {sub_id} ({sub_name})...")
        
        # Download from old storage
        old_url = f"{old_base_url}/{sub_id}.json"
        print(f"Downloading from old storage: {old_url}")
        try:
            r_down = requests.get(old_url)
            if r_down.status_code != 200:
                print(f"Failed to download from old storage: {r_down.status_code} (skipping)")
                fail_count += 1
                continue
            payload = r_down.json()
        except Exception as e:
            print(f"Exception downloading from old storage: {e}")
            fail_count += 1
            continue

        # Upload to new storage
        upload_url = f"{supabase_url}/storage/v1/object/race-tracks/{sub_id}.json"
        print(f"Uploading to new storage as {sub_id}.json...")
        try:
            r_up = requests.post(upload_url, headers=upload_headers, json=payload)
            if r_up.status_code == 200:
                print(f"Successfully uploaded {sub_id}.json!")
                success_count += 1
            else:
                print(f"Upload failed (status {r_up.status_code}): {r_up.text}")
                # Try PUT fallback
                print("Trying PUT fallback...")
                r_put = requests.put(upload_url, headers=upload_headers, json=payload)
                if r_put.status_code == 200:
                    print(f"Successfully uploaded {sub_id}.json using PUT!")
                    success_count += 1
                else:
                    print(f"PUT fallback also failed (status {r_put.status_code}): {r_put.text}")
                    fail_count += 1
        except Exception as e:
            print(f"Exception during upload: {e}")
            fail_count += 1

    print(f"\nMigration complete: {success_count} succeeded, {fail_count} failed.")

if __name__ == '__main__':
    main()
