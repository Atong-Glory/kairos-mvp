import React, { useState } from 'react';
import { usePaletteStyles } from '../../context/ThemeContext';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { AuthScreenProps } from '../../navigation/types';
import AnimatedPressable from '../../components/AnimatedPressable';
import { useTheme } from '../../context/ThemeContext';
import PaletteSwitcher from '../../components/PaletteSwitcher';

export default function Login({ navigation }: AuthScreenProps<'Login'>) {
  const themedStyles = usePaletteStyles(styles);
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Please enter email and password' });
      return;
    }
    
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      Toast.show({ type: 'error', text1: 'Login Failed', text2: error.message });
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={themedStyles.container}>
      <View style={themedStyles.content}>
        <Text style={themedStyles.title}>Welcome to Kairos</Text>
        <Text style={themedStyles.subtitle}>Sign in to your account</Text>
        <View style={{ marginBottom: 22 }}>
          <PaletteSwitcher compact />
        </View>

        <View style={themedStyles.inputContainer}>
          <Text style={themedStyles.label}>Email</Text>
          <TextInput
            style={themedStyles.input}
            placeholder="producer@kairos.com"
            placeholderTextColor={theme.colors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={themedStyles.inputContainer}>
          <Text style={themedStyles.label}>Password</Text>
          <TextInput
            style={themedStyles.input}
            placeholder="••••••••"
            placeholderTextColor={theme.colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <AnimatedPressable style={themedStyles.button} onPress={handleLogin} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={theme.colors.accentContrast} />
          ) : (
            <Text style={themedStyles.buttonText}>Sign In</Text>
          )}
        </AnimatedPressable>

        <View style={themedStyles.footer}>
          <Text style={themedStyles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
            <Text style={themedStyles.linkText}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#E2E8F0',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    color: '#F8FAFC',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  button: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  linkText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
