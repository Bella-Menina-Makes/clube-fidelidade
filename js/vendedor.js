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

        // Filtra apenas as compras pendentes do ciclo atual
        const { data: compras, error: erroCompras } = await supabaseClient
            .from('compras')
            .select('valor')
            .eq('cliente_id', cliente.id)
            .eq('status_premio', 'Pendente');

        if (erroCompras) throw erroCompras;

        let saldoAcumulado = compras ? compras.reduce((t, c) => t + parseFloat(c.valor), 0) : 0;

        document.getElementById('cliente-nome').innerText = cliente.nome;
        document.getElementById('cliente-info').innerText = `Tel: ${cliente.telefone} | Email: ${cliente.email}`;
        document.getElementById('cliente-saldo').innerText = `R$ ${saldoAcumulado.toFixed(2)}`;

        const statusPremioDiv = document.getElementById('cliente-status-premio');
        const btnResgatar = document.getElementById('btn-resgatar-premio');
        
        // Sincroniza o painel com base no status real do banco de dados
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
    } catch (err) { 
        console.error(err);
        alert('Erro ao buscar informações do cliente: ' + err.message);
    }
});

// AÇÃO DE LANÇAR COMPRA
document.getElementById('form-lancar-compra').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!clienteAtual) return;

    const valorCompra = parseFloat(document.getElementById('valor-compra').value);
    const cupomCompra = document.getElementById('cupom-compra').value.trim();

    try {
        const { error: erroInsert } = await supabaseClient.from('compras').insert([{ 
            cliente_id: clienteAtual.id, 
            valor: valorCompra, 
            cupom: cupomCompra,
            status_premio: 'Pendente'
        }]);

        if (erroInsert) throw erroInsert;

        const { data: compras, error: erroCalculo } = await supabaseClient
            .from('compras')
            .select('valor')
            .eq('cliente_id', clienteAtual.id)
            .eq('status_premio', 'Pendente');

        if (erroCalculo) throw erroCalculo;

        const novoSaldo = compras.reduce((t, c) => t + parseFloat(c.valor), 0);

        if (novoSaldo >= metaFidelidade && !clienteAtual.premiado) {
            const { error: erroUpdate } = await supabaseClient
                .from('clientes')
                .update({ premiado: true, data_premiacao: new Date().toISOString() })
                .eq('id', clienteAtual.id);
                
            if (erroUpdate) throw erroUpdate;
            
            alert("🎉 Compra lançada! O cliente atingiu a meta e está PREMIADO!");
        } else {
            alert('Compra registrada com sucesso!');
        }
        resetarPainel();
    } catch (err) { 
        console.error(err);
        alert('Erro ao salvar a compra: ' + err.message); 
    }
});

// BOTÃO DE RESGATAR PRÊMIO (MUDANÇA CRÍTICA DE REFERÊNCIA)
if (document.getElementById('btn-resgatar-premio')) {
    document.getElementById('btn-resgatar-premio').addEventListener('click', async () => {
        // CORREÇÃO PREVENTIVA: Garante que temos o código digitado no campo de busca original
        const codigoInput = document.getElementById('busca-codigo').value.trim().toUpperCase();
        if (!clienteAtual || !codigoInput) { alert('Erro: Código do cliente inválido ou ausente.'); return; }
        
        if (!confirm(`Deseja confirmar o resgate do prêmio para ${clienteAtual.nome}?\nIsso irá zerar o status de premiado e reiniciar o saldo de acúmulo.`)) return;

        try {
            // 1. Atualiza o status das compras pendentes deste cliente para 'Resgatado'
            const { error: erroUpdateCompras } = await supabaseClient
                .from('compras')
                .update({ status_premio: 'Resgatado' })
                .eq('cliente_id', clienteAtual.id)
                .eq('status_premio', 'Pendente');

            if (erroUpdateCompras) throw erroUpdateCompras;

            // 2. CORREÇÃO DE IMPACTO: Atualiza o cliente usando explicitamente o "codigo" único da busca
            // Isso evita falhas caso o 'id' em formato UUID sofra dessincronização local na memória do JS
            const { error: erroUpdateCliente } = await supabaseClient
                .from('clientes')
                .update({ premiado: false, data_premiacao: null })
                .eq('codigo', codigoInput);

            if (erroUpdateCliente) throw erroUpdateCliente;

            alert('🎁 Prêmio entregue com sucesso! O sistema foi completamente atualizado e o cliente já pode consultar seu saldo zerado.');
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
