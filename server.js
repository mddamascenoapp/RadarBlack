const express = require('express');
const { Pool } = require('pg');
const crypto = require('crypto');

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
        origem_dados VARCHAR(50) DEFAULT 'Comparador Web'
      );
    `);
    console.log('Tabela historico_precos pronta no PostgreSQL.');
  } catch (err) {
    console.error('Erro ao inicializar BD:', err.message);
  }
}
initDb();

// Rota para simular/buscar comparativo de preços entre várias lojas
app.post('/api/comparar-e-auditar', async (req, res) => {
  try {
    let { url, precoInformado } = req.body;
    if (!url) return res.status(400).json({ error: 'Insira o link ou nome do produto.' });

    url = String(url).trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    const basePreco = parseFloat(String(precoInformado || '599.99').replace(',', '.'));

    // Simulador de variação de preços em múltiplos marketplaces
    // (Em produção, aqui entram as chamadas de API do Buscapé, Zoom ou Scraping)
    const ofertasLojas = [
      {
        loja: "Sua Loja / Parceiro Direto",
        preco: parseFloat((basePreco * 0.92).toFixed(2)), // 8% Mais barato
        url: url + "?ref=sua_loja_propria",
        destaque: true
      },
      {
        loja: "Amazon Brasil",
        preco: parseFloat((basePreco * 0.97).toFixed(2)),
        url: "https://www.amazon.com.br?tag=" + AFILIADO_AMAZON_TAG,
        destaque: false
      },
      {
        loja: "Mercado Livre",
        preco: parseFloat((basePreco * 1.02).toFixed(2)),
        url: "https://www.mercadolivre.com.br",
        destaque: false
      },
      {
        loja: "Magazine Luiza",
        preco: parseFloat((basePreco * 1.08).toFixed(2)),
        url: "https://www.magazineluiza.com.br",
        destaque: false
      }
    ];

    // Ordena do MAIS BARATO ao MAIS CARO
    ofertasLojas.sort((a, b) => a.preco - b.preco);

    const menorPreco = ofertasLojas[0].preco;

    // Registra a consulta no banco de dados para formar o histórico
    await pool.query(
      `INSERT INTO historico_precos (url_produto, preco, origem_dados) VALUES ($1, $2, $3)`,
      [url, menorPreco, 'Comparador Multi-Loja']
    );

    res.json({
      success: true,
      menorPreco,
      ofertas: ofertasLojas
    });
  } catch (err) {
    console.error('Erro na rota de comparação:', err);
    res.status(500).json({ error: 'Erro no servidor: ' + err.message });
  }
});

// Rota de consulta do histórico registrado
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

// Rota de geração do Laudo de Auditoria PDF
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
      <title>RadarBlack — Comparador de Preços do Menor ao Maior</title>
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
        .status-error { background: rgba(127, 29, 29, 0.6); color: #fecaca; border: 1px solid #dc2626; }

        /* Lista de Comparativo do Menor ao Maior */
        .offers-container { margin-top: 25px; border-top: 1px solid #1e293b; padding-top: 20px; display: none; }
        .offers-header { font-size: 14px; font-weight: 800; color: #fbbf24; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 0.5px; }
        
        .offer-card { background: #080c14; border: 1px solid #1e293b; border-radius: 10px; padding: 14px 18px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }
        .offer-card.top-offer { border: 2px solid #10b981; background: rgba(16, 185, 129, 0.05); }
        
        .offer-info { display: flex; flex-direction: column; gap: 4px; }
        .store-name { font-weight: 700; font-size: 14px; color: #ffffff; }
        .tag-cheapest { font-size: 10px; font-weight: 800; background: #10b981; color: #000; padding: 2px 8px; border-radius: 4px; display: inline-block; width: fit-content; text-transform: uppercase; }

        .offer-price-action { display: flex; align-items: center; gap: 12px; }
        .price-tag { font-size: 16px; font-weight: 800; color: #38bdf8; }
        .btn-link-store { padding: 8px 14px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 6px; font-size: 12px; font-weight: 700; transition: background 0.2s; }
        .btn-link-store:hover { background: #1d4ed8; }
        .top-offer .btn-link-store { background: #059669; }
        .top-offer .btn-link-store:hover { background: #047857; }

        .historico-list { margin-top: 25px; border-top: 1px solid #1e293b; padding-top: 16px; }
        .historico-item { display: flex; justify-content: space-between; padding: 10px 12px; background: #080c14; border: 1px solid #1e293b; border-radius: 6px; margin-bottom: 6px; font-size: 13px; }
      </style>
    </head>
    <body>
      <div class="header-brand">
        <div class="logo-box">
          <span class="logo-icon">🔍</span>
          <span class="logo-text">Radar<span>Black</span></span>
        </div>
        <p style="color:#94a3b8; font-size:13px; margin-top:8px;">Comparador de Preços em Tempo Real (Do Mais Barato ao Mais Caro)</p>
      </div>

      <div class="container">
        <div class="form-group">
          <label>Link ou Nome do Produto</label>
          <input type="text" id="urlProduto" placeholder="Ex: https://www.amazon.com.br/dp/B0DJCFVZ3H ou Cadeira Gamer">
        </div>

        <div class="form-group">
          <label>Preço de Referência (R$)</label>
          <input type="text" id="precoProduto" placeholder="Ex: 599.99">
        </div>

        <button class="btn-main" onclick="compararEBuscar()">🔍 COMPARAR LOJAS & ENCONTRAR MAIS BARATO</button>

        <div id="statusBox" class="status-box"></div>

        <!-- Tabela Comparativa de Preços -->
        <div id="offersContainer" class="offers-container">
          <div class="offers-header">📊 Ofertas Encontradas (Ordenadas pelo Menor Preço)</div>
          <div id="offersList"></div>
        </div>

        <button id="btnLaudo" class="btn-laudo" onclick="exportarLaudoPDF()">📄 EXPORTAR LAUDO DE AUDITORIA (PDF)</button>

        <div id="historicoBox" class="historico-list"></div>
      </div>

      <script>
        let urlAtual = '';

        async function compararEBuscar() {
          const urlInput = document.getElementById('urlProduto');
          const precoInput = document.getElementById('precoProduto');
          let url = urlInput.value.trim();
          const precoInformado = precoInput.value.trim();

          if (!url) {
            exibirStatus('Por favor, insira o link ou nome do produto.', 'error');
            return;
          }

          exibirStatus('🔎 Buscando e comparando preços nas principais lojas...', 'success');
          urlAtual = url;

          try {
            const res = await fetch('/api/comparar-e-auditar', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url, precoInformado })
            });

            const data = await res.json();

            if (data.success) {
              exibirStatus('✅ Comparativo concluído! Menor preço encontrado: R$ ' + data.menorPreco.toFixed(2), 'success');
              exibirListaOfertas(data.ofertas);
              carregarHistorico(url);
            } else {
              exibirStatus(data.error, 'error');
            }
          } catch (err) {
            exibirStatus('Erro de comunicação com o servidor.', 'error');
          }
        }

        function exibirListaOfertas(ofertas) {
          const container = document.getElementById('offersContainer');
          const list = document.getElementById('offersList');
          
          list.innerHTML = ofertas.map((of, idx) => \`
            <div class="offer-card \${idx === 0 ? 'top-offer' : ''}">
              <div class="offer-info">
                \${idx === 0 ? '<span class="tag-cheapest">🔥 Menor Preço</span>' : ''}
                <span class="store-name">\${of.loja}</span>
              </div>
              <div class="offer-price-action">
                <span class="price-tag">R$ \${of.preco.toFixed(2)}</span>
                <a href="\${of.url}" target="_blank" rel="nofollow" class="btn-link-store">
                  \${idx === 0 ? 'Comprar no Menor Preço' : 'Ver na Loja'}
                </a>
              </div>
            </div>
          \`).join('');

          container.style.display = 'block';
        }

        async function carregarHistorico(url) {
          try {
            const res = await fetch('/api/historico?url=' + encodeURIComponent(url));
            const historico = await res.json();

            const box = document.getElementById('historicoBox');
            const btnLaudo = document.getElementById('btnLaudo');

            if (Array.isArray(historico) && historico.length > 0) {
              box.innerHTML = '<strong>Histórico de Preços Guardados:</strong><br><br>' + 
                historico.map(h => \`
                  <div class="historico-item">
                    <span>\${new Date(h.data_registro).toLocaleString('pt-BR')}</span>
                    <strong>R$ \${Number(h.preco).toFixed(2)}</strong>
                  </div>
                \`).join('');
              
              btnLaudo.style.display = 'block';
            }
          } catch (err) {
            console.error('Erro ao carregar histórico:', err);
          }
        }

        async function exportarLaudoPDF() {
          if (!urlAtual) return;

          try {
            const res = await fetch('/api/laudo?url=' + encodeURIComponent(urlAtual));
            const laudo = await res.json();

            if (laudo.error) {
              alert(laudo.error);
              return;
            }

            const janela = window.open('', '_blank');
            janela.document.write(\`
              <html>
                <head>
                  <title>Laudo de Auditoria - RadarBlack</title>
                  <style>
                    body { font-family: Arial, sans-serif; padding: 30px; color: #111; }
                    h1 { color: #000; border-bottom: 2px solid #000; padding-bottom: 8px; font-size: 18px; }
                    .info { font-size: 12px; line-height: 1.6; margin-bottom: 20px; }
                    .hash-box { background: #f4f4f4; border: 1px dashed #444; padding: 10px; word-break: break-all; font-family: monospace; font-size: 11px; margin: 20px 0; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th, td { border: 1px solid #ccc; padding: 8px; text-align: left; font-size: 12px; }
                    th { background: #eee; }
                    .footer { margin-top: 30px; font-size: 10px; color: #666; text-align: center; border-top: 1px solid #ddd; padding-top: 10px; }
                  </style>
                </head>
                <body>
                  <h1>RADARBLACK — LAUDO DE AUDITORIA DE PREÇOS</h1>
                  <div class="info">
                    <strong>URL Auditada:</strong> \${laudo.urlProduto}<br>
                    <strong>Data de Emissão:</strong> \${new Date(laudo.dataEmissao).toLocaleString('pt-BR')}<br>
                    <strong>Total de Verificações no Histórico:</strong> \${laudo.totalRegistros}
                  </div>
                  <div class="hash-box">
                    <strong>CÓDIGO DE AUTENTICIDADE (HASH SHA-256):</strong><br>\${laudo.hashAutenticidade}
                  </div>
                  <h3>Histórico Cronológico Registrado</h3>
                  <table>
                    <thead><tr><th>Data</th><th>Preço Registrado</th><th>Origem</th></tr></thead>
                    <tbody>
                      \${laudo.historico.map(h => \`
                        <tr>
                          <td>\${new Date(h.data).toLocaleString('pt-BR')}</td>
                          <td>R$ \${Number(h.preco).toFixed(2)}</td>
                          <td>\${h.fonte}</td>
                        </tr>
                      \`).join('')}
                    </tbody>
                  </table>
                  <div class="footer">Gerado por RadarBlack via validação SHA-256.</div>
                </body>
              </html>
            \`);
            janela.document.close();
            janela.print();
          } catch (err) {
            alert('Erro ao gerar laudo em PDF.');
          }
        }

        function exibirStatus(msg, tipo) {
          const statusBox = document.getElementById('statusBox');
          statusBox.textContent = msg;
          statusBox.className = 'status-box status-' + tipo;
          statusBox.style.display = 'block';
        }
      </script>
    </body>
    </html>
  `);
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
