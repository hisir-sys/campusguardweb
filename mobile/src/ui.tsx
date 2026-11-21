import { createContext, useContext, useEffect, useRef, useState, type ComponentRef, type RefObject } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View, type PressableProps, type ViewProps, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useTheme } from './useTheme';

const native = Platform.OS !== 'web';

// ------------------------------------------------------------------ haptics
export const tap = () => { if (native) Haptics.selectionAsync().catch(() => undefined); };
export const bump = () => { if (native) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined); };
export const warn = () => { if (native) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined); };

// ------------------------------------------------------------------ frosted glass
/** Android can only blur what is inside a "blur target"; the signed-in screen registers one here. */
export const BlurTargetContext = createContext<RefObject<ComponentRef<typeof View> | null> | null>(null);

/** A real frosted-glass layer (iOS, Android 12+, web). Older Android falls back to a translucent tint. */
export function Frost({ style, intensity = 50, blur = true, tint, onLayout, children }: { style?: StyleProp<ViewStyle>; intensity?: number; blur?: boolean; tint?: string; onLayout?: ViewProps['onLayout']; children?: React.ReactNode }) {
  const p = useTheme();
  const target = useContext(BlurTargetContext);
  return (
    <View style={[{ overflow: 'hidden' }, style]} onLayout={onLayout}>
      {blur ? (
        <BlurView
          style={StyleSheet.absoluteFill}
          intensity={intensity}
          tint={p.name === 'dark' ? 'dark' : 'light'}
          blurTarget={target ?? undefined}
          blurMethod="dimezisBlurViewSdk31Plus"
        />
      ) : null}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: tint ?? p.glass }]} />
      {children}
    </View>
  );
}

// ------------------------------------------------------------------ press feedback + hover
type PressProps = Omit<PressableProps, 'style' | 'children'> & { style?: StyleProp<ViewStyle>; scaleTo?: number; haptic?: boolean; children?: React.ReactNode };

/** A button that sinks and springs back, lifts on hover (web, tablets with a mouse) and ticks the haptic motor. */
export function Press({ style, scaleTo = 0.96, haptic = true, onPress, children, disabled, ...rest }: PressProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const lift = useRef(new Animated.Value(0)).current;
  const spring = (value: Animated.Value, to: number) => Animated.spring(value, { toValue: to, useNativeDriver: native, speed: 40, bounciness: 7 }).start();
  const flat = StyleSheet.flatten(style) ?? {};
  const outer: ViewStyle = { flex: flat.flex, alignSelf: flat.alignSelf, width: flat.width as any, marginTop: flat.marginTop, marginHorizontal: flat.marginHorizontal, marginBottom: flat.marginBottom };
  const inner: ViewStyle = { ...flat, flex: undefined, marginTop: undefined, marginHorizontal: undefined, marginBottom: undefined };
  const hoverProps = Platform.OS === 'web'
    ? ({ onHoverIn: () => spring(lift, -2), onHoverOut: () => spring(lift, 0) } as any)
    : {};
  return (
    <Pressable
      {...rest}
      {...hoverProps}
      disabled={disabled}
      style={outer}
      onPressIn={() => spring(scale, scaleTo)}
      onPressOut={() => spring(scale, 1)}
      onPress={(event) => { if (haptic) tap(); onPress?.(event); }}
    >
      <Animated.View style={[inner, flat.flex !== undefined && { flex: 1 }, { transform: [{ translateY: lift }, { scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

// ------------------------------------------------------------------ entrance
/** Fades and slides its content up. `index` staggers a list of blocks. */
export function Reveal({ index = 0, style, children }: { index?: number; style?: StyleProp<ViewStyle>; children?: React.ReactNode }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const run = Animated.timing(t, { toValue: 1, duration: 460, delay: Math.min(index, 10) * 70, easing: Easing.bezier(0.2, 0.8, 0.2, 1), useNativeDriver: native });
    run.start();
    return () => run.stop();
  }, [t, index]);
  return (
    <Animated.View style={[style, { opacity: t, transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

// ------------------------------------------------------------------ numbers and bars
/** A number that counts up (or down) to its value. */
export function CountUp({ value, style, duration = 900 }: { value: number; style?: StyleProp<TextStyle>; duration?: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = anim.addListener(({ value: v }) => setShown(Math.round(v)));
    Animated.timing(anim, { toValue: value, duration, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => anim.removeListener(id);
  }, [anim, value, duration]);
  return <Text style={style}>{shown}</Text>;
}

/** A chart bar that grows up from the bottom. */
export function GrowBar({ height, delay = 0, style }: { height: number; delay?: number; style?: StyleProp<ViewStyle> }) {
  const h = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(h, { toValue: height, delay, useNativeDriver: false, speed: 9, bounciness: 8 }).start();
  }, [h, height, delay]);
  return <Animated.View style={[style, { height: h }]} />;
}

/** A grey block that breathes while real content loads. */
export function Skeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  const p = useTheme();
  const o = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(o, { toValue: 0.9, duration: 800, useNativeDriver: native }),
      Animated.timing(o, { toValue: 0.4, duration: 800, useNativeDriver: native }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [o]);
  return <Animated.View style={[{ backgroundColor: p.field, borderRadius: 24, opacity: o }, style]} />;
}

/** A dot that gently pulses, for "live". */
export function PulseDot({ color, size = 7 }: { color: string; size?: number }) {
  const ring = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(ring, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: native }));
    loop.start();
    return () => loop.stop();
  }, [ring]);
  return (
    <View style={{ width: size, height: size }}>
      <Animated.View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color,
        opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }), transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [1, 3.2] }) }] }} />
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
    </View>
  );
}

// ------------------------------------------------------------------ ambient background
/** Soft colour blobs that drift slowly behind everything, so the glass has something to refract. */
export function Backdrop() {
  const p = useTheme();
  const a = useRef(new Animated.Value(0)).current;
  const b = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const drift = (value: Animated.Value, ms: number) => Animated.loop(Animated.sequence([
      Animated.timing(value, { toValue: 1, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
      Animated.timing(value, { toValue: 0, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
    ]));
    const x = drift(a, 9000), y = drift(b, 12000);
    x.start(); y.start();
    return () => { x.stop(); y.stop(); };
  }, [a, b]);
  const dark = p.name === 'dark';
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={{ position: 'absolute', top: -120, right: -110, width: 360, height: 360, borderRadius: 180,
        backgroundColor: p.lens, opacity: dark ? 0.2 : 0.2,
        transform: [{ translateX: a.interpolate({ inputRange: [0, 1], outputRange: [0, -40] }) }, { translateY: a.interpolate({ inputRange: [0, 1], outputRange: [0, 30] }) }] }} />
      <Animated.View style={{ position: 'absolute', bottom: 60, left: -150, width: 320, height: 320, borderRadius: 160,
        backgroundColor: p.good, opacity: dark ? 0.13 : 0.16,
        transform: [{ translateX: b.interpolate({ inputRange: [0, 1], outputRange: [0, 50] }) }, { translateY: b.interpolate({ inputRange: [0, 1], outputRange: [0, -36] }) }] }} />
    </View>
  );
}
