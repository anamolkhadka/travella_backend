import request from 'supertest';
import { expect } from 'chai';
import app from '../server.js';

describe('Hotel Search Routes', function () {
    this.timeout(20000); // Increase timeout for API responses

    it('returns 400 if required query params are missing', async () => {
        const res = await request(app).get('/api/hotel/hotels/search');
        expect(res.status).to.equal(400);
        expect(res.body).to.have.property('error');
    });

    it('returns 200 and data when query params are valid', async () => {
        const res = await request(app).get('/api/hotel/hotels/search')
            .query({
            location: 'Austin',
            checkin_date: '2025-10-20',
            checkout_date: '2025-10-25',
            adults: 1
            });

        expect(res.status).to.equal(200);
        expect(res.body).to.have.property('data');
        expect(res.body.data).to.be.an('array');
  });
});
