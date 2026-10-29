import { useState, useMemo, useEffect} from 'react'
import { Search, Download, Plus, Pencil, Trash2, RotateCcw, AlertTriangle, FileSpreadsheet, X, Loader2 } from 'lucide-react'


export default function BaseDados() {
    // Mantemos a variável "atletas" conforme pediste
    const [atletas, setAtletas] = useState<any[]>([])
    const [atletasApagados, setAtletasApagados] = useState<any[]>([])
    const [vistaAtual, setVistaAtual] = useState<'ativos' | 'apagados'>('ativos')

    const [pesquisa, setPesquisa] = useState('')

    const [isImportModalOpen, setIsImportModalOpen] = useState(false)
    const [isImporting, setIsImporting] = useState(false)

    const [toast, setToast] = useState<{show: boolean, tipo: 'sucesso' | 'erro', mensagem: string}>({ show: false, tipo: 'sucesso', mensagem: '' })

    const mostrarNotificacao = (tipo: 'sucesso' | 'erro', mensagem: string) => {
        setToast({ show: true, tipo, mensagem })
        // Esconde automaticamente passado 4 segundos
        setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000)
    }


    const [modalAtleta, setModalAtleta] = useState<{isOpen: boolean, tipo: 'adicionar' | 'editar', dados?: any}>({ isOpen: false, tipo: 'adicionar' })
    const [atletaParaApagar, setAtletaParaApagar] = useState<any | null>(null)

    const [formData, setFormData] = useState({
        numero_fpp: '', nome: '', associacao: '', clube: '', email: '', telemovel: ''
    })

    // Lógica de Pesquisa
    const atletasFiltrados = useMemo(() => {
        const listaBase = vistaAtual === 'ativos' ? atletas : atletasApagados
        const termo = pesquisa.trim().toLowerCase()

        if (!termo) return listaBase

        return listaBase.filter(atleta => {
            const nomeMatch = (atleta.nome || '').toLowerCase().includes(termo)
            const fppMatch = (atleta.numero_fpp || '').toString().includes(termo)
            const clubeMatch = (atleta.clube || '').toLowerCase().includes(termo)
            
            return nomeMatch || fppMatch || clubeMatch
        })
    }, [atletas, atletasApagados, vistaAtual, pesquisa])

    const abrirModalAtleta = (tipo: 'adicionar' | 'editar', dadosAtleta?: any) => {
        if (tipo === 'editar' && dadosAtleta) {
            setFormData({
                numero_fpp: dadosAtleta.numero_fpp.toString(),
                nome: dadosAtleta.nome,
                associacao: dadosAtleta.associacao,
                clube: dadosAtleta.clube,
                email: dadosAtleta.email,
                telemovel: dadosAtleta.telemovel
            })
        } else {
            setFormData({ numero_fpp: '', nome: '', associacao: '', clube: '', email: '', telemovel: '' })
        }
        setModalAtleta({ isOpen: true, tipo, dados: dadosAtleta })
    }

    const carregarDados = async () => {
        try {
            const dadosAtivos = await window.api.getAtletas()
            const dadosApagados = await window.api.getAtletasApagados()
            setAtletas(dadosAtivos)
            setAtletasApagados(dadosApagados)
        } catch (error) {
            console.error("Erro ao carregar BD:", error)
        }
    }

    useEffect(() => {
        carregarDados()
    }, [])

    const handleGuardar = async (e: React.FormEvent) => {
        e.preventDefault()
        const dadosParaEnviar = { ...formData, numero_fpp: parseInt(formData.numero_fpp) }
        if (modalAtleta.tipo === 'adicionar') {
            await window.api.addAtleta(dadosParaEnviar)
        } else {
            await window.api.updateAtleta(dadosParaEnviar)
        }
        setModalAtleta({ isOpen: false, tipo: 'adicionar' })
        carregarDados()
    }

    const confirmarApagar = async () => {
        if (!atletaParaApagar) return
        // Remove dos ativos
        await window.api.softDeleteAtleta(atletaParaApagar.numero_fpp)
        // Adiciona aos apagados
        setAtletaParaApagar(null)
        carregarDados()
    }

    const restaurarAtleta = async (atleta: any) => {
        await window.api.restoreAtleta(atleta.numero_fpp)
        carregarDados()
    }

    const handleImportarExcel = async () => {
        setIsImporting(true)
        try {
            const resposta = await (window as any).api.importarExcel()
            
            if (resposta.success) {
                mostrarNotificacao('sucesso', `Importação concluída! ${resposta.importados} atletas guardados.`)
                setIsImportModalOpen(false)
                carregarDados()
            } else if (resposta.message !== 'Cancelado') {
                mostrarNotificacao('erro', `Erro interno: ${resposta.message}`)
            }
        } catch (error: any) {
            console.error("Erro fatal na ponte IPC:", error)
            mostrarNotificacao('erro', "Erro de ligação! O canal 'importar-excel' não foi encontrado.")
        } finally {
            setIsImporting(false) 
        }
    }


    return (
    <div className="flex flex-col h-[calc(100vh-5rem)] p-8 max-w-[90rem] mx-auto w-full gap-6">
        
        {/* 1 cabeçalho */}
        <div className="flex flex-col gap-4 shrink-0">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Base de Dados</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">({atletasFiltrados.length} registos)</p>
                </div>
                
                {/* SEPARADORES: Ativos vs Reciclagem */}
                <div className="flex bg-gray-200/50 dark:bg-[#1A1A1A] p-1 rounded-xl border border-gray-200 dark:border-[#2A2A2A]">
                    <button 
                    onClick={() => setVistaAtual('ativos')}
                    className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${vistaAtual === 'ativos' ? 'bg-white dark:bg-[#2A2A2A] text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    >
                    Ativos
                    </button>
                    <button 
                    onClick={() => setVistaAtual('apagados')}
                    className={`px-6 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${vistaAtual === 'apagados' ? 'bg-white dark:bg-[#2A2A2A] text-red-600 dark:text-red-400 shadow-sm' : 'text-gray-500 hover:text-red-500/70'}`}
                    >
                    Reciclagem {atletasApagados.length > 0 && <span className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 py-0.5 px-2 rounded-full text-xs">{atletasApagados.length}</span>}
                    </button>
                </div>
            </div>

            <div className="flex justify-between items-center bg-white dark:bg-[#1E1E1E] p-4 rounded-2xl border border-gray-200 dark:border-[#2A2A2A] shadow-sm">
            {/* Barra de Pesquisa */}
            <div className="relative w-96">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <Search className="w-4 h-4 text-gray-400" />
                </div>
                <input 
                type="text" 
                placeholder="Pesquisar por nome, nº FPP ou clube..." 
                value={pesquisa}
                onChange={(e) => setPesquisa(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-[#333] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white transition-all"
                />
            </div>

            {/* Botões de Ação */}
            <div className="flex gap-3">
                <button 
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-2 bg-gray-50 dark:bg-[#252525] border border-gray-200 dark:border-[#333] hover:bg-gray-100 dark:hover:bg-[#2A2A2A] text-gray-700 dark:text-gray-200 px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm"
                >
                    <Download className="w-4 h-4" /> Importar Excel
                </button>
                <button 
                onClick={() => abrirModalAtleta('adicionar')}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-md"
                >
                    <Plus className="w-4 h-4" /> Novo Atleta
                </button>
            </div>
            </div>
        </div>

        {/* 2 tabela */}
        <div className="flex-1 bg-white dark:bg-[#1E1E1E] rounded-2xl border border-gray-200 dark:border-[#2A2A2A] shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-y-auto flex-1 custom-scrollbar">
            <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead className="sticky top-0 bg-gray-100/95 dark:bg-[#252525]/95 backdrop-blur-md z-10 shadow-sm">
                <tr className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                    <th className="px-6 py-4 font-semibold w-32">Nº FPP</th>
                    <th className="px-6 py-4 font-semibold">Nome do Atleta</th>
                    <th className="px-6 py-4 font-semibold w-32">Clube</th>
                    <th className="px-6 py-4 font-semibold w-40">Associação</th>
                    <th className="px-6 py-4 font-semibold">Contactos</th>
                    <th className="px-6 py-4 font-semibold text-right w-32">Ações</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#2A2A2A]">
                {atletasFiltrados.length === 0 ? (
                    <tr>
                        <td colSpan={6} className="p-12 text-center text-gray-500 dark:text-gray-400">
                            {vistaAtual === 'apagados' ? 'A reciclagem está vazia.' : `Nenhum atleta encontrado com o termo "${pesquisa}".`}
                        </td>
                    </tr>
                ) : (
                    <>
                        {/* A MAGIA AQUI: .slice(0, 100) impede que o ecrã congele */}
                        {atletasFiltrados.slice(0, 100).map((atleta) => (
                        <tr key={atleta.numero_fpp} className={`hover:bg-gray-50 dark:hover:bg-[#222] transition-colors group ${vistaAtual === 'apagados' ? 'opacity-60 hover:opacity-100' : ''}`}>
                            <td className="px-6 py-4 font-mono text-sm text-blue-600 dark:text-blue-400 font-bold">{atleta.numero_fpp}</td>
                            <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">
                                {atleta.nome}
                                {vistaAtual === 'apagados' && <div className="text-xs text-red-500 font-normal mt-1">Apagado a: {atleta.data_apagado}</div>}
                            </td>
                            <td className="px-6 py-4 text-gray-600 dark:text-gray-300 text-sm">
                                <span className="bg-gray-100 dark:bg-[#333] px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide">{atleta.clube}</span>
                            </td>
                            <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-sm">{atleta.associacao}</td>
                            <td className="px-6 py-4">
                                <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                    {atleta.telemovel || <span className="opacity-40 font-normal">Sem Telemóvel</span>}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[250px] mt-0.5">
                                    {atleta.email || ''}
                                </div>
                            </td>
                            <td className="px-6 py-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                {vistaAtual === 'ativos' ? (
                                    <>
                                        <button onClick={() => abrirModalAtleta('editar', atleta)} className="p-2 text-gray-400 hover:text-blue-500 transition-colors" title="Editar">
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => setAtletaParaApagar(atleta)} className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="Remover">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </>
                                ) : (
                                    <button onClick={() => restaurarAtleta(atleta)} className="p-2 text-gray-400 hover:text-green-500 transition-colors flex items-center gap-1 ml-auto font-medium text-sm" title="Restaurar Atleta">
                                        <RotateCcw className="w-4 h-4" /> Restaurar
                                    </button>
                                )}
                            </td>
                        </tr>
                        ))}
                        
                        {/* Aviso amigável caso haja mais de 100 atletas */}
                        {atletasFiltrados.length > 100 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-sm font-medium text-gray-500 bg-gray-50/50 dark:bg-[#1A1A1D]/30 border-t border-gray-100 dark:border-[#2A2A2A]">
                                    A mostrar os primeiros <span className="font-bold text-gray-700 dark:text-gray-300">100</span> de <span className="font-bold text-gray-700 dark:text-gray-300">{atletasFiltrados.length}</span> registos. <br/>Utilize a barra de pesquisa para encontrar atletas específicos.
                                </td>
                            </tr>
                        )}
                    </>
                )}
                </tbody>
            </table>
            </div>
        </div>

        {/* 3. MODAIS*/}

        {/* MODAL DE CONFIRMAÇÃO DE APAGAR */}
        {atletaParaApagar && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-2xl border border-red-200 dark:border-red-900/30 w-full max-w-sm overflow-hidden text-center p-6 animate-in zoom-in-95 duration-200">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="w-8 h-8" />
                    </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Eliminar Atleta?</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                            Tem a certeza que deseja eliminar o atleta <strong>{atletaParaApagar.nome}</strong>? O registo será movido para a reciclagem durante 7 dias.
                        </p>
                    <div className="flex gap-3">
                        <button onClick={() => setAtletaParaApagar(null)} className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-[#252525] hover:bg-gray-200 dark:hover:bg-[#333] text-gray-800 dark:text-gray-200 rounded-xl text-sm font-medium transition-colors">Cancelar</button>
                        <button onClick={confirmarApagar} className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors shadow-md">Sim, Eliminar</button>
                    </div>
                </div>
            </div>
        )}

        {/* Modal de Adicionar/Editar Atleta */}
        {modalAtleta.isOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-2xl border border-gray-200 dark:border-[#333] w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-[#2A2A2A] flex justify-between items-center bg-gray-50/50 dark:bg-[#1A1A1A]">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                            {modalAtleta.tipo === 'adicionar' ? 'Adicionar Novo Atleta' : 'Editar Atleta'}
                        </h3>
                        <button onClick={() => setModalAtleta({ isOpen: false, tipo: 'adicionar' })} className="text-gray-400 hover:text-gray-700 dark:hover:text-white">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <form onSubmit={handleGuardar} className="p-6 space-y-5">
                        {/* Grid para FPP e Associação */}
                        <div className="grid grid-cols-2 gap-5">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Nº FPP *</label>
                                <input required type="number" value={formData.numero_fpp} onChange={e => setFormData({...formData, numero_fpp: e.target.value})} disabled={modalAtleta.tipo === 'editar'} className="w-full bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-[#333] rounded-xl p-3 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all disabled:opacity-50" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Associação *</label>
                                <input required type="text" placeholder="Ex: APAve" value={formData.associacao} onChange={e => setFormData({...formData, associacao: e.target.value})} className="w-full bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-[#333] rounded-xl p-3 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
                            </div>
                        </div>

                        {/* Nome e Clube */}
                        <div className="grid grid-cols-3 gap-5">
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Nome Completo *</label>
                                <input required type="text" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} className="w-full bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-[#333] rounded-xl p-3 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
                            </div>
                            <div className="col-span-1">
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Clube *</label>
                                <input required type="text" placeholder="Ex: CENAP" value={formData.clube} onChange={e => setFormData({...formData, clube: e.target.value})} className="w-full bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-[#333] rounded-xl p-3 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
                            </div>
                        </div>

                        {/* Contactos */}
                        <div className="grid grid-cols-2 gap-5">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Email</label>
                                <input type="email" placeholder="Opcional" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-[#333] rounded-xl p-3 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Telemóvel</label>
                                <input type="text" placeholder="Opcional" value={formData.telemovel} onChange={e => setFormData({...formData, telemovel: e.target.value})} className="w-full bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-[#333] rounded-xl p-3 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-[#2A2A2A] mt-6">
                            <button type="button" onClick={() => setModalAtleta({ isOpen: false, tipo: 'adicionar' })} className="px-5 py-2.5 bg-gray-100 dark:bg-[#252525] hover:bg-gray-200 dark:hover:bg-[#333] text-gray-800 dark:text-gray-200 rounded-xl text-sm font-medium transition-colors">
                                Cancelar
                            </button>
                            <button type="submit" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors shadow-md">
                                {modalAtleta.tipo === 'adicionar' ? 'Guardar Novo Atleta' : 'Guardar Alterações'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* Modal de Importar Excel */}
        {isImportModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-2xl border border-gray-200 dark:border-[#333] w-full max-w-md overflow-hidden text-center animate-in zoom-in-95 duration-200">
                <div className="p-8 mt-2">
                    <FileSpreadsheet className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Importar Excel de Atletas</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">
                        Selecione o ficheiro Excel com as colunas (Nº FPP, Nome, Clube, Associação, Email, Telemóvel).
                    </p>
                    <button 
                        onClick={handleImportarExcel}
                        disabled={isImporting}
                        className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/70 text-white rounded-xl font-medium transition-colors shadow-md mb-3 flex items-center justify-center gap-2"
                    >
                        {isImporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                        {isImporting ? 'A ler e a guardar dados...' : 'Selecionar Ficheiro .xlsx'}
                    </button>
                    <button onClick={() => setIsImportModalOpen(false)} className="w-full py-3.5 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#252525] rounded-xl transition-colors text-sm font-medium">
                        Cancelar
                    </button>
                </div>
            </div>
            </div>
        )}

    {toast.show && (
            <div className={`fixed bottom-8 right-8 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border animate-in slide-in-from-bottom-5 fade-in duration-300 ${
                toast.tipo === 'sucesso' 
                ? 'bg-green-50 border-green-200 text-green-800 dark:bg-[#1A2E1F] dark:border-green-900/50 dark:text-green-400' 
                : 'bg-red-50 border-red-200 text-red-800 dark:bg-[#311C1C] dark:border-red-900/50 dark:text-red-400'
            }`}>
                <span className="text-xl">{toast.tipo === 'sucesso' ? '✅' : '⚠️'}</span>
                <p className="text-sm font-medium">{toast.mensagem}</p>
                <button onClick={() => setToast(prev => ({...prev, show: false}))} className="ml-2 opacity-60 hover:opacity-100 transition-opacity">
                    <X className="w-4 h-4" />
                </button>
            </div>
    )}
    </div>
  )
}