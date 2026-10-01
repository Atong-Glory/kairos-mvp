import React, { useState } from 'react';
import { usePaletteStyles } from '../../context/ThemeContext';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import Icon from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import { ProjectsScreenProps } from '../../navigation/types';
import AnimatedPressable from '../../components/AnimatedPressable';

export default function CreateProject({ navigation }: ProjectsScreenProps<'CreateProject'>) {
  const themedStyles = usePaletteStyles(styles);
  const { tenantId } = useAuth();
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!projectName.trim()) {
      Toast.show({ type: 'error', text1: 'Required', text2: 'Please enter a project name.' });
      return;
    }

    if (!tenantId) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Tenant ID is missing. Please log in again.' });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('projects')
        .insert([{
          name: projectName,
          tenant_id: tenantId,
          status: 'pre-production',
          script_version: 1
        }]);

      if (error) throw error;

      // Navigate back to Dashboard. Realtime subscription will auto-update the list.
      navigation.goBack();
    } catch (error: any) {
      console.error(error);
      Toast.show({ type: 'error', text1: 'Error', text2: error.message || 'Failed to create project.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={themedStyles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={themedStyles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={themedStyles.backBtn}>
            <Icon name="arrow-back" size={24} color="#F8FAFC" />
          </TouchableOpacity>
          <Text style={themedStyles.title}>New Production</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={themedStyles.content}>
          <Text style={themedStyles.label}>Project Name</Text>
          <TextInput
            style={themedStyles.input}
            placeholder="e.g. The Matrix 4"
            placeholderTextColor="#64748B"
            value={projectName}
            onChangeText={setProjectName}
            autoFocus
          />
          <Text style={themedStyles.helperText}>
            You can modify settings, upload scripts, and assign crew members after the project is created.
          </Text>
        </View>

        <View style={themedStyles.footer}>
          <AnimatedPressable
            style={[themedStyles.button, !projectName.trim() && themedStyles.buttonDisabled]}
            onPress={handleCreate}
            disabled={loading || !projectName.trim()}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={themedStyles.buttonText}>Create Project</Text>
            )}
          </AnimatedPressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E2E8F0',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    color: '#F8FAFC',
    fontSize: 18,
    borderWidth: 1,
    borderColor: '#334155',
  },
  helperText: {
    marginTop: 16,
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    padding: 24,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  button: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#1E293B',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
