import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert, Share, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { supabase } from '../../lib/supabase';
import Toast from 'react-native-toast-message';
import { ProjectsScreenProps } from '../../navigation/types';
import AnimatedPressable from '../../components/AnimatedPressable';
import { exportCallSheetPDF, shareCallSheetText, generateCallSheetWhatsAppText } from '../../utils/callSheetPDF';

type CrewMember = {
  role_name: string;
  department: string;
  full_name: string;
};

export default function CallSheetView({ route, navigation }: ProjectsScreenProps<'CallSheetView'>) {
  const { projectId, scene } = route.params;
  const [crew, setCrew] = useState<CrewMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [shareMenuVisible, setShareMenuVisible] = useState(false);
  const [projectTitle, setProjectTitle] = useState('Project');

  useEffect(() => {
    fetchCrew();
    fetchProjectTitle();
  }, []);

  const fetchProjectTitle = async () => {
    try {
      const { data } = await supabase
        .from('projects')
        .select('title')
        .eq('id', projectId)
        .single();
      if (data) setProjectTitle(data.title);
    } catch (err) {
      console.error('Error fetching project title:', err);
    }
  };

  const fetchCrew = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('project_roles')
        .select('roles_master(name, department), users(full_name)')
        .eq('project_id', projectId);

      if (error) throw error;

      const mapped: CrewMember[] = (data || []).map((row: any) => ({
        role_name: row.roles_master?.name || 'Unknown Role',
        department: row.roles_master?.department || 'Other',
        full_name: row.users?.full_name || 'TBD',
      }));

      // Group by department
      mapped.sort((a, b) => a.department.localeCompare(b.department));
      setCrew(mapped);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCallSheet = async () => {
    setSaving(true);
    try {
      const crewAssignments = crew.reduce((acc: any, member) => {
        if (!acc[member.department]) acc[member.department] = [];
        acc[member.department].push({ role: member.role_name, name: member.full_name });
        return acc;
      }, {});

      const { error } = await supabase.from('call_sheets').upsert([{
        project_id: projectId,
        date: scene.scheduled_date || new Date().toISOString().split('T')[0],
        location: scene.location,
        crew_assignments: crewAssignments,
      }], { onConflict: 'project_id,date' });

      if (error) throw error;
      Toast.show({ type: 'success', text1: 'Saved!', text2: 'Call sheet has been saved to the project.' });
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Save Failed', text2: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    let text = `📋 CALL SHEET\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🎬 Scene ${scene.scene_number}: ${scene.location}\n`;
    text += `🕐 ${scene.day_night}${scene.scheduled_date ? `  📅 ${scene.scheduled_date}` : ''}\n`;
    if (scene.description) text += `📝 ${scene.description}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    const grouped = crew.reduce((acc: any, m) => {
      if (!acc[m.department]) acc[m.department] = [];
      acc[m.department].push(m);
      return acc;
    }, {});

    Object.keys(grouped).forEach(dept => {
      text += `【${dept}】\n`;
      grouped[dept].forEach((m: CrewMember) => {
        text += `  ${m.role_name}: ${m.full_name}\n`;
      });
      text += '\n';
    });

    await Share.share({ message: text });
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      await exportCallSheetPDF({
        projectTitle,
        sceneNumber: scene.scene_number,
        location: scene.location,
        dayNight: scene.day_night,
        scheduledDate: scene.scheduled_date,
        description: scene.description,
        crew,
      });
      Toast.show({ type: 'success', text1: 'PDF Exported', text2: 'Call sheet PDF is ready to share' });
      setShareMenuVisible(false);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Export Failed', text2: err.message });
    } finally {
      setExporting(false);
    }
  };

  const handleShareWhatsApp = async () => {
    try {
      await shareCallSheetText({
        projectTitle,
        sceneNumber: scene.scene_number,
        location: scene.location,
        dayNight: scene.day_night,
        scheduledDate: scene.scheduled_date,
        description: scene.description,
        crew,
      });
      setShareMenuVisible(false);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Share Failed', text2: err.message });
    }
  };

  // Group crew by department for rendering
  const grouped = crew.reduce((acc: Record<string, CrewMember[]>, m) => {
    if (!acc[m.department]) acc[m.department] = [];
    acc[m.department].push(m);
    return acc;
  }, {});

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Call Sheet</Text>
        <TouchableOpacity style={styles.shareBtn} onPress={() => setShareMenuVisible(true)}>
          <Icon name="share-social-outline" size={22} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      {/* Share Menu Modal */}
      <Modal visible={shareMenuVisible} transparent animationType="fade" onRequestClose={() => setShareMenuVisible(false)}>
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1}
          onPress={() => setShareMenuVisible(false)}
        >
          <View style={styles.shareMenu}>
            <Text style={styles.shareMenuTitle}>Share Call Sheet</Text>
            
            <TouchableOpacity style={styles.shareOption} onPress={handleExportPDF} disabled={exporting}>
              <View style={[styles.shareOptionIcon, { backgroundColor: '#1E3A5F' }]}>
                <Icon name="document-outline" size={24} color="#3B82F6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.shareOptionTitle}>📄 Export as PDF</Text>
                <Text style={styles.shareOptionDesc}>Save and share professional PDF</Text>
              </View>
              {exporting && <ActivityIndicator size="small" color="#3B82F6" />}
            </TouchableOpacity>

            <TouchableOpacity style={styles.shareOption} onPress={handleShareWhatsApp}>
              <View style={[styles.shareOptionIcon, { backgroundColor: '#1B5E20' }]}>
                <Icon name="logo-whatsapp" size={24} color="#25D366" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.shareOptionTitle}>💬 Share on WhatsApp</Text>
                <Text style={styles.shareOptionDesc}>Send formatted text to crew</Text>
              </View>
              <Icon name="chevron-forward" size={20} color="#475569" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.shareOption} onPress={handleShare}>
              <View style={[styles.shareOptionIcon, { backgroundColor: '#1E3A5F' }]}>
                <Icon name="share-outline" size={24} color="#3B82F6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.shareOptionTitle}>📤 Share as Text</Text>
                <Text style={styles.shareOptionDesc}>Copy to clipboard or email</Text>
              </View>
              <Icon name="chevron-forward" size={20} color="#475569" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.shareOptionCancel}
              onPress={() => setShareMenuVisible(false)}
            >
              <Text style={styles.shareOptionCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Scene Overview Card */}
        <View style={styles.sceneCard}>
          <View style={styles.sceneCardHeader}>
            <View style={styles.sceneBadge}>
              <Text style={styles.sceneBadgeText}>SCENE</Text>
              <Text style={styles.sceneNumber}>{scene.scene_number}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={styles.sceneLocation}>{scene.location}</Text>
              <View style={styles.sceneMetaRow}>
                <View style={styles.chip}>
                  <Icon name={scene.day_night === 'DAY' ? 'sunny-outline' : 'moon-outline'} size={12} color="#F8FAFC" />
                  <Text style={styles.chipText}>{scene.day_night}</Text>
                </View>
                {scene.scheduled_date && (
                  <View style={styles.chip}>
                    <Icon name="calendar-outline" size={12} color="#F8FAFC" />
                    <Text style={styles.chipText}>{scene.scheduled_date}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {scene.description ? (
            <Text style={styles.sceneDesc}>{scene.description}</Text>
          ) : null}

          {scene.characters?.length > 0 && (
            <View style={styles.charRow}>
              <Icon name="people-outline" size={14} color="#94A3B8" />
              <Text style={styles.charText}>{scene.characters.join('  ·  ')}</Text>
            </View>
          )}
        </View>

        {/* Crew Breakdown */}
        <Text style={styles.sectionTitle}>Crew on Call</Text>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        ) : crew.length === 0 ? (
          <View style={styles.emptyCard}>
            <Icon name="people-outline" size={40} color="#475569" />
            <Text style={styles.emptyText}>No crew assigned yet.</Text>
            <Text style={styles.emptySub}>Go to Crew & Roles to assign crew members to this project.</Text>
          </View>
        ) : (
          Object.keys(grouped).map(dept => (
            <View key={dept} style={styles.deptSection}>
              <Text style={styles.deptTitle}>{dept}</Text>
              {grouped[dept].map((m, i) => (
                <View key={i} style={styles.crewRow}>
                  <View style={styles.crewAvatar}>
                    <Text style={styles.crewAvatarText}>{m.full_name?.[0]?.toUpperCase() || '?'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.crewName}>{m.full_name}</Text>
                    <Text style={styles.crewRole}>{m.role_name}</Text>
                  </View>
                  <Icon name="checkmark-circle" size={20} color="#10B981" />
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <AnimatedPressable style={styles.saveBtn} onPress={handleSaveCallSheet} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Icon name="save-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.saveBtnText}>Save Call Sheet</Text>
            </>
          )}
        </AnimatedPressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: {
    flexDirection: 'row', alignItems: 'center', padding: 20,
    borderBottomWidth: 1, borderBottomColor: '#1E293B',
  },
  backBtn: { padding: 4, marginRight: 16 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: 'bold', color: '#F8FAFC' },
  shareBtn: { padding: 8, backgroundColor: '#1E293B', borderRadius: 10 },
  content: { padding: 20, paddingBottom: 40 },
  // Scene card
  sceneCard: {
    backgroundColor: '#1E293B', borderRadius: 20, padding: 20,
    marginBottom: 28, borderWidth: 1, borderColor: '#334155',
  },
  sceneCardHeader: { flexDirection: 'row', marginBottom: 14 },
  sceneBadge: {
    width: 56, height: 56, borderRadius: 14, backgroundColor: '#3B82F620',
    justifyContent: 'center', alignItems: 'center',
  },
  sceneBadgeText: { fontSize: 8, fontWeight: '700', color: '#3B82F6', letterSpacing: 1 },
  sceneNumber: { fontSize: 20, fontWeight: 'bold', color: '#3B82F6' },
  sceneLocation: { fontSize: 16, fontWeight: '600', color: '#F8FAFC', marginBottom: 8 },
  sceneMetaRow: { flexDirection: 'row', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#334155', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  chipText: { fontSize: 11, color: '#F8FAFC', fontWeight: '600' },
  sceneDesc: { fontSize: 13, color: '#94A3B8', lineHeight: 20, marginBottom: 10 },
  charRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  charText: { fontSize: 13, color: '#64748B' },
  // Sections
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#E2E8F0', marginBottom: 14 },
  center: { paddingVertical: 40, alignItems: 'center' },
  emptyCard: {
    backgroundColor: '#1E293B', borderRadius: 16, padding: 24,
    alignItems: 'center', gap: 10,
  },
  emptyText: { color: '#F8FAFC', fontSize: 16, fontWeight: '600' },
  emptySub: { color: '#64748B', fontSize: 13, textAlign: 'center', lineHeight: 20 },
  deptSection: { marginBottom: 20 },
  deptTitle: {
    fontSize: 11, fontWeight: '700', color: '#3B82F6',
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10,
  },
  crewRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1E293B', borderRadius: 12, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: '#334155',
  },
  crewAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#1E3A5F',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  crewAvatarText: { color: '#3B82F6', fontWeight: 'bold', fontSize: 16 },
  crewName: { fontSize: 15, fontWeight: '600', color: '#F8FAFC' },
  crewRole: { fontSize: 12, color: '#64748B', marginTop: 2 },
  // Footer
  footer: {
    padding: 20, borderTopWidth: 1, borderTopColor: '#1E293B',
  },
  saveBtn: {
    flexDirection: 'row', backgroundColor: '#3B82F6', padding: 16,
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  // Share menu
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  shareMenu: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
    gap: 12,
  },
  shareMenuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 16,
  },
  shareOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  shareOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareOptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  shareOptionDesc: {
    fontSize: 12,
    color: '#94A3B8',
  },
  shareOptionCancel: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#334155',
    alignItems: 'center',
    marginTop: 8,
  },
  shareOptionCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F8FAFC',
  },
});
