document.getElementById('form-cadastro').addEventListener('submit', async (e) => {
    e.preventDefault();

    const nome = document.getElementById('nome').value.trim();
    const telefone = document.getElementById('telefone').value.trim().replace(/\D/g, ''); // Remove parênteses e traços
    const email = document.getElementById('email').value.trim().toLowerCase();

    // Gerando um código simples de 6 dígitos baseado no timestamp para garantir que seja único
    const codigoGerado = "CLI" + Math.floor(100000 + Math.random() * 900000);

    try {
        // AJUSTADO: Usa o supabaseClient para evitar o conflito de nomes
        const { data, error } = await supabaseClient
            .from('clientes')
            .insert([
                { 
                    nome: nome, 
                    telefone: telefone, 
                    email: email, 
                    codigo: codigoGerado,
                    premiado: false,
                    premio_resgatado: false
                }
            ])
            .select();

        if (error) {
            // Trata o erro se o e-mail ou telefone já existirem (Regra de Único no Banco)
            if (error.message.includes('unique') || error.code === '23505') {
                alert('⚠️ Este telefone ou e-mail já está cadastrado em nosso clube!');
            } else {
                alert('Erro ao realizar o cadastro: ' + error.message);
            }
            return;
        }

        // Se deu certo, esconde o formulário e mostra o código gerado na tela
        document.getElementById('form-cadastro').style.display = 'none';
        document.getElementById('resultado-cadastro').classList.remove('hidden');
        document.getElementById('codigo-cliente').innerText = codigoGerado;

    } catch (err) {
        console.error(err);
        alert('Ocorreu um erro inesperado ao conectar com o servidor.');
    }
});
