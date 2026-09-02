import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { supabase, supabaseNoSession, AUTH_REDIRECT_URL } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import Toast from 'react-native-toast-message';
import { ProjectsScreenProps } from '../../navigation/types';
import AnimatedPressable from '../../components/AnimatedPressable';
import { isValidEmail, errorMessage } from '../../lib/validation';

const PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
const randomPassword = () =>
  Array.from({ length: 24 }, () => PASSWORD_CHARS[Math.floor(Math.random() * PASSWORD_CHARS.length)]).join('');

export default function InviteCrew({ route, navigation }: ProjectsScreenProps<'InviteCrew'>) {
  const { tenantId } = useAuth();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInvite = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = fullName.trim();
    if (!trimmedEmail || !trimmedName) {
      Toast.show({ type: 'error', text1: 'Required', text2: 'Please fill in all fields.' });
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      Toast.show({ type: 'error', text1: 'Invalid Email', text2: 'Please enter a valid email address.' });
      return;
    }
    if (!tenantId) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Your production house could not be determined. Please sign in again.' });
      return;
    }

    setLoading(true);
    try {
      // Uses the session-less client so the inviter stays signed in. The invitee gets a
      // confirmation email, then sets their own password via "Forgot password?".
      const { data, error } = await supabaseNoSession.auth.signUp({
        email: trimmedEmail,
        password: randomPassword(),
        options: {
          emailRedirectTo: AUTH_REDIRECT_URL,
          data: { full_name: trimmedName, tenant_id: tenantId },
        },
      });

      if (error) throw error;

      // Supabase returns an obfuscated user with no identities when the email is already registered.
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        throw new Error('An account with this email already exists.');
      }

      if (data.user) {
        // The on_auth_user_created trigger creates the profile from the metadata above.
        // Verify it landed in this tenant so a missing trigger surfaces immediately.
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('id')
          .eq('id', data.user.id)
          .maybeSingle();
        if (profileError) throw profileError;
        if (!profile) {
          throw new Error(
            'Account created but profile was not provisioned. Apply the latest Supabase migration (on_auth_user_created trigger).'
          );
        }
      }

      Toast.show({
        type: 'success',
        text1: 'Invitation Sent',
        text2: `${trimmedName} will receive an email to confirm their account, then can set a password from the sign-in screen.`,
        visibilityTime: 6000,
      });
      navigation.goBack();
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Invite Failed', text2: errorMessage(err, 'Failed to add crew member.') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="arrow-back" size={24} color="#F8FAFC" />
          </TouchableOpacity>
          <Text style={styles.title}>Add Crew Member</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Icon name="person-add" size={40} color="#3B82F6" />
          </View>
          <Text style={styles.description}>
            Add a crew member to your production house. They'll receive an email to confirm their account, then set a password via "Forgot password?" on the sign-in screen.
          </Text>

          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Jordan Lee"
            placeholderTextColor="#64748B"
            value={fullName}
            onChangeText={setFullName}
            autoFocus
          />

          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="jordan.lee@studio.com"
            placeholderTextColor="#64748B"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.footer}>
          <AnimatedPressable
            style={[styles.button, (!email.trim() || !fullName.trim()) && styles.buttonDisabled]}
            onPress={handleInvite}
            disabled={loading || !email.trim() || !fullName.trim()}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Icon name="paper-plane-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.buttonText}>Add to Production House</Text>
              </>
            )}
          </AnimatedPressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#F8FAFC' },
  content: { flex: 1, paddingHorizontal: 24 },
  iconContainer: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#1E3A5F',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
  },
  description: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 32,
  },
  label: { fontSize: 14, fontWeight: '600', color: '#E2E8F0', marginBottom: 8 },
  input: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    color: '#F8FAFC',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  footer: { padding: 24, paddingBottom: 32, borderTopWidth: 1, borderTopColor: '#1E293B' },
  button: {
    flexDirection: 'row',
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { backgroundColor: '#1E293B' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});
