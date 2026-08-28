const express = require('express');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const app = express();
app.use(express.json());

let db;

async function initDb(dbPath = ':memory:') {
    db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    // Create FTS5 virtual table for high-performance text search
    // We use the porter stemmer to handle variations (e.g. "running" -> "run")
    await db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS articles_fts USING fts5(
            title, 
            body,
            tokenize='porter unicode61'
        );
    `);
}

app.post('/index', async (req, res) => {
    const { title, body } = req.body;
    if (!title || !body) {
        return res.status(400).json({ error: 'Missing title or body' });
    }

    try {
        const result = await db.run(
            'INSERT INTO articles_fts (title, body) VALUES (?, ?)',
            [title, body]
        );
        res.status(201).json({ id: result.lastID, status: 'indexed' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/search', async (req, res) => {
    const { q } = req.query;
    if (!q) {
        return res.status(400).json({ error: 'Missing search query (q)' });
    }

    try {
        // Uses SQLite FTS5 for high-performance full text search
        // - MATCH: performs the search
        // - bm25: Okapi BM25 ranking algorithm
        // - snippet: extracts a text snippet around the matched terms
        const result = await db.all(`
            SELECT 
                rowid as id,
                title,
                snippet(articles_fts, 1, '<b>', '</b>', '...', 15) as snippet,
                bm25(articles_fts) as rank
            FROM articles_fts
            WHERE articles_fts MATCH ?
            ORDER BY rank
            LIMIT 20
        `, [q]);
        
        res.json(result);
    } catch (e) {
        // Handle malformed query syntax safely
        if (e.message.includes('syntax error') || e.message.includes('unterminated string') || e.message.includes('fts5')) {
            return res.status(400).json({ error: 'Invalid search query syntax' });
        }
        res.status(500).json({ error: e.message });
    }
});

if (require.main === module) {
    initDb('search.db').then(() => {
        app.listen(3000, () => console.log('Search API on port 3000'));
    });
}

module.exports = { app, initDb, getDb: () => db };
