// src/__tests__/api.test.ts

import request from 'supertest';
import app from '../index'; // Import your express app
import db from '../db';
import path from 'path';
import fs from 'fs';

// Helper to get the absolute path to the test file
const testFilePath = path.resolve(__dirname, '../../openapi.yaml');

describe('Schema API', () => {
  // Before each test, we'll clean the database to ensure a fresh start
  beforeEach(() => {
    db.exec('DELETE FROM schema_version');
    db.exec('DELETE FROM service');
    db.exec('DELETE FROM application');
  });

  // Clean up the created schema files after all tests are done
  afterAll(() => {
    const schemasDir = path.resolve(__dirname, '../../data/schemas/test-app');
    if (fs.existsSync(schemasDir)) {
      fs.rmSync(schemasDir, { recursive: true, force: true });
    }
  });

  describe('POST /upload', () => {
    it('should upload a schema for a new application and return version 1', async () => {
      const res = await request(app)
        .post('/upload')
        .field('application', 'test-app')
        .attach('file', testFilePath);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('message', 'File uploaded successfully');
      expect(res.body.application).toBe('test-app');
      expect(res.body.version).toBe(1);
    });

    it('should increment the version for a subsequent upload', async () => {
      // First upload
      await request(app)
        .post('/upload')
        .field('application', 'test-app')
        .attach('file', testFilePath);

      // Second upload
      const res = await request(app)
        .post('/upload')
        .field('application', 'test-app')
        .attach('file', testFilePath);

      expect(res.statusCode).toEqual(200);
      expect(res.body.version).toBe(2);
    });

    it('should return a 400 error if the application name is missing', async () => {
      const res = await request(app)
        .post('/upload')
        .attach('file', testFilePath);

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('error', 'application is required');
    });
  });

  describe('GET /schema', () => {
    // Before testing GET, we need to upload some schemas
    beforeEach(async () => {
      // Version 1
      await request(app)
        .post('/upload')
        .field('application', 'test-app')
        .attach('file', testFilePath);
      // Version 2
      await request(app)
        .post('/upload')
        .field('application', 'test-app')
        .attach('file', testFilePath);
    });

    it('should retrieve the latest schema when no version is specified', async () => {
      const res = await request(app).get('/schema?application=test-app');
      expect(res.statusCode).toEqual(200);
      expect(res.body.version).toBe(2);
      expect(res.body).toHaveProperty('spec');
    });

    it('should retrieve a specific version of a schema', async () => {
      const res = await request(app).get('/schema?application=test-app&version=1');
      expect(res.statusCode).toEqual(200);
      expect(res.body.version).toBe(1);
    });

    it('should return a 404 error if the application is not found', async () => {
      const res = await request(app).get('/schema?application=non-existent-app');
      expect(res.statusCode).toEqual(404);
    });
  });
});