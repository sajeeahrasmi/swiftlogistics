import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useDeliveries } from '../context/DeliveriesContext';

export default function DeliveriesList({ navigation }: any) {
  const { deliveries, setDeliveries } = useDeliveries();
  const [loading, setLoading] = useState(false);

  // Only show non-delivered orders
  const visibleDeliveries = deliveries.filter(d => d.assignment_status !== 'delivered');

  // Accept logic
  const handleAccept = (assignment_id: number) => {
    setDeliveries(prev => prev.map(d =>
      d.assignment_id === assignment_id ? { ...d, assignment_status: 'accepted' } : d
    ));
  };

  // Proof of Delivery logic
  const handleProofOfDelivery = (assignment_id: number, signature: string) => {
    setDeliveries(prev => prev.map(d =>
      d.assignment_id === assignment_id ? { ...d, assignment_status: 'delivered' } : d
    ));
  };

  useEffect(() => {
    // Simulate loading
    setLoading(true);
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  if (!visibleDeliveries.length) {
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
        data={visibleDeliveries}
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
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={["#667eea", "#764ba2"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.acceptButtonGradient}
                >
                  <Text style={styles.acceptButtonText}>Accept</Text>
                </LinearGradient>
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
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={["#667eea", "#764ba2"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.routeButtonGradient}
        >
          <Text style={styles.routeButtonText}>Show Optimized Route</Text>
        </LinearGradient>
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
    alignSelf: 'flex-start',
    marginTop: 8,
    borderRadius: 6,
    overflow: 'hidden',
    width: 110,
    height: 38,
  },
  acceptButtonGradient: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
  },
  acceptButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.10)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  routeButton: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    borderRadius: 10,
    overflow: 'hidden',
    height: 48,
    alignItems: 'center',
    elevation: 4,
  },
  routeButtonGradient: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  routeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.10)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});