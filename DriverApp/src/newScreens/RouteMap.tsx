import React from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MapView, { Marker, Polyline } from 'react-native-maps';
import Icon from 'react-native-vector-icons/Ionicons';

export default function RouteMap({ route, navigation }: any) {
  const { deliveries } = route.params;
  // Use accepted deliveries for the route
  const acceptedDeliveries = deliveries.filter((d: any) => d.status === 'accepted');
  const routeDeliveries = acceptedDeliveries.length > 0 ? acceptedDeliveries : deliveries;
  // Use delivery addresses as marker names, and mock coordinates for demo
  const coords = routeDeliveries.map((d: any, idx: number) => ({
    latitude: 6.9271 + idx * 0.01,
    longitude: 79.8612 + idx * 0.01,
    name: d.delivery_address,
    recipient: d.recipient_name,
    eta: `${10 + idx * 10} min`,
    status: d.status,
  }));
  // Sort coords by distance from driverLocation
  const optimizedCoords = sortDeliveriesByDistance(coords, driverLocation);
  const totalDistance = `${optimizedCoords.length * 5} km`;
  const totalDuration = `${optimizedCoords.length * 15} min`;
  return (
    <View style={styles.container}>
      {/* Top overlay bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={22} color="#000" />
        </TouchableOpacity>
        <Text style={styles.routeTitle}>Delivery Route</Text>
  <Icon name="person-circle" size={28} color="#000" />
      </View>
      {/* Map at the top */}
      <View style={styles.mapContainer}>
        <MapView
          style={StyleSheet.absoluteFillObject}
          initialRegion={{
            latitude: optimizedCoords[0]?.latitude || driverLocation.latitude,
            longitude: optimizedCoords[0]?.longitude || driverLocation.longitude,
            latitudeDelta: 0.07,
            longitudeDelta: 0.07,
          }}
        >
          {optimizedCoords.map((coord, idx) => (
            <Marker
              key={idx}
              coordinate={{ latitude: coord.latitude, longitude: coord.longitude }}
              title={coord.name}
              description={`Stop ${idx + 1}`}
            >
              <View style={[styles.marker, { backgroundColor: '#000' }]}> 
                <Text style={styles.markerText}>{idx === 0 ? 'S' : idx + 1}</Text>
              </View>
            </Marker>
          ))}
          <Polyline
            coordinates={optimizedCoords}
            strokeColor="#000"
            strokeWidth={4}
          />
        </MapView>
      </View>
      {/* Bottom overlay with info and timeline */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            if (routeDeliveries && routeDeliveries.length > 0) {
              navigation.navigate('DeliveryDetails', { assignment_id: routeDeliveries[0].assignment_id, deliveries });
            }
          }}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={["#667eea", "#764ba2"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.buttonGradient}
          >
            <Text style={styles.buttonText}>Start Delivery</Text>
          </LinearGradient>
        </TouchableOpacity>
        <View style={styles.infoRow}>
          <Text style={styles.infoText}>Distance: {totalDistance}</Text>
          <Text style={styles.infoText}>Duration: {totalDuration}</Text>
        </View>
        <ScrollView style={styles.timelineContainer} showsVerticalScrollIndicator={false}>
          {coords.map((item, idx) => (
            <View key={idx} style={styles.timelineItem}>
              <View style={styles.lineContainer}>
                {idx !== coords.length - 1 && <View style={styles.line} />}
                <View style={styles.dot} />
              </View>
              <View style={styles.detailsContainer}>
                <Text style={styles.location}>{item.name}</Text>
                <Text style={styles.eta}>ETA: {item.eta}</Text>
                <Text style={styles.status}>Status: {item.status}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

// Helper function to calculate distance between two coordinates
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (value: number) => value * Math.PI / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Hardcoded driver location (can be replaced with real location)
const driverLocation = { latitude: 6.9271, longitude: 79.8612 };

// Function to sort deliveries by nearest neighbor
function sortDeliveriesByDistance(deliveries: any[], start: { latitude: number, longitude: number }) {
  const remaining = [...deliveries];
  const sorted: any[] = [];
  let current = start;
  while (remaining.length) {
    let minIdx = 0;
    let minDist = getDistance(current.latitude, current.longitude, remaining[0].latitude, remaining[0].longitude);
    for (let i = 1; i < remaining.length; i++) {
      const dist = getDistance(current.latitude, current.longitude, remaining[i].latitude, remaining[i].longitude);
      if (dist < minDist) {
        minDist = dist;
        minIdx = i;
      }
    }
    sorted.push(remaining[minIdx]);
    current = { latitude: remaining[minIdx].latitude, longitude: remaining[minIdx].longitude };
    remaining.splice(minIdx, 1);
  }
  return sorted;
}

const { height } = Dimensions.get('window');
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 15,
    height: 60,
    borderBottomWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
    zIndex: 2,
  },
  backButton: { padding: 4 },
  routeTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  mapContainer: {
    width: '100%',
    height: height * 0.5,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 0,
    marginTop: 0,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: height * 0.38,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 15,
  },
  button: {
    width: '100%',
    height: 48,
    borderRadius: 10,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    marginBottom: 12,
  },
  buttonGradient: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.10)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  infoText: { fontSize: 15, fontWeight: '500', color: '#000' },
  timelineContainer: { flex: 1 },
  timelineItem: { flexDirection: 'row', marginBottom: 18 },
  lineContainer: { width: 20, alignItems: 'center' },
  line: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: '#bbb' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#000', zIndex: 1 },
  detailsContainer: { marginLeft: 10, flex: 1 },
  location: { fontSize: 15, fontWeight: '700', color: '#000' },
  eta: { fontSize: 14, fontWeight: '500', color: '#444', marginTop: 2 },
  status: { fontSize: 13, fontWeight: '400', color: '#666', marginTop: 1 },
  marker: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  markerText: { color: '#fff', fontWeight: '700' },
});