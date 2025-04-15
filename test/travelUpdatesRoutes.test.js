import request from 'supertest';
import { expect } from 'chai';
import app from '../server.js';

describe('Travel Updates API', function () {

    describe('POST /travel-updates/weather', () => {
        this.timeout(20000);
        it('should return 400 if required fields are missing', async () => {
            const res = await request(app)
                .post('/travel-updates/weather')
                .send({ city: 'Dallas' }); // missing country

            expect(res.status).to.equal(400);
            expect(res.body).to.have.property('error');
        });

        it('should return 200 and weather data for valid request', async () => {
            const res = await request(app)
                .post('/travel-updates/weather')
                .send({ city: 'Dallas', country: 'US' });

            expect(res.status).to.equal(200);
            expect(res.body).to.have.property('main');
        });
    });

    describe('POST /travel-updates/flight', () => {
        this.timeout(20000);
        it('should return 400 if required fields are missing', async () => {
            const res = await request(app)
                .post('/travel-updates/flight')
                .send({ flightNumber: 'AA100' }); // missing date, from, to

            expect(res.status).to.equal(400);
            expect(res.body).to.have.property('error');
        });

        it('should return 200 and flight data for valid request', async () => {
            const res = await request(app)
              .post('/travel-updates/flight')
              .send({
                flightNumber: 'DAL839',
                date: '2025-04-14',
                from: 'DFW',
                to: 'ATL'
              });
      
            expect(res.status).to.equal(200);
            expect(res.body).to.have.property('flights');
          });
    });
});
