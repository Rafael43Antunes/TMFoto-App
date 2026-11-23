import { ErroIA, type Fornecedor } from './fornecedores'

const MAX_RONDAS = 8 // limite de tentativas, para nunca ficar preso para sempre

export type PedirIA = <T>(etiqueta: string, prompt: string, schema: object) => Promise<T>

export function criarRouter(niveis: Fornecedor[][], log: (msg: string) => void = console.log): PedirIA {
  const indisponiveis = new Set<string>()

  return async function pedir<T>(etiqueta: string, prompt: string, schema: object): Promise<T> {
    let ultimoErro: ErroIA | undefined

    for (let ronda = 0; ronda < MAX_RONDAS; ronda++) {
      // Primeiro nível que ainda tem alguém disponível
      const nivel = niveis
        .map((n) => n.filter((f) => !indisponiveis.has(f.nome)))
        .find((n) => n.length > 0)
      if (!nivel) break // ninguém disponível em nenhum nível

      let espera = Infinity // quanto tempo esperar antes da próxima ronda

      for (const f of nivel) {
        try {
          const resposta = await f.pedirJSON<T>(prompt, schema)
          log(`[IA] ${etiqueta}: OK (${f.nome})`)
          return resposta // sucesso: sai logo
        } catch (err) {
          if (!(err instanceof ErroIA)) throw err // erro inesperado (bug): não esconder
          ultimoErro = err
          log(`[IA] ${etiqueta}: ${f.nome} -> ${err.tipo}: ${err.message}`)

          if (err.tipo === 'fatal') throw err                                   // parar tudo
          if (err.tipo === 'indisponivel') indisponiveis.add(f.nome)            // nunca mais usar
          if (err.tipo === 'limite_minuto') espera = Math.min(espera, err.esperarMs)
          if (err.tipo === 'temporario') espera = Math.min(espera, 3000 * (ronda + 1)) // 3s, 6s, 9s...
          // ...e passa ao próximo fornecedor do mesmo nível
        }
      }

      // Ninguém deste nível respondeu. Se algum pediu para esperar, espera.
      if (espera !== Infinity) {
        log(`[IA] ${etiqueta}: a aguardar ${Math.round(espera / 1000)}s...`)
        await new Promise((r) => setTimeout(r, espera))
      }
    }

    throw new Error(
      ultimoErro?.tipo === 'indisponivel'
        ? 'Nenhuma IA disponível: sem internet/quota no Groq e o Ollama não está a correr.'
        : `A IA falhou repetidamente: ${ultimoErro?.message ?? 'erro desconhecido'}`
    )
  }
}