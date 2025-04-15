import request from 'supertest';
import { expect } from 'chai';
import app from '../server.js';

// Replace with a valid user ID that exists in your database
const testUserId = 'aTCkVaLlnI8j7ffsrfrC';

describe('Expense Routes', function () {
    this.timeout(50000); // API requests may take time
    // Test POST /api/expense
    it('should return 400 if required fields are missing', async () => {
        const res = await request(app)
            .post('/api/expense')
            .send({ userId: testUserId, amount: "$100" }); // missing category and vendor

        expect(res.status).to.equal(400);
        expect(res.body).to.have.property('error');
    });

    it('should create a new expense', async () => {
        const res = await request(app)
            .post('/api/expense')
            .send({
            userId: testUserId,
            amount: "$200",
            category: "Hotel",
            vendor: "Hilton"
            });

        expect(res.status).to.equal(201);
        expect(res.body).to.have.property('id');
    });

    // Test GET /api/expense/:userId
    it('should return all expenses for the user', async () => {
        const res = await request(app).get(`/api/expense/${testUserId}`);

        expect(res.status).to.equal(200);
        expect(res.body).to.be.an('array');
        if (res.body.length > 0) {
            expect(res.body[0]).to.have.property('userId', testUserId);
        }
    });
});
