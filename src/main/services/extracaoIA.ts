import fs from 'fs'
import { PDFDocument } from 'pdf-lib'
import { GoogleGenerativeAI, SchemaType, type Schema } from '@google/generative-ai'

const MODELO = 'gemini-flash-latest'
const PAGINAS_POR_BLOCO = 3
const PEDIDOS_EM_PARALELO = 3
const TENTATIVAS = 3

export interface AtletaIA { ordem: number; nome: string; clube: string }
export interface EscalaoIA { nome: string; dia: string; atletas: AtletaIA[] }
export interface ResultadoExtracao { escaloes: EscalaoIA[]; avisos: string[] }

interface Sessao { dia: string; ordem_inicio?: number; ordem_fim?: number }
interface EstruturaEscalao { nome: string; total_atletas: number; sessoes: Sessao[] }

type Progresso = (msg: string) => void

// ---------------- helpers

function cliente() {
  const chave = (import.meta.env as any).VITE_GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY
  if (!chave) throw new Error('Chave da API do Gemini não configurada.')
  return new GoogleGenerativeAI(chave)
}

// Repete até 3x (503, JSON inválido, resposta cortada) com espera de 2s, 4s
async function comRetry<T>(nome: string, fn: () => Promise<T>): Promise<T> {
  let ultimoErro: any
  for (let t = 1; t <= TENTATIVAS; t++) {
    try {
      return await fn()
    } catch (err: any) {
      ultimoErro = err
      console.warn(`[IA] ${nome}: tentativa ${t}/${TENTATIVAS} falhou -> ${err?.message ?? err}`)
      if (t < TENTATIVAS) await new Promise((r) => setTimeout(r, 2000 * t))
    }
  }
  throw new Error(`${nome}: ${ultimoErro?.message ?? ultimoErro}`)
}

async function pedirJSON<T>(schema: Schema, prompt: string, pdf: Uint8Array): Promise<T> {
  const model = cliente().getGenerativeModel({
    model: MODELO,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: schema, // obriga a IA a devolver exatamente este formato
      temperature: 0,
      maxOutputTokens: 32768
    }
  })
  const result = await model.generateContent([
    prompt,
    { inlineData: { data: Buffer.from(pdf).toString('base64'), mimeType: 'application/pdf' } }
  ])
  // Se não acabou em STOP (ex: MAX_TOKENS) a resposta vem cortada -> erro (e o retry tenta de novo)
  const motivo = result.response.candidates?.[0]?.finishReason
  if (motivo && motivo !== 'STOP') throw new Error(`Resposta incompleta da IA (${motivo})`)
  return JSON.parse(result.response.text()) as T
}

async function dividirPdf(pdfBytes: Uint8Array, porBloco: number) {
  const original = await PDFDocument.load(pdfBytes, { ignoreEncryption: true })
  const total = original.getPageCount()
  const blocos: { de: number; ate: number; bytes: Uint8Array }[] = []
  for (let i = 0; i < total; i += porBloco) {
    const indices = Array.from({ length: Math.min(porBloco, total - i) }, (_, k) => i + k)
    const novo = await PDFDocument.create()
    const paginas = await novo.copyPages(original, indices)
    paginas.forEach((p) => novo.addPage(p))
    blocos.push({ de: i + 1, ate: i + indices.length, bytes: await novo.save() })
  }
  return blocos
}

// Corre no máximo `limite` pedidos ao mesmo tempo (para não levar rate limit)
async function emParalelo<T, R>(itens: T[], limite: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const resultados: R[] = new Array(itens.length)
  let proximo = 0
  const trabalhadores = Array.from({ length: Math.min(limite, itens.length) }, async () => {
    while (proximo < itens.length) {
      const i = proximo++
      resultados[i] = await fn(itens[i])
    }
  })
  await Promise.all(trabalhadores)
  return resultados
}

// ---------------- passo 1: estrutura

const SCHEMA_ESTRUTURA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    escaloes: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          nome: { type: SchemaType.STRING },
          total_atletas: { type: SchemaType.INTEGER },
          sessoes: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                dia: { type: SchemaType.STRING },
                ordem_inicio: { type: SchemaType.INTEGER, nullable: true },
                ordem_fim: { type: SchemaType.INTEGER, nullable: true }
              },
              required: ['dia']
            }
          }
        },
        required: ['nome', 'total_atletas', 'sessoes']
      }
    }
  },
  required: ['escaloes']
}

const PROMPT_ESTRUTURA = `
És um especialista em documentos de torneios de Patinagem Artística. O PDF pode ter formatos diferentes
de torneio para torneio. NÃO listes atletas — quero apenas a ESTRUTURA:

- "escaloes": cada tabela/lista de Ordem de Saída, pela ordem em que aparece no PDF.
  - "nome": o título completo da prova/escalão tal como aparece (ex: "Patinagem Livre - Infantil Feminino").
    Se a tabela continuar noutra página ("Cont."), é o MESMO escalão — não o repitas.
  - "total_atletas": quantas linhas de atletas/pares tem esse escalão (somando todas as páginas).
  - "sessoes": em que dia(s) esse escalão compete, segundo o horário (se existir).
    Se o escalão estiver dividido por vários dias (ex: "Iniciado F (1 a 74)" no sábado e "(75 a 88)" no domingo),
    cria uma sessão por dia com ordem_inicio/ordem_fim. Se for todo no mesmo dia, uma sessão sem intervalo.
    Formato do dia: "Dia N - <dia da semana> <dia do mês>" (ex: "Dia 1 - Quarta-feira 25"), numerando os dias
    do torneio por ordem. Se o PDF não tiver horário, usa "Dia 1".
`

