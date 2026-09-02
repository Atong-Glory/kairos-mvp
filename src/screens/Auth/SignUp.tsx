import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { supabase, AUTH_REDIRECT_URL } from '../../lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { AuthScreenProps } from '../../navigation/types';
import AnimatedPressable from '../../components/AnimatedPressable';
import { isValidEmail, MIN_PASSWORD_LENGTH } from '../../lib/validation';

export default function SignUp({ navigation }: AuthScreenProps<'SignUp'>) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!fullName.trim() || !trimmedEmail || !password || !tenantName.trim()) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Please fill in all fields' });
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      Toast.show({ type: 'error', text1: 'Invalid Email', text2: 'Please enter a valid email address.' });
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      Toast.show({ type: 'error', text1: 'Weak Password', text2: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
      return;
    }

    setLoading(true);
    // Tenant + profile rows are created by the on_auth_user_created trigger
    // (supabase/migrations) from this metadata, with a client-side fallback in AuthContext.
    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        emailRedirectTo: AUTH_REDIRECT_URL,
        data: { full_name: fullName.trim(), tenant_name: tenantName.trim() },
      },
    });
    setLoading(false);

    if (error) {
      Toast.show({ type: 'error', text1: 'Sign Up Failed', text2: error.message });
      return;
    }

    if (data.session) {
      // Email confirmation disabled: AuthContext picks up the new session automatically.
      return;
    }

    Toast.show({
      type: 'success',
      text1: 'Check your email',
      text2: `We sent a confirmation link to ${trimmedEmail}. Confirm it, then sign in.`,
      visibilityTime: 6000,
    });
    navigation.navigate('Login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Set up your production house</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Production House</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. DreamWorks"
              placeholderTextColor="#888"
              value={tenantName}
              onChangeText={setTenantName}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Your Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Jordan Lee"
              placeholderTextColor="#888"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="producer@kairos.com"
              placeholderTextColor="#888"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="At least 8 characters"
              placeholderTextColor="#888"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType="newPassword"
            />
          </View>

          <AnimatedPressable style={styles.button} onPress={handleSignUp} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign Up</Text>
            )}
          </AnimatedPressable>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.linkText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  content: {
    flexGrow: 1,
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
