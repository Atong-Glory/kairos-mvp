import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { supabase, AUTH_REDIRECT_URL } from '../../lib/supabase';
import { AuthScreenProps } from '../../navigation/types';
import AnimatedPressable from '../../components/AnimatedPressable';
import { isValidEmail } from '../../lib/validation';
import { authStyles as styles } from '../../theme/authStyles';

export default function ForgotPassword({ navigation }: AuthScreenProps<'ForgotPassword'>) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!isValidEmail(trimmedEmail)) {
      Toast.show({ type: 'error', text1: 'Invalid Email', text2: 'Please enter a valid email address.' });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, { redirectTo: AUTH_REDIRECT_URL });
    setLoading(false);
    if (error) {
      Toast.show({ type: 'error', text1: 'Request Failed', text2: error.message });
      return;
    }
    setSent(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Reset Password</Text>
        {sent ? (
          <>
            <Text style={styles.subtitle}>
              If an account exists for {email.trim()}, we've sent a link to set a new password. Open it on this device.
            </Text>
            <AnimatedPressable style={styles.button} onPress={() => navigation.navigate('Login')}>
              <Text style={styles.buttonText}>Back to Sign In</Text>
            </AnimatedPressable>
          </>
        ) : (
          <>
            <Text style={styles.subtitle}>
              Enter your email and we'll send you a link to set a new password. Invited crew members: use this to set your first password.
            </Text>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="producer@kairos.com"
                placeholderTextColor="#888"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                onSubmitEditing={handleReset}
              />
            </View>
            <AnimatedPressable style={styles.button} onPress={handleReset} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send Reset Link</Text>}
            </AnimatedPressable>
            <View style={styles.footer}>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Text style={styles.linkText}>Back to Sign In</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
