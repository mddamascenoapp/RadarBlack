const crypto = require('crypto');

// Rota para gerar o Laudo de Auditoria e Prova Digital
app.get('/api/laudo/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar histórico do produto no banco de dados
    const result = await pool.query(
      'SELECT * FROM historico_precos WHERE produto_id = $1 ORDER BY data_registro ASC',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Nenhum histórico encontrado para auditoria.' });
    }

    const registros = result.rows;
    const urlProduto = registros[0].url_produto;
    const dataEmissao = new Date().toISOString();

    // Gerar Hash SHA-256 dos dados para garantia de integridade jurídica
    const conteudoParaHash = JSON.stringify({ urlProduto, registros, dataEmissao });
    const hashAutenticidade = crypto.createHash('sha256').update(conteudoParaHash).digest('hex');

    // Estrutura do relatório retornado em JSON para renderização em PDF
    res.json({
      titulo: "LAUDO DE AUDITORIA DE PREÇOS E INTEGRIDADE DIGITAL",
      plataforma: "RadarBlack - Sistema de Monitoramento e Verificação",
      dataEmissao,
      urlProduto,
      hashAutenticidade,
      totalRegistros: registros.length,
      historico: registros.map(r => ({
        data: r.data_registro,
        preco: r.preco,
        fonte: r.origem_dados || 'Manual/Auditado'
      }))
    });
  } catch (err) {
    console.error('Erro ao gerar laudo:', err);
    res.status(500).json({ error: 'Erro interno ao processar laudo.' });
  }
});
