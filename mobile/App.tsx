import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, RefreshControl, SafeAreaView,
  ScrollView, StatusBar as RNStatusBar, Text, TextInput, View, useColorScheme,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { Outfit_500Medium, Outfit_600SemiBold } from '@expo-google-fonts/outfit';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono';
import type { Session } from '@supabase/supabase-js';
import { ApiError, fetchSyncData, supabase, unregisterPushToken } from './src/api';
import { API_BASE, REFRESH_SECONDS } from './src/config';
import Constants from 'expo-constants';
import { AppState } from 'react-native';
import { freshIncidents, notificationFor, worstOf } from './src/alerts';
import { FightAlert } from './src/FightAlert';
import { downloadAndInstall } from './src/install';
import { LogoMark, LogoReveal } from './src/Logo';
import { checkForUpdate, type UpdateInfo } from './src/update';
import { demoData } from './src/demo';
import { setupAlerts, showLocalAlert, type AlertSetup } from './src/push';
import { secureStorage } from './src/storage';
import { serverHealth, totals } from './src/status';
import { makeStyles } from './src/styles';
import { DARK, LIGHT, severityLabel, timeAgo } from './src/theme';
import { ThemeContext, useTheme } from './src/useTheme';
import type { Incident, SyncData } from './src/types';

type Tab = 'overview' | 'alerts' | 'account';
type ThemeChoice = 'auto' | 'dark' | 'light';
const THEME_KEY = 'campusguard.theme';
const APP_VERSION: string = Constants.expoConfig?.version ?? '0.0.0';

function useStyles() {
  const p = useTheme();
  return useMemo(() => makeStyles(p), [p]);
}

