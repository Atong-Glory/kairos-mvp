import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { ProjectsScreenProps } from '../../navigation/types';
import { errorMessage } from '../../lib/validation';

export default function ProjectSettings({ route, navigation }: ProjectsScreenProps<'ProjectSettings'>) {
  const { projectId, project } = route.params;
  const { tenantId } = useAuth();

  const updateStatus = async (newStatus: string) => {
    const { error } = await supabase
      .from('projects')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', projectId);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Updated', `Project status changed to ${newStatus}.`);
      navigation.goBack();
    }
  };

  const handleArchive = () => {
    Alert.alert(
      'Archive Project',
      'This will move the project to the archive. It can still be accessed from the archived tab later.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Archive', style: 'destructive', onPress: () => updateStatus('archived') },
      ]
    );
  };

  const handleClone = async () => {
    Alert.alert(
      'Clone Project',
      'This will create a copy of this project with the same roles and budget plan. Scenes will be reset to pending and dates will be cleared.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clone', onPress: async () => {
            if (!tenantId) {
              Alert.alert('Error', 'Your production house could not be determined. Please sign in again.');
              return;
            }
            try {
              // 1. Create new project
              const { data: newProject, error: projError } = await supabase
                .from('projects')
                .insert([{
                  tenant_id: tenantId,
                  name: `${project.name} (Copy)`,
                  status: 'pre-production',
                  script_version: 1,
                }])
                .select()
                .single();

              if (projError) throw projError;

              // 2. Clone project_roles
              const { data: roles, error: rolesError } = await supabase
                .from('project_roles')
                .select('user_id, role_id')
                .eq('project_id', projectId);
              if (rolesError) throw rolesError;

              if (roles && roles.length > 0) {
                const clonedRoles = roles.map(r => ({
                  project_id: newProject.id,
                  user_id: r.user_id,
                  role_id: r.role_id,
                }));
                const { error } = await supabase.from('project_roles').insert(clonedRoles);
                if (error) throw error;
              }

              // 3. Clone budget_items (planned amounts only, reset actuals)
              const { data: budgetItems, error: budgetError } = await supabase
                .from('budget_items')
                .select('category, description, planned_amount')
                .eq('project_id', projectId);
              if (budgetError) throw budgetError;

              if (budgetItems && budgetItems.length > 0) {
                const clonedBudget = budgetItems.map(b => ({
                  project_id: newProject.id,
                  category: b.category,
                  description: b.description,
                  planned_amount: b.planned_amount,
                  actual_amount: 0,
                }));
                const { error } = await supabase.from('budget_items').insert(clonedBudget);
                if (error) throw error;
              }

              // 4. Clone scenes (reset status and dates)
              const { data: scenes, error: scenesError } = await supabase
                .from('scenes')
                .select('scene_number, location, day_night, characters, description')
                .eq('project_id', projectId);
              if (scenesError) throw scenesError;

              if (scenes && scenes.length > 0) {
                const clonedScenes = scenes.map(s => ({
                  project_id: newProject.id,
                  scene_number: s.scene_number,
                  location: s.location,
                  day_night: s.day_night,
                  characters: s.characters,
                  description: s.description,
                  scheduled_date: null,
                  status: 'pending',
                }));
                const { error } = await supabase.from('scenes').insert(clonedScenes);
                if (error) throw error;
              }

              Alert.alert('Cloned!', `"${newProject.name}" has been created with all roles, budget items, and scenes.`);
              navigation.popToTop();
            } catch (err) {
              Alert.alert('Clone Failed', errorMessage(err));
            }
          }
        },
      ]
    );
  };

  const statuses = [
    { key: 'pre-production', label: 'Pre-Production', icon: 'construct-outline', color: '#F59E0B' },
    { key: 'production', label: 'Production', icon: 'videocam-outline', color: '#10B981' },
    { key: 'post-production', label: 'Post-Production', icon: 'color-palette-outline', color: '#3B82F6' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Project Settings</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Status Section */}
        <Text style={styles.sectionTitle}>Production Phase</Text>
        <Text style={styles.sectionSub}>Change the current status of your project.</Text>

        {statuses.map(s => (
          <TouchableOpacity
            key={s.key}
            style={[styles.statusRow, project.status === s.key && { borderColor: s.color, backgroundColor: `${s.color}10` }]}
            onPress={() => updateStatus(s.key)}
          >
            <Icon name={s.icon} size={22} color={s.color} />
            <Text style={styles.statusLabel}>{s.label}</Text>
            {project.status === s.key && (
              <Icon name="checkmark-circle" size={20} color={s.color} />
            )}
          </TouchableOpacity>
        ))}

        {/* Clone Section */}
        <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Duplicate</Text>
        <Text style={styles.sectionSub}>Create a copy of this project with the same team, budget plan, and scene breakdown.</Text>

        <TouchableOpacity style={styles.cloneBtn} onPress={handleClone}>
          <Icon name="copy-outline" size={20} color="#3B82F6" />
          <Text style={styles.cloneBtnText}>Clone Project</Text>
        </TouchableOpacity>

        {/* Archive Section */}
        <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Danger Zone</Text>
        <Text style={styles.sectionSub}>Archive this project. It will be hidden from the dashboard but not deleted.</Text>

        <TouchableOpacity style={styles.archiveBtn} onPress={handleArchive}>
          <Icon name="archive-outline" size={20} color="#EF4444" />
          <Text style={styles.archiveBtnText}>Archive Project</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 20, borderBottomWidth: 1, borderBottomColor: '#1E293B',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#F8FAFC' },
  content: { padding: 24, paddingBottom: 60 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#E2E8F0', marginBottom: 6 },
  sectionSub: { fontSize: 13, color: '#64748B', lineHeight: 20, marginBottom: 16 },
  statusRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#1E293B', borderRadius: 14, padding: 16,
    marginBottom: 10, borderWidth: 1.5, borderColor: '#334155',
  },
  statusLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: '#F8FAFC' },
  cloneBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#1E293B', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#3B82F6',
  },
  cloneBtnText: { color: '#3B82F6', fontSize: 15, fontWeight: 'bold' },
  archiveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#1E293B', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#EF4444',
  },
  archiveBtnText: { color: '#EF4444', fontSize: 15, fontWeight: 'bold' },
});
