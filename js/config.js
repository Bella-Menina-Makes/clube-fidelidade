// Configuração do Supabase

const SUPABASE_URL = "COLE_AQUI_SUA_URL";
const SUPABASE_ANON_KEY = "COLE_AQUI_SUA_CHAVE_ANON";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);