export default function App() {
  const system = useColorScheme();
  const [choice, setChoice] = useState<ThemeChoice>('auto');
  const [fontsReady, fontError] = useFonts({
    Outfit_500Medium, Outfit_600SemiBold, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, JetBrainsMono_500Medium,
  });
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [demo, setDemo] = useState(false);
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
  const palette = choice === 'light' || (choice === 'auto' && system === 'light') ? LIGHT : DARK;
  const styles = useMemo(() => makeStyles(palette), [palette]);

  return (
    <ThemeContext.Provider value={palette}>
      <SafeAreaView style={[styles.root, Platform.OS === 'android' && { paddingTop: RNStatusBar.currentHeight ?? 24 }]}>
        <StatusBar style={palette.name === 'dark' ? 'light' : 'dark'} />
        <View pointerEvents="none" style={styles.blobA} />
        <View pointerEvents="none" style={styles.blobB} />
        {!(fontsReady || fontError) ? <Center><ActivityIndicator color={palette.lens} /></Center>
          : !revealDone || !ready ? <LogoReveal onDone={finishReveal} />
          : demo ? <Home email="Demo mode (made-up data)" demo choice={choice} onChoice={pick} onExitDemo={() => setDemo(false)} />
          : session ? <Home email={session.user.email ?? ''} choice={choice} onChoice={pick} /> : <Login onDemo={() => setDemo(true)} />}
      </SafeAreaView>
    </ThemeContext.Provider>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  const s = useStyles();
  return <View style={s.center}>{children}</View>;
}

// ---------------------------------------------------------------- sign in
const ASIDE_FACTS = [
  'Works with the cameras you already have',
  'Alerts reach staff on WhatsApp and this app',
  'Video stays on the school PC or server',
];

function Login({ onDemo }: { onDemo: () => void }) {
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
        <Text style={s.tagline}>CampusGuard watches your existing CCTV and tells the right person, quickly.</Text>
        <View style={{ gap: 10, marginBottom: 22 }}>
          {ASIDE_FACTS.map((fact) => (
            <View key={fact} style={s.factRow}><View style={s.factDot} /><Text style={s.dim}>{fact}</Text></View>
          ))}
        </View>

        <View style={s.card}>
          <Text style={s.label}>CUSTOMER ACCOUNT</Text>
          <Text style={s.loginTitle}>{reset ? 'Reset password' : 'Sign in'}</Text>
          <Text style={[s.muted, { marginBottom: 8 }]}>
            {reset ? "Enter your account email and we'll send a secure reset link if the account exists."
              : 'Sign in with the email and password you used when requesting early access.'}
          </Text>
          {message ? <Text style={[s.dim, { color: message.good ? p.good : p.bad, marginBottom: 4 }]}>{message.text}</Text> : null}
          <Text style={s.fieldLabel}>Email address</Text>
          <TextInput style={s.input} placeholder="you@institution.org" placeholderTextColor={p.muted} autoCapitalize="none"
            autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} />
          {!reset ? (
            <>
              <Text style={s.fieldLabel}>Password</Text>
              <View style={s.passwordRow}>
                <TextInput style={[s.input, { flex: 1 }]} placeholder="Enter your password" placeholderTextColor={p.muted} secureTextEntry={!shown}
                  autoComplete="password" value={password} onChangeText={setPassword} onSubmitEditing={submit} />
                <Pressable style={[s.seg, { flex: 0, paddingHorizontal: 12, minWidth: 64 }]} onPress={() => setShown(!shown)}>
                  <Text style={s.segText}>{shown ? 'Hide' : 'Show'}</Text>
                </Pressable>
              </View>
            </>
          ) : null}
          <Pressable style={[s.button, { marginTop: 14 }, busy && s.disabled]} onPress={submit} disabled={busy}>
            {busy ? <ActivityIndicator color={p.onAccent} /> : <Text style={s.buttonText}>{reset ? 'Send reset link' : 'Log in'}</Text>}
          </Pressable>
          <Pressable onPress={() => { setReset(!reset); setMessage(null); }} style={{ paddingVertical: 12, alignItems: 'center' }}>
            <Text style={[s.dim, { color: p.text }]}>{reset ? 'Back to log in' : 'Forgot password?'}</Text>
          </Pressable>
          <Text style={s.muted}>Your email and password are used only to sign you in and check your approval.</Text>
        </View>

        <Pressable style={[s.button, s.buttonGhost, { marginTop: 14 }]} onPress={onDemo}>
          <Text style={[s.buttonText, s.buttonGhostText]}>Try with demo data</Text>
        </Pressable>
        <Text style={[s.muted, { textAlign: 'center', marginTop: 16 }]}>Version {APP_VERSION}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ---------------------------------------------------------------- signed in
function Home({ email, choice, onChoice, demo = false, onExitDemo }: {
  email: string; choice: ThemeChoice; onChoice: (c: ThemeChoice) => void; demo?: boolean; onExitDemo?: () => void;
}) {
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
  const [alertCard, setAlertCard] = useState<Incident | null>(null);
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [updateNote, setUpdateNote] = useState('');
  const tokenRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    if (loading.current) return;
    loading.current = true;
    try {
      const next = demo ? demoData() : await fetchSyncData();
      setData(next);
      // New incidents seen while the app is open buzz the phone (the server push covers a closed app).
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
  }, [demo]);

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
    setupAlerts().then((result) => { tokenRef.current = demo ? null : result.token; setAlertState(result); });
    // A new alert arriving while the app is open, or a tap on one, refreshes the list at once.
    const received = Notifications.addNotificationReceivedListener(() => load());
    const tapped = Notifications.addNotificationResponseReceivedListener(() => { setTab('alerts'); load(); });
    return () => { received.remove(); tapped.remove(); };
  }, [load, demo]);

  const signOut = async () => {
    if (demo) { onExitDemo?.(); return; }
    if (alertState.token) await unregisterPushToken(alertState.token).catch(() => undefined);
    await supabase.auth.signOut();
  };
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
  const openAlerts = data?.incidents.filter((i) => i.status === 'NEW').length ?? 0;
  const titles: Record<Tab, string> = { overview: 'Overview', alerts: 'Alerts', account: 'Account' };

  return (
    <View style={s.root}>
      {error ? <Text style={s.banner}>{error}</Text> : null}
      <View style={s.header}>
        <Text style={s.heading}>{titles[tab]}</Text>
        <View style={s.liveRow}>
          <View style={[s.liveDot, error ? { backgroundColor: p.bad } : null]} />
          <Text style={s.liveText}>{error ? 'Offline' : updatedAt ? `Live · updated ${timeAgo(new Date(updatedAt).toISOString(), now)}` : 'Connecting…'}</Text>
        </View>
      </View>
      {update ? (
        <View style={[s.card, { marginHorizontal: 18, marginBottom: 10 }]}>
          <Text style={s.title}>Update available · v{update.version}</Text>
          <Text style={s.muted}>{progress !== null ? `Downloading… ${Math.round(progress * 100)}%` : updateNote || `${update.sizeMb} MB. Your sign-in and settings stay.`}</Text>
          <Pressable style={[s.button, { marginTop: 8 }, progress !== null && s.disabled]} onPress={install} disabled={progress !== null}>
            <Text style={s.buttonText}>Update now</Text>
          </Pressable>
        </View>
      ) : null}
      <View style={s.body}>
        {!data ? <Center><ActivityIndicator color={p.lens} /></Center>
          : tab === 'overview' ? <Overview data={data} now={now} refreshing={refreshing} onRefresh={onRefresh} />
          : tab === 'alerts' ? <Alerts incidents={data.incidents} now={now} refreshing={refreshing} onRefresh={onRefresh} />
          : <Account email={email} alertState={alertState} demo={demo} version={APP_VERSION} updateNote={update ? '' : updateNote} onCheckUpdate={() => lookForUpdate(true)}
            onPreview={() => setAlertCard(demoPreview())} choice={choice} onChoice={onChoice} onSignOut={signOut} />}
      </View>
      <View style={[s.tabs, Platform.OS === 'android' && { paddingBottom: 12 }]}>
        {(['overview', 'alerts', 'account'] as Tab[]).map((name) => (
          <Pressable key={name} style={s.tab} onPress={() => setTab(name)}>
            <View style={s.rowBetween}>
              <Text style={[s.tabText, tab === name && s.tabActive]}>{titles[name]}</Text>
              {name === 'alerts' && openAlerts ? <Text style={s.badge}>{openAlerts}</Text> : null}
            </View>
            <View style={[s.tabDot, tab === name && s.tabDotOn]} />
          </Pressable>
        ))}
      </View>
      {alertCard ? (
        <FightAlert incident={alertCard} onReview={() => { setTab('alerts'); setAlertCard(null); }} onDismiss={() => setAlertCard(null)} />
      ) : null}
    </View>
  );
}

