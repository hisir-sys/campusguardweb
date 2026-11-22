import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import {
  ActivityIndicator, Animated, AppState, Easing, StyleSheet, FlatList, KeyboardAvoidingView, LayoutAnimation, Linking, Modal, PanResponder, Platform, Pressable as RNPressable, RefreshControl, SafeAreaView,
  ScrollView, StatusBar as RNStatusBar, Text, TextInput, View, useColorScheme,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { BlurTargetView } from 'expo-blur';
import { Backdrop, BlurTargetContext, CountUp, Frost, GrowBar, Press, PulseDot, Reveal, Skeleton, Toast, Toggle, tap } from './src/ui';
import { Outfit_500Medium, Outfit_600SemiBold } from '@expo-google-fonts/outfit';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono';
import type { Session } from '@supabase/supabase-js';
import { ApiError, fetchProfile, fetchSyncData, saveProfile, supabase, unregisterPushToken } from './src/api';
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
import type { Incident, Profile, SyncData } from './src/types';

type Tab = 'overview' | 'alerts' | 'account';
type ThemeChoice = 'auto' | 'dark' | 'light';
type IconName = React.ComponentProps<typeof Ionicons>['name'];
const THEME_KEY = 'campusguard.theme';
const NOTIFY_KEY = 'campusguard.notify';
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
    Outfit_500Medium, Outfit_600SemiBold, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, JetBrainsMono_500Medium,
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
  return (
    <ThemeContext.Provider value={palette}>
      <SafeAreaView style={[styles.root, Platform.OS === 'android' && { paddingTop: RNStatusBar.currentHeight ?? 24 }]}>
        <StatusBar style={palette.name === 'dark' ? 'light' : 'dark'} />
        {!session ? <Backdrop /> : null}
        {!(fontsReady || fontError) ? <View style={styles.center}><ActivityIndicator color={palette.lens} /></View>
          : !revealDone || !ready ? <LogoReveal onDone={finishReveal} />
          : session ? <Home email={session.user.email ?? ''} choice={choice} onChoice={pick} /> : <Login />}
      </SafeAreaView>
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
  const homeTarget = useRef<ComponentRef<typeof View>>(null);
  const [targetReady, setTargetReady] = useState(false);
  useEffect(() => { setTargetReady(true); }, []);
  const [toast, setToast] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);
  useEffect(() => { fetchProfile().then(setProfile).catch(() => undefined); }, []);
  const [scrolled, setScrolled] = useState(false);
  const [notifyOn, setNotifyOn] = useState(true);
  const showToast = useCallback((message: string) => { setToast(message); setTimeout(() => setToast(''), 2300); }, []);
  const topbar = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(topbar, { toValue: scrolled ? 1 : 0, duration: 300, useNativeDriver: true }).start(); }, [scrolled, topbar]);
  const onScroll = useCallback((e: { nativeEvent: { contentOffset: { y: number } } }) => setScrolled(e.nativeEvent.contentOffset.y > 70), []);
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
    secureStorage.getItem(NOTIFY_KEY).then((saved) => {
      if (saved === 'off') { setNotifyOn(false); setAlertState({ allowed: false, token: null, message: 'Off. You will not be notified of new alerts.' }); return; }
      setupAlerts().then((result) => { tokenRef.current = result.token; setAlertState(result); });
    });
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
  const onRefreshTap = async () => { await load(); showToast('Up to date'); };
  const onNotify = async (next: boolean) => {
    setNotifyOn(next);
    secureStorage.setItem(NOTIFY_KEY, next ? 'on' : 'off').catch(() => undefined);
    if (!next) {
      if (tokenRef.current) await unregisterPushToken(tokenRef.current).catch(() => undefined);
      tokenRef.current = null;
      setAlertState({ allowed: false, token: null, message: 'Off. You will not be notified of new alerts.' });
      showToast('Notifications off');
    } else {
      const result = await setupAlerts();
      tokenRef.current = result.token; setAlertState(result);
      showToast('Notifications on');
    }
  };
  const openAlerts = data?.incidents.filter((i) => i.status === 'NEW').length ?? 0;
  const name = profile?.full_name ? profile.full_name.split(' ')[0] : firstName(email);

  return (
    <View style={{ flex: 1 }}>
      <BlurTargetView ref={homeTarget} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <Backdrop />
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
            <Overview data={data} now={now} name={name} live={!error ? updatedAt : null} refreshing={refreshing} onRefresh={onRefresh} onRefreshTap={onRefreshTap} onScroll={onScroll}
              onAlerts={() => setTab('alerts')} update={update} progress={progress} updateNote={updateNote} onInstall={install} />
          ) : tab === 'alerts' ? <Alerts incidents={data.incidents} now={now} refreshing={refreshing} onRefresh={onRefresh} onScroll={onScroll} />
          : <Account email={email} name={name} alertState={alertState} version={APP_VERSION} update={update} updateNote={updateNote}
              onScroll={onScroll} notifyOn={notifyOn} onNotify={onNotify} onCheckUpdate={() => { lookForUpdate(true).then(() => showToast('CampusGuard is up to date')); }} onInstall={install} progress={progress} choice={choice} onChoice={onChoice} onSignOut={signOut} profile={profile} onProfile={(next) => { setProfile(next); showToast('Details saved'); }} />}
        </Reveal>
      </View>
      </BlurTargetView>

      <BlurTargetContext.Provider value={targetReady ? homeTarget : null}>
      <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 54, opacity: topbar }}>
        <Frost blur glow={false} intensity={70} tint={p.navGlass} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: p.line }}>
          <Text style={{ color: p.text, fontFamily: fonts.bodyBold, fontSize: 17 }}>{tab === 'overview' ? 'CampusGuard' : tab === 'alerts' ? 'Alerts' : 'Account'}</Text>
        </Frost>
      </Animated.View>

      <NavBar tab={tab} onTab={setTab} badge={openAlerts} />
      <Toast message={toast} />

      {alertCard ? (
        <FightAlert incident={alertCard} onReview={() => { setTab('alerts'); setAlertCard(null); }} onDismiss={() => setAlertCard(null)} />
      ) : null}
      </BlurTargetContext.Provider>
    </View>
  );
}


