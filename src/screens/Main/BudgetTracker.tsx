import React, { useEffect, useState } from 'react';
import { usePaletteStyles } from '../../context/ThemeContext';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, Alert, Modal, TextInput,
  KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { supabase } from '../../lib/supabase';
import { usePermissions } from '../../context/PermissionsContext';
import Toast from 'react-native-toast-message';
import { ProjectsScreenProps } from '../../navigation/types';
import AnimatedPressable from '../../components/AnimatedPressable';

type BudgetItem = {
  id: string;
  category: string;
  description: string;
  planned_amount: number;
  actual_amount: number;
};

const CATEGORIES = [
  'Above-the-Line', 'Production', 'Camera', 'Grip/Electric',
  'Art & Set', 'Wardrobe & HMU', 'Sound', 'Location',
  'Catering', 'Transport', 'Post-Production', 'Contingency', 'Other'
];

const CATEGORY_COLORS: Record<string, string> = {
  'Above-the-Line': '#8B5CF6',
  'Production': '#3B82F6',
  'Camera': '#EC4899',
  'Grip/Electric': '#F59E0B',
  'Art & Set': '#10B981',
  'Wardrobe & HMU': '#14B8A6',
  'Sound': '#6366F1',
  'Location': '#F97316',
  'Catering': '#EF4444',
  'Transport': '#84CC16',
  'Post-Production': '#06B6D4',
  'Contingency': '#94A3B8',
  'Other': '#64748B',
};

