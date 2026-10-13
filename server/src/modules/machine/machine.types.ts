import { ElementBreakdown } from '../../types/index.js';

export interface IngestReadingInput {
  stationId: string;
  tokenNumber?: string;
  tagId?: string;
  readingNumber?: string;
  purityPercent: number; // Gold purity % (e.g. 87.45)
  karat?: number;        // e.g. 20.99
  elements?: ElementBreakdown; // Full element analysis
  autoComplete?: boolean; // Default true: completes test and dispatches WhatsApp
  measuredAt?: string;
  rawExport?: string;
}

export interface MachineStationHeartbeatInput {
  stationId: string;
  stationName?: string;
  softwareVersion?: string; // e.g. "WinFTM 6.4.1"
  status: 'ONLINE' | 'TESTING' | 'IDLE' | 'ERROR';
  lastMeasurementTime?: string;
}

export interface CaptureReportInput {
  stationId: string;
  branch: string;
  tokenNumber?: string;
  tagId?: string;
  testRequestId?: string;
  purityPercent?: number;
  karat?: number;
  reportImageBase64: string; // Base64 encoded PNG of the captured WinFTM report
  readingNumber?: string;
  operatorNotes?: string;
}
