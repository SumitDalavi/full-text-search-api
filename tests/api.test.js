const request = require('supertest');

jest.mock('pg', () => {
    const mPool = {
        query: jest.fn(),
    };
    return { Pool: jest.fn(() => mPool) };
});

const { app, pool } = require('../index');

describe('Full Text Search API', () => {
    it('should search for articles', async () => {
        pool.query.mockResolvedValueOnce({
            rows: [
                { id: 1, title: 'Learn Postgres Search', rank: 0.98 },
                { id: 2, title: 'Advanced Full Text Search', rank: 0.85 }
            ]
        });

        const res = await request(app).get('/search?q=postgres');
        
        expect(res.statusCode).toEqual(200);
        expect(res.body.length).toEqual(2);
        expect(res.body[0].title).toEqual('Learn Postgres Search');
        expect(pool.query).toHaveBeenCalledWith(
            expect.stringContaining('SELECT id, title, ts_rank'),
            ['postgres']
        );
    });
});
