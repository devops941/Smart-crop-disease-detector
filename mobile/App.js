/**
 * =============================================================================
 * SMART CROP DISEASE DETECTOR - ROOT APPLICATION
 * =============================================================================
 * Stack Navigation configuration with green/earth theme headers and safe area.
 * =============================================================================
 */

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { THEME } from './src/theme';
import { STRINGS } from './src/strings';

// Screens
import { HomeScreen } from './src/screens/HomeScreen';
import { ResultScreen } from './src/screens/ResultScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { DiseaseDetailsScreen } from './src/screens/DiseaseDetailsScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="light" backgroundColor={THEME.colors.primary} />
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerStyle: {
              backgroundColor: THEME.colors.primary,
            },
            headerTintColor: THEME.colors.textLight,
            headerTitleStyle: {
              fontWeight: '800',
              fontSize: 19,
            },
            headerTitleAlign: 'center',
            contentStyle: {
              backgroundColor: THEME.colors.background,
            },
          }}
        >
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{
              title: STRINGS.appName,
            }}
          />

          <Stack.Screen
            name="Result"
            component={ResultScreen}
            options={{
              title: STRINGS.resultTitle,
              headerBackTitle: 'Back',
            }}
          />

          <Stack.Screen
            name="History"
            component={HistoryScreen}
            options={{
              title: STRINGS.historyTitle,
              headerBackTitle: 'Home',
            }}
          />

          <Stack.Screen
            name="DiseaseDetails"
            component={DiseaseDetailsScreen}
            options={{
              title: STRINGS.detailsTitle,
              headerBackTitle: 'Results',
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
