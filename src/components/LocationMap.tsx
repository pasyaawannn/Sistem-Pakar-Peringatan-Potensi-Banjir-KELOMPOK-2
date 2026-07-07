import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet's default icon path issues in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapContent({ locationName }: { locationName: string }) {
  const map = useMap();
  const [position, setPosition] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (!locationName) return;
    
    // Geocoding using OpenStreetMap's Nominatim API (Free, no API key required)
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName + ', Indonesia')}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);
          setPosition([lat, lon]);
          map.setView([lat, lon], 13);
        }
      })
      .catch(err => console.error("Geocoding error:", err));
  }, [locationName, map]);

  return position ? (
    <Marker position={position}>
      <Popup>{locationName}</Popup>
    </Marker>
  ) : null;
}

export function LocationMap({ locationName, riskLevel }: { locationName: string; riskLevel: number }) {
  // Default center: Indonesia
  return (
    <MapContainer 
      center={[-2.5489, 118.0149]} 
      zoom={5} 
      style={{ width: '100%', height: '100%', zIndex: 0 }}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapContent locationName={locationName} />
    </MapContainer>
  );
}

function PickerContent({ onLocationSelect, currentLocation }: { onLocationSelect: (name: string) => void, currentLocation: string }) {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const map = useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setPosition([lat, lng]);
      setIsLoading(true);
      
      // Reverse Geocoding
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`)
        .then(res => res.json())
        .then(data => {
          if (data && data.address) {
            const addr = data.address;
            const parts = [];
            // Desa/Kelurahan
            if (addr.village || addr.suburb || addr.neighbourhood || addr.hamlet) parts.push(addr.village || addr.suburb || addr.neighbourhood || addr.hamlet);
            // Kecamatan
            if (addr.municipality || addr.city_district || addr.district) parts.push(addr.municipality || addr.city_district || addr.district);
            // Kabupaten/Kota
            if (addr.county || addr.city || addr.town) parts.push(addr.county || addr.city || addr.town);
            // Provinsi
            if (addr.state) parts.push(addr.state);
            
            const placeName = parts.length > 0 ? parts.join(', ') : data.display_name.split(',').slice(0, 4).join(', ');
            onLocationSelect(placeName);
          }
        })
        .catch(err => console.error("Reverse geocoding error:", err))
        .finally(() => setIsLoading(false));
    },
  });

  // Keep marker synced with typed input if it changes externally
  useEffect(() => {
    if (currentLocation && !position) {
       fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(currentLocation + ', Indonesia')}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lon = parseFloat(data[0].lon);
            setPosition([lat, lon]);
            map.setView([lat, lon], 12);
          }
        });
    }
  }, [currentLocation]);

  return position ? (
    <Marker position={position}>
      <Popup>{isLoading ? 'Mengambil data...' : currentLocation}</Popup>
    </Marker>
  ) : null;
}

export function LocationPickerMap({ onLocationSelect, currentLocation }: { onLocationSelect: (name: string) => void, currentLocation: string }) {
  return (
    <MapContainer 
      center={[-2.5489, 118.0149]} 
      zoom={5} 
      style={{ width: '100%', height: '100%', zIndex: 0 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <PickerContent onLocationSelect={onLocationSelect} currentLocation={currentLocation} />
    </MapContainer>
  );
}
