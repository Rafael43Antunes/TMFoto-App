import { useState, useEffect } from "react"
import { X } from "lucide-react"

interface ModalEditarTorneioProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    torneio: any 
}

export function ModalEditarTorneio({ isOpen, onClose, onSuccess, torneio }: ModalEditarTorneioProps) {
    const [editNome, setEditNome] = useState('')
    const [editData, setEditData] = useState('')
    const [isEditing, setIsEditing] = useState(false)

    useEffect(() => {
        if (torneio) {
            setEditNome(torneio.nome || '')
            setEditData(torneio.data_evento || '')
        }
    }, [torneio])

    const gravarEdicao = async () => {
        if (!editNome || !editData) {
            alert("O nome e a data são obrigatórios.")
            return
        }

        setIsEditing(true)
        const dados = {
            id: torneio.id,
            nome: editNome,
            data_evento: editData
        }

        const resultado = await (window as any).api.updateTorneio(dados)

        if (resultado.sucesso) {
            onSuccess()
            onClose()
        } else {
            alert("Erro ao atualizar torneio: " + resultado.erro)
        }
        setIsEditing(false)
    }

    if (!isOpen || !torneio) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-[#151518] border border-gray-200 dark:border-[#333] rounded-2xl w-full max-w-md shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                
                <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-[#2A2A2A]">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Editar Torneio</h2>
                        <p className="text-sm text-gray-500">Atualiza os dados essenciais do evento.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[#2A2A2D] rounded-xl transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="p-6 flex flex-col gap-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Nome do Torneio</label>
                        <input 
                            type="text" 
                            value={editNome}
                            onChange={(e) => setEditNome(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-[#1A1A1D] border border-gray-200 dark:border-[#333] rounded-xl px-4 py-2.5 text-gray-800 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Data do Evento</label>
                        <input 
                            type="date" 
                            value={editData}
                            onChange={(e) => setEditData(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-[#1A1A1D] border border-gray-200 dark:border-[#333] rounded-xl px-4 py-2.5 text-gray-800 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                        />
                    </div>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-[#1A1A1D] border-t border-gray-100 dark:border-[#2A2A2A] flex justify-end gap-3 rounded-b-2xl">
                    <button onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#2A2A2D] rounded-xl transition-colors">
                        Cancelar
                    </button>
                    <button 
                        onClick={gravarEdicao}
                        disabled={isEditing}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-xl text-sm font-bold transition-all"
                    >
                        {isEditing ? 'A guardar...' : 'Guardar Alterações'}
                    </button>
                </div>

            </div>
        </div>
    )
}