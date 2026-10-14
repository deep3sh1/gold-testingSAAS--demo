import { IWhatsAppProvider, WhatsAppSendMessagePayload, WhatsAppSendResult } from './whatsapp.types.js';
import { config } from '../../config/index.js';

export class MetaCloudApiWhatsAppProvider implements IWhatsAppProvider {
  public name = 'META_CLOUD_API';

  async sendMessage(payload: WhatsAppSendMessagePayload): Promise<WhatsAppSendResult> {
    const { phoneNumberId, accessToken, apiUrl } = config.whatsapp;

    console.log(`[Meta Cloud API (Mock Safeguard)] Demo mode active. Simulated message to ${payload.to} logged. No external gateway called.`);
    return {
      success: true,
      providerMessageId: `mock_meta_${Date.now()}`,
      rawResponse: { status: 'mock_delivered_demo_safe' },
    };
  }
}
