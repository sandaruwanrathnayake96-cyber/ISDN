const request = require('supertest');
const app = require('../src/app');
const db = require('../src/db');

jest.mock('../src/utils/mailer', () => ({
    sendOrderConfirmation: jest.fn()
}));

describe('API Integration Tests', () => {
    beforeAll(async () => {
        await db.initPromise;
    }, 30000);

    // Clean up or close database connections after all tests run
    afterAll((done) => {
        db.close(done);
    });

    test('GET /api/products - Should return all products', async () => {
        const res = await request(app)
            .get('/api/products')
            .expect(200);

        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThanOrEqual(13);
        expect(res.body[0]).toHaveProperty('name');
        expect(res.body[0]).toHaveProperty('price');
    });

    test('POST /api/orders - Should create order for existing or new customer email', async () => {
        const orderData = {
            customer_email: 'new-student@uom.lk',
            customer_name: 'ASE Student',
            items: [
                { product_id: 1, quantity: 2, price: 100.00 }
            ],
            total_amount: 200.00,
            payment_method: 'Cash',
            payment_status: 'Pending',
            delivery_address: 'University of Moratuwa',
            contact_number: '0771234567'
        };

        const res = await request(app)
            .post('/api/orders')
            .send(orderData)
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body).toHaveProperty('orderId');
        expect(res.body.message).toBe('Order placed successfully');
    });

    test('GET /api/inventory - Should return inventory lists', async () => {
        const res = await request(app)
            .get('/api/inventory')
            .expect(200);

        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body[0]).toHaveProperty('product_name');
        expect(res.body[0]).toHaveProperty('quantity');
        expect(res.body[0]).toHaveProperty('rdc_location');
    });
});
