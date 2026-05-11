import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

// In CI/build environments without configured env vars we still need a valid
// URL for createClient — fall back to a placeholder so the bundle compiles.
// `fetchRacesWithSubRaces` swallows the inevitable runtime error and returns [].
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);
