import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/hooks/use-auth';
import { accountLabel } from '@/lib/auth-rules';
import { signInWithGoogle } from '@/lib/oauth';

export default function AccountScreen() {
  const { configured, isLoading, session, signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleGoogle = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await signInWithGoogle();
      if (result === 'cancelled') setMessage('Google sign-in was cancelled. Nothing changed.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Google sign-in could not be completed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <SafeAreaView edges={['top', 'bottom']}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>

        <Text style={styles.eyebrow}>YOUR MYKARAOKE ACCOUNT</Text>
        <Text style={styles.title}>Keep your party identity with you.</Text>
        <Text style={styles.summary}>
          This native session is separate from anonymous browser room cookies. Signing in never
          makes an account mandatory for the web MVP.
        </Text>

        <View style={styles.panel}>
          {isLoading ? (
            <View style={styles.loading}><ActivityIndicator color="#FF2471" /><Text style={styles.muted}>Checking your secure session…</Text></View>
          ) : session ? (
            <>
              <Text style={styles.panelLabel}>SIGNED IN</Text>
              <Text style={styles.panelTitle}>Welcome, {accountLabel(session.user.user_metadata, session.user.email)}.</Text>
              <Text style={styles.email}>{session.user.email}</Text>
              <View style={styles.status}><Text style={styles.statusText}>✓ Hosted Supabase account</Text></View>
              <Text style={styles.muted}>Your account is ready for the authenticated native room APIs in the next N1 slice. Premium is not active yet.</Text>
              <Pressable accessibilityRole="button" onPress={signOut} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
                <Text style={styles.secondaryText}>Sign out</Text>
              </Pressable>
            </>
          ) : configured ? (
            <>
              <Text style={styles.panelLabel}>ACCOUNT ACCESS</Text>
              <Text style={styles.panelTitle}>Continue securely with Google</Text>
              <Text style={styles.muted}>Google opens in a secure browser session and returns to the MyKaraoke app.</Text>
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={handleGoogle}
                style={({ pressed }) => [styles.googleButton, (pressed || busy) && styles.pressed]}>
                {busy ? <ActivityIndicator color="#13131B" /> : <Text style={styles.googleMark}>G</Text>}
                <Text style={styles.googleText}>{busy ? 'Opening Google…' : 'Continue with Google'}</Text>
              </Pressable>
              <Text style={styles.note}>Setup requirement: allow <Text style={styles.code}>mykaraoke://**</Text> in Supabase Auth redirect URLs before testing a development build.</Text>
            </>
          ) : (
            <>
              <Text style={styles.panelLabel}>CONFIGURATION REQUIRED</Text>
              <Text style={styles.panelTitle}>Connect the hosted account service</Text>
              <Text style={styles.muted}>Copy the browser-safe Supabase project URL and publishable/anon key into the mobile app&apos;s local environment file. No service-role key belongs in the app.</Text>
              <View style={styles.codeBlock}>
                <Text selectable style={styles.code}>EXPO_PUBLIC_SUPABASE_URL=…{`\n`}EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=…</Text>
              </View>
            </>
          )}
          {message ? <Text accessibilityRole="alert" style={styles.message}>{message}</Text> : null}
        </View>
      </SafeAreaView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#0B0D16' },
  content: { paddingHorizontal: 22, paddingBottom: 28 },
  backButton: { minHeight: 48, alignSelf: 'flex-start', justifyContent: 'center', paddingRight: 20 },
  backText: { color: '#FFF9F7', fontSize: 16, fontWeight: '800' },
  eyebrow: { marginTop: 34, color: '#FFBA35', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  title: { marginTop: 14, color: '#FFF9F7', fontSize: 42, lineHeight: 45, fontWeight: '900', letterSpacing: -1.6 },
  summary: { marginTop: 18, color: '#C9BEC3', fontSize: 16, lineHeight: 25 },
  panel: { marginTop: 32, borderRadius: 28, borderWidth: 1, borderColor: '#372F3C', backgroundColor: '#191722', padding: 24 },
  panelLabel: { color: '#FFBA35', fontSize: 11, fontWeight: '900', letterSpacing: 1.8 },
  panelTitle: { marginTop: 10, color: '#FFF9F7', fontSize: 28, lineHeight: 34, fontWeight: '900' },
  email: { marginTop: 8, color: '#D7CBD1', fontSize: 14 },
  muted: { marginTop: 14, color: '#B8AEB5', fontSize: 15, lineHeight: 23 },
  loading: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: 4 },
  status: { alignSelf: 'flex-start', marginTop: 18, borderRadius: 999, backgroundColor: '#173C33', paddingHorizontal: 13, paddingVertical: 8 },
  statusText: { color: '#9EF0D0', fontSize: 12, fontWeight: '800' },
  googleButton: { minHeight: 56, marginTop: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, borderRadius: 18, backgroundColor: '#FFF9F7', paddingHorizontal: 18 },
  googleMark: { color: '#4285F4', fontSize: 20, fontWeight: '900' },
  googleText: { color: '#13131B', fontSize: 16, fontWeight: '900' },
  secondaryButton: { minHeight: 54, marginTop: 24, alignItems: 'center', justifyContent: 'center', borderRadius: 18, borderWidth: 1, borderColor: '#4A404F' },
  secondaryText: { color: '#FFF9F7', fontSize: 15, fontWeight: '900' },
  note: { marginTop: 16, color: '#8F858D', fontSize: 12, lineHeight: 19 },
  codeBlock: { marginTop: 18, borderRadius: 16, backgroundColor: '#0D0E16', padding: 16 },
  code: { color: '#FFB35A', fontFamily: 'monospace', fontSize: 12, lineHeight: 20 },
  message: { marginTop: 18, borderRadius: 14, backgroundColor: '#38212A', padding: 14, color: '#FFB0A2', fontSize: 13, lineHeight: 20 },
  pressed: { opacity: 0.7 },
});
