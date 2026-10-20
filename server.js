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

// Criar tabela de histórico de preços garantindo campo TEXT para URLs longas
async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS historico_precos (
        id SERIAL PRIMARY KEY,
        url_produto TEXT NOT NULL,
        preco NUMERIC(10,2) NOT NULL,
        data_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        origem_dados VARCHAR(50) DEFAULT 'Auditado/Manual'
      );
    `);
    // Garante alteração do tipo caso a tabela antiga usasse VARCHAR limitado
    await pool.query(`ALTER TABLE historico_precos ALTER COLUMN url_produto TYPE TEXT;`).catch(() => {});
    console.log('Tabela historico_precos inicializada com sucesso.');
  } catch (err) {
    console.error('Erro ao inicializar o banco de dados:', err);
  }
}
initDb();

// Rota para salvar novo registro de preço
app.post('/api/registrar', async (req, res) => {
  try {
    const { url, preco } = req.body;
    if (!url || !preco) {
      return res.status(400).json({ error: 'URL e Preço são obrigatórios.' });
    }

    const query = `
      INSERT INTO historico_precos (url_produto, preco)
      VALUES ($1, $2)
      RETURNING *;
    `;
    const values = [String(url), parseFloat(preco)];
    const result = await pool.query(query, values);

    res.json({ success: true, registro: result.rows[0] });
  } catch (err) {
    console.error('Erro ao salvar registro:', err);
    res.status(500).json({ error: 'Erro ao salvar no banco de dados: ' + err.message });
  }
});

// Rota para consultar o histórico de um link
app.get('/api/historico', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ error: 'URL do produto é obrigatória.' });
    }

    const query = `
      SELECT * FROM historico_precos
      WHERE url_produto = $1
      ORDER BY data_registro ASC;
    `;
    const result = await pool.query(query, [String(url)]);
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar histórico:', err);
    res.status(500).json({ error: 'Erro ao consultar banco de dados.' });
  }
});

// Rota para gerar o Laudo de Auditoria com Hash SHA-256
app.get('/api/laudo', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ error: 'URL do produto é obrigatória para o laudo.' });
    }

    const query = `
      SELECT * FROM historico_precos
      WHERE url_produto = $1
      ORDER BY data_registro ASC;
    `;
    const result = await pool.query(query, [String(url)]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Nenhum histórico registrado para este link.' });
    }

    const registros = result.rows;
    const dataEmissao = new Date().toISOString();

    // Gera o Hash SHA-256 para garantir a integridade do relatório
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
    res.status(500).json({ error: 'Erro ao gerar laudo de auditoria.' });
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
        .status-box { margin-top: 20px; padding: 15px; border-radius: 6px; font-size: 13px; display: none; }
        .status-success { background: #064e3b; color: #a7f3d0; border: 1px solid #059669; }
        .status-error { background: #7f1d1d; color: #fecaca; border: 1px solid #dc2626; word-break: break-all; }
        .historico-list { margin-top: 25px; border-top: 1px solid #1f2937; padding-top: 15px; }
        .historico-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #1f2937; font-size: 13px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">🔍 RadarBlack</div>
        <div class="subtitle">Monitoramento e Auditoria Baseada em Histórico Real</div>

        <div class="form-group">
          <label>LINK DO PRODUTO NA LOJA</label>
          <input type="text" id="urlProduto" placeholder="Ex: https://www.loja.com.br/produto-123">
        </div>

        <div class="form-group">
          <label>PREÇO ATUAL VERIFICADO NA LOJA (R$)</label>
          <input type="number" step="0.01" id="precoProduto" placeholder="Ex: 2500.00">
        </div>

        <button class="btn-main" onclick="registrarEAuditar()">REGISTRAR PREÇO E AUDITAR</button>
        <button id="btnLaudo" class="btn-laudo" onclick="exportarLaudoPDF()">📄 EXPORTAR LAUDO DE AUDITORIA (PDF)</button>

        <div id="statusBox" class="status-box"></div>
        <div id="historicoBox" class="historico-list"></div>
      </div>

      <script>
        let urlAtual = '';

        async function registrarEAuditar() {
          const url = document.getElementById('urlProduto').value.trim();
          const preco = document.getElementById('precoProduto').value.trim();

          if (!url || !preco) {
            exibirStatus('Preencha o link e o preço antes de enviar.', 'error');
            return;
          }

          urlAtual = url;

          try {
            const res = await fetch('/api/registrar', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url, preco })
            });

            const data = await res.json();

            if (data.success) {
              exibirStatus('Preço registrado com sucesso no banco de dados!', 'success');
              document.getElementById('precoProduto').value = '';
              carregarHistorico(url);
            } else {
              exibirStatus(data.error || 'Erro ao registrar o preço.', 'error');
            }
          } catch (err) {
            exibirStatus('Erro de conexão com o servidor.', 'error');
          }
        }

        async function carregarHistorico(url) {
          try {
            const res = await fetch('/api/historico?url=' + encodeURIComponent(url));
            const historico = await res.json();

            const box = document.getElementById('historicoBox');
            const btnLaudo = document.getElementById('btnLaudo');

            if (Array.isArray(historico) && historico.length > 0) {
              box.innerHTML = '<strong>Histórico de Alterações Guardadas:</strong><br><br>' + 
                historico.map(h => \`
                  <div class="historico-item">
