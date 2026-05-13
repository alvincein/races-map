export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      races: {
        Row: {
          id: string
          event_name: string
          description: string | null
          dates: string[] | null
          max_distance: number | null
          event_type: string | null
          event_url: string | null
          scraped_url: string | null
          location_place: string | null
          location_region: string | null
          location_city: string | null
          location_lat: number | null
          location_lng: number | null
          nearest_city: Json | null
          has_multiple_races: boolean | null
          source_id: string | null
          created_at: string | null
          updated_at: string | null
          reviewed: boolean | null
          event_name_translations: Json | null
          nearest_city_id: string | null
          event_name_en: string | null
          description_en: string | null
          needs_rescan: boolean | null
          rescaned_date: string | null
          confidence_score: number | null
          confidence_explanation: string | null
          registration_url: string | null
          certifications: string[] | null
          swag_included: string[] | null
          start_date: string | null
          end_date: string | null
        }
      }
      sub_races: {
        Row: {
          id: string
          race_id: string | null
          date: string | null
          race_type: string | null
          distance: number | null
          price: number | null
          created_at: string | null
          name: string | null
          elevation: number | null
          category: string | null
          has_gpx: boolean | null
          start_time: string | null
          cut_off_time_hours: number | null
          aid_stations: Json | null
        }
      }
    }
  }
}

// Helper types
export type Race = Database['public']['Tables']['races']['Row']
export type SubRace = Database['public']['Tables']['sub_races']['Row']
