import { useState, useEffect } from 'react'
import { TrendingUp, Users, Trophy, Euro, Package } from 'lucide-react'

export default function Estatisticas() {
    const [stats, setStats] = useState({
        totalFaturado: 0,
        totalPedidos: 0,
        torneioTop: 'A carregar...',
        clubeTop: 'A carregar...'
    })

    useEffect(() => {
        const carregarStats = async () => {
            try {
                const resultado = await (window as any).api.getEstatisticas()
                if (resultado.sucesso) {
                    setStats(resultado.dados)
                }
            } catch (error) {
                console.error("Erro ao carregar estatísticas:", error)
            }
        }
        carregarStats()
    }, [])
    
    return (
        <div className="h-full min-h-[85vh] flex flex-col max-w-7xl mx-auto w-full animate-fade-in pb-8 pt-6">
            
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2 tracking-tight">Estatísticas Globais</h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                    Análise financeira e de performance de todos os torneios.
                </p>
            </div>

            {/* Cartões Principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                
                <div className="bg-white dark:bg-[#1A1A1D] p-6 rounded-2xl border border-gray-100 dark:border-[#2A2A2A] shadow-sm flex flex-col relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-50 dark:bg-emerald-500/10 rounded-full blur-2xl"></div>
                    <div className="flex justify-between items-start mb-4">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Faturado</p>
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg">
                            <Euro className="w-5 h-5" />
                        </div>
                    </div>
                    <h3 className="text-3xl font-bold text-gray-800 dark:text-white">€ {stats.totalFaturado}</h3>
                </div>

                <div className="bg-white dark:bg-[#1A1A1D] p-6 rounded-2xl border border-gray-100 dark:border-[#2A2A2A] shadow-sm flex flex-col relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-50 dark:bg-blue-500/10 rounded-full blur-2xl"></div>
                    <div className="flex justify-between items-start mb-4">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Pedidos</p>
                        <div className="p-2 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg">
                            <Package className="w-5 h-5" />
                        </div>
                    </div>
                    <h3 className="text-3xl font-bold text-gray-800 dark:text-white">{stats.totalPedidos}</h3>
                </div>

                <div className="bg-white dark:bg-[#1A1A1D] p-6 rounded-2xl border border-gray-100 dark:border-[#2A2A2A] shadow-sm flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Torneio Mais Rentável</p>
                        <div className="p-2 bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-lg">
                            <Trophy className="w-5 h-5" />
                        </div>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white truncate">{stats.torneioTop}</h3>
                </div>

                <div className="bg-white dark:bg-[#1A1A1D] p-6 rounded-2xl border border-gray-100 dark:border-[#2A2A2A] shadow-sm flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Clube Top Comprador</p>
                        <div className="p-2 bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-lg">
                            <Users className="w-5 h-5" />
                        </div>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white truncate">{stats.clubeTop}</h3>
                </div>

            </div>

            {/* Aqui vamos meter tabelas/gráficos no futuro (Top Atletas, Faturação Mensal, etc) */}
            <div className="flex-1 bg-white dark:bg-[#1A1A1D] border border-gray-100 dark:border-[#2A2A2A] rounded-2xl p-6 shadow-sm flex items-center justify-center">
                <p className="text-gray-400 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" /> Gráficos em construção...
                </p>
            </div>

        </div>
    )
}