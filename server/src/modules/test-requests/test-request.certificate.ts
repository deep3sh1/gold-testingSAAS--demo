import { ITestRequestDocument } from './test-request.model.js';
import { formatIndianDateDisplay, formatIndianTimeDisplay } from '../../shared/index.js';
import {
  AURUM_BRAND_IMAGE_BASE64,
  MAKE_IN_INDIA_IMAGE_BASE64,
} from '../pdf/pdf-assets.js';
import { BRANCH_ADDRESSES } from '../pdf/certificate-pdf.service.js';

export const generateCertificateHtml = renderAssayCertificateHtml;

export function renderAssayCertificateHtml(
  request: ITestRequestDocument,
  options?: {
    isPreprintedDefault?: boolean;
    preprinted?: boolean;
    autoPrint?: boolean;
    branch?: string;
  }
): string {
  const isPreprintedDefault = options?.isPreprintedDefault ?? options?.preprinted ?? false;
  const autoPrint = options?.autoPrint ?? false;
  const rawBranch = (options?.branch || (request as any).branch || 'kalyan').toLowerCase().trim();
  const normalizedKey = rawBranch.replace(/[\s-]/g, '_');
  const addressLine = BRANCH_ADDRESSES[normalizedKey] || BRANCH_ADDRESSES[rawBranch] || BRANCH_ADDRESSES.kalyan;

  const dateDisplay = formatIndianDateDisplay(request.businessDate || request.createdAt || new Date());
  const timeDisplay = formatIndianTimeDisplay(request.completedAt || request.createdAt || new Date());

  const goldVal = request.testerValue !== undefined && request.testerValue !== null
    ? (typeof request.testerValue === 'number' ? request.testerValue.toFixed(2) : String(request.testerValue))
    : null;

  const valueDisplay = goldVal !== null
    ? `${goldVal} ${request.testerValueUnit || '%'}`.trim()
    : 'UNDER TESTING';

  const isSilver = (request as any).metalType === 'SILVER';
  const karatVal = isSilver
    ? null
    : (request.karat !== undefined && request.karat !== null
      ? (typeof request.karat === 'number' ? request.karat.toFixed(2) : String(request.karat))
      : (request.testerValue ? ((request.testerValue * 24) / 100).toFixed(2) : null));

  const metalStr = ((request as any).metalType || 'GOLD').toUpperCase();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Assay Slip — ${request.tokenNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @page {
      margin: 0;
    }
    body {
      background: #0f172a;
      color: #111827;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 16px;
    }
    .cert-page {
      width: ${isPreprintedDefault ? '780px' : '720px'}; /* Balanced width for clean proportions */
      min-height: 490px;
      background: #ffffff;
      padding: ${isPreprintedDefault ? '0 40px 14px 40px' : '10px 20px 14px 20px'};
      position: relative;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
      display: flex;
      flex-direction: column;
      transition: transform 0.2s ease;
    }
    .testing-estimate-header {
      text-align: center;
      font-size: 14.5px;
      font-weight: 900;
      letter-spacing: 1.8px;
      color: ${isPreprintedDefault ? '#000000' : '#0f172a'};
      padding: ${isPreprintedDefault ? '0 0 5px 0' : '3px 0 5px 0'};
      text-transform: uppercase;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      margin-top: 0;
      margin-bottom: 7px;
    }
    .header-navbar {
      margin-bottom: 6px;
    }
    .header-rule {
      height: 2px;
      background: #DE6824;
      margin: 3px 0;
    }
    .header-logo-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 2px 0;
    }
    .brand-img {
      height: 48px;
      object-fit: contain;
      transform: rotate(-1.1deg);
      transform-origin: 20% center;
    }
    .mii-img {
      height: 44px;
      object-fit: contain;
    }
    .address-bar {
      text-align: center;
      font-size: 11px;
      font-weight: bold;
      font-style: italic;
      color: #000000;
      padding: 4px 0;
      line-height: 1.25;
    }
    .token-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #fef3c7;
      border: ${isPreprintedDefault ? '1.5px solid #000000' : '1px solid #d4af37'};
      padding: 5px 14px;
      border-radius: 5px;
      margin-bottom: 7px;
      font-size: 13px;
      font-weight: 900;
      color: ${isPreprintedDefault ? '#000000' : '#78350f'};
    }
    /* 2 Main Vertical Columns: Left ~60%, Right ~40% (for preprinted physical slip) */
    .two-col-layout {
      display: grid;
      grid-template-columns: 1.3fr 1fr;
      gap: 12px;
      align-items: stretch;
      flex: 1;
    }
    /* Centered full-width layout (for digital report with header) */
    .centered-col-layout {
      display: flex;
      flex-direction: column;
      gap: 12px;
      flex: 1;
      width: 100%;
    }
    .col-left {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .col-left.full-width {
      width: 100%;
    }
    /* Row 1: Two side-by-side sub-sections */
    .row-subgrid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .sub-box {
      background: ${isPreprintedDefault ? '#ffffff' : '#f8fafc'};
      border: ${isPreprintedDefault ? '1.5px solid #000000' : '1px solid #cbd5e1'};
      border-radius: 6px;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 100px;
    }
    .box-title {
      font-size: 10px;
      font-weight: 900;
      color: ${isPreprintedDefault ? '#000000' : '#64748b'};
      letter-spacing: 0.5px;
      margin-bottom: 2px;
      white-space: nowrap;
    }
    .customer-name {
      font-size: 15px;
      font-weight: 900;
      color: ${isPreprintedDefault ? '#000000' : '#0f172a'};
      line-height: 1.2;
    }
    .jeweller-name {
      font-size: 12.5px;
      font-weight: 900;
      color: ${isPreprintedDefault ? '#000000' : '#b45309'};
      margin-top: 2px;
    }
    .info-sub {
      font-size: 11px;
      font-weight: ${isPreprintedDefault ? '800' : '600'};
      color: ${isPreprintedDefault ? '#000000' : '#475569'};
      margin-top: 2px;
    }
    .item-title {
      font-size: 14.5px;
      font-weight: 900;
      color: ${isPreprintedDefault ? '#000000' : '#0f172a'};
      line-height: 1.2;
    }
    .metal-badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 900;
      padding: 2px 7px;
      border-radius: 4px;
      text-transform: uppercase;
      margin-top: 2px;
      background: ${isPreprintedDefault ? '#f1f5f9' : '#fef3c7'};
      color: ${isPreprintedDefault ? '#000000' : (isSilver ? '#475569' : '#b45309')};
      border: ${isPreprintedDefault ? '1.5px solid #000000' : '1px solid #fde68a'};
    }
    .weight-text {
      font-size: 15.5px;
      font-weight: 900;
      color: ${isPreprintedDefault ? '#000000' : '#b89324'};
      margin-top: 4px;
      white-space: nowrap;
    }
    /* Row 2: Full Width Main Readings (Spacious & High Contrast) */
    .readings-box {
      background: #fffbeb;
      border: ${isPreprintedDefault ? '2px solid #000000' : '1.5px solid #d4af37'};
      border-radius: 6px;
      padding: 16px 12px;
      text-align: center;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    }
    .readings-title {
      font-size: 11px;
      font-weight: 900;
      color: ${isPreprintedDefault ? '#000000' : '#92400e'};
      letter-spacing: 0.5px;
    }
    .readings-val {
      font-size: 40px;
      font-weight: 900;
      color: ${isPreprintedDefault ? '#000000' : '#b45309'};
      line-height: 1.1;
      margin: 4px 0;
    }
    .readings-karat {
      font-size: 17px;
      font-weight: 900;
      color: ${isPreprintedDefault ? '#000000' : '#78350f'};
    }
    .readings-status {
      font-size: 10.5px;
      font-weight: 900;
      color: ${isPreprintedDefault ? '#000000' : '#059669'};
      margin-top: 4px;
    }
    /* Row 3: Exact 2-Line Disclaimer Note */
    .disclaimer-box {
      border: ${isPreprintedDefault ? '1.5px solid #000000' : '1px solid #4b5563'};
      padding: 8px 10px;
      text-align: center;
      font-size: 10px;
      font-weight: 900;
      color: ${isPreprintedDefault ? '#000000' : '#111827'};
      line-height: 1.4;
      background: #ffffff;
      border-radius: 4px;
    }
    /* Column 2: Right ~40% Dedicated Customer Calculation Space (Heading Only, No Dotted Border) */
    .col-right-calc {
      background: #ffffff;
      border: none;
      padding: 0;
      display: flex;
      flex-direction: column;
    }
    .calc-header {
      background: #f1f5f9;
      border: ${isPreprintedDefault ? '1.5px solid #000000' : '1px solid #cbd5e1'};
      border-radius: 4px;
      padding: 6px 4px;
      text-align: center;
      font-size: 11px;
      font-weight: 900;
      color: ${isPreprintedDefault ? '#000000' : '#475569'};
      letter-spacing: 0.3px;
      white-space: nowrap;
    }

    /* Action Toolbar */
    .btn-container {
      margin-top: 18px;
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 12px;
      align-items: center;
    }
    .action-btn {
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
      border: none;
    }
    .btn-print-slip {
      background: linear-gradient(135deg, #f59e0b, #d97706);
      color: #111827;
      font-weight: 700;
      box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4);
    }
    .btn-print-slip:hover {
      background: linear-gradient(135deg, #fbbf24, #f59e0b);
      transform: translateY(-1px);
    }
    .btn-secondary {
      background: #1e293b;
      color: #e2e8f0;
      border: 1px solid #334155;
    }
    .btn-secondary:hover {
      background: #334155;
    }

    /* Print Guidance Banner */
    .print-guidance-banner {
      margin-top: 12px;
      background: #fef3c7;
      border: 1px solid #fde68a;
      border-radius: 6px;
      padding: 8px 14px;
      font-size: 12px;
      color: #92400e;
      text-align: center;
      max-width: 720px;
      line-height: 1.4;
    }
    .print-guidance-banner strong {
      color: #78350f;
    }

    /* Print Controls Bar */
    .print-controls-bar {
      margin-top: 14px;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 8px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
      width: 720px;
      max-width: 95vw;
    }
    .ctrl-btn {
      background: #334155;
      color: #f8fafc;
      border: 1px solid #475569;
      padding: 5px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      transition: all 0.15s ease;
    }
    .ctrl-btn:hover {
      background: #475569;
    }
    .ctrl-btn.active {
      background: #f59e0b;
      color: #0f172a;
      border-color: #d97706;
    }
    .size-btn {
      background: transparent;
      color: #cbd5e1;
      border: none;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 11.5px;
      font-weight: 600;
      cursor: pointer;
    }
    .size-btn.active {
      background: #f59e0b;
      color: #0f172a;
      font-weight: 800;
    }
    .rot-btn {
      background: transparent;
      color: #cbd5e1;
      border: none;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 11.5px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .rot-btn:hover {
      background: #334155;
      color: #ffffff;
    }
    .rot-btn.active {
      background: #f59e0b;
      color: #0f172a;
      font-weight: 800;
    }

    /* Mobile Screen Responsive Rules */
    @media screen and (max-width: 820px) {
      body {
        padding: 8px !important;
        min-height: 100vh !important;
        justify-content: flex-start !important;
      }
      .cert-page {
        width: 100% !important;
        max-width: 100% !important;
        min-height: auto !important;
        padding: ${isPreprintedDefault ? '0 16px 14px 16px' : '10px 14px 14px 14px'} !important;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4) !important;
      }
      .print-controls-bar {
        width: 100% !important;
        max-width: 100% !important;
        flex-direction: column !important;
        align-items: stretch !important;
        gap: 8px !important;
      }
      .btn-container {
        flex-direction: column !important;
        width: 100% !important;
      }
      .action-btn {
        width: 100% !important;
        justify-content: center !important;
      }
      .print-guidance-banner {
        width: 100% !important;
        max-width: 100% !important;
      }
    }

    /* Print Styles */
    @media print {
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      @page {
        margin: 0;
      }
      html, body {
        width: 100% !important;
        height: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        background: transparent !important;
        overflow: hidden !important;
      }
      .btn-container, .print-guidance-banner, .print-controls-bar {
        display: none !important;
      }
      .cert-page {
        width: ${isPreprintedDefault ? '186mm' : '194mm'} !important;
        max-width: ${isPreprintedDefault ? '186mm' : '194mm'} !important;
        height: 130mm !important;
        max-height: 130mm !important;
        margin: 0 auto !important;
        box-shadow: none !important;
        border: none !important;
        padding: ${isPreprintedDefault ? '0 8mm 4mm 8mm' : '2mm 6mm 4mm 6mm'} !important;
        page-break-after: avoid !important;
        page-break-inside: avoid !important;
        overflow: hidden !important;
        transform: scale(var(--print-scale, 0.80)) !important;
        transform-origin: top center !important;
      }
      .cert-page.rotated-cw {
        transform: rotate(90deg) scale(var(--print-scale-rot, 0.80)) !important;
        transform-origin: center center !important;
      }
      .cert-page.rotated-ccw {
        transform: rotate(-90deg) scale(var(--print-scale-rot, 0.80)) !important;
        transform-origin: center center !important;
      }
    }
  </style>
</head>
<body>
  <div class="cert-page">
    ${request.reportImageBase64 ? `
    <!-- AGENT WINFTM SCREEN CAPTURE LAYOUT: ONLY TOP HEADER SECTION + CAPTURED REPORT IMAGE -->
    <div class="header-navbar" style="margin-bottom: 6px;">
      <div class="header-rule"></div>
      <div class="header-logo-row">
        <img class="brand-img" src="data:image/png;base64,${AURUM_BRAND_IMAGE_BASE64}" alt="Aurum Touch Lab Precious Metals Testing" />
        <img class="mii-img" src="data:image/png;base64,${MAKE_IN_INDIA_IMAGE_BASE64}" alt="Make In India" />
      </div>
      <div class="header-rule"></div>
      <div class="address-bar">
        ${addressLine}
      </div>
      <div class="header-rule"></div>
    </div>

    <!-- Exact WinFTM Report Image -->
    <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 4px; display: flex; justify-content: center; align-items: center; flex: 1; overflow: hidden;">
      <img src="${request.reportImageBase64.startsWith('data:') ? request.reportImageBase64 : `data:image/png;base64,${request.reportImageBase64}`}" alt="WinFTM Machine Assay Report" style="max-width: 100%; max-height: 420px; object-fit: contain; border-radius: 4px;" />
    </div>
    ` : `
    ${isPreprintedDefault ? `
      <!-- PRE-PRINTED STATIONERY MODE: HEADER IS COMPLETELY REMOVED -->
      <div class="testing-estimate-header">TESTING ESTIMATE</div>
    ` : `
      <!-- DIGITAL MODE: HEADER INCLUDED -->
      <div class="header-navbar">
        <div class="header-rule"></div>
        <div class="header-logo-row">
          <img class="brand-img" src="data:image/png;base64,${AURUM_BRAND_IMAGE_BASE64}" alt="Aurum Touch Lab Precious Metals Testing" />
          <img class="mii-img" src="data:image/png;base64,${MAKE_IN_INDIA_IMAGE_BASE64}" alt="Make In India" />
        </div>
        <div class="header-rule"></div>
        <div class="address-bar">
          ${addressLine}
        </div>
        <div class="header-rule"></div>
        <div class="testing-estimate-header">TESTING ESTIMATE</div>
      </div>
    `}

    <!-- Token & Date Banner -->
    <div class="token-bar">
      <div>TOKEN: ${request.tokenNumber}</div>
      <div>DATE: ${dateDisplay} &nbsp;&bull;&nbsp; TIME: ${timeDisplay}</div>
    </div>

    <!-- Main Content Area -->
    ${isPreprintedDefault ? `
    <!-- 2 Vertical Columns: Left ~60%, Right ~40% (For Preprinted Physical Slip) -->
    <div class="two-col-layout">
      <!-- COLUMN 1: LEFT ~60% (3 ROWS) -->
      <div class="col-left">
        <!-- Row 1: Two side-by-side sub-sections -->
        <div class="row-subgrid">
          <!-- Sub-section 1: Customer Details -->
          <div class="sub-box">
            <div>
              <div class="box-title">CUSTOMER DETAILS</div>
              <div class="customer-name">${request.customerNameSnapshot || 'Valued Customer'}</div>
              ${request.jewellerName ? `<div class="jeweller-name">M/s: ${request.jewellerName}</div>` : ''}
            </div>
            <div>
              <div class="info-sub">Ph: ${request.phoneSnapshot || 'N/A'}</div>
              <div class="info-sub">ID: ${request.customerId || 'REGULAR'}</div>
            </div>
          </div>

          <!-- Sub-section 2: Item & Metal Details -->
          <div class="sub-box">
            <div>
              <div class="box-title">ITEM &amp; METAL DETAILS</div>
              <div class="item-title">${request.item}</div>
              <span class="metal-badge">${metalStr}</span>
            </div>
            <div>
              <div class="weight-text">Weight: ${request.weight} ${request.weightUnit || 'g'}</div>
            </div>
          </div>
        </div>

        <!-- Row 2: Full Width Main Readings (Purity & Karat) -->
        <div class="readings-box">
          <div class="readings-title">MEASURED ASSAY PURITY / TEST RESULT</div>
          <div class="readings-val">${valueDisplay}</div>
          ${karatVal ? `<div class="readings-karat">KARAT: ${karatVal} K</div>` : ''}
          <div class="readings-status">STATUS: ${request.status} &bull; VERIFIED &amp; ISSUED</div>
        </div>

        <!-- Row 3: Exact 2-Line Disclaimer Note -->
        <div class="disclaimer-box">
          <div>Note : This Report of Jewellery item is based on skin test only.</div>
          <div>After melting we are not responsible for the same report.</div>
        </div>
      </div>

      <!-- COLUMN 2: RIGHT ~40% DEDICATED CALCULATION SPACE (PHYSICAL PAPER SLIP ONLY) -->
      <div class="col-right-calc">
        <div class="calc-header">CUSTOMER / JEWELLER CALCULATIONS</div>
      </div>
    </div>
    ` : `
    <!-- Centered Digital Certificate Layout With Header (No Calculation Space) -->
    <div class="centered-col-layout">
      <!-- Row 1: Two side-by-side sub-sections (Balanced 50/50 Width) -->
      <div class="row-subgrid">
        <!-- Sub-section 1: Customer Details -->
        <div class="sub-box">
          <div>
            <div class="box-title">CUSTOMER DETAILS</div>
            <div class="customer-name">${request.customerNameSnapshot || 'Valued Customer'}</div>
            ${request.jewellerName ? `<div class="jeweller-name">M/s: ${request.jewellerName}</div>` : ''}
          </div>
          <div>
            <div class="info-sub">Ph: ${request.phoneSnapshot || 'N/A'}</div>
            <div class="info-sub">ID: ${request.customerId || 'REGULAR'}</div>
          </div>
        </div>

        <!-- Sub-section 2: Item & Metal Details -->
        <div class="sub-box">
          <div>
            <div class="box-title">ITEM &amp; METAL DETAILS</div>
            <div class="item-title">${request.item}</div>
            <span class="metal-badge">${metalStr}</span>
          </div>
          <div>
            <div class="weight-text">Weight: ${request.weight} ${request.weightUnit || 'g'}</div>
          </div>
        </div>
      </div>

      <!-- Row 2: Centered Full-Width Main Readings (Purity & Karat) -->
      <div class="readings-box">
        <div class="readings-title">MEASURED ASSAY PURITY / TEST RESULT</div>
        <div class="readings-val">${valueDisplay}</div>
        ${karatVal ? `<div class="readings-karat">KARAT: ${karatVal} K</div>` : ''}
        <div class="readings-status">STATUS: ${request.status} &bull; VERIFIED &amp; ISSUED</div>
      </div>

      <!-- Row 3: Exact 2-Line Disclaimer Note -->
      <div class="disclaimer-box">
        <div>Note : This Report of Jewellery item is based on skin test only.</div>
        <div>After melting we are not responsible for the same report.</div>
      </div>
    </div>
    `}
    `}
  </div>

  ${isPreprintedDefault ? `
  <div class="print-guidance-banner">
    <div style="font-weight: 800; font-size: 13px; margin-bottom: 3px;">⚠️ Print Settings For Pre-printed Stationery:</div>
    <div>• In Chrome Print Dialog: Select <strong>Layout: Landscape</strong> (or Portrait if your printer feeds paper narrow-edge).</div>
    <div>• Under More Settings: Select <strong>Margins: None</strong>, <strong>Paper: A5</strong> (or A4), and <strong>uncheck Headers &amp; Footers</strong>.</div>
    <div>• If paper feeds narrow-edge and prints sideways, click <strong>Rotate 90° Clockwise</strong> below!</div>
  </div>
  ` : ''}

  <!-- Print Quick Options Bar -->
  <div class="print-controls-bar">
    <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
      <div style="display: flex; gap: 4px; align-items: center; background: #0f172a; padding: 2px 6px; border-radius: 6px; border: 1px solid #334155;">
        <span style="font-size: 11px; color: #94a3b8; padding: 0 4px;">Orientation:</span>
        <button type="button" class="rot-btn active" id="rotNormal" onclick="setRotation('normal')">Horizontal / Landscape</button>
        <button type="button" class="rot-btn" id="rotCw" onclick="setRotation('cw')">🔄 Rotate 90° Clockwise</button>
        <button type="button" class="rot-btn" id="rotCcw" onclick="setRotation('ccw')">🔄 Rotate 90° Anti-Clockwise</button>
      </div>
      <div style="display: flex; gap: 4px; align-items: center; background: #0f172a; padding: 2px 5px; border-radius: 6px; border: 1px solid #334155;">
        <span style="font-size: 11px; color: #94a3b8; padding: 0 4px;">Fit Paper:</span>
        <button type="button" class="size-btn active" id="sz80" onclick="setPageScale(0.80)">80% Small (Recommended)</button>
        <button type="button" class="size-btn" id="sz88" onclick="setPageScale(0.88)">88% Compact</button>
        <button type="button" class="size-btn" id="sz100" onclick="setPageScale(1.00)">100% Full</button>
      </div>
    </div>
  </div>

  <div class="btn-container">
    <button class="action-btn btn-print-slip" onclick="doPrint()">
      🖨️ Print Slip Now
    </button>
    ${isPreprintedDefault ? `
      <a class="action-btn btn-secondary" href="?mode=digital">
        📄 View With Header
      </a>
      <a class="action-btn btn-secondary" href="${request.tokenNumber}.pdf?mode=preprinted" download="${request.tokenNumber}-print.pdf">
        📥 Download Print PDF (No Header)
      </a>
    ` : `
      <a class="action-btn btn-secondary" href="?mode=preprinted">
        🖨️ View No-Header Slip
      </a>
      <a class="action-btn btn-secondary" href="${request.tokenNumber}.pdf" download>
        📥 Download Digital PDF (With Header)
      </a>
    `}
  </div>

  <script>
    let rotMode = localStorage.getItem('cert_print_rot_mode') || 'normal';
    let curScale = parseFloat(localStorage.getItem('cert_print_scale') || '0.80');

    function updateVisuals() {
      const cert = document.querySelector('.cert-page');
      if (!cert) return;
      cert.classList.remove('rotated-cw', 'rotated-ccw');
      
      document.querySelectorAll('.rot-btn').forEach(b => b.classList.remove('active'));
      if (rotMode === 'cw') {
        cert.classList.add('rotated-cw');
        document.getElementById('rotCw')?.classList.add('active');
      } else if (rotMode === 'ccw') {
        cert.classList.add('rotated-ccw');
        document.getElementById('rotCcw')?.classList.add('active');
      } else {
        document.getElementById('rotNormal')?.classList.add('active');
      }

      // When rotated 90° (Portrait feed), paper height in Chrome Landscape is 148mm (narrow edge).
      // 0.80 is the calibrated edge-to-edge maximum that fits without side cropping.
      // In rotated mode, 88% and 100% are safely capped to 0.80 so they NEVER crop sides in Chrome.
      // In Horizontal (Landscape), paper width is 210mm so 0.88 and 1.00 can print at full scale.
      const safeRotScale = (rotMode === 'cw' || rotMode === 'ccw') ? Math.min(curScale, 0.80) : curScale;
      document.documentElement.style.setProperty('--print-scale', curScale);
      document.documentElement.style.setProperty('--print-scale-rot', safeRotScale);
      
      let transformStr = 'scale(' + curScale + ')';
      let originStr = 'top center';
      if (rotMode === 'cw') {
        transformStr = 'rotate(90deg) scale(' + (safeRotScale * 0.95) + ')';
        originStr = 'center center';
      } else if (rotMode === 'ccw') {
        transformStr = 'rotate(-90deg) scale(' + (safeRotScale * 0.95) + ')';
        originStr = 'center center';
      }
      cert.style.transform = transformStr;
      cert.style.transformOrigin = originStr;

      document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
      if (curScale <= 0.82) document.getElementById('sz80')?.classList.add('active');
      else if (curScale <= 0.92) document.getElementById('sz88')?.classList.add('active');
      else document.getElementById('sz100')?.classList.add('active');
    }

    function setRotation(mode) {
      rotMode = mode;
      localStorage.setItem('cert_print_rot_mode', mode);
      updateVisuals();
    }

    function setPageScale(val) {
      curScale = val;
      localStorage.setItem('cert_print_scale', String(val));
      updateVisuals();
    }

    function doPrint() {
      window.print();
    }

    window.addEventListener('DOMContentLoaded', () => {
      updateVisuals();
    });

    ${autoPrint ? `
    window.addEventListener('load', () => {
      updateVisuals();
      setTimeout(() => {
        try {
          window.focus();
          window.print();
        } catch (err) {
          console.error('Print trigger error:', err);
        }
      }, 350);
    });
    ` : ''}
  </script>
</body>
</html>`;
}
