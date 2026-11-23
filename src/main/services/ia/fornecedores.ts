/**
 * Fornecedores de IA. Todos expõem a mesma função: pedirJSON(prompt, schema) -> objeto.
 * O resto da app não sabe se a resposta veio do Groq ou do Ollama.
 */

export type TipoErro =
  | 'limite_minuto' // 429 com espera curta: esperar uns segundos ou usar outro modelo
  | 'indisponivel' // sem internet, quota diária, Ollama desligado: passar ao fornecedor seguinte
  | 'temporario' // 5xx: repetir
  | 'fatal' // pedido mal feito, chave errada, modelo inexistente: parar e mostrar o erro

export class ErroIA extends Error {
  constructor(
    public tipo: TipoErro,
    mensagem: string,
    public esperarMs = 0
  ) {
    super(mensagem)
  }
}

function lerJSON<T>(texto: string, origem: string): T {
  try {
    return JSON.parse(texto) as T
  } catch {
    throw new ErroIA('temporario', `${origem}: resposta não é JSON válido`)
  }
}

export interface Fornecedor {
  nome: string
  pedirJSON<T>(prompt: string, schema: object): Promise<T>
}

// ------------------------------------------------------------------ GROQ (plano A)

export function criarGroq(chave: string | undefined, modelo: string): Fornecedor {
  return {
    nome: `Groq ${modelo}`,
    async pedirJSON<T>(prompt: string, schema: object): Promise<T> {
      if (!chave) throw new ErroIA('indisponivel', 'Chave do Groq não configurada')

      let res: Response
      try {
        res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: modelo,
            temperature: 0,
            reasoning_effort: 'low', // gpt-oss "pensa" antes de responder; low = menos tokens gastos
            max_completion_tokens: 8000,
            messages: [{ role: 'user', content: prompt }],
            response_format: {
              type: 'json_schema',
              json_schema: { name: 'resposta', strict: true, schema }
            }
          }),
          signal: AbortSignal.timeout(120_000)
        })
      } catch (err: any) {
        // fetch só rebenta assim quando não há ligação (ou timeout)
        throw new ErroIA('indisponivel', `Sem ligação ao Groq: ${err.message}`)
      }

      if (res.status === 429) {
        // retry-after em segundos. Curto = limite por minuto. Longo = quota do dia esgotada.
        const segundos = Number(res.headers.get('retry-after') ?? 60)
        if (segundos <= 90) throw new ErroIA('limite_minuto', `Groq: limite por minuto (${segundos}s)`, segundos * 1000)
        throw new ErroIA('indisponivel', `Groq: quota diária esgotada (renova em ${Math.round(segundos / 60)} min)`)
      }
      if (res.status >= 500) throw new ErroIA('temporario', `Groq: erro ${res.status} no servidor`)
      if (!res.ok) {
        const corpo = await res.text()
        // O modelo gerou JSON fora do schema (ex: "110" em vez de 110). É um erro do modelo,
        // não nosso: tentar outra vez (ou noutro modelo) costuma resolver.
        if (corpo.includes('json_validate_failed')) {
          throw new ErroIA('temporario', 'Groq: o modelo gerou JSON fora do formato pedido')
        }
        throw new ErroIA('fatal', `Groq: erro ${res.status} - ${corpo.slice(0, 300)}`)
      }

      const json = await res.json()
      const escolha = json.choices?.[0]
      if (escolha?.finish_reason === 'length') {
        throw new ErroIA('fatal', 'Groq: resposta cortada (bloco de páginas demasiado grande)')
      }
      return lerJSON<T>(escolha.message.content, 'Groq')
    }
  }
}

// ------------------------------------------------------------------ OLLAMA (plano B, local)

export function criarOllama(modelo: string, url = 'http://localhost:11434'): Fornecedor {
  return {
    nome: `Ollama ${modelo}`,
    async pedirJSON<T>(prompt: string, schema: object): Promise<T> {
      let res: Response
      try {
        res = await fetch(`${url}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: modelo,
            stream: false,
            format: schema, // structured outputs: o Ollama obriga a resposta a seguir o schema
            messages: [{ role: 'user', content: prompt }],
            options: {
              temperature: 0,
              num_ctx: 8192 // contexto limitado = menos RAM (1 bloco de páginas cabe à vontade)
            },
            keep_alive: '30s' // fica carregado entre blocos; liberta a RAM 30s depois do último
          }),
          signal: AbortSignal.timeout(10 * 60_000) // no CPU pode demorar
        })
      } catch {
        throw new ErroIA('indisponivel', 'Ollama não está a correr neste PC')
      }

      if (res.status === 404) {
        throw new ErroIA('fatal', `Ollama: modelo "${modelo}" não instalado. Corre: ollama pull ${modelo}`)
      }
      if (!res.ok) throw new ErroIA('temporario', `Ollama: erro ${res.status} - ${await res.text()}`)

      const json = await res.json()
      if (json.done_reason === 'length') throw new ErroIA('fatal', 'Ollama: resposta cortada (aumenta num_ctx)')
      return lerJSON<T>(json.message.content, 'Ollama')
    }
  }
}