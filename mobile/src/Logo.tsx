// Copyright (c) 2026 CampusGuard. All rights reserved. Proprietary and confidential; see LICENSE.
import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Platform, Text, View } from 'react-native';
import { fonts, useTheme } from './useTheme';

// The CampusGuard mark: three rounded pills and a dot, drawn from the same 100-unit design the desktop app uses.
const PILLS = {
  top: { x: 20, y: 6, w: 74, h: 26 },
  bottom: { x: 20, y: 68, w: 74, h: 26 },
  stem: { x: 6, y: 38, w: 26, h: 24 },
} as const;
const DOT = { x: 80, y: 50, r: 9 };
const BOUNDS = { x: 6, y: 6, size: 88 };

export function LogoMark({ size = 36, color }: { size?: number; color?: string }) {
  const p = useTheme();
  const fill = color ?? p.text;
  const k = size / BOUNDS.size;
  return (
    <View style={{ width: size, height: size }}>
      {Object.values(PILLS).map((pill, i) => (
        <View key={i} style={{ position: 'absolute', left: (pill.x - BOUNDS.x) * k, top: (pill.y - BOUNDS.y) * k,
          width: pill.w * k, height: pill.h * k, borderRadius: 12 * k, backgroundColor: fill }} />
      ))}
      <View style={{ position: 'absolute', left: (DOT.x - DOT.r - BOUNDS.x) * k, top: (DOT.y - DOT.r - BOUNDS.y) * k,
        width: DOT.r * 2 * k, height: DOT.r * 2 * k, borderRadius: DOT.r * k, backgroundColor: fill }} />
    </View>
  );
}

const SPLASH = {
  dark: { bg: '#0A0A0B', fg: '#F5F5F7', mute: '#9A9AA2', line: '#2A2A2E' },
  light: { bg: '#E4E4E7', fg: '#0B0B0D', mute: '#6B6B73', line: '#C9C9CF' },
};
const WORDMARK = 'CampusGuard';
const TAGLINE = 'AI FIGHT DETECTION';
/** Seconds the reveal plays before the app takes over (the desktop animation, held a little). */
export const REVEAL_SECONDS = 4.0;

/**
 * The startup animation, ported from the desktop launch screen: the pills slide in, the dot pops and
 * ripples, the wordmark rises letter by letter, then the tagline fades in and a thin bar fills.
 */
export function LogoReveal({ onDone }: { onDone: () => void }) {
  const p = useTheme();
  const c = SPLASH[p.name];
  const t = useRef(new Animated.Value(0)).current;
  const MARK = 120;
  const k = MARK / BOUNDS.size;

  useEffect(() => {
    const run = Animated.timing(t, { toValue: 4.2, duration: 4200, easing: Easing.linear, useNativeDriver: false });
    run.start();
    const timer = setTimeout(onDone, REVEAL_SECONDS * 1000);
    return () => { run.stop(); clearTimeout(timer); };
  }, [t, onDone]);

  const phase = (start: number, duration: number, easing: (x: number) => number = Easing.bezier(0.2, 0.8, 0.2, 1)) =>
    t.interpolate({ inputRange: [start, start + duration], outputRange: [0, 1], extrapolate: 'clamp', easing });

  const stem = phase(0.2, 0.8), top = phase(0.4, 0.8), bottom = phase(0.6, 0.8);
  const slide = (e: Animated.AnimatedInterpolation<number>, from: number) => e.interpolate({ inputRange: [0, 1], outputRange: [from * k, 0] });
  const grow = (e: Animated.AnimatedInterpolation<number>) => e.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });
  const pill = (key: keyof typeof PILLS, e: Animated.AnimatedInterpolation<number>, dx: number, dy: number) => {
    const s = PILLS[key];
    return (
      <Animated.View key={key} style={{ position: 'absolute', left: (s.x - BOUNDS.x) * k, top: (s.y - BOUNDS.y) * k, width: s.w * k, height: s.h * k,
        borderRadius: 12 * k, backgroundColor: c.fg, opacity: e,
        transform: [{ translateX: slide(e, dx) }, { translateY: slide(e, dy) }, { scale: grow(e) }] }} />
    );
  };

  const dotScale = t.interpolate({ inputRange: [1.1, 1.46, 1.7], outputRange: [0, 1.4, 1], extrapolate: 'clamp' });
  const ring = (from: number) => ({
    scale: t.interpolate({ inputRange: [from, from + 1.3], outputRange: [1, 4], extrapolate: 'clamp', easing: Easing.bezier(0, 0, 0.58, 1) }),
    opacity: t.interpolate({ inputRange: [from - 0.001, from, from + 1.3], outputRange: [0, 0.7, 0], extrapolate: 'clamp' }),
  });
  const rings = [ring(1.6), ring(2.9)];
  const dotLeft = (DOT.x - DOT.r - BOUNDS.x) * k, dotTop = (DOT.y - DOT.r - BOUNDS.y) * k, dotSize = DOT.r * 2 * k;

  const FONT = 46, LINE = 56;
  const letters = useMemo(() => WORDMARK.split(''), []);
  const barW = 180;
  const barOpacity = phase(0.4, 0.4, Easing.linear);
  const barFill = t.interpolate({ inputRange: [0.5, 3.3], outputRange: [0, barW], extrapolate: 'clamp', easing: Easing.bezier(0.6, 0, 0.3, 1) });
  const tagline = phase(2.2, 0.8, Easing.linear);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }}>
      <View style={{ width: MARK, height: MARK }}>
        {pill('stem', stem, -45, 0)}
        {pill('top', top, 35, -35)}
        {pill('bottom', bottom, 35, 35)}
        {rings.map((r, i) => (
          <Animated.View key={i} style={{ position: 'absolute', left: dotLeft, top: dotTop, width: dotSize, height: dotSize, borderRadius: dotSize / 2,
            borderWidth: 2, borderColor: c.fg, opacity: r.opacity, transform: [{ scale: r.scale }] }} />
        ))}
        <Animated.View style={{ position: 'absolute', left: dotLeft, top: dotTop, width: dotSize, height: dotSize, borderRadius: dotSize / 2,
          backgroundColor: c.fg, transform: [{ scale: dotScale }] }} />
      </View>

      <View style={{ height: LINE, marginTop: 26, overflow: 'hidden', flexDirection: 'row' }}>
        {letters.map((ch, i) => {
          const e = phase(1.3 + i * 0.045, 0.6);
          return (
            <Animated.Text key={i} style={{ color: c.fg, fontFamily: fonts.heading, fontSize: FONT, lineHeight: LINE, marginRight: -0.04 * FONT,
              opacity: e, transform: [{ translateY: e.interpolate({ inputRange: [0, 1], outputRange: [0.7 * LINE, 0] }) }] }}>
              {ch}
            </Animated.Text>
          );
        })}
      </View>

      <Animated.Text style={{ color: c.mute, fontFamily: fonts.bodyMedium, fontSize: 12, letterSpacing: 4, marginTop: 14, opacity: tagline }}>
        {TAGLINE}
      </Animated.Text>

      <Animated.View style={{ marginTop: 28, width: barW, height: 2, borderRadius: 1, backgroundColor: c.line, opacity: barOpacity }}>
        <Animated.View style={{ width: barFill, height: 2, borderRadius: 1, backgroundColor: c.fg }} />
      </Animated.View>
    </View>
  );
}
