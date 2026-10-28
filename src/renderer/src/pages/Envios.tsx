import { useState, useEffect } from "react"
import { Search, ExternalLink, Cloud, Mail, MessageCircle, CheckCircle2, Clock, PackageX, Loader2, AlertTriangle, X, ArrowRight } from "lucide-react"
import { useNavigate } from 'react-router-dom'

export default function Envios() {
    const navigate = useNavigate()
    const [tabAtiva, setTabAtiva] = useState<'pendentes' | 'concluidos'>('pendentes')
    const [enviosPendentes, setEnviosPendentes] = useState<any[]>([])
    const [enviosConcluidos, setEnviosConcluidos] = useState<any[]>([])
    const [pesquisa, setPesquisa] = useState('')
    const [loading, setLoading] = useState(true)
    const [envioSelecionado, setEnvioSelecionado] = useState<any>(null)

    useEffect(() => {
        carregarDados()
        const intervalo = setInterval(carregarDados, 10000)
        return () => clearInterval(intervalo)
    }, [])

    const carregarDados = async () => {
        try {
            const resPendentes = await (window as any).api.getEnviosPendentes()
            if (resPendentes.sucesso) setEnviosPendentes(resPendentes.dados)

            const resConcluidos = await (window as any).api.getEnviosConcluidos()
            if (resConcluidos.sucesso) setEnviosConcluidos(resConcluidos.dados)
        } catch (error) {
            console.error("Erro ao carregar envios:", error)
        } finally {
            setLoading(false)
        }
    }

    const BadgeEstado = ({ concluido, label }: { concluido: boolean, label: string }) => {
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

    const listaAtual = tabAtiva === 'pendentes' ? enviosPendentes : enviosConcluidos

    const enviosFiltrados = listaAtual.filter(envio => 
        envio.nome.toLowerCase().includes(pesquisa.toLowerCase()) || 
        envio.torneio_nome.toLowerCase().includes(pesquisa.toLowerCase()) ||
        String(envio.numero_fpp || '').includes(pesquisa)
    )

    return (
        <div className="h-full min-h-[85vh] flex flex-col max-w-7xl mx-auto w-full animate-fade-in px-8 lg:px-12 pt-6 pb-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white tracking-tight">Centro de Envios</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Monitoriza a pipeline de entregas digitais por etapas.</p>
                </div>
                <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Pesquisar atleta ou torneio..." value={pesquisa} onChange={(e) => setPesquisa(e.target.value)} className="pl-9 pr-4 py-2.5 bg-white dark:bg-[#1A1A1D] border border-gray-200 dark:border-[#333] rounded-xl text-sm outline-none focus:border-blue-500 text-gray-800 dark:text-white w-72" />
                </div>
            </div>

            {/* ABAS DE NAVEGAÇÃO */}
            <div className="flex items-center gap-6 border-b border-gray-200 dark:border-[#333] mb-6">
                <button 
                    onClick={() => setTabAtiva('pendentes')}
                    className={`pb-4 text-sm font-medium transition-colors relative ${tabAtiva === 'pendentes' ? 'text-blue-600 dark:text-blue-500' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'}`}
                >
                    Pendentes ({enviosPendentes.length})
                    {tabAtiva === 'pendentes' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-500 rounded-t-full"></span>}
                </button>
                <button 
                    onClick={() => setTabAtiva('concluidos')}
                    className={`pb-4 text-sm font-medium transition-colors relative ${tabAtiva === 'concluidos' ? 'text-emerald-600 dark:text-emerald-500' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'}`}
                >
                    Concluídos ({enviosConcluidos.length})
                    {tabAtiva === 'concluidos' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-600 dark:bg-emerald-500 rounded-t-full"></span>}
                </button>
            </div>

            <div className="bg-white dark:bg-[#151518] border border-gray-200 dark:border-[#333] rounded-2xl shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="overflow-auto flex-1">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 dark:bg-[#1A1A1D] text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-[#333] sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-4 font-medium">Torneio</th>
                                <th className="px-6 py-4 font-medium">Atleta</th>
                                <th className="px-6 py-4 font-medium text-center">1. Cloud</th>
                                <th className="px-6 py-4 font-medium text-center">2. Email</th>
                                <th className="px-6 py-4 font-medium text-center">3. WhatsApp</th>
                                <th className="px-6 py-4 font-medium text-right">Ação / Pipeline</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-[#2A2A2A]">
                            {loading ? <tr><td colSpan={6} className="text-center py-12 text-gray-500">A carregar...</td></tr> : enviosFiltrados.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        <PackageX className="w-8 h-8 mx-auto mb-3 opacity-20" />
                                        {tabAtiva === 'pendentes' ? 'Sem envios pendentes. Tudo em dia!' : 'Ainda não existem envios concluídos.'}
                                    </td>
                                </tr>
                            ) : enviosFiltrados.map((envio) => (
                                <tr key={envio.id} className="hover:bg-gray-50 dark:hover:bg-[#1A1A1D]/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-gray-800 dark:text-gray-200">{envio.torneio_nome}</td>
                                    <td className="px-6 py-4">
                                        <div className="text-gray-800 dark:text-gray-200 font-medium">{envio.nome}</div>
                                        <div className="text-xs text-gray-400">FPP: {envio.numero_fpp || 'N/A'}</div>
                                    </td>
                                    <td className="px-6 py-4 text-center"><div className="flex justify-center"><BadgeEstado concluido={!!envio.link_drive} label="Upload OK" /></div></td>
                                    <td className="px-6 py-4 text-center"><div className="flex justify-center"><BadgeEstado concluido={envio.email_enviado === 1} label="Enviado" /></div></td>
                                    <td className="px-6 py-4 text-center"><div className="flex justify-center"><BadgeEstado concluido={envio.whatsapp_enviado === 1} label="Enviado" /></div></td>
                                    <td className="px-6 py-4 text-right">
                                        {envio.link_drive ? (
                                            <button onClick={() => window.open(envio.link_drive, '_blank')} title="Ver no Drive" className="inline-flex p-2 text-blue-600 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 rounded-xl transition-colors"><ExternalLink className="w-5 h-5" /></button>
                                        ) : !envio.caminho_pasta_atleta ? (
                                            <button onClick={() => setEnvioSelecionado(envio)} title="Erro: Falta Caminho" className="inline-flex p-2 text-red-500 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 rounded-xl transition-colors"><AlertTriangle className="w-5 h-5 animate-pulse" /></button>
                                        ) : (
                                            <button onClick={() => setEnvioSelecionado(envio)} title="A processar..." className="inline-flex p-2 text-blue-500 bg-blue-50 dark:bg-blue-500/10 rounded-xl"><Loader2 className="w-5 h-5 animate-spin" /></button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL DE PIPELINE */}
            {envioSelecionado && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setEnvioSelecionado(null)}>
                    <div className="bg-white dark:bg-[#151518] border border-gray-200 dark:border-[#333] rounded-2xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-gray-100 dark:border-[#2A2A2A] flex justify-between items-center bg-gray-50 dark:bg-[#1A1A1D]">
                            <h2 className="text-lg font-bold text-gray-800 dark:text-white">Pipeline de Envio</h2>
                            <button onClick={() => setEnvioSelecionado(null)} className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded-lg"><X className="w-5 h-5"/></button>
                        </div>
                        
                        <div className="p-6 space-y-6">
                            <div>
                                <h3 className="font-bold text-gray-800 dark:text-white text-lg">{envioSelecionado.nome}</h3>
                                <p className="text-sm text-gray-500">{envioSelecionado.torneio_nome}</p>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className={`mt-0.5 p-2 rounded-full ${envioSelecionado.link_drive ? 'bg-emerald-100 text-emerald-600' : !envioSelecionado.caminho_pasta_atleta ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                    {envioSelecionado.link_drive ? <CheckCircle2 className="w-5 h-5"/> : !envioSelecionado.caminho_pasta_atleta ? <AlertTriangle className="w-5 h-5"/> : <Loader2 className="w-5 h-5 animate-spin"/>}
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-gray-800 dark:text-white text-sm">1. Google Drive</h4>
                                    {envioSelecionado.link_drive ? (
                                        <p className="text-sm text-gray-500">Pasta criada e ficheiros carregados.</p>
                                    ) : !envioSelecionado.caminho_pasta_atleta ? (
                                        <div className="mt-1">
                                            <p className="text-sm font-medium text-red-500 mb-2">Falta definir o caminho da pasta do atleta!</p>
                                            <button onClick={() => { setEnvioSelecionado(null); navigate('/torneios'); }} className="text-xs font-bold text-white bg-red-500 hover:bg-red-600 px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm">
                                                Ir para os Torneios <ArrowRight className="w-3 h-3"/>
                                            </button>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500">O Trator está a gerar a pasta na cloud...</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}