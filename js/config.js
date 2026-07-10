// Configuração do Supabase

const SUPABASE_URL = "https://vtymyjkganxuehdzcbgj.supabase.co/rest/v1/";
const SUPABASE_ANON_KEY = "sb_publishable_6JRlAW3h8YQKFCjPQ3ZzTQ_XNSZyho9";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);
