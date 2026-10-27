import { useState, useEffect } from 'react'
import { TrendingUp, Users, Trophy, Euro, Package, UserStar, Filter, Eye, EyeOff, X } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts'

export default function Estatisticas() {
    const [stats, setStats] = useState({
        totalFaturado: 0,
        totalPedidos: 0,
        topTorneios: [] as any[],
        topClubes: [] as any[],
        topAtletas: [] as any[],
        faturacaoMensal: [] as any[],
        tiposPedido: [] as any[]
    })

    const [filtros, setFiltros] = useState({ periodo: 'tudo' })
    
   
    const [privacidade, setPrivacidade] = useState(false)
    const [modalAtivo, setModalAtivo] = useState<'torneios' | 'clubes' | 'atletas' | null>(null)

    const CORES_PIE = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899']

    useEffect(() => {
        const carregarStats = async () => {
            try {
                const resultado = await (window as any).api.getEstatisticas(filtros)
                if (resultado.sucesso) setStats(resultado.dados)
            } catch (error) {
                console.error("Erro ao carregar estatísticas:", error)
            }
        }
        carregarStats()
    }, [filtros])

    const formatarEuro = (valor: number) => {
        return new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor)
    }

    const renderListaTop = (lista: any[], titulo: string, mostrarFaturacao: boolean = true) => (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setModalAtivo(null)}>
            <div className="bg-white dark:bg-[#1A1A1D] rounded-2xl border border-gray-100 dark:border-[#2A2A2A] shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b border-gray-100 dark:border-[#2A2A2A] flex justify-between items-center bg-gray-50 dark:bg-[#121212]">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">Top 10 {titulo}</h3>
                    <button onClick={() => setModalAtivo(null)} className="p-2 text-gray-500 hover:text-red-500 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="overflow-y-auto p-2">
                    {lista.length === 0 && <p className="text-center p-6 text-gray-500">Sem dados suficientes.</p>}
                    {lista.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-[#252528] rounded-xl transition-colors border-b border-transparent hover:border-gray-100 dark:hover:border-[#333]">
                            <div className="flex items-center gap-4">
                                <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${idx === 0 ? 'bg-yellow-100 text-yellow-600' : idx === 1 ? 'bg-gray-200 text-gray-600' : idx === 2 ? 'bg-orange-100 text-orange-600' : 'bg-gray-50 dark:bg-[#121212] text-gray-500'}`}>
                                    {idx + 1}
                                </span>
                                <div>
                                    <p className="font-semibold text-gray-800 dark:text-gray-200">{item.nome}</p>
                                    <p className="text-xs text-gray-500">{item.pedidos} pedidos</p>
                                </div>
                            </div>
                            {mostrarFaturacao && (
                                <div className="text-right">
                                    <p className="font-bold text-blue-600 dark:text-blue-400">
                                        {privacidade ? '€ ****' : `€ ${formatarEuro(item.faturado)}`}
                                    </p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
    
    return (
        <div className="h-full min-h-[85vh] flex flex-col max-w-7xl mx-auto w-full animate-fade-in pb-8 pt-6 px-8 lg:px-12">
            
            {/* Popups (Modais) */}
            {modalAtivo === 'torneios' && renderListaTop(stats.topTorneios, 'Torneios Mais Rentáveis')}
            {modalAtivo === 'clubes' && renderListaTop(stats.topClubes, 'Clubes (Por volume de pedidos)', false)}
            {modalAtivo === 'atletas' && renderListaTop(stats.topAtletas, 'Atletas Que Mais Gastaram')}

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2 tracking-tight">Estatísticas Globais</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                        Análise financeira e de performance de todos os torneios.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 items-center bg-white dark:bg-[#1A1A1D] p-2 rounded-2xl border border-gray-100 dark:border-[#2A2A2A] shadow-sm">
                    <div className="pl-3 hidden sm:flex text-gray-400"><Filter className="w-4 h-4"/></div>
                    
                    <select 
                        value={filtros.periodo}
                        onChange={(e) => setFiltros({...filtros, periodo: e.target.value})}
                        className="w-full sm:w-auto bg-transparent dark:bg-[#1A1A1D] text-sm font-medium text-gray-700 dark:text-gray-200 outline-none cursor-pointer py-2 px-2"
                    >
                        <option value="tudo">Todo o tempo</option>
                        <option value="1mes">Último Mês</option>
                        <option value="6meses">Últimos 6 Meses</option>
                        <option value="ano">Último Ano</option>
                    </select>
                </div>
            </div>

            {/* LINHA 1: Cartões Base */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div className="bg-white dark:bg-[#1A1A1D] p-6 rounded-2xl border border-gray-100 dark:border-[#2A2A2A] shadow-sm flex flex-col relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-50 dark:bg-emerald-500/10 rounded-full blur-2xl"></div>
                    <div className="flex justify-between items-start mb-4">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Faturado</p>
                        <div className="flex gap-2 z-10">
                            {/* Botão de Privacidade */}
                            <button 
                                onClick={() => setPrivacidade(!privacidade)} 
                                className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-[#252528] rounded-lg transition-colors"
                                title="Esconder Valores"
                            >
                                {privacidade ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg">
                                <Euro className="w-5 h-5" />
                            </div>
                        </div>
                    </div>
                    <h3 className="text-4xl font-bold text-gray-800 dark:text-white z-10">
                        {privacidade ? '€ * * * *' : `€ ${formatarEuro(stats.totalFaturado)}`}
                    </h3>
                </div>

                <div className="bg-white dark:bg-[#1A1A1D] p-6 rounded-2xl border border-gray-100 dark:border-[#2A2A2A] shadow-sm flex flex-col relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-50 dark:bg-blue-500/10 rounded-full blur-2xl"></div>
                    <div className="flex justify-between items-start mb-4">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Pedidos</p>
                        <div className="p-2 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg z-10">
                            <Package className="w-5 h-5" />
                        </div>
                    </div>
                    <h3 className="text-4xl font-bold text-gray-800 dark:text-white z-10">{stats.totalPedidos}</h3>
                </div>
            </div>

            {/* LINHA 2: Top Rankings Clicáveis */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                <button onClick={() => setModalAtivo('torneios')} className="text-left bg-white dark:bg-[#1A1A1D] p-6 rounded-2xl border border-gray-100 dark:border-[#2A2A2A] hover:border-purple-400 dark:hover:border-purple-500/50 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 flex flex-col group cursor-pointer">
                    <div className="flex justify-between items-start mb-4 w-full">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Torneio Mais Rentável</p>
                        <div className="p-2 bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-lg group-hover:scale-110 transition-transform">
                            <Trophy className="w-5 h-5" />
                        </div>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white truncate w-full" title={stats.topTorneios[0]?.nome || 'Nenhum'}>
                        {stats.topTorneios[0]?.nome || 'Nenhum'}
                    </h3>
                    <p className="text-xs text-purple-500 mt-2 font-medium opacity-0 group-hover:opacity-100 transition-opacity">Ver Top 10 →</p>
                </button>

                <button onClick={() => setModalAtivo('clubes')} className="text-left bg-white dark:bg-[#1A1A1D] p-6 rounded-2xl border border-gray-100 dark:border-[#2A2A2A] hover:border-orange-400 dark:hover:border-orange-500/50 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 flex flex-col group cursor-pointer">
                    <div className="flex justify-between items-start mb-4 w-full">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Clube Top Comprador</p>
                        <div className="p-2 bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-lg group-hover:scale-110 transition-transform">
                            <Users className="w-5 h-5" />
                        </div>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white truncate w-full" title={stats.topClubes[0]?.nome || 'Nenhum'}>
                        {stats.topClubes[0]?.nome || 'Nenhum'}
                    </h3>
                    <p className="text-xs text-orange-500 mt-2 font-medium opacity-0 group-hover:opacity-100 transition-opacity">Ver Top 10 →</p>
                </button>

                <button onClick={() => setModalAtivo('atletas')} className="text-left bg-white dark:bg-[#1A1A1D] p-6 rounded-2xl border border-gray-100 dark:border-[#2A2A2A] hover:border-rose-400 dark:hover:border-rose-500/50 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 flex flex-col group cursor-pointer">
                    <div className="flex justify-between items-start mb-4 w-full">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Atleta Destaque</p>
                        <div className="p-2 bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-lg group-hover:scale-110 transition-transform">
                            <UserStar className="w-5 h-5" />
                        </div>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white truncate w-full" title={stats.topAtletas[0]?.nome || 'Nenhum'}>
                        {stats.topAtletas[0]?.nome || 'Nenhum'}
                    </h3>
                    <p className="text-xs text-rose-500 mt-2 font-medium opacity-0 group-hover:opacity-100 transition-opacity">Ver Top 10 →</p>
                </button>
            </div>

            {/* ZONA DOS GRAFICOS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 pb-10">
                
                {/* Gráfico 1: Evolução Faturação (Ocupa 2 colunas) */}
                <div className="lg:col-span-2 bg-white dark:bg-[#1A1A1D] border border-gray-100 dark:border-[#2A2A2A] rounded-2xl p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6">Evolução Mensal da Faturação</h3>
                    <div className="h-64 w-full">
                        {stats.faturacaoMensal.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stats.faturacaoMensal} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="corFaturacao" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" opacity={0.2} />
                                    <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={(val) => `€${val}`} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#1A1A1D', borderColor: '#333', color: '#fff', borderRadius: '12px' }}
                                        formatter={(value: any) => [`€ ${formatarEuro(value)}`, 'Faturado']}
                                        labelStyle={{ color: '#9ca3af', marginBottom: '4px' }}
                                    />
                                    <Area type="monotone" dataKey="total" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#corFaturacao)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-400 text-sm">Dados insuficientes para gerar gráfico.</div>
                        )}
                    </div>
                </div>

                {/* Gráfico 2: Tipos de Pedido (Ocupa 1 coluna) */}
                <div className="bg-white dark:bg-[#1A1A1D] border border-gray-100 dark:border-[#2A2A2A] rounded-2xl p-6 shadow-sm flex flex-col">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">Tipos de Pedido</h3>
                    <p className="text-xs text-gray-500 mb-4">Volume total por formato</p>
                    
                    <div className="flex-1 min-h-[200px] w-full relative">
                        {stats.tiposPedido.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats.tiposPedido}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {stats.tiposPedido.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={CORES_PIE[index % CORES_PIE.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#1A1A1D', borderColor: '#333', color: '#fff', borderRadius: '12px' }}
                                        formatter={(value: any) => [`${value} pedidos`, 'Quantidade']}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-400 text-sm">Sem dados.</div>
                        )}
                    </div>
                    
                    {/* Legenda Customizada do Gráfico Circular */}
                    <div className="mt-4 grid grid-cols-2 gap-2">
                        {stats.tiposPedido.map((tipo, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: CORES_PIE[idx % CORES_PIE.length] }}></div>
                                <span className="truncate" title={tipo.name}>{tipo.name}</span>
                                <span className="ml-auto font-bold opacity-50">{tipo.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

            </div>

        </div>
    )
}