// ---------------- passo 2: atletas por bloco

function schemaAtletas(nomesEscaloes: string[]): Schema {
  return {
    type: SchemaType.OBJECT,
    properties: {
      atletas: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            escalao: { type: SchemaType.STRING, format: 'enum', enum: nomesEscaloes },
            ordem: { type: SchemaType.INTEGER },
            nome: { type: SchemaType.STRING },
            clube: { type: SchemaType.STRING }
          },
          required: ['escalao', 'ordem', 'nome', 'clube']
        }
      }
    },
    required: ['atletas']
  }
}

function promptAtletas(nomesEscaloes: string[]): string {
  return `
Este PDF é um EXCERTO (algumas páginas) da Ordem de Saída de um torneio de Patinagem Artística.
Extrai TODAS as linhas de atletas (ou pares) destas páginas, sem saltar nenhuma.
- "escalao": a que escalão pertence a linha. Tem de ser um destes: ${nomesEscaloes.map((n) => `"${n}"`).join(', ')}.
  Se a página começar com uma tabela "Cont." (continuação), usa o escalão indicado no título dessa tabela.
- "ordem": o número da ordem de saída (coluna OS / Ordem).
- "nome": nome completo do atleta (nos pares, "Nome 1 - Nome 2").
- "clube": a sigla do clube.
Se estas páginas não tiverem atletas (ex: só horário), devolve "atletas": [].
`
}

// ---------------- orquestração

export async function extrairOrdemSaidaIA(caminhoPdf: string, progresso: Progresso = () => {}): Promise<ResultadoExtracao> {
  const pdfBytes = new Uint8Array(fs.readFileSync(caminhoPdf))
  const avisos: string[] = []

  // PASSO 1
  progresso('A analisar a estrutura do PDF...')
  const estrutura = await comRetry('Estrutura', () =>
    pedirJSON<{ escaloes: EstruturaEscalao[] }>(SCHEMA_ESTRUTURA, PROMPT_ESTRUTURA, pdfBytes)
  )
  const escaloesEstrutura = estrutura.escaloes.filter((e) => e.nome?.trim())
  if (escaloesEstrutura.length === 0) throw new Error('A IA não encontrou nenhum escalão neste PDF.')
  const nomes = escaloesEstrutura.map((e) => e.nome)

  // PASSO 2
  const blocos = await dividirPdf(pdfBytes, PAGINAS_POR_BLOCO)
  let feitos = 0
  const schema = schemaAtletas(nomes)
  const prompt = promptAtletas(nomes)
  const respostas = await emParalelo(blocos, PEDIDOS_EM_PARALELO, async (b) => {
    const r = await comRetry(`Páginas ${b.de}-${b.ate}`, () =>
      pedirJSON<{ atletas: (AtletaIA & { escalao: string })[] }>(schema, prompt, b.bytes)
    )
    progresso(`A extrair atletas... (${++feitos}/${blocos.length} blocos de páginas)`)
    return r.atletas ?? []
  })

  // PASSO 3: juntar por escalão, sem duplicados (chave = nº de ordem)
  const porEscalao = new Map<string, Map<number, AtletaIA>>()
  nomes.forEach((n) => porEscalao.set(n, new Map()))
  for (const a of respostas.flat()) {
    const mapa = porEscalao.get(a.escalao)
    if (!mapa || !a.nome?.trim()) continue
    if (!mapa.has(a.ordem)) mapa.set(a.ordem, { ordem: a.ordem, nome: a.nome.trim(), clube: (a.clube ?? '').trim() })
  }

  const escaloes: EscalaoIA[] = []
  for (const est of escaloesEstrutura) {
    const atletas = [...porEscalao.get(est.nome)!.values()].sort((a, b) => a.ordem - b.ordem)
    if (atletas.length === 0) { avisos.push(`"${est.nome}": nenhum atleta extraído.`); continue }
    if (est.total_atletas && atletas.length !== est.total_atletas) {
      avisos.push(`"${est.nome}": esperados ${est.total_atletas} atletas, extraídos ${atletas.length}. Confirma a lista.`)
    }

    // Dia de cada atleta pela ordem; parte o escalão se competir em vários dias
    const sessoes = est.sessoes?.length ? est.sessoes : [{ dia: 'Dia 1' }]
    const diaDe = (ordem: number) =>
      sessoes.find((s) => s.ordem_inicio != null && ordem >= s.ordem_inicio && ordem <= (s.ordem_fim ?? s.ordem_inicio))?.dia ??
      sessoes.find((s) => s.ordem_inicio == null)?.dia ??
      sessoes[0].dia

    const partes: EscalaoIA[] = []
    for (const a of atletas) {
      const dia = diaDe(a.ordem)
      const ultima = partes[partes.length - 1]
      if (ultima && ultima.dia === dia) ultima.atletas.push(a)
      else partes.push({ nome: est.nome, dia, atletas: [a] })
    }
    if (partes.length > 1) {
      partes.forEach((p) => (p.nome = `${est.nome} (${p.atletas[0].ordem} a ${p.atletas[p.atletas.length - 1].ordem})`))
    }
    escaloes.push(...partes)
  }

  return { escaloes, avisos }
}