import { use, useEffect, useState } from "react"
import { Trophy, Settings, Plus, Calendar, Package, CheckCircle, Clock, ChevronRight, X, Euro, Eye, EyeOff, Edit2, Trash2 } from "lucide-react"

import { ModalPrecos } from '../components/ModalPrecos'
import { ModalNovoTorneio } from '../components/ModalNovoTorneio'
import { ModalEditarTorneio } from '../components/ModalEditarTorneio'
import { ModalConfirmarApagar } from '../components/ModalConfirmarApagar'
import { PedidosTorneio } from '../components/PedidosTorneio'

export default function GestaoPedidos() {
    const [torneios, setTorneios] = useState<any[]>([])
    const [tabAtiva, setTabAtiva] = useState<'aberto' | 'concluido' | 'apagados'>('aberto')
    const [torneiosApagados, setTorneiosApagados] = useState<any[]>([])
    const [mostrarFaturacao, setMostrarFaturacao] = useState(true)

    const [torneioAberto, setTorneioAberto] = useState<any>(null)

    const [showModalPrecos, setShowModalPrecos] = useState(false)
    const [showModalNovo, setShowModalNovo] = useState(false)
    const [torneioParaApagar, setTorneioParaApagar] = useState<any>(null)
    const [torneioParaEditar, setTorneioParaEditar] = useState<any>(null)

    const carregarTorneios = async () => {
        try{
            const resultado = await (window as any).api.getTorneios()

            if(resultado.sucesso){
                setTorneios(resultado.dados)
            }else{
                alert("Erro ao carregar base de dados: " + resultado.erro)
            }
        } catch (error){
            console.error("Falha grave na comunicação com o backend:", error)
        }
    }

    const torneiosFiltrados = torneios.filter(t => t.estado === tabAtiva)


    const carregarApagados = async () => {
        try {
            const resultado = await (window as any).api.getTorneiosApagados()
            if (resultado.sucesso) {
                setTorneiosApagados(resultado.dados)
            }
        } catch (error) {
            console.error("Erro ao carregar apagados:", error)
        }
    }

    useEffect(() => {
        carregarTorneios()
        carregarApagados()
    }, [])

    const importarDoExcel = async () => {
        const confirmar = window.confirm("Isto vai importar todas as folhas do Excel como torneios no Arquivo Concluído. Queres avançar?")
        if (!confirmar) return

        try {
            const resultado = await (window as any).api.importarTorneios()
            
            if (resultado.sucesso) {
                alert(`Sucesso! ${resultado.quantidade} torneios foram importados para o arquivo.`)
                carregarTorneios() 
            } else if (resultado.erro !== 'Operação cancelada') {
                alert("Erro na importação: " + resultado.erro)
            }
        } catch (error) {
            console.error("Erro geral:", error)
        }
    }

    if (torneioAberto) {
        return <PedidosTorneio torneio={torneioAberto} onBack={() => setTorneioAberto(null)} />
    }

    return (
       <div className="h-full min-h-[85vh] flex flex-col max-w-6xl mx-auto w-full animate-fade-in pb-8 pt-12">

            {/* Cabeçalho */}
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2 tracking-tight">Gestão de Pedidos</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                        Controla as encomendas de fotografia, envios e faturação por torneio.
                    </p>
                </div>
                
                <div className="flex gap-3">
                    <button 
                        onClick={() => setMostrarFaturacao(!mostrarFaturacao)}
                        className="bg-white dark:bg-[#1A1A1D] border border-gray-200 dark:border-[#333] hover:bg-gray-50 dark:hover:bg-[#2A2A2A] text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 px-3 py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center"
                        title={mostrarFaturacao ? "Ocultar Valores" : "Mostrar Valores"}
                    >
                        {mostrarFaturacao ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                    </button>
                    <button 
                        onClick={() => setShowModalPrecos(true)}
                        className="bg-white dark:bg-[#1A1A1D] border border-gray-200 dark:border-[#333] hover:bg-gray-50 dark:hover:bg-[#2A2A2A] text-gray-700 dark:text-gray-300 px-4 py-2.5 rounded-xl font-medium transition-all shadow-sm flex items-center gap-2"
                    >
                        <Settings className="w-5 h-5" /> Tabela de Preços
                    </button>
                
                    <button
                        onClick={() => setShowModalNovo(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" /> Novo Torneio
                    </button>

                    <button 
                        onClick={importarDoExcel}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-all shadow-md flex items-center gap-2 mr-3"
                    >
                        Importar Excel
                    </button>
                </div>
            </div>

            {/* Separadores */}
            <div className="flex gap-6 border-b border-gray-200 dark:border-[#2A2A2A] mb-6">
                <button 
                    onClick={() => setTabAtiva('aberto')}
                    className={`pb-4 text-sm font-medium transition-colors relative ${tabAtiva === 'aberto' ? 'text-blue-600 dark:text-blue-500' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" /> Torneios em Aberto
                    </div>
                    {tabAtiva === 'aberto' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-500 rounded-t-full" />}
                </button>
                
                <button 
                    onClick={() => setTabAtiva('concluido')}
                    className={`pb-4 text-sm font-medium transition-colors relative ${tabAtiva === 'concluido' ? 'text-emerald-600 dark:text-emerald-500' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                    <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" /> Arquivo Concluído
                    </div>
                    {tabAtiva === 'concluido' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 dark:bg-emerald-500 rounded-t-full" />}
                </button>

                <button 
                    onClick={() => setTabAtiva('apagados')}
                    className={`pb-4 text-sm font-medium transition-colors relative ${tabAtiva === 'apagados' ? 'text-red-500' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                    <div className="flex items-center gap-2">
                        <Trash2 className="w-4 h-4" /> Reciclagem 
                    </div>
                    {tabAtiva === 'apagados' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500 rounded-t-full" />}
                </button>
            </div>

            {/* Torneios */}
            {tabAtiva !== 'apagados' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {torneiosFiltrados.length === 0 ? (
                        <div className="col-span-full py-12 text-center text-gray-500">
                            Nenhum torneio encontrado nesta secção.
                        </div>
                    ) : (
                        torneiosFiltrados.map((torneio) => (
                            <div 
                            onClick={() => setTorneioAberto(torneio)}
                            key={torneio.id} 
                            className="bg-white dark:bg-[#1A1A1D] border border-gray-100 dark:border-[#2A2A2A] rounded-2xl p-5 hover:border-blue-500/50 hover:shadow-lg transition-all cursor-pointer group flex flex-col relative"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
                                        <Trophy className="w-6 h-6" />
                                    </div>
                                
                                    {/* Grupo de Ações alinhado à direita */}
                                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                abrirEdicao(torneio);
                                                }} 
                                            className="p-2 bg-gray-100 dark:bg-[#2A2A2D] hover:bg-blue-600 dark:hover:bg-blue-600 rounded-lg text-gray-500 dark:text-gray-400 hover:text-white transition-colors"
                                            title="Editar Torneio"
                                        >   
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation(); 
                                                setTorneioParaApagar(torneio);
                                                }} 
                                            className="p-2 bg-gray-100 dark:bg-[#2A2A2D] hover:bg-red-600 dark:hover:bg-red-600 rounded-lg text-gray-500 dark:text-gray-400 hover:text-white transition-colors"
                                            title="Apagar Torneio"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        <span className="p-2 flex items-center text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-500 transition-colors">
                                            <ChevronRight className="w-5 h-5" />
                                        </span>
                                    </div>
                                </div>
                                
                                <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-1 truncate">{torneio.nome}</h3>
                                <div className="flex items-center gap-2 text-xs text-gray-500 mb-6">
                                    <Calendar className="w-3.5 h-3.5" /> {torneio.data_evento}
                                </div>

                                <div className="grid grid-cols-2 gap-3 mt-auto pt-4 border-t border-gray-100 dark:border-[#2A2A2A]">
                                    <div>
                                        <p className="text-xs text-gray-500 mb-0.5">Pedidos</p>
                                        <p className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                                            <Package className="w-4 h-4 text-gray-400" /> {torneio.pedidos || 0}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 mb-0.5">Faturado</p>
                                        <p className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                                            <Euro className="w-4 h-4" /> 
                                            {mostrarFaturacao ? (torneio.faturado || '0.00') : '---'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
            {tabAtiva === 'apagados' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {torneiosApagados.length === 0 ? (
                        <div className="col-span-full py-12 text-center text-gray-500">
                            A reciclagem está vazia.
                        </div>
                    ) : (
                        torneiosApagados.map((torneio) => (
                            <div key={torneio.id} className="bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-2xl p-5 flex flex-col relative opacity-80">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl">
                                        <Trash2 className="w-6 h-6" />
                                    </div>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); /* Criaremos a função restaurarTorneio a seguir */ }} 
                                        className="px-3 py-1.5 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 text-xs font-bold rounded-lg hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                                    >
                                        Restaurar
                                    </button>
                                </div>
                                <h3 className="font-bold text-lg text-gray-800 dark:text-gray-300 line-through mb-1 truncate">{torneio.nome}</h3>
                                <p className="text-xs text-red-500">
                                    Apagado a: {torneio.data_apagado ? new Date(torneio.data_apagado).toLocaleDateString('pt-PT') : 'Desconhecido'}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* COMPONENTES MODAIS */}
            <ModalPrecos 
                isOpen={showModalPrecos} 
                onClose={() => setShowModalPrecos(false)} 
            />
            
            <ModalNovoTorneio 
                isOpen={showModalNovo} 
                onClose={() => setShowModalNovo(false)} 
                onSuccess={carregarTorneios} 
            />
            
            <ModalEditarTorneio 
                isOpen={torneioParaEditar !== null} 
                onClose={() => setTorneioParaEditar(null)} 
                onSuccess={carregarTorneios} 
                torneio={torneioParaEditar} 
            />
            
            <ModalConfirmarApagar 
                isOpen={torneioParaApagar !== null} 
                onClose={() => setTorneioParaApagar(null)} 
                onSuccess={() => { carregarTorneios(); carregarApagados(); }} 
                torneio={torneioParaApagar} 
            />

        </div>
    )
}