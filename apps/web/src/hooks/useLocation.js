// apps/web/src/hooks/useLocation.js
import { useState, useCallback } from 'react';

export default function useLocation() {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocalización no disponible');
      return Promise.reject('not available');
    }

    setLoading(true);
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          };
          setLocation(loc);
          setLoading(false);
          resolve(loc);
        },
        (err) => {
          setError(err.message);
          setLoading(false);
          reject(err);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }, []);

  return { location, error, loading, getLocation };
}
