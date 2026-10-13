import { Router, Request, Response } from 'express';
import { TestRequestRepository } from './test-request.repository.js';
import { generateCertificatePdfBuffer } from '../pdf/certificate-pdf.service.js';
import { generateCertificateHtml } from './test-request.certificate.js';
import mongoose from 'express';

const router: Router = Router();
const repo = new TestRequestRepository();

// GET /api/v1/public/certificates/:id.pdf and :id-print.pdf
router.get(['/:id.pdf', '/:id-print.pdf'], async (req: Request, res: Response) => {
  try {
    let { id } = req.params;
    const isPrintSuffix = req.path.endsWith('-print.pdf') || id.endsWith('-print');
    if (id.endsWith('-print')) {
      id = id.replace(/-print$/, '');
    }

    let doc = null;

    if (id.startsWith('GT-') || id.includes('-')) {
      doc = await repo.findByToken(id);
    } else {
      doc = await repo.findByIdDirect(id);
    }

    if (!doc) {
      res.status(404).send('Certificate not found');
      return;
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

    if (id.startsWith('GT-') || id.startsWith('GN-') || id.includes('-')) {
      doc = await repo.findByToken(id);
    } else {
      doc = await repo.findByIdDirect(id);
    }

    if (!doc) {
      res.status(404).send('Certificate not found');
      return;
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
