import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const BASE_URL = 'http://192.168.24.149:3002/api'; // Order-service endpoints

const orderApiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

orderApiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});


// Correct delivery status update endpoint
export async function updateDeliveryStatus(assignmentId: string, status: string) {
  // Confirm the correct endpoint and payload with backend docs
  return orderApiClient.post('/deliveries/update-status', {
    assignment_id: assignmentId,
    status,
  });
}

export default orderApiClient;
