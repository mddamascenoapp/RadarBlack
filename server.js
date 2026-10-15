const express = require('express');
const app = express();

app.use(express.json());

// Interface Visual com Logotipo SVG Idêntico à Imagem Conceito
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>RadarBlack — Inteligência e Auditoria de Preços</title>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.0.0"></script>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
            :root {
                --bg-deep: #070a12;
                --bg-card: #0f1626;
                --border-color: #1e293b;
                --accent-cyan: #38bdf8;
                --accent-blue: #2563eb;
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
                max-width: 880px;
                width: 100%;
            }
            /* Logotipo Fiel à Imagem Conceito */
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
                width: 110px;
                height: 110px;
                filter: drop-shadow(0px 0px 18px rgba(56, 189, 248, 0.4));
            }
            .logo-text-group {
                font-size: 2.6rem;
                font-weight: 800;
                letter-spacing: -0.5px;
            }
            .text-radar {
                color: #ffffff;
            }
            .text-black {
                color: #94a3b8;
            }
            .brand-subtitle {
                color: var(--text-muted);
                font-size: 0.95rem;
                font-weight: 500;
                margin-top: 6px;
                letter-spacing: 0.2px;
            }
            /* Cards da Aplicação */
            .card {
                background: var(--bg-card);
                border: 1px solid var(--border-color);
                border-radius: 18px;
                padding: 30px;
                box-shadow: 0 15px 35px -5px rgba(0, 0, 0, 0.6);
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
                font-size: 0.8rem;
                font-weight: 700;
                color: var(--text-muted);
                text-transform: uppercase;
                letter-spacing: 0.8px;
            }
            input, select {
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
            input:focus, select:focus {
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
                border-
