import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/hooks/use-auth';

export default function HomeScreen() {
  const { configured, session } = useAuth();

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <SafeAreaView edges={['top', 'bottom']}>
        <View style={styles.header}>
          <View style={styles.wordmarkTile}>
            <Image
              source={require('@/assets/images/mykaraoke-wordmark.png')}
              contentFit="contain"
              style={styles.wordmark}
              accessibilityLabel="MyKaraoke"
            />
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/account')}
            style={({ pressed }) => [styles.accountButton, pressed && styles.pressed]}>
            <Text style={styles.accountButtonText}>{session ? 'Account' : 'Sign in'}</Text>
          </Pressable>
        </View>

        <View style={styles.hero}>
          <Image
            source={require('@/assets/images/mykaraoke-microphone.png')}
            contentFit="contain"
            style={styles.microphone}
            accessibilityLabel="MyKaraoke microphone logo"
          />
          <Text style={styles.eyebrow}>THE NATIVE PARTY APP</Text>
          <Text style={styles.title}>Your songs.{`\n`}Your stage.{`\n`}Your party.</Text>
          <Text style={styles.summary}>
            The iOS and Android foundation is ready. Account identity is the first live native
            slice; native room controls arrive next while the web app stays fully available.
          </Text>
        </View>

        <View style={styles.grid}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>AVAILABLE NOW</Text>
            <Text style={styles.cardTitle}>One account, ready for every party</Text>
            <Text style={styles.cardBody}>
              Sign in with the same hosted Google account used by MyKaraoke on the web. Native
              sessions persist securely on this device.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/account')}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
              <Text style={styles.primaryButtonText}>
                {session ? 'View account' : configured ? 'Continue with Google' : 'Configure account service'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>NATIVE N1 — NEXT SLICE</Text>
            <Text style={styles.cardTitle}>Create and join parties</Text>
            <Text style={styles.cardBody}>
              Native room APIs need authenticated app tokens before these controls can be enabled.
              The existing browser Host and Join flows remain available during this work.
            </Text>
            <View accessibilityState={{ disabled: true }} style={styles.disabledButton}>
              <Text style={styles.disabledButtonText}>Room controls coming next</Text>
            </View>
          </View>
        </View>

        <View style={styles.premiumCard}>
          <View style={styles.premiumBadge}><Text style={styles.premiumBadgeText}>PREMIUM</Text></View>
          <Text style={styles.premiumTitle}>Built after the core party journey</Text>
          <Text style={styles.cardBody}>
            Premium will provide unlimited MyKaraoke song credits and remove MyKaraoke ads. It
            will never claim to remove advertising served inside YouTube. Purchases remain off
            until native room control, TV pairing, pricing, and store verification are complete.
          </Text>
        </View>

        <Text style={styles.footer}>MyKaraoke by Nook Studio</Text>
      </SafeAreaView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#0B0D16' },
  content: { paddingHorizontal: 20, paddingBottom: 28 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  wordmarkTile: { width: 154, height: 62, borderRadius: 18, backgroundColor: '#FFF2E5', padding: 12 },
  wordmark: { width: '100%', height: '100%' },
  accountButton: { minHeight: 48, justifyContent: 'center', borderRadius: 16, borderWidth: 1, borderColor: '#3A3340', paddingHorizontal: 18, backgroundColor: '#191722' },
  accountButtonText: { color: '#FFF9F7', fontSize: 15, fontWeight: '800' },
  hero: { alignItems: 'center', paddingTop: 42, paddingBottom: 34 },
  microphone: { width: 112, height: 112, marginBottom: 22 },
  eyebrow: { color: '#FFBA35', fontSize: 12, fontWeight: '900', letterSpacing: 2.2 },
  title: { marginTop: 14, color: '#FFF9F7', fontSize: 48, lineHeight: 48, textAlign: 'center', fontWeight: '900', letterSpacing: -2 },
  summary: { marginTop: 20, maxWidth: 620, color: '#C9BEC3', fontSize: 17, lineHeight: 26, textAlign: 'center' },
  grid: { gap: 16 },
  card: { borderRadius: 28, borderWidth: 1, borderColor: '#332D39', backgroundColor: '#191722', padding: 24 },
  cardLabel: { color: '#FFBA35', fontSize: 11, fontWeight: '900', letterSpacing: 1.8 },
  cardTitle: { marginTop: 10, color: '#FFF9F7', fontSize: 27, lineHeight: 32, fontWeight: '900', letterSpacing: -0.8 },
  cardBody: { marginTop: 12, color: '#B8AEB5', fontSize: 15, lineHeight: 23 },
  primaryButton: { minHeight: 54, marginTop: 22, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: '#D92362', paddingHorizontal: 18 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', textAlign: 'center' },
  disabledButton: { minHeight: 54, marginTop: 22, alignItems: 'center', justifyContent: 'center', borderRadius: 18, borderWidth: 1, borderColor: '#3A3340', backgroundColor: '#11121B', paddingHorizontal: 18, opacity: 0.72 },
  disabledButtonText: { color: '#A69CA4', fontSize: 15, fontWeight: '800', textAlign: 'center' },
  premiumCard: { marginTop: 16, borderRadius: 28, borderWidth: 1, borderColor: '#7A4B2C', backgroundColor: '#211820', padding: 24 },
  premiumBadge: { alignSelf: 'flex-start', borderRadius: 999, backgroundColor: '#FF9C2E', paddingHorizontal: 12, paddingVertical: 7 },
  premiumBadgeText: { color: '#190D08', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  premiumTitle: { marginTop: 14, color: '#FFF2E5', fontSize: 25, lineHeight: 31, fontWeight: '900' },
  footer: { paddingTop: 28, paddingBottom: 8, color: '#807680', fontSize: 12, textAlign: 'center' },
  pressed: { opacity: 0.75, transform: [{ scale: 0.99 }] },
});
