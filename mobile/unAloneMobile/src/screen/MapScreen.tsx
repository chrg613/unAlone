import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import GetLocation from 'react-native-get-location';

const Map = MapView as any;
const MapMarker = Marker as any;

const MapScreen = ({ navigation }: any) => {
  // 1. All missing state initialized here
  const [hotspots, setHotspots] = useState<any[]>([]);
  const [selectedSpot, setSelectedSpot] = useState<any | null>(null);
  const [customMarker, setCustomMarker] = useState<any>(null);
  const [region, setRegion] = useState<Region>({
    latitude: 28.6139,
    longitude: 77.2090,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  // 2. Fix User Location Fetch
  const fetchUserLocation = async () => {
    GetLocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000 })
      .then(location => {
        const newReg = { ...region, latitude: location.latitude, longitude: location.longitude };
        setRegion(newReg);
        loadHotspots(location.latitude, location.longitude);
      })
      .catch(err => console.warn("Location Error:", err));
  };

  // 3. Global Hotspot Loader (5km radius for better results)
  const loadHotspots = (lat: number, lon: number) => {
    fetch(`http://192.168.1.8:8080/hotspots?lat=${lat}&lon=${lon}`)
      .then(res => res.json())
      .then(data => setHotspots(data.elements || []))
      .catch(err => console.error("Backend unreachable at 192.168.1.8"));
  };

  const onRegionChangeComplete = (newRegion: Region) => {
    setRegion(newRegion);
    loadHotspots(newRegion.latitude, newRegion.longitude);
  };

  // 4. Custom Marker Logic (Long Press)
  const handleLongPress = (e: any) => {
    const coords = e.nativeEvent.coordinate;
    const newSpot = {
      lat: coords.latitude,
      lon: coords.longitude,
      tags: { name: "Custom Meetup Point" },
      id: `custom_${Date.now()}`
    };
    setCustomMarker(newSpot);
    setSelectedSpot(newSpot); // This makes the bottom sheet pop up for custom pins!
  };

  useEffect(() => { fetchUserLocation(); }, []);

  const handleJoin = (spot: any) => {
    fetch('http://192.168.1.8:8080/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: 'chirag_01',
        place_id: spot.id.toString(),
        place_name: spot.tags.name || "Meetup Point"
      }),
    })
    .then(() => {
      navigation.navigate('Chat', { 
        placeId: spot.id.toString(), 
        placeName: spot.tags.name || "Unknown Spot" 
      });
    })
    .catch(() => Alert.alert("Error", "Join failed. Check Go Backend."));
  };

  return (
    <View style={styles.container}>
      <Map 
        style={styles.map} 
        region={region} 
        onLongPress={handleLongPress}
        onRegionChangeComplete={onRegionChangeComplete}
      >
        {/* Render API Hotspots */}
        {hotspots.map((spot, index) => (
          <MapMarker 
            key={`api_${index}`} 
            coordinate={{ latitude: spot.lat, longitude: spot.lon }} 
            onPress={() => setSelectedSpot(spot)} 
          />
        ))}
        
        {/* Render Custom Marker */}
        {customMarker && (
          <MapMarker 
            coordinate={{ latitude: customMarker.lat, longitude: customMarker.lon }} 
            pinColor="purple"
            onPress={() => setSelectedSpot(customMarker)}
          />
        )}
      </Map>

      {/* Bottom Sheet UI */}
      {selectedSpot && (
        <View style={styles.bottomSheet}>
          <Text style={styles.spotName}>{selectedSpot.tags.name || "Social Spot"}</Text>
          <TouchableOpacity style={styles.joinButton} onPress={() => handleJoin(selectedSpot)}>
            <Text style={styles.joinText}>I'm Planning to Go 🔥</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  bottomSheet: { 
    position: 'absolute', 
    bottom: 0, 
    width: '100%', 
    backgroundColor: 'white', 
    padding: 25, 
    borderTopLeftRadius: 25, 
    borderTopRightRadius: 25,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2
  },
  spotName: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  joinButton: { backgroundColor: '#6200ee', padding: 15, borderRadius: 10, alignItems: 'center' },
  joinText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});

export default MapScreen;