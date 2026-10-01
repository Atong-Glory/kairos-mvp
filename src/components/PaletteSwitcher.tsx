import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PaletteName, useTheme } from '../context/ThemeContext';

const OPTIONS: { value: PaletteName; label: string; colors: [string, string, string] }[] = [
  { value: 'midnight', label: 'Midnight', colors: ['#0B1018', '#131B26', '#D6A85F'] },
  { value: 'goldenHour', label: 'Golden Hour', colors: ['#F1EBDD', '#FBF7EE', '#98572D'] },
];

export default function PaletteSwitcher({ compact = false }: { compact?: boolean }) {
  const { theme, isLoading, setPalette } = useTheme();
  const [saving, setSaving] = useState(false);

  const choosePalette = async (palette: PaletteName) => {
    if (palette === theme.palette || saving || isLoading) return;
    setSaving(true);
    try {
      await setPalette(palette);
    } catch (error) {
      console.error('Unable to save KAIRO palette:', error);
      Alert.alert('Palette not saved', 'Your appearance preference could not be stored. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (compact) {
    return (
      <View style={[styles.compactContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={styles.compactLabel}>
          <Text style={[styles.compactEyebrow, { color: theme.colors.textMuted }]}>COLOR GRADE</Text>
          <Text style={[styles.compactTitle, { color: theme.colors.text }]}>{theme.name}</Text>
        </View>
        <View style={styles.compactOptions}>
          {OPTIONS.map(option => {
            const selected = theme.palette === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{ selected, disabled: saving || isLoading }}
                accessibilityLabel={`${option.label} palette${selected ? ', selected' : ''}`}
                disabled={saving || isLoading}
                onPress={() => void choosePalette(option.value)}
                style={[
                  styles.compactOption,
                  { backgroundColor: theme.colors.surfaceElevated, borderColor: selected ? theme.colors.accent : theme.colors.border },
                ]}
              >
                <View style={[styles.colorDot, { backgroundColor: option.colors[2] }]} />
                <Text style={[styles.compactOptionText, { color: theme.colors.text }]}>{option.label}</Text>
                {selected ? <Text style={[styles.selectedMark, { color: theme.colors.accent }]}>✓</Text> : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <View style={styles.headingRow}>
        <View style={styles.headingCopy}>
          <Text style={[styles.eyebrow, { color: theme.colors.accent }]}>YOUR VIEWING LIGHT</Text>
          <Text style={[styles.title, { color: theme.colors.text }]}>Choose a palette</Text>
          <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
            A calmer set, in the light you prefer.
          </Text>
        </View>
        {saving ? <ActivityIndicator color={theme.colors.accent} /> : null}
      </View>

      <View style={styles.options}>
        {OPTIONS.map(option => {
          const selected = theme.palette === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled: saving || isLoading }}
              accessibilityLabel={`${option.label} palette${selected ? ', selected' : ''}`}
              disabled={saving || isLoading}
              onPress={() => void choosePalette(option.value)}
              style={[
                styles.option,
                { backgroundColor: theme.colors.surfaceElevated, borderColor: selected ? theme.colors.accent : theme.colors.border },
              ]}
            >
              <View style={[styles.swatch, { backgroundColor: option.colors[0], borderColor: theme.colors.border }]}>
                <View style={[styles.swatchInset, { backgroundColor: option.colors[1] }]} />
                <View style={[styles.swatchAccent, { backgroundColor: option.colors[2] }]} />
              </View>
              <View style={styles.optionCopy}>
                <Text style={[styles.optionTitle, { color: theme.colors.text }]}>{option.label}</Text>
                <Text style={[styles.optionSubtitle, { color: theme.colors.textMuted }]}>
                  {option.value === 'midnight' ? 'Low-light set' : 'Warm paper'}
                </Text>
              </View>
              <View
                style={[
                  styles.radio,
                  { borderColor: selected ? theme.colors.accent : theme.colors.textMuted },
                  selected && { backgroundColor: theme.colors.accent },
                ]}
              >
                {selected ? <View style={[styles.radioDot, { backgroundColor: theme.colors.accentContrast }]} /> : null}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  compactContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, padding: 10 },
  compactLabel: { flex: 1 },
  compactEyebrow: { fontSize: 9, fontWeight: '700', letterSpacing: 1.2 },
  compactTitle: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  compactOptions: { flexDirection: 'row', gap: 6 },
  compactOption: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 7 },
  colorDot: { width: 8, height: 8, borderRadius: 4 },
  compactOptionText: { fontSize: 10, fontWeight: '600' },
  selectedMark: { fontSize: 10, fontWeight: '700' },
  container: { borderRadius: 18, borderWidth: 1, padding: 18 },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headingCopy: { flex: 1 },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.7 },
  title: { fontSize: 18, fontWeight: '700', marginTop: 7 },
  description: { fontSize: 13, lineHeight: 19, marginTop: 4 },
  options: { flexDirection: 'row', gap: 10, marginTop: 16 },
  option: { flex: 1, minWidth: 0, borderWidth: 1.5, borderRadius: 13, padding: 10 },
  swatch: { height: 38, borderRadius: 8, borderWidth: 1, overflow: 'hidden', flexDirection: 'row', alignItems: 'flex-end' },
  swatchInset: { flex: 1, height: '72%', borderTopRightRadius: 8 },
  swatchAccent: { width: 11, height: '100%' },
  optionCopy: { flex: 1 },
  optionTitle: { fontSize: 13, fontWeight: '700', marginTop: 10 },
  optionSubtitle: { fontSize: 10, marginTop: 3 },
  radio: { position: 'absolute', top: 10, right: 10, width: 17, height: 17, borderRadius: 9, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 6, height: 6, borderRadius: 3 },
});
