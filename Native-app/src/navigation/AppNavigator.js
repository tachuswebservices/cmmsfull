import React, { useContext } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Import screens
import PhoneLoginScreen from '../screens/auth/PhoneLoginScreen';
import OtpVerifyScreen from '../screens/auth/OtpVerifyScreen';
import SetPinScreen from '../screens/auth/SetPinScreen';
import PinUnlockScreen from '../screens/auth/PinUnlockScreen';
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import WorkOrderDetailsScreen from '../screens/workOrder/WorkOrderDetailsScreen';
import QRScannerScreen from '../screens/scanner/QRScannerScreen';
import BreakdownReportScreen from '../screens/breakdown/BreakdownReportScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import PreventiveMaintenanceScreen from '../screens/maintenance/PreventiveMaintenanceScreen';

// Import contexts
import { AuthContext } from '../contexts/AuthContext';
import { ThemeContext } from '../contexts/ThemeContext';
import { LanguageContext } from '../contexts/LanguageContext';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Bottom Tab Navigator
const MainTabNavigator = () => {
  const { theme } = useContext(ThemeContext);
  const { translations } = useContext(LanguageContext);
  const { hasPendingPreventive } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  // We rely on initialRouteName + key to remount the tab navigator when the flag changes
  
  return (
    <Tab.Navigator
      initialRouteName={hasPendingPreventive ? 'Scanner' : 'Dashboard'}
      key={hasPendingPreventive ? 'scanner-initial' : 'dashboard-initial'}
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Scanner') {
            iconName = focused ? 'qr-code' : 'qr-code-outline';
          } else if (route.name === 'Breakdown') {
            iconName = focused ? 'alert-circle' : 'alert-circle-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopColor: theme.border,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom + 8, 16),
          height: 64 + insets.bottom,
        },
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: {
          fontSize: 12,
          marginTop: 2,
        },
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen} 
        options={{ 
          headerShown: false,
          title: translations?.dashboard || 'Dashboard'
        }}
      />
      <Tab.Screen 
        name="Scanner" 
        component={QRScannerScreen} 
        options={{ 
          headerShown: false,
          title: translations?.scanner || 'Scanner'
        }}
      />
      <Tab.Screen 
        name="Breakdown" 
        component={BreakdownReportScreen} 
        options={{ 
          headerShown: false,
          title: translations?.breakdown || 'Breakdown'
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ 
          headerShown: false,
          title: translations?.profile || 'Profile'
        }}
      />
    </Tab.Navigator>
  );
};

// Main App Navigator
const AppNavigator = () => {
  const { isAuthenticated, hasPin } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.primary,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontFamily: theme.fonts && theme.fonts.bold ? theme.fonts.bold : undefined,
        },
        contentStyle: { backgroundColor: theme.background },
      }}>
        {!isAuthenticated ? (
          // Auth Stack
          hasPin ? (
            // Require PIN unlock if a PIN is set
            <Stack.Screen
              name="PinUnlock"
              component={PinUnlockScreen}
              options={{ headerShown: false }}
            />
          ) : (
            // Phone OTP + PIN setup flow
            <>
              <Stack.Screen
                name="PhoneLogin"
                component={PhoneLoginScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="OtpVerify"
                component={OtpVerifyScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="SetPin"
                component={SetPinScreen}
                options={{ headerShown: false }}
              />
            </>
          )
        ) : (
          // Main App Stack
          <>
            <Stack.Screen 
              name="Main" 
              component={MainTabNavigator} 
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="WorkOrderDetails" 
              component={WorkOrderDetailsScreen} 
              options={({ route }) => ({ 
                title: route.params?.title || 'Work Order Details',
                headerBackTitleVisible: false
              })}
            />
            <Stack.Screen
              name="PreventiveMaintenance"
              component={PreventiveMaintenanceScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="BreakdownReport"
              component={BreakdownReportScreen}
              options={{
                headerShown: false,
              }}
            />
          </>
        )}
      </Stack.Navigator>
  );
};

export default AppNavigator;
