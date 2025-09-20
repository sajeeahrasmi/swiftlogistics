



import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';


export default function DeliveryDetails({ route, navigation }: any) {
  const { assignment_id, deliveries } = route.params;
  const [delivery, setDelivery] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchDetails() {
      try {
        const token = await import('@react-native-async-storage/async-storage').then(m => m.default.getItem('access_token'));
        const res = await fetch(`http://192.168.24.149:3002/api/driverApp/deliveries/${assignment_id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.message || 'Failed to fetch');
        if (isMounted) setDelivery(json.delivery);
      } catch (err: any) {
        setError('Failed to fetch delivery details');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchDetails();
    return () => { isMounted = false; };
  }, [assignment_id]);

  const completeDelivery = () => {
    if (!delivery) return;
    navigation.navigate('ProofOfDelivery', { delivery, deliveries });
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;
  if (error || !delivery) return (
    <View style={styles.container}>
      <Text style={styles.title}>Delivery Details</Text>
      <Text style={{ color: 'red' }}>{error || 'No delivery found.'}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Map placeholder */}
      <View style={styles.mapPlaceholder}>
        <Text style={{ color: '#888' }}>[Map Placeholder]</Text>
      </View>
      <Text style={styles.title}>Delivery Details</Text>
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
        <Text style={styles.directionsButtonText}>Get Directions</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.mainButton} onPress={completeDelivery}>
        <Text style={styles.mainButtonText}>Complete Delivery</Text>
      </TouchableOpacity>
    </View>
  );
}

const { height } = Dimensions.get('window');
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    alignItems: 'center',
  },
  mapPlaceholder: {
    width: '100%',
    height: height * 0.22,
    backgroundColor: '#eee',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: '#222',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  directionsButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  mainButton: {
    width: '100%',
    backgroundColor: '#000',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  mainButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});


import React from 'react';
import { FlatList } from 'react-native';

export default function DeliveriesList({ navigation }: any) {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function fetchDeliveries() {
      try {
        const token = await import('@react-native-async-storage/async-storage').then(m => m.default.getItem('access_token'));
        const res = await fetch('http://192.168.24.149:3002/api/driverApp/deliveries', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        const json = await res.json();
        console.log('Backend response:', json);
        if (isMounted) setDeliveries(json.deliveries || []);
      } catch (err) {
        console.log('Fetch error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchDeliveries();
    return () => { isMounted = false; };
  }, []);


  // Accept logic (calls backend)
  const handleAccept = async (assignment_id: number) => {
    try {
      const token = await import('@react-native-async-storage/async-storage').then(m => m.default.getItem('access_token'));
      // Optionally get driver_id from context or backend if needed
      const res = await fetch(`http://192.168.24.149:3002/api/driverApp/deliveries/${assignment_id}/status`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'accepted' })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Failed to update');
      setDeliveries(prev => prev.map(d =>
        d.assignment_id === assignment_id ? { ...d, assignment_status: 'accepted' } : d
      ));
    } catch (err) {
      console.log('Accept error:', err);
      // Optionally show error to user
    }
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  if (!deliveries.length) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>No deliveries assigned.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Assigned Deliveries</Text>
      <FlatList
        data={deliveries}
        keyExtractor={item => item.assignment_id.toString()}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.address}>{item.delivery_address}</Text>
            <Text>Recipient: {item.recipient_name} ({item.recipient_phone})</Text>
            <Text>Pickup: {item.pickup_address}</Text>
            <Text>Status: {item.assignment_status}</Text>
            {item.assignment_status === 'pending' && (
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={() => handleAccept(item.assignment_id)}
              >
                <Text style={styles.acceptButtonText}>Accept</Text>
              </TouchableOpacity>
            )}
            {item.assignment_status === 'accepted' && (
              <View style={styles.acceptedBadge}>
                <Text style={styles.acceptedBadgeText}>ACCEPTED</Text>
              </View>
            )}
          </View>
        )}
      />
      <TouchableOpacity
        style={styles.routeButton}
        onPress={() => {
          navigation.navigate('RouteMap', { deliveries });
        }}
      >
        <Text style={styles.routeButtonText}>Show Optimized Route</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#000',
    alignSelf: 'center',
  },
  item: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#bbb',
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  address: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111',
    flex: 1,
  },
  status: {
    fontSize: 13,
    color: '#444',
    fontWeight: '600',
    marginLeft: 10,
  },
  recipient: {
    fontSize: 13,
    color: '#222',
    marginTop: 2,
  },
  pickup: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  acceptedBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#000',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  acceptedBadgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 1,
  },
  acceptButton: {
    backgroundColor: '#000',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  acceptButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  routeButton: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: '#000',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    elevation: 4,
  },
  routeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 1,
  },
});