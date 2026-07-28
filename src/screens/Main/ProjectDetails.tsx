import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { supabase } from '../../lib/supabase';

export default function ProjectDetails({ route, navigation }: any) {
  const { projectId, project: initialProject } = route.params;
  const [project, setProject] = useState(initialProject);
  const [loading, setLoading] = useState(!initialProject);

  useEffect(() => {
    if (!initialProject) {
      fetchProject();
    } else {
      setLoading(false);
    }
  }, [projectId]);

  const fetchProject = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();
        
      if (error) throw error;
      setProject(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'pre-production': return '#F59E0B';
      case 'production': return '#10B981';
      case 'post-production': return '#3B82F6';
      case 'archived': return '#64748B';
      default: return '#3B82F6';
    }
  };

  const features = [
    { id: 'script', title: 'Script & Breakdown', icon: 'document-text-outline', color: '#8B5CF6' },
    { id: 'roles', title: 'Crew & Roles', icon: 'people-outline', color: '#EC4899' },
    { id: 'schedule', title: 'Scheduling', icon: 'calendar-outline', color: '#14B8A6' },
    { id: 'budget', title: 'Budget Tracker', icon: 'wallet-outline', color: '#F59E0B' },
    { id: 'storyboard', title: 'Storyboard & Continuity', icon: 'images-outline', color: '#3B82F6' },
    { id: 'communication', title: 'Team Chat', icon: 'chatbubbles-outline', color: '#10B981' },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </SafeAreaView>
    );
  }

  if (!project) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.errorText}>Project not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{project.name}</Text>
        <TouchableOpacity style={styles.settingsBtn}>
          <Icon name="settings-outline" size={24} color="#F8FAFC" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.overviewCard}>
          <View style={styles.overviewHeader}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(project.status) }]}>
              <Text style={styles.statusText}>{project.status.toUpperCase()}</Text>
            </View>
            <Text style={styles.versionText}>Script v{project.script_version}</Text>
          </View>
          <Text style={styles.dateText}>Created {new Date(project.created_at).toLocaleDateString()}</Text>
        </View>

        <Text style={styles.sectionTitle}>Project Hub</Text>
        
        <View style={styles.grid}>
          {features.map((feature) => (
            <TouchableOpacity 
              key={feature.id} 
              style={styles.gridItem}
              onPress={() => {
                if (feature.id === 'script') {
                  navigation.navigate('ScriptViewer', { projectId, project });
                } else if (feature.id === 'roles') {
                  navigation.navigate('RoleManagement', { projectId, project });
                }
                // Future implementation: navigation.navigate(feature.screen)
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: `${feature.color}20` }]}>
                <Icon name={feature.icon} size={28} color={feature.color} />
              </View>
              <Text style={styles.gridItemTitle}>{feature.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F8FAFC',
    textAlign: 'center',
    marginHorizontal: 16,
  },
  settingsBtn: {
    padding: 4,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  overviewCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#334155',
  },
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  versionText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '500',
  },
  dateText: {
    color: '#64748B',
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E2E8F0',
    marginBottom: 16,
    paddingLeft: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  gridItemTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
  },
});
