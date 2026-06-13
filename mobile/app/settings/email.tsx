import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share } from 'react-native';
import { useAppStore } from '@/store';
import { fetchEmailVaultConfig, fetchInboundEmails, type EmailVaultConfig, type EmailVaultInboundRecord } from '@/services/emailVault';
import { SettingsSubpageShell, SectionHeader, SettingsCard, SettingsRow, Hint } from '@/components/settings/SettingsUi';
import { C, R, S, T } from '@/theme/tokens';

function formatInboundTime(value: string): string {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;
  return new Date(parsed).toLocaleString();
}

export default function EmailSettingsScreen() {
  const accountEmail = useAppStore((s) => s.accountProfile?.email);
  const [config, setConfig] = React.useState<EmailVaultConfig | null>(null);
  const [emails, setEmails] = React.useState<EmailVaultInboundRecord[]>([]);
  const [refreshing, setRefreshing] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const [nextConfig, nextEmails] = await Promise.all([
        fetchEmailVaultConfig(accountEmail),
        fetchInboundEmails(20),
      ]);
      setConfig(nextConfig);
      setEmails(nextEmails);
    } catch {
      // silent
    }
  }, [accountEmail]);

  React.useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleCopy = async () => {
    if (!config?.forwardingAddress) return;
    await Share.share({ message: config.forwardingAddress });
  };

  return (
    <SettingsSubpageShell title="Email to Vault">
      <SectionHeader title="Forwarding Address" />
      <SettingsCard>
        {config?.forwardingAddress ? (
          <TouchableOpacity onPress={handleCopy} activeOpacity={0.7} style={styles.addressRow}>
            <Text style={styles.addressText} numberOfLines={1}>{config.forwardingAddress}</Text>
            <View style={styles.copyBadge}>
              <Text style={styles.copyLabel}>Copy</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <SettingsRow label="Forwarding address" value="Not configured" />
        )}
        <SettingsRow
          label="Inbound status"
          value={config?.inboundEnabled ? 'Ready' : 'Backend setup needed'}
        />
      </SettingsCard>
      <Hint>
        {config?.inboundEnabled
          ? 'Forward bills, statements, school forms, insurance emails, and PDFs to this address. Attachments land in your vault automatically.'
          : 'Set INBOUND_EMAIL_DOMAIN on the backend to generate your forwarding address.'}
      </Hint>

      <View style={styles.sectionRow}>
        <SectionHeader title="Recent Activity" />
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshBtn} disabled={refreshing}>
          <Text style={styles.refreshLabel}>{refreshing ? 'Loading…' : 'Refresh'}</Text>
        </TouchableOpacity>
      </View>

      {emails.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No inbound emails yet</Text>
          <Text style={styles.emptyBody}>
            Copy your forwarding address above and send a test email with a PDF attachment. It will appear here once received.
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {emails.map((email) => (
            <View key={email.id} style={styles.emailCard}>
              <View style={styles.emailTop}>
                <Text style={styles.sender} numberOfLines={1}>{email.sender}</Text>
                <Text style={styles.meta}>{email.attachments.length} att</Text>
              </View>
              <Text style={styles.subject} numberOfLines={2}>{email.subject || 'No subject'}</Text>
              <Text style={styles.time}>{formatInboundTime(email.receivedAt)}</Text>
              {email.attachments.length > 0 ? (
                <View style={styles.attachmentRow}>
                  {email.attachments.slice(0, 3).map((attachment) => (
                    <View key={`${email.id}-${attachment.filename}`} style={styles.attachmentChip}>
                      <Text style={styles.attachmentText} numberOfLines={1}>{attachment.filename}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ))}
        </View>
      )}
    </SettingsSubpageShell>
  );
}

const styles = StyleSheet.create({
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: S[1],
  },
  refreshBtn: {
    paddingHorizontal: S[3],
    paddingVertical: S[2],
  },
  refreshLabel: {
    fontSize: T.xs,
    color: C.amber,
    fontWeight: '600',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S[3],
    paddingVertical: S[3],
    paddingHorizontal: S[4],
  },
  addressText: {
    flex: 1,
    fontSize: T.sm,
    color: C.cream,
    fontWeight: '500',
  },
  copyBadge: {
    backgroundColor: C.amber,
    borderRadius: R.full,
    paddingHorizontal: S[3],
    paddingVertical: S[1],
  },
  copyLabel: {
    fontSize: T.xs,
    color: C.ink1,
    fontWeight: '700',
  },
  emptyCard: {
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
  list: {
    gap: S[2],
  },
  emailCard: {
    backgroundColor: C.ink2,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.ink3,
    padding: S[4],
    gap: S[2],
  },
  emailTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: S[3],
  },
  sender: {
    flex: 1,
    fontSize: T.sm,
    color: C.cream,
    fontWeight: '700',
  },
  meta: {
    fontSize: T.xs,
    color: C.amber,
    fontWeight: '700',
  },
  subject: {
    fontSize: T.sm,
    color: C.ash,
    lineHeight: 20,
  },
  time: {
    fontSize: T.xs,
    color: C.ink4,
  },
  attachmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: S[2],
    marginTop: S[1],
  },
  attachmentChip: {
    maxWidth: '100%',
    backgroundColor: C.ink3,
    borderRadius: R.full,
    paddingHorizontal: S[3],
    paddingVertical: S[2],
  },
  attachmentText: {
    fontSize: T.xs,
    color: C.ash,
  },
});
