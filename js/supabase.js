const SUPABASE_URL  = 'https://yyacgediqkkvztgpglkv.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5YWNnZWRpcWtrdnp0Z3BnbGt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NTI5NTksImV4cCI6MjA5OTEyODk1OX0.kaCjAnmM24_TeJNDUnokjTiNkMaJJP7GRMvAmkQrxhQ';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

const urlParams  = new URLSearchParams(window.location.search);
const LINK_TOKEN = urlParams.get('token') || null;
