import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from '../services/supabase'

function RecuperarSenha() {
    const [email, setEmail] = useState('');
    const [mensagem, setMensagem] = useState('')
    const [enviando, setEnviando] = useState(false)

    async function recuperar(e) {
        e.preventDefault();
        setMensagem('')
        setEnviando(true)

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/atualizar-senha`
            })

            setMensagem(error ? 'Não foi possível processar a solicitação. Tente novamente.' : 'Se o e-mail estiver cadastrado, você receberá instruções para redefinir sua senha.')
        } catch {
            setMensagem('Erro de conexão. Tente novamente.')
        } finally {
            setEnviando(false)
        }

    }

    return (
        <main className="aith-main min-vh-100">
            <div className="auth-card">
                <div className="auth-heading">
                    <h2>Recuperar senha</h2>
                    <p>Informe o e-mail da sua conta.</p>
                </div>

                {mensagem && <div className="alert alert-info">{mensagem}</div>}

                <form onSubmit={recuperar}>
                    <label htmlFor="rec-email" className="form-label">E-mail</label>

                    <input
                        id="rec-email"
                        type="email"
                        className="form-control auth-input mb-4"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                    />

                    <button className="btn btn-success auth-button w-100" disabled={enviando}>
                        {enviando ? 'Enviando...' : 'Enviar link de recuperação'}
                    </button>
                </form>

                <p>
                    <Link to="/login" className="auth-link">Voltar ao login</Link>
                </p>
            </div>
        </main>
    )
}

export default RecuperarSenha