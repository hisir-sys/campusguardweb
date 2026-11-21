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
import { REFRESH_SECONDS } from './src/config';
import { enablePush } from './src/push';
import { secureStorage } from './src/storage';
import { serverHealth, totals } from './src/status';
import { makeStyles } from './src/styles';
import { DARK, LIGHT, severityLabel, timeAgo } from './src/theme';
import { ThemeContext, useTheme } from './src/useTheme';
import type { Incident, SyncData } from './src/types';

type Tab = 'overview' | 'alerts' | 'account';
type ThemeChoice = 'auto' | 'dark' | 'light';
const THEME_KEY = 'campusguard.theme';

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
        {!(fontsReady || fontError) || !ready ? <Center><ActivityIndicator color={palette.lens} /></Center>
          : session ? <Home email={session.user.email ?? ''} choice={choice} onChoice={pick} /> : <Login />}
      </SafeAreaView>
    </ThemeContext.Provider>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  const s = useStyles();
  return <View style={s.center}>{children}</View>;
}

// ---------------------------------------------------------------- sign in
function Login() {
  const p = useTheme();
  const s = useStyles();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!email.trim() || !password) { setError('Enter your email and password.'); return; }
    setBusy(true); setError('');
    const { error: failure } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (failure) setError(failure.message === 'Invalid login credentials' ? 'Wrong email or password.' : failure.message);
    setBusy(false);
  };

  return (
    <KeyboardAvoidingView style={s.center} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.loginBox}>
        <Text style={s.brand}>CampusGuard</Text>
        <Text style={s.tagline}>Sign in with your school account to see your cameras and alerts.</Text>
        <TextInput style={s.input} placeholder="Email" placeholderTextColor={p.muted} autoCapitalize="none"
          autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <TextInput style={s.input} placeholder="Password" placeholderTextColor={p.muted} secureTextEntry
          autoComplete="password" value={password} onChangeText={setPassword} onSubmitEditing={submit} />
        {error ? <Text style={s.error}>{error}</Text> : null}
        <Pressable style={[s.button, busy && s.disabled]} onPress={submit} disabled={busy}>
          {busy ? <ActivityIndicator color={p.onAccent} /> : <Text style={s.buttonText}>Sign in</Text>}
        </Pressable>
      </View>
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
  const [pushState, setPushState] = useState<{ on: boolean; problem: string | null; token: string | null }>({ on: false, problem: null, token: null });
  const loading = useRef(false);

  const load = useCallback(async () => {
    if (loading.current) return;
    loading.current = true;
    try {
      setData(await fetchSyncData());
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

  useEffect(() => {
    enablePush().then((result) => setPushState({ on: !!result.token, problem: result.problem, token: result.token }));
    // A new alert arriving while the app is open, or a tap on one, refreshes the list at once.
    const received = Notifications.addNotificationReceivedListener(() => load());
    const tapped = Notifications.addNotificationResponseReceivedListener(() => { setTab('alerts'); load(); });
    return () => { received.remove(); tapped.remove(); };
  }, [load]);

  const signOut = async () => {
    if (pushState.token) await unregisterPushToken(pushState.token).catch(() => undefined);
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
      <View style={s.body}>
        {!data ? <Center><ActivityIndicator color={p.lens} /></Center>
          : tab === 'overview' ? <Overview data={data} now={now} refreshing={refreshing} onRefresh={onRefresh} />
          : tab === 'alerts' ? <Alerts incidents={data.incidents} now={now} refreshing={refreshing} onRefresh={onRefresh} />
          : <Account email={email} push={pushState} choice={choice} onChoice={onChoice} onSignOut={signOut} />}
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
  return (
    <FlatList
      data={incidents}
      keyExtractor={(item) => `${item.server_id}:${item.incident_id}`}
      contentContainerStyle={s.pad}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={p.lens} />}
      ListEmptyComponent={<Text style={s.muted}>No alerts yet. When a fight is detected it appears here.</Text>}
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

function Account({ email, push, choice, onChoice, onSignOut }: {
  email: string; push: { on: boolean; problem: string | null };
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
        <Text style={[s.dim, { color: push.on ? p.good : p.warn }]}>{push.on ? 'On: you will be notified of new alerts.' : push.problem ?? 'Turning on…'}</Text>
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
        <Text style={[s.buttonText, s.buttonGhostText]}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}
