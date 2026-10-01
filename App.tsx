import React from 'react';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { PermissionsProvider } from './src/context/PermissionsContext';
import { NotificationsProvider } from './src/context/NotificationsContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { ActivityIndicator, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import { AuthStackParamList, ProjectsStackParamList } from './src/navigation/types';

// Auth Screens
import Login from './src/screens/Auth/Login';
import SignUp from './src/screens/Auth/SignUp';

// Main Screens
import Dashboard from './src/screens/Main/Dashboard';
import CreateProject from './src/screens/Main/CreateProject';
import ProjectDetails from './src/screens/Main/ProjectDetails';
import ScriptViewer from './src/screens/Main/ScriptViewer';
import RoleManagement from './src/screens/Main/RoleManagement';
import InviteCrew from './src/screens/Main/InviteCrew';
import SceneManager from './src/screens/Main/SceneManager';
import ShootDayBoard from './src/screens/Main/ShootDayBoard';
import CallSheetView from './src/screens/Main/CallSheetView';
import BudgetTracker from './src/screens/Main/BudgetTracker';
import StoryboardContinuity from './src/screens/Main/StoryboardContinuity';
import TeamChat from './src/screens/Main/TeamChat';
import VideoCall from './src/screens/Main/VideoCall';
import ProjectSettings from './src/screens/Main/ProjectSettings';

const Stack = createStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator();
const ProjectsStack = createStackNavigator<ProjectsStackParamList>();

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="SignUp" component={SignUp} />
    </Stack.Navigator>
  );
}

function ProjectsStackNavigator() {
  const { theme } = useTheme();
  return (
    <ProjectsStack.Navigator 
      screenOptions={{ 
        headerShown: false,
        cardStyle: { backgroundColor: theme.colors.background }
      }}
    >
      <ProjectsStack.Screen name="DashboardList" component={Dashboard} />
      <ProjectsStack.Screen name="CreateProject" component={CreateProject} />
      <ProjectsStack.Screen name="ProjectDetails" component={ProjectDetails} />
      <ProjectsStack.Screen name="ScriptViewer" component={ScriptViewer} />
      <ProjectsStack.Screen name="RoleManagement" component={RoleManagement} />
      <ProjectsStack.Screen name="InviteCrew" component={InviteCrew} />
      <ProjectsStack.Screen name="SceneManager" component={SceneManager} />
      <ProjectsStack.Screen name="ShootDayBoard" component={ShootDayBoard} />
      <ProjectsStack.Screen name="CallSheetView" component={CallSheetView} />
      <ProjectsStack.Screen name="BudgetTracker" component={BudgetTracker} />
      <ProjectsStack.Screen name="StoryboardContinuity" component={StoryboardContinuity} />
      <ProjectsStack.Screen name="TeamChat" component={TeamChat} />
      <ProjectsStack.Screen name="VideoCall" component={VideoCall} />
      <ProjectsStack.Screen name="ProjectSettings" component={ProjectSettings} />
    </ProjectsStack.Navigator>
  );
}

function MainTabs() {
  const { theme } = useTheme();
  return (
    <Tab.Navigator 
      screenOptions={{ 
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.tabBar,
          borderTopColor: theme.colors.border,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textMuted,
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
  const { session, isLoading: authLoading } = useAuth();
  const { theme, isLoading: themeLoading } = useTheme();

  if (authLoading || themeLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={{
      ...DefaultTheme,
      dark: theme.palette === 'midnight',
      colors: {
        ...DefaultTheme.colors,
        primary: theme.colors.accent,
        background: theme.colors.background,
        card: theme.colors.surface,
        text: theme.colors.text,
        border: theme.colors.border,
        notification: theme.colors.danger,
      },
    }}>
      {session && session.user ? <MainTabs /> : <AuthStack />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <PermissionsProvider>
          <NotificationsProvider>
            <NavigationWrapper />
            <Toast />
          </NotificationsProvider>
        </PermissionsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
