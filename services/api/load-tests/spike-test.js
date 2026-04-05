import http from 'k6/http';
import { check, sleep } from 'k6';
import { CONFIG } from './config.js';

// Spike test - sudden traffic surge
export const options = {
  stages: [
    { duration: '1m', target: 10 },     // Baseline
    { duration: '30s', target: 1000 },  // Sudden spike
    { duration: '2m', target: 1000 },   // Stay at spike
    { duration: '30s', target: 10 },    // Quick recovery
    { duration: '1m', target: 10 },     // Verify recovery
    { duration: '30s', target: 0 },     // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // Very lenient for spike
    http_req_failed: ['rate<0.10'],    // Allow up to 10% errors during spike
  },
};

const BASE_URL = CONFIG.BASE_URL;

export default function () {
  // Focus on critical endpoints during spike
  const res = http.get(`${BASE_URL}/salons?page=1&limit=10`);
  
  check(res, {
    'system remains available': (r) => r.status !== 503,
    'response received': (r) => r.status !== 0,
  });

  sleep(0.5);
}
