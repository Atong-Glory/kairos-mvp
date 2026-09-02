import { StyleSheet } from 'react-native';

export const authStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  content: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#F8FAFC', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#94A3B8', marginBottom: 32, lineHeight: 22 },
  inputContainer: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '500', color: '#E2E8F0', marginBottom: 8 },
  input: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    color: '#F8FAFC',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  button: { backgroundColor: '#3B82F6', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { color: '#94A3B8', fontSize: 14 },
  linkText: { color: '#3B82F6', fontSize: 14, fontWeight: 'bold' },
});
