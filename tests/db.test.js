const db = require('../src/db');

describe('Database Initialization & Seeding Tests', () => {
    beforeAll(async () => {
        await db.initPromise;
    }, 30000);

    test('Should fetch seeded users', (done) => {
        db.all('SELECT * FROM users', [], (err, rows) => {
            expect(err).toBeNull();
            expect(rows.length).toBeGreaterThanOrEqual(4);
            
            const usernames = rows.map(r => r.username);
            expect(usernames).toContain('customer1');
            expect(usernames).toContain('rdc1');
            expect(usernames).toContain('driver1');
            expect(usernames).toContain('manager1');
            done();
        });
    });

    test('Should fetch seeded products', (done) => {
        db.all('SELECT * FROM products', [], (err, rows) => {
            expect(err).toBeNull();
            expect(rows.length).toBeGreaterThanOrEqual(13);
            
            const productNames = rows.map(r => r.name);
            expect(productNames).toContain('Tikiri Marie (80g)');
            expect(productNames).toContain('Coca Cola (1.5L)');
            done();
        });
    });

    test('Should have multi-center inventory records', (done) => {
        db.all('SELECT DISTINCT rdc_location FROM inventory', [], (err, rows) => {
            expect(err).toBeNull();
            const locations = rows.map(r => r.rdc_location);
            expect(locations).toContain('Central RDC');
            expect(locations).toContain('Colombo North');
            expect(locations).toContain('Galle RDC');
            expect(locations).toContain('Kandy RDC');
            done();
        });
    });
});