// ---------------------------------------------------------------- bottom navigation
const TABS: { key: Tab; label: string; on: IconName; off: IconName }[] = [
  { key: 'alerts', label: 'Alerts', on: 'notifications', off: 'notifications-outline' },
  { key: 'overview', label: 'Home', on: 'home', off: 'home-outline' },
  { key: 'account', label: 'Account', on: 'person', off: 'person-outline' },
];
const NAV_H = 72;
const NAV_PAD = 8;

/** Frosted bar with a glass "lens" around the open tab. It glides, stretches as it moves, and follows a finger dragged along the bar. */
function NavBar({ tab, onTab, badge }: { tab: Tab; onTab: (t: Tab) => void; badge: number }) {
  const p = useTheme();
  const s = useStyles();
  const [width, setWidth] = useState(0);
  const barRef = useRef<ComponentRef<typeof View>>(null);
  const barLeft = useRef(0);
  const index = TABS.findIndex((t) => t.key === tab);
  const slide = useRef(new Animated.Value(index)).current;
  const stretch = useRef(new Animated.Value(0)).current;
  const first = useRef(true);
  const slot = width ? (width - NAV_PAD * 2) / 3 : 0;
  useEffect(() => {
    Animated.spring(slide, { toValue: index, useNativeDriver: true, speed: 14, bounciness: 7 }).start();
    if (first.current) { first.current = false; return; }
    stretch.setValue(0);
    Animated.sequence([
      Animated.timing(stretch, { toValue: 1, duration: 120, useNativeDriver: true }),
      Animated.spring(stretch, { toValue: 0, useNativeDriver: true, speed: 12, bounciness: 10 }),
    ]).start();
  }, [index, slide, stretch]);

  // Dragging a finger along the bar moves the lens, like the iPhone tab bar.
  const live = useRef({ slot, index, onTab });
  live.current = { slot, index, onTab };
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderMove: (_e, g) => {
      const { slot: w, index: now, onTab: go } = live.current;
      if (!w) return;
      const next = Math.max(0, Math.min(2, Math.floor((g.moveX - barLeft.current - NAV_PAD) / w)));
      if (next !== now) { tap(); go(TABS[next].key); }
    },
  })).current;

  const dark = p.name === 'dark';
  const lensW = Math.max(0, slot - 4);
  return (
    <View ref={barRef} style={s.nav} {...pan.panHandlers}
      onLayout={(e) => { setWidth(e.nativeEvent.layout.width); barRef.current?.measureInWindow((x) => { barLeft.current = x; }); }}>
      <Frost blur style={[StyleSheet.absoluteFill, { borderRadius: NAV_H / 2, borderColor: p.glassEdge, borderWidth: 1 }]} intensity={60} tint={p.navGlass} />
      {slot ? (
        <Animated.View pointerEvents="none" style={{
          position: 'absolute', top: 6, left: NAV_PAD + 2, width: lensW, height: NAV_H - 12, borderRadius: (NAV_H - 12) / 2,
          backgroundColor: dark ? 'rgba(255,255,255,0.13)' : 'rgba(255,255,255,0.82)',
          borderWidth: 1.2, borderTopColor: dark ? 'rgba(255,255,255,0.5)' : '#FFFFFF', borderLeftColor: dark ? 'rgba(255,255,255,0.34)' : '#FFFFFF',
          borderRightColor: dark ? 'rgba(255,255,255,0.12)' : 'rgba(40,44,60,0.12)', borderBottomColor: dark ? 'rgba(0,0,0,0.45)' : 'rgba(40,44,60,0.2)',
          shadowColor: '#000', shadowOpacity: dark ? 0.5 : 0.16, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6, overflow: 'hidden',
          transform: [
            { translateX: slide.interpolate({ inputRange: [0, 1, 2], outputRange: [0, slot, slot * 2] }) },
            { scaleX: stretch.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] }) },
            { scaleY: stretch.interpolate({ inputRange: [0, 1], outputRange: [1, 0.94] }) },
          ],
        }}>
          <View style={{ position: 'absolute', top: 2, left: 22, right: 22, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.10)' }} />
          <View style={{ position: 'absolute', bottom: 2, left: 26, right: 26, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.05)' }} />
        </Animated.View>
      ) : null}
      {TABS.map((t) => {
        const active = t.key === tab;
        return (
          <Press key={t.key} style={s.navItem} onPress={() => onTab(t.key)} accessibilityLabel={t.label} scaleTo={0.9}>
            <View style={{ alignItems: 'center', gap: 3 }}>
              <Icon name={active ? t.on : t.off} size={24} color={active ? p.text : p.muted} />
              <Text style={{ color: active ? p.text : p.muted, fontFamily: active ? fonts.bodyBold : fonts.bodyMedium, fontSize: 11 }}>{t.label}</Text>
            </View>
            {t.key === 'alerts' && badge ? <View style={s.navBadge}><Text style={s.navBadgeText}>{badge > 9 ? '9+' : badge}</Text></View> : null}
          </Press>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------- small shared pieces
/** A sliding segmented control: the dark knob glides to the chosen option. */
function Seg<T extends string>({ options, value, onChange }: { options: { key: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  const p = useTheme();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.key === value));
  const x = useRef(new Animated.Value(index)).current;
  useEffect(() => { Animated.spring(x, { toValue: index, useNativeDriver: true, speed: 14, bounciness: 9 }).start(); }, [index, x]);
  const w = width ? (width - 8) / options.length : 0;
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ flexDirection: 'row', padding: 4, borderRadius: 999, backgroundColor: p.field, borderWidth: 1, borderColor: p.line }}>
      {w ? <Animated.View style={{ position: 'absolute', top: 4, left: 4, width: w, bottom: 4, borderRadius: 999, backgroundColor: p.text,
        transform: [{ translateX: x.interpolate({ inputRange: options.map((_, i) => i), outputRange: options.map((_, i) => i * w) }) }] }} /> : null}
      {options.map((o) => (
        <Press key={o.key} style={{ flex: 1, height: 44, alignItems: 'center', justifyContent: 'center' }} onPress={() => onChange(o.key)} scaleTo={0.96}>
          <Text style={{ color: o.key === value ? p.bg : p.muted, fontFamily: fonts.bodyBold, fontSize: 15 }}>{o.label}</Text>
        </Press>
      ))}
    </View>
  );
}

function IconTile({ name, color, size = 58, round }: { name: IconName; color: string; size?: number; round?: boolean }) {
  return (
    <View style={{ width: size, height: size, borderRadius: round ? size / 2 : size * 0.34, alignItems: 'center', justifyContent: 'center', backgroundColor: color + '24' }}>
      <Icon name={name} size={size * 0.48} color={color} />
    </View>
  );
}

// ---------------------------------------------------------------- overview
function BarChart({ values }: { values: number[] }) {
  const p = useTheme();
  const s = useStyles();
  const peak = Math.max(1, ...values);
  const [tip, setTip] = useState<number | null>(null);
  useEffect(() => { if (tip === null) return; const t = setTimeout(() => setTip(null), 1800); return () => clearTimeout(t); }, [tip]);
  return (
    <View style={s.chartPanel}>
      <View style={s.rowBetween}>
        <Text style={[s.label, { color: p.good, letterSpacing: 1.1 }]}>ALERTS · LAST 24 HOURS</Text>
        <Text style={[s.label, { color: p.good, letterSpacing: 1.1 }]}>{values.reduce((a, b) => a + b, 0)} TOTAL</Text>
      </View>
      <View style={s.chartRow}>
        {values.map((value, i) => (
          <Press key={i} haptic={false} scaleTo={0.9} onPress={() => setTip(i)} style={{ flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center' }}>
            {value === 0 ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: p.mintBar, opacity: 0.3 }} />
              : <GrowBar height={18 + (value / peak) * 66} delay={i * 25} style={{ width: 12, borderRadius: 7, backgroundColor: p.mintBar }} />}
            {tip === i ? (
              <View style={{ position: 'absolute', top: -6, backgroundColor: p.text, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4 }}>
                <Text style={{ color: p.bg, fontFamily: fonts.bodyBold, fontSize: 11.5 }}>{value} {value === 1 ? 'alert' : 'alerts'}</Text>
              </View>
            ) : null}
          </Press>
        ))}
      </View>
      <View style={s.chartAxis}>
        <Text style={s.chartLabel}>24h ago</Text><Text style={s.chartLabel}>12h</Text><Text style={s.chartLabel}>now</Text>
      </View>
    </View>
  );
}

function Overview({ data, now, name, live, refreshing, onRefresh, onRefreshTap, onScroll, onAlerts, update, progress, updateNote, onInstall }: {
  data: SyncData; now: number; name: string; live: number | null; refreshing: boolean; onRefresh: () => void; onRefreshTap: () => void; onScroll: (e: any) => void; onAlerts: () => void;
  update: UpdateInfo | null; progress: number | null; updateNote: string; onInstall: () => void;
}) {
  const p = useTheme();
  const s = useStyles();
  const [openPc, setOpenPc] = useState<string | null>(null);
  const spin = useRef(new Animated.Value(0)).current;
  const sum = useMemo(() => totals(data.servers, now), [data.servers, now]);
  const buckets = useMemo(() => alertsByBucket(data.incidents, now), [data.incidents, now]);
  const healthColor = { online: p.good, degraded: p.warn, offline: p.bad } as const;
  const healthWord = { online: 'All working', degraded: 'Some offline', offline: 'Not reporting' } as const;
  const guard = guardStatus({ servers: data.servers.length, cameras: sum.cameras, online: sum.onlineKnown ? sum.online : null, offlineServers: sum.offlineServers }, data.incidents, now);
  const guardColor = { unknown: p.muted, secure: p.good, watch: p.warn, alert: p.bad }[guard];
  const hot = useMemo(() => hotspots(data.incidents, now), [data.incidents, now]);
  const guardText = {
    unknown: ['Not protecting yet', 'Connect a school PC to start watching your cameras.'],
    secure: ['All clear', 'Every camera and school PC is reporting.'],
    watch: ['Needs a look', 'Some cameras or school PCs are not reporting.'],
    alert: ['Fight alert active', 'A serious alert in the last hour has not been reviewed.'],
  } as const;
  const allUp = sum.onlineKnown && sum.online >= sum.cameras && sum.offlineServers === 0 && sum.cameras > 0;

  return (
    <ScrollView onScroll={onScroll} scrollEventThrottle={32} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={p.lens} />} showsVerticalScrollIndicator={false}>
      <View style={s.topRow}>
        <View style={{ flexShrink: 1 }}>
          <Text style={s.h1}>{greeting(new Date(now).getHours())}{name ? `,\n${name}` : ''}</Text>
          <Frost style={s.livePill} blur={false}>
            <PulseDot color={live ? p.good : p.bad} />
            <Text style={s.liveText}>{live ? `Live · updated ${timeAgo(new Date(live).toISOString(), now)}` : 'Offline'}</Text>
          </Frost>
        </View>
        <View style={s.avatar}>{name ? <Text style={s.avatarText}>{name[0].toUpperCase()}</Text> : <LogoMark size={22} color={p.onAccent} />}</View>
      </View>

      <View style={s.pad}>
        {update ? (
          <Reveal index={0}><Frost style={[s.card, { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 }]}>
            <IconTile name="download-outline" color={p.text} size={46} round />
            <View style={{ flex: 1 }}>
              <Text style={s.title}>Update available</Text>
              <Text style={s.muted}>{progress !== null ? `Downloading… ${Math.round(progress * 100)}%` : updateNote || `v${update.version} · ${update.sizeMb} MB · keeps your sign-in`}</Text>
            </View>
            <Press onPress={onInstall} disabled={progress !== null} style={[{ backgroundColor: p.accent, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10 }, progress !== null && s.disabled]}>
              <Text style={{ color: p.onAccent, fontFamily: fonts.bodyBold, fontSize: 14 }}>Update</Text>
            </Press>
          </Frost></Reveal>
        ) : null}

        <Reveal index={1}>
          <Frost style={[s.card, { flexDirection: 'row', alignItems: 'center', gap: 16 }]}>
            <IconTile name={guard === 'alert' ? 'warning-outline' : guard === 'watch' ? 'eye-outline' : 'checkmark'} color={guardColor} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.title}>{guardText[guard][0]}</Text>
              <Text style={s.muted}>{guardText[guard][1]}</Text>
            </View>
          </Frost>
        </Reveal>

        {data.servers.length === 0 ? (
          <Frost style={s.card}>
            <Text style={s.label}>GET STARTED</Text>
            <Text style={[s.h2, { marginTop: 4 }]}>Connect your first school PC</Text>
            <Text style={[s.muted, { marginTop: 6 }]}>Open the CampusGuard desktop app, go to Settings and turn on cloud sync with this same account. Your cameras and alerts will appear here within a minute.</Text>
          </Frost>
        ) : (
          <Reveal index={2}>
            <Frost style={s.card}>
              <Text style={s.label}>CAMERAS ONLINE</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
                {sum.onlineKnown ? <CountUp value={sum.online} style={[s.heroNumber, { color: allUp ? p.good : p.warn }]} /> : <Text style={s.heroNumber}>—</Text>}
                <Text style={s.heroOf}>/ {sum.cameras}</Text>
              </View>
              <Text style={[s.dim, { marginBottom: 10 }]}>
                {allUp ? 'All school PCs reporting.' : sum.offlineServers ? `${sum.offlineServers} school PC${sum.offlineServers > 1 ? 's' : ''} not reporting.` : 'Some cameras are offline.'}
              </Text>
              <BarChart values={buckets} />
            </Frost>
          </Reveal>
        )}

        <View style={s.pillRow}>
          <Press style={{ flex: 1 }} scaleTo={0.95} onPress={onAlerts}>
            <Frost style={s.pillAction} blur={false}>
              <Icon name="notifications-outline" size={22} color={p.text} />
              <Text style={s.pillLabel}>{sum.open ? `${sum.open} open` : 'Alerts'}</Text>
            </Frost>
          </Press>
          <Press style={{ flex: 1 }} scaleTo={0.95} onPress={() => { spin.setValue(0); Animated.timing(spin, { toValue: 1, duration: 900, easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: true }).start(); onRefreshTap(); }}>
            <Frost style={s.pillAction} blur={false}>
              <Animated.View style={{ transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}><Icon name="refresh" size={22} color={p.text} /></Animated.View>
              <Text style={s.pillLabel}>Refresh</Text>
            </Frost>
          </Press>
        </View>

        {hot.length ? (
          <Reveal index={3}>
            <Frost style={[s.card, { gap: 4 }]}>
              <Text style={s.label}>HOTSPOT CAMERAS · LAST 24 HOURS</Text>
              {hot.map((h) => {
                const color = p.severity[h.worst] ?? p.muted;
                return (
                  <View key={h.camera} style={{ marginTop: 14 }}>
                    <View style={s.rowBetween}>
                      <Text style={s.title} numberOfLines={1}>{hot.indexOf(h) + 1}. {h.camera}</Text>
                      <Text style={[s.chip, { color: p.warn, backgroundColor: p.warn + '26' }]}>{h.count} {h.count === 1 ? 'ALERT' : 'ALERTS'}</Text>
                    </View>
                    <View style={{ height: 6, borderRadius: 3, backgroundColor: p.line, marginTop: 10, overflow: 'hidden' }}>
                      <GrowBar height={6} style={{ width: `${Math.max(12, (h.count / hot[0].count) * 100)}%`, borderRadius: 3, backgroundColor: color }} />
                    </View>
                  </View>
                );
              })}
            </Frost>
          </Reveal>
        ) : null}

        {data.servers.length ? (
          <>
            <Text style={s.section}>School PCs</Text>
            {data.servers.map((server) => {
              const health = serverHealth(server, now);
              const open = openPc === server.server_id;
              return (
                <Press key={server.server_id} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.create(450, 'easeInEaseOut', 'opacity')); setOpenPc(open ? null : server.server_id); }}>
                  <Frost style={[s.card, { padding: 0, marginBottom: 0 }]} blur={false}>
                    <View style={[s.inkRow, { padding: 16 }]}>
                      <IconTile name="videocam-outline" color={p.muted} size={50} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={s.title}>{server.server_name}</Text>
                        <Text style={[s.muted, { color: healthColor[health] }]}>● {health === 'online' ? 'Reporting' : `${healthWord[health]} · ${timeAgo(server.last_seen, now)}`}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={s.title}>{server.cameras_online === null ? server.cameras_total : `${server.cameras_online}/${server.cameras_total}`}</Text>
                        <Text style={[s.muted, { fontSize: 13 }]}>cameras</Text>
                      </View>
                    </View>
                    {open ? (
                      <View style={{ paddingHorizontal: 18, paddingBottom: 8 }}>
                        {[['AI watching', `${server.cameras_ai_enabled} cameras`], ['Last seen', timeAgo(server.last_seen, now)], ['Open alerts', String(server.open_incidents)], ['App version', server.app_version ?? '—']].map(([k, v]) => (
                          <View key={k} style={[s.rowBetween, { paddingVertical: 12, borderTopWidth: 1, borderTopColor: p.line }]}>
                            <Text style={s.muted}>{k}</Text><Text style={s.dim}>{v}</Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </Frost>
                </Press>
              );
            })}
          </>
        ) : null}
        <View style={{ height: 96 }} />
      </View>
    </ScrollView>
  );
}

// ---------------------------------------------------------------- alerts
const headline = (i: Incident) => (i.severity === 'MEDIUM' ? 'POSSIBLE FIGHT' : 'FIGHT DETECTED');

function AlertSheet({ incident, now, onClose }: { incident: Incident; now: number; onClose: () => void }) {
  const p = useTheme();
  const s = useStyles();
  const rise = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.spring(rise, { toValue: 1, useNativeDriver: true, speed: 13, bounciness: 8 }).start(); }, [rise]);
  const color = p.severity[incident.severity] ?? p.muted;
  const close = () => Animated.timing(rise, { toValue: 0, duration: 200, useNativeDriver: true }).start(onClose);
  return (
    <Modal transparent animationType="none" onRequestClose={close} statusBarTranslucent>
      <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', opacity: rise }}>
        <RNPressable style={{ flex: 1 }} onPress={close} />
      </Animated.View>
      <Animated.View style={{ position: 'absolute', left: 10, right: 10, bottom: 10, transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [420, 0] }) }] }}>
        <Frost style={[s.card, { borderRadius: 38, padding: 22, paddingTop: 14 }]} blur={false} tint={p.name === 'dark' ? 'rgba(28,28,33,0.96)' : 'rgba(250,251,254,0.97)'}>
          <View style={{ width: 42, height: 5, borderRadius: 3, backgroundColor: p.line, alignSelf: 'center', marginBottom: 16 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <IconTile name="warning-outline" color={color} size={54} />
            <View style={{ flex: 1 }}>
              <Text style={[s.title, { fontSize: 19 }]}>{incident.camera_name}</Text>
              <Text style={s.muted}>{headline(incident)} · {timeAgo(incident.happened_at, now)}</Text>
            </View>
            <Text style={[s.chip, { color, backgroundColor: color + '26' }]}>{(LEVEL[incident.severity] ?? incident.severity).toUpperCase()}</Text>
          </View>
          <View style={{ marginTop: 12 }}>
            {[['Confidence', `${Math.round(incident.confidence * 100)}% sure`], ['When', new Date(incident.happened_at).toLocaleString()], ['Status', incident.status === 'NEW' ? 'Needs review' : 'Reviewed'],
              ['Clip', incident.has_footage ? 'Saved on the school PC' : 'No clip saved']].map(([k, v]) => (
              <View key={k} style={[s.rowBetween, { paddingVertical: 13, borderTopWidth: 1, borderTopColor: p.line }]}>
                <Text style={s.muted}>{k}</Text><Text style={s.dim}>{v}</Text>
              </View>
            ))}
          </View>
          <Press style={[s.button, { marginTop: 10 }]} onPress={close}><Text style={s.buttonText}>Done</Text></Press>
        </Frost>
      </Animated.View>
    </Modal>
  );
}

