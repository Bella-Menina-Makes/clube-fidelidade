// Configurações de conexão com o Supabase

const supabaseUrl = 'https://vtymyjkganxuehdzcbgj.supabase.co'; 
const supabaseKey = 'sb_publishable_6JRlAW3h8YQKFCjPQ3ZzTQ_XNSZyho9';


// Mudamos o nome da constante aqui para evitar o conflito:
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
