import React, { useState } from 'react';
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import SignatureScreen from 'react-native-signature-canvas';
import { useDeliveries } from '../context/DeliveriesContext';

export default function ProofOfDelivery({ route, navigation }: any) {
  const { delivery } = route.params;
  const { deliveries, setDeliveries } = useDeliveries();
  const [signature, setSignature] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleOK = (sig: string) => {
    setSignature(sig);
  };

  const submitProof = () => {
    if (!signature) {
      Alert.alert('Please add your signature before submitting.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      Alert.alert('Proof uploaded!');
      setDeliveries(prev => prev.map(d =>
        d.assignment_id === delivery.assignment_id ? { ...d, assignment_status: 'delivered', signature } : d
      ));
      navigation.navigate('DeliveryComplete');
    }, 500);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Proof of Delivery</Text>
      <View style={styles.signatureBox}>
        <SignatureScreen
          onOK={handleOK}
          descriptionText="Sign above and tap Save"
          clearText="Clear"
          confirmText="Save"
        />
      </View>
      {signature ? (
        <View style={styles.previewBox}>
          <Text style={styles.previewText}>Signature Preview:</Text>
          <Image
            source={{ uri: signature }}
            style={styles.signaturePreview}
            resizeMode="contain"
          />
        </View>
      ) : null}
      <TouchableOpacity style={styles.button} onPress={submitProof} disabled={loading}>
        <LinearGradient
          colors={["#667eea", "#764ba2"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.buttonGradient}
        >
          <Text style={styles.buttonText}>Submit Proof</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#000',
    alignSelf: 'center',
  },
  signatureBox: {
    width: '100%',
    height: 400,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#007AFF',
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    overflow: 'hidden',
  },
  previewBox: {
    marginBottom: 16,
    alignItems: 'center',
  },
  previewText: {
    marginBottom: 8,
    fontSize: 16,
    fontWeight: 'bold',
  },
  signaturePreview: {
    width: 250,
    height: 80,
    borderWidth: 1,
    borderColor: '#000',
    backgroundColor: '#fff',
  },
  button: {
    width: '100%',
    height: 48,
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 18,
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 4,
    elevation: 3,
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