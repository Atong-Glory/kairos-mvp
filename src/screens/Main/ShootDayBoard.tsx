import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AppTheme, usePaletteStyles, useTheme } from '../../context/ThemeContext';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, DateData } from 'react-native-calendars';
import Icon from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import { ProjectsScreenProps } from '../../navigation/types';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { supabase } from '../../lib/supabase';
import { usePermissions } from '../../context/PermissionsContext';

type ShootStatus = 'up_next' | 'shooting' | 'wrapped';
type EventType = 'status' | 'rescheduled';

type ShootScene = {
  id: string;
  scene_number: string;
  location: string;
  day_night: string;
  description: string;
  scheduled_date: string;
};

type ShootDayUpdate = {
  id: string;
  scene_id: string;
  event_type: EventType;
  previous_status: ShootStatus | null;
  new_status: ShootStatus | null;
  previous_date: string | null;
  new_date: string | null;
  created_at: string;
  updated_by: string;
  users: { full_name: string }[] | null;
  scenes: { scene_number: string }[] | null;
};

type SceneStatusUpdate = {
  scene_id: string;
  new_status: ShootStatus;
  created_at: string;
};

type ShootDayData = {
  requestedDate: string;
  scenes: ShootScene[];
  statuses: SceneStatusUpdate[];
  updates: ShootDayUpdate[];
};

type StatusColorToken = keyof Pick<AppTheme['colors'], 'warning' | 'accent' | 'positive'>;

const STATUS_OPTIONS: { value: ShootStatus; label: string; color: StatusColorToken }[] = [
  { value: 'up_next', label: 'Up Next', color: 'warning' },
  { value: 'shooting', label: 'Rolling', color: 'accent' },
  { value: 'wrapped', label: 'Wrapped', color: 'positive' },
];

