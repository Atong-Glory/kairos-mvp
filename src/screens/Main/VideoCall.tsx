import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { ProjectsScreenProps } from '../../navigation/types';

export default function VideoCall({ route, navigation }: ProjectsScreenProps<'VideoCall'>) {
  const { projectId } = route.params;

  const handleOpenJitsi = async () => {
    const jitsiUrl = `https://meet.jit.si/KairosProject-${projectId}`;
    try {
      const canOpen = await Linking.canOpenURL(jitsiUrl);
      if (canOpen) {
        await Linking.openURL(jitsiUrl);
      }
    } catch (error) {
      console.error('Error opening Jitsi:', error);
    }
  };

  const openExternalProvider = async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error('Error opening URL:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Video Call</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Coming Soon Section */}
        <View style={styles.featureCard}>
          <View style={styles.iconContainer}>
            <Icon name="videocam-outline" size={64} color="#3B82F6" />
          </View>

          <Text style={styles.title}>Video Calling</Text>
          <Text style={styles.subtitle}>Feature Coming Soon</Text>

          <Text style={styles.description}>
            Built-in video calling will be available in KAIRO Pro. For now, use an external video conferencing service below.
          </Text>

          {/* Recommendation Box */}
          <View style={styles.recommendationBox}>
            <Icon name="star-outline" size={20} color="#F59E0B" style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.recommendationTitle}>Recommended</Text>
              <Text style={styles.recommendationText}>
                Use Jitsi Meet for free, secure video calls without an account
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Links Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Links</Text>

          {/* Jitsi Option */}
          <TouchableOpacity style={styles.optionCard} onPress={handleOpenJitsi}>
            <View style={[styles.optionIcon, { backgroundColor: '#E8F5E920' }]}>
              <Icon name="videocam" size={24} color="#10B981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.optionTitle}>Jitsi Meet (Recommended)</Text>
              <Text style={styles.optionDesc}>
                Free, secure, no account needed • Project ID: {projectId}
              </Text>
            </View>
            <Icon name="arrow-forward" size={20} color="#64748B" />
          </TouchableOpacity>

          {/* Other Options */}
          <TouchableOpacity 
            style={styles.optionCard}
            onPress={() => openExternalProvider('https://www.google.com/meet/')}
          >
            <View style={[styles.optionIcon, { backgroundColor: '#3B82F620' }]}>
              <Icon name="logo-google" size={24} color="#4285F4" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.optionTitle}>Google Meet</Text>
              <Text style={styles.optionDesc}>
                Premium video calling with screen sharing and recording
              </Text>
            </View>
            <Icon name="arrow-forward" size={20} color="#64748B" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.optionCard}
            onPress={() => openExternalProvider('https://www.zoom.us/')}
          >
            <View style={[styles.optionIcon, { backgroundColor: '#2196F320' }]}>
              <Icon name="videocam-outline" size={24} color="#2196F3" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.optionTitle}>Zoom</Text>
              <Text style={styles.optionDesc}>
                Industry standard with advanced features and recording
              </Text>
            </View>
            <Icon name="arrow-forward" size={20} color="#64748B" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.optionCard}
            onPress={() => openExternalProvider('https://www.skype.com/')}
          >
            <View style={[styles.optionIcon, { backgroundColor: '#0EA5E920' }]}>
              <Icon name="call" size={24} color="#0EA5E9" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.optionTitle}>Skype</Text>
              <Text style={styles.optionDesc}>
                Video calling and messaging integrated
              </Text>
            </View>
            <Icon name="arrow-forward" size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Icon name="information-circle-outline" size={24} color="#3B82F6" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.infoTitle}>Tip: Share Project ID</Text>
            <Text style={styles.infoText}>
              Use this project ID when sharing the meeting link with your crew: {projectId}
            </Text>
          </View>
        </View>

        {/* Button to open recommended option */}
        <TouchableOpacity style={styles.primaryButton} onPress={handleOpenJitsi}>
          <Icon name="videocam" size={20} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.primaryButtonText}>Open Jitsi Meet Now</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.secondaryButton} 
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.secondaryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </ScrollView>
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
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backBtn: {
    padding: 4,
    marginRight: 16,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  placeholder: {
    width: 24,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  featureCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 24,
    marginBottom: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  recommendationBox: {
    flexDirection: 'row',
    backgroundColor: '#F59E0B20',
    borderRadius: 12,
    padding: 14,
    width: '100%',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  recommendationTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F59E0B',
    textTransform: 'uppercase',
  },
  recommendationText: {
    fontSize: 12,
    color: '#D97706',
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E2E8F0',
    marginBottom: 14,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  optionDesc: {
    fontSize: 12,
    color: '#94A3B8',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#0F3A7D20',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3B82F6',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  secondaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#334155',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94A3B8',
  },
});
