import request from 'supertest';
import { expect } from 'chai';
import app from '../server.js';

// Test for the Flight Search API
describe('Flight Search Routes', function () {
    this.timeout(10000); // Shared timeout for all tests in this block. 10 seconds.

    it('returns 400 on missing params', async () => {
        const res = await request(app).get('/api/booking/flights/search');
        expect(res.status).to.equal(400);
        expect(res.body).to.have.property('error');
    });

    it('should return 200 on valid query params', async () => {
        const res = await request(app).get('/api/booking/flights/search')
            .query({ origin: 'DAL', destination: 'LAX', departureDate: '2025-10-20', adults: 1 });
        expect(res.status).to.equal(200);
        expect(res.body).to.have.property('data');
    });
});
