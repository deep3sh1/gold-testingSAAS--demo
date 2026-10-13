import { IWhatsAppProvider, WhatsAppSendMessagePayload, WhatsAppSendResult } from './whatsapp.types.js';
import { config } from '../../config/index.js';

export class Msg91WhatsAppProvider implements IWhatsAppProvider {
  public name = 'MSG91_WHATSAPP';

  async sendMessage(payload: WhatsAppSendMessagePayload): Promise<WhatsAppSendResult> {
    const authKey = config.whatsapp.msg91?.authKey || process.env.MSG91_AUTHKEY;
    const rawIntegrated = config.whatsapp.msg91?.integratedNumber || process.env.MSG91_INTEGRATED_NUMBER;
    const defaultIntegrated = (!rawIntegrated || rawIntegrated === '15553605603') ? '919653442477' : rawIntegrated;
    const kalyanWestIntegrated = (config.whatsapp.msg91 as any)?.kalyanWestIntegratedNumber || process.env.MSG91_KALYAN_WEST_NUMBER || '919326883179';
    const dombivliIntegrated = (config.whatsapp.msg91 as any)?.dombivliIntegratedNumber || process.env.MSG91_DOMBIVLI_NUMBER || '918369772543';

    // Route sender by branch:
    // - Kalyan West -> 919326883179
    // - Dombivli East -> 918369772543
    // - Other branches -> default (919653442477)
    let integratedNumber = defaultIntegrated;
    if (payload.senderNumber) {
      integratedNumber = payload.senderNumber;
    } else if (payload.branch) {
      const b = payload.branch.toLowerCase().trim();
      if (b === 'kalyan' || b === 'kalyan_west' || b === 'kalyanwest' || (b.includes('kalyan') && !b.includes('east'))) {
        integratedNumber = kalyanWestIntegrated;
      } else if (b.includes('dombivli') || b.includes('dombivali')) {
        integratedNumber = dombivliIntegrated;
      }
    }
    const templateName = config.whatsapp.msg91?.templateName || 'demo_report';

    if (!authKey) {
      return {
        success: false,
        error: 'MSG91 AuthKey not configured (MSG91_AUTHKEY missing in .env)',
      };
    }

    // Clean recipient phone: strip '+' or spaces so it's canonical e.g. 919876543210
    let recipient = payload.to.replace(/\+/g, '').replace(/\s+/g, '').replace(/[^0-9]/g, '');
    if (recipient.length === 10) {
      recipient = `91${recipient}`;
    }

    const components: Record<string, any> = {};

    // 1. Header component (PDF Document attachment)
    if (payload.documentUrl) {
      components.header_1 = {
        type: 'document',
        value: payload.documentUrl,
      };
    }

    let activeTemplateName = config.whatsapp.msg91?.templateName || 'demo_report';
    let templateNamespace = config.whatsapp.msg91?.templateNamespace || process.env.MSG91_TEMPLATE_NAMESPACE || 'ba234d2d_ca5e_41e2_bef3_752ac50e31d4';

    if (integratedNumber === kalyanWestIntegrated) {
      activeTemplateName = process.env.MSG91_KALYAN_WEST_TEMPLATE || 'demo_report';
      templateNamespace = process.env.MSG91_KALYAN_WEST_NAMESPACE || '66b066dd_3e21_4240_87b8_7ee518e5ee49';
    } else if (integratedNumber === dombivliIntegrated) {
      activeTemplateName = process.env.MSG91_DOMBIVLI_TEMPLATE || 'demo_report';
      templateNamespace = process.env.MSG91_DOMBIVLI_NAMESPACE || '4cbe5928_584e_4f8a_8a07_25b34ca66f53';
    }

    // 2. Body parameters for approved WhatsApp templates
    if (payload.parameters && Object.keys(payload.parameters).length > 0) {
      if (activeTemplateName === 'demo_report' || activeTemplateName === 'nagesh' || activeTemplateName === 'nagesh_report' || activeTemplateName === 'nagesh_touch_lab') {
        // positional parameters:
        // body_1: Customer Name
        // body_2: Token
        // body_3: Item
        // body_4: Weight
        // body_5: Purity
        const p = payload.parameters;
        components.body_1 = {
          type: 'text',
          value: String(p.customer_name || p.customerName || p.body_1 || 'Customer'),
        };
        components.body_2 = {
          type: 'text',
          value: String(p.token_number || p.tokenNumber || p.body_2 || ''),
        };
        components.body_3 = {
          type: 'text',
          value: String(p.item || p.body_3 || 'Gold'),
        };
        components.body_4 = {
          type: 'text',
          value: String(p.weight || p.body_4 || ''),
        };
        components.body_5 = {
          type: 'text',
          value: String(p.tester_value || p.purity || p.body_5 || ''),
        };
      } else {
        Object.entries(payload.parameters).forEach(([key, val], idx) => {
          components[`body_${idx + 1}`] = {
            type: 'text',
            value: String(val),
          };
        });
      }
    }

    const requestBody = {
      integrated_number: integratedNumber,
      content_type: 'template',
      payload: {
        messaging_product: 'whatsapp',
        type: 'template',
        template: {
          name: activeTemplateName,
          language: {
            code: config.whatsapp.msg91?.templateLang || process.env.MSG91_TEMPLATE_LANG || 'en',
            policy: 'deterministic',
          },
          namespace: templateNamespace,
          to_and_components: [
            {
              to: [recipient],
              components: components,
            },
          ],
        },
      },
    };

    console.log(`\n================== [MSG91 WHATSAPP DISPATCH] ==================`);
    console.log(`TO: ${recipient}`);
    console.log(`INTEGRATED NUMBER: ${integratedNumber}`);
    console.log(`TEMPLATE: ${activeTemplateName} (namespace: ${templateNamespace})`);
    if (payload.documentUrl) {
      console.log(`PDF ATTACHMENT: ${payload.documentUrl}`);
    }
    console.log(`PAYLOAD:`, JSON.stringify(requestBody, null, 2));

    try {
      const endpoint = 'https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          authkey: authKey,
        },
        body: JSON.stringify(requestBody),
      });

      const responseData: any = await response.json().catch(() => ({}));
      console.log(`[MSG91 Response Status: ${response.status}]`, responseData);
      console.log(`===============================================================\n`);

      if (response.ok && (responseData.status === 'success' || responseData.type === 'success' || response.status === 200 || responseData.hasError === false)) {
        return {
          success: true,
          providerMessageId: responseData.message_id || responseData.request_id || responseData.data?.request_id || `msg91_${Date.now()}`,
          rawResponse: responseData,
        };
      }

      return {
        success: false,
        error: responseData.message || responseData.errors || responseData.error || `MSG91 Error: HTTP ${response.status}`,
        rawResponse: responseData,
      };
    } catch (err) {
      console.error('[MSG91 WhatsApp Transport Error]', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown MSG91 transport error',
      };
    }
  }
}
