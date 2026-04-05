import http from 'k6/http';
import { check, sleep } from 'k6';
import { CONFIG } from './config.js';

// Stress test - push system to its limits
export const options = {
  stages: [
    { duration: '2m', target: 50 },    // Ramp up to normal load
    { duration: '3m', target: 100 },   // Ramp up to 2x load
    { duration: '3m', target: 200 },   // Ramp up to 4x load
    { duration: '2m', target: 300 },   // Peak load
    { duration: '3m', target: 100 },   // Ramp down
    { duration: '2m', target: 0 },     // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // More lenient for stress test
    http_req_failed: ['rate<0.05'],    // Allow up to 5% errors
  },
};

const BASE_URL = CONFIG.BASE_URL;

export default function () {
  // Mix of endpoints to stress test
  const endpoints = [
    { method: 'GET', url: `${BASE_URL}/health` },
    { method: 'GET', url: `${BASE_URL}/salons?page=1&limit=20` },
    { method: 'GET', url: `${BASE_URL}/salons/nearby?lat=5.6037&lng=-0.1870&radius=5000` },
    { method: 'GET', url: `${BASE_URL}/salons/test-salon-id` },
    { method: 'GET', url: `${BASE_URL}/salons/test-salon-id/services` },
  ];

  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  
  const res = http.request(endpoint.method, endpoint.url);
  
  check(res, {
    'status is not 5xx': (r) => r.status < 500,
    'response time < 2s': (r) => r.timings.duration < 2000,
  });

  sleep(Math.random() * 2);
}
