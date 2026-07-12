let metaFidelidadeCliente = 100.00;

// Busca a meta de pontuação assim que a página carrega
async function buscarMetaConfigurada() {
    try {
        const { data, error } = await supabaseClient
            .from('configuracao')
            .select('meta')
            .eq('id', 1)
            .single();
        
        if (data && !error) {
            metaFidelidadeCliente = parseFloat(data.meta);
        }
    } catch (err) {
        console.error("Erro ao obter meta:", err);
    }
}
buscarMetaConfigurada();

// Evento de Clique no Botão de Consulta
document.getElementById('btn-consultar').addEventListener('click', async () => {
    const codigoInput = document.getElementById('codigo-cliente').value.trim().toUpperCase();

    if (!codigoInput) {
        alert('Por favor, informe o seu código de cliente.');
        return;
    }

    try {
        // 1. Localiza o cliente no banco de dados pelo código promocional
        const { data: cliente, error: erroCliente } = await supabaseClient
            .from('clientes')
            .select('*')
            .eq('codigo', codigoInput)
            .single();

        if (erroCliente || !cliente) {
            alert('⚠️ Código de cliente não encontrado! Verifique se digitou corretamente.');
            return;
        }

        // 2. Busca todas as compras vinculadas a esse cliente, ordenando pelas mais recentes
        const { data: compras, error: erroCompras } = await supabaseClient
            .from('compras')
            .select('*')
            .eq('cliente_id', cliente.id)
            .order('created_at', { ascending: false }); // Traz as últimas primeiro

        // 3. Calcula o saldo total acumulado
        let saldoTotal = 0;
        const tabelaCorpo = document.getElementById('lista-compras');
        tabelaCorpo.innerHTML = ''; // Limpa resultados anteriores

        if (compras && compras.length > 0 && !erroCompras) {
            saldoTotal = compras.reduce((total, c) => total + parseFloat(c.valor), 0);

            // Preenche as linhas da tabela de histórico
            compras.forEach(compra => {
                // Formata a data vinda do banco (ex: "2026-07-11T...") para o formato brasileiro
                const dataFormatada = new Date(compra.created_at).toLocaleDateString('pt-BR');
                const valorFormatado = parseFloat(compra.valor).toFixed(2);

                const linha = `
                    <tr style="border-bottom: 1px solid #ddd;">
                        <td style="padding: 10px; border: 1px solid #ddd;">${dataFormatada}</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">${compra.cupom || '---'}</td>
                        <td style="padding: 10px; border: 1px solid #ddd; color: #27ae60; font-weight: bold;">R$ ${valorFormatado}</td>
                    </tr>
                `;
                tabelaCorpo.innerHTML += linha;
            });
        } else {
            // Se não houver compras registradas ainda
            tabelaCorpo.innerHTML = `
                <tr>
                    <td colspan="3" style="padding: 20px; text-align: center; color: #999;">Nenhuma compra registrada neste código ainda.</td>
                </tr>
            `;
        }

        // 4. Exibe na tela as informações do cliente
        document.getElementById('nome-exibicao').innerText = `Olá, ${cliente.nome}!`;
        document.getElementById('saldo-exibicao').innerText = `R$ ${saldoTotal.toFixed(2)}`;

        // Mensagem dinâmica sobre o prêmio
        const msgPremio = document.getElementById('status-premio-cliente');
        if (cliente.premiado || saldoTotal >= metaFidelidadeCliente) {
            msgPremio.innerText = "🎉 Parabéns! Você atingiu a meta e seu prêmio está disponível!";
            msgPremio.style.color = "#2ecc71";
        } else {
            const quantoFalta = metaFidelidadeCliente - saldoTotal;
            msgPremio.innerText = `Faltam apenas R$ ${quantoFalta.toFixed(2)} em compras para você ganhar o seu prêmio!`;
            msgPremio.style.color = "#e67e22";
        }

        // Alterna os painéis visuais
        document.getElementById('secao-busca-cliente').classList.add('hidden');
        document.getElementById('painel-resultado').classList.remove('hidden');

    } catch (err) {
        console.error(err);
        alert('Ocorreu um erro ao realizar a consulta.');
    }
});

// Evento para voltar à tela inicial de consulta
document.getElementById('btn-nova-consulta').addEventListener('click', () => {
    document.getElementById('codigo-cliente').value = '';
    document.getElementById('secao-busca-cliente').classList.remove('hidden');
    document.getElementById('painel-resultado').classList.add('hidden');
});
