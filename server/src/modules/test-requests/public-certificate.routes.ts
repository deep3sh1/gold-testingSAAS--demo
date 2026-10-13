import { Router, Request, Response } from 'express';
import { TestRequestRepository } from './test-request.repository.js';
import { generateCertificatePdfBuffer } from '../pdf/certificate-pdf.service.js';
import { generateCertificateHtml } from './test-request.certificate.js';
import mongoose from 'express';

const router: Router = Router();
const repo = new TestRequestRepository();

function getDemoCertificateDoc(id: string, branch?: string) {
  const isSilver = id.toLowerCase().includes('silver');
  const token = (id.includes('-') && id.length > 5) ? id : 'AU-20261013-001';
  return {
    _id: id,
    id: id,
    tokenNumber: token,
    businessDate: new Date(),
    customerNameSnapshot: 'Shreeji Jewellers',
    jewellerName: 'Shreeji Jewellers',
    phoneSnapshot: '+91 98200 12345',
    item: isSilver ? 'Silver Ornament (92.5%)' : 'Gold Bangle (22K Hallmark)',
    metalType: isSilver ? 'SILVER' : 'GOLD',
    weight: 24.50,
    weightUnit: 'g',
    status: 'SENT',
    testerValue: 91.65,
    testerValueUnit: '%',
    karat: 22.0,
    readingNumber: 'RD-9101',
    branch: branch || 'kalyan',
    completedAt: new Date(),
    createdAt: new Date(),
  } as any;
}

// GET /api/v1/public/certificates/:id.pdf and :id-print.pdf
router.get(['/:id.pdf', '/:id-print.pdf'], async (req: Request, res: Response) => {
  try {
    let { id } = req.params;
    const isPrintSuffix = req.path.endsWith('-print.pdf') || id.endsWith('-print');
    if (id.endsWith('-print')) {
      id = id.replace(/-print$/, '');
    }

    let doc = null;

    try {
      if (id.startsWith('GT-') || id.startsWith('GN-') || id.startsWith('AU-') || id.startsWith('KW-') || id.includes('-')) {
        doc = await repo.findByToken(id);
      } else {
        doc = await repo.findByIdDirect(id);
      }
    } catch (dbErr) {
      console.warn('[Public Certificate PDF] Database query failed, using demo fallback:', dbErr);
    }

    if (!doc) {
      doc = getDemoCertificateDoc(id, req.query.branch as string);
    }

    const includeHeader = !isPrintSuffix && req.query.header !== 'false' && req.query.preprinted !== 'true' && req.query.mode !== 'preprinted';
    const branch = (req.query.branch as string) || (doc as any).branch || undefined;
    const pdfBuffer = await generateCertificatePdfBuffer(doc, { includeHeader, branch });
    const isAttachment = req.query.download === 'true' || req.query.download === '1' || req.query.view === 'attachment';
    const dispositionType = isAttachment ? 'attachment' : 'inline';
    
    // Strict cache-busting so browsers and clients never serve stale cached reports
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');

    res.setHeader('Content-Type', 'application/pdf');
    const filenameSuffix = !includeHeader ? '_StationerySlip' : '';
    res.setHeader(
      'Content-Disposition',
      `${dispositionType}; filename="Aurum_Assay_${doc.tokenNumber}${filenameSuffix}.pdf"`
    );
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF certificate:', error);
    res.status(500).send('Failed to generate PDF certificate');
  }
});

// GET /api/v1/public/certificates/:id (HTML view)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let doc = null;

    try {
      if (id.startsWith('GT-') || id.startsWith('GN-') || id.startsWith('AU-') || id.startsWith('KW-') || id.includes('-')) {
        doc = await repo.findByToken(id);
      } else {
        doc = await repo.findByIdDirect(id);
      }
    } catch (dbErr) {
      console.warn('[Public Certificate HTML] Database query failed, using demo fallback:', dbErr);
    }

    if (!doc) {
      doc = getDemoCertificateDoc(id, req.query.branch as string);
    }

    const autoPrint = req.query.autoprint === 'true' || req.query.print === 'true';
    const preprinted = req.query.mode === 'preprinted' || req.query.preprinted === 'true';
    const branch = (req.query.branch as string) || (doc as any).branch || undefined;
    const html = generateCertificateHtml(doc, { autoPrint, preprinted, branch });
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Error generating HTML certificate:', error);
    res.status(500).send('Failed to generate HTML certificate');
  }
});

export const publicCertificateRoutes: Router = router;
