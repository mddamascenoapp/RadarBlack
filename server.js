const express = require('express');
const app = express();

app.use(express.json());

// Interface Visual Profissional - RadarBlack (Versão Pro / Confiança)
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>RadarBlack — Inteligência Anti-Fraude em Preços</title>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.0.0"></script>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
            :root {
                --bg-deep: #090d16;
                --bg-card: #131b2e;
                --border-color: #1e293b;
                --accent-blue: #38bdf8;
                --accent-green: #10b981;
                --accent-red: #ef4444;
                --accent-yellow: #f59e0b;
                --text-main: #f8fafc;
                --text-muted: #94a3b8;
            }
            body {
                font-family: 'Plus Jakarta Sans', sans-serif;
                background-color: var(--bg-deep);
                color: var(--text-main);
                margin: 0;
                padding: 40px 20px;
                display: flex;
                flex-direction: column;
                align-items: center;
                min-height: 100vh;
            }
            .container {
                max-width: 900px;
                width: 100%;
            }
            /* Logotipo Marcante e Profissional */
            .brand-header {
                text-align: center;
                margin-bottom: 40px;
            }
            .logo-box {
                display: inline-flex;
                align-items: center;
                gap: 12px;
                background: linear-gradient(135deg, rgba(56, 189, 248, 0.1), rgba(16, 185, 129, 0.05));
                padding: 12px 24px;
                border-radius: 50px;
                border: 1px solid rgba(56, 189, 248, 0.2);
                box-shadow: 0 0 30px rgba(56, 189, 248, 0.08);
                margin-bottom: 15px;
            }
            .logo-icon {
                font-size: 1.8rem;
                background: #1e293b;
                padding: 8px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: inset 0 2px 4px rgba(0,0,0,0.5);
            }
            .logo-text {
                font-size: 2rem;
                font-weight: 800;
                letter-spacing: -0.5px;
                background: linear-gradient(90deg, #38bdf8, #818cf8);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }
            .brand-subtitle {
                color: var(--text-muted);
                font-size: 1rem;
                font-weight: 500;
            }
            /* Card de Consulta */
            .card {
                background: var(--bg-card);
                border: 1px solid var(--border-color);
                border-radius: 16px;
                padding: 30px;
                box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
                margin-bottom: 30px;
            }
            .form-grid {
                display: grid;
                grid-template-columns: 2fr 1fr;
                gap: 20px;
                margin-bottom: 20px;
            }
            @media(max-width: 768px) {
                .form-grid { grid-template-columns: 1fr; }
            }
            .form-group {
                margin-bottom: 15px;
            }
            label {
                display: block;
                margin-bottom: 8px;
                font-size: 0.85rem;
                font-weight: 600;
                color: var(--text-muted);
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            input, select {
                width: 100%;
                padding: 14px 16px;
                border-radius: 10px;
                border: 1px solid var(--border-color);
                background: #090d16;
                color: white;
                font-size: 1rem;
                font-family: inherit;
                box-sizing: border-box;
                transition: all 0.3s ease;
            }
            input:focus, select:focus {
                outline: none;
                border-color: var(--accent-blue);
                box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.15);
            }
            .btn-analyze {
                width: 100%;
                padding: 16px;
                background: linear-gradient(135deg, #38bdf8, #0284c7);
                color: #090d16;
                font-weight: 800;
                border: none;
                border-radius: 10px;
                cursor: pointer;
                font-size: 1.05rem;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                transition: all 0.2s ease;
                box-shadow: 0 4px 14px rgba(56, 189, 248, 0.3);
            }
            .btn-analyze:hover {
                opacity: 0.95;
                transform: translateY(-1px);
                box-shadow: 0 6px 20px rgba(56, 189, 248, 0.4);
            }
            /* Resultado do Diagnóstico */
            .result-card {
                display: none;
                animation: fadeIn 0.4s ease-in-out;
            }
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .diagnosis-box {
                display: flex;
                align-items: center;
                gap: 20px;
                background: rgba(255,255,255,0.02);
                border: 1px solid var(--border-color);
                padding: 20px 24px;
                border-radius: 12px;
                margin-bottom: 25px;
            }
            .smile-badge-lg {
                font-size: 3rem;
                background: #090d16;
                width: 75px;
                height: 75px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                border: 2px solid var(--border-color);
                flex-shrink: 0;
            }
            .diagnosis-info h2 {
                margin: 0 0 6px 0;
                font-size: 1.4rem;
                font-weight: 700;
            }
            .diagnosis-info p {
                margin: 0;
                color: var(--text-muted);
                font-size: 0.95rem;
                line-height: 1.4;
            }
            .chart-wrapper {
                position: relative;
                height: 350px;
                width: 100%;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="brand-header">
                <div class="logo-box">
                    <div class="logo-icon">🛡️</div>
                    <div class="logo-text">RadarBlack</div>
                </div>
                <div class="brand-subtitle">Auditoria Inteligente e Detecção de Falsos Descontos na Black Friday</div>
            </div>

            <div class="card">
                <div class="form-group">
                    <label>Link do Produto (Amazon, Magalu, Mercado Livre, etc.)</label>
                    <input type="text" id="produtoLink" placeholder="Cole a URL do produto aqui para auditar...">
                </div>

                <div class="form-grid">
                    <div class="form-group" style="margin-bottom:0;">
                        <label>Preço Atual da Oferta (R$)</label>
                        <input type="number" id="precoAtual" step="0.01" value="2999.00">
                    </div>
                    <div class="form-group" style="margin-bottom:0;">
                        <label>Simular Cenário Histórico</label>
                        <select id="cenarioSimulacao">
                            <option value="fake">🔴 Metade do Dobro (Inflado Recente)</option>
                            <option value="real">🟢 Desconto Legítimo Real</option>
                            <option value="normal">🟡 Preço Estável / Normal</option>
                        </select>
                    </div>
                </div>

                <div style="margin-top: 20px;">
                    <button class="btn-analyze" onclick="auditarPreco()">Executar Auditoria de Preço</button>
                </div>
            </div>

            <div id="resultadoContainer" class="card result-card">
                <div class="diagnosis-box">
                    <div id="smileIcon" class="smile-badge-lg">🟡</div>
                    <div class="diagnosis-info">
                        <h2 id="diagnosticoTitulo">Aguardando auditoria...</h2>
                        <p id="diagnosticoMsg">Insira os dados acima para rodar a varredura nos servidores de histórico.</p>
                    </div>
                </div>

                <div class="chart-wrapper">
                    <canvas id="graficoHistorico"></canvas>
                </div>
            </div>
        </div>

        <script>
            let meuGrafico = null;

            function auditarPreco() {
                const precoAtual = parseFloat(document.getElementById('precoAtual').value) || 0;
                const cenario = document.getElementById('cenarioSimulacao').value;

                let baseMedia = 3200.00;
                let picoRecente = 3200.00;

                if (cenario === 'fake') {
                    picoRecente = baseMedia * 1.35; // Pico artificial de +35% no último mês
                } else if (cenario === 'real') {
                    picoRecente = baseMedia;
                    baseMedia = baseMedia * 1.25; // O preço base antigo era maior, hoje tá bem abaixo
                }

                // Envia para o backend processar as regras matemáticas do Smile
                fetch('/api/diagnostico', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ precoAtual, pico30Dias: picoRecente, media150Dias: baseMedia })
                })
                .then(res => res.json())
                .then(data => {
                    document.getElementById('resultadoContainer').style.display = 'block';
                    document.getElementById('smileIcon').innerText = data.icone;
                    document.getElementById('diagnosticoTitulo').innerText = data.diagnostico;
                    document.getElementById('diagnosticoMsg').innerText = data.mensagem;

                    renderizarGrafico(baseMedia * 0.98, baseMedia, picoRecente, precoAtual);
                });
            }

            function renderizarGrafico(h5m, h3m, pico, atual) {
                const ctx = document.getElementById('graficoHistorico').getContext('2d');
                if (meuGrafico) meuGrafico.destroy();

                meuGrafico = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: ['Há 5 Meses', 'Há 3 Meses', 'Mês Passado (Pico)', 'Hoje (Black Friday)'],
                        datasets: [{
                            label: 'Evolução do Preço (R$)',
                            data: [h5m, h3m, pico, atual],
                            borderColor: '#38bdf8',
                            backgroundColor: 'rgba(56, 189, 248, 0.08)',
                            fill: true,
                            tension: 0.35,
                            borderWidth: 3.5,
                            pointRadius: 6,
                            pointBackgroundColor: '#090d16',
                            pointBorderColor: '#38bdf8',
                            pointBorderWidth: 3
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        return ' Preço: R$ ' + context.parsed.y.toLocaleString('pt-BR', {minimumFractionDigits: 2});
                                    }
                                }
                            }
                        },
                        scales: {
                            y: { 
                                grid: { color: 'rgba(255,255,255,0.04)' },
                                ticks: { 
                                    color: '#94a3b8',
                                    callback: function(value) { return 'R$ ' + value.toLocaleString('pt-BR'); }
                                }
                            },
                            x: { 
                                grid: { display: false },
                                ticks: { color: '#94a3b8', font: { weight: '600' } }
                            }
                        }
                    }
                });
            }
        </script>
    </body>
    </html>
    `);
});

// Motor Oficial Smile de Diagnóstico Anti-Fraude
app.post('/api/diagnostico', (req, res) => {
    const { precoAtual, pico30Dias, media150Dias } = req.body;

    const houveInflacaoRecente = pico30Dias >= (media150Dias * 1.15);
    const precoVoltouAoNormal = precoAtual >= (media150Dias * 0.90);

    if (houveInflacaoRecente && precoVoltouAoNormal) {
        return res.json({
            statusSmile: "TRISTE",
            icone: "🔴",
            diagnostico: "Alerta de Desconto Fake!",
            mensagem: "Detectamos manipulação: o preço foi elevado artificialmente nas últimas semanas para forçar um falso apelo de grande desconto hoje."
        });
    }

    const precoBemAbaixo = precoAtual <= (media150Dias * 0.88);
    const semPicoAnormal = pico30Dias <= (media150Dias * 1.08);

    if (precoBemAbaixo && semPicoAnormal) {
        return res.json({
            statusSmile: "FELIZ",
            icone: "🟢",
            diagnostico: "Oferta Real e Legítima!",
            mensagem: "Auditoria aprovada: este é o menor patamar de preço dos últimos 5 meses. Excelente oportunidade de compra."
        });
    }

    return res.json({
        statusSmile: "NEUTRO",
        icone: "🟡",
        diagnostico: "Preço Estável na Média",
        mensagem: "O valor praticado hoje está alinhado com o histórico médio de mercado, sem desvios significativos."
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`RadarBlack rodando na porta ${PORT}`);
});
