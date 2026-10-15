const express = require('express');
const app = express();

app.use(express.json());

// Interface e Motor de Teste Dinâmico - RadarBlack
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>RadarBlack — Auditoria de Preços</title>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
            :root {
                --bg-deep: #070a12;
                --bg-card: #0f1626;
                --border-color: #1e293b;
                --accent-cyan: #38bdf8;
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
                max-width: 800px;
                width: 100%;
            }
            .brand-header {
                text-align: center;
                margin-bottom: 35px;
            }
            .logo-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 12px;
            }
            .radar-logo-svg {
                width: 100px;
                height: 100px;
                filter: drop-shadow(0px 0px 18px rgba(56, 189, 248, 0.35));
            }
            .logo-text-group {
                font-size: 2.4rem;
                font-weight: 800;
                letter-spacing: -0.5px;
            }
            .text-radar { color: #ffffff; }
            .text-black { color: #94a3b8; }
            .brand-subtitle {
                color: var(--text-muted);
                font-size: 0.95rem;
                font-weight: 500;
                margin-top: 6px;
            }
            .card {
                background: var(--bg-card);
                border: 1px solid var(--border-color);
                border-radius: 18px;
                padding: 30px;
                box-shadow: 0 15px 35px -5px rgba(0, 0, 0, 0.6);
                margin-bottom: 30px;
            }
            .form-group {
                margin-bottom: 20px;
            }
            label {
                display: block;
                margin-bottom: 8px;
                font-size: 0.8rem;
                font-weight: 700;
                color: var(--text-muted);
                text-transform: uppercase;
                letter-spacing: 0.8px;
            }
            input {
                width: 100%;
                padding: 14px 16px;
                border-radius: 10px;
                border: 1px solid var(--border-color);
                background: #070a12;
                color: white;
                font-size: 1rem;
                font-family: inherit;
                box-sizing: border-box;
                transition: all 0.3s ease;
            }
            input:focus {
                outline: none;
                border-color: var(--accent-cyan);
                box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.2);
            }
            .btn-analyze {
                width: 100%;
                padding: 16px;
                background: linear-gradient(135deg, #38bdf8, #0284c7);
                color: #070a12;
                font-weight: 800;
                border: none;
                border-radius: 10px;
                cursor: pointer;
                font-size: 1rem;
                text-transform: uppercase;
                letter-spacing: 0.8px;
                transition: all 0.2s ease;
                box-shadow: 0 4px 16px rgba(56, 189, 248, 0.35);
            }
            .btn-analyze:hover {
                opacity: 0.95;
                transform: translateY(-1px);
                box-shadow: 0 6px 22px rgba(56, 189, 248, 0.5);
            }
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
                font-size: 2.8rem;
                background: #070a12;
                width: 70px;
                height: 70px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                border: 2px solid var(--border-color);
                flex-shrink: 0;
            }
            .diagnosis-info h2 {
                margin: 0 0 6px 0;
                font-size: 1.35rem;
                font-weight: 700;
            }
            .diagnosis-info p {
                margin: 0;
                color: var(--text-muted);
                font-size: 0.92rem;
                line-height: 1.4;
            }
            .chart-wrapper {
                position: relative;
                height: 340px;
                width: 100%;
            }
            .test-tips {
                margin-top: 15px;
                font-size: 0.82rem;
                color: #64748b;
                text-align: center;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="brand-header">
                <div class="logo-container">
                    <svg class="radar-logo-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="45" cy="45" r="38" stroke="url(#cyan-grad)" stroke-width="2.5" opacity="0.4"/>
                        <circle cx="45" cy="45" r="28" stroke="url(#cyan-grad)" stroke-width="3" opacity="0.6"/>
                        <circle cx="45" cy="45" r="18" stroke="url(#cyan-grad)" stroke-width="3.5"/>
                        <path d="M 45 17 A 28 28 0 0 1 73 45" stroke="#38bdf8" stroke-width="4" stroke-linecap="round"/>
                        <path d="M 45 27 A 18 18 0 0 1 63 45" stroke="#38bdf8" stroke-width="4.5" stroke-linecap="round"/>
                        <path d="M41 39C41 39 45 37 45 37C45 37 49 39 49 39V44C49 48 45 51 45 51C45 51 41 48 41 44V39Z" fill="#38bdf8"/>
                        <line x1="60" y1="60" x2="82" y2="82" stroke="url(#cyan-grad)" stroke-width="7" stroke-linecap="round"/>
                        <line x1="60" y1="60" x2="82" y2="82" stroke="#070a12" stroke-width="2" stroke-linecap="round"/>
                        <defs>
                            <linearGradient id="cyan-grad" x1="0" y1="0" x2="100" y2="100">
                                <stop offset="0%" stop-color="#38bdf8"/>
                                <stop offset="100%" stop-color="#1d4ed8"/>
                            </linearGradient>
                        </defs>
                    </svg>
                    <div class="logo-text-group">
                        <span class="text-radar">Radar</span><span class="text-black">Black</span>
                    </div>
                </div>
                <div class="brand-subtitle">Detecção Inteligente de Falsos Descontos</div>
            </div>

            <div class="card">
                <div class="form-group">
                    <label>Link do Produto na Loja</label>
                    <input type="text" id="produtoLink" placeholder="Cole o link do produto...">
                </div>

                <div class="form-group">
                    <label>Preço Atual Anunciado (R$)</label>
                    <input type="number" id="precoAtual" step="0.01" placeholder="Ex: 4500.00">
                </div>

                <button class="btn-analyze" onclick="auditarPreco()">Verificar Transparência da Oferta</button>
                <div class="test-tips">💡 Dica de teste: Digite <b>3000</b> (Verde), <b>5000</b> (Vermelho/Fake) ou <b>8000</b> (Amarelo/Estável).</div>
            </div>

            <div id="resultadoContainer" class="card result-card">
                <div class="diagnosis-box">
                    <div id="smileIcon" class="smile-badge-lg">🟡</div>
                    <div class="diagnosis-info">
                        <h2 id="diagnosticoTitulo">Analisando...</h2>
                        <p id="diagnosticoMsg"></p>
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
                const precoAtual = parseFloat(document.getElementById('precoAtual').value);
                const link = document.getElementById('produtoLink').value;

                if (!link || isNaN(precoAtual)) {
                    alert('Por favor, informe o link do produto e o preço atual.');
                    return;
                }

                let media150 = precoAtual * 1.1;
                let mesPassadoPico;
                let mesesAntigos = precoAtual * 1.02;

                // Regras limpas para controle total dos testes pelo valor digitado:
                if (precoAtual <= 3800) {
                    // Valor baixo -> Oferta Real 🟢
                    mesPassadoPico = precoAtual * 1.35; 
                } else if (precoAtual >= 4200 && precoAtual <= 6500) {
                    // Valor intermediário alto -> Simula Desconto Fake (Pico inflado) 🔴
                    mesPassadoPico = precoAtual * 1.30;
                    mesesAntigos = precoAtual * 0.90;
                } else {
                    // Valor muito alto -> Preço Estável 🟡
                    mesPassadoPico = precoAtual * 1.02;
                    media150 = precoAtual;
                }

                fetch('/api/diagnostico', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ precoAtual, pico30Dias: mesPassadoPico, media150Dias: media150 })
                })
                .then(res => res.json())
                .then(data => {
                    document.getElementById('resultadoContainer').style.display = 'block';
                    document.getElementById('smileIcon').innerText = data.icone;
                    document.getElementById('diagnosticoTitulo').innerText = data.diagnostico;
                    document.getElementById('diagnosticoMsg').innerText = data.mensagem;

                    renderizarGrafico(mesesAntigos, media150, mesPassadoPico, precoAtual);
                });
            }

            function renderizarGrafico(h5m, h3m, pico, atual) {
                const ctx = document.getElementById('graficoHistorico').getContext('2d');
                if (meuGrafico) meuGrafico.destroy();

                meuGrafico = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: ['Há 5 Meses', 'Há 3 Meses', 'Mês Passado', 'Hoje (Black Friday)'],
                        datasets: [{
                            label: 'Evolução do Preço (R$)',
                            data: [h5m, h3m, pico, atual],
                            borderColor: '#38bdf8',
                            backgroundColor: 'rgba(56, 189, 248, 0.08)',
                            fill: true,
                            tension: 0.35,
                            borderWidth: 3.5,
                            pointRadius: 6,
                            pointBackgroundColor: '#070a12',
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

app.post('/api/diagnostico', (req, res) => {
    const { precoAtual } = req.body;

    // Gatilho direto baseado na faixa de teste para facilitar sua validação
    if (precoAtual >= 4200 && precoAtual <= 6500) {
        return res.json({
            statusSmile: "TRISTE",
            icone: "🔴",
            diagnostico: "Alerta de Desconto Fake!",
            mensagem: "Detectamos que o preço foi inflado artificialmente no mês passado para forçar uma falsa ilusão de grande desconto nesta Black Friday."
        });
    }

    if (precoAtual <= 3800) {
        return res.json({
            statusSmile: "FELIZ",
            icone: "🟢",
            diagnostico: "Oferta Real e Legítima!",
            mensagem: "Auditoria aprovada: o preço atual está significativamente abaixo do patamar registrado no mês passado. Excelente oportunidade de compra!"
        });
    }

    return res.json({
        statusSmile: "NEUTRO",
        icone: "🟡",
        diagnostico: "Preço Estável na Média",
        mensagem: "O valor praticado hoje acompanha a oscilação normal de mercado, sem indícios de manipulação ou quedas expressivas."
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`RadarBlack rodando na porta ${PORT}`);
});
