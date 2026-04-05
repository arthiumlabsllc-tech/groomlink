import http from 'k6/http';
import { check, sleep } from 'k6';
import { CONFIG } from './config.js';

// Smoke test - minimal load to verify system works
export const options = {
  vus: CONFIG.VUS.SMOKE,
  duration: CONFIG.DURATION.SMOKE,
  thresholds: CONFIG.THRESHOLDS,
};

const BASE_URL = CONFIG.BASE_URL;

export default function () {
  // Test health endpoint
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    'health status is 200': (r) => r.status === 200,
    'health response time < 500ms': (r) => r.timings.duration < 500,
  });

  // Test get salons (public endpoint)
  const salonsRes = http.get(`${BASE_URL}/salons?page=1&limit=10`);
  check(salonsRes, {
    'salons status is 200': (r) => r.status === 200,
    'salons response has data': (r) => {
      const body = JSON.parse(r.body);
      return body.success === true && Array.isArray(body.data);
    },
  });

  sleep(1);
}
