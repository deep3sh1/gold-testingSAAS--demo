import PDFDocument from 'pdfkit';
import { ITestRequestDocument } from '../test-requests/test-request.model.js';
import { formatIndianDateDisplay, formatIndianTimeDisplay } from '../../shared/index.js';
import { AURUM_BRAND_IMAGE_BUFFER, MAKE_IN_INDIA_IMAGE_BUFFER } from './pdf-assets.js';

export const BRANCH_ADDRESSES: Record<string, string> = {
  // 1. Kalyan (West) / West Branch
  kalyan: 'Unit 102, Gold Crest Plaza, Bullion Market, West Sector - 400001. Mob. : 98200 12345',
  kalyan_west: 'Unit 102, Gold Crest Plaza, Bullion Market, West Sector - 400001. Mob. : 98200 12345',
  kalyanwest: 'Unit 102, Gold Crest Plaza, Bullion Market, West Sector - 400001. Mob. : 98200 12345',

  // 2. Kalyan (East) / East Branch
  kalyan_east: 'City Assay Centre, Near Bullion Exchange, East Commercial Hub - 400002. Mob. : 98200 12346',
  kalyaneast: 'City Assay Centre, Near Bullion Exchange, East Commercial Hub - 400002. Mob. : 98200 12346',
  kolsewadi: 'City Assay Centre, Near Bullion Exchange, East Commercial Hub - 400002. Mob. : 98200 12346',

  // 3. Central Branch / Ulhasnagar
  ulhasnagar: 'Shop No. 12, Gold Market Galleria, Jewellers Lane, Central Zone - 400003. Mob. : 98200 12347',

  // 4. Metro Branch / Dombivli
  dombivali: 'Suite 4, Hallmark Chambers, Diamond District, Metro Wing - 400004. Mob. : 98200 12348',
  dombivli: 'Suite 4, Hallmark Chambers, Diamond District, Metro Wing - 400004. Mob. : 98200 12348',
};

export interface GeneratePdfOptions {
  orgName?: string;
  includeHeader?: boolean; // defaults to true; set false for pre-printed stationary printing
  branch?: string;
}

