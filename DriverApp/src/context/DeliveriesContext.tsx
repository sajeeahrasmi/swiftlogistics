import React, { createContext, useContext, useEffect, useState } from 'react';
import apiClient from '../api/apiClient';

export type Delivery = {
  assignment_id: number;
  assignment_status: string;
  delivery_address: string;
  recipient_name: string;
  recipient_phone: string;
  pickup_address: string;
  signature?: string;
};

// Removed hardcodedDeliveries. All data comes from backend.

interface DeliveriesContextType {
  deliveries: Delivery[];
  setDeliveries: React.Dispatch<React.SetStateAction<Delivery[]>>;
  resetDeliveries: () => void;
}

const DeliveriesContext = createContext<DeliveriesContextType | undefined>(undefined);

export const DeliveriesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const resetDeliveries = async () => {
    await fetchDeliveries();
  };

  const fetchDeliveries = async () => {
    try {
      const res = await apiClient.get('/deliveries');
      if (res.data && res.data.deliveries) {
        setDeliveries(res.data.deliveries);
      }
    } catch (err) {
      setDeliveries([]);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, []);

  return (
    <DeliveriesContext.Provider value={{ deliveries, setDeliveries, resetDeliveries }}>
      {children}
    </DeliveriesContext.Provider>
  );
};

export const useDeliveries = () => {
  const context = useContext(DeliveriesContext);
  if (!context) throw new Error('useDeliveries must be used within a DeliveriesProvider');
  return context;
};
