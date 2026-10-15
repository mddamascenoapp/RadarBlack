const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());

// HTML / Interface do Usuário (Frontend Integrado)
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>RadarBlack - Detector de Desconto Fake e Comparador</title>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <style>
            :root {
                --bg-color: #0f172a;
                --card-bg: #1e293b;
                --accent: #22c55e;
                --text: #f8fafc;
            }
            body {
                font-family: 'Segoe UI', system-ui, sans-serif;
                background-color: var(--bg-color);
                color: var(--text);
                margin: 0;
                padding: 20px;
                display: flex;
                flex-direction: column;
                align-items: center;
            }
            .container {
                max-width: 800px;
                width: 100%;
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
            }
            .header h1 {
                font-size: 2.5rem;
                color: #38bdf8;
                margin-bottom: 5px;
            }
            .search-box {
                background: var(--card-bg);
                padding: 20px;
                border-radius: 12px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
                margin-bottom: 25px;
            }
            .form-group {
                margin-bottom: 15px;
            }
            label {
                display: block;
                margin-bottom: 5px;
                font-size: 0.9rem;
                color: #94a3b8;
            }
            input, select {
                width: 100%;
                padding: 12px;
                border-radius: 8px;
                border: 1px solid #334155;
                background: #0f172a;
                color: white;
                box-sizing: border-box;
            }
            button {
                width: 100%;
                padding: 14px;
                background: var(--accent);
                color: #000;
                font-weight: bold;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 1rem;
                transition: 0.2s;
            }
            button:hover {
                opacity: 0.9;
            }
            .result-card {
                background: var(--card-bg);
                padding: 25px;
                border-radius: 12px;
                display: none;
            }
            .smile-header {
                display: flex;
                align-items: center;
                gap: 15px;
                margin-bottom: 20px;
            }
            .smile-icon {
                font-size: 3rem;
            }
            .badge {
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 0.85rem;
                font-weight: bold;
            }
            .chart-container {
                margin-top: 25px;
                position: relative;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔍 RadarBlack</h1>
                <p>Diagnóstico de Preços Anti-Fraude da Black Friday</p>
            </div>

            <div class="search-box">
                <div class="form-group">
                    <label>Buscar Produto ou colar Link da Loja:</label>
                    <input type="text" id="produtoNome" placeholder="Ex: Smart TV 55 Polegadas ou link do Magalu/Amazon">
                </div>
                <div class="form-group" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div>
                        <label>Preço Promocional Hoje (R$):</label>
                        <input type="number" id="precoAtual" value="2999">
                    </div>
                    <div>
                        <label>Simular Comportamento da Loja:</label>
                        <select id="cenarioSimulacao">
                            <option value="fake">Metade do Dobro (Aumento Repentino)</option>
                            <option value="real">Oferta Real Legítima</option>
                            <option value="normal">Preço Estável / Sem Mudança</option>
                        </select>
                    </div>
                </div>
                <button onclick="analisarPreco()">Analisar Transparência da Oferta</button>
            </div>

            <div id="resultado" class="result-card">
                <div class="smile-header">
                    <div id="smileIcon" class="smile-icon">🟢</div>
                    <div>
                        <h2 id="diagnosticoTitulo" style="margin: 0;">Diagnóstico em análise...</h2>
                        <p id="diagnosticoMsg" style="margin: 5px 0 0 0; color: #94a3b8;"></p>
                    </div>
                </div>

                <div class="chart-container">
                    <canvas id="graficoHistorico"></canvas>
                </div>
            </div>
        </div>

        <script>
            let meuGrafico = null;

            function analisarPreco() {
                const precoAtual = parseFloat(document.getElementById('precoAtual').value);
                const cenario = document.getElementById('cenarioSimulacao').value;

                let media150 = 3000;
                let pico30 = 3000;

                if (cenario === 'fake') {
                    pico30 = 3900; // Inflou 30% recentemente
                } else if (cenario === 'real') {
                    pico30 = 3000;
                    media150 = 3400;
                }

                // Dispara o cálculo no backend
                fetch('/api/diagnostico', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ precoAtual, pico30Dias: pico30, media150Dias: media150 })
                })
                .then(res => res.json())
                .then(data => {
                    document.getElementById('resultado').style.display = 'block';
                    document.getElementById('smileIcon').innerText = data.icone;
                    document.getElementById('diagnosticoTitulo').innerText = data.diagnostico;
                    document.getElementById('diagnosticoMsg').innerText = data.mensagem;

                    desenharGrafico(media150, pico30, precoAtual);
                });
            }

            function desenharGrafico(media, pico, atual) {
                const ctx = document.getElementById('graficoHistorico').getContext('2d');
                if (meuGrafico) meuGrafico.destroy();

                meuGrafico = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: ['Há 5 Meses', 'Há 3 Meses', 'Mês Passado (Pico)', 'Hoje (Black Friday)'],
                        datasets: [{
                            label: 'Histórico de Preço (R$)',
                            data: [media, media, pico, atual],
                            borderColor: '#38bdf8',
                            backgroundColor: 'rgba(56, 189, 248, 0.1)',
                            fill: true,
                            tension: 0.3,
                            borderWidth: 3
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: { labels: { color: '#f8fafc' } }
                        },
                        scales: {
                            y: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } },
                            x: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } }
                        }
                    }
                });
            }
        </script>
    </body>
    </html>
    `);
});

// Endpoint da API de Diagnóstico do Smile
app.post('/api/diagnostico', (req, res) => {
    const { precoAtual, pico30Dias, media150Dias } = req.body;

    const houveInflacaoRecente = pico30Dias >= (media150Dias * 1.20);
    const precoVoltouAoNormal = precoAtual >= (media150Dias * 0.90);

    if (houveInflacaoRecente && precoVoltouAoNormal) {
        return res.json({
            statusSmile: "TRISTE",
            icone: "🔴",
            diagnostico: "Desconto Fake!",
            mensagem: "Atenção: Este produto teve o preço inflado recentemente no último mês para fingir um falso desconto."
        });
    }

    const precoBemAbaixo = precoAtual <= (media150Dias * 0.88);
    const semPicoAnormal = pico30Dias <= (media150Dias * 1.10);

    if (precoBemAbaixo && semPicoAnormal) {
        return res.json({
            statusSmile: "FELIZ",
            icone: "🟢",
            diagnostico: "Oferta Real!",
            mensagem: "Menor preço verificado dos últimos 5 meses! Desconto legítimo."
        });
    }

    return res.json({
        statusSmile: "NEUTRO",
        icone: "🟡",
        diagnostico: "Preço Normal",
        mensagem: "O valor está dentro da oscilação média normal de mercado."
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`RadarBlack rodando na porta ${PORT}`);
});