const getToday = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const shiftDate = (date: string, amount: number) => {
  const [year, month, day] = date.split('-').map(Number);
  const shifted = new Date(year, month - 1, day + amount, 12);
  return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, '0')}-${String(shifted.getDate()).padStart(2, '0')}`;
};

const formatDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});

const formatTime = (date: string) => new Date(date).toLocaleTimeString(undefined, {
  hour: 'numeric',
  minute: '2-digit',
});

export default function ShootDayBoard({ route, navigation }: ProjectsScreenProps<'ShootDayBoard'>) {
  const themedStyles = usePaletteStyles(styles);
  const { theme } = useTheme();
  const { projectId } = route.params;
  const { isEditor, refreshPermissions } = usePermissions();
  const [selectedDate, setSelectedDate] = useState(getToday);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [movingScene, setMovingScene] = useState<ShootScene | null>(null);
  const [permissionLoading, setPermissionLoading] = useState(true);
  const [savingSceneId, setSavingSceneId] = useState<string | null>(null);
  const canEdit = isEditor(projectId);

  const fetchBoard = useCallback(async (): Promise<ShootDayData> => {
    const [sceneResult, statusResult, updateResult] = await Promise.all([
      supabase
        .from('scenes')
        .select('id, scene_number, location, day_night, description, scheduled_date')
        .eq('project_id', projectId)
        .eq('scheduled_date', selectedDate)
        .order('scene_number'),
      supabase
        .from('shoot_day_updates')
        .select('scene_id, new_status, created_at')
        .eq('project_id', projectId)
        .eq('shoot_date', selectedDate)
        .eq('event_type', 'status')
        .order('created_at', { ascending: false }),
      supabase
        .from('shoot_day_updates')
        .select('id, scene_id, event_type, previous_status, new_status, previous_date, new_date, created_at, updated_by, users!shoot_day_updates_updated_by_fkey(full_name), scenes!shoot_day_updates_scene_id_fkey(scene_number)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(12),
    ]);

    if (sceneResult.error) throw sceneResult.error;
    if (statusResult.error) throw statusResult.error;
    if (updateResult.error) throw updateResult.error;

    return {
      requestedDate: selectedDate,
      scenes: (sceneResult.data || []) as ShootScene[],
      statuses: (statusResult.data || []) as SceneStatusUpdate[],
      updates: (updateResult.data || []) as ShootDayUpdate[],
    };
  }, [projectId, selectedDate]);

  const cacheKey = `shoot-day-${projectId}-${selectedDate}`;
  const { data, isLoading, isOnline, isFromCache, error, refresh } = useOfflineSync(
    { cacheKey, ttl: 24 * 60 * 60 * 1000 },
    fetchBoard,
  );
  const boardData = data?.requestedDate === selectedDate ? data : null;
  const scenes = boardData?.scenes || [];
  const updates = boardData?.updates || [];

  useEffect(() => {
    let active = true;
    setPermissionLoading(true);
    refreshPermissions(projectId).finally(() => {
      if (active) setPermissionLoading(false);
    });
    return () => {
      active = false;
    };
  }, [projectId, refreshPermissions]);

  const statuses = useMemo(() => {
    const latestByScene = new Map<string, ShootStatus>();
    (boardData?.statuses || []).forEach(update => {
      if (!latestByScene.has(update.scene_id)) {
        latestByScene.set(update.scene_id, update.new_status);
      }
    });
    return latestByScene;
  }, [boardData?.statuses]);

  const recordUpdate = async (
    scene: ShootScene,
    eventType: EventType,
    newStatus: ShootStatus | null,
    newDate: string | null = null,
  ) => {
    if (!canEdit || !isOnline) {
      Toast.show({
        type: 'info',
        text1: isOnline ? 'View-Only Mode' : 'You are offline',
        text2: isOnline ? 'Only project editors can update the shoot day.' : 'Reconnect to save shoot-day changes.',
      });
      return;
    }

    const previousStatus = statuses.get(scene.id) || null;
    setSavingSceneId(scene.id);
    let updateError: { message: string } | null = null;
    try {
      const result = await supabase.rpc('record_shoot_day_update', {
        p_scene_id: scene.id,
        p_shoot_date: selectedDate,
        p_event_type: eventType,
        p_previous_status: previousStatus,
        p_new_status: newStatus,
        p_new_date: newDate,
      });
      updateError = result.error;
    } catch (err) {
      updateError = err instanceof Error ? err : new Error('Unable to save the shoot-day change.');
    } finally {
      setSavingSceneId(null);
    }

    if (updateError) {
      Toast.show({ type: 'error', text1: 'Update Failed', text2: updateError.message });
      return;
    }

    setMovingScene(null);
    setCalendarVisible(false);
    Toast.show({
      type: 'success',
      text1: eventType === 'status' ? 'Scene status updated' : 'Scene rescheduled',
    });
    await refresh();
  };

  const handleCalendarDayPress = (day: DateData) => {
    if (movingScene) {
      if (day.dateString === selectedDate) {
        Toast.show({ type: 'info', text1: 'Choose a different date' });
        return;
      }
      void recordUpdate(movingScene, 'rescheduled', null, day.dateString);
      return;
    }
    setSelectedDate(day.dateString);
    setCalendarVisible(false);
  };

  const renderScene = ({ item }: { item: ShootScene }) => {
    const currentStatus = statuses.get(item.id);
    const saving = savingSceneId === item.id;

    return (
      <View style={themedStyles.sceneCard}>
        <View style={themedStyles.sceneHeading}>
          <View style={themedStyles.sceneNumber}>
            <Text style={themedStyles.sceneNumberText}>{item.scene_number}</Text>
          </View>
          <View style={themedStyles.sceneInfo}>
            <Text style={themedStyles.location} numberOfLines={2}>{item.location}</Text>
            <Text style={themedStyles.sceneMeta}>{item.day_night} · {item.scheduled_date}</Text>
          </View>
          {saving ? <ActivityIndicator color={theme.colors.accentStrong} /> : null}
        </View>
        {item.description ? <Text style={themedStyles.description}>{item.description}</Text> : null}

        <View style={themedStyles.statusRow}>
          {STATUS_OPTIONS.map(option => {
            const selected = currentStatus === option.value;
            const statusColor = theme.colors[option.color];
            return (
              <TouchableOpacity
                key={option.value}
                accessibilityRole="button"
                accessibilityState={{ disabled: !canEdit || !isOnline || saving, selected }}
                disabled={!canEdit || !isOnline || saving || selected}
                onPress={() => void recordUpdate(item, 'status', option.value)}
                style={[
                  themedStyles.statusButton,
                  selected && { backgroundColor: `${statusColor}24`, borderColor: statusColor },
                  (!canEdit || !isOnline) && themedStyles.disabledButton,
                ]}
              >
                <Text style={[themedStyles.statusButtonText, selected && { color: statusColor }]}>{option.label}</Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            accessibilityRole="button"
            disabled={!canEdit || !isOnline || saving}
            onPress={() => {
              setMovingScene(item);
              setCalendarVisible(true);
            }}
            style={[themedStyles.moveButton, (!canEdit || !isOnline) && themedStyles.disabledButton]}
          >
            <Icon name="calendar-outline" size={15} color={theme.colors.danger} />
            <Text style={themedStyles.moveButtonText}>Move</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderUpdate = ({ item }: { item: ShootDayUpdate }) => {
    const actor = item.users?.[0]?.full_name || 'A crew member';
    const sceneNumber = item.scenes?.[0]?.scene_number || 'Scene';
    const summary = item.event_type === 'rescheduled'
      ? `${actor} moved Scene ${sceneNumber} from ${item.previous_date || selectedDate} to ${item.new_date}.`
      : `${actor} marked Scene ${sceneNumber} ${item.new_status?.replace('_', ' ')}.`;

    return (
      <View style={themedStyles.activityRow}>
        <View style={[themedStyles.activityDot, item.event_type === 'rescheduled' && themedStyles.moveDot]} />
        <View style={themedStyles.activityText}>
          <Text style={themedStyles.activitySummary}>{summary}</Text>
          <Text style={themedStyles.activityTime}>{formatTime(item.created_at)}</Text>
        </View>
      </View>
    );
  };

  if (isLoading && !boardData) {
    return (
      <SafeAreaView style={themedStyles.center}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </SafeAreaView>
    );
  }

  if (error && !boardData) {
    return (
      <SafeAreaView style={themedStyles.center}>
        <Icon name="cloud-offline-outline" size={44} color={theme.colors.textMuted} />
        <Text style={themedStyles.errorTitle}>Shoot day unavailable</Text>
        <Text style={themedStyles.errorText}>{error.message}</Text>
        <TouchableOpacity style={themedStyles.retryButton} onPress={() => void refresh()}>
          <Text style={themedStyles.retryText}>Try again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={themedStyles.container}>
      <View style={themedStyles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={themedStyles.backButton}>
          <Icon name="arrow-back" size={23} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={themedStyles.headerTitleContainer}>
          <Text style={themedStyles.headerTitle}>Live Shoot Day</Text>
          <Text style={themedStyles.headerSubtitle}>{scenes.length} scheduled scene{scenes.length === 1 ? '' : 's'}</Text>
        </View>
        <TouchableOpacity accessibilityRole="button" onPress={() => void refresh()} style={themedStyles.refreshButton}>
          {isLoading ? <ActivityIndicator color={theme.colors.accentStrong} /> : <Icon name="refresh-outline" size={22} color={theme.colors.text} />}
        </TouchableOpacity>
      </View>

      <FlatList
        data={scenes}
        keyExtractor={scene => scene.id}
        renderItem={renderScene}
        contentContainerStyle={themedStyles.content}
        ListHeaderComponent={(
          <>
            <View style={themedStyles.dateSelector}>
              <TouchableOpacity accessibilityLabel="Previous day" onPress={() => setSelectedDate(date => shiftDate(date, -1))} style={themedStyles.dateArrow}>
                <Icon name="chevron-back" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setMovingScene(null); setCalendarVisible(true); }} style={themedStyles.dateButton}>
                <Icon name="calendar-outline" size={17} color={theme.colors.accentStrong} />
                <Text style={themedStyles.dateText}>{formatDate(selectedDate)}</Text>
                <Icon name="chevron-down" size={16} color={theme.colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity accessibilityLabel="Next day" onPress={() => setSelectedDate(date => shiftDate(date, 1))} style={themedStyles.dateArrow}>
                <Icon name="chevron-forward" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {!isOnline || (isFromCache && boardData !== null) ? (
              <View style={themedStyles.offlineNotice}>
                <Icon name="cloud-offline-outline" size={16} color={theme.colors.warning} />
                <Text style={themedStyles.offlineText}>
                  {isOnline ? 'Showing saved data. Refresh to load the latest changes.' : 'Offline · showing saved data; updates are disabled.'}
                </Text>
              </View>
            ) : null}

            {!permissionLoading && !canEdit ? (
              <View style={themedStyles.readOnlyNotice}>
                <Icon name="eye-outline" size={16} color={theme.colors.textSecondary} />
                <Text style={themedStyles.readOnlyText}>View-only access · editors can update scene status and dates.</Text>
              </View>
            ) : null}

            <View style={themedStyles.sectionHeading}>
              <Text style={themedStyles.sectionTitle}>Today on set</Text>
              <Text style={themedStyles.sectionHint}>Up Next → Rolling → Wrapped</Text>
            </View>
          </>
        )}
        ListEmptyComponent={(
          <View style={themedStyles.emptyCard}>
            <Icon name="film-outline" size={40} color={theme.colors.border} />
            <Text style={themedStyles.emptyTitle}>No scenes scheduled</Text>
            <Text style={themedStyles.emptyText}>Schedule scenes for this date in Scene Manager to see them on the board.</Text>
            <TouchableOpacity onPress={() => navigation.navigate('SceneManager', { projectId })}>
              <Text style={themedStyles.emptyLink}>Open Scene Manager</Text>
            </TouchableOpacity>
          </View>
        )}
        ListFooterComponent={(
          <View style={themedStyles.activitySection}>
            <Text style={themedStyles.sectionTitle}>Recent changes</Text>
            {updates.length > 0 ? (
              updates.map(update => <View key={update.id}>{renderUpdate({ item: update })}</View>)
            ) : (
              <Text style={themedStyles.noActivity}>Shoot-day changes will appear here.</Text>
            )}
          </View>
        )}
      />

      <Modal
        visible={calendarVisible}
        transparent
        animationType="slide"
        onRequestClose={() => { setCalendarVisible(false); setMovingScene(null); }}
      >
        <View style={themedStyles.modalOverlay}>
          <View style={themedStyles.calendarSheet}>
            <View style={themedStyles.modalHandle} />
            <Text style={themedStyles.calendarTitle}>
              {movingScene ? `Move Scene ${movingScene.scene_number}` : 'Choose shoot date'}
            </Text>
            {movingScene ? <Text style={themedStyles.calendarHint}>Select a new date for this scene.</Text> : null}
            <Calendar
              current={movingScene ? undefined : selectedDate}
              onDayPress={handleCalendarDayPress}
              markedDates={{ [selectedDate]: { selected: true, selectedColor: theme.colors.accent } }}
              theme={{
                backgroundColor: theme.colors.surface,
                calendarBackground: theme.colors.surface,
                textSectionTitleColor: theme.colors.textSecondary,
                selectedDayBackgroundColor: theme.colors.accent,
                selectedDayTextColor: theme.colors.accentContrast,
                todayTextColor: theme.colors.accentStrong,
                dayTextColor: theme.colors.text,
                textDisabledColor: theme.colors.textMuted,
                arrowColor: theme.colors.accentStrong,
                monthTextColor: theme.colors.text,
              }}
            />
            <TouchableOpacity
              style={themedStyles.cancelButton}
              onPress={() => { setCalendarVisible(false); setMovingScene(null); }}
            >
              <Text style={themedStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  center: { flex: 1, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center', padding: 24 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  backButton: { padding: 6, marginRight: 10 },
  headerTitleContainer: { flex: 1 },
  headerTitle: { color: '#F8FAFC', fontSize: 19, fontWeight: '700' },
  headerSubtitle: { color: '#94A3B8', fontSize: 12, marginTop: 3 },
  refreshButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 32 },
  dateSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1E293B', borderColor: '#334155', borderWidth: 1, borderRadius: 14, paddingHorizontal: 8, marginBottom: 12 },
  dateArrow: { padding: 10 },
  dateButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13 },
  dateText: { color: '#F8FAFC', fontSize: 14, fontWeight: '600' },
  offlineNotice: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#422006', borderRadius: 10, padding: 11, marginBottom: 12, gap: 8 },
  offlineText: { color: '#FDE68A', fontSize: 12, flex: 1 },
  readOnlyNotice: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 10, padding: 11, marginBottom: 12, gap: 8 },
  readOnlyText: { color: '#CBD5E1', fontSize: 12, flex: 1 },
  sectionHeading: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginVertical: 14 },
  sectionTitle: { color: '#E2E8F0', fontSize: 17, fontWeight: '700' },
  sectionHint: { color: '#64748B', fontSize: 11 },
  sceneCard: { backgroundColor: '#1E293B', borderRadius: 14, borderWidth: 1, borderColor: '#334155', padding: 14, marginBottom: 12 },
  sceneHeading: { flexDirection: 'row', alignItems: 'center' },
  sceneNumber: { minWidth: 42, height: 42, borderRadius: 12, backgroundColor: '#312E81', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  sceneNumberText: { color: '#C4B5FD', fontSize: 14, fontWeight: '700' },
  sceneInfo: { flex: 1, marginHorizontal: 12 },
  location: { color: '#F8FAFC', fontSize: 15, fontWeight: '600' },
  sceneMeta: { color: '#94A3B8', fontSize: 11, marginTop: 5 },
  description: { color: '#CBD5E1', fontSize: 13, lineHeight: 19, marginTop: 12 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 14 },
  statusButton: { borderWidth: 1, borderColor: '#475569', borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8 },
  statusButtonText: { color: '#CBD5E1', fontSize: 11, fontWeight: '600' },
  disabledButton: { opacity: 0.55 },
  moveButton: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#7F1D1D', borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8 },
  moveButtonText: { color: '#FCA5A5', fontSize: 11, fontWeight: '600' },
  emptyCard: { backgroundColor: '#1E293B', borderRadius: 14, alignItems: 'center', padding: 26, marginTop: 4, borderWidth: 1, borderColor: '#334155' },
  emptyTitle: { color: '#E2E8F0', fontSize: 16, fontWeight: '700', marginTop: 12 },
  emptyText: { color: '#94A3B8', fontSize: 13, textAlign: 'center', lineHeight: 19, marginTop: 6 },
  emptyLink: { color: '#60A5FA', fontSize: 13, fontWeight: '600', marginTop: 14 },
  activitySection: { marginTop: 16, backgroundColor: '#1E293B', borderRadius: 14, borderWidth: 1, borderColor: '#334155', padding: 16 },
  activityRow: { flexDirection: 'row', marginTop: 15 },
  activityDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#60A5FA', marginTop: 5, marginRight: 10 },
  moveDot: { backgroundColor: '#F87171' },
  activityText: { flex: 1 },
  activitySummary: { color: '#CBD5E1', fontSize: 12, lineHeight: 18 },
  activityTime: { color: '#64748B', fontSize: 11, marginTop: 3 },
  noActivity: { color: '#64748B', fontSize: 12, marginTop: 12 },
  errorTitle: { color: '#F8FAFC', fontSize: 17, fontWeight: '700', marginTop: 12 },
  errorText: { color: '#94A3B8', textAlign: 'center', marginTop: 8 },
  retryButton: { marginTop: 18, backgroundColor: '#2563EB', borderRadius: 10, paddingHorizontal: 18, paddingVertical: 11 },
  retryText: { color: '#FFFFFF', fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  calendarSheet: { backgroundColor: '#1E293B', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, paddingBottom: 28 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#475569', alignSelf: 'center', marginBottom: 16 },
  calendarTitle: { color: '#F8FAFC', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  calendarHint: { color: '#94A3B8', fontSize: 12, textAlign: 'center', marginTop: 5 },
  cancelButton: { alignItems: 'center', paddingVertical: 12 },
  cancelText: { color: '#CBD5E1', fontWeight: '600' },
});
