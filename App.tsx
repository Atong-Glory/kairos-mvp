import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ActivityIndicator, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

// Auth Screens
import Login from './src/screens/Auth/Login';
import SignUp from './src/screens/Auth/SignUp';

// Main Screens
import Dashboard from './src/screens/Main/Dashboard';
import CreateProject from './src/screens/Main/CreateProject';
import ProjectDetails from './src/screens/Main/ProjectDetails';
import ScriptViewer from './src/screens/Main/ScriptViewer';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const ProjectsStack = createStackNavigator();

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="SignUp" component={SignUp} />
    </Stack.Navigator>
  );
}

function ProjectsStackNavigator() {
  return (
    <ProjectsStack.Navigator 
      screenOptions={{ 
        headerShown: false,
        cardStyle: { backgroundColor: '#0F172A' }
      }}
    >
      <ProjectsStack.Screen name="DashboardList" component={Dashboard} />
      <ProjectsStack.Screen name="CreateProject" component={CreateProject} />
      <ProjectsStack.Screen name="ProjectDetails" component={ProjectDetails} />
      <ProjectsStack.Screen name="ScriptViewer" component={ScriptViewer} />
    </ProjectsStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator 
      screenOptions={{ 
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1E293B',
          borderTopColor: '#334155',
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#64748B',
      }}
    >
      <Tab.Screen 
        name="Projects" 
        component={ProjectsStackNavigator} 
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="film-outline" color={color} size={size} />
          ),
        }}
      />
      {/* Additional tabs like User Profile or Global Settings can go here */}
    </Tab.Navigator>
  );
}

function NavigationWrapper() {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' }}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {session && session.user ? <MainTabs /> : <AuthStack />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationWrapper />
    </AuthProvider>
  );
}
