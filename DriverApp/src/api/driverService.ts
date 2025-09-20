// Fetch a single delivery assignment by assignmentId
export const getDeliveryDetails = async (assignmentId: number) => {
  const response = await orderApiClient.get(`/driverApp/deliveries/${assignmentId}`);
  return response.data.delivery;
};
import orderApiClient from './orderApiClient';

export const getAssignedDeliveries = async () => {
  const response = await orderApiClient.get('/driverApp/deliveries');
  return response.data.deliveries || response.data.data?.deliveries;
};

export const updateDeliveryStatus = async (assignmentId: number, status: string, driver_id: number) => {
  const response = await orderApiClient.post(`/driverApp/deliveries/${assignmentId}/status`, {
    status,
    driver_id,
  });
  return response.data;
};

export const uploadProofOfDelivery = async (
  assignmentId: number,
  photoUrl: string,
  signature: string,
  driver_id: number
) => {
  const response = await orderApiClient.post(`/driverApp/deliveries/${assignmentId}/proof`, {
    photoUrl,
    signature,
    driver_id,
  });
  return response.data;
};

export const getDriverProfile = async () => {
  const response = await orderApiClient.get('/driverApp/profile');
  return response.data;
};

export const updateDriverStatus = async (status: string) => {
  const response = await orderApiClient.patch('/driverApp/status', { status });
  return response.data;
};
