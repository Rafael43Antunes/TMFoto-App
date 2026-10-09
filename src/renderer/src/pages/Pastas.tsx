import { useState } from 'react'
import { FileText, FolderPlus, Calendar, Users, Upload, Wifi, Loader2 } from 'lucide-react'

// Interface para estruturar os dados que vêm do backend
interface EscalaoProcessado {
  nome: string
  dia: string
  atletas: any[]
}

export default function GerarPastas() {
  const [escaloes, setEscaloes] = useState<EscalaoProcessado[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [loadingText, setLoadingText] = useState('')

  const mensagensProcessamento = [
    "A preparar o documento PDF...",
    "A enviar ficheiro para a nuvem da Google...",
    "A analisar a estrutura das tabelas...",
    "A extrair escalões e clubes com IA...",
    "A formatar os dados de saída...",
    "Quase lá..."
  ]

  const importarPDF = async () => {
    // 1. Abre a janela do Windows PRIMEIRO, sem ativar o loading
    const caminho = await (window as any).api.escolherPdf()
    
    // Se o utilizador fechar a janela sem escolher nada, paramos aqui
    if (!caminho) return 

    // 2. SÓ AGORA é que ativamos o ecrã de loading e começamos a análise
    setIsProcessing(true)
    setLoadingText(mensagensProcessamento[0])

    let step = 0
    const interval = setInterval(() => {
      step = Math.min(step + 1, mensagensProcessamento.length - 1)
      setLoadingText(mensagensProcessamento[step])
    }, 1500)

    try {
      // 3. Mandamos o caminho do ficheiro para a IA mastigar
      const dados = await (window as any).api.processarPdf(caminho)
      clearInterval(interval)
      
      if (dados) {
        const listaFormatada = Object.keys(dados).map((key) => ({
          nome: key,
          dia: 'Dia 1',
          atletas: dados[key]
        }))
        
        setEscaloes(listaFormatada)
      }
    } catch (error) {
      clearInterval(interval)
      console.error("Erro a importar PDF:", error)
      alert("Ocorreu um erro ao processar o PDF. Verifica a tua ligação à internet e tenta novamente.")
    } finally {
      clearInterval(interval)
      setIsProcessing(false)
    }
  }

  // Função para mudar o dia de um escalão específico
  const mudarDia = (index: number, novoDia: string) => {
    const novaLista = [...escaloes]
    novaLista[index].dia = novoDia
    setEscaloes(novaLista)
  }

  const gerarPastasNoDisco = async () => {
    setIsProcessing(true)
    try {
      const resultado = await (window as any).api.gerarPastasDisco(escaloes)
      
      if (resultado.sucesso) {
        alert(`Sucesso! Pastas criadas em:\n${resultado.caminho}`)
        setEscaloes([]) 
      }
    } catch (error) {
      console.error("Erro ao gravar no disco:", error)
      alert("Ocorreu um erro ao tentar criar as pastas.")
    } finally {
      setIsProcessing(false)
    }
  }

  // Conta o total de atletas extraídos para estatística rápida
  const totalAtletas = escaloes.reduce((acc, esc) => acc + esc.atletas.length, 0)

  return (
    <div className={`h-full min-h-[85vh] flex flex-col max-w-5xl mx-auto w-full animate-fade-in pb-8 pt-12 ${escaloes.length === 0 ? 'justify-center' : ''}`}>
      
      {/* AVISO DE INTERNET */}
      <div className="mb-6 flex items-center gap-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 text-blue-700 dark:text-blue-400 p-4 rounded-xl shrink-0">
        <div className="bg-white dark:bg-blue-500/20 p-2 rounded-lg shadow-sm">
          <Wifi className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm font-semibold">Ligação à Internet Necessária</p>
          <p className="text-xs opacity-90 mt-0.5">A extração inteligente de dados do PDF, utiliza Inteligência Artificial e requer que estejas online. A geração final das pastas é feita localmente.</p>
        </div>
      </div>

      {/* CABEÇALHO */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2 tracking-tight">Gerar Pastas</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Importa a Ordem de Saída em PDF para criar a árvore de pastas automaticamente.
          </p>
        </div>
        
        <button
          onClick={importarPDF}
          disabled={isProcessing}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
        >
          {isProcessing ? (
            <span className="animate-pulse">A analisar com IA...</span>
          ) : (
            <>
              <Upload className="w-5 h-5" /> Importar PDF
            </>
          )}
        </button>
      </div>

      {/* ÁREA PRINCIPAL */}
      {isProcessing ? (
        // ECRÃ DE CARREGAMENTO (Aparece apenas enquanto a IA trabalha)
        <div className="flex-1 border-2 border-dashed border-blue-200 dark:border-blue-500/30 rounded-[2rem] flex flex-col items-center justify-center text-center p-10 bg-blue-50/50 dark:bg-[#151518]/50">
          <Loader2 className="w-14 h-14 text-blue-500 animate-spin mb-6" />
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Inteligência Artificial em Acção</h3>
          <p className="text-sm font-medium text-blue-600 dark:text-blue-400 animate-pulse">
            {loadingText}
          </p>
        </div>
      ) : escaloes.length === 0 ? (
        // ECRÃ VAZIO (Inicial)
        <div className="flex-1 border-2 border-dashed border-gray-200 dark:border-[#2A2A2A] rounded-[2rem] flex flex-col items-center justify-center text-center p-10 bg-white/50 dark:bg-[#151518]/50">
          <div className="w-20 h-20 bg-blue-50 dark:bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
            <FileText className="w-10 h-10 text-blue-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">Nenhum PDF Carregado</h3>
          <p className="text-sm text-gray-500 max-w-md">
            Clica no botão acima para importar uma Ordem de Saída. O modelo Gemini vai analisar as tabelas e extrair os atletas.
          </p>
        </div>
      ) : (
        // ECRÃ COM OS DADOS (Resultados da IA)
        <div className="flex-1 flex flex-col gap-6 min-h-0">
          
          <div className="grid grid-cols-2 gap-4 shrink-0">
            <div className="bg-white dark:bg-[#1A1A1D] border border-gray-100 dark:border-[#2A2A2A] rounded-2xl p-5 flex items-center gap-4">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 rounded-xl">
                <FolderPlus className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Escalões Detetados</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">{escaloes.length}</p>
              </div>
            </div>
            <div className="bg-white dark:bg-[#1A1A1D] border border-gray-100 dark:border-[#2A2A2A] rounded-2xl p-5 flex items-center gap-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 rounded-xl">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total de Atletas</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">{totalAtletas}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#1A1A1D] border border-gray-100 dark:border-[#2A2A2A] rounded-2xl flex flex-col flex-1 min-h-0 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-[#2A2A2A] bg-gray-50/50 dark:bg-black/20 flex justify-between items-center shrink-0">
              <h3 className="font-semibold text-gray-700 dark:text-gray-300">Organização das Pastas</h3>
              <span className="text-xs text-gray-500">Revê e ajusta os dias antes de gerar</span>
            </div>
            
            <div className="divide-y divide-gray-100 dark:divide-[#2A2A2A] overflow-y-auto custom-scrollbar flex-1">
              {escaloes.map((escalao, idx) => (
                <div key={idx} className="p-4 px-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-800 dark:text-gray-200">{escalao.nome}</span>
                    <span className="text-xs text-gray-500">{escalao.atletas.length} atletas extraídos</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <select
                      value={escalao.dia}
                      onChange={(e) => mudarDia(idx, e.target.value)}
                      className="bg-gray-50 dark:bg-[#151518] border border-gray-200 dark:border-[#333] text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 px-3 text-gray-700 dark:text-gray-300 outline-none cursor-pointer"
                    >
                      <option value="Dia 1">Dia 1</option>
                      <option value="Dia 2">Dia 2</option>
                      <option value="Dia 3">Dia 3</option>
                      <option value="Dia 4">Dia 4</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* BOTÃO FINAL */}
          <div className="flex justify-end pt-4">
            <button 
              onClick={gerarPastasNoDisco}
              disabled={isProcessing}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 text-lg"
            >
              <FolderPlus className="w-6 h-6" />
              {isProcessing ? 'A criar pastas...' : 'Gerar Pastas'}
            </button>
          </div>

        </div>
      )}
    </div>
  )
}