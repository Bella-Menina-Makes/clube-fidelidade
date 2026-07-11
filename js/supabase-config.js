// Configurações de conexão com o Supabase
const SUPABASE_URL = "https://vtymyjkganxuehdzcbgj.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_6JRlAW3h8YQKFCjPQ3ZzTQ_XNSZyho9";

// Inicializa o cliente do Supabase globalmente para o projeto
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
