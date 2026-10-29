import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { 
  FolderOpen, 
  ChevronLeft, 
  ChevronRight, 
  FolderTree, 
  Database, 
  Trophy, 
  Send,
  BarChart2,
  Settings
} from 'lucide-react'

export default function Home() {
  const [saudacao, setSaudacao] = useState('Olá')

  useEffect(() => {
    const hora = new Date().getHours()
    if (hora >= 6 && hora < 13) setSaudacao('Bom dia!')
    else if (hora >= 13 && hora < 20) setSaudacao('Boa tarde!')
    else setSaudacao('Boa noite, ainda aqui? 😯')
  }, [])

  const [fotos, setFotos] = useState<string[]>([])
  const [indiceAtual, setIndiceAtual] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const carregarFotos = async () => {
    try {
      const listaFotos = await (window as any).api.getFotosSlideshow()
      setFotos(listaFotos)
      setIndiceAtual(0)
    } catch (err) {
      console.error(err)
    }
  }

  const proximaFoto = () => {
    if (fotos.length <= 1) return
    setIndiceAtual((prev) => (prev + 1) % fotos.length)
  }

  const fotoAnterior = () => {
    if (fotos.length <= 1) return
    setIndiceAtual((prev) => (prev - 1 + fotos.length) % fotos.length)
  }

  const reiniciarTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      proximaFoto()
    }, 3000)
  }

  useEffect(() => {
    carregarFotos()
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  useEffect(() => {
    if (fotos.length > 1) {
      reiniciarTimer()
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [fotos, indiceAtual])

  const gerirPasta = async () => {
    await (window as any).api.abrirPastaSlideshow()
    // Atualiza as fotos uns segundos depois, caso o utilizador tenha fechado a pasta
    setTimeout(carregarFotos, 2000) 
  }

  return (
    <div className="flex-1 flex flex-col lg:flex-row p-8 lg:p-14 gap-12 items-center justify-center max-w-7xl mx-auto w-full relative">
      <div className="absolute top-[-10%] left-[-10%] w-[30%] h-[30%] bg-gray-300/30 dark:bg-white/5 blur-[100px] rounded-full pointer-events-none"></div>
      
      {/* Esquerda */}
      <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left z-10">
        <h2 className="text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-12 drop-shadow-sm">
          {saudacao}
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-xl">
          <MenuButton to="/torneios" title="Torneios & Pedidos" desc="Controlo financeiro e folhas" icon={Trophy} cor="blue" />
          <MenuButton to="/basedados" title="Base de Dados" desc="Gerir atletas globais e clubes" icon={Database} cor="emerald" />
          <MenuButton to="/pastas" title="Gerar Pastas" desc="Extração automática do PDF" icon={FolderTree} cor="orange" />
          <MenuButton to="/estatisticas" title="Estatísticas" desc="Análise financeira global" icon={BarChart2} cor="purple" />
          <MenuButton to="/envios" title="Envios" desc="Estado das transferências" icon={Send} cor="rose" />
          <MenuButton to="/definicoes" title="Definições" desc="Configurações e credenciais" icon={Settings} cor="slate" />
        </div>
      </div>

      {/*DIREITA */}
      <div className="flex-1 w-full max-w-md hidden md:flex flex-col items-center justify-center z-10">
        <div className="w-full h-[550px] bg-white dark:bg-[#1E1E1E] rounded-[2rem] border border-gray-200 dark:border-[#2A2A2A] shadow-xl p-4 flex flex-col justify-between gap-4 group transition-transform duration-500 hover:-translate-y-2">
          
          
          {/* TOPO */}
          <div className="w-full flex justify-between items-center shrink-0">
            <span className="text-xs text-gray-400 font-semibold tracking-wider uppercase">
              {fotos.length > 0 ? `Foto ${indiceAtual + 1} / ${fotos.length}` : 'Sem fotos'}
            </span>
            <button 
              onClick={gerirPasta}
              className="shrink-0 text-xs bg-gray-100 dark:bg-[#252528] hover:bg-gray-200 dark:hover:bg-[#303035] text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 border border-gray-200 dark:border-[#333]"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Gerir Pasta</span>
            </button>
          </div>

          {/* MEIO (imagem) */}
          <div className="flex-1 w-full min-h-0 rounded-2xl overflow-hidden relative border border-gray-100 dark:border-[#2A2A2A] bg-gray-50 dark:bg-black/20 flex items-center justify-center">
            {fotos.length > 0 ? (
              <img 
                key={indiceAtual}
                src={fotos[indiceAtual]} 
                alt="Slideshow" 
                className="w-full h-full object-contain p-1 animate-fade-in select-none pointer-events-none drop-shadow-lg"
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-center">
                <div className="relative w-32 h-32 rounded-full bg-gray-50 dark:bg-[#252525] shadow-inner border border-gray-100 dark:border-[#333] flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                  <span className="text-7xl drop-shadow-lg">🛼</span>
                </div>
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Sem fotos na pasta</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 max-w-[220px] mt-1">Clique em "Gerir Pasta" para adicionar até 50 imagens.</p>
              </div>
            )}
          </div>

          {/* Base */}
          <div className="w-full shrink-0 flex flex-col items-center gap-3">
            <div className="w-full flex items-center justify-between gap-2">
              <button 
                onClick={() => { fotoAnterior(); reiniciarTimer(); }}
                disabled={fotos.length <= 1}
                className="shrink-0 px-3 py-2 bg-gray-100 dark:bg-[#222] hover:bg-gray-200 dark:hover:bg-[#2A2A2A] disabled:opacity-30 disabled:pointer-events-none text-gray-800 dark:text-white rounded-xl transition-all text-xs font-semibold flex items-center gap-1 border border-gray-200 dark:border-[#333]"
              >
                <ChevronLeft className="w-4 h-4" /> Anterior
              </button>
              
              <div className="flex gap-1.5 max-w-[100px] overflow-hidden flex-1">
                {fotos.slice(0, 10).map((_, i) => (
                  <span 
                    key={i} 
                    className={`h-1.5 rounded-full transition-all duration-300 ${i === indiceAtual ? 'w-4 bg-blue-500' : 'w-1.5 bg-gray-300 dark:bg-white/20'}`}
                  />
                ))}
              </div>

              <button 
                onClick={() => { proximaFoto(); reiniciarTimer(); }}
                disabled={fotos.length <= 1}
                className="shrink-0 px-3 py-2 bg-gray-100 dark:bg-[#222] hover:bg-gray-200 dark:hover:bg-[#2A2A2A] disabled:opacity-30 disabled:pointer-events-none text-gray-800 dark:text-white rounded-xl transition-all text-xs font-semibold flex items-center gap-1 border border-gray-200 dark:border-[#333]"
              >
                Seguinte <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  )
}

function MenuButton({ to, title, desc, icon: Icon, cor }: { to: string, title: string, desc: string, icon: any, cor: 'blue' | 'emerald' | 'orange' | 'purple' | 'rose' }) {
  
  const cores = {
    blue: "text-blue-500 bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20",
    emerald: "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20",
    orange: "text-orange-500 bg-orange-50 dark:bg-orange-500/10 border-orange-100 dark:border-orange-500/20",
    purple: "text-purple-500 bg-purple-50 dark:bg-purple-500/10 border-purple-100 dark:border-purple-500/20",
    rose: "text-rose-500 bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20",
    slate: "text-slate-500 bg-slate-50 dark:bg-slate-500/10 border-slate-100 dark:border-slate-500/20",
  }

  return (
    <Link 
      to={to} 
      className="group flex flex-col bg-white dark:bg-[#1A1A1D] border border-gray-200 dark:border-[#2A2A2A] hover:border-blue-500 dark:hover:border-blue-500 p-6 rounded-2xl shadow-sm hover:shadow-xl dark:shadow-none transition-all duration-300 hover:-translate-y-1 relative overflow-hidden"
    >
      
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-transform duration-300 group-hover:scale-110 mb-4 z-10 ${cores[cor]}`}>
        <Icon className="w-6 h-6" />
      </div>
      
      <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-2 z-10">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed z-10">{desc}</p>
    </Link>
  )
}