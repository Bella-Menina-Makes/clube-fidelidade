let clienteAtual = null;
let metaFidelidade = 100.00;

async function carregarMeta() {
    try {
        const { data, error } = await supabaseClient
            .from('configuracao')
            .select('meta')
            .eq('id', 1)
            .single();
        if (data && !error) metaFidelidade = parseFloat(data.meta);
    } catch (err) { console.error("Erro ao carregar meta:", err); }
}
carregarMeta();

// BUSCA CLIENTE
document.getElementById('btn-buscar').addEventListener('click', async () => {
    const codigoInput = document.getElementById('busca-codigo').value.trim().toUpperCase();
    if (!codigoInput) { alert('Por favor, digite um código.'); return; }

    try {
        const { data: cliente, error: erroCliente } = await supabaseClient
            .from('clientes')
            .select('*')
            .eq('codigo', codigoInput)
            .single();

        if (erroCliente || !cliente) { alert('⚠️ Cliente não encontrado!'); return; }
        clienteAtual = cliente;

        const { data: compras } = await supabaseClient
            .from('compras')
            .select('valor')
            .eq('cliente_id', cliente.id);

        let saldoAcumulado = compras ? compras.reduce((t, c) => t + parseFloat(c.valor), 0) : 0;

        document.getElementById('cliente-nome').innerText = cliente.nome;
        document.getElementById('cliente-info').innerText = `Tel: ${cliente.telefone} | Email: ${cliente.email}`;
        document.getElementById('cliente-saldo').innerText = `R$ ${saldoAcumulado.toFixed(2)}`;

        const statusPremioDiv = document.getElementById('cliente-status-premio');
        const btnResgatar = document.getElementById('btn-resgatar-premio');
        
        if (cliente.premiado === true || saldoAcumulado >= metaFidelidade) {
            statusPremioDiv.innerText = "🎉 CLIENTE PREMIADO! Meta atingida.";
            statusPremioDiv.style.color = "#2ecc71";
            if (btnResgatar) btnResgatar.classList.remove('hidden'); 
        } else {
            const restante = metaFidelidade - saldoAcumulado;
            statusPremioDiv.innerText = `Faltam R$ ${restante.toFixed(2)} para o prêmio`;
            statusPremioDiv.style.color = "#e67e22";
            if (btnResgatar) btnResgatar.classList.add('hidden');
        }

        document.getElementById('secao-busca').classList.add('hidden');
        document.getElementById('dados-cliente').classList.remove('hidden');
    } catch (err) { console.error(err); }
});

// AÇÃO DE LANÇAR COMPRA
document.getElementById('form-lancar-compra').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!clienteAtual) return;

    const valorCompra = parseFloat(document.getElementById('valor-compra').value);
    const cupomCompra = document.getElementById('cupom-compra').value.trim();

    try {
        await supabaseClient.from('compras').insert([{ cliente_id: clienteAtual.id, valor: valorCompra, cupom: cupomCompra }]);

        const { data: compras } = await supabaseClient.from('compras').select('valor').eq('cliente_id', clienteAtual.id);
        const novoSaldo = compras.reduce((t, c) => t + parseFloat(c.valor), 0);

        if (novoSaldo >= metaFidelidade && !clienteAtual.premiado) {
            await supabaseClient.from('clientes').update({ premiado: true, data_premiacao: new Date().toISOString() }).eq('id', clienteAtual.id);
            alert("🎉 Compra lançada! O cliente atingiu a meta e está PREMIADO!");
        } else {
            alert('Compra registrada com sucesso!');
        }
        resetarPainel();
    } catch (err) { alert('Erro ao salvar compra.'); }
});

// BOTÃO DE RESGATAR PRÊMIO (AJUSTADO COM AWAIT GARANTIDO)
if (document.getElementById('btn-resgatar-premio')) {
    document.getElementById('btn-resgatar-premio').addEventListener('click', async () => {
        if (!clienteAtual) return;
        
        if (!confirm(`Deseja confirmar o resgate do prêmio para ${clienteAtual.nome}?\nIsso irá zerar o saldo e o status de premiado tanto para você quanto para o cliente.`)) return;

        try {
            // CORREÇÃO CRÍTICA: Adicionado await para garantir a exclusão completa antes do próximo passo
            const { error: erroDelete } = await supabaseClient
                .from('compras')
                .delete()
                .eq('cliente_id', clienteAtual.id);

            if (erroDelete) throw erroDelete;

            // CORREÇÃO CRÍTICA: Adicionado await para garantir que o cliente mude para false antes de fechar o painel
            const { error: erroUpdate } = await supabaseClient
                .from('clientes')
                .update({ premiado: false, data_premiacao: null })
                .eq('id', clienteAtual.id);

            if (erroUpdate) throw erroUpdate;

            alert('🎁 Prêmio entregue com sucesso! O sistema foi completamente resetado para este cliente começar de novo.');
            
            // Agora sim, limpa a tela com o banco 100% atualizado
            resetarPainel();
        } catch (err) {
            console.error(err);
            alert('Erro ao processar o resgate: ' + err.message);
        }
    });
}

document.getElementById('btn-limpar').addEventListener('click', resetarPainel);

function resetarPainel() {
    clienteAtual = null;
    document.getElementById('busca-codigo').value = '';
    document.getElementById('valor-compra').value = '';
    if (document.getElementById('cupom-compra')) document.getElementById('cupom-compra').value = '';
    const btnResgatar = document.getElementById('btn-resgatar-premio');
    if (btnResgatar) btnResgatar.classList.add('hidden');
    document.getElementById('secao-busca').classList.remove('hidden');
    document.getElementById('dados-cliente').classList.add('hidden');
}
