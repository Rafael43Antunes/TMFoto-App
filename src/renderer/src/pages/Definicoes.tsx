import { useState, useEffect } from "react"
import { Mail, KeyRound, Save, CheckCircle2, ShieldCheck, AlertCircle, Smartphone } from "lucide-react"

import { ModalWhatsApp } from '../components/ModalWhatsApp'

export default function Definicoes() {
    const [emailUser, setEmailUser] = useState('')
    const [emailPass, setEmailPass] = useState('')
    const [guardado, setGuardado] = useState(false)
    const [erro, setErro] = useState('')

    const [showModalWhatsApp, setShowModalWhatsApp] = useState(false)

    useEffect(() => {
        carregarDefinicoes()
    }, [])

    const carregarDefinicoes = async () => {
        try {
            const config = await (window as any).api.getConfig()
            if (config.emailUser) setEmailUser(config.emailUser)
            if (config.emailPass) setEmailPass(config.emailPass)
        } catch (err) {
            console.error('Erro ao carregar definições:', err)
        }
    }

    const handleGuardar = async () => {
        setErro('')
        setGuardado(false)

        try {
            const res = await (window as any).api.setConfig({ emailUser, emailPass })
            if (res.sucesso) {
                setGuardado(true)
                setTimeout(() => setGuardado(false), 3000) 
            } else {
                setErro('Não foi possível guardar as configurações.')
            }
        } catch (err) {
            setErro('Ocorreu um erro ao comunicar com o sistema.')
        }
    }

    return (
        <div className="h-full flex flex-col max-w-4xl mx-auto w-full animate-fade-in px-8 lg:px-12 pt-6 pb-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white tracking-tight">Definições do Sistema</h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Configurações globais e credenciais de comunicação.</p>
            </div>

            <div className="bg-white dark:bg-[#1A1A1D] border border-gray-200 dark:border-[#333] rounded-2xl p-6 shadow-sm mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-1">Integração WhatsApp</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Emparelhe o telemóvel para permitir o envio automático de mensagens na Etapa 3.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowModalWhatsApp(true)}
                        className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-sm"
                    >
                        <Smartphone className="w-4 h-4" />
                        Gerir Sessão / QR Code
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-[#151518] border border-gray-200 dark:border-[#333] rounded-3xl p-8 shadow-sm">
                
                <div className="flex items-center gap-3 mb-6 border-b border-gray-100 dark:border-[#2A2A2A] pb-4">
                    <div className="p-2.5 bg-blue-50 dark:bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-500">
                        <Mail className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-800 dark:text-white">Email Remetente (Nodemailer)</h2>
                        <p className="text-sm text-gray-500">Credenciais para o sistema disparar emails automaticamente aos atletas.</p>
                    </div>
                </div>

                <div className="space-y-6 max-w-xl">
                    {/* Campo do Email */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Endereço de Email (Gmail)
                        </label>
                        <div className="relative">
                            <Mail className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input 
                                type="email" 
                                value={emailUser}
                                onChange={(e) => setEmailUser(e.target.value)}
                                placeholder="exemplo@gmail.com" 
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-[#1A1A1D] border border-gray-200 dark:border-[#333] rounded-xl text-sm outline-none focus:border-blue-500 text-gray-800 dark:text-white transition-colors" 
                            />
                        </div>
                    </div>

                    {/* Campo da Password */}
                    <div>
                        <label className="flex items-center justify-between text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            <span>Palavra-passe de Aplicação (App Password)</span>
                            <span className="flex items-center gap-1 text-xs font-normal text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-md">
                                <ShieldCheck className="w-3.5 h-3.5" /> Encriptado localmente
                            </span>
                        </label>
                        <div className="relative">
                            <KeyRound className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input 
                                type="password" 
                                value={emailPass}
                                onChange={(e) => setEmailPass(e.target.value)}
                                placeholder="Código de 16 letras gerado no Google" 
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-[#1A1A1D] border border-gray-200 dark:border-[#333] rounded-xl text-sm outline-none focus:border-blue-500 text-gray-800 dark:text-white transition-colors font-mono tracking-widest" 
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            Nunca uses a tua palavra-passe normal do Gmail. Gera uma "App Password" nas Definições de Segurança da tua Conta Google.
                        </p>
                    </div>

                    {/* Avisos e Botão Guardar */}
                    <div className="pt-4 flex items-center justify-between border-t border-gray-100 dark:border-[#2A2A2A]">
                        <div className="flex-1">
                            {erro && <p className="text-sm text-red-500 flex items-center gap-1.5"><AlertCircle className="w-4 h-4"/> {erro}</p>}
                            {guardado && <p className="text-sm text-emerald-500 flex items-center gap-1.5 font-medium animate-fade-in"><CheckCircle2 className="w-4 h-4"/> Configurações guardadas com sucesso!</p>}
                        </div>
                        
                        <button 
                            onClick={handleGuardar}
                            className="flex items-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200 px-6 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-sm"
                        >
                            <Save className="w-4 h-4" />
                            Guardar Credenciais
                        </button>
                    </div>
                </div>

            </div>
            <ModalWhatsApp 
                isOpen={showModalWhatsApp} 
                onClose={() => setShowModalWhatsApp(false)} 
            />
        </div>
    )
}