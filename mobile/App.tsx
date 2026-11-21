import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import {
  ActivityIndicator, Animated, AppState, FlatList, KeyboardAvoidingView, Linking, Platform, Pressable as RNPressable, RefreshControl, SafeAreaView,
  ScrollView, StatusBar as RNStatusBar, Text, TextInput, View, useColorScheme,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { BlurTargetView } from 'expo-blur';
import { Backdrop, BlurTargetContext, CountUp, Frost, GrowBar, Press, PulseDot, Reveal, Skeleton } from './src/ui';
import { Outfit_500Medium, Outfit_600SemiBold } from '@expo-google-fonts/outfit';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono';
import type { Session } from '@supabase/supabase-js';
import { ApiError, fetchSyncData, supabase, unregisterPushToken } from './src/api';
import { alertsByBucket, freshIncidents, LEVEL, notificationFor, worstOf, guardStatus, hotspots } from './src/alerts';
import { API_BASE, REFRESH_SECONDS } from './src/config';
import { FightAlert } from './src/FightAlert';
import { downloadAndInstall } from './src/install';
import { LogoMark, LogoReveal } from './src/Logo';
import { setupAlerts, showLocalAlert, type AlertSetup } from './src/push';
import { secureStorage } from './src/storage';
import { serverHealth, totals } from './src/status';
import { makeStyles } from './src/styles';
import { DARK, LIGHT, firstName, greeting, timeAgo, type Palette } from './src/theme';
import { checkForUpdate, type UpdateInfo } from './src/update';
import { ThemeContext, fonts, useTheme } from './src/useTheme';
import type { Incident, SyncData } from './src/types';

type Tab = 'overview' | 'alerts' | 'account';
type ThemeChoice = 'auto' | 'dark' | 'light';
type IconName = React.ComponentProps<typeof Ionicons>['name'];
const THEME_KEY = 'campusguard.theme';
const APP_VERSION: string = Constants.expoConfig?.version ?? '0.0.0';
const SUPPORT_URL = 'https://wa.me/917003276998';

function useStyles() {
  const p = useTheme();
  return useMemo(() => makeStyles(p), [p]);
}

export default function App() {
  const system = useColorScheme();
  const [choice, setChoice] = useState<ThemeChoice>('light');
  const [fontsReady, fontError] = useFonts({
    Outfit_500Medium, Outfit_600SemiBold, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, JetBrainsMono_500Medium,
  });
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [revealDone, setRevealDone] = useState(false);
  const finishReveal = useCallback(() => setRevealDone(true), []);

  useEffect(() => {
    secureStorage.getItem(THEME_KEY).then((value) => {
      if (value === 'dark' || value === 'light' || value === 'auto') setChoice(value);
    }).catch(() => undefined);
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  const pick = (next: ThemeChoice) => { setChoice(next); secureStorage.setItem(THEME_KEY, next).catch(() => undefined); };
  const palette: Palette = choice === 'light' || (choice === 'auto' && system === 'light') ? LIGHT : DARK;
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const blurTarget = useRef<ComponentRef<typeof View>>(null);

  return (
    <ThemeContext.Provider value={palette}>
     <BlurTargetContext.Provider value={blurTarget}>
      <SafeAreaView style={[styles.root, Platform.OS === 'android' && { paddingTop: RNStatusBar.currentHeight ?? 24 }]}>
        <StatusBar style={palette.name === 'dark' ? 'light' : 'dark'} />
        <BlurTargetView ref={blurTarget} pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          <Backdrop />
        </BlurTargetView>
        {!(fontsReady || fontError) ? <View style={styles.center}><ActivityIndicator color={palette.lens} /></View>
          : !revealDone || !ready ? <LogoReveal onDone={finishReveal} />
          : session ? <Home email={session.user.email ?? ''} choice={choice} onChoice={pick} /> : <Login />}
      </SafeAreaView>
     </BlurTargetContext.Provider>
    </ThemeContext.Provider>
  );
}

function Icon({ name, size = 22, color }: { name: IconName; size?: number; color?: string }) {
  const p = useTheme();
  return <Ionicons name={name} size={size} color={color ?? p.text} />;
}

// ---------------------------------------------------------------- sign in
const ASIDE_FACTS = [
  'Works with the cameras you already have',
  'Alerts reach staff on WhatsApp and this app',
  'Video stays on the school PC or server',
];

function Login() {
  const p = useTheme();
  const s = useStyles();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [shown, setShown] = useState(false);
  const [reset, setReset] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; good: boolean } | null>(null);

  const submit = async () => {
    if (!email.trim() || (!reset && !password)) { setMessage({ text: reset ? 'Enter your email address.' : 'Enter your email and password.', good: false }); return; }
    setBusy(true); setMessage(null);
    if (reset) {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${API_BASE}/reset-password` });
      setMessage(error ? { text: 'We could not send the link right now. Try again in a minute.', good: false }
        : { text: 'If that account exists, a secure reset link is on its way.', good: true });
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) setMessage({ text: error.message === 'Invalid login credentials' ? 'Wrong email or password.' : error.message, good: false });
    }
    setBusy(false);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.loginScroll} keyboardShouldPersistTaps="handled">
        <View style={s.loginBrand}>
          <LogoMark size={34} />
          <Text style={s.loginWordmark}>CampusGuard</Text>
        </View>
        <Text style={s.loginHeadline}>Spot a fight as it starts.</Text>
        <Text style={[s.muted, { marginBottom: 16 }]}>CampusGuard watches your existing CCTV and tells the right person, quickly.</Text>
        <View style={{ gap: 10, marginBottom: 24 }}>
          {ASIDE_FACTS.map((fact) => (
            <View key={fact} style={s.factRow}><View style={s.factDot} /><Text style={s.dim}>{fact}</Text></View>
          ))}
        </View>

        <Frost style={s.card}>
          <Text style={s.label}>CUSTOMER ACCOUNT</Text>
          <Text style={s.loginTitle}>{reset ? 'Reset password' : 'Sign in'}</Text>
          <Text style={[s.muted, { marginBottom: 4 }]}>
            {reset ? "Enter your account email and we'll send a secure reset link if the account exists."
              : 'Sign in with the email and password you used when requesting early access.'}
          </Text>
          {message ? <Text style={[s.dim, { color: message.good ? p.good : p.bad }]}>{message.text}</Text> : null}
          <Text style={s.fieldLabel}>Email address</Text>
          <TextInput style={s.input} placeholder="you@institution.org" placeholderTextColor={p.muted} autoCapitalize="none"
            autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} />
          {!reset ? (
            <>
              <Text style={s.fieldLabel}>Password</Text>
              <View>
                <TextInput style={[s.input, { paddingRight: 52 }]} placeholder="Enter your password" placeholderTextColor={p.muted} secureTextEntry={!shown}
                  autoComplete="password" value={password} onChangeText={setPassword} onSubmitEditing={submit} />
                <RNPressable onPress={() => setShown(!shown)} hitSlop={10} style={{ position: 'absolute', right: 16, top: 0, bottom: 0, justifyContent: 'center' }}>
                  <Icon name={shown ? 'eye-off-outline' : 'eye-outline'} color={p.muted} />
                </RNPressable>
              </View>
            </>
          ) : null}
          <Press style={[s.button, { marginTop: 16 }, busy && s.disabled]} onPress={submit} disabled={busy}>
            {busy ? <ActivityIndicator color={p.onAccent} /> : <Text style={s.buttonText}>{reset ? 'Send reset link' : 'Log in'}</Text>}
          </Press>
          <Press onPress={() => { setReset(!reset); setMessage(null); }} style={{ paddingVertical: 14, alignItems: 'center' }}>
            <Text style={[s.dim, { color: p.text, fontFamily: fonts.bodyMedium }]}>{reset ? 'Back to log in' : 'Forgot password?'}</Text>
          </Press>
          <Text style={s.muted}>Your email and password are used only to sign you in and check your approval.</Text>
        </Frost>

        <Press onPress={() => Linking.openURL(API_BASE)} style={{ paddingVertical: 20, alignItems: 'center' }}>
          <Text style={s.dim}>No account yet? <Text style={{ color: p.text, fontFamily: fonts.bodyBold }}>Request access</Text></Text>
        </Press>
        <Text style={[s.muted, { textAlign: 'center' }]}>Version {APP_VERSION}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ---------------------------------------------------------------- signed in
function Home({ email, choice, onChoice }: { email: string; choice: ThemeChoice; onChoice: (c: ThemeChoice) => void }) {
  const p = useTheme();
  const s = useStyles();
  const [tab, setTab] = useState<Tab>('overview');
  const [data, setData] = useState<SyncData | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [alertState, setAlertState] = useState<AlertSetup>({ allowed: false, token: null, message: 'Turning on…' });
  const loading = useRef(false);
  const seen = useRef(new Set<string>());
  const tokenRef = useRef<string | null>(null);
  const [alertCard, setAlertCard] = useState<Incident | null>(null);
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [updateNote, setUpdateNote] = useState('');

  const load = useCallback(async () => {
    if (loading.current) return;
    loading.current = true;
    try {
      const next = await fetchSyncData();
      setData(next);
      // New incidents seen while the app is open show the alert card (the server push covers a closed app).
      const fresh = freshIncidents(seen.current, next.incidents);
      if (fresh.length) {
        if (AppState.currentState === 'active') setAlertCard(worstOf(fresh));
        else if (!tokenRef.current) {
          const message = notificationFor(fresh);
          if (message) showLocalAlert(message.title, message.body);
        }
      }
      setUpdatedAt(Date.now());
      setError('');
    } catch (failure) {
      setError(failure instanceof ApiError ? failure.message : 'Could not load data.');
      if (failure instanceof ApiError && failure.status === 401) await supabase.auth.signOut();
    } finally {
      setNow(Date.now());
      loading.current = false;
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, REFRESH_SECONDS * 1000);
    return () => clearInterval(timer);
  }, [load]);

  const lookForUpdate = useCallback(async (manual = false) => {
    const found = await checkForUpdate(APP_VERSION);
    setUpdate(found);
    if (manual) setUpdateNote(found ? '' : 'You have the latest version.');
  }, []);

  useEffect(() => {
    lookForUpdate();
    const timer = setInterval(lookForUpdate, 6 * 3600 * 1000);
    return () => clearInterval(timer);
  }, [lookForUpdate]);

  const install = async () => {
    if (!update) return;
    setUpdateNote(''); setProgress(0);
    const failure = await downloadAndInstall(update, setProgress);
    setProgress(null);
    setUpdateNote(failure ?? 'Installer opened. Tap Install, then open CampusGuard again.');
  };

  useEffect(() => {
    setupAlerts().then((result) => { tokenRef.current = result.token; setAlertState(result); });
    // A new alert arriving while the app is open, or a tap on one, refreshes the list at once.
    const received = Notifications.addNotificationReceivedListener(() => load());
    const tapped = Notifications.addNotificationResponseReceivedListener(() => { setTab('alerts'); load(); });
    return () => { received.remove(); tapped.remove(); };
  }, [load]);

  const signOut = async () => {
    if (alertState.token) await unregisterPushToken(alertState.token).catch(() => undefined);
    await supabase.auth.signOut();
  };
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
  const openAlerts = data?.incidents.filter((i) => i.status === 'NEW').length ?? 0;
  const name = firstName(email);

  return (
    <View style={s.root}>
      {error ? <Text style={s.banner}>{error}</Text> : null}
      <View style={s.body}>
        <Reveal key={tab} style={{ flex: 1 }}>
        {!data ? (
          <View style={[s.pad, { gap: 14, paddingTop: 30 }]}>
            <Skeleton style={{ height: 70, width: '60%' }} /><Skeleton style={{ height: 250 }} />
            <View style={{ flexDirection: 'row', gap: 10 }}><Skeleton style={{ flex: 1, height: 54, borderRadius: 27 }} /><Skeleton style={{ flex: 1, height: 54, borderRadius: 27 }} /></View>
            <Skeleton style={{ height: 120 }} />
          </View>)
          : tab === 'overview' ? (
            <Overview data={data} now={now} name={name} live={!error ? updatedAt : null} refreshing={refreshing} onRefresh={onRefresh}
              onAlerts={() => setTab('alerts')} update={update} progress={progress} updateNote={updateNote} onInstall={install} />
          ) : tab === 'alerts' ? <Alerts incidents={data.incidents} now={now} refreshing={refreshing} onRefresh={onRefresh} />
          : <Account email={email} name={name} alertState={alertState} version={APP_VERSION} update={update} updateNote={updateNote}
              onCheckUpdate={() => lookForUpdate(true)} onInstall={install} progress={progress} choice={choice} onChoice={onChoice} onSignOut={signOut} />}
        </Reveal>
      </View>

      <NavBar tab={tab} onTab={setTab} badge={openAlerts} />

      {alertCard ? (
        <FightAlert incident={alertCard} onReview={() => { setTab('alerts'); setAlertCard(null); }} onDismiss={() => setAlertCard(null)} />
      ) : null}
    </View>
  );
}


// ---------------------------------------------------------------- bottom navigation
const TABS: { key: Tab; label: string; on: IconName; off: IconName }[] = [
  { key: 'alerts', label: 'Alerts', on: 'notifications', off: 'notifications-outline' },
  { key: 'overview', label: 'Overview', on: 'shield-checkmark', off: 'shield-checkmark-outline' },
  { key: 'account', label: 'Account', on: 'person', off: 'person-outline' },
];

/** The glass pill. The raised circle slides to whichever tab is open. */
function NavBar({ tab, onTab, badge }: { tab: Tab; onTab: (t: Tab) => void; badge: number }) {
  const p = useTheme();
  const s = useStyles();
  const [width, setWidth] = useState(0);
  const index = TABS.findIndex((t) => t.key === tab);
  const slide = useRef(new Animated.Value(index)).current;
  useEffect(() => { Animated.spring(slide, { toValue: index, useNativeDriver: true, speed: 14, bounciness: 9 }).start(); }, [index, slide]);
  const inner = Math.max(0, width - 28);
  const slot = inner / 3;
  return (
    <Frost style={s.nav} intensity={70} tint={p.navGlass} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {slot ? (
        <Animated.View pointerEvents="none" style={[s.navCircle, { left: 14 + (slot - 64) / 2, transform: [{ translateX: slide.interpolate({ inputRange: [0, 1, 2], outputRange: [0, slot, slot * 2] }) }] }]} />
      ) : null}
      {TABS.map((t) => {
        const active = t.key === tab;
        return (
          <Press key={t.key} style={s.navItem} onPress={() => onTab(t.key)} accessibilityLabel={t.label} scaleTo={0.88}>
            <Icon name={active ? t.on : t.off} size={active ? 27 : 24} color={active ? p.ink : p.inkMuted} />
            {t.key === 'alerts' && badge ? <View style={s.navBadge}><Text style={s.navBadgeText}>{badge > 9 ? '9+' : badge}</Text></View> : null}
          </Press>
        );
      })}
    </Frost>
  );
}

// ---------------------------------------------------------------- overview
function BarChart({ values }: { values: number[] }) {
  const p = useTheme();
  const s = useStyles();
  const peak = Math.max(1, ...values);
  const top = values.indexOf(Math.max(...values));
  return (
    <View style={s.chartPanel}>
      <View style={s.rowBetween}>
        <Text style={[s.label, { color: p.mintBar, opacity: 0.7 }]}>ALERTS · LAST 24 HOURS</Text>
        <Text style={[s.chartLabel, { opacity: 1 }]}>{values.reduce((a, b) => a + b, 0)} total</Text>
      </View>
      <View style={s.chartRow}>
        {values.map((value, i) => (
          <GrowBar key={i} height={Math.max(6, (value / peak) * 78)} delay={i * 25} style={{ width: `${86 / values.length}%`, borderRadius: 8,
            backgroundColor: p.mintBar, opacity: value === 0 ? 0.22 : i === top && value > 0 ? 1 : 0.62 }} />
        ))}
      </View>
      <View style={s.chartAxis}>
        <Text style={s.chartLabel}>24h ago</Text><Text style={s.chartLabel}>12h</Text><Text style={s.chartLabel}>now</Text>
      </View>
    </View>
  );
}

function Overview({ data, now, name, live, refreshing, onRefresh, onAlerts, update, progress, updateNote, onInstall }: {
  data: SyncData; now: number; name: string; live: number | null; refreshing: boolean; onRefresh: () => void; onAlerts: () => void;
  update: UpdateInfo | null; progress: number | null; updateNote: string; onInstall: () => void;
}) {
  const p = useTheme();
  const s = useStyles();
  const sum = useMemo(() => totals(data.servers, now), [data.servers, now]);
  const buckets = useMemo(() => alertsByBucket(data.incidents, now), [data.incidents, now]);
  const healthColor = { online: p.good, degraded: p.warn, offline: p.bad } as const;
  const healthWord = { online: 'All working', degraded: 'Some offline', offline: 'Not reporting' } as const;
  const guard = guardStatus({ servers: data.servers.length, cameras: sum.cameras, online: sum.onlineKnown ? sum.online : null, offlineServers: sum.offlineServers }, data.incidents, now);
  const guardColor = { unknown: p.muted, secure: p.good, watch: p.warn, alert: p.bad }[guard];
  const hot = useMemo(() => hotspots(data.incidents, now), [data.incidents, now]);
  const guardText = {
    unknown: ['Not protecting yet', 'Connect a school PC to start watching your cameras.'],
    secure: ['Campus is secure', 'No serious alerts and every camera is reporting.'],
    watch: ['Needs a look', 'Some cameras or school PCs are not reporting.'],
    alert: ['Fight alert active', 'A serious alert in the last hour has not been reviewed.'],
  } as const;
  const allUp = sum.onlineKnown && sum.online >= sum.cameras && sum.offlineServers === 0 && sum.cameras > 0;

  return (
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={p.lens} />} contentContainerStyle={{ paddingBottom: 0 }}>
      <View style={s.topRow}>
        <View style={{ flexShrink: 1 }}>
          <Text style={s.h1}>{greeting(new Date(now).getHours())}{name ? `,\n${name}` : ''}</Text>
          <Frost style={s.livePill} blur={false}>
            <PulseDot color={live ? p.good : p.bad} />
            <Text style={s.liveText}>{live ? `Live · updated ${timeAgo(new Date(live).toISOString(), now)}` : 'Offline'}</Text>
          </Frost>
        </View>
        <View style={s.avatar}>{name ? <Text style={s.avatarText}>{name[0]}</Text> : <LogoMark size={22} color={p.inkText} />}</View>
      </View>

      <View style={s.pad}>
        {update ? (
          <Reveal index={0}><View style={s.ink}>
            <View style={s.inkRow}>
              <View style={s.inkIcon}><Icon name="download-outline" color={p.inkText} /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.inkTitle}>Update available</Text>
                <Text style={s.inkSub}>{progress !== null ? `Downloading… ${Math.round(progress * 100)}%` : updateNote || `v${update.version} · ${update.sizeMb} MB · keeps your sign-in`}</Text>
              </View>
              <Press onPress={onInstall} disabled={progress !== null} style={[{ backgroundColor: p.inkText, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 9 }, progress !== null && s.disabled]}>
                <Text style={{ color: p.ink, fontFamily: fonts.bodyBold, fontSize: 14 }}>Update</Text>
              </Press>
            </View>
          </View></Reveal>
        ) : null}

        <Reveal index={1}>
          <Frost style={[s.card, { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 }]}>
            <View style={{ width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: guardColor + '26' }}>
              <Icon name={guard === 'alert' ? 'warning' : guard === 'watch' ? 'eye-outline' : 'shield-checkmark'} size={26} color={guardColor} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.title}>{guardText[guard][0]}</Text>
              <Text style={s.muted}>{guardText[guard][1]}</Text>
            </View>
          </Frost>
        </Reveal>

        {data.servers.length === 0 ? (
          <Frost style={s.hero}>
            <Text style={s.label}>GET STARTED</Text>
            <Text style={[s.h2, { marginTop: 4 }]}>Connect your first school PC</Text>
            <Text style={[s.muted, { marginTop: 6 }]}>Open the CampusGuard desktop app, go to Settings and turn on cloud sync with this same account. Your cameras and alerts will appear here within a minute.</Text>
          </Frost>
        ) : (
          <Frost style={s.hero}>
            <Text style={s.label}>CAMERAS ONLINE</Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
              {sum.onlineKnown ? <CountUp value={sum.online} style={[s.heroNumber, !allUp ? { color: p.warn } : null]} /> : <Text style={s.heroNumber}>—</Text>}
              <Text style={[s.heroOf, { marginBottom: 12 }]}>/ {sum.cameras}</Text>
            </View>
            <Text style={s.dim}>
              {allUp ? 'Every camera is reporting.' : sum.offlineServers ? `${sum.offlineServers} school PC not reporting.` : 'Some cameras are offline.'}
            </Text>
            <BarChart values={buckets} />
          </Frost>
        )}

        <View style={s.pillRow}>
          <Press style={{ flex: 1 }} onPress={onAlerts}>
            <Frost style={s.pillAction} blur={false}>
              <View style={s.pillIcon}><Icon name="notifications-outline" size={20} color={p.inkText} /></View>
              <Text style={s.pillLabel}>{sum.open ? `${sum.open} open` : 'Alerts'}</Text>
            </Frost>
          </Press>
          <Press style={{ flex: 1 }} onPress={onRefresh}>
            <Frost style={s.pillAction} blur={false}>
              <View style={s.pillIcon}><Icon name="refresh" size={20} color={p.inkText} /></View>
              <Text style={s.pillLabel}>Refresh</Text>
            </Frost>
          </Press>
        </View>

        {hot.length ? (
          <Reveal index={3}>
            <Frost style={[s.card, { gap: 12 }]}>
              <Text style={s.label}>HOTSPOT CAMERAS · LAST 24 HOURS</Text>
              {hot.map((h, n) => (
                <View key={h.camera} style={{ gap: 6 }}>
                  <View style={s.rowBetween}>
                    <Text style={s.title} numberOfLines={1}>{n + 1}. {h.camera}</Text>
                    <Text style={[s.chip, { color: p.severity[h.worst] ?? p.muted, backgroundColor: (p.severity[h.worst] ?? p.muted) + '26' }]}>{h.count} {h.count === 1 ? 'alert' : 'alerts'}</Text>
                  </View>
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: p.field }}>
                    <GrowBar height={6} style={{ width: `${Math.max(12, (h.count / hot[0].count) * 100)}%`, borderRadius: 3, backgroundColor: p.severity[h.worst] ?? p.muted }} />
                  </View>
                </View>
              ))}
            </Frost>
          </Reveal>
        ) : null}

        {data.servers.length ? (
          <>
            <Text style={[s.h2, { marginTop: 6 }]}>School PCs</Text>
            <View style={s.ink}>
              {data.servers.map((server, index) => {
                const health = serverHealth(server, now);
                return (
                  <View key={server.server_id}>
                    {index ? <View style={s.inkDivider} /> : null}
                    <View style={s.inkRow}>
                      <View style={s.inkIcon}><Icon name="videocam-outline" color={p.inkText} /></View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={s.inkTitle}>{server.server_name}</Text>
                        <Text style={[s.inkSub, { color: healthColor[health] }]}>● {healthWord[health]} · {timeAgo(server.last_seen, now)}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 2 }}>
                        <Text style={s.inkValue}>{server.cameras_online === null ? server.cameras_total : `${server.cameras_online}/${server.cameras_total}`}</Text>
                        <Text style={s.inkSub}>cameras</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        ) : null}
        <View style={{ height: 96 }} />
      </View>
    </ScrollView>
  );
}

// ---------------------------------------------------------------- alerts
function Alerts({ incidents, now, refreshing, onRefresh }: { incidents: Incident[]; now: number; refreshing: boolean; onRefresh: () => void }) {
  const p = useTheme();
  const s = useStyles();
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'new' | 'reviewed'>('all');
  const needing = incidents.filter((i) => i.status === 'NEW').length;
  const [query, setQuery] = useState('');
  const shown = incidents.filter((i) => (filter === 'all' || (filter === 'new') === (i.status === 'NEW')) && i.camera_name.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <FlatList
      data={shown}
      keyExtractor={(item) => `${item.server_id}:${item.incident_id}`}
      contentContainerStyle={s.pad}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={p.lens} />}
      ListHeaderComponent={
        <View style={{ gap: 14 }}>
          <Text style={[s.h1, { marginTop: 10 }]}>Alerts</Text>
          <View style={s.summary}>
            <CountUp value={needing} style={s.summaryNumber} duration={700} />
            <Text style={s.summaryText}>{needing === 0 ? 'Nothing needs attention right now.' : needing === 1 ? 'alert needs attention' : 'alerts need attention'}</Text>
          </View>
          <TextInput style={s.input} value={query} onChangeText={setQuery} placeholder="Search by camera" placeholderTextColor={p.muted} autoCorrect={false} />
          <View style={s.segRow}>
            {(['all', 'new', 'reviewed'] as const).map((name) => (
              <Press key={name} style={[s.seg, filter === name && s.segOn]} onPress={() => setFilter(name)}>
                <Text style={[s.segText, filter === name && s.segTextOn]}>{name === 'all' ? 'All' : name === 'new' ? 'New' : 'Reviewed'}</Text>
              </Press>
            ))}
          </View>
        </View>
      }
      ListEmptyComponent={
        <Frost style={[s.card, { alignItems: 'center', paddingVertical: 34 }]}>
          <Icon name="shield-checkmark-outline" size={38} color={p.good} />
          <Text style={[s.h2, { marginTop: 8 }]}>{incidents.length ? 'Nothing here' : 'All clear'}</Text>
          <Text style={[s.muted, { textAlign: 'center' }]}>{incidents.length ? 'No alerts match this filter.' : 'When a fight is detected it will appear here and on your phone.'}</Text>
        </Frost>
      }
      ListFooterComponent={<View style={{ height: 96 }} />}
      renderItem={({ item, index }) => {
        const key = `${item.server_id}:${item.incident_id}`;
        const color = p.severity[item.severity] ?? p.muted;
        const open = openId === key;
        return (
          <Reveal index={index}><Press onPress={() => setOpenId(open ? null : key)}><Frost style={s.alertCard} blur={false}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={[s.alertIcon, { backgroundColor: color + '26' }]}><Icon name="warning-outline" color={color} /></View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={s.title}>{item.camera_name}</Text>
                <Text style={s.muted}>{item.event} · {Math.round(item.confidence * 100)}% sure</Text>
                <Text style={[s.muted, { fontSize: 12.5 }]}>{timeAgo(item.happened_at, now)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <Text style={[s.chip, { color, backgroundColor: color + '26' }]}>{(LEVEL[item.severity] ?? item.severity).toUpperCase()}</Text>
                {item.status === 'NEW' ? <Text style={[s.chip, { color: p.onAccent, backgroundColor: p.accent }]}>NEW</Text> : null}
              </View>
            </View>
            {open ? (
              <View style={s.detail}>
                <Text style={s.muted}>{new Date(item.happened_at).toLocaleString()}</Text>
                <Text style={s.muted}>Status: {item.status}</Text>
                <Text style={s.muted}>{item.has_footage ? 'A video clip was saved on the school PC.' : 'No clip was saved for this alert.'}</Text>
              </View>
            ) : null}
          </Frost></Press></Reveal>
        );
      }}
    />
  );
}

// ---------------------------------------------------------------- account
function SettingRow({ icon, title, value, onPress, tint, last }: { icon: IconName; title: string; value?: string; onPress?: () => void; tint?: string; last?: boolean }) {
  const p = useTheme();
  const s = useStyles();
  const body = (
    <>
      <View style={s.setRow}>
        <View style={s.setIcon}><Icon name={icon} size={20} color={tint ?? p.text} /></View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.title}>{title}</Text>
          {value ? <Text style={[s.muted, tint ? { color: tint } : null]}>{value}</Text> : null}
        </View>
        {onPress ? <Icon name="chevron-forward" size={18} color={p.muted} /> : null}
      </View>
      {last ? null : <View style={s.setDivider} />}
    </>
  );
  return onPress ? <Press onPress={onPress}>{body}</Press> : <View>{body}</View>;
}

function Account({ email, name, alertState, version, update, updateNote, onCheckUpdate, onInstall, progress, choice, onChoice, onSignOut }: {
  email: string; name: string; alertState: AlertSetup; version: string; update: UpdateInfo | null; updateNote: string;
  onCheckUpdate: () => void; onInstall: () => void; progress: number | null;
  choice: ThemeChoice; onChoice: (c: ThemeChoice) => void; onSignOut: () => void;
}) {
  const p = useTheme();
  const s = useStyles();
  return (
    <ScrollView contentContainerStyle={s.pad}>
      <Text style={[s.h1, { marginTop: 10 }]}>Account</Text>
      <View style={[s.ink, { padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }]}>
        <View style={[s.avatar, { backgroundColor: p.inkText, width: 56, height: 56, borderRadius: 28 }]}>
          <Text style={[s.avatarText, { color: p.ink, fontSize: 22 }]}>{name ? name[0] : '·'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.inkTitle}>{name || 'Your account'}</Text>
          <Text style={s.inkSub} numberOfLines={1}>{email}</Text>
        </View>
      </View>

      <Frost style={s.card}>
        <SettingRow icon={alertState.allowed ? 'notifications-outline' : 'notifications-off-outline'} title="Alert notifications" value={alertState.message}
          tint={alertState.allowed ? p.good : p.warn} />
        <View style={{ paddingVertical: 14, gap: 10 }}>
          <Text style={s.title}>Appearance</Text>
          <View style={s.segRow}>
            {(['auto', 'light', 'dark'] as ThemeChoice[]).map((c) => (
              <Press key={c} style={[s.seg, choice === c && s.segOn]} onPress={() => onChoice(c)}>
                <Text style={[s.segText, choice === c && s.segTextOn]}>{c === 'auto' ? 'Auto' : c === 'light' ? 'Light' : 'Dark'}</Text>
              </Press>
            ))}
          </View>
        </View>
        <View style={s.setDivider} />
        <SettingRow icon="phone-portrait-outline" title={`CampusGuard ${version}`}
          value={progress !== null ? `Downloading… ${Math.round(progress * 100)}%` : update ? `Version ${update.version} is ready to install` : updateNote || 'Tap to check for updates'}
          onPress={update ? onInstall : onCheckUpdate} tint={update ? p.good : undefined} />
        <SettingRow icon="chatbubble-ellipses-outline" title="Help and support" value="Chat with us on WhatsApp" onPress={() => Linking.openURL(SUPPORT_URL)} last />
      </Frost>

      <Press style={[s.button, s.buttonGhost]} onPress={onSignOut}>
        <Icon name="log-out-outline" size={20} color={p.bad} />
        <Text style={[s.buttonText, { color: p.bad }]}>Sign out</Text>
      </Press>
    </ScrollView>
  );
}
