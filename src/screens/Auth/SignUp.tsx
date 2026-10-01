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

export default function SignUp({ navigation }: AuthScreenProps<'SignUp'>) {
  const themedStyles = usePaletteStyles(styles);
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!email || !password || !tenantName) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Please fill in all fields' });
      return;
    }
    
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (error) {
      Toast.show({ type: 'error', text1: 'Sign Up Failed', text2: error.message });
      setLoading(false);
      return;
    }
    
    // For a real app, this should ideally be in a secure Edge Function/Trigger.
    // For MVP, we do it directly from client if RLS permits or using service key in backend.
    // Assuming RLS on tenants/users allows insert on signup.
    try {
      if (data.user) {
        // 1. Create tenant
        const { data: tenantData, error: tenantError } = await supabase
          .from('tenants')
          .insert([{ name: tenantName }])
          .select()
          .single();
          
        if (tenantError) throw tenantError;
        
        // 2. Create user profile
        const { error: userError } = await supabase
          .from('users')
          .insert([{ id: data.user.id, tenant_id: tenantData.id, full_name: email.split('@')[0] }]);
          
        if (userError) throw userError;
        
        Toast.show({ type: 'success', text1: 'Success', text2: 'Account created! You can now log in.' });
        navigation.navigate('Login');
      }
    } catch (err: any) {
      console.error(err);
      Toast.show({ type: 'error', text1: 'Setup Error', text2: err.message || 'Failed to setup production house.' });
    }
    
    setLoading(false);
  };

  return (
    <SafeAreaView style={themedStyles.container}>
      <View style={themedStyles.content}>
        <Text style={themedStyles.title}>Create Account</Text>
        <Text style={themedStyles.subtitle}>Start managing your productions</Text>
        <View style={{ marginBottom: 20 }}>
          <PaletteSwitcher compact />
        </View>

        <View style={themedStyles.inputContainer}>
          <Text style={themedStyles.label}>Production House (Tenant)</Text>
          <TextInput
            style={themedStyles.input}
            placeholder="e.g. DreamWorks"
            placeholderTextColor={theme.colors.textMuted}
            value={tenantName}
            onChangeText={setTenantName}
          />
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

        <AnimatedPressable style={themedStyles.button} onPress={handleSignUp} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={theme.colors.accentContrast} />
          ) : (
            <Text style={themedStyles.buttonText}>Sign Up</Text>
          )}
        </AnimatedPressable>

        <View style={themedStyles.footer}>
          <Text style={themedStyles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={themedStyles.linkText}>Sign In</Text>
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
