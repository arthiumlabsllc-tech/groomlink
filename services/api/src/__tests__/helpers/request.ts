import request from 'supertest';
import express from 'express';

// Create a test app
export const createTestApp = (router: express.Router) => {
  const app = express();
  app.use(express.json());
  app.use(router);
  return app;
};

// Helper to make authenticated requests
export const authenticatedRequest = (
  app: express.Application,
  token: string
) => {
  return {
    get: (url: string) => request(app).get(url).set('Authorization', `Bearer ${token}`),
    post: (url: string) => request(app).post(url).set('Authorization', `Bearer ${token}`),
    put: (url: string) => request(app).put(url).set('Authorization', `Bearer ${token}`),
    delete: (url: string) => request(app).delete(url).set('Authorization', `Bearer ${token}`),
  };
};

export default { createTestApp, authenticatedRequest };
