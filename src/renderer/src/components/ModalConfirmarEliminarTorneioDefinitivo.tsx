import { useState } from "react"
import { AlertOctagon } from "lucide-react"

interface ModalConfirmarEliminarTorneioDefinitivoProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    torneio: any 
}

export function ModalConfirmarEliminarTorneioDefinitivo({ isOpen, onClose, onSuccess, torneio }: ModalConfirmarEliminarTorneioDefinitivoProps) {
    const [isDeleting, setIsDeleting] = useState(false)

    const confirmarEliminacao = async () => {
        if (!torneio) return
        setIsDeleting(true)

        const resultado = await (window as any).api.hardDeleteTorneio(torneio.id)

        if (resultado.sucesso) {
            onSuccess() 
            onClose()
        } else {
            alert("Erro ao eliminar definitivamente: " + resultado.erro)
        }
        
        setIsDeleting(false)
    }

    if (!isOpen || !torneio) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-[#151518] border border-gray-200 dark:border-[#333] rounded-2xl w-full max-w-sm shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                
                <div className="p-6 text-center">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-500/10 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertOctagon className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Destruir Torneio?</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        O torneio <span className="font-bold text-gray-700 dark:text-gray-300">"{torneio.nome}"</span> e <span className="font-bold underline">todos os seus pedidos</span> serão destruídos para sempre. Esta ação não pode ser revertida.
                    </p>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-[#1A1A1D] border-t border-gray-100 dark:border-[#2A2A2A] flex gap-3">
                    <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#2A2A2D] rounded-xl transition-colors">
                        Cancelar
                    </button>
                    <button onClick={confirmarEliminacao} disabled={isDeleting} className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 text-white py-2.5 rounded-xl text-sm font-bold transition-all shadow-md">
                        {isDeleting ? 'A eliminar...' : 'Destruir Tudo'}
                    </button>
                </div>

            </div>
        </div>
    )
}