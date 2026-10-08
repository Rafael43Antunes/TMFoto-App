import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'

// Importar as páginas da nova pasta
import Home from './pages/Home'
//import BaseDados from './pages/BaseDados'
//import Pastas from './pages/Pastas'
//import Torneios from './pages/Torneios'
//import Envios from './pages/Envios'

function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation()

  const [isDarkMode, setIsDarkMode] = useState(true)
  
  return (
    // Wrapper principal que controla a classe 'dark'
    <div className={`${isDarkMode ? 'dark' : ''} min-h-screen w-full`}>
      <div className="min-h-screen bg-gray-100 dark:bg-[#121212] text-gray-800 dark:text-gray-200 font-sans flex flex-col transition-colors duration-300">
        
        {/* HEADER */}
        <header className="w-full h-20 flex items-center px-8 border-b border-slate-200/80 dark:border-[#2A2A2A] bg-gray-100/80 dark:bg-[#121212]/80 backdrop-blur-xl sticky top-0 z-50">
          
          {/* Zona Esquerda*/}
          <div className="flex-1 flex justify-start items-center">
            {location.pathname !== '/' && (
              <Link to="/" className="text-sm font-medium text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-gray-200 transition-colors flex items-center gap-2 group">
                <span className="transform group-hover:-translate-x-1 transition-transform">←</span> Voltar
              </Link>
            )}
          </div>

          {/* Zona Central */}
          <div className="flex-1 flex justify-center items-center">
            <h1 className="text-3xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-500 dark:from-gray-100 dark:to-gray-400 select-none">
              TM FOTO
            </h1>
          </div>

          {/* Zona Direita*/}
          <div className="flex-1 flex justify-end items-center">
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

        {/* CONTEÚDO */}
        <main className="flex-1 flex flex-col relative">
          {children}
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          {/* <Route path="/basedados" element={<BaseDados />} /> */}
          {/* <Route path="/pastas" element={<Pastas />} /> */}
          {/* <Route path="/torneios" element={<Torneios />} /> */}
          {/* <Route path="/envios" element={<Envios />} /> */}
        </Routes>
      </Layout>
    </HashRouter>
  )
}