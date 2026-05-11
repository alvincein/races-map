export interface WeatherData {
  temperatureMax: number;
  temperatureMin: number;
  weatherCode: number;
  date: string;
}

export async function getRaceWeather(lat: number, lng: number, dateStr: string): Promise<WeatherData | null> {
  try {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if the date is within the next 16 days (Open-Meteo forecast limit)
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0 || diffDays > 7) {
      return null;
    }

    const formattedDate = date.toISOString().split('T')[0];
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&start_date=${formattedDate}&end_date=${formattedDate}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Weather API request failed');
    }

    const data = await response.json();
    
    if (data.daily && data.daily.time && data.daily.time.length > 0) {
      return {
        temperatureMax: data.daily.temperature_2m_max[0],
        temperatureMin: data.daily.temperature_2m_min[0],
        weatherCode: data.daily.weather_code[0],
        date: data.daily.time[0],
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching weather:', error);
    return null;
  }
}

export function getWeatherDescription(code: number): string {
  const codes: Record<number, string> = {
    0: 'Καθαρός ουρανός',
    1: 'Κυρίως αίθριος',
    2: 'Μερικώς συννεφιασμένος',
    3: 'Συννεφιασμένος',
    45: 'Ομίχλη',
    48: 'Ομίχλη με πάχνη',
    51: 'Ελαφρύ ψιχάλισμα',
    53: 'Μέτριο ψιχάλισμα',
    55: 'Πυκνό ψιχάλισμα',
    61: 'Ελαφριά βροχή',
    63: 'Μέτρια βροχή',
    65: 'Ισχυρή βροχή',
    71: 'Ελαφριά χιονόπτωση',
    73: 'Μέτρια χιονόπτωση',
    75: 'Ισχυρή χιονόπτωση',
    80: 'Ελαφριές μπόρες',
    81: 'Μέτριες μπόρες',
    82: 'Ισχυρές μπόρες',
    95: 'Καταιγίδα',
    96: 'Καταιγίδα με χαλάζι',
    99: 'Ισχυρή καταιγίδα με χαλάζι',
  };
  return codes[code] || 'Άγνωστος καιρός';
}
