import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDebugStore } from '@/store/debugStore';
import { C, R, S } from '@/theme/tokens';

type DebugOverlayProps = {
  routeLabel: string;
};

export function DebugOverlay({ routeLabel }: DebugOverlayProps) {
  const insets = useSafeAreaInsets();
  const visible = useDebugStore((s) => s.visible);
  const rootTapCount = useDebugStore((s) => s.rootTapCount);
  const entries = useDebugStore((s) => s.entries);
  const screenStates = useDebugStore((s) => s.screenStates);
  const toggleVisible = useDebugStore((s) => s.toggleVisible);
  const bumpRootTap = useDebugStore((s) => s.bumpRootTap);
  const clear = useDebugStore((s) => s.clear);

  if (!__DEV__) return null;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View pointerEvents="box-none" style={styles.anchor}>
        {visible && (
          <View style={[styles.panel, { marginTop: insets.top + S[2] }]}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>Debug</Text>
              <Pressable style={styles.clearBtn} onPress={clear}>
                <Text style={styles.clearText}>Clear</Text>
              </Pressable>
            </View>

            <Text style={styles.routeText}>{routeLabel}</Text>
            <Text style={styles.metaText}>Probe taps: {rootTapCount}</Text>

            {Object.entries(screenStates).map(([key, value]) => (
              <Text key={key} style={styles.stateText}>
                {key}: {value}
              </Text>
            ))}

            <ScrollView style={styles.logScroll} contentContainerStyle={styles.logContent}>
              {entries.map((entry) => (
                <Text key={entry.id} style={styles.logText}>
                  {entry.at} {entry.message}
                </Text>
              ))}
              {entries.length === 0 && (
                <Text style={styles.logEmpty}>No events yet.</Text>
              )}
            </ScrollView>
          </View>
        )}

        <Pressable
          style={[styles.fab, { top: insets.top + S[2] }]}
          onPress={() => {
            bumpRootTap();
            toggleVisible();
          }}
        >
          <Text style={styles.fabText}>DBG {rootTapCount}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    flex: 1,
    alignItems: 'flex-end',
    paddingRight: S[3],
  },
  panel: {
    width: 280,
    maxHeight: 360,
    backgroundColor: 'rgba(11, 14, 20, 0.94)',
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: S[3],
    marginBottom: S[2],
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: S[2],
  },
  panelTitle: {
    color: C.cream,
    fontSize: 14,
    fontWeight: '700',
  },
  clearBtn: {
    paddingHorizontal: S[2],
    paddingVertical: 4,
    borderRadius: R.md,
    backgroundColor: C.ink3,
  },
  clearText: {
    color: C.cream,
    fontSize: 11,
    fontWeight: '600',
  },
  routeText: {
    color: C.amber,
    fontSize: 11,
    marginBottom: 4,
  },
  metaText: {
    color: C.ash,
    fontSize: 11,
    marginBottom: 6,
  },
  stateText: {
    color: C.cream,
    fontSize: 11,
    marginBottom: 3,
  },
  logScroll: {
    marginTop: S[2],
    maxHeight: 220,
  },
  logContent: {
    gap: 4,
  },
  logText: {
    color: C.ash,
    fontSize: 11,
    lineHeight: 15,
  },
  logEmpty: {
    color: C.ash,
    fontSize: 11,
    fontStyle: 'italic',
  },
  fab: {
    minWidth: 68,
    paddingHorizontal: S[3],
    height: 34,
    borderRadius: R.full,
    backgroundColor: 'rgba(255, 176, 32, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabText: {
    color: C.ink1,
    fontSize: 12,
    fontWeight: '800',
  },
});
