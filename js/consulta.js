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

        // 2. BUSCA AS COMPRAS - AJUSTADO: Filtra apenas cupons ativos que ainda NÃO foram resgatados
        const { data: compras, error: erroCompras } = await supabaseClient
            .from('compras')
            .select('*')
            .eq('cliente_id', cliente.id)
            .eq('status_premio', 'Pendente') // Remove os cupons já usados da listagem
            .order('data_compra', { ascending: false });

        if (erroCompras) throw erroCompras;

        const tabelaCorpo = document.getElementById('lista-compras');
        tabelaCorpo.innerHTML = '';
        let saldoTotal = 0;

        // 3. RENDERIZA A TABELA E CALCULA O SALDO EM TEMPO REAL
        if (compras && compras.length > 0) {
            compras.forEach(compra => {
                saldoTotal += parseFloat(compra.valor);

                // CORREÇÃO DE EXIBIÇÃO DA DATA LOCAL: Evita que o fuso horário altere o dia na tela
                const dataBanco = compra.data_compra;
                let dataFormatada = '---';
                
                if (dataBanco) {
                    // Adiciona tratamento para interpretar a data sem distorção de fuso horário
                    const dataPura = dataBanco.split('T')[0];
                    if(dataPura.includes('-')) {
                        const [ano, mes, dia] = dataPura.split('-');
                        dataFormatada = `${dia}/${mes}/${ano}`;
                    } else {
                        dataFormatada = new Date(dataBanco).toLocaleDateString('pt-BR');
                    }
                }

                const valorFormatado = parseFloat(compra.valor).toFixed(2);

                const linha = `
                    <tr style="border-bottom: 1px solid #ddd;">
                        <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${dataFormatada}</td>
                        <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${compra.cupom || '---'}</td>
                        <td style="padding: 10px; border: 1px solid #ddd; text-align: center; color: #27ae60; font-weight: bold;">R$ ${valorFormatado}</td>
                    </tr>
                `;
                tabelaCorpo.innerHTML += linha;
            });
        } else {
            tabelaCorpo.innerHTML = `
                <tr>
                    <td colspan="3" style="padding: 20px; text-align: center; color: #999;">Nenhum cupom pendente de resgate encontrado.</td>
                </tr>
            `;
        }

        // 4. ATUALIZA OS ELEMENTOS DO PAINEL VISUAL DO CLIENTE
        document.getElementById('nome-exibicao').innerText = `Olá, ${cliente.nome}!`;
        const containerSaldo = document.getElementById('saldo-exibicao').parentElement;
        const msgPremio = document.getElementById('status-premio-cliente');

        if (cliente.premiado === true) {
            containerSaldo.style.background = "#d4edda"; 
            document.getElementById('saldo-exibicao').innerHTML = `<span style="color: #155724; font-size: 18px; font-weight: bold;">🏆 META ATINGIDA!</span><br><small style="font-size: 13px; font-weight: normal; color: #155724;">Retire seu prêmio com o vendedor.</small>`;
            if (msgPremio) {
                msgPremio.innerText = "🎉 PARABÉNS! Seu prêmio está disponível para retirada!";
                msgPremio.style.color = "#2ecc71";
            }
        } else {
            containerSaldo.style.background = "#e8f4fd"; 
            document.getElementById('saldo-exibicao').innerText = `R$ ${saldoTotal.toFixed(2)}`;
            
            if (msgPremio) {
                const quantoFalta = metaFidelidadeCliente - saldoTotal;
                const quantoFaltaFormatado = quantoFalta > 0 ? quantoFalta.toFixed(2) : "0.00";
                msgPremio.innerText = `Faltam R$ ${quantoFaltaFormatado} em compras para você ganhar o seu prêmio!`;
                msgPremio.style.color = "#e67e22";
            }
        }

        document.getElementById('secao-busca-cliente').classList.add('hidden');
        document.getElementById('painel-resultado').classList.remove('hidden');

    } catch (err) { 
        console.error("Erro na consulta do cliente:", err);
        alert('Erro ao realizar a consulta do extrato: ' + err.message); 
    }
});

document.getElementById('btn-nova-consulta').addEventListener('click', () => {
    document.getElementById('codigo-cliente').value = '';
    document.getElementById('secao-busca-cliente').classList.remove('hidden');
    document.getElementById('painel-resultado').classList.add('hidden');
});
