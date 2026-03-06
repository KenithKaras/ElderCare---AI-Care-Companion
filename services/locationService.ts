import { supabaseService } from './supabaseService';
import { storageService } from './storageService';

let watchId: number | null = null;

export const locationService = {
  /**
   * Starts high-accuracy real-time tracking.
   * Loosened accuracy constraints for production reliability (indoors).
   */
  startLiveTracking(onUpdate?: (coords: { lat: number, lng: number }) => void) {
    if (!navigator.geolocation) {
      console.error("Geolocation not supported");
      return;
    }

    if (watchId !== null) return;

    watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        
        // Loosened for indoors: Accept anything under 500m for initial awareness, 
        // but high accuracy (<50m) still preferred for refined map markers.
        if (accuracy < 500) {
          const coords = { lat: latitude, lng: longitude };
          
          // Sync to Cloud
          await supabaseService.addVital({
            type: 'Location',
            value: `${latitude},${longitude}`,
            unit: `coords (acc:${Math.round(accuracy)}m)`,
            timestamp: new Date().toISOString()
          });

          if (onUpdate) onUpdate(coords);
          
          // Local cache for performance
          localStorage.setItem('eca_last_known_loc', JSON.stringify({
            ...coords,
            timestamp: Date.now(),
            accuracy
          }));
        }
      },
      (error) => {
        console.warn("Location tracking error:", error.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000, // Reduced for fresher data
        timeout: 15000
      }
    );
  },

  stopLiveTracking() {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
  },

  getLastKnownLocation() {
    const stored = localStorage.getItem('eca_last_known_loc');
    return stored ? JSON.parse(stored) : null;
  }
};