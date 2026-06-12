import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAppStore, useDocumentStore } from '@/store';
import { ScreenHeader } from '@/components/ScreenHeader';
import { FAB } from '@/components/FAB';
import { C, R, S, T } from '@/theme/tokens';
import { buildAutopilotSummary, type AutopilotAction } from '@/utils/autopilot';
import { fetchEmailVaultConfig, fetchInboundEmails, type EmailVaultConfig, type EmailVaultInboundRecord } from '@/services/emailVault';

function toneColor(tone: AutopilotAction['tone']): string {
  switch (tone) {
    case 'danger': return C.danger;
    case 'warning': return C.amber;
    case 'success': return C.success;
    default: return C.ash;
  }
}

function sectionCountLabel(count: number, label: string): string {
  return `${count} ${label}${count === 1 ? '' : 's'}`;
}

export default function AutopilotScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const documents = useDocumentStore((s) => s.documents);
  const accountEmail = useAppStore((s) => s.accountProfile?.email);
  const summary = React.useMemo(() => buildAutopilotSummary(documents), [documents]);
  const [emailConfig, setEmailConfig] = React.useState<EmailVaultConfig | null>(null);
  const [inboundEmails, setInboundEmails] = React.useState<EmailVaultInboundRecord[]>([]);

  React.useEffect(() => {
    let active = true;
    Promise.all([
      fetchEmailVaultConfig(accountEmail),
      fetchInboundEmails(8),
    ]).then(([config, emails]) => {
      if (!active) return;
      setEmailConfig(config);
      setInboundEmails(emails);
    }).catch(() => undefined);
    return () => {
      active = false;
    };
  }, [accountEmail]);

  const topActions = summary.actions.slice(0, 8);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader title="Autopilot" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 112 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>What needs attention</Text>
            <Text style={styles.heroBody}>
              Autopilot turns stored files into reminders, deadlines, and next actions.
            </Text>
          </View>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{summary.actions.length}</Text>
            <Text style={styles.heroStatLabel}>Open actions</Text>
          </View>
        </View>

        <View style={styles.metricsRow}>
          <MetricPill label="Due soon" value={summary.dueSoon.length} />
          <MetricPill label="Expiring" value={summary.expiringSoon.length} />
          <MetricPill label="Review" value={summary.needsReview.length} />
          <MetricPill label="People" value={summary.people.length} />
        </View>

        <SectionTitle
          title="Priority"
          subtitle={sectionCountLabel(topActions.length, 'item')}
          actionLabel="Vault"
          onPress={() => router.push('/(tabs)')}
        />
        {topActions.length === 0 ? (
          <EmptyBand
            title="Your vault is quiet"
            body="As dates, renewals, and new documents arrive, Autopilot will put them here."
          />
        ) : (
          <View style={styles.list}>
            {topActions.map((action) => (
              <Pressable
                key={action.id}
                style={({ pressed }) => [styles.actionCard, pressed && styles.pressed]}
                onPress={() => action.documentId ? router.push(`/viewer/${action.documentId}`) : undefined}
                disabled={!action.documentId}
              >
                <View style={[styles.actionIconWrap, { backgroundColor: `${toneColor(action.tone)}22` }]}>
                  <Feather
                    name={
                      action.kind === 'due' ? 'credit-card'
                        : action.kind === 'expiry' ? 'clock'
                          : action.kind === 'filing' ? 'folder'
                            : action.kind === 'missing' ? 'alert-circle'
                              : 'edit-3'
                    }
                    size={16}
                    color={toneColor(action.tone)}
                  />
                </View>
                <View style={styles.actionCopy}>
                  <Text style={styles.actionTitle}>{action.title}</Text>
                  <Text style={styles.actionDetail}>{action.detail}</Text>
                </View>
                {action.documentId ? <Feather name="chevron-right" size={18} color={C.ash} /> : null}
              </Pressable>
            ))}
          </View>
        )}

        <SectionTitle
          title="Email to Vault"
          subtitle={inboundEmails.length > 0 ? `${inboundEmails.length} recent inbound` : 'Intake setup'}
          actionLabel="Manage"
          onPress={() => router.push('/settings/email')}
        />
        <Pressable
          style={({ pressed }) => [styles.emailCard, pressed && styles.pressed]}
          onPress={() => router.push('/settings/email')}
        >
          <View style={styles.emailHeader}>
            <Text style={styles.emailTitle}>
              {emailConfig?.forwardingAddress ? 'Forward documents into FileTrail' : 'Configure forwarded email intake'}
            </Text>
            <Feather name="mail" size={18} color={C.amber} />
          </View>
          <Text style={styles.emailAddress}>
            {emailConfig?.forwardingAddress ?? 'Waiting for inbound email domain configuration'}
          </Text>
          <Text style={styles.emailHelp}>
            {emailConfig?.inboundEnabled
              ? 'Forward bills, statements, insurance docs, and school forms here.'
              : 'Set an inbound email domain on the backend, then each account gets its own forwarding address.'}
          </Text>
          {inboundEmails.length > 0 ? (
            <View style={styles.emailFeed}>
              {inboundEmails.slice(0, 3).map((email) => (
                <View key={email.id} style={styles.emailFeedRow}>
                  <View style={styles.emailFeedCopy}>
                    <Text style={styles.emailFeedSender} numberOfLines={1}>{email.sender}</Text>
                    <Text style={styles.emailFeedSubject} numberOfLines={1}>{email.subject || 'No subject'}</Text>
                  </View>
                  <Text style={styles.emailFeedMeta}>
                    {email.attachments.length} att
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </Pressable>

        <SectionTitle
          title="Family"
          subtitle={sectionCountLabel(summary.people.length, 'person')}
        />
        {summary.people.length === 0 ? (
          <EmptyBand
            title="No people assigned yet"
            body="Autopilot will start grouping records by person as IDs, medical records, and school documents are scanned."
          />
        ) : (
          <View style={styles.peopleGrid}>
            {summary.people.slice(0, 6).map((person) => (
              <View key={person.name} style={styles.personCard}>
                <Text style={styles.personName} numberOfLines={1}>{person.name}</Text>
                <Text style={styles.personCount}>{person.count} doc{person.count === 1 ? '' : 's'}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
      <FAB onPress={() => router.push('/capture')} />
    </View>
  );
}

function SectionTitle({
  title,
  subtitle,
  actionLabel,
  onPress,
}: {
  title: string;
  subtitle: string;
  actionLabel?: string;
  onPress?: () => void;
}) {
  return (
    <View style={styles.sectionRow}>
      <View>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionSub}>{subtitle}</Text>
      </View>
      {actionLabel && onPress ? (
        <Pressable onPress={onPress} hitSlop={8}>
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function MetricPill({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.metricPill}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function EmptyBand({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.emptyBand}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.ink1,
  },
  content: {
    paddingHorizontal: S[4],
    gap: S[4],
  },
  hero: {
    flexDirection: 'row',
    gap: S[3],
    alignItems: 'stretch',
  },
  heroCopy: {
    flex: 1,
    backgroundColor: C.ink2,
    borderWidth: 1,
    borderColor: C.ink3,
    borderRadius: R.lg,
    padding: S[4],
    gap: S[2],
  },
  heroTitle: {
    fontSize: T.lg,
    fontWeight: '700',
    color: C.cream,
  },
  heroBody: {
    fontSize: T.sm,
    color: C.ash,
    lineHeight: 20,
  },
  heroStat: {
    width: 108,
    backgroundColor: C.amberDim,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: `${C.amber}33`,
    alignItems: 'center',
    justifyContent: 'center',
    padding: S[3],
  },
  heroStatValue: {
    fontSize: 30,
    fontWeight: '800',
    color: C.amber,
  },
  heroStatLabel: {
    fontSize: T.xs,
    color: C.amber,
    fontWeight: '700',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: S[2],
  },
  metricPill: {
    flex: 1,
    minHeight: 66,
    backgroundColor: C.ink2,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.ink3,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: S[2],
  },
  metricValue: {
    fontSize: T.lg,
    fontWeight: '800',
    color: C.cream,
  },
  metricLabel: {
    fontSize: T.xs,
    color: C.ash,
    fontWeight: '600',
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: S[1],
  },
  sectionTitle: {
    fontSize: T.base,
    fontWeight: '700',
    color: C.cream,
  },
  sectionSub: {
    fontSize: T.xs,
    color: C.ash,
    marginTop: 2,
  },
  sectionAction: {
    fontSize: T.sm,
    color: C.amber,
    fontWeight: '700',
  },
  list: {
    gap: S[2],
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S[3],
    backgroundColor: C.ink2,
    borderWidth: 1,
    borderColor: C.ink3,
    borderRadius: R.lg,
    padding: S[4],
  },
  actionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: R.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCopy: {
    flex: 1,
    gap: 2,
  },
  actionTitle: {
    fontSize: T.sm,
    fontWeight: '700',
    color: C.cream,
  },
  actionDetail: {
    fontSize: T.xs,
    color: C.ash,
    lineHeight: 18,
  },
  emailCard: {
    backgroundColor: C.ink2,
    borderWidth: 1,
    borderColor: C.ink3,
    borderRadius: R.lg,
    padding: S[4],
    gap: S[2],
  },
  emailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: S[3],
  },
  emailTitle: {
    flex: 1,
    fontSize: T.base,
    fontWeight: '700',
    color: C.cream,
  },
  emailAddress: {
    fontSize: T.sm,
    color: C.amber,
    fontWeight: '700',
  },
  emailHelp: {
    fontSize: T.xs,
    color: C.ash,
    lineHeight: 18,
  },
  emailFeed: {
    gap: S[2],
    marginTop: S[1],
  },
  emailFeedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S[3],
    paddingTop: S[2],
    borderTopWidth: 1,
    borderTopColor: C.ink3,
  },
  emailFeedCopy: {
    flex: 1,
    gap: 2,
  },
  emailFeedSender: {
    fontSize: T.sm,
    color: C.cream,
    fontWeight: '600',
  },
  emailFeedSubject: {
    fontSize: T.xs,
    color: C.ash,
  },
  emailFeedMeta: {
    fontSize: T.xs,
    color: C.ash,
    fontWeight: '600',
  },
  peopleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: S[2],
  },
  personCard: {
    width: '48%',
    backgroundColor: C.ink2,
    borderWidth: 1,
    borderColor: C.ink3,
    borderRadius: R.lg,
    padding: S[4],
    gap: S[1],
  },
  personName: {
    fontSize: T.sm,
    color: C.cream,
    fontWeight: '700',
  },
  personCount: {
    fontSize: T.xs,
    color: C.ash,
  },
  emptyBand: {
    backgroundColor: C.ink2,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.ink3,
    padding: S[4],
    gap: S[2],
  },
  emptyTitle: {
    fontSize: T.sm,
    color: C.cream,
    fontWeight: '700',
  },
  emptyBody: {
    fontSize: T.xs,
    color: C.ash,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.82,
  },
});
