import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { 
  Home as HomeIcon, 
  Database, 
  FolderTree, 
  Trophy, 
  Menu, 
  X, 
  // BarChart2, 
  // Send 
} from 'lucide-react'

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const menuItems = [
    { path: '/', icon: HomeIcon, label: 'Início' },
    { path: '/torneios', icon: Trophy, label: 'Torneios & Pedidos' },
    { path: '/basedados', icon: Database, label: 'Base de Dados' },
    { path: '/pastas', icon: FolderTree, label: 'Gerador de Pastas' },
    // { path: '/estatisticas', icon: BarChart2, label: 'Estatísticas' },
    // { path: '/envios', icon: Send, label: 'Envio de Fotos' },
  ]

  return (
    <div className={`${isDarkMode ? 'dark' : ''} min-h-screen w-full flex overflow-hidden`}>
      <div className="flex w-full h-full bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 transition-colors duration-300">

      
      {/* OVERLAY MOBILE */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* 1. MENU LATERAL (SIDEBAR) */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-gray-100 dark:bg-[#121212] border-r border-slate-200/80 dark:border-[#2A2A2A]
        transform transition-transform duration-300 ease-in-out shadow-2xl lg:shadow-none
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col
      `}>
        <div className="h-20 flex items-center justify-between px-6 border-b border-slate-200/80 dark:border-[#2A2A2A] shrink-0">
          <h1 className="text-2xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-500 dark:from-gray-100 dark:to-gray-400 select-none">
            TM FOTO
          </h1>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-1 text-gray-500 hover:text-red-500 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const ativo = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
                  ativo
                    ? 'bg-white dark:bg-[#1A1A1D] shadow-sm text-blue-600 dark:text-blue-400 border border-slate-200/50 dark:border-[#333]'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-[#1A1A1D] hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* 2. ÁREA DE CONTEÚDO PRINCIPAL (Direita) */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden text-gray-800 dark:text-gray-200 transition-colors duration-300">

        {/* CABEÇALHO (Header) */}
        <header className="w-full h-20 flex items-center justify-between px-4 lg:px-8 border-b border-slate-200/80 dark:border-[#2A2A2A] bg-gray-100/80 dark:bg-[#121212]/80 backdrop-blur-xl shrink-0 sticky top-0 z-30">
          
          <div className="flex items-center gap-4 flex-1">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 bg-white dark:bg-[#1A1A1D] border border-gray-200 dark:border-[#333] rounded-xl shadow-sm transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>

            {location.pathname !== '/' && (
              <Link to="/" className="hidden lg:flex text-sm font-medium text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-gray-200 transition-colors items-center gap-2 group">
                <span className="transform group-hover:-translate-x-1 transition-transform">←</span> Voltar
              </Link>
            )}
          </div>

          <div className="flex-1 flex justify-center lg:hidden">
             <h1 className="text-xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-500 dark:from-gray-100 dark:to-gray-400 select-none">
              TM FOTO
            </h1>
          </div>

          <div className="flex-1 flex justify-end">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`relative w-14 h-7 flex items-center rounded-full p-1 transition-colors duration-300 focus:outline-none border ${isDarkMode ? 'bg-[#1E1E1E] border-[#333]' : 'bg-white border-gray-300 shadow-sm'}`}              
              title="Alternar Tema"
            >
              <div className={`w-5 h-5 rounded-full transform transition-transform duration-300 flex items-center justify-center ${isDarkMode ? 'translate-x-7 bg-[#333]' : 'translate-x-0 bg-gray-100 shadow-sm'}`}>
                <span className="text-[10px] leading-none">{isDarkMode ? '🌙' : '☀️'}</span>
              </div>
            </button>
          </div>

        </header>

        {/* ONDE RENDERIZAM AS PÁGINAS */}
        <main className="flex-1 overflow-y-auto relative w-full">
          {children}
        </main>

      </div>
      </div>
    </div>
  )
}