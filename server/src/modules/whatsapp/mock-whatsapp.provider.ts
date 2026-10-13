import { IWhatsAppProvider, WhatsAppSendMessagePayload, WhatsAppSendResult } from './whatsapp.types.js';

export class MockWhatsAppProvider implements IWhatsAppProvider {
  public name = 'MOCK_SANDBOX';
  public sentMessages: Array<WhatsAppSendMessagePayload & { sentAt: Date; messageId: string }> = [];

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async sendMessage(payload: WhatsAppSendMessagePayload): Promise<WhatsAppSendResult> {
    const messageId = `mock_msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    console.log(`\n================== [WHATSAPP DISPATCH (MOCK)] ==================`);
    console.log(`TO: ${payload.to}`);
    console.log(`TEMPLATE: ${payload.templateName || 'DEFAULT'}`);
    console.log(`PARAMETERS:`, payload.parameters);
    console.log(`BODY: ${payload.fallbackBodyText || 'N/A'}`);
    console.log(`ID: ${messageId}`);
    console.log(`================================================================\n`);

    this.sentMessages.push({
      ...payload,
      sentAt: new Date(),
      messageId,
    });

    return {
      success: true,
      providerMessageId: messageId,
      rawResponse: { status: 'DELIVERED_MOCK', messageId },
    };
  }
}
