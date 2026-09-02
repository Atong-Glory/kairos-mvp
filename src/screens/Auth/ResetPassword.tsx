import React, { useState } from 'react';
import { View, Text, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import AnimatedPressable from '../../components/AnimatedPressable';
import { MIN_PASSWORD_LENGTH } from '../../lib/validation';
import { authStyles as styles } from '../../theme/authStyles';

/** Shown after the user opens a password-recovery deep link (PASSWORD_RECOVERY auth event). */
export default function ResetPassword() {
  const { clearPasswordRecovery } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (password.length < MIN_PASSWORD_LENGTH) {
      Toast.show({ type: 'error', text1: 'Weak Password', text2: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
      return;
    }
    if (password !== confirm) {
      Toast.show({ type: 'error', text1: 'Mismatch', text2: 'Passwords do not match.' });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      Toast.show({ type: 'error', text1: 'Update Failed', text2: error.message });
      return;
    }
    Toast.show({ type: 'success', text1: 'Password Updated', text2: 'You are now signed in.' });
    clearPasswordRecovery();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Set New Password</Text>
        <Text style={styles.subtitle}>Choose a password for your Kairos account.</Text>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>New Password</Text>
          <TextInput
            style={styles.input}
            placeholder="At least 8 characters"
            placeholderTextColor="#888"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="newPassword"
          />
        </View>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#888"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            textContentType="newPassword"
            onSubmitEditing={handleSave}
          />
        </View>
        <AnimatedPressable style={styles.button} onPress={handleSave} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save Password</Text>}
        </AnimatedPressable>
      </View>
    </SafeAreaView>
  );
}
