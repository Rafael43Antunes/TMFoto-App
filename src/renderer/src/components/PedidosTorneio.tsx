import { useState, useEffect } from "react"
import { ArrowLeft, Plus, Search, Package, Edit2, Trash2 } from "lucide-react"

interface PedidosTorneioProps {
    torneio: any
    onBack: () => void
}

export function PedidosTorneio({ torneio, onBack }: PedidosTorneioProps) {
    const [pedidos, setPedidos] = useState<any[]>([])

    useEffect(() => {
        carregarPedidos()
    }, [torneio.id])

    const carregarPedidos = async () => {
        const resultado = await (window as any).api.getPedidos(torneio.id)
        if (resultado.sucesso) {
            setPedidos(resultado.dados)
        } else {
            console.error("Erro ao carregar pedidos:", resultado.erro)
        }
    }

    return (
        <div className="h-full min-h-[85vh] flex flex-col max-w-7xl mx-auto w-full animate-fade-in pb-8 pt-6">
            
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
                            className="pl-9 pr-4 py-2.5 bg-white dark:bg-[#1A1A1D] border border-gray-200 dark:border-[#333] rounded-xl text-sm outline-none focus:border-blue-500 text-gray-800 dark:text-white w-64"
                        />
                    </div>
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2 text-sm">
                        <Plus className="w-4 h-4" /> Novo Pedido
                    </button>
                </div>
            </div>

            {/* Tabela de Pedidos */}
            <div className="bg-white dark:bg-[#151518] border border-gray-200 dark:border-[#333] rounded-2xl overflow-hidden shadow-sm flex-1">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 dark:bg-[#1A1A1D] text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-[#333]">
                            <tr>
                                <th className="px-6 py-4 font-medium">FPP / Nome</th>
                                <th className="px-6 py-4 font-medium">Clube / Escalão</th>
                                <th className="px-6 py-4 font-medium">Contacto</th>
                                <th className="px-6 py-4 font-medium">Produtos</th>
                                <th className="px-6 py-4 font-medium">Valor</th>
                                <th className="px-6 py-4 font-medium">Estado</th>
                                <th className="px-6 py-4 font-medium text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-[#2A2A2A]">
                            {pedidos.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                        <Package className="w-8 h-8 mx-auto mb-3 opacity-20" />
                                        Nenhum pedido registado neste torneio.
                                    </td>
                                </tr>
                            ) : (
                                pedidos.map((pedido) => (
                                    <tr key={pedido.id} className="hover:bg-gray-50 dark:hover:bg-[#1A1A1D]/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-800 dark:text-gray-200">{pedido.nome}</div>
                                            <div className="text-xs text-gray-500">FPP: {pedido.numero_atleta || 'N/A'}</div>
                                        </td>
                                        {/* Restantes colunas (vamos preencher melhor depois de criarmos o modal de adicionar) */}
                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{pedido.clube}</td>
                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{pedido.telemovel || pedido.email}</td>
                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{pedido.produtos}</td>
                                        <td className="px-6 py-4 font-medium text-emerald-600">{pedido.valor_total}€</td>
                                        <td className="px-6 py-4">
                                            <span className="px-2.5 py-1 bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-500 text-xs font-medium rounded-full">
                                                {pedido.estado}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                                                <button className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                                            </div>
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