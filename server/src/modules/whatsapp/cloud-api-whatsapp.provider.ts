import { IWhatsAppProvider, WhatsAppSendMessagePayload, WhatsAppSendResult } from './whatsapp.types.js';
import { config } from '../../config/index.js';

export class MetaCloudApiWhatsAppProvider implements IWhatsAppProvider {
  public name = 'META_CLOUD_API';

  async sendMessage(payload: WhatsAppSendMessagePayload): Promise<WhatsAppSendResult> {
    const { phoneNumberId, accessToken, apiUrl } = config.whatsapp;

    if (!phoneNumberId || !accessToken) {
      return {
        success: false,
        error: 'WhatsApp Cloud API credentials not configured (WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN)',
      };
    }

    try {
      const url = `${apiUrl}/${phoneNumberId}/messages`;
      const cleanPhone = payload.to.replace(/\+/g, '');

      let requestBody: Record<string, unknown>;

      if (payload.templateName) {
        requestBody = {
          messaging_product: 'whatsapp',
          to: cleanPhone,
          type: 'template',
          template: {
            name: payload.templateName,
            language: { code: 'en' },
            components: payload.parameters
              ? [
                  {
                    type: 'body',
                    parameters: Object.values(payload.parameters).map((val) => ({
                      type: 'text',
                      text: String(val),
                    })),
                  },
                ]
              : [],
          },
        };
      } else {
        requestBody = {
          messaging_product: 'whatsapp',
          to: cleanPhone,
          type: 'text',
          text: {
            preview_url: false,
            body: payload.fallbackBodyText || 'Your gold testing update is ready.',
          },
        };
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const responseData = (await response.json()) as { messages?: Array<{ id: string }>; error?: { message: string } };

      if (!response.ok || responseData.error) {
        return {
          success: false,
          error: responseData.error?.message || `WhatsApp API error: ${response.statusText}`,
          rawResponse: responseData,
        };
      }

      const msgId = responseData.messages?.[0]?.id;
      return {
        success: true,
        providerMessageId: msgId,
        rawResponse: responseData,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown WhatsApp API transport error',
      };
    }
  }
}
