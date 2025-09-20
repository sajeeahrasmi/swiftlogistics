import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import DeliveriesList from '../newScreens/DeliveriesList';
import DeliveryComplete from '../newScreens/DeliveryComplete';
import DeliveryDetails from '../newScreens/DeliveryDetails';
import Home from '../newScreens/Home';
import Login from '../newScreens/Login';
import ProofOfDelivery from '../newScreens/ProofOfDelivery';
import RouteMap from '../newScreens/RouteMap';

const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="Home" component={Home} />
        <Stack.Screen name="DeliveriesList" component={DeliveriesList} />
        <Stack.Screen name="DeliveryDetails" component={DeliveryDetails} />
        <Stack.Screen name="ProofOfDelivery" component={ProofOfDelivery} />
        <Stack.Screen name="DeliveryComplete" component={DeliveryComplete} />
        <Stack.Screen name="RouteMap" component={RouteMap} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
