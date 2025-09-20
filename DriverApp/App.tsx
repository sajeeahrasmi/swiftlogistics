import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { AuthProvider } from './src/context/AuthContext';
import { DeliveriesProvider } from './src/context/DeliveriesContext';
import DeliveriesList from './src/newScreens/DeliveriesList';
import DeliveryComplete from './src/newScreens/DeliveryComplete';
import DeliveryDetails from './src/newScreens/DeliveryDetails';
import Home from './src/newScreens/Home';
import Login from './src/newScreens/Login';
import ProofOfDelivery from './src/newScreens/ProofOfDelivery';
import RouteMap from './src/newScreens/RouteMap';

const Stack = createStackNavigator();

export default function App() {
  return (
    <AuthProvider>
      <DeliveriesProvider>
        <NavigationContainer>
          <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" component={Login} />
            <Stack.Screen name="Home" component={Home} />
            <Stack.Screen name="DeliveriesList" component={DeliveriesList} />
            <Stack.Screen name="DeliveryDetails" component={DeliveryDetails} />
            <Stack.Screen name="ProofOfDelivery" component={ProofOfDelivery} />
            <Stack.Screen name="DeliveryComplete" component={DeliveryComplete} />
            <Stack.Screen name="RouteMap" component={RouteMap} />
            {/* Add other screens here */}
          </Stack.Navigator>
        </NavigationContainer>
      </DeliveriesProvider>
    </AuthProvider>
  );
}