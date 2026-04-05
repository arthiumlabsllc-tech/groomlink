import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { CONFIG, getRandomUser } from './config.js';

// Load test - simulate normal traffic
export const options = {
  stages: [
    { duration: '2m', target: 10 },   // Ramp up
    { duration: '5m', target: 50 },   // Stay at normal load
    { duration: '2m', target: 10 },   // Ramp down
    { duration: '1m', target: 0 },    // Cool down
  ],
  thresholds: CONFIG.THRESHOLDS,
};

const BASE_URL = CONFIG.BASE_URL;

export default function () {
  group('Public Endpoints', () => {
    // Get salons list
    const salonsRes = http.get(`${BASE_URL}/salons?page=1&limit=20`);
    check(salonsRes, {
      'GET /salons status is 200': (r) => r.status === 200,
    });

    // Get nearby salons
    const nearbyRes = http.get(`${BASE_URL}/salons/nearby?lat=5.6037&lng=-0.1870&radius=5000`);
    check(nearbyRes, {
      'GET /salons/nearby status is 200': (r) => r.status === 200,
    });

    sleep(1);
  });

  group('Authentication Flow', () => {
    const user = getRandomUser();
    
    // Request OTP
    const otpRes = http.post(`${BASE_URL}/auth/otp/request`, JSON.stringify({
      phoneNumber: user.phone,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
    check(otpRes, {
      'POST /auth/otp/request status is 200': (r) => r.status === 200,
    });

    sleep(2);

    // Verify OTP
    const verifyRes = http.post(`${BASE_URL}/auth/otp/verify`, JSON.stringify({
      phoneNumber: user.phone,
      otp: user.otp,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
    check(verifyRes, {
      'POST /auth/otp/verify status is 200': (r) => r.status === 200,
    });

    sleep(1);
  });

  group('Booking Flow', () => {
    // Get salon details
    const salonRes = http.get(`${BASE_URL}/salons/test-salon-id`);
    check(salonRes, {
      'GET /salons/:id status is 200': (r) => r.status === 200,
    });

    // Get salon services
    const servicesRes = http.get(`${BASE_URL}/salons/test-salon-id/services`);
    check(servicesRes, {
      'GET /salons/:id/services status is 200': (r) => r.status === 200,
    });

    sleep(1);
  });
}
