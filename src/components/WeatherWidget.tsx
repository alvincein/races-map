"use client";

import React, { useEffect, useState } from 'react';
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, Sun } from 'lucide-react';
import { getRaceWeather, WeatherData, getWeatherDescription } from '../lib/weather';
import './WeatherWidget.css';

interface WeatherWidgetProps {
  lat: number | null;
  lng: number | null;
  date: string | null;
}

const WeatherIcon = ({ code, size = 24 }: { code: number; size?: number }) => {
  if (code === 0 || code === 1) return <Sun size={size} className="weather-icon sun" />;
  if (code === 2 || code === 3) return <Cloud size={size} className="weather-icon cloud" />;
  if (code === 45 || code === 48) return <CloudFog size={size} className="weather-icon fog" />;
  if (code >= 51 && code <= 55) return <CloudDrizzle size={size} className="weather-icon drizzle" />;
  if (code >= 61 && code <= 65) return <CloudRain size={size} className="weather-icon rain" />;
  if (code >= 71 && code <= 77) return <CloudSnow size={size} className="weather-icon snow" />;
  if (code >= 80 && code <= 82) return <CloudRain size={size} className="weather-icon rain-showers" />;
  if (code >= 95) return <CloudLightning size={size} className="weather-icon lightning" />;
  return <Cloud size={size} className="weather-icon" />;
};

export const WeatherWidget = ({ lat, lng, date }: WeatherWidgetProps) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!lat || !lng || !date) return;

    const fetchWeather = async () => {
      setLoading(true);
      const data = await getRaceWeather(lat, lng, date);
      setWeather(data);
      setLoading(false);
    };

    fetchWeather();
  }, [lat, lng, date]);

  if (loading) {
    return (
      <div className="weather-widget loading">
        <div className="weather-skeleton"></div>
      </div>
    );
  }

  if (!weather) return null;

  return (
    <div className="weather-widget animate-fade-in">
      <div className="weather-main">
        <div className="weather-icon-container">
          <WeatherIcon code={weather.weatherCode} size={32} />
        </div>
        <div className="weather-info">
          <div className="weather-temp">
            <span className="temp-max">{Math.round(weather.temperatureMax)}°</span>
            <span className="temp-min">{Math.round(weather.temperatureMin)}°</span>
          </div>
          <div className="weather-desc">
            {getWeatherDescription(weather.weatherCode)}
          </div>
        </div>
      </div>
      <div className="weather-label">Προγνωση για την ημερα του αγωνα</div>
    </div>
  );
};
