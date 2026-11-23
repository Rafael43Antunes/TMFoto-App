import { criarRouter } from '../src/main/services/ia/routerIA'
import { ErroIA, type Fornecedor } from '../src/main/services/ia/fornecedores'

// Cria um fornecedor falso que responde segundo uma "lista de comportamentos"
function falso(nome: string, comportamentos: (string | ErroIA)[]): Fornecedor {
  let i = 0
  return {
    nome,
    async pedirJSON<T>(): Promise<T> {
      const c = comportamentos[Math.min(i++, comportamentos.length - 1)]
      if (c instanceof ErroIA) throw c
      return { resposta: c } as T
    }
  }
}

async function cenario(titulo: string, niveis: Fornecedor[][]) {
  console.log(`\n=== ${titulo} ===`)
  const pedir = criarRouter(niveis)
  try {
    const r = await pedir<{ resposta: string }>('Teste', 'prompt', {})
    console.log(`➡️  Resultado: ${r.resposta}`)
  } catch (err: any) {
    console.log(`➡️  Erro final: ${err.message}`)
  }
}

async function main() {
  // 1. 120b no limite por minuto -> deve usar o 20b
  await cenario('Limite por minuto num modelo', [
    [falso('Groq 120b', [new ErroIA('limite_minuto', 'limite', 2000)]), falso('Groq 20b', ['resposta do 20b'])],
    [falso('Ollama', ['resposta do Ollama'])]
  ])

  // 2. Sem internet -> deve descer para o Ollama
  await cenario('Sem internet', [
    [falso('Groq 120b', [new ErroIA('indisponivel', 'sem net')]), falso('Groq 20b', [new ErroIA('indisponivel', 'sem net')])],
    [falso('Ollama', ['resposta do Ollama'])]
  ])

  // 3. Os dois Groq no limite -> deve ESPERAR 2s e tentar o Groq outra vez (não o Ollama)
  await cenario('Ambos no limite', [
    [falso('Groq 120b', [new ErroIA('limite_minuto', 'limite', 2000), 'resposta do 120b depois de esperar']),
     falso('Groq 20b', [new ErroIA('limite_minuto', 'limite', 2000)])],
    [falso('Ollama', ['resposta do Ollama'])]
  ])

  // 4. Chave errada -> deve parar logo, sem tentar mais ninguém
  await cenario('Erro fatal', [
    [falso('Groq 120b', [new ErroIA('fatal', 'chave inválida')])],
    [falso('Ollama', ['resposta do Ollama'])]
  ])
}

main()
