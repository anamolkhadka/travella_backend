import request from 'supertest';
import { expect } from 'chai';
import app from '../server.js';

describe('Local Recommendation Routes', function () {
    this.timeout(50000); // API requests may take time

    // Test GET /api/recommend/city/:location
    it('should return recommendations for a city', async () => {
        const res = await request(app)
            .get('/api/recommend/city/Austin');

        expect(res.status).to.equal(200);
        expect(res.body).to.be.an('array');
    });

    // Test POST /api/recommend/user-preferences
    it('should return recommendations based on user preferences', async () => {
        const res = await request(app)
            .post('/api/recommend/user-preferences')
            .send({
            location: 'Austin',
            preferences: 'vegan restaurants'
            });

        expect(res.status).to.equal(200);
        expect(res.body).to.be.an('array');
    });

    // Test failure for missing fields
    it('should return 500 if preferences or location is invalid', async () => {
        const res = await request(app)
            .post('/api/recommend/user-preferences')
            .send({}); // Missing location and preferences

        expect(res.status).to.be.oneOf([400, 500]);
    });
});
