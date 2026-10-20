const express = require('express');
const { Pool } = require('pg');
const crypto = require('crypto');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const port = process.env.PORT || 3000;

// Configuração do Banco PostgreSQL no Render
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(express.json());

// Seus IDs de Afiliado e AdSense (substitua com os seus quando tiver)
const AFILIADO_AMAZON_TAG = process.env.AMAZON_TAG || 'radarblack-20';
const ADSENSE_CLIENT_ID = process.env.ADSENSE_ID || 'ca-pub-0000000000000000';

// Inicializa a tabela de histórico no banco de dados
async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS historico_precos (
        id SERIAL PRIMARY KEY,
        url_produto TEXT NOT NULL,
        preco NUMERIC(10,2) NOT NULL,
        data_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        origem_dados VARCHAR(50) DEFAULT 'Busca Em Tempo Real'
      );
    `);
    console.log('Tabela historico_precos pronta no PostgreSQL.');
  } catch (err) {
    console.error('Erro ao inicializar BD:', err.message);
  }
}
initDb();

// Função para Web Scraping / Busca de preço na página em tempo real
async function buscarPrecoNaWeb(url) {
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
      },
      timeout: 8000
    });

    const $ = cheerio.load(data);
    let precoEncontrado = null;

    // Estratégias de captura de preço para principais e-commerces (Amazon, Magalu, Mercado Livre, etc)
    const seletoresPreco = [
      '.a-price-whole',
      '.price-template__actual-price',
      '[data-testid="price-value"]',
      '.ui-pdp-price__part--medium .aria-label',
      '.price',
      'meta[property="product:price:amount"]'
    ];

    for (const seletor of seletoresPreco) {
      if (seletor.startsWith('meta')) {
        const metaVal = $(seletor).attr('content');
        if (metaVal) { precoEncontrado = metaVal; break; }
      } else {
        const textVal = $(seletor).first().text().trim();
        if (textVal) { precoEncontrado = textVal; break; }
      }
    }

    if (precoEncontrado) {
      // Limpa e converte o texto para número float (ex: "R$ 599,90" -> 599.90)
      const limpo = precoEncontrado.replace(/[^\d\,.]/g, '').replace('.', '').replace(',', '.');
      return parseFloat(limpo) || null;
    }
    return null;
  } catch (err) {
    console.log('Aviso: Não foi possível realizar o scraping automático, usando registro manual se fornecido.');
    return null;
  }
}

// Injeta Tag de Afiliado na URL
function converterParaUrlAfiliado(url) {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname.includes('amazon.com')) {
      parsedUrl.searchParams.set('tag', AFILIADO_AMAZON_TAG);
      return parsedUrl.toString();
    }
    return url;
  } catch (e) {
    return url;
  }
}

// Rota Principal de Pesquisa e Gravação de Histórico
app.post('/api/buscar-e-auditar', async (req, res) => {
  try {
    let { url, precoManual } = req.body;
    if (!url) return res.status(400).json({ error: 'Insira a URL do produto.' });

    url = String(url).trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    // 1. Tenta buscar o preço em tempo real na Web
    let precoFinal = await buscarPrecoNaWeb(url);

    // 2. Se a busca automática falhar/bloquear, usa o valor informado pelo usuário
    if (!precoFinal && precoManual) {
      precoFinal = parseFloat(String(precoManual).replace(',', '.'));
    }

    if (!precoFinal) {
      return res.status(400).json({ 
        error: 'Não conseguimos capturar o preço automaticamente desse site. Por favor, digite o preço atual no campo abaixo para guardar a auditoria.' 
      });
    }

    // 3. Salva no banco PostgreSQL para montar seu Histórico do RadarBlack
    const query = `
      INSERT INTO historico_precos (url_produto, preco, origem_dados)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
    const result = await pool.query(query, [url, precoFinal, 'Busca Em Tempo Real']);

    // 4. Converte para Link de Afiliado
    const urlAfiliado = converterParaUrlAfiliado(url);

    res.json({
      success: true,
      precoCaptação: precoFinal,
      urlAfiliado,
      registro: result.rows[0]
    });
  } catch (err) {
    console.error('Erro na rota de busca:', err);
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

// Rota da Interface Visual do Site
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>RadarBlack — Verificador e Comparador em Tempo Real</title>
      <!-- Script do Google AdSense para Monetização por Anúncios -->
      <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}" crossorigin="anonymous"></script>
      <style>
        * { box-sizing: border-box; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        body { background-color: #080c14; color: #f3f4f6; margin: 0; padding: 20px; display: flex; flex-direction: column; align-items: center; min-height: 100vh; }
        
        .header-brand { text-align: center; margin-bottom: 20px; }
        .logo-box { display: inline-flex; align-items: center; gap: 10px; background: rgba(56, 189, 248, 0.1); padding: 8px 20px; border-radius: 40px; border: 1px solid rgba(56, 189, 248, 0.2); }
        .logo-icon { font-size: 28px; }
        .logo-text { font-size: 26px; font-weight: 800; color: #ffffff; }
        .logo-text span { color: #38bdf8; }

        .container { max-width: 680px; width: 100%; background: #0f172a; border: 1px solid #1e293b; padding: 28px; border-radius: 16px; box-shadow: 0 15px 35px rgba(0,0,0,0.5); }
        
        .ad-banner { width: 100%; background: #131d31; border: 1px dashed #334155; border-radius: 8px; padding: 12px; text-align: center; font-size: 11px; color: #64748b; margin-bottom: 20px; }

        .form-group { margin-bottom: 18px; }
        label { display: block; font-size: 11px; text-transform: uppercase; color: #38bdf8; margin-bottom: 6px; font-weight: 700; }
        input { width: 100%; padding: 13px; background: #080c14; border: 1px solid #334155; border-radius: 8px; color: #fff; font-size: 14px; }
        input:focus { outline: none; border-color: #38bdf8; }

        .btn-main { width: 100%; padding: 14px; background: #0284c7; color: white; border: none; border-radius: 8px; font-weight: 700; font-size: 14px; cursor: pointer; text-transform: uppercase; transition: background 0.2s; }
        .btn-main:hover { background: #0369a1; }

        .btn-buy { display: none; width: 100%; padding: 14px; background: #d97706; color: white; border: none; border-radius: 8px; font-weight: 800; font-size: 14px; cursor: pointer; text-transform: uppercase; text-decoration: none; text-align: center; margin-top: 15px; }
        .btn-buy:hover { background: #b45309; }

        .btn-laudo { width: 100%; padding: 12px; background: #059669; color: white; border: none; border-radius: 8px; font-weight: 700; font-size: 13px; cursor: pointer; text-transform: uppercase; margin-top: 10px; display: none; }

        .status-box { margin-top: 18px; padding: 14px; border-radius: 8px; font-size: 13px; display: none; word-break: break-word; }
        .status-success { background: rgba(6, 78, 59, 0.6); color: #a7f3d0; border: 1px solid #059669; }
        .status-error { background: rgba(127, 29, 29, 0.6); color: #fecaca; border: 1px solid #dc2626; }

        .historico-list { margin-top: 24px; border-top: 1px solid #1e293b; padding-top: 16px; }
        .historico-item { display: flex; justify-content: space-between; padding: 10px 12px; background: #080c14; border: 1px solid #1e293b; border-radius: 6px; margin-bottom: 6px; font-size: 13px; }
        .historico-item strong { color: #38bdf8; }
      </style>
    </head>
    <body>
      <div class="header-brand">
        <div class="logo-box">
          <span class="logo-icon">🔍</span>
          <span class="logo-text">Radar<span>Black</span></span>
        </div>
        <p style="color:#94a3b8; font-size:13px; margin-top:8px;">Busca de Preços em Tempo Real & Histórico Acumulado</p>
      </div>

      <div class="container">
        <!-- Banner de Anúncio no Topo (Monetização) -->
        <div class="ad-banner">
          📢 Publicidade / Espaço AdSense
        </div>

        <div class="form-group">
          <label>Cole o Link do Produto (Qualquer Loja)</label>
          <input type="text" id="urlProduto" placeholder="Ex: https://www.amazon.com.br/dp/B0DJCFVZ3H">
        </div>

        <div class="form-group">
          <label>Preço Atual (Opcional - caso a loja bloqueie busca automática)</label>
          <input type="text" id="precoProduto" placeholder="Ex: 599.99">
        </div>

        <button class="btn-main" onclick="buscarEAuditar()">⚡ BUSCAR MELHOR PREÇO & AUDITAR</button>

        <a id="btnComprar" href="#" target="_blank" rel="nofollow" class="btn-buy">
          🛒 IR PARA A LOJA COM O MENOR PREÇO (OFERTA AUDITADA)
        </a>

        <button id="btnLaudo" class="btn-laudo" onclick="exportarLaudoPDF()">📄 EXPORTAR LAUDO DE AUDITORIA (PDF)</button>

        <div id="statusBox" class="status-box"></div>
        <div id="historicoBox" class="historico-list"></div>

        <!-- Banner de Anúncio no Rodapé (Monetização) -->
        <div class="ad-banner" style="margin-top: 25px; margin-bottom: 0;">
          📢 Espaço de Patrocínio / Links Recomendados
        </div>
      </div>

      <script>
        let urlAtual = '';

        async function buscarEAuditar() {
          const urlInput = document.getElementById('urlProduto');
          const precoInput = document.getElementById('precoProduto');
          let url = urlInput.value.trim();
          const precoManual = precoInput.value.trim();

          if (!url) {
            exibirStatus('Por favor, insira o link do produto.', 'error');
            return;
          }

          exibirStatus('🔎 Buscando preço mais recente na internet...', 'success');
          urlAtual = url;

          try {
            const res = await fetch('/api/buscar-e-auditar', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url, precoManual })
            });

            const data = await res.json();

            if (data.success) {
              exibirStatus('✅ Preço verificado e adicionado ao histórico: R$ ' + data.precoCaptação.toFixed(2), 'success');
              
              // Exibe botão com link de afiliado
              const btnBuy = document.getElementById('btnComprar');
              btnBuy.href = data.urlAfiliado;
              btnBuy.style.display = 'block';

              carregarHistorico(url);
            } else {
              exibirStatus(data.error, 'error');
            }
          } catch (err) {
            exibirStatus('Erro de comunicação com o servidor.', 'error');
          }
        }

        async function carregarHistorico(url) {
          try {
            const res = await fetch('/api/historico?url=' + encodeURIComponent(url));
            const historico = await res.json();

            const box = document.getElementById('historicoBox');
            const btnLaudo = document.getElementById('btnLaudo');

            if (Array.isArray(historico) && historico.length > 0) {
              box.innerHTML = '<strong>Histórico de Consultas Deste Produto:</strong><br><br>' + 
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
                  <h3>Histórico de Preços Acumulado</h3>
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
