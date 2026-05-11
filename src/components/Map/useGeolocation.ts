"use client";

import { useCallback, useRef, useState } from 'react';
import type { MapRef } from 'react-map-gl/maplibre';

export interface UserLocation { lng: number; lat: number }

interface UseGeolocationResult {
  userLocation: UserLocation | null;
  isLocating: boolean;
  /** Locate the user, then fly the map there. Re-clicking after success just flies to the cached location. */
  locateAndFly: (mapRef: React.RefObject<MapRef | null>) => void;
}

const INSTANT_DENIAL_THRESHOLD_MS = 250;
const DENIAL_ALERT_DEBOUNCE_MS = 2000;

export function useGeolocation(): UseGeolocationResult {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const locatingRef = useRef(false);
  const userLocationRef = useRef<UserLocation | null>(null);

  const locateAndFly = useCallback((mapRef: React.RefObject<MapRef | null>) => {
    if (locatingRef.current) return;

    if (typeof window !== 'undefined' && !window.isSecureContext) {
      alert('Η γεωτοποθεσία απαιτεί ασφαλή σύνδεση (HTTPS ή localhost). Παρακαλώ ελέγξτε τη διεύθυνση URL.');
      return;
    }
    if (!navigator.geolocation) {
      alert('Η γεωτοποθεσία δεν υποστηρίζεται από τον περιηγητή σας.');
      return;
    }

    const cached = userLocationRef.current;
    if (cached) {
      mapRef.current?.flyTo({
        center: [cached.lng, cached.lat],
        zoom: 12,
        pitch: 45,
        duration: 1000,
      });
      return;
    }

    locatingRef.current = true;
    setIsLocating(true);
    const startTime = Date.now();

    navigator.geolocation.getCurrentPosition(
      position => {
        const loc = { lng: position.coords.longitude, lat: position.coords.latitude };
        setUserLocation(loc);
        userLocationRef.current = loc;
        setIsLocating(false);
        locatingRef.current = false;
        mapRef.current?.flyTo({
          center: [loc.lng, loc.lat],
          zoom: 12,
          pitch: 45,
          duration: 1500,
        });
      },
      error => {
        setIsLocating(false);
        locatingRef.current = false;
        const duration = Date.now() - startTime;
        console.error('Geolocation error details:', {
          code: error.code,
          message: error.message,
          duration,
          isSecure: window.isSecureContext,
        });

        // A near-instant denial means the browser auto-blocked without prompting — alerting would
        // be confusing since the user never saw a permission dialog.
        if (duration < INSTANT_DENIAL_THRESHOLD_MS && error.code === error.PERMISSION_DENIED) return;

        // Some buggy extensions deny but don't set PERMISSION_DENIED — match by message too.
        setTimeout(() => {
          if (userLocationRef.current) return;
          const isDenied =
            error.code === error.PERMISSION_DENIED ||
            (error.message && error.message.toLowerCase().includes('denied'));
          if (!isDenied) alert(`Σφάλμα τοποθεσίας: ${error.message}`);
        }, DENIAL_ALERT_DEBOUNCE_MS);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, []);

  return { userLocation, isLocating, locateAndFly };
}
