const express = require('express');
const { Pool } = require('pg');
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 3000;

// Conexão com o Banco de Dados PostgreSQL no Render
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(express.json());

// Recria a tabela corretamente garantindo todas as colunas necessárias
async function initDb() {
  try {
    await pool.query(`DROP TABLE IF EXISTS historico_precos;`);
    await pool.query(`
      CREATE TABLE historico_precos (
        id SERIAL PRIMARY KEY,
        url_produto TEXT NOT NULL,
        preco NUMERIC(10,2) NOT NULL,
        data_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        origem_dados VARCHAR(50) DEFAULT 'Auditado/Manual'
      );
    `);
    console.log('Tabela historico_precos recriada com sucesso.');
  } catch (err) {
    console.error('Erro ao inicializar o banco de dados:', err.message);
  }
}
initDb();

// Rota para salvar novo registro de preço
app.post('/api/registrar', async (req, res) => {
  try {
    let { url, preco } = req.body;
    if (!url || !preco) {
      return res.status(400).json({ error: 'URL e Preço são obrigatórios.' });
    }

    url = String(url).trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    const precoFormatado = String(preco).replace(',', '.');

    const query = `
      INSERT INTO historico_precos (url_produto, preco)
      VALUES ($1, $2)
      RETURNING *;
    `;
    const values = [url, parseFloat(precoFormatado)];
    const result = await pool.query(query, values);

    res.json({ success: true, registro: result.rows[0] });
  } catch (err) {
    console.error('Erro detalhado no banco de dados:', err);
    res.status(500).json({ error: 'Erro no Banco: ' + (err.message || 'Erro desconhecido') });
  }
});

// Rota para consultar o histórico de um link
app.get('/api/historico', async (req, res) => {
  try {
    let { url } = req.query;
    if (!url) {
      return res.status(400).json({ error: 'URL do produto é obrigatória.' });
    }

    url = String(url).trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    const query = `
      SELECT * FROM historico_precos
      WHERE url_
