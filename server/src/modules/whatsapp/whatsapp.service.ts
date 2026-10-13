import { IWhatsAppProvider, WhatsAppSendMessagePayload, WhatsAppSendResult } from './whatsapp.types.js';
import { MockWhatsAppProvider } from './mock-whatsapp.provider.js';
import { MetaCloudApiWhatsAppProvider } from './cloud-api-whatsapp.provider.js';
import { Msg91WhatsAppProvider } from './msg91-whatsapp.provider.js';
import { config } from '../../config/index.js';

export class WhatsAppService {
  private provider: IWhatsAppProvider;

  constructor(provider?: IWhatsAppProvider) {
    if (provider) {
      this.provider = provider;
    } else {
      // Default strictly to MockWhatsAppProvider for safe isolated demo mode
      if (config.whatsapp.provider === 'cloud_api' && config.whatsapp.accessToken) {
        this.provider = new MetaCloudApiWhatsAppProvider();
      } else if (config.whatsapp.provider === 'msg91' && config.whatsapp.msg91?.authKey) {
        this.provider = new Msg91WhatsAppProvider();
      } else {
        this.provider = new MockWhatsAppProvider();
      }
    }
  }

  setProvider(provider: IWhatsAppProvider): void {
    this.provider = provider;
  }

  getProvider(): IWhatsAppProvider {
    return this.provider;
  }

  async sendTestResultNotification(params: {
    to: string;
    tokenNumber: string;
    customerName: string;
    item: string;
    weight: number;
    weightUnit: string;
    testerValue: number;
    testerValueUnit?: string;
    karat?: number;
    documentUrl?: string;
    documentFilename?: string;
    branch?: string;
    senderNumber?: string;
  }): Promise<WhatsAppSendResult> {
    const valueStr = params.testerValueUnit ? `${params.testerValue} ${params.testerValueUnit}` : `${params.testerValue}`;
    const karatStr = params.karat ? ` (${params.karat.toFixed(2)}K)` : '';
    const fallbackText = `Hello ${params.customerName},\n\nYour gold testing request ${params.tokenNumber} has been completed.\nItem: ${params.item} (${params.weight} ${params.weightUnit})\nGold Purity: ${valueStr}${karatStr}\n\nView/Download Certificate:\n${params.documentUrl || ''}\n\nThank you for choosing Aurum Touch Lab.`;

    const payload: WhatsAppSendMessagePayload = {
      to: params.to,
      templateName: config.whatsapp.templateName,
      parameters: {
        customer_name: params.customerName,
        token_number: params.tokenNumber,
        item: params.item,
        weight: `${params.weight} ${params.weightUnit}`,
        tester_value: `${valueStr}${karatStr}`,
      },
      fallbackBodyText: fallbackText,
      documentUrl: params.documentUrl,
      documentFilename: params.documentFilename,
      branch: params.branch,
      senderNumber: params.senderNumber,
    };

    return this.provider.sendMessage(payload);
  }
}
