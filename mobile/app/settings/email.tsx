import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
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

  React.useEffect(() => {
    let active = true;
    Promise.all([
      fetchEmailVaultConfig(accountEmail),
      fetchInboundEmails(20),
    ]).then(([nextConfig, nextEmails]) => {
      if (!active) return;
      setConfig(nextConfig);
      setEmails(nextEmails);
    }).catch(() => undefined);
    return () => {
      active = false;
    };
  }, [accountEmail]);

  return (
    <SettingsSubpageShell title="Email to Vault">
      <SectionHeader title="Forwarding" />
      <SettingsCard>
        <SettingsRow
          label="Forwarding address"
          value={config?.forwardingAddress ?? 'Not configured'}
        />
        <SettingsRow
          label="Inbound status"
          value={config?.inboundEnabled ? 'Ready' : 'Backend setup needed'}
        />
      </SettingsCard>
      <Hint>
        {config?.inboundEnabled
          ? 'Forward bills, statements, school forms, insurance emails, and PDFs to this address. Their metadata will show up here once your inbound provider posts them to the backend.'
          : 'Set INBOUND_EMAIL_DOMAIN on the backend and connect your inbound mail provider to POST into /v1/email/inbound.'}
      </Hint>

      <SectionHeader title="Recent Activity" />
      {emails.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No inbound emails yet</Text>
          <Text style={styles.emptyBody}>
            Once forwarding is live, incoming attachments will appear here so you can confirm the pipeline is working.
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
