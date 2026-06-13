import PostalMime from 'postal-mime';

interface Env {
  BACKEND_URL: string;
  API_KEY?: string;
}

const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024; // 20 MB per attachment

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export default {
  async email(message: ForwardableEmailMessage, env: Env, _ctx: ExecutionContext): Promise<void> {
    const raw = await new Response(message.raw).arrayBuffer();
    const parsed = await PostalMime.parse(raw);

    const attachments = (parsed.attachments ?? [])
      .filter((att) => att.filename && att.mimeType && att.content)
      .map((att) => {
        const entry: {
          filename: string;
          mimeType: string;
          sizeBytes: number;
          content?: string;
        } = {
          filename: att.filename ?? `attachment.${att.mimeType?.split('/')[1] ?? 'bin'}`,
          mimeType: att.mimeType ?? 'application/octet-stream',
          sizeBytes: att.content?.byteLength ?? 0,
        };
        if (att.content && att.content.byteLength <= MAX_ATTACHMENT_BYTES) {
          entry.content = arrayBufferToBase64(att.content);
        }
        return entry;
      });

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (env.API_KEY) headers['Authorization'] = `Bearer ${env.API_KEY}`;

    const resp = await fetch(`${env.BACKEND_URL}/v1/email/inbound`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        sender: message.from,
        recipient: message.to,
        subject: parsed.subject ?? '',
        attachments,
      }),
    });

    if (!resp.ok) {
      const body = await resp.text().catch(() => '');
      throw new Error(`FileTrail backend returned ${resp.status}: ${body}`);
    }
  },
};
