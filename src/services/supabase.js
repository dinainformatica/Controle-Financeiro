import { createClient } from '@supabase/supabase-js'
import publicada from '../config/supabase-public.json'
let local = {}
try { local = JSON.parse(localStorage.getItem('mf-supabase') || '{}') } catch { /* Reconfigurar. */ }
const url = import.meta.env.VITE_SUPABASE_URL || local.url || publicada.url
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || local.key || publicada.key
export function validarConfiguracao(url, key) {
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url)) throw new Error('Informe a URL HTTPS do projeto Supabase.')
  let role
  if (key.startsWith('eyJ')) {
    try { role = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role } catch { /* Rejeitar token inválido. */ }
  }
  if (!(key.startsWith('sb_publishable_') || role === 'anon')) throw new Error('Use somente a chave pública publishable/anon. Chaves secretas não são aceitas.')
  return { url: url.replace(/\/$/, ''), key }
}
let cliente = null
try {
  if (url && key) {
    validarConfiguracao(url, key)
    cliente = createClient(url, key, { auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  }
} catch { /* Exibir configuração sem interromper a aplicação. */ }
export const supabase = cliente
export const configurado = !!cliente
export const modoDemo = () => sessionStorage.getItem('mf-demo') === '1'