function Alerts({ incidents, now, refreshing, onRefresh, onScroll }: { incidents: Incident[]; now: number; refreshing: boolean; onRefresh: () => void; onScroll: (e: any) => void }) {
  const p = useTheme();
  const s = useStyles();
  const [sheet, setSheet] = useState<Incident | null>(null);
  const [filter, setFilter] = useState<'all' | 'new' | 'reviewed'>('all');
  const needing = incidents.filter((i) => i.status === 'NEW').length;
  const [query, setQuery] = useState('');
  const shown = incidents.filter((i) => (filter === 'all' || (filter === 'new') === (i.status === 'NEW')) && i.camera_name.toLowerCase().includes(query.trim().toLowerCase()));
  const tone = needing ? p.warn : p.good;
  return (
    <>
    <FlatList
      data={shown}
      keyExtractor={(item) => `${item.server_id}:${item.incident_id}`}
      contentContainerStyle={s.pad}
      onScroll={onScroll} scrollEventThrottle={32}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={p.lens} />}
      ListHeaderComponent={
        <View style={{ gap: 14 }}>
          <Text style={[s.h1, { marginTop: 10, marginLeft: 4 }]}>Alerts</Text>
          <Frost style={[s.card, { padding: 24, backgroundColor: tone + '1F' }]}>
            <CountUp value={needing} style={[s.bigNumber, { color: tone }]} duration={700} />
            <Text style={{ color: tone, fontFamily: fonts.body, fontSize: 16 }}>{needing === 0 ? 'Nothing needs attention right now.' : needing === 1 ? '1 alert needs your review.' : `${needing} alerts need your review.`}</Text>
          </Frost>
          <Frost style={{ height: 58, borderRadius: 29, borderWidth: 1, borderColor: p.line, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20 }} blur={false} tint={p.field}>
            <Icon name="search-outline" size={20} color={p.muted} />
            <TextInput style={{ flex: 1, color: p.text, fontFamily: fonts.body, fontSize: 17, paddingVertical: 0 }} value={query} onChangeText={setQuery}
              placeholder="Search by camera" placeholderTextColor={p.muted} autoCorrect={false} />
            {query ? <RNPressable onPress={() => setQuery('')} hitSlop={10}><Icon name="close" size={18} color={p.muted} /></RNPressable> : null}
          </Frost>
          <View style={s.segRow}>
            {(['all', 'new', 'reviewed'] as const).map((name) => (
              <Press key={name} scaleTo={0.94} style={[s.seg, filter === name && s.segOn]} onPress={() => setFilter(name)}>
                {filter === name ? <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: p.bg }} /> : null}
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
          <Text style={[s.muted, { textAlign: 'center' }]}>{incidents.length ? 'No alerts match.' : 'When a fight is detected it will appear here and on your phone.'}</Text>
        </Frost>
      }
      ListFooterComponent={<View style={{ height: 96 }} />}
      renderItem={({ item, index }) => {
        const color = p.severity[item.severity] ?? p.muted;
        return (
          <Reveal index={index}><Press onPress={() => setSheet(item)}><Frost style={s.alertCard} blur={false}>
            {item.status === 'NEW' ? <View style={{ position: 'absolute', left: 10, top: 10, width: 9, height: 9, borderRadius: 5, backgroundColor: p.warn }} /> : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <IconTile name="warning-outline" color={color} size={54} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={s.title}>{item.camera_name}</Text>
                <Text style={[s.muted, { fontSize: 13.5 }]}>{headline(item)} · {Math.round(item.confidence * 100)}% sure{'\n'}{timeAgo(item.happened_at, now)}</Text>
              </View>
              <Text style={[s.chip, { color, backgroundColor: color + '26' }]}>{(LEVEL[item.severity] ?? item.severity).toUpperCase()}</Text>
            </View>
          </Frost></Press></Reveal>
        );
      }}
    />
    {sheet ? <AlertSheet incident={sheet} now={now} onClose={() => setSheet(null)} /> : null}
    </>
  );
}

// ---------------------------------------------------------------- account
function SettingRow({ icon, title, value, onPress, tint, last, right }: { icon: IconName; title: string; value?: string; onPress?: () => void; tint?: string; last?: boolean; right?: React.ReactNode }) {
  const p = useTheme();
  const s = useStyles();
  const body = (
    <View style={[s.setRow, !last && { borderBottomWidth: 1, borderBottomColor: p.line }]}>
      <View style={s.setIcon}><Icon name={icon} size={20} color={tint ?? p.muted} /></View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={s.title}>{title}</Text>
        {value ? <Text style={[s.muted, tint ? { color: tint } : null]}>{value}</Text> : null}
      </View>
      {right ?? (onPress ? <Icon name="chevron-forward" size={18} color={p.muted} /> : null)}
    </View>
  );
  return onPress ? <Press onPress={onPress} scaleTo={0.98}>{body}</Press> : <View>{body}</View>;
}

function Account({ email, name, alertState, version, update, updateNote, onCheckUpdate, onInstall, progress, choice, onChoice, onSignOut, onScroll, notifyOn, onNotify, profile, onProfile }: {
  profile: Profile | null; onProfile: (p: Profile) => void;
  onScroll: (e: any) => void; notifyOn: boolean; onNotify: (on: boolean) => void;
  email: string; name: string; alertState: AlertSetup; version: string; update: UpdateInfo | null; updateNote: string;
  onCheckUpdate: () => void; onInstall: () => void; progress: number | null;
  choice: ThemeChoice; onChoice: (c: ThemeChoice) => void; onSignOut: () => void;
}) {
  const p = useTheme();
  const s = useStyles();
  const [editing, setEditing] = useState(false);
  const [confirmOut, setConfirmOut] = useState(false);
  const shownName = profile?.full_name || name || 'Your account';
  const numbers = profile?.alert_phones ?? [];
  return (
    <>
    <ScrollView contentContainerStyle={s.pad} onScroll={onScroll} scrollEventThrottle={32} showsVerticalScrollIndicator={false}>
      <Text style={[s.h1, { marginTop: 10, marginLeft: 4 }]}>Account</Text>
      <Press onPress={() => setEditing(true)}>
        <Frost style={[s.card, { flexDirection: 'row', alignItems: 'center', gap: 16 }]}>
          <View style={[s.avatar, { width: 56, height: 56, borderRadius: 28 }]}>
            <Text style={[s.avatarText, { fontSize: 23 }]}>{shownName[0].toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.title, { fontSize: 18 }]}>{shownName}</Text>
            {profile?.school_name ? <Text style={[s.dim, { fontSize: 14 }]} numberOfLines={1}>{profile.school_name}</Text> : null}
            <Text style={s.muted} numberOfLines={1}>{email}</Text>
          </View>
          <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: p.line, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="create-outline" size={19} color={p.text} />
          </View>
        </Frost>
      </Press>

      <Frost style={[s.card, { paddingVertical: 8 }]}>
        <SettingRow icon="call-outline" title="Alert phone numbers" onPress={() => setEditing(true)}
          value={numbers.length ? numbers.join('  ·  ') : 'Add the numbers that should get alerts'} />
        <SettingRow icon={alertState.allowed ? 'notifications-outline' : 'notifications-off-outline'} title="Alert notifications" value={alertState.message}
          tint={alertState.allowed ? p.good : p.warn} right={<Toggle on={notifyOn} onChange={onNotify} />} />
        <View style={{ paddingVertical: 16, gap: 10, borderBottomWidth: 1, borderBottomColor: p.line }}>
          <Text style={s.title}>Appearance</Text>
          <Seg options={[{ key: 'auto', label: 'Auto' }, { key: 'light', label: 'Light' }, { key: 'dark', label: 'Dark' }]} value={choice} onChange={onChoice} />
        </View>
        <SettingRow icon="phone-portrait-outline" title={`CampusGuard ${version}`}
          value={progress !== null ? `Downloading… ${Math.round(progress * 100)}%` : update ? `Version ${update.version} is ready to install` : updateNote || 'Tap to check for updates'}
          onPress={update ? onInstall : onCheckUpdate} tint={update ? p.good : undefined} />
        <SettingRow icon="chatbubble-ellipses-outline" title="Help and support" value="Chat with us on WhatsApp" onPress={() => Linking.openURL(SUPPORT_URL)} last />
      </Frost>

      <Press onPress={() => setConfirmOut(true)}>
        <Frost style={{ height: 64, borderRadius: 32, borderWidth: 1, borderColor: p.glassEdge, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }} blur={false}>
          <Icon name="log-out-outline" size={20} color={p.bad} />
          <Text style={{ color: p.bad, fontFamily: fonts.bodyBold, fontSize: 17 }}>Sign out</Text>
        </Frost>
      </Press>
    </ScrollView>
    {editing ? <ProfileSheet profile={profile} email={email} onClose={() => setEditing(false)} onSaved={onProfile} /> : null}
    {confirmOut ? <SignOutSheet onCancel={() => setConfirmOut(false)} onConfirm={() => { setConfirmOut(false); onSignOut(); }} /> : null}
    </>
  );
}

