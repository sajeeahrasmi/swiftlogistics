import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from './apiClient';

export const login = async (email: string, password: string) => {
  const response = await apiClient.post('/auth/login', { email, password });
  const { access_token, refresh_token } = response.data.data.tokens;
  await AsyncStorage.setItem('access_token', access_token);
  await AsyncStorage.setItem('refresh_token', refresh_token);
  return response.data.data.user;
};

export const logout = async () => {
  await apiClient.post('/auth/logout');
  await AsyncStorage.removeItem('access_token');
  await AsyncStorage.removeItem('refresh_token');
};

export const refreshToken = async () => {
  const refresh_token = await AsyncStorage.getItem('refresh_token');
  if (!refresh_token) throw new Error('No refresh token');
  const response = await apiClient.post('/auth/refresh-token', { refresh_token });
  const { access_token, refresh_token: newRefresh } = response.data.data.tokens;
  await AsyncStorage.setItem('access_token', access_token);
  await AsyncStorage.setItem('refresh_token', newRefresh);
  return access_token;
};

export const getProfile = async () => {
  const response = await apiClient.get('/auth/me');
  return response.data.data.user;
};
