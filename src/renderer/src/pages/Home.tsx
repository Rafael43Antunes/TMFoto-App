import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

export default function Home() {
  const [saudacao, setSaudacao] = useState('Olá')

  useEffect(() => {
    const hora = new Date().getHours()
    if (hora >= 6 && hora < 13) setSaudacao('Bom dia!')
    else if (hora >= 13 && hora < 20) setSaudacao('Boa tarde!')
    else setSaudacao('Boa noite, ainda aqui? 😯')
  }, [])

  return (
    <div className="flex-1 flex flex-col lg:flex-row p-8 lg:p-14 gap-12 items-center justify-center max-w-7xl mx-auto w-full relative">
      <div className="absolute top-[-10%] left-[-10%] w-[30%] h-[30%] bg-gray-300/30 dark:bg-white/5 blur-[100px] rounded-full pointer-events-none"></div>
      
      {/* Esquerda */}
      <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left z-10">
        <h2 className="text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-12 drop-shadow-sm">
          {saudacao}
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-xl">
          <MenuButton to="/pastas" title="Gerar Pastas" desc="A partir do PDF da ordem de saída" icon="📁" />
          <MenuButton to="/basedados" title="Base de Dados" desc="Gerir atletas, clubes e associações" icon="🗄️" />
          <MenuButton to="/torneios" title="Torneios" desc="Pedidos e folhas de obra" icon="🏆" />
          <MenuButton to="/envios" title="Envios" desc="Estado das transferências" icon="🚀" />
        </div>
      </div>

      {/*DIREITA */}
      <div className="flex-1 w-full max-w-md hidden md:flex flex-col items-center justify-center z-10">
        <div className="w-full aspect-[4/5] bg-white dark:bg-[#1E1E1E] rounded-[2rem] border border-gray-200 dark:border-[#2A2A2A] shadow-xl overflow-hidden relative flex flex-col items-center justify-center group transition-transform duration-500 hover:-translate-y-2">
          
          <div className="absolute inset-0 bg-gradient-to-b from-gray-50 to-transparent dark:from-[#252525] dark:to-transparent opacity-50"></div>
          <div className="relative w-32 h-32 rounded-full bg-gray-50 dark:bg-[#252525] shadow-inner border border-gray-100 dark:border-[#333] flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
            <span className="text-7xl drop-shadow-lg">🛼</span>
          </div>
          <p className="absolute bottom-10 z-10 text-gray-400 dark:text-gray-500 font-bold tracking-[0.2em] uppercase text-xs">
            TMFoto System
          </p>
        </div>
      </div>
    </div>
  )
}

function MenuButton({ to, title, desc, icon }: { to: string, title: string, desc: string, icon: string }) {
  return (
    <Link 
      to={to} 
      className="group flex flex-col bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 p-6 rounded-2xl shadow-sm hover:shadow-xl dark:shadow-none transition-all duration-300 hover:-translate-y-1 relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent dark:from-blue-900/20 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      
      <span className="text-4xl mb-4 group-hover:scale-110 transition-transform origin-left drop-shadow-sm z-10">{icon}</span>
      <h3 className="font-bold text-xl text-slate-800 dark:text-white mb-2 z-10">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed z-10">{desc}</p>
    </Link>
  )
}