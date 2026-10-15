import { useState, useEffect } from "react"
import { X, Plus, Trash2 } from "lucide-react"

interface ModalPrecosProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ModalPrecos({ isOpen, onClose }: ModalPrecosProps) {
    const [precos, setPrecos] = useState<any[]>([])

    const [isAdding, setIsAdding] = useState(false)
    const [novoNome, setNovoNome] = useState('')
    const [novoValor, setNovoValor] = useState<number | ''>('')

    useEffect(() => {
        if (isOpen) {
            carregarPrecos()
            setIsAdding(false)
            setNovoNome('')
            setNovoValor('')
        }
    }, [isOpen])

    const carregarPrecos = async () => {
        const resultado = await (window as any).api.getPrecos()
        if (resultado.sucesso) {
            setPrecos(resultado.dados)
        } else {
            console.error("Erro ao carregar preços:", resultado.erro)
        }
    }

    const atualizarValorLocal = (idx: number, novoValor: number) => {
        const novosPrecos = [...precos]
        novosPrecos[idx].valor_padrao = novoValor
        setPrecos(novosPrecos)
    }

    const gravarAlteracoes = async () => {
        // Itera sobre a lista e grava as alterações no backend
        for (const item of precos) {
            await (window as any).api.updatePreco({
                id: item.id,
                nome_pedido: item.nome_pedido,
                valor_padrao: item.valor_padrao
            })
        }
        onClose()
    }

    const handleAdicionarPreco = async () => {
        if (!novoNome || novoValor === '') {
            alert("Preenche o nome e o valor do novo pedido.")
            return
        }

        const resultado = await (window as any).api.addPreco({
            nome_pedido: novoNome,
            valor_padrao: Number(novoValor)
        })

        if (resultado.sucesso) {
            setNovoNome('')
            setNovoValor('')
            setIsAdding(false)
            carregarPrecos() // Atualiza a lista instantaneamente
        } else {
            alert("Erro ao adicionar: " + resultado.erro)
        }
    }

    const apagarPreco = async (id: number) => {
        if (!window.confirm("Tens a certeza que queres apagar este tipo de pedido?")) return
        
        const resultado = await (window as any).api.deletePreco(id)
        if (resultado.sucesso) {
            carregarPrecos()
        } else {
            alert("Erro ao apagar: " + resultado.erro)
        }
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-[#151518] border border-gray-200 dark:border-[#333] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
                <div className="p-5 px-6 border-b border-gray-100 dark:border-[#2A2A2A] flex justify-between items-center bg-gray-50 dark:bg-[#1A1A1D]">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Tabela de Preços</h2>
                        <p className="text-sm text-gray-500">Define os valores padrão para novos pedidos.</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-gray-200 dark:bg-[#2A2A2A] hover:bg-red-500 hover:text-white rounded-lg transition-colors text-gray-600 dark:text-gray-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4 flex-1 overflow-y-auto">
                    {precos.map((item, idx) => (
                        <div key={item.id} className="flex items-center justify-between gap-4">
                            <input 
                                type="text" 
                                value={item.nome_pedido}
                                readOnly
                                className="flex-1 bg-gray-50 dark:bg-[#1A1A1D] border border-gray-200 dark:border-[#333] text-sm rounded-lg p-2.5 text-gray-700 dark:text-gray-300 outline-none"
                            />
                            <div className="relative w-32">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">€</span>
                                <input 
                                    type="number" 
                                    value={item.valor_padrao}
                                    onChange={(e) => atualizarValorLocal(idx, Number(e.target.value))}
                                    className="w-full bg-white dark:bg-[#151518] border border-gray-200 dark:border-[#333] text-sm font-bold rounded-lg p-2.5 pl-8 text-gray-800 dark:text-white outline-none focus:border-blue-500"
                                />
                            </div>
                            <button 
                                onClick={() => apagarPreco(item.id)}
                                className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                                title="Apagar tipo de pedido"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                
                    {isAdding ? (
                        <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/50 rounded-xl mt-4 animate-fade-in">
                            <input 
                                type="text" 
                                placeholder="Ex: Pódio"
                                value={novoNome}
                                onChange={(e) => setNovoNome(e.target.value)}
                                className="flex-1 bg-white dark:bg-[#151518] border border-gray-200 dark:border-[#333] text-sm rounded-lg p-2.5 text-gray-800 dark:text-white outline-none focus:border-blue-500"
                                autoFocus
                            />
                            <div className="relative w-24">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">€</span>
                                <input 
                                    type="number" 
                                    placeholder="0.00"
                                    value={novoValor}
                                    onChange={(e) => setNovoValor(e.target.value !== '' ? Number(e.target.value) : '')}
                                    className="w-full bg-white dark:bg-[#151518] border border-gray-200 dark:border-[#333] text-sm font-bold rounded-lg p-2.5 pl-7 text-gray-800 dark:text-white outline-none focus:border-blue-500"
                                />
                            </div>
                            <button 
                                onClick={handleAdicionarPreco}
                                className="px-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-all"
                            >
                                Guardar
                            </button>
                            <button 
                                onClick={() => { setIsAdding(false); setNovoNome(''); setNovoValor(''); }}
                                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    ) : (
                        <button 
                            onClick={() => setIsAdding(true)}
                            className="w-full py-3 mt-4 border-2 border-dashed border-gray-200 dark:border-[#333] rounded-xl text-gray-500 hover:text-blue-500 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                        >
                            <Plus className="w-4 h-4" /> Adicionar Tipo de Pedido
                        </button>
                    )}
                </div>

                <div className="p-4 border-t border-gray-100 dark:border-[#2A2A2A] bg-gray-50 dark:bg-[#1A1A1D] flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                        Cancelar
                    </button>
                    <button onClick={gravarAlteracoes} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md">
                        Gravar Preços
                    </button>
                </div>
            </div>
        </div>
    )
}