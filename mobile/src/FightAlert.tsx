import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { LEVEL } from './alerts';
import { fonts, useTheme } from './useTheme';
import { timeAgo } from './theme';
import type { Incident } from './types';

// How long each level stays before closing itself. Danger stays until someone acts, as on the desktop.
const AUTO_MS: Record<string, number> = { LOW: 8000, MEDIUM: 12000, HIGH: 20000, CRITICAL: 0 };

/** The desktop "Fight detected" card: a scrim, a glass card that pops in, and two actions. */
export function FightAlert({ incident, onReview, onDismiss }: { incident: Incident; onReview: () => void; onDismiss: () => void }) {
  const p = useTheme();
  const { width } = useWindowDimensions();
  const pop = useRef(new Animated.Value(0)).current;
  const color = p.severity[incident.severity] ?? p.muted;
  const cardWidth = Math.min(420, width - 32);

  useEffect(() => {
    pop.setValue(0);
    Animated.timing(pop, { toValue: 1, duration: 210, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    const auto = AUTO_MS[incident.severity] ?? 12000;
    const timer = auto ? setTimeout(onDismiss, auto) : null;
    return () => { if (timer) clearTimeout(timer); };
  }, [incident, pop, onDismiss]);

  const s = useMemo(() => ({
    scrim: { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center' as const, justifyContent: 'center' as const,
      backgroundColor: p.name === 'dark' ? 'rgba(0,0,0,0.62)' : 'rgba(102,112,133,0.38)' },
    card: { width: cardWidth, backgroundColor: p.surface, borderRadius: 32, padding: 26, gap: 12, borderColor: p.line, borderWidth: 1 },
    pill: { alignSelf: 'flex-start' as const, color, backgroundColor: color + '24', borderRadius: 11, paddingHorizontal: 12, paddingVertical: 4,
      overflow: 'hidden' as const, fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1.2 },
    title: { color: p.text, fontFamily: fonts.heading, fontSize: 28 },
    meta: { color: p.muted, fontFamily: fonts.mono, fontSize: 12.5, lineHeight: 19 },
    primary: { backgroundColor: p.accent, borderRadius: 999, paddingVertical: 14, alignItems: 'center' as const },
    primaryText: { color: p.onAccent, fontFamily: fonts.bodyBold, fontSize: 16 },
    ghost: { backgroundColor: p.field, borderColor: p.line, borderWidth: 1, borderRadius: 999, paddingVertical: 14, alignItems: 'center' as const },
    ghostText: { color: p.text, fontFamily: fonts.bodyBold, fontSize: 16 },
  }), [p, color, cardWidth]);

  const headline = incident.severity === 'MEDIUM' ? 'Possible fight' : 'Fight detected';
  return (
    <View style={s.scrim}>
      <Animated.View style={[s.card, { opacity: pop, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }] }]}>
        <Text style={s.pill}>{(LEVEL[incident.severity] ?? incident.severity).toUpperCase()}</Text>
        <Text style={s.title}>{headline}</Text>
        <Text style={s.meta}>{incident.camera_name}{'\n'}{Math.round(incident.confidence * 100)}% sure · {timeAgo(incident.happened_at)}</Text>
        <View style={{ gap: 8, marginTop: 6 }}>
          <Pressable style={s.primary} onPress={onReview}><Text style={s.primaryText}>Review alert</Text></Pressable>
          <Pressable style={s.ghost} onPress={onDismiss}><Text style={s.ghostText}>Dismiss</Text></Pressable>
        </View>
      </Animated.View>
    </View>
  );
}
