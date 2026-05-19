import { healthRepository } from '../repositories/health.repository.js';

export interface HealthStatus {
  status: 'ok';
  db: 'connected';
  timestamp: string;
}

export const healthService = {
  async getHealth(): Promise<HealthStatus> {
    await healthRepository.pingDatabase();
    return {
      status: 'ok',
      db: 'connected',
      timestamp: new Date().toISOString(),
    };
  },
};
