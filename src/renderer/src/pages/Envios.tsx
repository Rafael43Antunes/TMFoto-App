import { useState, useEffect } from "react"
import { Search, ExternalLink, Cloud, Mail, MessageCircle, CheckCircle2, Clock, PackageX, Loader2, AlertTriangle, X, ArrowRight, Check, Trash2, WifiOff, Smartphone } from "lucide-react"
import { useNavigate } from 'react-router-dom'

import { ModalWhatsApp } from '../components/ModalWhatsApp'

export default function Envios() {
    const navigate = useNavigate()
    const [tabAtiva, setTabAtiva] = useState<'pendentes' | 'concluidos'>('pendentes')
    const [enviosPendentes, setEnviosPendentes] = useState<any[]>([])
    const [enviosConcluidos, setEnviosConcluidos] = useState<any[]>([])
    const [pesquisa, setPesquisa] = useState('')
    const [loading, setLoading] = useState(true)

    const [envioSelecionado, setEnvioSelecionado] = useState<any>(null)
    const [confirmarEliminar, setConfirmarEliminar] = useState(false)
    const [confirmarConcluir, setConfirmarConcluir] = useState(false)

    const [isOnline, setIsOnline] = useState(navigator.onLine);

    const [showModalWhatsApp, setShowModalWhatsApp] = useState(false)

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        if (envioSelecionado) {
            // Procura a versão mais recente deste envio
            const envioAtualizado = enviosPendentes.find((e: any) => e.id === envioSelecionado.id) 
                                 || enviosConcluidos.find((e: any) => e.id === envioSelecionado.id);
            
            // Se encontrar dados novos e diferentes, atualiza a modal sem a fechar!
            if (envioAtualizado && JSON.stringify(envioAtualizado) !== JSON.stringify(envioSelecionado)) {
                setEnvioSelecionado(envioAtualizado);
            }
        }
    }, [enviosPendentes, enviosConcluidos]);

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

    const handleConcluirManualmente = async (id: number) => {
        const resultado = await (window as any).api.updateEstadoPedido({ id, estado: 'concluido' })
        
        if (resultado.sucesso) {
            if (resultado.torneioAutoConcluido) {
                sessionStorage.setItem('alertaTorneioFechado', 'true')
            }
            setEnvioSelecionado(null)
            setConfirmarConcluir(false)
            carregarDados()
        }
    }

    const handleEliminarPermanentemente = async (id: number) => {
        await (window as any).api.hardDeletePedido(id)
        setEnvioSelecionado(null)
        setConfirmarEliminar(false)
        carregarDados()
    }

    const openModal = (envio: any) => {
        setEnvioSelecionado(envio)
        setConfirmarEliminar(false)
        setConfirmarConcluir(false)
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
            {!isOnline && (
                <div className="bg-orange-50 dark:bg-orange-900/20 border-b border-orange-200 dark:border-orange-900/50 p-3 flex items-center justify-center gap-2 text-orange-700 dark:text-orange-400 text-sm font-bold shadow-sm animate-in slide-in-from-top">
                    <WifiOff className="w-5 h-5 animate-pulse" />
                    Sem ligação à internet! Os envios automáticos estão em pausa até a ligação regressar.
                </div>
            )}

            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white tracking-tight">Centro de Envios</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Monitoriza a pipeline de entregas digitais por etapas.</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* BOTÃO WHATSAPP */}
                    <button 
                        onClick={() => setShowModalWhatsApp(true)}
                        className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-sm"
                    >
                        <Smartphone className="w-4 h-4" />
                        Ligar WhatsApp
                    </button>

                    {/* PESQUISA */}
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" placeholder="Pesquisar atleta ou torneio..." value={pesquisa} onChange={(e) => setPesquisa(e.target.value)} className="pl-9 pr-4 py-2.5 bg-white dark:bg-[#1A1A1D] border border-gray-200 dark:border-[#333] rounded-xl text-sm outline-none focus:border-blue-500 text-gray-800 dark:text-white w-72" />
                    </div>
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
                                        <button 
                                            onClick={() => openModal(envio)} 
                                            title="Ver Pipeline" 
                                            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded-xl transition-colors"
                                        >
                                            {(!envio.caminho_pasta_atleta && !envio.link_drive) && <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />}
                                            Detalhes
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL DE PIPELINE */}
            {envioSelecionado && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in" onClick={() => setEnvioSelecionado(null)}>
                    <div className="bg-white dark:bg-[#151518] border border-gray-200 dark:border-[#333] rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                        
                        {/* Cabeçalho Modal */}
                        <div className="p-6 border-b border-gray-100 dark:border-[#2A2A2A] flex justify-between items-start bg-gray-50/50 dark:bg-[#1A1A1D]/50">
                            <div>
                                <h2 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight">{envioSelecionado.nome}</h2>
                                <p className="text-sm text-gray-500 mt-1 font-medium">{envioSelecionado.torneio_nome} • FPP: {envioSelecionado.numero_fpp || 'N/A'}</p>
                            </div>
                            <button onClick={() => setEnvioSelecionado(null)} className="p-2 text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-white dark:hover:bg-[#2A2A2A] rounded-xl transition-colors shadow-sm"><X className="w-5 h-5"/></button>
                        </div>
                        
                        <div className="p-8 space-y-10">
                            
                            
                            <div className="relative flex items-center justify-between max-w-md mx-auto w-full px-2">
                                <div className="absolute top-6 left-[15%] right-[15%] h-1 z-0">
                                    {/* A Linha Cinzenta de Fundo */}
                                    <div className="absolute inset-0 bg-gray-200 dark:bg-[#2A2A2A] rounded-full"></div>
                                    
                                    {/* A Linha Colorida de Progresso */}
                                    <div className={`absolute left-0 top-0 h-full rounded-full transition-all duration-1000 ease-out ${envioSelecionado.estado === 'concluido' || envioSelecionado.whatsapp_enviado ? 'w-full bg-emerald-500' : envioSelecionado.email_enviado ? 'w-1/2 bg-blue-500' : 'w-0'}`}></div>
                                </div>  
                                {/* Step 1: Cloud */}
                                <div className="relative z-10 flex flex-col items-center gap-3 bg-white dark:bg-[#151518] px-4">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 transition-colors ${envioSelecionado.link_drive ? 'border-emerald-500 bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10' : !envioSelecionado.caminho_pasta_atleta ? 'border-red-500 bg-red-50 text-red-500 animate-pulse' : 'border-blue-500 bg-blue-50 text-blue-500'}`}>
                                        {!envioSelecionado.caminho_pasta_atleta ? <AlertTriangle className="w-5 h-5"/> : <Cloud className="w-5 h-5"/>}
                                    </div>
                                    <span className={`text-xs font-bold ${envioSelecionado.link_drive ? 'text-emerald-600 dark:text-emerald-400' : !envioSelecionado.caminho_pasta_atleta ? 'text-red-500' : 'text-blue-600 dark:text-blue-400'}`}>Drive</span>
                                </div>

                                {/* Step 2: Email */}
                                <div className="relative z-10 flex flex-col items-center gap-3 bg-white dark:bg-[#151518] px-4">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 transition-colors ${envioSelecionado.email_enviado ? 'border-emerald-500 bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10' : envioSelecionado.link_drive ? 'border-blue-500 bg-blue-50 text-blue-500' : 'border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1A1A1D] text-gray-400'}`}>
                                        <Mail className="w-5 h-5"/>
                                    </div>
                                    <span className={`text-xs font-bold ${envioSelecionado.email_enviado ? 'text-emerald-600 dark:text-emerald-400' : envioSelecionado.link_drive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>Email</span>
                                </div>

                                {/* Step 3: WhatsApp */}
                                <div className="relative z-10 flex flex-col items-center gap-3 bg-white dark:bg-[#151518] px-4">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 transition-colors ${envioSelecionado.estado === 'concluido' || envioSelecionado.whatsapp_enviado ? 'border-emerald-500 bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10' : envioSelecionado.email_enviado ? 'border-blue-500 bg-blue-50 text-blue-500' : 'border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1A1A1D] text-gray-400'}`}>
                                        <MessageCircle className="w-5 h-5"/>
                                    </div>
                                    <span className={`text-xs font-bold ${envioSelecionado.estado === 'concluido' || envioSelecionado.whatsapp_enviado ? 'text-emerald-600 dark:text-emerald-400' : envioSelecionado.email_enviado ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>Msg</span>
                                </div>  
                            </div>

                            {/* ZONA DE AVISOS */}
                            {isOnline && !envioSelecionado.erro_processamento && envioSelecionado.estado !== 'concluido' && envioSelecionado.caminho_pasta_atleta && (
                                <div className="mt-4 bg-blue-50/80 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-xl p-3.5 flex items-center gap-3">
                                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin shrink-0" />
                                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                                        {!envioSelecionado.link_drive 
                                            ? 'A carregar fotografias para a nuvem em alta qualidade...' 
                                            : !envioSelecionado.email_enviado 
                                                ? 'A preparar e disparar email com o link do Drive...' 
                                                : 'Na fila de espera para envio automático de WhatsApp...'}
                                    </span>
                                </div>
                            )}

                            {!envioSelecionado.caminho_pasta_atleta && !envioSelecionado.link_drive && (
                                <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl p-5 flex items-start gap-4 animate-shake">
                                    <div className="p-2 bg-red-100 dark:bg-red-500/20 rounded-full shrink-0"><AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400"/></div>
                                    <div>
                                        <h4 className="font-bold text-red-800 dark:text-red-400">Atenção: Falta Caminho da Pasta!</h4>
                                        <p className="text-sm text-red-600 dark:text-red-300 mt-1 mb-3">O motor automático não sabe onde ir buscar as fotos. Edita o pedido nos Torneios e define o caminho.</p>
                                        <button onClick={() => { setEnvioSelecionado(null); navigate('/torneios'); }} className="text-sm font-bold text-white bg-red-500 hover:bg-red-600 px-4 py-2 rounded-xl flex items-center gap-2 transition-colors shadow-sm">
                                            Ir para Torneios <ArrowRight className="w-4 h-4"/>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {envioSelecionado.link_drive && (
                                <div className="bg-blue-50 dark:bg-blue-500/5 rounded-2xl p-4 flex items-center justify-between border border-blue-100 dark:border-blue-500/10">
                                    <span className="text-sm font-medium text-blue-800 dark:text-blue-300">Link gerado com sucesso:</span>
                                    <button onClick={() => window.open(envioSelecionado.link_drive, '_blank')} className="text-sm font-bold text-white bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-xl flex items-center gap-2 transition-colors shadow-sm">
                                        Abrir no Drive <ExternalLink className="w-4 h-4"/>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* RODAPÉ COM AÇÕES MANUAIS */}
                        <div className="p-6 bg-gray-50 dark:bg-[#1A1A1D] border-t border-gray-100 dark:border-[#2A2A2A] flex justify-between items-center">
                            
                            {/* ELIMINAR */}
                            {confirmarEliminar ? (
                                <div className="flex items-center gap-3 animate-fade-in">
                                    <span className="text-sm font-medium text-red-500">Apagar de vez?</span>
                                    <button onClick={() => handleEliminarPermanentemente(envioSelecionado.id)} className="text-xs font-bold bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600">Sim</button>
                                    <button onClick={() => setConfirmarEliminar(false)} className="text-xs font-bold bg-gray-200 dark:bg-[#333] text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-300">Não</button>
                                </div>
                            ) : (
                                <button 
                                    onClick={() => setConfirmarEliminar(true)} 
                                    disabled={envioSelecionado.link_drive && envioSelecionado.link_drive !== 'Expirado'}
                                    title={envioSelecionado.link_drive && envioSelecionado.link_drive !== 'Expirado' ? "Não pode eliminar um pedido com link ativo na Cloud. Aguarde a expiração (7 dias)." : "Eliminar este pedido"}
                                    className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-red-500 transition-colors px-2 py-1 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-gray-500"
                                >
                                    <Trash2 className="w-4 h-4"/> Eliminar Envio
                                </button>
                            )}

                            {/* CONCLUIR MANUALMENTE */}
                            {envioSelecionado.estado !== 'concluido' && (
                                confirmarConcluir ? (
                                    <div className="flex items-center gap-3 animate-fade-in">
                                        <span className="text-sm font-medium text-emerald-500">Forçar conclusão?</span>
                                        <button onClick={() => handleConcluirManualmente(envioSelecionado.id)} className="text-xs font-bold bg-emerald-500 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-600">Sim</button>
                                        <button onClick={() => setConfirmarConcluir(false)} className="text-xs font-bold bg-gray-200 dark:bg-[#333] text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-300">Não</button>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => setConfirmarConcluir(true)} 
                                        // Bloqueia se ainda não tiver feito upload E enviado o email
                                        disabled={!envioSelecionado.link_drive || !envioSelecionado.email_enviado}
                                        title={(!envioSelecionado.link_drive || !envioSelecionado.email_enviado) ? "Aguarde a conclusão das etapas anteriores." : "Marcar como Concluído"}
                                        className="flex items-center gap-2 text-sm font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 px-4 py-2.5 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-emerald-50 dark:disabled:hover:bg-emerald-500/10"
                                    >
                                        <CheckCircle2 className="w-5 h-5"/> Marcar como Concluído
                                    </button>
                                )
                            )}
                        </div>

                    </div>
                </div>
            )}

            <ModalWhatsApp 
                isOpen={showModalWhatsApp} 
                onClose={() => setShowModalWhatsApp(false)} 
            />
        </div>
    )
}