export function generateCertificatePdfBuffer(
  request: ITestRequestDocument,
  optionsOrOrgName?: string | GeneratePdfOptions
): Promise<Buffer> {
  const options: GeneratePdfOptions = typeof optionsOrOrgName === 'string'
    ? { orgName: optionsOrOrgName }
    : (optionsOrOrgName || {});
  const orgName = options.orgName || 'Aurum Touch Lab';
  const includeHeader = options.includeHeader !== false;
  const rawBranch = (options.branch || (request as any).branch || 'kalyan').toLowerCase().trim();
  const normalizedKey = rawBranch.replace(/[\s-]/g, '_');
  const addressLine = BRANCH_ADDRESSES[normalizedKey] || BRANCH_ADDRESSES[rawBranch] || BRANCH_ADDRESSES.kalyan;

  return new Promise((resolve, reject) => {
    // Standard A5 Landscape dimensions: 595.28 x 419.53 points (210mm x 148mm)
    const doc = new PDFDocument({
      size: [595.28, 419.53],
      margin: 0,
      autoFirstPage: true,
      info: {
        Title: `Assay Certificate - ${request.tokenNumber}`,
        Author: orgName,
        Subject: 'Precious Metal Purity Assay Certificate',
      },
    });

    const buffers: Buffer[] = [];
    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', (err) => reject(err));

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

    const leftX = includeHeader ? 25 : 42;
    const rightX = includeHeader ? 570.28 : 553.28;
    const contentWidth = rightX - leftX;

    // 1. Digital View Header (Omitted when printing on physical pre-printed stationary)
    if (includeHeader) {
      // Top Orange Line across
      doc.moveTo(leftX, 10).lineTo(rightX, 10).lineWidth(1.5).strokeColor('#DE6824').stroke();

      // Brand Logo & Make In India Badge
      const brandImgWidth = 260;
      const brandImgHeight = 38;
      doc.image(AURUM_BRAND_IMAGE_BUFFER, leftX, 13, { width: brandImgWidth, height: brandImgHeight });

      const miiWidth = 82;
      const miiHeight = 36;
      doc.image(MAKE_IN_INDIA_IMAGE_BUFFER, rightX - miiWidth, 14, { width: miiWidth, height: miiHeight });

      // Orange separator line above address
      doc.moveTo(leftX, 52).lineTo(rightX, 52).lineWidth(1.2).strokeColor('#DE6824').stroke();

      // Address Line - Centered between the two orange lines
      doc.font('Helvetica-BoldOblique').fontSize(8.2).fillColor('#1A1A1A');
      doc.text(
        addressLine,
        leftX,
        57.5,
        { width: contentWidth, align: 'center' }
      );

      // Orange separator line below address
      doc.moveTo(leftX, 68).lineTo(rightX, 68).lineWidth(1.2).strokeColor('#DE6824').stroke();

      // Formal Heading: TESTING ESTIMATE (Only for regular certificates, omitted for WinFTM agent capture)
      if (!request.reportImageBase64) {
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a');
        doc.text('TESTING ESTIMATE', leftX, 72, { width: contentWidth, align: 'center', characterSpacing: 1.2 });
      }
    }

    // ----------------------------------------------------
    // WINFTM SCREEN CAPTURE REPORT (Direct Machine Image)
    // ONLY Top Header Section + Full Report Screenshot Image
    // ----------------------------------------------------
    if (request.reportImageBase64) {
      let rawBase64 = request.reportImageBase64;
      if (rawBase64.includes('base64,')) {
        rawBase64 = rawBase64.split('base64,')[1];
      }
      const reportImgBuffer = Buffer.from(rawBase64, 'base64');

      const imgBoxY = includeHeader ? 74 : 14;
      const imgBoxH = 412 - imgBoxY;

      // Image Container Box
      doc.rect(leftX, imgBoxY, contentWidth, imgBoxH).fillColor('#ffffff').fill();
      doc.rect(leftX, imgBoxY, contentWidth, imgBoxH).lineWidth(0.75).strokeColor('#cbd5e1').stroke();

      try {
        doc.image(reportImgBuffer, leftX + 3, imgBoxY + 3, {
          fit: [contentWidth - 6, imgBoxH - 6],
          align: 'center',
          valign: 'center',
        });
      } catch (imgErr) {
        console.error('Error embedding WinFTM report image in PDF:', imgErr);
      }

      doc.end();
      return;
    }

    // 2. Main Content Starts (Regular Digital or Pre-printed Layout)
    // When includeHeader: false (printable report), keep safe distance from top (~74 pt) to accommodate pre-printed paper navbar
    // When includeHeader: true (digital report), starts cleanly at Y = 86 pt after TESTING ESTIMATE heading
    let curY = includeHeader ? 86 : 74;

    if (!includeHeader) {
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#000000');
      doc.text('TESTING ESTIMATE', leftX, curY, { width: contentWidth, align: 'center', characterSpacing: 1.2 });
      curY += 15;
    }

    // Token & Date Banner Box (Full width above 2 columns)
    const bannerH = 20;
    doc.rect(leftX, curY, contentWidth, bannerH).fillColor('#fef3c7').fill();
    doc.rect(leftX, curY, contentWidth, bannerH).lineWidth(includeHeader ? 0.8 : 1.2).strokeColor(includeHeader ? '#d4af37' : '#000000').stroke();

    doc.fillColor(includeHeader ? '#78350f' : '#000000').font('Helvetica-Bold').fontSize(includeHeader ? 9 : 9.5);
    doc.text(`TOKEN: ${request.tokenNumber}`, leftX + 10, curY + 5.5, { width: 190, lineBreak: false });
    doc.text(`DATE: ${dateDisplay}   TIME: ${timeDisplay}`, leftX + 210, curY + 5.5, {
      width: contentWidth - 220,
      align: 'right',
      lineBreak: false,
    });

    curY += bannerH + 6;

    // 3. Columns Layout (Fallback for manual entries):
    // If includeHeader (Digital Certificate): Centered Full Width (no calculation box)
    // If !includeHeader (Preprinted stationery): Left ~60% (320 pt), Right ~40% (213.28 pt) calculation box
    const col1W = includeHeader ? contentWidth : 300;
    const gap = 12;
    const col2X = leftX + 300 + gap;
    const col2W = contentWidth - 300 - gap;

    // Heights inside Column 1 - Compact proportions that gracefully fit within A5 sheet
    const row1H = includeHeader ? 88 : 80;
    const row2H = includeHeader ? 128 : 116;
    const row3H = includeHeader ? 34 : 30;
    const rowGap = includeHeader ? 7 : 6;
    const totalColH = row1H + rowGap + row2H + rowGap + row3H;

    // ----------------------------------------------------
    // MAIN CONTENT AREA
    // ----------------------------------------------------
    let leftCurY = curY;

    // ROW 1: Two side-by-side sub-sections (Customer vs Item/Weight)
    const subColW = (col1W - (includeHeader ? 12 : 8)) / 2;
    const subCol2X = leftX + subColW + (includeHeader ? 12 : 8);

    // Sub-section 1: Customer Details
    doc.rect(leftX, leftCurY, subColW, row1H).fillColor(includeHeader ? '#f8fafc' : '#ffffff').fill();
    doc.rect(leftX, leftCurY, subColW, row1H).lineWidth(includeHeader ? 0.75 : 1.2).strokeColor(includeHeader ? '#cbd5e1' : '#000000').stroke();

    doc.fillColor(includeHeader ? '#64748b' : '#000000').font('Helvetica-Bold').fontSize(includeHeader ? 7.5 : 8);
    doc.text('CUSTOMER DETAILS', leftX + 8, leftCurY + 8, { width: subColW - 16, lineBreak: false });

    const custName = (request.customerNameSnapshot || 'Valued Customer').toUpperCase();
    doc.fillColor(includeHeader ? '#0f172a' : '#000000').font('Helvetica-Bold').fontSize(custName.length > 18 ? (includeHeader ? 10 : 10.5) : (includeHeader ? 11 : 11.5));
    doc.text(custName, leftX + 8, leftCurY + 22, { width: subColW - 16, lineBreak: false, ellipsis: true });

    let custNextY = leftCurY + 38;
    if (request.jewellerName) {
      doc.fillColor(includeHeader ? '#b45309' : '#000000').font('Helvetica-Bold').fontSize(includeHeader ? 9 : 9.5);
      doc.text(`M/s: ${request.jewellerName}`, leftX + 8, custNextY, { width: subColW - 16, lineBreak: false, ellipsis: true });
      custNextY += 14;
    }

    doc.fillColor(includeHeader ? '#475569' : '#000000').font(includeHeader ? 'Helvetica' : 'Helvetica-Bold').fontSize(includeHeader ? 8 : 8.5);
    doc.text(`Ph: ${request.phoneSnapshot || 'N/A'}`, leftX + 8, custNextY, { width: subColW - 16, lineBreak: false });
    custNextY += 12;
    doc.text(`ID: ${String(request.customerId || 'REGULAR')}`, leftX + 8, custNextY, { width: subColW - 16, lineBreak: false, ellipsis: true });

    // Sub-section 2: Item & Metal Details
    doc.rect(subCol2X, leftCurY, subColW, row1H).fillColor(includeHeader ? '#f8fafc' : '#ffffff').fill();
    doc.rect(subCol2X, leftCurY, subColW, row1H).lineWidth(includeHeader ? 0.75 : 1.2).strokeColor(includeHeader ? '#cbd5e1' : '#000000').stroke();

    doc.fillColor(includeHeader ? '#64748b' : '#000000').font('Helvetica-Bold').fontSize(includeHeader ? 7.5 : 8);
    doc.text('ITEM & METAL DETAILS', subCol2X + 8, leftCurY + 8, { width: subColW - 16, lineBreak: false });

    doc.fillColor(includeHeader ? '#0f172a' : '#000000').font('Helvetica-Bold').fontSize(includeHeader ? 11 : 11.5);
    doc.text(request.item, subCol2X + 8, leftCurY + 22, { width: subColW - 16, lineBreak: false, ellipsis: true });

    const metalStr = ((request as any).metalType || 'GOLD').toUpperCase();
    const metalColor = includeHeader ? (isSilver ? '#475569' : '#b45309') : '#000000';

    // Metal badge
    doc.fillColor(metalColor).font('Helvetica-Bold').fontSize(includeHeader ? 9 : 9.5);
    doc.text(`Metal: ${metalStr}`, subCol2X + 8, leftCurY + 38, { width: subColW - 16, lineBreak: false });

    doc.fillColor(includeHeader ? '#b89324' : '#000000').font('Helvetica-Bold').fontSize(includeHeader ? 12 : 12.5);
    doc.text(`Weight: ${request.weight} ${request.weightUnit || 'g'}`, subCol2X + 8, leftCurY + 56, { width: subColW - 16, lineBreak: false });

    leftCurY += row1H + rowGap;

    // ROW 2: Full Column Width Main Readings (Purity & Karat) - Spacious, Large & High Visibility
    doc.rect(leftX, leftCurY, col1W, row2H).fillColor('#fffbeb').fill();
    doc.rect(leftX, leftCurY, col1W, row2H).lineWidth(1.5).strokeColor(includeHeader ? '#d4af37' : '#000000').stroke();

    doc.fillColor(includeHeader ? '#92400e' : '#000000').font('Helvetica-Bold').fontSize(includeHeader ? 8.5 : 9);
    doc.text('MEASURED ASSAY PURITY / TEST RESULT', leftX, leftCurY + 10, { align: 'center', width: col1W });

    // Large purity number
    doc.fillColor(includeHeader ? '#b45309' : '#000000').font('Helvetica-Bold').fontSize(includeHeader ? 34 : 36);
    doc.text(valueDisplay, leftX, leftCurY + 26, { align: 'center', width: col1W, lineBreak: false });

    if (karatVal) {
      doc.fillColor(includeHeader ? '#78350f' : '#000000').font('Helvetica-Bold').fontSize(includeHeader ? 14 : 15);
      doc.text(`KARAT: ${karatVal} K`, leftX, leftCurY + 68, { align: 'center', width: col1W, lineBreak: false });
      doc.fillColor(includeHeader ? '#059669' : '#000000').font('Helvetica-Bold').fontSize(includeHeader ? 8.5 : 9);
      doc.text(`STATUS: ${request.status} • VERIFIED & ISSUED`, leftX, leftCurY + 88, { align: 'center', width: col1W });
    } else {
      doc.fillColor(includeHeader ? '#059669' : '#000000').font('Helvetica-Bold').fontSize(includeHeader ? 9 : 9.5);
      doc.text(`STATUS: ${request.status} • VERIFIED & ISSUED`, leftX, leftCurY + 76, { align: 'center', width: col1W });
    }

    leftCurY += row2H + rowGap;

    // ROW 3: Exact 2-Line Disclaimer Note
    doc.rect(leftX, leftCurY, col1W, row3H).lineWidth(includeHeader ? 0.75 : 1).strokeColor(includeHeader ? '#4B5563' : '#000000').stroke();

    doc.font('Helvetica-Bold').fontSize(includeHeader ? 7.5 : 8).fillColor(includeHeader ? '#111827' : '#000000');
    doc.text(
      'Note : This Report of Jewellery item is based on skin test only.',
      leftX,
      leftCurY + 7,
      { width: col1W, align: 'center' }
    );
    doc.text(
      'After melting we are not responsible for the same report.',
      leftX,
      leftCurY + 19,
      { width: col1W, align: 'center' }
    );

    // ----------------------------------------------------
    // COLUMN 2: RIGHT ~40% (CUSTOMER CALCULATION SPACE)
    // Drawn ONLY for pre-printed physical paper printing (!includeHeader)
    // Omitted for digital reports with header (centered full-width layout)
    // ----------------------------------------------------
    if (!includeHeader) {
      doc.rect(col2X, curY, col2W, totalColH).fillColor('#ffffff').fill();
      // No dashed/dotted border! Clean white space for customer calculations

      // Calculation Header Box
      const calcHeaderH = 22;
      doc.rect(col2X, curY, col2W, calcHeaderH).fillColor('#f1f5f9').fill();
      doc.rect(col2X, curY, col2W, calcHeaderH).lineWidth(1.2).strokeColor('#000000').stroke();

      doc.fillColor('#000000').font('Helvetica-Bold').fontSize(8.5);
      doc.text('CUSTOMER / JEWELLER CALCULATIONS', col2X, curY + 7, { width: col2W, align: 'center', lineBreak: false });
    }

    doc.end();
  });
}
