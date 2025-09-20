// import axios from 'axios';

// // TODO: Replace with your backend base URL and port for order-service
// export const api = axios.create({
//   baseURL: 'http://10.0.2.2:3002', // Android emulator, change to your IP if needed
//   timeout: 10000,
// });

// export async function getDeliveries(token: string) {
//   const resp = await api.get('/deliveries', {
//     headers: { Authorization: `Bearer ${token}` },
//   });
//   return resp.data.deliveries;
// }

// export async function updateDeliveryStatus(token: string, assignmentId: number, status: string) {
//   return api.post(
//     '/status',
//     { assignmentId, status },
//     { headers: { Authorization: `Bearer ${token}` } }
//   );
// }

// export async function uploadProof(token: string, assignmentId: number, photoUrl: string, signature: string) {
//   return api.post(
//     '/proof',
//     { assignmentId, photoUrl, signature },
//     { headers: { Authorization: `Bearer ${token}` } }
//   );
// }
import axios from 'axios';

// Replace with your backend base URL and port for tracking-service
const TRACKING_API = 'http://10.0.2.2:3003'; // Android emulator, change to your IP if needed

export async function sendLocationUpdate() {
	// Hardcoded demo location
	const data = {
		driverId: 'driver123',
		latitude: 37.7749,
		longitude: -122.4194,
		timestamp: Date.now(),
	};
	try {
		const resp = await axios.post(`${TRACKING_API}/location`, data);
		return resp.data;
	} catch (err) {
		return { error: err.message };
	}
}
