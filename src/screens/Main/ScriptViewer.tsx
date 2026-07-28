import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import Pdf from 'react-native-pdf';

export default function ScriptViewer({ route, navigation }: any) {
  const { projectId, project } = route.params;
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    checkExistingScript();
  }, [projectId]);

  const checkExistingScript = async () => {
    try {
      setLoading(true);
      // We check if a script exists for this project in the bucket
      const filePath = `${projectId}/script.pdf`;
      const { data, error } = await supabase.storage.from('scripts').createSignedUrl(filePath, 3600); // 1 hour expiry
      
      if (data && data.signedUrl) {
        setPdfUrl(data.signedUrl);
      }
    } catch (error) {
      console.log('No script found or error fetching:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      setUploading(true);
      const file = result.assets[0];
      const filePath = `${projectId}/script.pdf`;

      // In React Native, fetch the URI to convert it to a Blob for Supabase upload
      const response = await fetch(file.uri);
      const blob = await response.blob();

      const { data, error } = await supabase.storage
        .from('scripts')
        .upload(filePath, blob, {
          contentType: 'application/pdf',
          upsert: true, // Overwrite if it already exists (e.g. new version)
        });

      if (error) throw error;
      
      // Update the script version in the project table
      if (project) {
        await supabase
          .from('projects')
          .update({ script_version: project.script_version + 1 })
          .eq('id', projectId);
      }

      Alert.alert('Success', 'Script uploaded successfully!');
      checkExistingScript(); // Reload the PDF
    } catch (error: any) {
      console.error('Upload Error:', error);
      Alert.alert('Upload Failed', error.message || 'Could not upload the script.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Script Viewer</Text>
        <TouchableOpacity style={styles.settingsBtn} onPress={handleUpload}>
          <Icon name="cloud-upload-outline" size={24} color="#F8FAFC" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {loading || uploading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.statusText}>{uploading ? 'Uploading Script...' : 'Loading...'}</Text>
          </View>
        ) : pdfUrl ? (
          <Pdf
            source={{ uri: pdfUrl, cache: true }}
            onLoadComplete={(numberOfPages, filePath) => {
              console.log(`Number of pages: ${numberOfPages}`);
            }}
            onPageChanged={(page, numberOfPages) => {
              console.log(`Current page: ${page}`);
            }}
            onError={(error) => {
              console.error(error);
              Alert.alert('PDF Error', 'Failed to load the PDF. It may be corrupted or the URL expired.');
            }}
            onPressLink={(uri) => {
              console.log(`Link pressed: ${uri}`);
            }}
            style={styles.pdf}
            trustAllCerts={false}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Icon name="document-text-outline" size={80} color="#334155" />
            <Text style={styles.emptyTitle}>No Script Uploaded</Text>
            <Text style={styles.emptySubText}>
              Upload the master PDF script to start breaking it down into scenes and assigning roles.
            </Text>
            <TouchableOpacity style={styles.uploadBtn} onPress={handleUpload}>
              <Icon name="add" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.uploadBtnText}>Upload PDF</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
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
    padding: 20,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F8FAFC',
    textAlign: 'center',
    marginHorizontal: 16,
  },
  settingsBtn: {
    padding: 4,
  },
  content: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    marginTop: 16,
    color: '#94A3B8',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginTop: 24,
    marginBottom: 12,
  },
  emptySubText: {
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  uploadBtn: {
    flexDirection: 'row',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  uploadBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pdf: {
    flex: 1,
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
    backgroundColor: '#0F172A',
  },
});
