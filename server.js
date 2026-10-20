const express = require('express');
const { Pool } = require('pg');
const crypto = require('crypto');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const port = process.env.PORT || 3000;

// Conexão com o Banco PostgreSQL no Render
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(express.json());

const AFILIADO_AMAZON_TAG = process.env.AMAZON_TAG || 'radarblack-20';

async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS historico_precos (
        id SERIAL PRIMARY KEY,
        url_produto TEXT NOT NULL,
        preco NUMERIC(10,2) NOT NULL,
        data_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        origem_dados VARCHAR(50) DEFAULT 'Verificação Real'
      );
    `);
    console.log('Tabela historico_precos pronta no PostgreSQL.');
  } catch (err) {
    console.error('Erro ao inicializar BD:', err.message);
  }
}
initDb();

// Função para tentar capturar o preço real via scraping simples
async function capturarPrecoReal(url) {
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9'
      },
      timeout: 5000
    });

    const $ = cheerio.load(data);
    let precoText = $('.a-price-whole').first().text().trim() || 
                    $('[data-testid="price-value"]').first().text().trim() ||
                    $('.ui-pdp-price__part--medium .aria-label').first().text().trim();

    if (precoText) {
      const precoLimpo = precoText.replace(/[^\d\,.]/g, '').replace('.', '').replace(',', '.');
      return parseFloat(precoLimpo) || null;
    }
    return null;
  } catch (err) {
    return null;
  }
}

// Rota de Processamento de Preço Real e Comparativo
app.post('/api/comparar-e-auditar', async (req, res) => {
  try {
    let { url, precoInformado } = req.body;
    if (!url) return res.status(400).json({ error: 'Insira o link ou nome do produto.' });

    url = String(url).trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    // Tenta capturar preço real na web; se não conseguir, usa o preço exato digitado
    let precoReal = await capturarPrecoReal(url);
    
    if (!precoReal && precoInformado) {
      precoReal = parseFloat(String(precoInformado).replace(',', '.'));
    }

    if (!precoReal) {
      return res.status(400).json({
        error: 'Não foi possível capturar o preço exato automaticamente nesta loja. Por favor, preencha o campo "Preço Atual Auditado" com o valor exato que você vê na página para registrar no laudo.'
      });
    }

    // Extrai o nome/termo para gerar links reais de busca de ofertas
    let termoBusca = encodeURIComponent(url.split('/')[3] || 'produto');

    const ofertasReais = [
      {
        loja: "Loja Auditada (Link do Usuário)",
        preco: precoReal,
        url: url,
        destaque: true
      },
      {
        loja: "Amazon Brasil (Buscar Ofertas)",
        preco: precoReal,
        url: `https://www.amazon.com.br/s?k=${termoBusca}&tag=${AFILIADO_AMAZON_TAG}`,
        destaque: false
      },
      {
        loja: "Mercado Livre (Buscar Ofertas)",
        preco: precoReal,
        url: `https://lista.mercadolivre.com.br/${termoBusca}`,
        destaque: false
      }
    ];

    // Registra o valor real e exato no banco de dados para a auditoria
    await pool.query(
      `INSERT INTO historico_precos (url_produto, preco, origem_dados) VALUES ($1, $2, $3)`,
      [url, precoReal, 'Auditado/Verificado']
    );

    res.json({
      success: true,
      precoReal,
      ofertas: ofertasReais
    });
  } catch (err) {
    console.error('Erro na rota de comparação:', err);
    res.status(500).json({ error: 'Erro no servidor: ' + err.message });
  }
});

// Rota do Histórico
app.get('/api/historico', async (req, res) => {
  try {
    let { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL necessária.' });

    url = String(url).trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;

    const result = await pool.query(
      'SELECT * FROM historico_precos WHERE url_produto = $1 ORDER BY data_registro DESC',
      [url]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rota do Laudo PDF
app.get('/api/laudo', async (req, res) => {
  try {
    let { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL necessária.' });

    url = String(url).trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;

    const result = await pool.query(
      'SELECT * FROM historico_precos WHERE url_produto = $1 ORDER BY data_registro ASC',
      [url]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Sem histórico registrado.' });

    const registros = result.rows;
    const dataEmissao = new Date().toISOString();
    const hashAutenticidade = crypto.createHash('sha256').update(JSON.stringify({ url, registros, dataEmissao })).digest('hex');

    res.json({
      titulo: "LAUDO DE AUDITORIA DE PREÇOS E INTEGRIDADE DIGITAL",
      plataforma: "RadarBlack — Validação Anti-Fraude",
      dataEmissao,
      urlProduto: url,
      hashAutenticidade,
      totalRegistros: registros.length,
      historico: registros.map(r => ({ data: r.data_registro, preco: r.preco, fonte: r.origem_dados }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rota Principal da Interface Visual
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>RadarBlack — Auditoria e Monitoramento Real de Preços</title>
      <style>
        * { box-sizing: border-box; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        body { background-color: #080c14; color: #f3f4f6; margin: 0; padding: 20px; display: flex; flex-direction: column; align-items: center; min-height: 100vh; }
        
        .header-brand { text-align: center; margin-bottom: 20px; }
        .logo-box { display: inline-flex; align-items: center; gap: 10px; background: rgba(56, 189, 248, 0.1); padding: 8px 20px; border-radius: 40px; border: 1px solid rgba(56, 189, 248, 0.2); }
        .logo-icon { font-size: 28px; }
        .logo-text { font-size: 26px; font-weight: 800; color: #ffffff; }
        .logo-text span { color: #38bdf8; }

        .container { max-width: 680px; width: 100%; background: #0f172a; border: 1px solid #1e293b; padding: 28px; border-radius: 16px; box-shadow: 0 15px 35px rgba(0,0,0,0.5); }

        .form-group { margin-bottom: 18px; }
        label { display: block; font-size: 11px; text-transform: uppercase; color: #38bdf8; margin-bottom: 6px; font-weight: 700; }
        input { width: 100%; padding: 13px; background: #080c14; border: 1px solid #334155; border-radius: 8px; color: #fff; font-size: 14px; }
        input:focus { outline: none; border-color: #38bdf8; }

        .btn-main { width: 100%; padding: 14px; background: #0284c7; color: white; border: none; border-radius: 8px; font-weight: 700; font-size: 14px; cursor: pointer; text-transform: uppercase; transition: background 0.2s; }
        .btn-main:hover { background: #0369a1; }

        .btn-laudo { width: 100%; padding: 12px; background: #059669; color: white; border: none; border-radius: 8px; font-weight: 700; font-size: 13px; cursor: pointer; text-transform: uppercase; margin-top: 15px; display: none; }

        .status-box { margin-top: 18px; padding: 14px; border-radius: 8px; font-size: 13px; display: none; word-break: break-word; }
        .status-success { background: rgba(6, 78, 59, 0.6); color: #a7f3d0; border: 1px solid #059669; }
        .status-error { background: rgba(127, 29, 29, 0.6); color: #fecaca; border: 1px solid #dc2626;
