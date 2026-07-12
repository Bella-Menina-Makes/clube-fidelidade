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

        // FILTRO AJUSTADO: Busca apenas as compras que ainda não fizeram parte de um resgate
        const { data: compras } = await supabaseClient
            .from('compras')
            .select('valor')
            .eq('cliente_id', cliente.id)
            .eq('status_premio', 'Pendente');

        let saldoAcumulado = compras ? compras.reduce((t, c) => t + parseFloat(c.valor), 0) : 0;

        document.getElementById('cliente-nome').innerText = cliente.nome;
        document.getElementById('cliente-info').innerText = `Tel: ${cliente.telefone} | Email: ${cliente.email}`;
        document.getElementById('cliente-saldo').innerText = `R$ ${saldoAcumulado.toFixed(2)}`;

        const statusPremioDiv = document.getElementById('cliente-status-premio');
        const btnResgatar = document.getElementById('btn-resgatar-premio');
        
        // Sincroniza o painel do vendedor com o status real do banco e saldo pendente
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
        // Insere a nova compra explicitando que ela inicia como 'Pendente'
        await supabaseClient.from('compras').insert([{ 
            cliente_id: clienteAtual.id, 
            valor: valorCompra, 
            cupom: cupomCompra,
            status_premio: 'Pendente'
        }]);

        const { data: compras } = await supabaseClient
            .from('compras')
            .select('valor')
            .eq('cliente_id', clienteAtual.id)
            .eq('status_premio', 'Pendente');

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

// BOTÃO DE RESGATAR PRÊMIO (MUDANÇA DE STATUS EM VEZ DE DELETAR)
if (document.getElementById('btn-resgatar-premio')) {
    document.getElementById('btn-resgatar-premio').addEventListener('click', async () => {
        if (!clienteAtual) return;
        
        if (!confirm(`Deseja confirmar o resgate do prêmio para ${clienteAtual.nome}?\nIsso irá atualizar o saldo para recomeçar o ciclo.`)) return;

        try {
            // 1. Em vez de deletar, atualiza as compras atuais para 'Resgatado'
            const { error: erroUpdateCompras } = await supabaseClient
                .from('compras')
                .update({ status_premio: 'Resgatado' })
                .eq('cliente_id', clienteAtual.id)
                .eq('status_premio', 'Pendente');

            if (erroUpdateCompras) throw erroUpdateCompras;

            // 2. Retorna o cliente ao estado inicial não-premiado
            const { error: erroUpdateCliente } = await supabaseClient
                .from('clientes')
                .update({ premiado: false, data_premiacao: null })
                .eq('id', clienteAtual.id);

            if (erroUpdateCliente) throw erroUpdateCliente;

            alert('🎁 Prêmio entregue com sucesso! O saldo foi reiniciado para novos acúmulos.');
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
