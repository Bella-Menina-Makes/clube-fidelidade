let metaFidelidadeCliente = 100.00;

// Carrega a meta configurada no banco
async function buscarMetaConfigurada() {
    try {
        const { data, error } = await supabaseClient
            .from('configuracao')
            .select('meta')
            .eq('id', 1)
            .single();
        if (data && !error) metaFidelidadeCliente = parseFloat(data.meta);
    } catch (err) { console.error("Erro ao obter meta:", err); }
}
buscarMetaConfigurada();

document.getElementById('btn-consultar').addEventListener('click', async () => {
    const codigoInput = document.getElementById('codigo-cliente').value.trim().toUpperCase();
    if (!codigoInput) { alert('Por favor, informe o seu código de cliente.'); return; }

    try {
        // 1. BUSCA O CLIENTE
        const { data: cliente, error: erroCliente } = await supabaseClient
            .from('clientes')
            .select('*')
            .eq('codigo', codigoInput)
            .single();

        if (erroCliente || !cliente) { alert('⚠️ Código de cliente não encontrado!'); return; }

        // 2. BUSCA TODAS AS COMPRAS - CORREÇÃO: Ordenado pela coluna real 'data_compra'
        const { data: compras, error: erroCompras } = await supabaseClient
            .from('compras')
            .select('*')
            .eq('cliente_id', cliente.id)
            .order('data_compra', { ascending: false }); // Traz as mais recentes primeiro

        if (erroCompras) throw erroCompras;

        const tabelaCorpo = document.getElementById('lista-compras');
        tabelaCorpo.innerHTML = '';
        let saldoTotal = 0;

        // 3. RENDERIZA A TABELA E CALCULA O SALDO EM TEMPO REAL
        if (compras && compras.length > 0) {
            compras.forEach(compra => {
                // Soma ao saldo acumulado visível apenas se estiver Pendente
                if (compra.status_premio === 'Pendente') {
                    saldoTotal += parseFloat(compra.valor);
                }

                // CORREÇÃO: Captura a data diretamente de 'data_compra'
                const dataBanco = compra.data_compra;
                const dataFormatada = dataBanco ? new Date(dataBanco).toLocaleDateString('pt-BR') : '---';
                const valorFormatado = parseFloat(compra.valor).toFixed(2);
                
                // Marcador visual sutil se a compra pertence a um ciclo antigo já resgatado
                const sulfixoStatus = compra.status_premio === 'Resgatado' ? ' <small style="color:#95a5a6;">(Usado)</small>' : '';

                const linha = `
                    <tr style="border-bottom: 1px solid #ddd;">
                        <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${dataFormatada}</td>
                        <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${compra.cupom || '---'}${sulfixoStatus}</td>
                        <td style="padding: 10px; border: 1px solid #ddd; text-align: center; color: #27ae60; font-weight: bold;">R$ ${valorFormatado}</td>
                    </tr>
                `;
                tabelaCorpo.innerHTML += linha;
            });
        } else {
            tabelaCorpo.innerHTML = `
                <tr>
                    <td colspan="3" style="padding: 20px; text-align: center; color: #999;">Nenhuma compra registrada neste código ainda.</td>
                </tr>
            `;
        }

        // 4. ATUALIZA OS ELEMENTOS DO PAINEL VISUAL DO CLIENTE
        document.getElementById('nome-exibicao').innerText = `Olá, ${cliente.nome}!`;
        const containerSaldo = document.getElementById('saldo-exibicao').parentElement;
        const msgPremio = document.getElementById('status-premio-cliente');

        // Caso o cliente já tenha atingido a meta e o vendedor ainda não marcou como entregue
        if (cliente.premiado === true) {
            containerSaldo.style.background = "#d4edda"; 
            document.getElementById('saldo-exibicao').innerHTML = `<span style="color: #155724; font-size: 18px; font-weight: bold;">🏆 META ATINGIDA!</span><br><small style="font-size: 13px; font-weight: normal; color: #155724;">Retire seu prêmio com o vendedor.</small>`;
            if (msgPremio) {
                msgPremio.innerText = "🎉 PARABÉNS! Seu prêmio está disponível para retirada!";
                msgPremio.style.color = "#2ecc71";
            }
        } else {
            // Caso ele esteja no meio de um acúmulo normal de pontos
            containerSaldo.style.background = "#e8f4fd"; 
            document.getElementById('saldo-exibicao').innerText = `R$ ${saldoTotal.toFixed(2)}`;
            
            if (msgPremio) {
                const quantoFalta = metaFidelidadeCliente - saldoTotal;
                const quantoFaltaFormatado = quantoFalta > 0 ? quantoFalta.toFixed(2) : "0.00";
                msgPremio.innerText = `Faltam R$ ${quantoFaltaFormatado} em compras para você ganhar o seu prêmio!`;
                msgPremio.style.color = "#e67e22";
            }
        }

        // Exibe a tela de resultado
        document.getElementById('secao-busca-cliente').classList.add('hidden');
        document.getElementById('painel-resultado').classList.remove('hidden');

    } catch (err) { 
        console.error("Erro na consulta do cliente:", err);
        alert('Erro ao realizar a consulta do extrato: ' + err.message); 
    }
});

// Botão Voltar
document.getElementById('btn-nova-consulta').addEventListener('click', () => {
    document.getElementById('codigo-cliente').value = '';
    document.getElementById('secao-busca-cliente').classList.remove('hidden');
    document.getElementById('painel-resultado').classList.add('hidden');
});
