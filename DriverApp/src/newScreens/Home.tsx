import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MapView, { Marker } from 'react-native-maps';
import { useDeliveries } from '../context/DeliveriesContext';

const { height } = Dimensions.get('window');

// Remove unused hardcodedDeliveries, use context deliveries

export default function Home({ navigation }: any) {
  const { deliveries } = useDeliveries();
  const [assigned, setAssigned] = useState(0);
  const [accepted, setAccepted] = useState(0);
  const [completed, setCompleted] = useState(0);

  useFocusEffect(
    useCallback(() => {
  setAssigned(deliveries.filter((d: any) => d.assignment_status === 'pending' || d.assignment_status === 'assigned').length);
  setAccepted(deliveries.filter((d: any) => d.assignment_status === 'accepted').length);
  setCompleted(deliveries.filter((d: any) => d.assignment_status === 'delivered').length);
    }, [deliveries])
  );

  // Mock current location
  const userLocation = { latitude: 6.9271, longitude: 79.8612 };
  const today = new Date().toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <View style={styles.container}>
      {/* Map background */}
      <View style={styles.mapBackground}>
        <MapView
          style={StyleSheet.absoluteFillObject}
          initialRegion={{
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          showsUserLocation={true}
        >
          <Marker coordinate={userLocation} title="You are here" />
        </MapView>
      </View>

      {/* Top overlay */}
      <View style={styles.topContainer}>
        <Text style={styles.welcomeText}>Welcome back, Sajeeah</Text>
        <Text style={styles.dateText}>Today: {today}</Text>
        <View style={styles.countsRow}>
          <View style={styles.countBox}>
            <Text style={styles.countNum}>{assigned}</Text>
            <Text style={styles.countLabel}>Assigned</Text>
          </View>
          <View style={styles.countBox}>
            <Text style={styles.countNum}>{accepted}</Text>
            <Text style={styles.countLabel}>Accepted</Text>
          </View>
          <View style={styles.countBox}>
            <Text style={styles.countNum}>{completed}</Text>
            <Text style={styles.countLabel}>Completed</Text>
          </View>
        </View>
      </View>

      {/* Bottom overlay with Start Shift */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('DeliveriesList')}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={["#667eea", "#764ba2"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.buttonGradient}
          >
            <Text style={styles.buttonText}>Go to Deliveries</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  mapBackground: { ...StyleSheet.absoluteFillObject, zIndex: 0 },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#eee',
    height: '100%',
  },
  topContainer: {
    position: 'absolute',
    top: 0,
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    zIndex: 1,
    alignItems: 'flex-start',
  },
  welcomeText: { fontSize: 18, color: '#000', fontWeight: 'bold' },
  dateText: { fontSize: 14, color: '#444', marginTop: 4 },
  countsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 18,
    marginBottom: 2,
  },
  countBox: {
    flex: 1,
    alignItems: 'center',
  },
  countNum: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
  },
  countLabel: {
    fontSize: 13,
    color: '#444',
    marginTop: 2,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    zIndex: 1,
    alignItems: 'center',
  },
  button: {
    width: '100%',
    height: 48,
    borderRadius: 10,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
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
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.10)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});
