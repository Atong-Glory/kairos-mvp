import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import Toast from 'react-native-toast-message';
import { ProjectsScreenProps } from '../../navigation/types';
import AnimatedPressable from '../../components/AnimatedPressable';

type PermissionLevel = 'viewer' | 'editor';

export default function InviteCrew({ route, navigation }: ProjectsScreenProps<'InviteCrew'>) {
  const { user, tenantId } = useAuth();
  const { projectId } = route.params;
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [permissionLevel, setPermissionLevel] = useState<PermissionLevel>('viewer');
  const [loading, setLoading] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleInvite = async () => {
    // Validation
    if (!email.trim()) {
      Toast.show({ type: 'error', text1: 'Email Required', text2: 'Please enter an email address.' });
      return;
    }

    if (!validateEmail(email.trim())) {
      Toast.show({ type: 'error', text1: 'Invalid Email', text2: 'Please enter a valid email address.' });
      return;
    }

    if (!fullName.trim()) {
      Toast.show({ type: 'error', text1: 'Name Required', text2: 'Please enter the crew member\'s full name.' });
      return;
    }

    if (!user?.id) {
      Toast.show({ type: 'error', text1: 'Auth Error', text2: 'You must be logged in to send invitations.' });
      return;
    }

    setLoading(true);
    try {
      // Call the Edge Function to send invitation
      const { data, error } = await supabase.functions.invoke('send-crew-invite', {
        body: {
          email: email.trim().toLowerCase(),
          full_name: fullName.trim(),
          project_id: projectId,
          invited_by_user_id: user.id,
          permission_level: permissionLevel,
        },
      });

      if (error) throw error;

      Toast.show({
        type: 'success',
        text1: '✅ Invitation Sent!',
        text2: `${fullName} will receive an email to join the project as a ${permissionLevel}.`,
        visibilityTime: 4000,
      });

      // Reset form
      setEmail('');
      setFullName('');
      setPermissionLevel('viewer');

      // Navigate back or show success state
      setTimeout(() => navigation.goBack(), 2000);
    } catch (err: any) {
      console.error('Invitation error:', err);
      
      // Handle specific error messages
      if (err.message?.includes('already')) {
        Toast.show({ type: 'error', text1: 'Already Added', text2: 'This person is already part of the project.' });
      } else if (err.message?.includes('invite')) {
        Toast.show({ type: 'error', text1: 'Invitation Failed', text2: err.message });
      } else {
        Toast.show({ type: 'error', text1: 'Error', text2: err.message || 'Failed to send invitation.' });
      }
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
          <Text style={styles.title}>Invite Crew Member</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.iconContainer}>
            <Icon name="person-add" size={40} color="#3B82F6" />
          </View>
          
          <Text style={styles.description}>
            Send a professional email invitation. They'll receive a sign-up link and be added to your production team.
          </Text>

          {/* Full Name Input */}
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Jordan Lee"
            placeholderTextColor="#64748B"
            value={fullName}
            onChangeText={setFullName}
            autoFocus
            editable={!loading}
          />

          {/* Email Input */}
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="jordan.lee@studio.com"
            placeholderTextColor="#64748B"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
          />

          {/* Permission Level Selector */}
          <Text style={styles.label}>Role & Permissions</Text>
          <View style={styles.permissionContainer}>
            <TouchableOpacity
              style={[
                styles.permissionOption,
                permissionLevel === 'viewer' && styles.permissionOptionActive,
              ]}
              onPress={() => setPermissionLevel('viewer')}
              disabled={loading}
            >
              <Icon 
                name="eye-outline" 
                size={20} 
                color={permissionLevel === 'viewer' ? '#3B82F6' : '#94A3B8'} 
                style={{ marginRight: 8 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.permissionLabel, permissionLevel === 'viewer' && styles.permissionLabelActive]}>
                  👀 Viewer
                </Text>
                <Text style={styles.permissionDescription}>Read-only access (budgets hidden)</Text>
              </View>
              {permissionLevel === 'viewer' && <Icon name="checkmark-circle" size={24} color="#3B82F6" />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.permissionOption,
                permissionLevel === 'editor' && styles.permissionOptionActive,
              ]}
              onPress={() => setPermissionLevel('editor')}
              disabled={loading}
            >
              <Icon 
                name="pencil-outline" 
                size={20} 
                color={permissionLevel === 'editor' ? '#3B82F6' : '#94A3B8'} 
                style={{ marginRight: 8 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.permissionLabel, permissionLevel === 'editor' && styles.permissionLabelActive]}>
                  ✏️ Editor
                </Text>
                <Text style={styles.permissionDescription}>Full access (can edit all project data)</Text>
              </View>
              {permissionLevel === 'editor' && <Icon name="checkmark-circle" size={24} color="#3B82F6" />}
            </TouchableOpacity>
          </View>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Icon name="information-circle" size={20} color="#3B82F6" style={{ marginRight: 12 }} />
            <Text style={styles.infoText}>
              Viewers can see all project details but can't edit. Editors have full control. You can change permissions later.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <AnimatedPressable
            style={[styles.button, (!email.trim() || !fullName.trim() || loading) && styles.buttonDisabled]}
            onPress={handleInvite}
            disabled={loading || !email.trim() || !fullName.trim()}
          >
            {loading ? (
              <>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={[styles.buttonText, { marginLeft: 8 }]}>Sending...</Text>
              </>
            ) : (
              <>
                <Icon name="paper-plane-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.buttonText}>Send Invitation</Text>
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
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#F8FAFC' },
  content: { flex: 1, paddingHorizontal: 24, paddingVertical: 20 },
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
    marginBottom: 24,
  },
  // Permission Level Styles
  permissionContainer: {
    gap: 12,
    marginBottom: 20,
  },
  permissionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#334155',
  },
  permissionOptionActive: {
    backgroundColor: '#1E3A5F',
    borderColor: '#3B82F6',
  },
  permissionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  permissionLabelActive: {
    color: '#3B82F6',
  },
  permissionDescription: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  // Info Box
  infoBox: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#1E3A5F',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#CBD5E1',
    lineHeight: 20,
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
  buttonDisabled: { backgroundColor: '#1E293B', opacity: 0.5 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});
