export interface WhatsAppSendMessagePayload {
  to: string; // Canonical +91XXXXXXXXXX
  templateName?: string;
  parameters?: Record<string, string | number>;
  fallbackBodyText?: string;
  documentUrl?: string;
  documentFilename?: string;
  branch?: string;
  senderNumber?: string;
}

export interface WhatsAppSendResult {
  success: boolean;
  providerMessageId?: string;
  error?: string;
  rawResponse?: unknown;
}

export interface IWhatsAppProvider {
  name: string;
  sendMessage(payload: WhatsAppSendMessagePayload): Promise<WhatsAppSendResult>;
}