/** A glass sheet that rises from the bottom over a dimmed page. */
function Sheet({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  const p = useTheme();
  const s = useStyles();
  const rise = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.spring(rise, { toValue: 1, useNativeDriver: true, speed: 13, bounciness: 8 }).start(); }, [rise]);
  const close = () => Animated.timing(rise, { toValue: 0, duration: 200, useNativeDriver: true }).start(onClose);
  return (
    <Modal transparent animationType="none" onRequestClose={close} statusBarTranslucent>
      <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View style={{ ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.5)', opacity: rise }}>
          <RNPressable style={{ flex: 1 }} onPress={close} />
        </Animated.View>
        <Animated.View style={{ margin: 10, transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [460, 0] }) }] }}>
          <Frost style={[s.card, { borderRadius: 38, padding: 22, paddingTop: 14, maxHeight: 640 }]} tint={p.name === 'dark' ? 'rgba(28,28,33,0.97)' : 'rgba(250,251,254,0.97)'}>
            <View style={{ width: 42, height: 5, borderRadius: 3, backgroundColor: p.line, alignSelf: 'center', marginBottom: 14 }} />
            {children}
          </Frost>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function SignOutSheet({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  const p = useTheme();
  const s = useStyles();
  return (
    <Sheet onClose={onCancel}>
      <View style={{ alignItems: 'center', gap: 6, paddingVertical: 6 }}>
        <IconTile name="log-out-outline" color={p.bad} size={58} round />
        <Text style={[s.h2, { fontSize: 22, marginTop: 8 }]}>Sign out?</Text>
        <Text style={[s.muted, { textAlign: 'center' }]}>You will stop receiving alerts on this device until you sign in again.</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
        <Press scaleTo={0.95} style={{ flex: 1 }} onPress={onCancel}>
          <View style={{ height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: p.field, borderWidth: 1, borderColor: p.line }}>
            <Text style={{ color: p.text, fontFamily: fonts.bodyBold, fontSize: 16 }}>Cancel</Text>
          </View>
        </Press>
        <Press scaleTo={0.95} style={{ flex: 1 }} onPress={onConfirm}>
          <View style={{ height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: p.bad }}>
            <Text style={{ color: '#fff', fontFamily: fonts.bodyBold, fontSize: 16 }}>Sign out</Text>
          </View>
        </Press>
      </View>
    </Sheet>
  );
}

function ProfileSheet({ profile, email, onClose, onSaved }: { profile: Profile | null; email: string; onClose: () => void; onSaved: (p: Profile) => void }) {
  const p = useTheme();
  const s = useStyles();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [school, setSchool] = useState(profile?.school_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [alerts, setAlerts] = useState<string[]>(profile?.alert_phones?.length ? profile.alert_phones : ['']);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const input = { color: p.text, fontFamily: fonts.body, fontSize: 16, height: 50, borderRadius: 25, paddingHorizontal: 18, backgroundColor: p.field, borderWidth: 1, borderColor: p.line } as const;
  const label = (text: string) => <Text style={[s.label, { marginTop: 12, marginBottom: 6, marginLeft: 6 }]}>{text}</Text>;
  const save = async () => {
    setBusy(true); setError('');
    try {
      const next = await saveProfile({ full_name: fullName, school_name: school, phone, alert_phones: alerts.filter((n) => n.trim()) });
      onSaved(next); onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not save your details.');
    } finally { setBusy(false); }
  };
  return (
    <Sheet onClose={onClose}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={[s.h2, { fontSize: 22 }]}>Edit account</Text>
        {label('YOUR NAME')}
        <TextInput style={input} value={fullName} onChangeText={setFullName} placeholder="Full name" placeholderTextColor={p.muted} maxLength={80} />
        {label('SCHOOL OR COLLEGE')}
        <TextInput style={input} value={school} onChangeText={setSchool} placeholder="School name" placeholderTextColor={p.muted} maxLength={120} />
        {label('EMAIL (SIGN-IN, CANNOT BE CHANGED HERE)')}
        <Text style={[input, { textAlignVertical: 'center', lineHeight: 50, color: p.muted }]} numberOfLines={1}>{email}</Text>
        {label('YOUR PHONE NUMBER')}
        <TextInput style={input} value={phone} onChangeText={setPhone} placeholder="+91 70000 00000" placeholderTextColor={p.muted} keyboardType="phone-pad" maxLength={20} />
        {label('PHONE NUMBERS THAT GET ALERTS (UP TO 5)')}
        {alerts.map((number, index) => (
          <View key={index} style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <TextInput style={[input, { flex: 1 }]} value={number} placeholder="+91 70000 00000" placeholderTextColor={p.muted} keyboardType="phone-pad" maxLength={20}
              onChangeText={(text) => setAlerts(alerts.map((n, i) => (i === index ? text : n)))} />
            {alerts.length > 1 ? (
              <Press scaleTo={0.9} onPress={() => setAlerts(alerts.filter((_, i) => i !== index))}>
                <View style={{ width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: p.field, borderWidth: 1, borderColor: p.line }}>
                  <Icon name="close" size={20} color={p.muted} />
                </View>
              </Press>
            ) : null}
          </View>
        ))}
        {alerts.length < 5 ? (
          <Press scaleTo={0.96} onPress={() => setAlerts([...alerts, ''])} style={{ alignSelf: 'flex-start' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 6 }}>
              <Icon name="add-circle-outline" size={20} color={p.text} /><Text style={{ color: p.text, fontFamily: fonts.bodyBold, fontSize: 15 }}>Add another number</Text>
            </View>
          </Press>
        ) : null}
        {error ? <Text style={{ color: p.bad, fontFamily: fonts.bodyMedium, fontSize: 14, marginTop: 8 }}>{error}</Text> : null}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
          <Press scaleTo={0.95} style={{ flex: 1 }} onPress={onClose}>
            <View style={{ height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: p.field, borderWidth: 1, borderColor: p.line }}>
              <Text style={{ color: p.text, fontFamily: fonts.bodyBold, fontSize: 16 }}>Cancel</Text>
            </View>
          </Press>
          <Press scaleTo={0.95} style={{ flex: 1 }} onPress={save} disabled={busy}>
            <View style={{ height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: p.accent, opacity: busy ? 0.6 : 1 }}>
              <Text style={{ color: p.onAccent, fontFamily: fonts.bodyBold, fontSize: 16 }}>{busy ? 'Saving…' : 'Save'}</Text>
            </View>
          </Press>
        </View>
      </ScrollView>
    </Sheet>
  );
}
