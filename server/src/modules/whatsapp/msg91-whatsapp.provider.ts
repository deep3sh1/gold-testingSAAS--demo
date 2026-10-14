import { IWhatsAppProvider, WhatsAppSendMessagePayload, WhatsAppSendResult } from './whatsapp.types.js';
import { config } from '../../config/index.js';

export class Msg91WhatsAppProvider implements IWhatsAppProvider {
  public name = 'MSG91_WHATSAPP';

  async sendMessage(payload: WhatsAppSendMessagePayload): Promise<WhatsAppSendResult> {
    const authKey = config.whatsapp.msg91?.authKey || process.env.MSG91_AUTHKEY;
    const integratedNumber = payload.senderNumber || config.whatsapp.msg91?.integratedNumber || process.env.MSG91_INTEGRATED_NUMBER || '919820012340';
    const templateName = config.whatsapp.msg91?.templateName || process.env.MSG91_TEMPLATE_NAME || 'demo_report';
    const templateNamespace = config.whatsapp.msg91?.templateNamespace || process.env.MSG91_TEMPLATE_NAMESPACE || '';

    console.log(`[MSG91 WhatsApp (Mock Safeguard)] Demo mode active. Simulated message to ${payload.to} logged. No external gateway called.`);
    return {
      success: true,
      providerMessageId: `mock_msg91_${Date.now()}`,
      rawResponse: { status: 'mock_delivered_demo_safe' },
    };
  }
}
