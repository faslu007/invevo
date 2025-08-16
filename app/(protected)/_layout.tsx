import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function ProtectedTabs() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#1976d2',
        tabBarInactiveTintColor: '#6a7a90',
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen 
        name="home" 
        options={{
          tabBarIcon: ({ color }) => <Ionicons name="home-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen 
        name="invoice" 
        options={{
          tabBarIcon: ({ color }) => <Ionicons name="document-text-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen 
        name="product" 
        options={{
          tabBarIcon: ({ color }) => <Ionicons name="cube-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen 
        name="customers" 
        options={{
          tabBarIcon: ({ color }) => <Ionicons name="people-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen 
        name="config" 
        options={{
          tabBarIcon: ({ color }) => <Ionicons name="settings-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen 
        name="create-marchant" 
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="create-product"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="edit-product"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="create-customer"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="edit-customer"
        options={{
          href: null, // Hide from tab bar
        }}
      />
    </Tabs>
  );
}
