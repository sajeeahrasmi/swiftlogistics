import React, { useState } from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const { height } = Dimensions.get('window');

export default function Login({ navigation }: any) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = () => {
    // Hardcoded login: username 'driver', password '1234'
    if (username === 'driver2@swift.com' && password === 'MWSucks12#') {
      navigation.replace('Home');
    } else {
      setError('Invalid credentials. Try driver/1234');
    }
  };

  return (
    <View style={styles.gradientBg}>
      <View style={styles.loginBox}>
        <Text style={styles.appTitle}>Swift Track</Text>
        <Text style={styles.title}>Driver Login</Text>
        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor="#888"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#888"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity style={styles.button} onPress={handleLogin} activeOpacity={0.85}>
          <LinearGradient
            colors={["#667eea", "#764ba2"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.buttonGradient}
          >
            <Text style={styles.buttonText}>Login</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  gradientBg: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8fc',
  },
  loginBox: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 6,
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 10,
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.08)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#667eea',
    alignSelf: 'center',
  },
  input: {
    width: '100%',
    height: 48,
    borderColor: '#e0e0e0',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    fontSize: 16,
    color: '#222',
    backgroundColor: '#f4f6fa',
  },
  error: {
    color: '#ff6b6b',
    marginBottom: 12,
    fontWeight: 'bold',
    fontSize: 15,
  },
  button: {
    width: '100%',
    height: 48,
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 2,
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