function Overview({ data, now, refreshing, onRefresh }: { data: SyncData; now: number; refreshing: boolean; onRefresh: () => void }) {
  const p = useTheme();
  const s = useStyles();
  const sum = useMemo(() => totals(data.servers, now), [data.servers, now]);
  const healthColor = { online: p.good, degraded: p.warn, offline: p.bad } as const;
  const healthWord = { online: 'All cameras working', degraded: 'Some cameras offline', offline: 'Not reporting' } as const;
  const aiOn = data.servers.reduce((n, server) => n + server.cameras_ai_enabled, 0);
  return (
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={p.lens} />} contentContainerStyle={s.pad}>
      <View style={s.hero}>
        <Text style={s.label}>CAMERAS ONLINE</Text>
        <Text style={[s.heroNumber, sum.onlineKnown && sum.online < sum.cameras ? { color: p.warn } : null]}>
          {sum.onlineKnown ? sum.online : '—'}
        </Text>
        <Text style={s.dim}>of {sum.cameras} cameras{sum.offlineServers ? ` · ${sum.offlineServers} school PC not reporting` : ''}</Text>
      </View>
      <View style={s.statRow}>
        <Stat label="Open alerts" value={String(sum.open)} color={sum.open ? p.bad : p.good} />
        <Stat label="AI watching" value={String(aiOn)} />
        <Stat label="School PCs" value={String(data.servers.length)} />
      </View>
      <Text style={s.section}>School PCs</Text>
      {data.servers.length === 0 ? <Text style={s.muted}>No school PC has connected yet. Turn on cloud sync in the CampusGuard app.</Text> : null}
      {data.servers.map((server) => {
        const health = serverHealth(server, now);
        return (
          <View key={server.server_id} style={s.card}>
            <View style={s.rowBetween}>
              <Text style={s.title}>{server.server_name}</Text>
              <Text style={[s.chip, { color: healthColor[health], backgroundColor: p.field }]}>● {healthWord[health]}</Text>
            </View>
            <Text style={s.dim}>
              {server.cameras_online === null ? `${server.cameras_total} cameras` : `${server.cameras_online} of ${server.cameras_total} cameras online`}
              {` · AI on for ${server.cameras_ai_enabled}`}
            </Text>
            <Text style={s.muted}>Last report {timeAgo(server.last_seen, now)}{server.open_incidents ? ` · ${server.open_incidents} open` : ''}</Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  const p = useTheme();
  const s = useStyles();
  return (
    <View style={s.stat}>
      <Text style={[s.statValue, { color: color ?? p.text }]}>{value}</Text>
      <Text style={s.muted}>{label}</Text>
    </View>
  );
}

function Alerts({ incidents, now, refreshing, onRefresh }: { incidents: Incident[]; now: number; refreshing: boolean; onRefresh: () => void }) {
  const p = useTheme();
  const s = useStyles();
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'new' | 'reviewed'>('all');
  const shown = incidents.filter((i) => filter === 'all' || (filter === 'new') === (i.status === 'NEW'));
  return (
    <FlatList
      data={shown}
      ListHeaderComponent={
        <View style={s.segRow}>
          {(['all', 'new', 'reviewed'] as const).map((name) => (
            <Pressable key={name} style={[s.seg, filter === name && s.segOn]} onPress={() => setFilter(name)}>
              <Text style={[s.segText, filter === name && s.segTextOn]}>{name === 'all' ? 'All' : name === 'new' ? 'New' : 'Reviewed'}</Text>
            </Pressable>
          ))}
        </View>
      }
      keyExtractor={(item) => `${item.server_id}:${item.incident_id}`}
      contentContainerStyle={s.pad}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={p.lens} />}
      ListEmptyComponent={<Text style={s.muted}>{incidents.length ? 'Nothing in this filter.' : 'No alerts yet. When a fight is detected it appears here.'}</Text>}
      renderItem={({ item }) => {
        const key = `${item.server_id}:${item.incident_id}`;
        const color = p.severity[item.severity] ?? p.muted;
        return (
          <Pressable style={s.card} onPress={() => setOpenId(openId === key ? null : key)}>
            <View style={s.rowBetween}>
              <Text style={s.title}>{item.camera_name}</Text>
              <Text style={[s.chip, { color, backgroundColor: color + '24' }]}>{severityLabel[item.severity] ?? item.severity}</Text>
            </View>
            <Text style={s.dim}>{item.event} · {Math.round(item.confidence * 100)}% sure</Text>
            <Text style={s.muted}>{timeAgo(item.happened_at, now)}{item.status === 'NEW' ? ' · new' : ''}</Text>
            {openId === key ? (
              <View style={s.detail}>
                <Text style={s.muted}>{new Date(item.happened_at).toLocaleString()}</Text>
                <Text style={s.muted}>Status: {item.status}</Text>
                <Text style={s.muted}>{item.has_footage ? 'A video clip was saved on the school PC. Viewing clips in the app is coming.' : 'No clip was saved for this alert.'}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      }}
    />
  );
}

const demoPreview = (): Incident => ({ server_id: 'preview', incident_id: 'preview', camera_name: 'Corridor 2F', happened_at: new Date().toISOString(),
  event: 'Fight', confidence: 0.91, severity: 'HIGH', status: 'NEW', has_footage: true });

function Account({ email, alertState, demo, version, updateNote, onCheckUpdate, onPreview, choice, onChoice, onSignOut }: {
  email: string; alertState: AlertSetup; demo: boolean; version: string; updateNote: string; onCheckUpdate: () => void; onPreview: () => void;
  choice: ThemeChoice; onChoice: (c: ThemeChoice) => void; onSignOut: () => void;
}) {
  const p = useTheme();
  const s = useStyles();
  return (
    <ScrollView contentContainerStyle={s.pad}>
      <View style={s.card}>
        <Text style={s.label}>SIGNED IN AS</Text>
        <Text style={s.title}>{email}</Text>
      </View>
      <View style={s.card}>
        <Text style={s.label}>ALERT NOTIFICATIONS</Text>
        <Text style={[s.dim, { color: alertState.allowed ? p.good : p.warn }]}>{alertState.message}</Text>
        <Pressable style={[s.button, s.buttonGhost, { marginTop: 8 }]} onPress={onPreview}>
          <Text style={[s.buttonText, s.buttonGhostText]}>Preview the alert card</Text>
        </Pressable>
        <Pressable style={[s.button, s.buttonGhost, { marginTop: 8 }]} onPress={() => showLocalAlert('Fight detected', 'Critical alert · Corridor 2F · 91% sure (test)', 5, 'test')}>
          <Text style={[s.buttonText, s.buttonGhostText]}>Send a test notification (5 s)</Text>
        </Pressable>
        <Text style={s.muted}>Tap it, then press Home to see it arrive while the app is in the background.</Text>
      </View>
      <View style={s.card}>
        <Text style={s.label}>APP VERSION</Text>
        <Text style={s.title}>CampusGuard {version}</Text>
        {updateNote ? <Text style={s.muted}>{updateNote}</Text> : null}
        <Pressable style={[s.button, s.buttonGhost, { marginTop: 8 }]} onPress={onCheckUpdate}>
          <Text style={[s.buttonText, s.buttonGhostText]}>Check for updates</Text>
        </Pressable>
      </View>
      <View style={s.card}>
        <Text style={s.label}>APPEARANCE</Text>
        <View style={s.segRow}>
          {(['auto', 'dark', 'light'] as ThemeChoice[]).map((name) => (
            <Pressable key={name} style={[s.seg, choice === name && s.segOn]} onPress={() => onChoice(name)}>
              <Text style={[s.segText, choice === name && s.segTextOn]}>{name === 'auto' ? 'Auto' : name === 'dark' ? 'Dark' : 'Light'}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <Pressable style={[s.button, s.buttonGhost]} onPress={onSignOut}>
        <Text style={[s.buttonText, s.buttonGhostText]}>{demo ? 'Leave demo' : 'Sign out'}</Text>
      </Pressable>
    </ScrollView>
  );
}
