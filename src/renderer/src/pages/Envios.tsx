import { useState, useEffect } from "react"
import { Search, ExternalLink, Cloud, Mail, MessageCircle, CheckCircle2, Clock, PackageX } from "lucide-react"

export default function Envios() {
    const [envios, setEnvios] = useState<any[]>([])
    const [pesquisa, setPesquisa] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        carregarEnvios()
        
        // Auto-refresh a cada 30 segundos para ver o trator a trabalhar em tempo real
        const intervalo = setInterval(carregarEnvios, 30000)
        return () => clearInterval(intervalo)
    }, [])

    const carregarEnvios = async () => {
        try {
            const resultado = await (window as any).api.getEnviosGlobais()
            if (resultado.sucesso) {
                setEnvios(resultado.dados)
            }
        } catch (error) {
            console.error("Erro ao carregar envios:", error)
        } finally {
            setLoading(false)
        }
    }

    const BadgeEstado = ({ concluido, icone: Icon, label }: { concluido: boolean, icone: any, label: string }) => {
        if (concluido) {
            return (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-medium border border-emerald-200/50 dark:border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{label}</span>
                </div>
            )
        }
        return (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-500 rounded-lg text-xs font-medium border border-yellow-200/50 dark:border-yellow-500/20 opacity-80">
                <Clock className="w-3.5 h-3.5" />
                <span>Pendente</span>
            </div>
        )
    }

    const enviosFiltrados = envios.filter(envio => 
        envio.nome.toLowerCase().includes(pesquisa.toLowerCase()) || 
        envio.torneio_nome.toLowerCase().includes(pesquisa.toLowerCase()) ||
        String(envio.numero_fpp).includes(pesquisa)
    )

    return (
        <div className="h-full min-h-[85vh] flex flex-col max-w-7xl mx-auto w-full animate-fade-in px-8 lg:px-12 pt-6 pb-8">
            
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white tracking-tight">Centro de Envios</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                        Monitoriza em tempo real o estado de todas as entregas digitais.
                    </p>
                </div>
                
                <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                        type="text"
                        placeholder="Pesquisar atleta ou torneio..."
                        value={pesquisa}
                        onChange={(e) => setPesquisa(e.target.value)}
                        className="pl-9 pr-4 py-2.5 bg-white dark:bg-[#1A1A1D] border border-gray-200 dark:border-[#333] rounded-xl text-sm outline-none focus:border-blue-500 text-gray-800 dark:text-white w-72 transition-all shadow-sm"
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-[#151518] border border-gray-200 dark:border-[#333] rounded-2xl shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="overflow-auto flex-1">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 dark:bg-[#1A1A1D] text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-[#333] sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-4 font-medium">Torneio</th>
                                <th className="px-6 py-4 font-medium">Atleta</th>
                                <th className="px-6 py-4 font-medium">Contacto</th>
                                <th className="px-6 py-4 font-medium text-center">1. Cloud</th>
                                <th className="px-6 py-4 font-medium text-center">2. Email</th>
                                <th className="px-6 py-4 font-medium text-center">3. WhatsApp</th>
                                <th className="px-6 py-4 font-medium text-right">Link</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-[#2A2A2A]">
                            {loading ? (
                                <tr><td colSpan={7} className="text-center py-12 text-gray-500">A carregar dados...</td></tr>
                            ) : enviosFiltrados.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                        <PackageX className="w-8 h-8 mx-auto mb-3 opacity-20" />
                                        Nenhum pedido digital encontrado.
                                    </td>
                                </tr>
                            ) : (
                                enviosFiltrados.map((envio) => (
                                    <tr key={envio.id} className="hover:bg-gray-50 dark:hover:bg-[#1A1A1D]/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-800 dark:text-gray-200">{envio.torneio_nome}</td>
                                        <td className="px-6 py-4">
                                            <div className="text-gray-800 dark:text-gray-200 font-medium">{envio.nome}</div>
                                            <div className="text-xs text-gray-400">FPP: {envio.numero_fpp || 'N/A'}</div>
                                        </td>
                                        <td className="px-6 py-4 text-xs">
                                            <div className="text-gray-600 dark:text-gray-400">{envio.email}</div>
                                            <div className="text-gray-500">{envio.telemovel}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center">
                                                <BadgeEstado concluido={!!envio.link_drive} icone={Cloud} label="Upload OK" />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center">
                                                <BadgeEstado concluido={envio.email_enviado === 1} icone={Mail} label="Enviado" />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center">
                                                <BadgeEstado concluido={envio.whatsapp_enviado === 1} icone={MessageCircle} label="Enviado" />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {envio.link_drive ? (
                                                <button 
                                                    onClick={() => window.open(envio.link_drive, '_blank')}
                                                    title="Abrir Pasta no Google Drive"
                                                    className="inline-flex p-2 text-blue-600 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded-xl transition-colors"
                                                >
                                                    <ExternalLink className="w-5 h-5" />
                                                </button>
                                            ) : (
                                                <span className="text-xs text-gray-400 italic">A processar...</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}