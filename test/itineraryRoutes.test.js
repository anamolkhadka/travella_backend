import request from 'supertest';
import { expect } from 'chai';
import app from '../server.js';

describe('Itinerary Routes', function () {
    this.timeout(20000); // Shared timeout for all tests in this block. 10 seconds.

    const sampleCreatePayload = {
        userId: "aTCkVaLlnI8j7ffsrfrC",
        destination: "New York",
        startDate: "2025-05-10",
        endDate: "2025-05-15",
        preferences: ["museums", "parks", "food"],
        activities: ["Visit Central Park", "Explore The Met"]
    };

    const sampleGeneratePayload = {
        userId: "aTCkVaLlnI8j7ffsrfrC",
        destination: "Paris",
        startDate: "2025-06-01",
        endDate: "2025-06-03",
        preferences: ["culture", "food", "sightseeing"]
    };

    it('should create a manual itinerary (POST /create)', async () => {
        const res = await request(app)
            .post('/itinerary/create')
            .send(sampleCreatePayload);

        expect(res.status).to.equal(201);
        expect(res.body).to.have.property('message', 'Itinerary created');
        expect(res.body).to.have.property('id');
    });

    it('should generate an AI itinerary (POST /generate)', async () => {
        const res = await request(app)
            .post('/itinerary/generate')
            .send(sampleGeneratePayload);

        expect(res.status).to.equal(201);
        expect(res.body).to.have.property('message', 'AI-generated itinerary created');
        expect(res.body).to.have.property('id');
        expect(res.body).to.have.property('activities');
        expect(res.body.activities).to.be.an('array');
    });
});
