import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// Import your screens correctly
import MapScreen from './src/screen/MapScreen';
import ChatScreen from './src/screen/ChatScreen';
import ProfileScreen from './src/screen/ProfileScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// This stack allows navigation between Map and Chat within one tab
function MapStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Map" component={MapScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator 
        screenOptions={{ 
          headerShown: false,
          tabBarActiveTintColor: '#6200ee',
          tabBarInactiveTintColor: 'gray',
        }}
      >
        <Tab.Screen name="Explore" component={MapStack} />
        <Tab.Screen name="Identity" component={ProfileScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}