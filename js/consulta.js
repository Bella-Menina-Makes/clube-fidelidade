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

        // 2. BUSCA TODAS AS COMPRAS (Pendente e Resgatado) para montar o Histórico Completo
        const { data: compras, error: erroCompras } = await supabaseClient
            .from('compras')
            .select('*')
            .eq('cliente_id', cliente.id)
            .order('created_at', { ascending: false }); // Traz as mais recentes primeiro

        if (erroCompras) throw erroCompras;

        const tabelaCorpo = document.getElementById('lista-compras');
        tabelaCorpo.innerHTML = '';
        let saldoTotal = 0;

        // 3. RENDERIZA A TABELA E CALCULA O SALDO DO CICLO ATUAL
        if (compras && compras.length > 0) {
            compras.forEach(compra => {
                // Soma ao saldo VISÍVEL apenas se a compra ainda não foi utilizada em um resgate passado
                if (compra.status_premio === 'Pendente') {
                    saldoTotal += parseFloat(compra.valor);
                }

                // Formatação dos dados para exibição na tabela
                // Nota: se no seu banco a coluna for 'data_compra', altere de 'compra.created_at' para 'compra.data_compra'
                const dataBanco = compra.created_at || compra.data_compra;
                const dataFormatada = dataBanco ? new Date(dataBanco).toLocaleDateString('pt-BR') : '---';
                const valorFormatado = parseFloat(compra.valor).toFixed(2);
                
                // Identificador visual opcional para compras antigas já resgatadas
                const sulfixoStatus = compra.status_premio === 'Resgatado' ? ' <small style="color:#95a5a6;">(Resgatado)</small>' : '';

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

        // Se o cliente já está marcado como premiado no banco
        if (cliente.premiado === true) {
            containerSaldo.style.background = "#d4edda"; 
            document.getElementById('saldo-exibicao').innerHTML = `<span style="color: #155724; font-size: 18px; font-weight: bold;">🏆 META ATINGIDA!</span><br><small style="font-size: 13px; font-weight: normal; color: #155724;">Retire seu prêmio com o vendedor.</small>`;
            if (msgPremio) {
                msgPremio.innerText = "🎉 PARABÉNS! Seu prêmio está disponível para retirada!";
                msgPremio.style.color = "#2ecc71";
            }
        } else {
            // Se ele ainda está acumulando pontos no ciclo pendente
            containerSaldo.style.background = "#e8f4fd"; 
            document.getElementById('saldo-exibicao').innerText = `R$ ${saldoTotal.toFixed(2)}`;
            
            if (msgPremio) {
                const quantoFalta = metaFidelidadeCliente - saldoTotal;
                // Garante que não mostre valores negativos por arredondamento
                const quantoFaltaFormatado = quantoFalta > 0 ? quantoFalta.toFixed(2) : "0.00";
                msgPremio.innerText = `Faltam R$ ${quantoFaltaFormatado} em compras para você ganhar o seu prêmio!`;
                msgPremio.style.color = "#e67e22";
            }
        }

        // Transiciona as seções da tela
        document.getElementById('secao-busca-cliente').classList.add('hidden');
        document.getElementById('painel-resultado').classList.remove('hidden');

    } catch (err) { 
        console.error("Erro na consulta do cliente:", err);
        alert('Erro ao realizar a consulta do extrato: ' + err.message); 
    }
});

// Botão para voltar e fazer uma nova pesquisa
document.getElementById('btn-nova-consulta').addEventListener('click', () => {
    document.getElementById('codigo-cliente').value = '';
    document.getElementById('secao-busca-cliente').classList.remove('hidden');
    document.getElementById('painel-resultado').classList.add('hidden');
});
