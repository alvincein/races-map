import os
import xml.etree.ElementTree as ET
import json
import math

GPX_DIR = '/Users/theo/Documents/Projects/races-map/gpx'
OUTPUT_FILE = '/Users/theo/Documents/Projects/races-map/src/data/raceRoutes.json'

def haversine(lon1, lat1, lon2, lat2):
    # radius of earth in km
    R = 6371.0
    
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c * 1000 # returns distance in meters

def parse_gpx(file_path):
    try:
        tree = ET.parse(file_path)
        root = tree.getroot()
        
        points = []
        
        # Priority: trkpt > rtept > wpt
        point_elements = root.findall('.//{*}trkpt')
        if not point_elements:
            point_elements = root.findall('.//{*}rtept')
        if not point_elements:
            point_elements = root.findall('.//{*}wpt')
            
        for p in point_elements:
            lat = float(p.get('lat'))
            lon = float(p.get('lon'))
            ele_node = p.find('{*}ele')
            ele = float(ele_node.text) if ele_node is not None else 0
            points.append({'lat': lat, 'lon': lon, 'ele': ele})
        
        if not points:
            return None
            
        # Calculate metrics
        total_distance = 0
        total_gain = 0
        total_loss = 0
        
        processed_points = []
        cumulative_dist = 0
        
        for i in range(len(points)):
            if i > 0:
                d = haversine(points[i-1]['lon'], points[i-1]['lat'], points[i]['lon'], points[i]['lat'])
                total_distance += d
                cumulative_dist += d
                
                diff = points[i]['ele'] - points[i-1]['ele']
                if diff > 0:
                    total_gain += diff
                else:
                    total_loss += abs(diff)
            
            processed_points.append({
                'dist': cumulative_dist,
                'ele': points[i]['ele'],
                'coords': [points[i]['lon'], points[i]['lat']]
            })
            
        # Simplify profile for chart (limit to ~200 points)
        step = max(1, len(processed_points) // 200)
        profile = processed_points[::step]
        # Ensure last point is included
        if profile[-1] != processed_points[-1]:
            profile.append(processed_points[-1])
            
        return {
            'coordinates': [[p['lon'], p['lat']] for p in points],
            'profile': [{'d': round(p['dist']), 'e': round(p['ele']), 'c': p['coords']} for p in profile],
            'stats': {
                'distance': round(total_distance),
                'gain': round(total_gain),
                'loss': round(total_loss),
                'max_ele': round(max(p['ele'] for p in points)),
                'min_ele': round(min(p['ele'] for p in points))
            }
        }
    except Exception as e:
        print(f"Error parsing {file_path}: {e}")
        return None

ID_MAPPING = {
    "Athens Marathon Authentic.xml": "02169a86-d954-4f13-bbc7-186db9a73b94",
    "TeRA-60km-new.gpx": "5cf546b6-674d-4ecd-8fda-b1463702fbcd",
    "ZAGORI-CLASSIC-33km-new.gpx": "999308ed-3a23-445a-8169-359470259bc1",
    "ZMR-5km.gpx": "f0e70827-c94c-4c64-83a8-d92247a5ae07",
    "zagori 10km.gpx": "1d051170-f379-4ba6-b210-6f6ab8470236",
    "zagori 21km.gpx": "55b2c3b0-452e-4ad4-a94c-d38caa82d6ad",
    "Olympus Marathon 2022 Map.gpx": "e2191b32-077b-44b5-97f0-c5f009fdfb46",
    "Olympus Ultra Map 2022.gpx": "8974edbf-266e-4a1e-8556-c4fad367c287",
    "metsovo-ursa-trail-2025-21km 3.gpx": "221db92f-89d6-4ebd-bbc1-8847501d4425",
    "ursa trail 40km.gpx": "7f407302-8069-4271-a66d-3cff6f950232"
}

all_routes = {}

for filename, sub_race_id in ID_MAPPING.items():
    file_path = os.path.join(GPX_DIR, filename)
    if os.path.exists(file_path):
        data = parse_gpx(file_path)
        if data:
            all_routes[sub_race_id] = {
                "id": sub_race_id,
                "filename": filename,
                "stats": data['stats'],
                "profile": data['profile'],
                "geojson": {
                    "type": "Feature",
                    "geometry": {
                        "type": "LineString",
                        "coordinates": data['coordinates']
                    },
                    "properties": {
                        "sub_race_id": sub_race_id,
                        **data['stats']
                    }
                }
            }

os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
    json.dump(all_routes, f, ensure_ascii=False)

print(f"Successfully processed {len(all_routes)} files with elevation profiles.")