const formatCurrency = (n: number) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function BudgetTracker({ route, navigation }: ProjectsScreenProps<'BudgetTracker'>) {
  const themedStyles = usePaletteStyles(styles);
  const { projectId } = route.params;
  const { isEditor } = usePermissions();
  const canEdit = isEditor(projectId);
  
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [editItem, setEditItem] = useState<BudgetItem | null>(null);
  const [saving, setSaving] = useState(false);

  // Form
  const emptyForm = { category: CATEGORIES[0], description: '', planned_amount: '', actual_amount: '' };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('budget_items')
      .select('*')
      .eq('project_id', projectId)
      .order('category');
    if (!error) setItems(data || []);
    setLoading(false);
  };

  // Totals
  const totalPlanned = items.reduce((s, i) => s + (i.planned_amount || 0), 0);
  const totalActual = items.reduce((s, i) => s + (i.actual_amount || 0), 0);
  const burnRate = totalPlanned > 0 ? (totalActual / totalPlanned) * 100 : 0;
  const remaining = totalPlanned - totalActual;

  const openAdd = () => {
    if (!canEdit) {
      Toast.show({ type: 'error', text1: 'Permission Denied', text2: 'Only editors can add budget items.' });
      return;
    }
    setEditItem(null);
    setForm(emptyForm);
    setAddModal(true);
  };

  const openEdit = (item: BudgetItem) => {
    if (!canEdit) {
      Toast.show({ type: 'info', text1: 'View-Only Mode', text2: 'You don\'t have permission to edit budget items.' });
      return;
    }
    setEditItem(item);
    setForm({
      category: item.category,
      description: item.description,
      planned_amount: String(item.planned_amount),
      actual_amount: String(item.actual_amount),
    });
    setAddModal(true);
  };

  const handleSave = async () => {
    if (!form.description.trim() || !form.planned_amount) {
      Toast.show({ type: 'error', text1: 'Required', text2: 'Please fill in description and planned amount.' });
      return;
    }
    setSaving(true);
    const payload = {
      project_id: projectId,
      category: form.category,
      description: form.description.trim(),
      planned_amount: parseFloat(form.planned_amount) || 0,
      actual_amount: parseFloat(form.actual_amount) || 0,
    };
    let error;
    if (editItem) {
      ({ error } = await supabase.from('budget_items').update(payload).eq('id', editItem.id));
    } else {
      ({ error } = await supabase.from('budget_items').insert([payload]));
    }
    setSaving(false);
    if (error) { Toast.show({ type: 'error', text1: 'Error', text2: error.message }); return; }
    setAddModal(false);
    fetchItems();
  };

  const handleDelete = (item: BudgetItem) => {
    if (!canEdit) {
      Toast.show({ type: 'error', text1: 'Permission Denied', text2: 'Only editors can delete budget items.' });
      return;
    }
    Alert.alert('Delete Item', `Delete "${item.description}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await supabase.from('budget_items').delete().eq('id', item.id);
          fetchItems();
        }
      }
    ]);
  };

  // Group items by category
  const grouped = items.reduce((acc: Record<string, BudgetItem[]>, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const burnColor = burnRate > 90 ? '#EF4444' : burnRate > 70 ? '#F59E0B' : '#10B981';

  return (
    <SafeAreaView style={themedStyles.container}>
      <View style={themedStyles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={themedStyles.backBtn}>
          <Icon name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <Text style={themedStyles.headerTitle}>Budget Tracker</Text>
        {canEdit ? (
          <TouchableOpacity style={themedStyles.addBtn} onPress={openAdd}>
            <Icon name="add" size={24} color="#3B82F6" />
          </TouchableOpacity>
        ) : (
          <View style={themedStyles.addBtn} />
        )}
      </View>

      {!canEdit && (
        <View style={themedStyles.permissionNotice}>
          <Icon name="lock-closed" size={16} color="#F59E0B" />
          <Text style={themedStyles.permissionText}>Budget data is view-only for your role</Text>
        </View>
      )}

      {loading ? (
        <View style={themedStyles.center}><ActivityIndicator size="large" color="#3B82F6" /></View>
      ) : (
        <ScrollView contentContainerStyle={themedStyles.scroll}>
          {/* Summary Cards */}
          <View style={themedStyles.summaryRow}>
            <View style={[themedStyles.summaryCard, { borderLeftColor: '#3B82F6' }]}>
              <Text style={themedStyles.summaryLabel}>TOTAL BUDGET</Text>
              <Text style={themedStyles.summaryValue}>{formatCurrency(totalPlanned)}</Text>
            </View>
            <View style={[themedStyles.summaryCard, { borderLeftColor: '#10B981' }]}>
              <Text style={themedStyles.summaryLabel}>SPENT</Text>
              <Text style={[themedStyles.summaryValue, { color: '#10B981' }]}>{formatCurrency(totalActual)}</Text>
            </View>
          </View>

          <View style={themedStyles.summaryRow}>
            <View style={[themedStyles.summaryCard, { borderLeftColor: remaining >= 0 ? '#F59E0B' : '#EF4444' }]}>
              <Text style={themedStyles.summaryLabel}>REMAINING</Text>
              <Text style={[themedStyles.summaryValue, { color: remaining >= 0 ? '#F8FAFC' : '#EF4444' }]}>
                {formatCurrency(Math.abs(remaining))}{remaining < 0 ? ' OVER' : ''}
              </Text>
            </View>
            <View style={[themedStyles.summaryCard, { borderLeftColor: burnColor }]}>
              <Text style={themedStyles.summaryLabel}>BURN RATE</Text>
              <Text style={[themedStyles.summaryValue, { color: burnColor }]}>{burnRate.toFixed(1)}%</Text>
            </View>
          </View>

          {/* Burn Rate Bar */}
          <View style={themedStyles.burnBarContainer}>
            <View style={themedStyles.burnBarBg}>
              <View style={[themedStyles.burnBarFill, { width: `${Math.min(burnRate, 100)}%` as any, backgroundColor: burnColor }]} />
            </View>
            <Text style={[themedStyles.burnBarLabel, { color: burnColor }]}>
              {burnRate.toFixed(1)}% of budget used
            </Text>
          </View>

          {/* Budget Items */}
          {items.length === 0 ? (
            <View style={themedStyles.emptyCard}>
              <Icon name="wallet-outline" size={56} color="#334155" />
              <Text style={themedStyles.emptyTitle}>No Budget Items</Text>
              <Text style={themedStyles.emptySub}>Tap + to add your first budget line item.</Text>
            </View>
          ) : (
            Object.keys(grouped).map(category => {
              const catPlanned = grouped[category].reduce((s, i) => s + (i.planned_amount || 0), 0);
              const catActual = grouped[category].reduce((s, i) => s + (i.actual_amount || 0), 0);
              const color = CATEGORY_COLORS[category] || '#64748B';
              return (
                <View key={category} style={themedStyles.categorySection}>
                  <View style={themedStyles.categoryHeader}>
                    <View style={[themedStyles.categoryDot, { backgroundColor: color }]} />
                    <Text style={themedStyles.categoryTitle}>{category}</Text>
                    <Text style={themedStyles.categoryTotal}>
                      {formatCurrency(catActual)} / {formatCurrency(catPlanned)}
                    </Text>
                  </View>
                  {grouped[category].map(item => (
                    <TouchableOpacity
                      key={item.id}
                      style={themedStyles.lineItem}
                      onPress={() => openEdit(item)}
                      onLongPress={() => handleDelete(item)}
                      activeOpacity={0.75}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={themedStyles.itemDesc}>{item.description}</Text>
                        <View style={themedStyles.amountRow}>
                          <Text style={themedStyles.plannedAmt}>Budget: {formatCurrency(item.planned_amount)}</Text>
                          <Text style={[
                            themedStyles.actualAmt,
                            { color: item.actual_amount > item.planned_amount ? '#EF4444' : '#10B981' }
                          ]}>
                            Actual: {formatCurrency(item.actual_amount)}
                          </Text>
                        </View>
                        {/* Mini progress bar */}
                        <View style={themedStyles.miniBarBg}>
                          <View style={[
                            themedStyles.miniBarFill,
                            {
                              width: `${Math.min(item.planned_amount > 0 ? (item.actual_amount / item.planned_amount) * 100 : 0, 100)}%` as any,
                              backgroundColor: item.actual_amount > item.planned_amount ? '#EF4444' : color,
                            }
                          ]} />
                        </View>
                      </View>
                      <Icon name="chevron-forward" size={16} color="#475569" style={{ marginLeft: 8 }} />
                    </TouchableOpacity>
                  ))}
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Add / Edit Modal */}
      <Modal visible={addModal} transparent animationType="slide" onRequestClose={() => setAddModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={themedStyles.modalOverlay}>
            <View style={themedStyles.modalSheet}>
              <View style={themedStyles.modalHandle} />
              <Text style={themedStyles.modalTitle}>{editItem ? 'Edit Item' : 'Add Budget Item'}</Text>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Category picker */}
                <Text style={themedStyles.inputLabel}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                  <View style={themedStyles.catPicker}>
                    {CATEGORIES.map(cat => (
                      <TouchableOpacity
                        key={cat}
                        style={[themedStyles.catChip, form.category === cat && { backgroundColor: `${CATEGORY_COLORS[cat]}30`, borderColor: CATEGORY_COLORS[cat] }]}
                        onPress={() => setForm(f => ({ ...f, category: cat }))}
                      >
                        <Text style={[themedStyles.catChipText, form.category === cat && { color: CATEGORY_COLORS[cat] }]}>{cat}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                <Text style={themedStyles.inputLabel}>Description *</Text>
                <TextInput style={themedStyles.input} placeholder="e.g. Director's Fee" placeholderTextColor="#64748B"
                  value={form.description} onChangeText={v => setForm(f => ({ ...f, description: v }))} />

                <View style={themedStyles.amountInputRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={themedStyles.inputLabel}>Planned ($) *</Text>
                    <TextInput style={themedStyles.input} placeholder="0.00" placeholderTextColor="#64748B"
                      keyboardType="decimal-pad" value={form.planned_amount}
                      onChangeText={v => setForm(f => ({ ...f, planned_amount: v }))} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={themedStyles.inputLabel}>Actual ($)</Text>
                    <TextInput style={themedStyles.input} placeholder="0.00" placeholderTextColor="#64748B"
                      keyboardType="decimal-pad" value={form.actual_amount}
                      onChangeText={v => setForm(f => ({ ...f, actual_amount: v }))} />
                  </View>
                </View>
              </ScrollView>

              <View style={themedStyles.modalActions}>
                <TouchableOpacity style={themedStyles.cancelBtn} onPress={() => setAddModal(false)}>
                  <Text style={themedStyles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <AnimatedPressable style={themedStyles.saveBtn} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={themedStyles.saveText}>{editItem ? 'Save Changes' : 'Add Item'}</Text>}
                </AnimatedPressable>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  backBtn: { padding: 4, marginRight: 16 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: 'bold', color: '#F8FAFC' },
  addBtn: { padding: 8, backgroundColor: '#1E293B', borderRadius: 10 },
  permissionNotice: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#7C2D12', 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    gap: 8 
  },
  permissionText: { 
    color: '#FED7AA', 
    fontSize: 13, 
    fontWeight: '500',
    flex: 1
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16, paddingBottom: 40 },
  // Summary
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  summaryCard: {
    flex: 1, backgroundColor: '#1E293B', borderRadius: 14,
    padding: 16, borderLeftWidth: 3,
  },
  summaryLabel: { fontSize: 10, fontWeight: '700', color: '#64748B', letterSpacing: 1, marginBottom: 6 },
  summaryValue: { fontSize: 18, fontWeight: 'bold', color: '#F8FAFC' },
  // Burn bar
  burnBarContainer: { marginBottom: 24 },
  burnBarBg: { height: 8, backgroundColor: '#1E293B', borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  burnBarFill: { height: '100%', borderRadius: 4 },
  burnBarLabel: { fontSize: 12, fontWeight: '600', textAlign: 'right' },
  // Empty
  emptyCard: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#F8FAFC', marginTop: 16, marginBottom: 8 },
  emptySub: { color: '#64748B', fontSize: 14, textAlign: 'center' },
  // Category section
  categorySection: { marginBottom: 20 },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  categoryDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  categoryTitle: { flex: 1, fontSize: 13, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.5, textTransform: 'uppercase' },
  categoryTotal: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  lineItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1E293B', borderRadius: 12, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: '#334155',
  },
  itemDesc: { fontSize: 14, fontWeight: '600', color: '#F8FAFC', marginBottom: 6 },
  amountRow: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  plannedAmt: { fontSize: 12, color: '#94A3B8' },
  actualAmt: { fontSize: 12, fontWeight: '600' },
  miniBarBg: { height: 4, backgroundColor: '#334155', borderRadius: 2, overflow: 'hidden' },
  miniBarFill: { height: '100%', borderRadius: 2 },
  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
  modalSheet: { backgroundColor: '#1E293B', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
  modalHandle: { width: 40, height: 4, backgroundColor: '#475569', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#F8FAFC', marginBottom: 20 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#94A3B8', marginBottom: 6, marginTop: 4 },
  input: { backgroundColor: '#0F172A', borderRadius: 10, padding: 14, color: '#F8FAFC', fontSize: 15, borderWidth: 1, borderColor: '#334155', marginBottom: 4 },
  amountInputRow: { flexDirection: 'row' },
  catPicker: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  catChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#334155' },
  catChipText: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, paddingVertical: 14, backgroundColor: '#334155', borderRadius: 12, alignItems: 'center' },
  cancelText: { color: '#F8FAFC', fontWeight: '600', fontSize: 15 },
  saveBtn: { flex: 1, paddingVertical: 14, backgroundColor: '#3B82F6', borderRadius: 12, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});
