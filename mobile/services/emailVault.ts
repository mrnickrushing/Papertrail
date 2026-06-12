import { apiRequest, isBackendConfigured } from '@/services/api';

export type EmailVaultConfig = {
  forwardingAddress: string | null;
  inboundEnabled: boolean;
  domain: string | null;
  instructions: string[];
};

export type EmailVaultInboundRecord = {
  id: string;
  recipient?: string;
  sender: string;
  subject: string;
  receivedAt: string;
  attachments: Array<{
    filename: string;
    mimeType: string;
    sizeBytes: number;
  }>;
};

export async function fetchEmailVaultConfig(email?: string): Promise<EmailVaultConfig | null> {
  if (!isBackendConfigured()) return null;
  const query = email ? `?email=${encodeURIComponent(email)}` : '';
  return apiRequest<EmailVaultConfig>(`/v1/email/config${query}`);
}

export async function fetchInboundEmails(limit = 20): Promise<EmailVaultInboundRecord[]> {
  if (!isBackendConfigured()) return [];
  const response = await apiRequest<{ emails: EmailVaultInboundRecord[] }>(`/v1/email/inbound?limit=${limit}`);
  return response.emails;
}
