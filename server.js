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
    // Apaga a tabela antiga se houver conflito de colunas e cria a nova limpa
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

    // Corrige vírgula para ponto caso o usuário digite o preço com vírgula (ex: 599,99)
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
      WHERE url_produto = $1
      ORDER BY data_registro ASC;
    `;
    const result = await pool.query(query, [url]);
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar histórico:', err);
    res.status(500).json({ error: 'Erro ao consultar banco de dados: ' + err.message });
  }
});

// Rota para gerar o Laudo de Auditoria com Hash SHA-256
app.get('/api/laudo', async (req, res) => {
  try {
    let { url } = req.query;
    if (!url) {
      return res.status(400).json({ error: 'URL do produto é obrigatória para o laudo.' });
    }

    url = String(url).trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    const query = `
      SELECT * FROM historico_precos
      WHERE url_produto = $1
      ORDER BY data_registro ASC;
    `;
    const result = await pool.query(query, [url]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Nenhum histórico registrado para este link.' });
    }

    const registros = result.rows;
    const dataEmissao = new Date().toISOString();

    const dadosHash = JSON.stringify({ url, registros, dataEmissao });
    const hashAutenticidade = crypto.createHash('sha256').update(dadosHash).digest('hex');

    res.json({
      titulo: "LAUDO DE AUDITORIA DE PREÇOS E INTEGRIDADE DIGITAL",
      plataforma: "RadarBlack — Monitoramento e Validação Anti-Fraude",
      dataEmissao,
      urlProduto: url,
      hashAutenticidade,
      totalRegistros: registros.length,
      historico: registros.map(r => ({
        data: r.data_registro,
        preco: r.preco,
        fonte: r.origem_dados || 'Auditado/Manual'
      }))
    });
  } catch (err) {
    console.error('Erro ao gerar laudo:', err);
    res.status(500).json({ error: 'Erro ao gerar laudo de auditoria: ' + err.message });
  }
});

// Rota Principal — Serve a interface gráfica do RadarBlack
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>RadarBlack — Auditoria e Inteligência de Preços</title>
      <style>
        * { box-sizing: border-box; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        body { background-color: #0b0f19; color: #f3f4f6; margin: 0; padding: 40px 20px; display: flex; flex-direction: column; align-items: center; }
        .container { max-width: 650px; width: 100%; background: #111827; border: 1px solid #1f2937; padding: 30px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
        .logo { text-align: center; font-size: 28px; font-weight: bold; margin-bottom: 5px; color: #38bdf8; }
        .subtitle { text-align: center; color: #9ca3af; font-size: 13px; margin-bottom: 30px; }
        .form-group { margin-bottom: 20px; }
        label { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #9ca3af; margin-bottom: 6px; font-weight: 600; }
        input { width: 100%; padding: 12px; background: #0b0f19; border: 1px solid #374151; border-radius: 6px; color: #fff; font-size: 14px; }
        input:focus { outline: none; border-color: #38bdf8; }
        .btn-main { width: 100%; padding: 14px; background: #0284c7; color: white; border: none; border-radius: 6px; font-weight: bold; font-size: 14px; cursor: pointer; text-transform: uppercase; margin-top: 10px; transition: background 0.2s; }
        .btn-main:hover { background: #0369a1; }
        .btn-laudo { width: 100%; padding: 12px; background: #059669; color: white; border: none; border-radius: 6px; font-weight: bold; font-size: 13px; cursor: pointer; text-transform: uppercase; margin-top: 15px; display: none; }
        .btn-laudo:hover { background: #047857; }
        .status-box { margin-top: 20px; padding: 15px; border-radius: 6px; font-size: 13px; display: none; word-break: break-word; }
        .status-success { background: #064e3b; color: #a7f3d0; border: 1px solid #059669; }
        .status-error { background: #7f1d1d; color: #fecaca; border: 1px solid #dc2626; }
        .historico-list { margin-top: 25px; border-top: 1px solid #1f2937; padding-top: 15px; }
        .historico-item { display: flex; justify-content: space-between; padding: 8px 0; border
