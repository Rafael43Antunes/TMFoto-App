import { useState, useEffect } from "react"
import { ArrowLeft, Plus, Search, Package, Edit2, Trash2, Check, X} from "lucide-react"
import { ModalNovoPedido } from './ModalNovoPedido'
import { ModalEditarPedido } from './ModalEditarPedido'
import { ModalConfirmarApagarPedido } from './ModalConfirmarApagarPedido'
import { ModalReverterEstado } from './ModalReverterEstado'
import { ModalConfirmarEliminarDefinitivo } from './ModalConfirmarEliminarDefinitivo'

interface PedidosTorneioProps {
    torneio: any
    onBack: () => void
}

export function PedidosTorneio({ torneio, onBack }: PedidosTorneioProps) {
    const [pedidos, setPedidos] = useState<any[]>([])
    const [showModalNovoPedido, setShowModalNovoPedido] = useState(false)

    const [pedidoParaEditar, setPedidoParaEditar] = useState<any>(null)
    const [pedidoParaApagar, setPedidoParaApagar] = useState<any>(null)
    const [pedidoParaReverter, setPedidoParaReverter] = useState<any>(null)

    const [pedidosApagados, setPedidosApagados] = useState<any[]>([])
    const [tabAtiva, setTabAtiva] = useState<'ativos' | 'apagados'>('ativos')

    const [pesquisa, setPesquisa] = useState('')

    useEffect(() => {
        carregarPedidos()
    }, [torneio.id])

    const [pedidoParaEliminarDefinitivo, setPedidoParaEliminarDefinitivo] = useState<any>(null)

    useEffect(() => {
        const correrLimpeza = async () => {
            await (window as any).api.limparReciclagemAutomatica()
            carregarPedidos()
        }
        correrLimpeza()
    }, [torneio.id])

    const carregarPedidos = async () => {
        const resultado = await (window as any).api.getPedidos(torneio.id)
        const resultadoApagados = await (window as any).api.getPedidosApagados(torneio.id)

        if (resultado.sucesso) {
            setPedidos(resultado.dados)
        } else{
            console.error("Erro ao carregar pedidos:", resultado.erro)
        }

        if (resultadoApagados.sucesso) {
            setPedidosApagados(resultadoApagados.dados)
        } else {
            console.error("Erro ao carregar pedidos apagados:", resultadoApagados.erro)
        }
    }

    const alternarEstadoPedido = async (pedido: any) => {
        // A lógica do botão com o novo aviso
        if (pedido.estado === 'concluido') {
            setPedidoParaReverter(pedido)
            return
        }

        const resultado = await (window as any).api.updateEstadoPedido({
            id: pedido.id,
            estado: 'concluido'
        })

        if (resultado.sucesso) {
            // A MAGIA AQUI: Se o backend disser que fechou o torneio, guarda o post-it
            if (resultado.torneioAutoConcluido) {
                sessionStorage.setItem('alertaTorneioFechado', 'true')
            }
            carregarPedidos()
        } else {
            alert("Erro ao alterar estado: " + resultado.erro)
        }
    }

    const restaurarPedido = async (id: number) => {
        const resultado = await (window as any).api.restorePedido(id)
        if (resultado.sucesso) {
            carregarPedidos()
        } else {
            alert("Erro ao restaurar: " + resultado.erro)
        }
    }

    

    return (
        <div className="h-full min-h-[85vh] flex flex-col max-w-7xl mx-auto w-full animate-fade-in px-8 lg:px-12 pt-6 pb-8">
            
            {/* Cabeçalho de Navegação */}
            <div className="flex items-center gap-4 mb-8">
                <button 
                    onClick={onBack}
                    className="p-2.5 bg-white dark:bg-[#1A1A1D] border border-gray-200 dark:border-[#333] hover:bg-gray-50 dark:hover:bg-[#2A2A2A] rounded-xl transition-colors text-gray-600 dark:text-gray-400"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white tracking-tight">{torneio.nome}</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm flex items-center gap-2">
                        <span>{torneio.data_evento}</span>
                        <span>•</span>
                        <span>{pedidos.length} pedidos registados</span>
                    </p>
                </div>
                
                <div className="ml-auto flex gap-3">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                            type="text"
                            placeholder="Procurar atleta..."
                            value={pesquisa}
                            onChange={(e) => setPesquisa(e.target.value)}
                            className="pl-9 pr-4 py-2.5 bg-white dark:bg-[#1A1A1D] border border-gray-200 dark:border-[#333] rounded-xl text-sm outline-none focus:border-blue-500 text-gray-800 dark:text-white w-64"
                        />
                    </div>
                    <button 
                        onClick={() => setShowModalNovoPedido(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2 text-sm"
                    >
                        <Plus className="w-4 h-4" /> Novo Pedido
                    </button>
                </div>
            </div>
            <div className="flex items-center gap-6 border-b border-gray-200 dark:border-[#333] mb-6">
                <button 
                    onClick={() => setTabAtiva('ativos')}
                    className={`pb-4 text-sm font-medium transition-colors relative ${tabAtiva === 'ativos' ? 'text-blue-600 dark:text-blue-500' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'}`}
                >
                    Pedidos Ativos ({pedidos.length})
                    {tabAtiva === 'ativos' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-500 rounded-t-full"></span>}
                </button>
                <button 
                    onClick={() => setTabAtiva('apagados')}
                    className={`pb-4 text-sm font-medium transition-colors relative ${tabAtiva === 'apagados' ? 'text-red-600 dark:text-red-500' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'}`}
                >
                    Reciclagem ({pedidosApagados.length})
                    {tabAtiva === 'apagados' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600 dark:bg-red-500 rounded-t-full"></span>}
                </button>
            </div>

            {/* Tabela de Pedidos */}
            <div className="bg-white dark:bg-[#151518] border border-gray-200 dark:border-[#333] rounded-2xl shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="overflow-auto flex-1">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 dark:bg-[#1A1A1D] text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-[#333]">
                            <tr>
                                <th className="px-6 py-4 font-medium">FPP</th>
                                <th className="px-4 py-4 font-medium">Nome</th>
                                <th className="px-6 py-4 font-medium">Clube</th>
                                <th className="px-4 py-4 font-medium">Escalão</th>
                                <th className="px-6 py-4 font-medium">Contacto</th>
                                <th className="px-6 py-4 font-medium">Produtos</th>
                                <th className="px-6 py-4 font-medium">Valor</th>
                                <th className="px-6 py-4 font-medium">Estado</th>
                                <th className="px-6 py-4 font-medium text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-[#2A2A2A]">
                            {tabAtiva === 'ativos' && (
                                pedidos.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                            <Package className="w-8 h-8 mx-auto mb-3 opacity-20" />
                                            Nenhum pedido registado neste torneio.
                                        </td>
                                    </tr>
                                ) : (
                                    pedidos
                                        .filter(pedido => 
                                            (pedido.nome || '').toLowerCase().includes(pesquisa.toLowerCase()) || 
                                            String(pedido.numero_fpp || '').includes(pesquisa) ||
                                            (pedido.clube || '').toLowerCase().includes(pesquisa.toLowerCase())
                                        )
                                        .map((pedido) => (
                                        <tr key={pedido.id} className="hover:bg-gray-50 dark:hover:bg-[#1A1A1D]/50 transition-colors">
                                            <td className="px-4 py-4 font-medium text-gray-800 dark:text-gray-200">{pedido.numero_fpp}</td>
                                            <td className="px-4 py-4 text-gray-800 dark:text-gray-200">{pedido.nome}</td>
                                            <td className="px-4 py-4 text-gray-600 dark:text-gray-400">{pedido.clube}</td>
                                            <td className="px-4 py-4 text-gray-600 dark:text-gray-400">{pedido.escalao}</td>
                                            <td className="px-4 py-4 text-gray-600 dark:text-gray-400 text-xs">
                                                <div>{pedido.telemovel}</div>
                                                <div className="text-gray-400">{pedido.email}</div>
                                            </td>
                                            <td className="px-4 py-4 text-gray-600 dark:text-gray-400">
                                                {pedido.tipo_pedido}
                                                {pedido.podio === 1 && 
                                                    <span className="ml-2 px-2 py-0.5 bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 text-[10px] font-bold rounded">
                                                        PÓDIO
                                                    </span>
                                                }
                                            </td>
                                            <td className="px-4 py-4 font-medium text-emerald-600">{pedido.valor_final}€</td>
                                            <td className="px-4 py-4">
                                                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                                                    pedido.estado === 'concluido' 
                                                    ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-500' 
                                                    : 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-500'
                                                }`}>
                                                    {pedido.estado === 'concluido' ? 'Concluído' : 'Pendente'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {/* Botão Ready */}
                                                    <button 
                                                        onClick={() => alternarEstadoPedido(pedido)}
                                                        title={pedido.estado === 'concluido' ? 'Marcar como Pendente' : 'Marcar como Concluído'}
                                                        className={`p-1.5 rounded-lg transition-colors ${
                                                            pedido.estado === 'concluido' 
                                                            ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20' 
                                                            : 'text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
                                                        }`}
                                                    >
                                                        {pedido.estado === 'concluido' ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                                                    </button>

                                                    {/* Botão Editar */}
                                                    <button 
                                                        onClick={() =>  setPedidoParaEditar(pedido) }
                                                        title="Editar Pedido"
                                                        className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>

                                                    {/* Botão Apagar */}
                                                    <button 
                                                        onClick={() => setPedidoParaApagar(pedido)}
                                                        title="Apagar Pedido"
                                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )
                            )}
                            {tabAtiva === 'apagados' && (
                                pedidosApagados.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                                            <Trash2 className="w-8 h-8 mx-auto mb-3 opacity-20" />
                                            A reciclagem está vazia.
                                        </td>
                                    </tr>
                                ) : (
                                    pedidosApagados.map((pedido) => (
                                        <tr key={pedido.id} className="opacity-60 hover:opacity-100 bg-gray-50/50 dark:bg-[#1A1A1D]/30 transition-opacity">
                                            <td className="px-4 py-4 font-medium text-gray-800 dark:text-gray-200">{pedido.numero_fpp}</td>
                                            <td className="px-4 py-4 text-gray-800 dark:text-gray-200 line-through decoration-gray-400">{pedido.nome}</td>
                                            <td className="px-4 py-4 text-gray-600 dark:text-gray-400">{pedido.clube}</td>
                                            <td className="px-4 py-4 text-gray-600 dark:text-gray-400">{pedido.escalao}</td>
                                            <td className="px-4 py-4 text-gray-600 dark:text-gray-400 text-xs">
                                                <div>{pedido.telemovel}</div>
                                            </td>
                                            <td className="px-4 py-4 text-gray-600 dark:text-gray-400">{pedido.tipo_pedido}</td>
                                            <td className="px-4 py-4 font-medium text-gray-500">{pedido.valor_final}€</td>
                                            <td className="px-4 py-4 text-xs font-bold text-red-500">Apagado</td>
                                            <td className="px-4 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button 
                                                        onClick={() => restaurarPedido(pedido.id)}
                                                        className="px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-800 transition-colors"
                                                    >
                                                        Restaurar
                                                    </button>
                                                    <button 
                                                        onClick={() => setPedidoParaEliminarDefinitivo(pedido)}
                                                        className="px-3 py-1.5 bg-gray-200 dark:bg-[#2A2A2A] text-gray-700 dark:text-gray-400 text-xs font-bold rounded-lg hover:bg-red-500 hover:text-white dark:hover:bg-red-500 transition-colors"
                                                    >
                                                        Eliminar
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )
                            )}

                        </tbody>
                    </table>
                </div>
            </div>

            <ModalNovoPedido 
                isOpen={showModalNovoPedido} 
                onClose={() => setShowModalNovoPedido(false)} 
                onSuccess={carregarPedidos} 
                torneioId={torneio.id} 
            />

            <ModalEditarPedido
                isOpen={pedidoParaEditar !== null}
                onClose={() => setPedidoParaEditar(null)}
                onSuccess={carregarPedidos}
                pedido={pedidoParaEditar}
            />

            <ModalConfirmarApagarPedido
                isOpen={pedidoParaApagar !== null}
                onClose={() => setPedidoParaApagar(null)}
                onSuccess={carregarPedidos}
                pedido={pedidoParaApagar}
            />

            <ModalReverterEstado
                isOpen={pedidoParaReverter !== null}
                onClose={() => setPedidoParaReverter(null)}
                onSuccess={carregarPedidos}
                pedido={pedidoParaReverter}
            />

            <ModalConfirmarEliminarDefinitivo
                isOpen={pedidoParaEliminarDefinitivo !== null}
                onClose={() => setPedidoParaEliminarDefinitivo(null)}
                onSuccess={carregarPedidos}
                pedido={pedidoParaEliminarDefinitivo}
            />
        </div>
    )
}