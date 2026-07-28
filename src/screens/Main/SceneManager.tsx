import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, Alert, Modal, TextInput,
  ScrollView, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Calendar } from 'react-native-calendars';
import { supabase } from '../../lib/supabase';

type Scene = {
  id: string;
  scene_number: string;
  location: string;
  day_night: string;
  description: string;
  scheduled_date: string | null;
  status: string;
  characters: string[];
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  scheduled: '#3B82F6',
  completed: '#10B981',
  omitted: '#64748B',
};

export default function SceneManager({ route, navigation }: any) {
  const { projectId, project } = route.params;
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [scheduleModal, setScheduleModal] = useState<{ visible: boolean; scene: Scene | null }>({ visible: false, scene: null });

  // Form state for new scene
  const [form, setForm] = useState({ scene_number: '', location: '', day_night: 'DAY', description: '', characters: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchScenes(); }, []);

  const fetchScenes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('scenes')
      .select('*')
      .eq('project_id', projectId)
      .order('scene_number');
    if (!error) setScenes(data || []);
    setLoading(false);
  };

  const handleAddScene = async () => {
    if (!form.scene_number.trim() || !form.location.trim()) {
      Alert.alert('Required', 'Scene number and location are required.');
      return;
    }
    setSaving(true);
    const chars = form.characters.split(',').map(c => c.trim()).filter(Boolean);
    const { error } = await supabase.from('scenes').insert([{
      project_id: projectId,
      scene_number: form.scene_number.trim(),
      location: form.location.trim(),
      day_night: form.day_night,
      description: form.description.trim(),
      characters: chars,
      status: 'pending',
    }]);
    setSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    setForm({ scene_number: '', location: '', day_night: 'DAY', description: '', characters: '' });
    setAddModalVisible(false);
    fetchScenes();
  };

  const handleScheduleDate = async (day: any) => {
    if (!scheduleModal.scene) return;
    const { error } = await supabase
      .from('scenes')
      .update({ scheduled_date: day.dateString, status: 'scheduled' })
      .eq('id', scheduleModal.scene.id);
    if (error) { Alert.alert('Error', error.message); return; }
    setScheduleModal({ visible: false, scene: null });
    fetchScenes();
  };

  const handleDeleteScene = (scene: Scene) => {
    Alert.alert('Delete Scene', `Delete Scene ${scene.scene_number}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await supabase.from('scenes').delete().eq('id', scene.id);
          fetchScenes();
        }
      }
    ]);
  };

  // Build marked dates for calendar
  const markedDates = scenes.reduce((acc: any, s) => {
    if (s.scheduled_date) {
      acc[s.scheduled_date] = { marked: true, dotColor: '#3B82F6' };
    }
    return acc;
  }, {});

  const renderScene = ({ item }: { item: Scene }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.sceneNumBadge}>
          <Text style={styles.sceneNum}>{item.scene_number}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.locationText}>{item.location}</Text>
          <View style={styles.metaRow}>
            <View style={styles.dayNightBadge}>
              <Icon name={item.day_night === 'DAY' ? 'sunny-outline' : 'moon-outline'} size={12} color="#F8FAFC" />
              <Text style={styles.dayNightText}>{item.day_night}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLORS[item.status]}20` }]}>
              <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>{item.status.toUpperCase()}</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity onPress={() => handleDeleteScene(item)} style={styles.deleteBtn}>
          <Icon name="trash-outline" size={18} color="#EF4444" />
        </TouchableOpacity>
      </View>

      {item.description ? <Text style={styles.descText} numberOfLines={2}>{item.description}</Text> : null}
      {item.characters?.length > 0 && (
        <Text style={styles.charText}>Characters: {item.characters.join(', ')}</Text>
      )}

      <View style={styles.cardFooter}>
        <Text style={styles.dateText}>
          {item.scheduled_date ? `📅 ${item.scheduled_date}` : 'Not scheduled'}
        </Text>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setScheduleModal({ visible: true, scene: item })}
          >
            <Icon name="calendar-outline" size={16} color="#3B82F6" />
            <Text style={styles.actionBtnText}>Schedule</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { marginLeft: 8 }]}
            onPress={() => navigation.navigate('CallSheetView', { projectId, sceneId: item.id, scene: item })}
          >
            <Icon name="document-outline" size={16} color="#10B981" />
            <Text style={[styles.actionBtnText, { color: '#10B981' }]}>Call Sheet</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Scenes</Text>
          <Text style={styles.headerSub}>{scenes.length} scenes</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setAddModalVisible(true)}>
          <Icon name="add" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#3B82F6" /></View>
      ) : scenes.length === 0 ? (
        <View style={styles.empty}>
          <Icon name="film-outline" size={72} color="#334155" />
          <Text style={styles.emptyTitle}>No Scenes Yet</Text>
          <Text style={styles.emptySub}>Tap the + button to add your first scene breakdown.</Text>
        </View>
      ) : (
        <FlatList
          data={scenes}
          keyExtractor={item => item.id}
          renderItem={renderScene}
          contentContainerStyle={styles.list}
        />
      )}

      {/* Add Scene Modal */}
      <Modal visible={addModalVisible} transparent animationType="slide" onRequestClose={() => setAddModalVisible(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Add Scene</Text>

              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.inputLabel}>Scene Number *</Text>
                <TextInput style={styles.input} placeholder="e.g. 1A" placeholderTextColor="#64748B"
                  value={form.scene_number} onChangeText={v => setForm(f => ({ ...f, scene_number: v }))} />

                <Text style={styles.inputLabel}>Location *</Text>
                <TextInput style={styles.input} placeholder="e.g. INT. OFFICE - DAY" placeholderTextColor="#64748B"
                  value={form.location} onChangeText={v => setForm(f => ({ ...f, location: v }))} />

                <Text style={styles.inputLabel}>Day / Night</Text>
                <View style={styles.toggleRow}>
                  {['DAY', 'NIGHT', 'DUSK', 'DAWN'].map(dn => (
                    <TouchableOpacity key={dn} onPress={() => setForm(f => ({ ...f, day_night: dn }))}
                      style={[styles.toggle, form.day_night === dn && styles.toggleActive]}>
                      <Text style={[styles.toggleText, form.day_night === dn && styles.toggleTextActive]}>{dn}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.inputLabel}>Characters (comma-separated)</Text>
                <TextInput style={styles.input} placeholder="e.g. JOHN, SARAH" placeholderTextColor="#64748B"
                  value={form.characters} onChangeText={v => setForm(f => ({ ...f, characters: v }))} />

                <Text style={styles.inputLabel}>Description</Text>
                <TextInput style={[styles.input, styles.textArea]} placeholder="Brief scene description..."
                  placeholderTextColor="#64748B" multiline numberOfLines={3}
                  value={form.description} onChangeText={v => setForm(f => ({ ...f, description: v }))} />
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setAddModalVisible(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleAddScene} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Add Scene</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Schedule Date Modal */}
      <Modal visible={scheduleModal.visible} transparent animationType="slide"
        onRequestClose={() => setScheduleModal({ visible: false, scene: null })}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Schedule Scene {scheduleModal.scene?.scene_number}</Text>
            <Calendar
              onDayPress={handleScheduleDate}
              markedDates={markedDates}
              theme={{
                backgroundColor: '#1E293B',
                calendarBackground: '#1E293B',
                textSectionTitleColor: '#94A3B8',
                selectedDayBackgroundColor: '#3B82F6',
                selectedDayTextColor: '#ffffff',
                todayTextColor: '#3B82F6',
                dayTextColor: '#F8FAFC',
                textDisabledColor: '#475569',
                arrowColor: '#3B82F6',
                monthTextColor: '#F8FAFC',
              }}
            />
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setScheduleModal({ visible: false, scene: null })}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  backBtn: { padding: 4, marginRight: 16 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#F8FAFC' },
  headerSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  addBtn: { marginLeft: 'auto', padding: 8, backgroundColor: '#1E293B', borderRadius: 10 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 22, fontWeight: 'bold', color: '#F8FAFC', marginTop: 20, marginBottom: 10 },
  emptySub: { color: '#94A3B8', textAlign: 'center', lineHeight: 22 },
  list: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: '#1E293B', borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#334155' },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  sceneNumBadge: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#3B82F620', justifyContent: 'center', alignItems: 'center' },
  sceneNum: { fontSize: 14, fontWeight: 'bold', color: '#3B82F6' },
  locationText: { fontSize: 15, fontWeight: '600', color: '#F8FAFC', marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dayNightBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#334155', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, gap: 4 },
  dayNightText: { fontSize: 10, color: '#F8FAFC', fontWeight: '600' },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  deleteBtn: { padding: 8 },
  descText: { fontSize: 13, color: '#94A3B8', lineHeight: 18, marginBottom: 6 },
  charText: { fontSize: 12, color: '#64748B', marginBottom: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 10 },
  dateText: { fontSize: 12, color: '#64748B' },
  actions: { flexDirection: 'row' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F172A', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, gap: 4 },
  actionBtnText: { fontSize: 12, color: '#3B82F6', fontWeight: '600' },
  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
  modalSheet: { backgroundColor: '#1E293B', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
  modalHandle: { width: 40, height: 4, backgroundColor: '#475569', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#F8FAFC', marginBottom: 20 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#94A3B8', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#0F172A', borderRadius: 10, padding: 14, color: '#F8FAFC', fontSize: 15, borderWidth: 1, borderColor: '#334155' },
  textArea: { height: 80, textAlignVertical: 'top' },
  toggleRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  toggle: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#334155' },
  toggleActive: { backgroundColor: '#1E3A5F', borderColor: '#3B82F6' },
  toggleText: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },
  toggleTextActive: { color: '#3B82F6' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, paddingVertical: 14, backgroundColor: '#334155', borderRadius: 12, alignItems: 'center' },
  cancelText: { color: '#F8FAFC', fontWeight: '600', fontSize: 15 },
  saveBtn: { flex: 1, paddingVertical: 14, backgroundColor: '#3B82F6', borderRadius: 12, alignItems: 'center' },
  saveText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
});
