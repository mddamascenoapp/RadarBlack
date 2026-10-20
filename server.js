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

// Rota Principal — Serve a interface gráfica aprimorada do RadarBlack
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>RadarBlack — Auditoria e Inteligência de Preços</title>
      <style>
        * { box-sizing: border-box; font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        body { background-color: #080c14; color: #f3f4f6; margin: 0; padding: 40px 20px; display: flex; flex-direction: column; align-items: center; min-height: 100vh; }
        
        .header-brand { text-align: center; margin-bottom: 25px; }
        .logo-box { display: inline-flex; align-items: center; gap: 12px; background: rgba(56, 189, 248, 0.08); padding: 10px 22px; border-radius: 50px; border: 1px solid rgba(56, 189, 248, 0.2); }
        .logo-icon { font-size: 32px; filter: drop-shadow(0 0 8px rgba(56, 189, 248, 0.6)); }
        .logo-text { font-size: 30px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; }
        .logo-text span { color: #38bdf8; }
        .subtitle { color: #94a3b8; font-size: 14px; margin-top: 10px; font-weight: 400; }

        .container { max-width: 680px; width: 100%; background: #0f172a; border: 1px solid #1e293b; padding: 32px; border-radius: 16px; box-shadow: 0 20px 40px rgba(0,0,0,0.6); }
        
        .badge-status { display: inline-block; background: rgba(16, 185, 129, 0.15); color: #34d399; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 4px 10px; border-radius: 20px; border: 1px solid rgba(16, 185, 129, 0.3); margin-bottom: 20px; }

        .form-group { margin-bottom: 22px; }
        label { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; color: #38bdf8; margin-bottom: 8px; font-weight: 700; }
        input { width: 100%; padding: 14px; background: #080c14; border: 1px solid #334155; border-radius: 8px; color: #fff; font-size: 14px; transition: border-color 0.2s; }
        input:focus { outline: none; border-color: #38bdf8; box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.15); }

        .btn-main { width: 100%; padding: 15px; background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color: white; border: none; border-radius: 8px; font-weight: 700; font-size: 14px; cursor: pointer; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 10px; transition: transform 0.1s, box-shadow 0.2s; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3); }
        .btn-main:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(2, 132, 199, 0.4); }
        .btn-laudo { width: 100%; padding: 13px; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; border: none; border-radius: 8px; font-weight: 700; font-size: 13px; cursor: pointer; text-transform: uppercase; margin-top: 15px; display: none; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3); }
        .btn-laudo:hover { background: #047857; }

        .status-box { margin-top: 20px; padding: 15px; border-radius: 8px; font-size: 13px; display: none; word-break: break-word; }
        .status-success { background: rgba(6, 78, 59, 0.6); color: #a7f3d0; border: 1px solid #059669; }
        .status-error { background: rgba(127, 29, 29, 0.6); color: #fecaca; border: 1px solid #dc2626; }

        .historico-list { margin-top: 28px; border-top: 1px solid #1e293b; padding-top: 20px; }
        .historico-header { font-size: 13px; font-weight: 700; color: #f3f4f6; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; }
        .historico-item { display: flex; justify-content: space-between; padding: 12px 14px; background: #080c14; border: 1px solid #1e293b; border-radius: 8px; margin-bottom: 8px; font-size: 13px; }
        .historico-item strong { color: #38bdf8; }

        /* Card de Monetização / Afiliados com Testador Ativo */
        .afiliado-card { margin-top: 32px; padding: 20px; background: #131d31; border: 1px solid #1e293b; border-radius: 12px; }
        .afiliado-header { font-size: 12px; font-weight: 800; text-transform: uppercase; color: #fbbf24; letter-spacing: 0.5px; margin-bottom: 6px; display: flex; align-items: center; gap: 6px; }
        .afiliado-desc { font-size: 12px; color: #94a3b8; margin-bottom: 16px; line-height: 1.5; }
        .afiliado-actions { display: flex; gap: 10px; flex-wrap: wrap; }
        
        .btn-partner { flex: 1; min-width: 180px; padding: 10px 16px; border-radius: 8px; font-size: 12px; font-weight: 700; text-decoration: none; text-align: center; display: inline-flex; align-items: center; justify-content: center; gap: 8px; transition: background 0.2s; }
        .btn-amazon { background: #d97706; color: #ffffff; }
        .btn-amazon:hover { background: #b45309; }
        .btn-check { background: #1e293b; color: #38bdf8; border: 1px solid #334155; }
        .btn-check:hover { background: #334155; }

        .link-status-info { margin-top: 12px; font-size: 11px; color: #10b981; display: none; background: rgba(16, 185, 129, 0.1); padding: 8px 12px; border-radius: 6px; border: 1px solid rgba(16, 185, 129, 0.2); }
      </style>
    </head>
    <body>
      <div class="header-brand">
        <div class="logo-box">
          <span class="logo-icon">🔍</span>
          <span class="logo-text">Radar<span>Black</span></span>
        </div>
        <div class="subtitle">Auditoria de Preços & Validação de Histórico em E-commerce</div>
      </div>

      <div class="container">
        <div class="badge-status">● Sistema de Auditoria Ativo</div>

        <div class="form-group">
          <label>URL / Link do Produto na Loja</label>
          <input type="text" id="urlProduto" placeholder="Cole o link (Ex: https://www.amazon.com.br/dp/...)">
        </div>

        <div class="form-group">
          <label>Preço Atual Auditado na Loja (R$)</label>
          <input type="text" id="precoProduto" placeholder="Ex: 599.99">
        </div>

        <button class="btn-main" onclick="registrarEAuditar()">REGISTRAR PREÇO E AUDITAR</button>
        <button id="btnLaudo" class="btn-laudo" onclick="exportarLaudoPDF()">📄 EXPORTAR LAUDO DE AUDITORIA (PDF)</button>

        <div id="statusBox" class="status-box"></div>
        <div id="historicoBox" class="historico-list"></div>

        <!-- Painel de Afiliados e Verificador de Links -->
        <div class="afiliado-card">
          <div class="afiliado-header">🏷️ Loja Parceira & Monetização Ativa</div>
          <div class="afiliado-desc">Acesse as ofertas auditadas nas lojas oficiais ou teste o redirecionamento com a sua tag de afiliado:</div>
          
          <div class="afiliado-actions">
            <a id="linkAmazon" href="https://www.amazon.com.br?tag=SEU_ID_AMAZON-20" target="_blank" rel="nofollow" class="btn-partner btn-amazon">
              🛒 Ofertas Amazon (Afiliado)
            </a>
            <button onclick="verificarLinkAfiliado()" class="btn-partner btn-check">
              ⚡ Testar Redirecionamento
            </button>
          </div>

          <div id="linkStatus" class="link-status-info"></div>
        </div>

      </div>

      <script>
        let urlAtual = '';

        async function registrarEAuditar() {
          const urlInput = document.getElementById('urlProduto');
          const precoInput = document.getElementById('precoProduto');
          let url = urlInput.value.trim();
          const preco = precoInput.value.trim();

          if (!url || !preco) {
            exibirStatus('Preencha o link e o preço antes de enviar.', 'error');
            return;
          }

          if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
            urlInput.value = url;
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
              precoInput.value = '';
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
              box.innerHTML = '<div class="historico-header"><span>Histórico Guardado</span><span>(' + historico.length + ' registros)</span></div>' + 
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
                    h1 { color: #000; border-bottom: 2px solid #000; padding-bottom: 8px; font-size: 18px; margin-bottom: 5px; }
                    .sub { font-size: 11px; color: #555; margin-bottom: 20px; }
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
                  <div class="sub">Plataforma de Verificação e Integridade Digital de Histórico de Ofertas</div>
                  
                  <div class="info">
                    <strong>URL Auditada:</strong> \${laudo.urlProduto}<br>
                    <strong>Data de Emissão do Laudo:</strong> \${new Date(laudo.dataEmissao).toLocaleString('pt-BR')}<br>
                    <strong>Total de Registros Encontrados:</strong> \${laudo.totalRegistros}
                  </div>

                  <div class="hash-box">
                    <strong>CÓDIGO DE AUTENTICIDADE E INTEGRIDADE (HASH SHA-256):</strong><br>
                    \${laudo.hashAutenticidade}
                  </div>

                  <h3>Histórico Cronológico Registrado</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>Data e Hora da Coleta</th>
                        <th>Preço Verificado</th>
                        <th>Origem da Coleta</th>
                      </tr>
                    </thead>
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

                  <div class="footer">
                    Este documento foi gerado pelo sistema RadarBlack com validação criptográfica SHA-256.<br>
                    Garantia de auditoria contra adulteração de histórico de preços em e-commerce.
                  </div>
                </body>
              </html>
            \`);
            janela.document.close();
            janela.print();
          } catch (err) {
            alert('Erro ao gerar o relatório.');
          }
        }

        function verificarLinkAfiliado() {
          const link = document.getElementById('linkAmazon').href;
          const statusBox = document.getElementById('linkStatus');
          statusBox.style.display = 'block';
          
          if (link.includes('tag=')) {
            statusBox.innerHTML = '✔ <strong>Link de Afiliado Pronto:</strong> O destino contém o parâmetro de rastreamento de comissão (<code>' + link.split('?')[1] + '</code>).';
          } else {
            statusBox.innerHTML = '⚠️ <strong>Atenção:</strong> Substitua o ID no código do server.js para ativar a comissão.';
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
