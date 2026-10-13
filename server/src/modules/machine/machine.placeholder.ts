/**
 * Machine Module (Architectural Placeholder)
 *
 * Future integration module for Fischer WinFTM & GOLDSCOPE SD 520 / 550 devices.
 * In the MVP phase, all testing operates via manual Tester entry (testerValue).
 *
 * Refer to docs/future-machine-integration.md for technical details and roadmap.
 */

export interface FutureMachineTelemetryPayload {
  machineSerial: string;
  stationId: string;
  status: 'ONLINE' | 'CALIBRATING' | 'TESTING' | 'OFFLINE';
  lastMeasurementTime?: string;
}

export class MachineModulePlaceholder {
  static getModuleStatus() {
    return {
      status: 'PLACEHOLDER_NOT_IMPLEMENTED',
      message: 'Machine integration is scheduled for future phase. Refer to docs/future-machine-integration.md',
    };
  }
}
