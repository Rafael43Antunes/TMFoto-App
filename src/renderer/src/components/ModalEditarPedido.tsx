import { useState, useEffect } from "react"
import { X, Calculator } from "lucide-react"

interface ModalEditarPedidoProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    pedido: any
}

export function ModalEditarPedido({ isOpen, onClose, onSuccess, pedido }: ModalEditarPedidoProps) {
    const [nome, setNome] = useState('')
    const [numeroFpp, setNumeroFpp] = useState('')
    const [clube, setClube] = useState('')
    const [associacao, setAssociacao] = useState('')
    const [escalao, setEscalao] = useState('')
    const [email, setEmail] = useState('')
    const [telemovel, setTelemovel] = useState('')
    const [temPodio, setTemPodio] = useState(false)

    const [tabelaPrecos, setTabelaPrecos] = useState<any[]>([])
    const [produtosSelecionados, setProdutosSelecionados] = useState<string[]>([])
    const [valorManual, setValorManual] = useState<string>('') 
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        if (isOpen && pedido) {
            carregarPrecos()
            
            // Preencher os dados existentes
            setNome(pedido.nome || '')
            setNumeroFpp(pedido.numero_fpp ? String(pedido.numero_fpp) : '')
            setClube(pedido.clube || '')
            setAssociacao(pedido.associacao || '')
            setEscalao(pedido.escalao || '')
            setEmail(pedido.email || '')
            setTelemovel(pedido.telemovel || '')
            setTemPodio(pedido.podio === 1)
            setValorManual(String(pedido.valor_final))

            // Desconstruir a string de produtos ("Fotos + Pen") para um array
            if (pedido.tipo_pedido) {
                setProdutosSelecionados(pedido.tipo_pedido.split(' + '))
            } else {
                setProdutosSelecionados([])
            }
        }
    }, [isOpen, pedido])

    const carregarPrecos = async () => {
        const resultado = await (window as any).api.getPrecos()
        if (resultado.sucesso) setTabelaPrecos(resultado.dados)
    }

    const calcularTotalAutomatico = () => {
        let total = 0
        produtosSelecionados.forEach(nomeProduto => {
            const precoItem = tabelaPrecos.find(p => p.nome_pedido === nomeProduto)
            if (precoItem) total += precoItem.valor_padrao
        })
        return total
    }

    const toggleProduto = (nomeProduto: string) => {
        setProdutosSelecionados(prev => 
            prev.includes(nomeProduto) ? prev.filter(p => p !== nomeProduto) : [...prev, nomeProduto]
        )
    }

    const gravarEdicao = async () => {
        if (!nome) {
            alert('O nome do atleta é obrigatório.')
            return
        }

        setIsSubmitting(true)
        const valorFinal = valorManual !== '' ? Number(valorManual) : calcularTotalAutomatico()

        const dados = {
            id: pedido.id,
            numero_fpp: numeroFpp || null,
            nome,
            clube,
            associacao,
            escalao,
            email,
            telemovel,
            tipo_pedido: produtosSelecionados.join(' + '),
            podio: temPodio,
            valor_final: valorFinal
        }

        const resultado = await (window as any).api.updatePedido(dados)

        if (resultado.sucesso) {
            onSuccess()
            onClose()
        } else {
            alert("Erro ao gravar pedido: " + resultado.erro)
        }
        setIsSubmitting(false)
    }

    if (!isOpen || !pedido) return null
    const totalCalculado = calcularTotalAutomatico()

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-[#151518] border border-gray-200 dark:border-[#333] rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]" onClick={e => e.stopPropagation()}>
                
                <div className="p-5 px-6 border-b border-gray-100 dark:border-[#2A2A2A] flex justify-between items-center bg-gray-50 dark:bg-[#1A1A1D]">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Editar Pedido</h2>
                        <p className="text-sm text-gray-500">Altera os dados ou corrige os produtos da encomenda.</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-gray-200 dark:bg-[#2A2A2A] hover:bg-red-500 hover:text-white rounded-lg transition-colors text-gray-600 dark:text-gray-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 flex flex-col lg:flex-row gap-8 overflow-y-auto">
                    {/* Coluna Esquerda */}
                    <div className="flex-1 space-y-4">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Dados do Atleta</h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-1">
                                <label className="block text-xs font-medium text-gray-500 mb-1">FPP</label>
                                <input type="number" value={numeroFpp} onChange={e => setNumeroFpp(e.target.value)} className="w-full bg-gray-50 dark:bg-[#1A1A1D] border border-gray-200 dark:border-[#333] text-sm rounded-lg p-2.5 outline-none focus:border-blue-500 text-gray-800 dark:text-white" />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs font-medium text-gray-500 mb-1">Nome Completo *</label>
                                <input type="text" value={nome} onChange={e => setNome(e.target.value)} className="w-full bg-gray-50 dark:bg-[#1A1A1D] border border-gray-200 dark:border-[#333] text-sm rounded-lg p-2.5 outline-none focus:border-blue-500 text-gray-800 dark:text-white" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Clube</label>
                                <input type="text" value={clube} onChange={e => setClube(e.target.value)} className="w-full bg-gray-50 dark:bg-[#1A1A1D] border border-gray-200 dark:border-[#333] text-sm rounded-lg p-2.5 outline-none focus:border-blue-500 text-gray-800 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Escalão</label>
                                <input type="text" value={escalao} onChange={e => setEscalao(e.target.value)} className="w-full bg-gray-50 dark:bg-[#1A1A1D] border border-gray-200 dark:border-[#333] text-sm rounded-lg p-2.5 outline-none focus:border-blue-500 text-gray-800 dark:text-white" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Telemóvel</label>
                                <input type="text" value={telemovel} onChange={e => setTelemovel(e.target.value)} className="w-full bg-gray-50 dark:bg-[#1A1A1D] border border-gray-200 dark:border-[#333] text-sm rounded-lg p-2.5 outline-none focus:border-blue-500 text-gray-800 dark:text-white" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-gray-50 dark:bg-[#1A1A1D] border border-gray-200 dark:border-[#333] text-sm rounded-lg p-2.5 outline-none focus:border-blue-500 text-gray-800 dark:text-white" />
                        </div>
                    </div>

                    {/* Coluna Direita */}
                    <div className="flex-1 space-y-4 border-t lg:border-t-0 lg:border-l border-gray-100 dark:border-[#2A2A2A] pt-6 lg:pt-0 lg:pl-8">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Produtos e Valores</h3>
                        <div className="space-y-2 bg-gray-50 dark:bg-[#1A1A1D] p-4 rounded-xl border border-gray-200 dark:border-[#333]">
                            {tabelaPrecos.map(preco => (
                                <label key={preco.id} className="flex items-center gap-3 cursor-pointer group">
                                    <input 
                                        type="checkbox" 
                                        checked={produtosSelecionados.includes(preco.nome_pedido)}
                                        onChange={() => toggleProduto(preco.nome_pedido)}
                                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600 dark:bg-[#2A2A2D] dark:border-gray-600"
                                    />
                                    <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 group-hover:text-blue-500 transition-colors">{preco.nome_pedido}</span>
                                    <span className="text-sm font-medium text-gray-500">{preco.valor_padrao}€</span>
                                </label>
                            ))}
                        </div>

                        <label className="flex items-center gap-3 cursor-pointer mt-4">
                            <input 
                                type="checkbox" 
                                checked={temPodio}
                                onChange={(e) => setTemPodio(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-600 dark:bg-[#2A2A2D]"
                            />
                            <span className="text-sm font-medium text-purple-700 dark:text-purple-400">Atleta foi ao pódio (Marcação Especial)</span>
                        </label>

                        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-[#333]">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-sm font-medium text-gray-500 flex items-center gap-2"><Calculator className="w-4 h-4"/> Valor Calculado:</span>
                                <span className="text-xl font-bold text-emerald-600">{totalCalculado}€</span>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Ajuste Manual de Preço (Opcional)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">€</span>
                                    <input 
                                        type="number" 
                                        value={valorManual}
                                        onChange={(e) => setValorManual(e.target.value)}
                                        className="w-full bg-white dark:bg-[#151518] border border-gray-200 dark:border-[#333] text-sm font-bold rounded-lg p-2.5 pl-8 text-gray-800 dark:text-white outline-none focus:border-emerald-500"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-gray-100 dark:border-[#2A2A2A] bg-gray-50 dark:bg-[#1A1A1D] flex justify-end gap-3 rounded-b-2xl mt-auto">
                    <button onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#2A2A2D] rounded-xl transition-colors">
                        Cancelar
                    </button>
                    <button onClick={gravarEdicao} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white px-8 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md">
                        {isSubmitting ? 'A gravar...' : 'Guardar Alterações'}
                    </button>
                </div>
            </div>
        </div>
    )
}