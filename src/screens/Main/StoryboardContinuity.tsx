import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, Alert, Image, TextInput, Modal,
  Dimensions, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import Toast from 'react-native-toast-message';
import { ProjectsScreenProps } from '../../navigation/types';
import AnimatedPressable from '../../components/AnimatedPressable';

type ContinuityPhoto = {
  id: string;
  scene_id: string | null;
  photo_url: string;
  annotation: string;
  taken_at: string;
  user_id: string;
};

const SCREEN_WIDTH = Dimensions.get('window').width;
const COLUMN_WIDTH = (SCREEN_WIDTH - 48 - 12) / 2;

export default function StoryboardContinuity({ route, navigation }: ProjectsScreenProps<'StoryboardContinuity'>) {
  const { projectId, project } = route.params;
  const { user } = useAuth();
  const [photos, setPhotos] = useState<ContinuityPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Annotation modal state
  const [annotationModal, setAnnotationModal] = useState(false);
  const [pendingUri, setPendingUri] = useState<string | null>(null);
  const [annotation, setAnnotation] = useState('');

  // Full-screen viewer
  const [viewerPhoto, setViewerPhoto] = useState<ContinuityPhoto | null>(null);

  useEffect(() => { fetchPhotos(); }, []);

  const fetchPhotos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('continuity_photos')
      .select('*')
      .eq('project_id', projectId)
      .order('taken_at', { ascending: false });
    if (!error) setPhotos(data || []);
    setLoading(false);
  };

  const pickImage = async (useCamera: boolean) => {
    let result;
    if (useCamera) {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Camera access is needed for continuity photos.');
        return;
      }
      result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    } else {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Gallery access is needed.');
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync({
        quality: 0.8,
        allowsEditing: true,
      });
    }

    if (!result.canceled && result.assets?.[0]) {
      setPendingUri(result.assets[0].uri);
      setAnnotation('');
      setAnnotationModal(true);
    }
  };

  const handleUpload = async () => {
    if (!pendingUri) return;
    setAnnotationModal(false);
    setUploading(true);

    try {
      const fileName = `${projectId}/${Date.now()}.jpg`;
      const response = await fetch(pendingUri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('scripts') // reuse the bucket or create a continuity bucket
        .upload(`continuity/${fileName}`, blob, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get signed URL
      const { data: urlData } = await supabase.storage
        .from('scripts')
        .createSignedUrl(`continuity/${fileName}`, 60 * 60 * 24 * 365); // 1 year

      if (!urlData?.signedUrl) throw new Error('Failed to get signed URL');

      // Insert record
      const { error: insertError } = await supabase
        .from('continuity_photos')
        .insert([{
          project_id: projectId,
          photo_url: urlData.signedUrl,
          annotation: annotation.trim(),
          user_id: user?.id,
        }]);

      if (insertError) throw insertError;
      fetchPhotos();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Upload Failed', text2: err.message });
    } finally {
      setUploading(false);
      setPendingUri(null);
    }
  };

  const handleDelete = (photo: ContinuityPhoto) => {
    Alert.alert('Delete Photo', 'Remove this continuity photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await supabase.from('continuity_photos').delete().eq('id', photo.id);
          fetchPhotos();
        }
      }
    ]);
  };

  const renderPhoto = ({ item }: { item: ContinuityPhoto }) => (
    <TouchableOpacity
      style={styles.photoCard}
      onPress={() => setViewerPhoto(item)}
      onLongPress={() => handleDelete(item)}
      activeOpacity={0.8}
    >
      <Image source={{ uri: item.photo_url }} style={styles.photoImage} />
      {item.annotation ? (
        <View style={styles.annotationOverlay}>
          <Text style={styles.annotationText} numberOfLines={2}>{item.annotation}</Text>
        </View>
      ) : null}
      <Text style={styles.photoDate}>
        {new Date(item.taken_at).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Storyboard & Continuity</Text>
          <Text style={styles.headerSub}>{photos.length} photos</Text>
        </View>
        <View style={{ flex: 1 }} />
      </View>

      {uploading && (
        <View style={styles.uploadingBar}>
          <ActivityIndicator size="small" color="#3B82F6" />
          <Text style={styles.uploadingText}>Uploading photo...</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#3B82F6" /></View>
      ) : photos.length === 0 ? (
        <View style={styles.empty}>
          <Icon name="images-outline" size={72} color="#334155" />
          <Text style={styles.emptyTitle}>No Photos Yet</Text>
          <Text style={styles.emptySub}>
            Capture continuity photos on set or upload storyboard frames to keep your visual references organized.
          </Text>
        </View>
      ) : (
        <FlatList
          data={photos}
          keyExtractor={item => item.id}
          renderItem={renderPhoto}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.list}
        />
      )}

      {/* Action Buttons */}
      <View style={styles.fabRow}>
        <AnimatedPressable style={styles.fabSecondary} onPress={() => pickImage(false)}>
          <Icon name="image-outline" size={24} color="#3B82F6" />
        </AnimatedPressable>
        <AnimatedPressable style={styles.fab} onPress={() => pickImage(true)}>
          <Icon name="camera" size={28} color="#FFFFFF" />
        </AnimatedPressable>
      </View>

      {/* Annotation Modal */}
      <Modal visible={annotationModal} transparent animationType="slide" onRequestClose={() => setAnnotationModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Add Annotation</Text>

              {pendingUri && (
                <Image source={{ uri: pendingUri }} style={styles.previewImage} />
              )}

              <Text style={styles.inputLabel}>Notes (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Scene 12 — Hair down, blue jacket, watch on left wrist"
                placeholderTextColor="#64748B"
                multiline
                numberOfLines={3}
                value={annotation}
                onChangeText={setAnnotation}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => { setAnnotationModal(false); setPendingUri(null); }}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <AnimatedPressable style={styles.saveBtn} onPress={handleUpload}>
                  <Icon name="cloud-upload-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.saveText}>Upload</Text>
                </AnimatedPressable>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Full-Screen Viewer */}
      <Modal visible={!!viewerPhoto} transparent animationType="fade" onRequestClose={() => setViewerPhoto(null)}>
        <View style={styles.viewerContainer}>
          <TouchableOpacity style={styles.viewerClose} onPress={() => setViewerPhoto(null)}>
            <Icon name="close" size={28} color="#F8FAFC" />
          </TouchableOpacity>
          {viewerPhoto && (
            <>
              <Image source={{ uri: viewerPhoto.photo_url }} style={styles.viewerImage} resizeMode="contain" />
              {viewerPhoto.annotation ? (
                <View style={styles.viewerAnnotation}>
                  <Text style={styles.viewerAnnotationText}>{viewerPhoto.annotation}</Text>
                </View>
              ) : null}
            </>
          )}
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  uploadingBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, backgroundColor: '#1E293B', gap: 8 },
  uploadingText: { color: '#94A3B8', fontSize: 13 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 22, fontWeight: 'bold', color: '#F8FAFC', marginTop: 20, marginBottom: 10 },
  emptySub: { color: '#94A3B8', textAlign: 'center', lineHeight: 22 },
  list: { padding: 16, paddingBottom: 100 },
  gridRow: { justifyContent: 'space-between', marginBottom: 12 },
  photoCard: {
    width: COLUMN_WIDTH,
    backgroundColor: '#1E293B',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
  },
  photoImage: { width: '100%', height: COLUMN_WIDTH * 1.2, backgroundColor: '#334155' },
  annotationOverlay: {
    position: 'absolute', top: COLUMN_WIDTH * 1.2 - 44,
    left: 0, right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 10, paddingVertical: 6,
  },
  annotationText: { fontSize: 11, color: '#F8FAFC', lineHeight: 16 },
  photoDate: { fontSize: 11, color: '#64748B', padding: 8 },
  // FABs
  fabRow: { position: 'absolute', bottom: 24, right: 20, flexDirection: 'row', alignItems: 'center', gap: 12 },
  fabSecondary: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#334155',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,
  },
  fab: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
  modalSheet: { backgroundColor: '#1E293B', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
  modalHandle: { width: 40, height: 4, backgroundColor: '#475569', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#F8FAFC', marginBottom: 16 },
  previewImage: { width: '100%', height: 200, borderRadius: 12, marginBottom: 16, backgroundColor: '#334155' },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#94A3B8', marginBottom: 6 },
  input: {
    backgroundColor: '#0F172A', borderRadius: 10, padding: 14, color: '#F8FAFC', fontSize: 15,
    borderWidth: 1, borderColor: '#334155', height: 80, textAlignVertical: 'top',
  },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, paddingVertical: 14, backgroundColor: '#334155', borderRadius: 12, alignItems: 'center' },
  cancelText: { color: '#F8FAFC', fontWeight: '600', fontSize: 15 },
  saveBtn: { flex: 1, flexDirection: 'row', paddingVertical: 14, backgroundColor: '#3B82F6', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  // Viewer
  viewerContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  viewerClose: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 8 },
  viewerImage: { width: SCREEN_WIDTH, height: SCREEN_WIDTH * 1.4 },
  viewerAnnotation: { position: 'absolute', bottom: 40, left: 20, right: 20, backgroundColor: 'rgba(15,23,42,0.9)', padding: 16, borderRadius: 12 },
  viewerAnnotationText: { color: '#F8FAFC', fontSize: 14, lineHeight: 20 },
});
