let metaFidelidadeCliente = 100.00;

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

document.getElementById('btn-consultar').addEventListener('click', async () => {
    const codigoInput = document.getElementById('codigo-cliente').value.trim().toUpperCase();

    if (!codigoInput) {
        alert('Por favor, informe o seu código de cliente.');
        return;
    }

    try {
        // 1. Busca o cliente
        const { data: cliente, error: erroCliente } = await supabaseClient
            .from('clientes')
            .select('*')
            .eq('codigo', codigoInput)
            .single();

        if (erroCliente || !cliente) {
            alert('⚠️ Código de cliente não encontrado!');
            return;
        }

        // 2. Busca o histórico de compras completo
        const { data: compras, error: erroCompras } = await supabaseClient
            .from('compras')
            .select('*')
            .eq('cliente_id', cliente.id)
            .order('created_at', { ascending: false });

        // 3. Renderiza a tabela de histórico (Garante que sempre apareça)
        const tabelaCorpo = document.getElementById('lista-compras');
        tabelaCorpo.innerHTML = '';
        let saldoTotal = 0;

        if (compras && compras.length > 0 && !erroCompras) {
            saldoTotal = compras.reduce((total, c) => total + parseFloat(c.valor), 0);

            compras.forEach(compra => {
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
            tabelaCorpo.innerHTML = `
                <tr>
                    <td colspan="3" style="padding: 20px; text-align: center; color: #999;">Nenhuma compra registrada.</td>
                </tr>
            `;
        }

        // 4. Lógica Visual Dinâmica do Saldo vs Prêmio
        document.getElementById('nome-exibicao').innerText = `Olá, ${cliente.nome}!`;
        const containerSaldo = document.getElementById('saldo-exibicao').parentElement;
        const msgPremio = document.getElementById('status-premio-cliente');

        if (cliente.premiado) {
            // Se o vendedor ainda não deu baixa no prêmio:
            containerSaldo.style.background = "#d4edda"; // Fundo Verde claro
            document.getElementById('saldo-exibicao').innerHTML = `<span style="color: #155724; font-size: 18px;">🏆 META ATINGIDA!</span><br><small style="font-size: 13px; font-weight: normal; color: #155724;">Apresente seu código ao vendedor para retirar seu prêmio.</small>`;
            msgPremio.innerText = "🎉 PARABÉNS! Seu prêmio está disponível para retirada!";
            msgPremio.style.color = "#2ecc71";
        } else {
            // Se não atingiu ou se o prêmio já foi resgatado (premiado voltou a ser false)
            containerSaldo.style.background = "#e8f4fd"; // Fundo Azul comum
            document.getElementById('saldo-exibicao').innerText = `R$ ${saldoTotal.toFixed(2)}`;
            
            const quantoFalta = metaFidelidadeCliente - saldoTotal;
            msgPremio.innerText = `Faltam R$ ${quantoFalta.toFixed(2)} em compras para você ganhar o seu prêmio!`;
            msgPremio.style.color = "#e67e22";
        }

        document.getElementById('secao-busca-cliente').classList.add('hidden');
        document.getElementById('painel-resultado').classList.remove('hidden');

    } catch (err) {
        console.error(err);
        alert('Ocorreu um erro ao realizar a consulta.');
    }
});

document.getElementById('btn-nova-consulta').addEventListener('click', () => {
    document.getElementById('codigo-cliente').value = '';
    document.getElementById('secao-busca-cliente').classList.remove('hidden');
    document.getElementById('painel-resultado').classList.add('hidden');
});
