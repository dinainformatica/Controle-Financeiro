import {
    createContext,
    useContext,
    useEffect,
    useState,
} from 'react'

import { supabase } from '../services/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [usuario, setUsuario] = useState(null)
    const [carregando, setCarregando] = useState(true)

    useEffect(() => {
        let ativo = true

        const {
            data: { subscription }
        } = supabase.auth.onAuthStateChange(
            (_evento, sessao) => {
                if(!ativo)
                    return

                setUsuario(sessao?.user ?? null)
                setCarregando(false)
            }
        )

        supabase.auth.getSession().then(({ data, error }) => {
            if (!ativo)
                return

            if (error) {
                console.error('Erro ao recuperar sessão: ', error)
            }

            setUsuario(data.session?.user ?? null)
            setCarregando(false)
        })

        return() => {
            ativo = false
            subscription.unsubscribe()
        }
    }, [])

    async function entrar(email, senha) {
        return supabase.auth.signInWithPassword({
            email,
            password: senha
        })
    }

    async function cadastrar(nome, email, senha) {
        return supabase.auth.signUp({
            email,
            password: senha,
            options: {
                data: { nome },
                emailRedirectTo: window.location.origin + '/login'
            }
        })
    }

    async function sair() {
        return supabase.auth.signOut()
    }

    return (
        <AuthContext.Provider value={{
            usuario,
            carregando,
            entrar,
            cadastrar,
            sair
        }}
        >
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const contexto = useContext(AuthContext)

    if(!contexto) {
        throw new Error('useAuth deve ser usado dentro de AuthProvider')
    }

    return contexto
}