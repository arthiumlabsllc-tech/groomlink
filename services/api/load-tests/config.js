// K6 Load Testing Configuration
export const CONFIG = {
  // Base URL for API
  BASE_URL: __ENV.BASE_URL || 'http://localhost:3000/api',
  
  // Test durations
  DURATION: {
    SMOKE: '1m',
    LOAD: '5m',
    STRESS: '10m',
    SPIKE: '2m',
  },
  
  // Virtual user counts
  VUS: {
    SMOKE: 1,
    LOAD: 50,
    STRESS: 200,
    SPIKE: 1000,
  },
  
  // Thresholds
  THRESHOLDS: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],   // Less than 1% errors
    http_reqs: ['rate>100'],          // At least 100 RPS
  },
};

// Test user credentials (for load testing)
export const TEST_USERS = [
  { phone: '+233241111111', otp: '123456' },
  { phone: '+233242222222', otp: '123456' },
  { phone: '+233243333333', otp: '123456' },
];

// Helper to get random user
export function getRandomUser() {
  return TEST_USERS[Math.floor(Math.random() * TEST_USERS.length)];
}

// Helper to generate random Ghana phone number
export function generatePhoneNumber() {
  const prefix = '+23324';
  const suffix = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
  return prefix + suffix;
}
