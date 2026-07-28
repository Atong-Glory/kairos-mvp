import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SectionList,
  ActivityIndicator, Alert, TextInput, Modal, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

type RoleMaster = {
  id: string;
  name: string;
  department: string;
};

type ProjectRole = {
  id: string;
  role_id: string;
  user_id: string;
  roles_master: RoleMaster;
  users: { id: string; full_name: string };
};

type TenantUser = {
  id: string;
  full_name: string;
};

export default function RoleManagement({ route, navigation }: any) {
  const { projectId, project } = route.params;
  const { tenantId } = useAuth();

  const [masterRoles, setMasterRoles] = useState<{ title: string; data: RoleMaster[] }[]>([]);
  const [projectRoles, setProjectRoles] = useState<ProjectRole[]>([]);
  const [tenantUsers, setTenantUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [selectedRole, setSelectedRole] = useState<RoleMaster | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rolesRes, projectRolesRes, usersRes] = await Promise.all([
        supabase.from('roles_master').select('*').order('department').order('name'),
        supabase.from('project_roles').select('*, roles_master(*), users(id, full_name)').eq('project_id', projectId),
        supabase.from('users').select('id, full_name').eq('tenant_id', tenantId),
      ]);

      if (rolesRes.error) throw rolesRes.error;
      if (projectRolesRes.error) throw projectRolesRes.error;
      if (usersRes.error) throw usersRes.error;

      // Group master roles by department
      const grouped = (rolesRes.data || []).reduce((acc: any, role: RoleMaster) => {
        if (!acc[role.department]) acc[role.department] = [];
        acc[role.department].push(role);
        return acc;
      }, {});
      const sections = Object.keys(grouped).sort().map(dept => ({
        title: dept,
        data: grouped[dept],
      }));

      setMasterRoles(sections);
      setProjectRoles(projectRolesRes.data || []);
      setTenantUsers(usersRes.data || []);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const isRoleAssigned = (roleId: string) =>
    projectRoles.some(pr => pr.role_id === roleId);

  const getAssignedUser = (roleId: string): string | null => {
    const pr = projectRoles.find(r => r.role_id === roleId);
    return pr?.users?.full_name || null;
  };

  const handleRolePress = (role: RoleMaster) => {
    setSelectedRole(role);
    setModalVisible(true);
  };

  const handleAssign = async (userId: string) => {
    if (!selectedRole) return;
    setModalVisible(false);

    try {
      // Check if already assigned
      const existing = projectRoles.find(r => r.role_id === selectedRole.id);
      if (existing) {
        // Update existing assignment
        const { error } = await supabase
          .from('project_roles')
          .update({ user_id: userId })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        // New assignment
        const { error } = await supabase
          .from('project_roles')
          .insert([{ project_id: projectId, role_id: selectedRole.id, user_id: userId }]);
        if (error) throw error;
      }
      fetchData();
    } catch (err: any) {
      Alert.alert('Assignment Failed', err.message);
    }
  };

  const handleUnassign = async (roleId: string) => {
    Alert.alert('Remove Crew Member', 'Are you sure you want to unassign this role?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase
              .from('project_roles')
              .delete()
              .eq('project_id', projectId)
              .eq('role_id', roleId);
            if (error) throw error;
            fetchData();
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        }
      }
    ]);
  };

  const renderRoleItem = ({ item }: { item: RoleMaster }) => {
    const assigned = isRoleAssigned(item.id);
    const assignedUser = getAssignedUser(item.id);
    return (
      <TouchableOpacity
        style={[styles.roleRow, assigned && styles.roleRowAssigned]}
        onPress={() => handleRolePress(item)}
        onLongPress={() => assigned && handleUnassign(item.id)}
        activeOpacity={0.75}
      >
        <View style={styles.roleInfo}>
          <Text style={styles.roleName}>{item.name}</Text>
          {assignedUser && (
            <Text style={styles.assignedName}>{assignedUser}</Text>
          )}
        </View>
        <View style={[styles.roleStatus, assigned ? styles.statusFilled : styles.statusEmpty]}>
          <Icon
            name={assigned ? 'person-circle' : 'add-circle-outline'}
            size={22}
            color={assigned ? '#10B981' : '#64748B'}
          />
        </View>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section: { title } }: any) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Crew & Roles</Text>
          <Text style={styles.headerSub}>{projectRoles.length} assigned</Text>
        </View>
        <TouchableOpacity style={styles.inviteBtn} onPress={() => navigation.navigate('InviteCrew', { tenantId })}>
          <Icon name="person-add-outline" size={22} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      <Text style={styles.hint}>Tap to assign. Long-press to unassign.</Text>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#3B82F6" /></View>
      ) : (
        <SectionList
          sections={masterRoles}
          keyExtractor={(item) => item.id}
          renderItem={renderRoleItem}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      )}

      {/* Assign User Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Assign {selectedRole?.name}</Text>
            <Text style={styles.modalSub}>Select a crew member from your production house</Text>
            <ScrollView style={{ marginTop: 8 }}>
              {tenantUsers.length === 0 ? (
                <Text style={styles.noUsers}>
                  No other users in your tenant yet. Invite crew members first.
                </Text>
              ) : (
                tenantUsers.map(u => (
                  <TouchableOpacity
                    key={u.id}
                    style={styles.userRow}
                    onPress={() => handleAssign(u.id)}
                  >
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{u.full_name?.[0]?.toUpperCase() || '?'}</Text>
                    </View>
                    <Text style={styles.userName}>{u.full_name}</Text>
                    <Icon name="chevron-forward" size={18} color="#64748B" />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backBtn: { padding: 4, marginRight: 16 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#F8FAFC' },
  headerSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  inviteBtn: { marginLeft: 'auto', padding: 8, backgroundColor: '#1E293B', borderRadius: 10 },
  hint: { fontSize: 12, color: '#475569', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sectionHeader: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3B82F6',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  roleRowAssigned: { backgroundColor: '#0F2445' },
  roleInfo: { flex: 1 },
  roleName: { fontSize: 15, color: '#E2E8F0', fontWeight: '500' },
  assignedName: { fontSize: 12, color: '#10B981', marginTop: 2 },
  roleStatus: { padding: 4 },
  statusFilled: {},
  statusEmpty: {},
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalSheet: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '70%',
  },
  modalHandle: {
    width: 40, height: 4,
    backgroundColor: '#475569',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#F8FAFC' },
  modalSub: { fontSize: 13, color: '#94A3B8', marginTop: 4, marginBottom: 12 },
  noUsers: { color: '#64748B', textAlign: 'center', padding: 24, lineHeight: 22 },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#3B82F6',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  userName: { flex: 1, color: '#E2E8F0', fontSize: 15, fontWeight: '500' },
  cancelBtn: {
    marginTop: 16,
    paddingVertical: 14,
    backgroundColor: '#334155',
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelText: { color: '#F8FAFC', fontWeight: '600', fontSize: 15 },
});
