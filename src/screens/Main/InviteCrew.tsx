import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { supabase } from '../../lib/supabase';

export default function InviteCrew({ route, navigation }: any) {
  const { tenantId } = route.params;
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInvite = async () => {
    if (!email.trim() || !fullName.trim()) {
      Alert.alert('Required', 'Please fill in all fields.');
      return;
    }

    setLoading(true);
    try {
      // Sign them up with a random temp password. They'll need to reset via Supabase email.
      // This is the zero-budget approach: Supabase sends a magic link or password reset.
      const tempPassword = Math.random().toString(36).slice(-10) + 'Kx1!';

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: tempPassword,
        options: {
          data: { full_name: fullName.trim() },
        },
      });

      if (error) throw error;

      if (data.user) {
        // Insert them into the users table under this tenant
        const { error: profileError } = await supabase.from('users').insert([{
          id: data.user.id,
          tenant_id: tenantId,
          full_name: fullName.trim(),
        }]);

        if (profileError) throw profileError;
      }

      Alert.alert(
        'Crew Member Added!',
        `${fullName} has been added to your production house. They will receive a confirmation email to set their password.`
      );
      navigation.goBack();
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', err.message || 'Failed to add crew member.');
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
            Add a crew member to your production house. They'll receive an email to confirm their account and set a password.
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
          <TouchableOpacity
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
          </TouchableOpacity>
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
