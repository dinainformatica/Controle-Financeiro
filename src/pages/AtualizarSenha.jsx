import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from '../services/supabase'

function AtualizarSenha() {
    const navigate = useNavigate()
    const [autorizado, setAutorizado] = useState(false)
    const [verificando, setVerificando] = useState(true)
    const [senha, setSenha] = useState('')
    const [confirmar, setConfirmar] = useState('')
    const [mensagem, setMensagem] = useState('')
    const [salvando, setSalvando] = useState(false)

    useEffect(() => {
        let ativo = true

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (evento) => {
                if(!ativo)
                    return

                if(evento === 'PASSWORD_RECOVERY') {
                    setAutorizado(true)
                    setVerificando(false)
                }
            }
        )

        async function verificarLink() {
            const params = new URLSearchParams(window.location.search)
            const tokenHash = params.get('token_hash')
            const tipo = params.get('type')

            if(tokenHash && tipo === 'recovery') {
                const { error } = await supabase.auth.verifyOtp({
                    token_hash: tokenHash,
                    type: 'recovery'
                })

                if(ativo) {
                    setAutorizado(!error)
                    setVerificando(false)
                }
            } else {
                // Dá tempo ao supabase para processar links com tokens na URL.
                await supabase.auth.initialize()

                if(ativo)
                    setVerificando(false)
            }
        }

        verificarLink()

        return() => {
            ativo = false
            subscription.unsubscribe()
        }
    }, [])

    async function atualizar(e) {
        e.preventDefault()
        setMensagem('')

        if(senha.length < 8 || senha !== confirmar) {
            setMensagem('Use pelo menos 8 caracteres e confirme a mesma senha.')
            return
        }

        setSalvando(true)

        if (error)  {
            setMensagem('Não foi possível atualizar a senha: ' + error.mensagem)
        } else {
            await supabase.auth.signOut()
            navigate('/login', { replace: true })
        }

        setSalvando(false)
    }

    return (
        <main className="auth-main min-vh-100">
            <div className="auth-card">
                <div className="auth-heading">
                    <h2>Definir nova senha</h2>
                    <p>Crie uma nova senha para sua conta.</p>
                </div>

                {verificando ? (
                    <p>Verificando link de recuperação...</p>
                ) : !autorizado ? (
                    <div>
                        <p className="text-danger">
                            Link inválido ou expirado. Solicitar outro link
                        </p>

                        <Link to="/recuperar-senha">Solicitar outro link</Link>
                    </div>
                ) : (
                    <form onSubmit={atualizar}>
                        {mensagem && <div className="alert alert-info">{mensagem}</div>}

                        <label htmlFor="nova-senha" className="form-label">Nova Senha</label>

                        <input
                            id="nova-senha"
                            type="password"
                            className="form-control auth-input mb-3"
                            value={senha}
                            onChange={e => setSenha(e.target.value)}
                            minLength={8}
                            autoComplete="new-password"
                            required
                        />

                        <label htmlFor="confirma-nova" className="form-label">Confirmar nova senha</label>

                        <input
                            id="confirma-nova"
                            type="password"
                            className="form-control auth-input mb-4"
                            value={confirmar}
                            onChange={e => setConfirmar(e.target.value)}
                            minLength={8}
                            autoComplete="new-password"
                            required
                        />

                        <button className="btn btn-success auth-button w-100" disabled={salvando}>
                            {salvando ? 'Salvando...' : 'Atualizar senha'}
                        </button>
                    </form>
                )
            }
            </div>
        </main>
    )
}

export default AtualizarSenha