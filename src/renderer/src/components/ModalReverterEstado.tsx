import { useState } from "react"
import { AlertTriangle } from "lucide-react"

interface ModalReverterEstadoProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    pedido: any 
}

export function ModalReverterEstado({ isOpen, onClose, onSuccess, pedido }: ModalReverterEstadoProps) {
    const [isUpdating, setIsUpdating] = useState(false)

    const confirmarReversao = async () => {
        if (!pedido) return
        setIsUpdating(true)

        const resultado = await (window as any).api.updateEstadoPedido({
            id: pedido.id,
            estado: 'pendente'
        })

        if (resultado.sucesso) {
            onSuccess() 
            onClose()
        } else {
            alert("Erro ao alterar estado: " + resultado.erro)
        }
        
        setIsUpdating(false)
    }

    if (!isOpen || !pedido) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-[#151518] border border-gray-200 dark:border-[#333] rounded-2xl w-full max-w-sm shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                
                <div className="p-6 text-center">
                    <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-500/10 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Reverter para Pendente?</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        O pedido de <span className="font-bold text-gray-700 dark:text-gray-300">"{pedido.nome}"</span> já estava marcado como concluído. Queres mesmo revertê-lo para pendente?
                    </p>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-[#1A1A1D] border-t border-gray-100 dark:border-[#2A2A2A] flex gap-3">
                    <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#2A2A2D] rounded-xl transition-colors">
                        Cancelar
                    </button>
                    <button onClick={confirmarReversao} disabled={isUpdating} className="flex-1 bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-600/50 text-white py-2.5 rounded-xl text-sm font-bold transition-all shadow-md">
                        {isUpdating ? 'A processar...' : 'Sim, Reverter'}
                    </button>
                </div>

            </div>
        </div>
    )
}