let clienteAtual = null;
let metaFidelidade = 100.00; // Valor padrão caso falhe a busca da configuração

// Executa ao carregar a página para buscar a meta cadastrada na tabela 'configuracao'
async function carregarMeta() {
    try {
        const { data, error } = await supabaseClient
            .from('configuracao')
            .select('meta')
            .eq('id', 1)
            .single();
        
        if (data && !error) {
            metaFidelidade = parseFloat(data.meta);
        }
    } catch (err) {
        console.error("Erro ao carregar meta:", err);
    }
}
carregarMeta();

// Evento do Botão de Buscar Cliente
document.getElementById('btn-buscar').addEventListener('click', async () => {
    const codigoInput = document.getElementById('busca-codigo').value.trim().toUpperCase();

    if (!codigoInput) {
        alert('Por favor, digite um código.');
        return;
    }

    try {
        // 1. Busca o cliente pelo código
        const { data: cliente, error: erroCliente } = await supabaseClient
            .from('clientes')
            .select('*')
            .eq('codigo', codigoInput)
            .single();

        if (erroCliente || !cliente) {
            alert('⚠️ Cliente não encontrado com esse código!');
            return;
        }

        clienteAtual = cliente;

        // 2. Busca o histórico de compras desse cliente para somar o saldo
        const { data: compras, error: erroCompras } = await supabaseClient
            .from('compras')
            .select('valor')
            .eq('cliente_id', cliente.id);

        let saldoAcumulado = 0;
        if (compras && !erroCompras) {
            saldoAcumulado = compras.reduce((total, compra) => total + parseFloat(compra.valor), 0);
        }

        // 3. Atualiza a tela com os dados encontrados
        document.getElementById('cliente-nome').innerText = cliente.nome;
        document.getElementById('cliente-info').innerText = `Tel: ${cliente.telefone} | Email: ${cliente.email}`;
        document.getElementById('cliente-saldo').innerText = `R$ ${saldoAcumulado.toFixed(2)}`;

        const statusPremioDiv = document.getElementById('cliente-status-premio');
        
        if (cliente.premiado || saldoAcumulado >= metaFidelidade) {
            statusPremioDiv.innerText = "🎉 CLIENTE PREMIADO! Meta atingida.";
            statusPremioDiv.style.color = "#2ecc71";
        } else {
            const restante = metaFidelidade - saldoAcumulado;
            statusPremioDiv.innerText = `Faltam R$ ${restante.toFixed(2)} para ganhar o prêmio (Meta: R$ ${metaFidelidade.toFixed(2)})`;
            statusPremioDiv.style.color = "#e67e22";
        }

        document.getElementById('secao-busca').classList.add('hidden');
        document.getElementById('dados-cliente').classList.remove('hidden');

    } catch (err) {
        console.error(err);
        alert('Erro ao processar a busca.');
    }
});

// Evento do Formulário de Lançar Nova Compra
document.getElementById('form-lancar-compra').addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!clienteAtual) return;

    // Captura os valores digitados no painel pelo vendedor
    const valorCompra = parseFloat(document.getElementById('valor-compra').value);
    const cupomCompra = document.getElementById('cupom-compra').value.trim();

    if (!cupomCompra) {
        alert('Por favor, informe o número do cupom.');
        return;
    }

    if (isNaN(valorCompra) || valorCompra <= 0) {
        alert('Insira um valor de compra válido.');
        return;
    }

    try {
        // 1. Registra a nova compra na tabela 'compras' enviando o cupom digitado
        const { error: erroInserir } = await supabaseClient
            .from('compras')
            .insert([
                {
                    cliente_id: clienteAtual.id,
                    valor: valorCompra,
                    cupom: cupomCompra
                }
            ]);

        if (erroInserir) {
            alert('Erro ao registrar a compra: ' + erroInserir.message);
            return;
        }

        // 2. Recalcula o saldo total
        const { data: compras } = await supabaseClient
            .from('compras')
            .select('valor')
            .eq('cliente_id', clienteAtual.id);
        
        const novoSaldo = compras.reduce((total, c) => total + parseFloat(c.valor), 0);

        // 3. Verifica se atingiu a meta para atualizar o status do cliente
        if (novoSaldo >= metaFidelidade && !clienteAtual.premiado) {
            await supabaseClient
                .from('clientes')
                .update({ 
                    premiado: true, 
                    data_premiacao: new Date().toISOString() 
                })
                .eq('id', clienteAtual.id);
            
            alert(`🎉 Compra lançada com sucesso!\n\nATENÇÃO VENDEDOR: O cliente acabou de atingir a meta de R$ ${metaFidelidade.toFixed(2)} e está PREMIADO!`);
        } else {
            alert('Compra registrada com sucesso!');
        }

        resetarPainel();

    } catch (err) {
        console.error(err);
        alert('Erro ao salvar os dados da compra.');
    }
});

// Evento do Botão Voltar/Limpar
document.getElementById('btn-limpar').addEventListener('click', resetarPainel);

function resetarPainel() {
    clienteAtual = null;
    document.getElementById('busca-codigo').value = '';
    document.getElementById('valor-compra').value = '';
    if (document.getElementById('cupom-compra')) {
        document.getElementById('cupom-compra').value = '';
    }
    document.getElementById('secao-busca').classList.remove('hidden');
    document.getElementById('dados-cliente').classList.add('hidden');
}
