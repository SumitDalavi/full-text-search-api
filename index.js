const express = require('express');
const { Pool } = require('pg');
const pool = new Pool();
const app = express();

app.get('/search', async (req, res) => {
    const { q } = req.query;
    // Uses Postgres GIN index with tsvector for high-performance lexeme search and rank scoring
    const result = await pool.query(`
        SELECT id, title, ts_rank(document_vector, plainto_tsquery($1)) as rank
        FROM articles
        WHERE document_vector @@ plainto_tsquery($1)
        ORDER BY rank DESC LIMIT 20
    `, [q]);
    res.json(result.rows);
});
if (require.main === module) {
    app.listen(3000, () => console.log('Search API on port 3000'));
}
module.exports = { app, pool };
