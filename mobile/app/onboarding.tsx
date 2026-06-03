/**
 * onboarding.tsx — First-launch walkthrough (Phase 10)
 *
 * Three slides explaining core value: local-first, organised, private.
 * Shown once when hasOnboarded=false; marks it true on Skip or Done.
 * Uses a horizontal FlatList so slides scroll naturally.
 */

import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  Dimensions,
  ListRenderItemInfo,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '@/store/appStore';
import { track } from '@/services/analytics';
import { C, T, S, R } from '@/theme/tokens';

const { width: SCREEN_W } = Dimensions.get('window');

interface Slide {
  id: string;
  emoji: string;
  title: string;
  body: string;
}

const SLIDES: Slide[] = [
  {
    id: '1',
    emoji: '🗂️',
    title: 'Your documents,\nyour device.',
    body: 'PaperTrail stores everything locally. No account, no cloud, no fees — your files never leave your phone unless you choose to share them.',
  },
  {
    id: '2',
    emoji: '📁',
    title: 'Find anything\nin seconds.',
    body: 'Scan, organise into folders, tag with keywords, and search by title or extracted text. Every document is one tap away.',
  },
  {
    id: '3',
    emoji: '🔒',
    title: 'Private by default.',
    body: 'Lock your vault with Face ID or Touch ID. Back up with a single tap. Upgrade to Pro for encrypted cloud sync when you\'re ready.',
  },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const setHasOnboarded = useAppStore(s => s.setHasOnboarded);
  const listRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  function finish(skipped: boolean) {
    track(skipped ? 'onboarding_skipped' : 'onboarding_completed');
    setHasOnboarded(true);
    // Defer so Zustand persist can flush to AsyncStorage before navigation
    requestAnimationFrame(() => router.replace('/(tabs)/'));
  }

  function next() {
    if (activeIndex < SLIDES.length - 1) {
      const nextIdx = activeIndex + 1;
      listRef.current?.scrollToIndex({ index: nextIdx, animated: true });
      setActiveIndex(nextIdx);
    } else {
      finish(false);
    }
  }

  const renderSlide = ({ item }: ListRenderItemInfo<Slide>) => (
    <View style={styles.slide}>
      <Text style={styles.emoji}>{item.emoji}</Text>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.body}>{item.body}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Skip — top right */}
      <Pressable style={styles.skipBtn} onPress={() => finish(true)} hitSlop={12}>
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>

      {/* Slides fill remaining space */}
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={item => item.id}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        style={styles.slideList}
        getItemLayout={(_, index) => ({ length: SCREEN_W, offset: SCREEN_W * index, index })}
      />

      {/* Bottom bar — pinned to safe area bottom */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, S[6]) }]}>
        {/* Dots */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
          ))}
        </View>

        {/* CTA */}
        <Pressable
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          onPress={next}
          accessibilityRole="button"
          accessibilityLabel={activeIndex < SLIDES.length - 1 ? 'Next' : 'Get Started'}
        >
          <Text style={styles.ctaText}>
            {activeIndex < SLIDES.length - 1 ? 'Next →' : 'Get Started'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.ink1,
    alignItems: 'center',
  },
  skipBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: S[6],
    paddingVertical: S[4],
  },
  skipText: { fontSize: T.base, color: C.ash },
  slideList: { flex: 1, width: SCREEN_W },
  slide: {
    width: SCREEN_W,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: S[8],
    gap: S[5],
  },
  emoji: { fontSize: 80 },
  title: {
    fontSize: T.xxl,
    fontWeight: '700',
    color: C.cream,
    textAlign: 'center',
    lineHeight: T.xxl * 1.2,
    letterSpacing: -0.5,
  },
  body: {
    fontSize: T.base,
    color: C.ash,
    textAlign: 'center',
    lineHeight: 24,
  },
  bottomBar: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: S[8],
    gap: S[4],
    paddingTop: S[4],
  },
  dots: {
    flexDirection: 'row',
    gap: S[2],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: R.full,
    backgroundColor: C.ink4,
  },
  dotActive: {
    backgroundColor: C.amber,
    width: 24,
  },
  cta: {
    backgroundColor: C.amber,
    borderRadius: R.lg,
    paddingVertical: S[4],
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  ctaPressed: { opacity: 0.8 },
  ctaText: { fontSize: T.lg, fontWeight: '700', color: C.ink1 },
});
