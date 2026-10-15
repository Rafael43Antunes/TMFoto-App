import { useState } from "react"
import { X } from "lucide-react"

interface ModalNovoTorneioProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void 
}

export function ModalNovoTorneio({ isOpen, onClose, onSuccess }: ModalNovoTorneioProps) {
    const [novoNome, setNovoNome] = useState('')
    const [novaData, setNovaData] = useState('')
    const [novoCaminho, setNovoCaminho] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const gravarNovoTorneio = async () => {
        if (!novoNome || !novaData) {
            alert('Preenche pelo menos o nome e a data do torneio.')
            return
        }

        setIsSubmitting(true)

        const dados = {
            nome: novoNome,
            data_evento: novaData,
            data_criacao: new Date().toISOString(),
            caminho_pasta: novoCaminho
        }

        const resultado = await (window as any).api.addTorneio(dados)

        if (resultado.sucesso) {
            setNovoNome('')
            setNovaData('')
            setNovoCaminho('')
            onSuccess() // Manda recarregar a lista
            onClose()   // Fecha a modal
        } else {
            alert("Erro ao criar torneio: " + resultado.erro)
        }

        setIsSubmitting(false)
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-[#151518] border border-gray-200 dark:border-[#333] rounded-2xl w-full max-w-md shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                
                <div className="p-5 px-6 border-b border-gray-100 dark:border-[#2A2A2A] flex justify-between items-center bg-gray-50 dark:bg-[#1A1A1D]">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Novo Torneio</h2>
                        <p className="text-sm text-gray-500">Cria uma nova folha de encomendas.</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-gray-200 dark:bg-[#2A2A2A] hover:bg-red-500 hover:text-white rounded-lg transition-colors text-gray-600 dark:text-gray-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome do Torneio</label>
                        <input 
                            type="text" 
                            value={novoNome}
                            onChange={(e) => setNovoNome(e.target.value)}
                            placeholder="Ex: Torneio de Tomar"
                            className="w-full bg-gray-50 dark:bg-[#1A1A1D] border border-gray-200 dark:border-[#333] text-sm rounded-lg p-2.5 outline-none focus:border-blue-500 text-gray-800 dark:text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data do Evento</label>
                        <input 
                            type="date" 
                            value={novaData}
                            onChange={(e) => setNovaData(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-[#1A1A1D] border border-gray-200 dark:border-[#333] text-sm rounded-lg p-2.5 outline-none focus:border-blue-500 text-gray-800 dark:text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Caminho da Pasta (Opcional)</label>
                        <input 
                            type="text" 
                            value={novoCaminho}
                            onChange={(e) => setNovoCaminho(e.target.value)}
                            placeholder="D:\TMFoto\TorneioTomar2026"
                            className="w-full bg-gray-50 dark:bg-[#1A1A1D] border border-gray-200 dark:border-[#333] text-sm rounded-lg p-2.5 outline-none focus:border-blue-500 text-gray-800 dark:text-white font-mono"
                        />
                        <p className="text-xs text-gray-500 mt-1">Mais tarde adicionamos um botão para escolher a pasta no Windows.</p>
                    </div>
                </div>

                <div className="p-4 border-t border-gray-100 dark:border-[#2A2A2A] bg-gray-50 dark:bg-[#1A1A1D] flex justify-end gap-3 rounded-b-2xl">
                    <button onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                        Cancelar
                    </button>
                    <button 
                        onClick={gravarNovoTorneio} 
                        disabled={isSubmitting}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md flex items-center gap-2"
                    >
                        {isSubmitting ? 'A gravar...' : 'Criar Torneio'}
                    </button>
                </div>

            </div>
        </div>
    )
}