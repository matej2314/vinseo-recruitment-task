import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  it('returns ok status payload', () => {
    const controller = new HealthController();
    expect(controller.getHealth()).toEqual({ status: 'ok' });
  });
});
