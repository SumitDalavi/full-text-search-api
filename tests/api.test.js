const request = require('supertest');
const { app, initDb, getDb } = require('../index');

describe('Full Text Search API', () => {
    beforeAll(async () => {
        await initDb(':memory:');
    });

    beforeEach(async () => {
        const db = getDb();
        await db.run('DELETE FROM articles_fts');
    });

    it('should index and retrieve documents accurately', async () => {
        // 1. Indexing
        await request(app).post('/index').send({
            title: 'Learning GraphQL',
            body: 'GraphQL is a query language for your API.'
        });
        
        await request(app).post('/index').send({
            title: 'Learning SQL',
            body: 'SQL is a standard language for storing, manipulating and retrieving data.'
        });

        // 2. Search
        const res = await request(app).get('/search?q=SQL');
        expect(res.statusCode).toBe(200);
        expect(res.body.length).toBe(1);
        expect(res.body[0].title).toBe('Learning SQL');
        
        // Ensure snippets work (matches are highlighted with <b> tags)
        expect(res.body[0].snippet).toContain('<b>SQL</b>');
        expect(res.body[0].rank).toBeDefined();
    });

    it('should utilize porter stemming for variations', async () => {
        await request(app).post('/index').send({
            title: 'The marathon',
            body: 'He was running very fast.'
        });

        // Search for "run" should match "running" because of the porter stemmer
        const res = await request(app).get('/search?q=run');
        expect(res.statusCode).toBe(200);
        expect(res.body.length).toBe(1);
        expect(res.body[0].snippet).toContain('<b>running</b>');
    });

    it('should gracefully handle invalid search queries', async () => {
        // SQLite FTS5 throws syntax errors on unmatched quotes or specific symbols if not properly escaped.
        // We explicitly catch this to prevent 500s.
        const res = await request(app).get('/search?q="unmatched quote');
        expect(res.statusCode).toBe(400);
        expect(res.body.error).toBe('Invalid search query syntax');
    });
});
