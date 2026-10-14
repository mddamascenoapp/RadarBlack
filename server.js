const express = require('express');
const app = express();

app.use(express.json());

// Rota principal para testar se o RadarBlack está no ar
app.get('/', (req, res) => {
    res.json({
        app: "RadarBlack",
        status: "Online 🟢",
        mensagem: "Sistema anti-fraude de preços e diagnóstico Smile operando com sucesso!"
    });
});

// Motor de Diagnóstico Smile (Simulador de regras de preços)
app.post('/api/diagnostico', (req, res) => {
    const { precoAtual, pico30Dias, media150Dias } = req.body;

    if (!precoAtual || !pico30Dias || !media150Dias) {
        return res.status(400).json({ erro: "Envie precoAtual, pico30Dias e media150Dias para calcular." });
    }

    // Regra 1: Desconto Fake / Metade do Dobro (Smile Triste 🔴)
    const houveInflacaoRecente = pico30Dias >= (media150Dias * 1.20);
    const precoVoltouAoNormal = precoAtual >= (media150Dias * 0.95);

    if (houveInflacaoRecente && precoVoltouAoNormal) {
        return res.json({
            statusSmile: "TRISTE",
            icone: "🔴",
            diagnostico: "Desconto Fake!",
            mensagem: "Atenção: Este produto teve o preço inflado recentemente para fingir desconto."
        });
    }

    // Regra 2: Desconto Real (Smile Feliz 🟢)
    const precoBemAbaixo = precoAtual <= (media150Dias * 0.88);
    const semPicoAnormal = pico30Dias <= (media150Dias * 1.10);

    if (precoBemAbaixo && semPicoAnormal) {
        return res.json({
            statusSmile: "FELIZ",
            icone: "🟢",
            diagnostico: "Oferta Real!",
            mensagem: "Menor preço dos últimos meses! Desconto legítimo verificado."
        });
    }

    // Regra 3: Preço Normal (Smile Neutro 🟡)
    return res.json({
        statusSmile: "NEUTRO",
        icone: "🟡",
        diagnostico: "Preço na Média",
        mensagem: "O preço está dentro da oscilação normal de mercado."
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`RadarBlack rodando na porta ${PORT}`);
});
