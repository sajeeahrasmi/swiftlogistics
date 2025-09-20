import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MapView, { Marker, Polyline } from 'react-native-maps';
import apiClient from '../api/apiClient';


export default function DeliveryDetails({ route, navigation }: any) {
  // Hardcoded driver location (Dehiwala)
  const driverLocation = {
    latitude: 6.8570,
    longitude: 79.8688,
  };

  // Simple mock geocoding for delivery address (demo only)
  const deliveryLocation = {
    latitude: driverLocation.latitude + 0.01,
    longitude: driverLocation.longitude + 0.01,
  };
  const { assignment_id } = route.params;
  const [delivery, setDelivery] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDeliveryDetails = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get(`/deliveries/${assignment_id}`);
        if (res.data && res.data.delivery) {
          setDelivery(res.data.delivery);
          setError(null);
        } else {
          setDelivery(null);
          setError('No delivery found.');
        }
      } catch (err) {
        setDelivery(null);
        setError('No delivery found.');
      }
      setLoading(false);
    };
    fetchDeliveryDetails();
  }, [assignment_id]);

  const completeDelivery = () => {
    if (!delivery) return;
    navigation.navigate('ProofOfDelivery', { delivery });
  };

  if (loading) return <ActivityIndicator style={styles.loadingIndicator} />;
  if (error || !delivery) return (
    <View style={styles.container}>
      <Text style={styles.title}>Delivery Details</Text>
      <Text style={styles.errorText}>{error || 'No delivery found.'}</Text>
    </View>
  );

  // Get all deliveries in the same city as the current delivery for a believable route
  // Only show details for fetched delivery.

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Delivery Details</Text>
      <MapView
        style={styles.mapPlaceholder}
        initialRegion={{
          latitude: driverLocation.latitude + 0.005,
          longitude: driverLocation.longitude + 0.005,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
      >
        <Marker
          coordinate={driverLocation}
          title="Your Location"
          pinColor="blue"
        />
        <Marker
          coordinate={deliveryLocation}
          title="Delivery"
          pinColor="red"
        />
        <Polyline
          coordinates={[driverLocation, deliveryLocation]}
          strokeColor="#764ba2"
          strokeWidth={4}
        />
      </MapView>
      <View style={styles.infoBox}>
        <Text style={styles.label}>Pickup:</Text>
        <Text style={styles.value}>{delivery.pickup_address}</Text>
        <Text style={styles.label}>Dropoff:</Text>
        <Text style={styles.value}>{delivery.delivery_address}</Text>
        <Text style={styles.label}>Recipient:</Text>
        <Text style={styles.value}>{delivery.recipient_name}</Text>
        <Text style={styles.label}>Phone:</Text>
        <Text style={styles.value}>{delivery.recipient_phone}</Text>
        <Text style={styles.label}>Status:</Text>
        <Text style={styles.value}>{delivery.assignment_status?.toUpperCase()}</Text>
      </View>
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionButton} onPress={() => Linking.openURL(`tel:${delivery.recipient_phone}`)}>
          <Text style={styles.actionButtonText}>Call</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => Linking.openURL(`sms:${delivery.recipient_phone}`)}>
          <Text style={styles.actionButtonText}>Message</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.directionsButton} onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(delivery.delivery_address)}`)}>
        <LinearGradient
          colors={["#667eea", "#764ba2"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.directionsButtonGradient}
        >
          <Text style={styles.directionsButtonText}>Get Directions</Text>
        </LinearGradient>
      </TouchableOpacity>
      <TouchableOpacity style={styles.mainButton} onPress={completeDelivery}>
        <LinearGradient
          colors={["#667eea", "#764ba2"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.mainButtonGradient}
        >
          <Text style={styles.mainButtonText}>Complete Delivery</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const { height } = Dimensions.get('window');
const styles = StyleSheet.create({
  loadingIndicator: {
    flex: 1,
    alignSelf: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: 'red',
    fontWeight: 'bold',
    fontSize: 16,
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    alignItems: 'center',
  },
  mapPlaceholder: {
    width: '100%',
    height: height * 0.3,
    borderRadius: 12,
    marginBottom: 18,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#000',
    alignSelf: 'center',
  },
  infoBox: {
    width: '100%',
    backgroundColor: '#fafafa',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eee',
  },
  label: {
    fontSize: 13,
    color: '#444',
    fontWeight: '600',
    marginTop: 6,
  },
  value: {
    fontSize: 15,
    color: '#111',
    marginBottom: 2,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 10,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#bbb',
    borderRadius: 8,
    paddingVertical: 10,
    marginHorizontal: 6,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 15,
  },
  directionsButton: {
    width: '100%',
    height: 48,
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  directionsButtonGradient: {
    width: '100%',
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  directionsButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
    textShadowColor: 'rgba(0,0,0,0.10)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  mainButton: {
    width: '100%',
    height: 48,
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainButtonGradient: {
    width: '100%',
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  mainButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.10)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});