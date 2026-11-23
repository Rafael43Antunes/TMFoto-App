/**
 * Extração da Ordem de Saída: PDF -> texto (local) -> IA por blocos -> junção (local).
 *
 *   1. Texto: pdfjs-dist extrai o texto de cada página, com as colunas separadas por " | ".
 *   2. Blocos: junta páginas seguidas até ~5000 caracteres (respostas pequenas, cabem no limite por minuto).
 *   3. IA por bloco: devolve as tabelas que vê (título + atletas), conferidas com o texto (verificacao.ts).
 *   4. Junção local: tabelas com o mesmo título (ex: continuação na página seguinte) juntam-se.
 *   5. Validação local: buracos na numeração geram avisos.
 *   6. Dias: as páginas de horário vão em TEXTO ORIGINAL, num só pedido, com a lista de escalões.
 */
import { extrairTextoPdf } from './textoPdf'
import type { PedirIA } from './routerIA'
import { verificarBloco, linhasDeAtleta } from './verificacao'

const MAX_CARACTERES_BLOCO = 5000
const TENTATIVAS_POR_BLOCO = 2 // se faltarem atletas, pede o bloco mais uma vez

export interface AtletaIA { ordem: number; nome: string; clube: string }
export interface EscalaoIA { nome: string; dia: string; atletas: AtletaIA[] }
export interface ResultadoExtracao { escaloes: EscalaoIA[]; avisos: string[] }

type Progresso = (msg: string) => void

// ---------------------------------------------------------------- schemas (formato strict: tudo required)

const SCHEMA_BLOCO = {
  type: 'object',
  additionalProperties: false,
  required: ['tabelas'],
  properties: {
    tabelas: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['titulo', 'atletas'],
        properties: {
          titulo: { type: 'string' },
          atletas: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['ordem', 'nome', 'clube'],
              properties: {
                ordem: { type: 'integer' },
                nome: { type: 'string' },
                clube: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }
}

const SCHEMA_DIAS = {
  type: 'object',
  additionalProperties: false,
  required: ['escaloes'],
  properties: {
    escaloes: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['titulo', 'sessoes'],
        properties: {
          titulo: { type: 'string' },
          sessoes: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['dia', 'ordem_inicio', 'ordem_fim'],
              properties: {
                dia: { type: 'string' },
                ordem_inicio: { type: 'integer' }, // 0 = escalão inteiro
                ordem_fim: { type: 'integer' }
              }
            }
          }
        }
      }
    }
  }
}

// ---------------------------------------------------------------- prompts

function promptBloco(texto: string, tituloAnterior: string | null): string {
  const contexto = tituloAnterior
    ? `\nCONTEXTO: o bloco de páginas anterior terminou na tabela "${tituloAnterior}". Se este texto começar com a
continuação dessa tabela (mesmo sem título), usa exatamente esse título.\n`
    : ''
  return `Este texto foi extraído de páginas de um PDF de um torneio de Patinagem Artística.
As colunas das tabelas estão separadas por " | ". Os formatos variam de torneio para torneio.

Extrai "tabelas": cada tabela de Ordem de Saída que aparece no texto.
- "titulo": o nome do escalão/prova EXATAMENTE como aparece por cima da tabela
  (ex: "Patinagem Livre - Infantil Feminino", "BENJAMIN B"). Sem "(Cont.)" e sem o nome do torneio.
  Se as tabelas estiverem agrupadas em secções (ex: "FORMAÇÃO", "COMPETIÇÃO"), põe a secção antes:
  "Competição - Infantis".
- "atletas": TODAS as linhas, sem saltar nenhuma. "ordem" é o número da coluna OS/Nº (NÃO o Nº FPP).
  "nome" é o nome completo (nos pares: "Nome 1 - Nome 2"). "clube" é a sigla do clube.

Ignora horários, treinos e cerimónias. Se não houver tabelas de atletas, devolve "tabelas": [].
${contexto}
TEXTO:
${texto}`
}

function promptDias(titulos: { titulo: string; de: number; ate: number }[], textoHorario: string): string {
  return `Num torneio de Patinagem Artística temos estes escalões (com o intervalo de ordens de saída):
${titulos.map((t) => `- "${t.titulo}" (${t.de} a ${t.ate})`).join('\n')}

Abaixo está o texto das páginas do PDF com o horário (colunas separadas por " | "; "Painel 1 | Painel 2" são
provas em simultâneo no mesmo dia). Usa só os períodos de PROVAS (ignora treinos).

Para CADA escalão da lista, diz em que dia(s) compete. O horário usa abreviaturas (ex: "PL" = Patinagem Livre,
"SD" = Solo Dance, "F"/"M" = Feminino/Masculino, "Pares de Dança" cobre todos os escalões de pares de dança).
- "titulo": exatamente como na lista acima. Devolve TODOS os escalões da lista.
- "sessoes": uma por dia. Se o escalão compete todo no mesmo dia: uma sessão com ordem_inicio = 0 e ordem_fim = 0.
  Se está dividido por dias (ex: "(1 a 74)" no sábado e "(75 a 88)" no domingo), uma sessão por dia com o intervalo
  (junta os intervalos do mesmo dia: "(1 a 28)" e "(29 a 74)" no sábado = 1 a 74).
- "dia": no formato "Dia N - <dia da semana> <dia do mês>" (ex: "Dia 1 - Quarta-feira 25"), numerando os dias
  do torneio por ordem cronológica.

HORÁRIO:
${textoHorario}`
}

// ---------------------------------------------------------------- helpers

function normalizar(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\(cont\.?\)/g, '').replace(/\s+/g, ' ').trim()
}

function criarBlocos(paginas: { numero: number; texto: string }[]) {
  const blocos: { de: number; ate: number; texto: string }[] = []
  for (const p of paginas) {
    const ultimo = blocos[blocos.length - 1]
    if (ultimo && ultimo.texto.length + p.texto.length <= MAX_CARACTERES_BLOCO) {
      ultimo.ate = p.numero
      ultimo.texto += `\n\n--- página ${p.numero} ---\n${p.texto}`
    } else {
      blocos.push({ de: p.numero, ate: p.numero, texto: `--- página ${p.numero} ---\n${p.texto}` })
    }
  }
  return blocos
}

// ---------------------------------------------------------------- principal

export async function extrairOrdemSaidaIA(
  caminhoPdf: string,
  pedir: PedirIA,
  progresso: Progresso = () => {}
): Promise<ResultadoExtracao> {
  const avisos: string[] = []

  // 1. TEXTO
  progresso('A ler o PDF...')
  const paginas = await extrairTextoPdf(caminhoPdf)
  const totalCaracteres = paginas.reduce((a, p) => a + p.texto.length, 0)
  if (totalCaracteres < paginas.length * 50) {
    throw new Error('Este PDF não tem texto (parece digitalizado/imagem). Ainda não é suportado.')
  }

  // 2 + 3. BLOCOS -> IA (sequencial: respeita o limite por minuto e a RAM do Ollama)
  const blocos = criarBlocos(paginas)
  type RespostaBloco = { tabelas: { titulo: string; atletas: AtletaIA[] }[] }
  const respostas: RespostaBloco[] = []
  let tituloAnterior: string | null = null
  for (const [i, b] of blocos.entries()) {
    progresso(`A extrair atletas... (bloco ${i + 1}/${blocos.length}, páginas ${b.de}-${b.ate})`)
    const etiqueta = `Páginas ${b.de}-${b.ate}`
    let prompt = promptBloco(b.texto, tituloAnterior)
    let r!: RespostaBloco

    for (let tentativa = 1; tentativa <= TENTATIVAS_POR_BLOCO; tentativa++) {
      r = await pedir<RespostaBloco>(etiqueta, prompt, SCHEMA_BLOCO)

      // Confere a resposta com o texto: corrige ordens, remove repetidos, deteta linhas em falta
      const v = verificarBloco(b.texto, r.tabelas)
      if (v.corrigidos || v.duplicados) {
        console.log(`[IA] ${etiqueta}: ${v.corrigidos} ordens corrigidas, ${v.duplicados} repetidos removidos`)
      }
      if (v.emFalta.length === 0) break

      console.log(`[IA] ${etiqueta}: faltam ${v.emFalta.length} atletas (tentativa ${tentativa})`)
      if (tentativa === TENTATIVAS_POR_BLOCO) {
        avisos.push(`Páginas ${b.de}-${b.ate}: a IA não extraiu ${v.emFalta.length} linha(s): ${v.emFalta.join(' / ')}`)
      } else {
        // Pede outra vez, a dizer exatamente o que faltou
        prompt = promptBloco(b.texto, tituloAnterior) +
          `\n\nATENÇÃO: numa tentativa anterior faltaram estas linhas. Não as saltes:\n${v.emFalta.join('\n')}`
      }
    }

    respostas.push(r)
    tituloAnterior = r.tabelas.at(-1)?.titulo ?? tituloAnterior
  }

  // 4. JUNÇÃO: tabelas com o mesmo título são o mesmo escalão (continuação noutra página)...
  //    ...EXCETO se trouxerem ordens que já existem com nomes diferentes: aí é outro escalão com o mesmo
  //    título (ex: "INFANTIS" em Formação e em Competição) -> fica "INFANTIS (2)".
  type Escalao = { titulo: string; atletas: Map<number, AtletaIA> }
  const porTitulo = new Map<string, Escalao[]>() // título normalizado -> instâncias
  const escaloes: Escalao[] = [] // pela ordem em que aparecem no PDF

  for (const r of respostas) {
    for (const t of r.tabelas) {
      if (!t.titulo?.trim() || t.atletas.length === 0) continue
      const chave = normalizar(t.titulo)
      const instancias = porTitulo.get(chave) ?? []
      let alvo = instancias.at(-1)

      const conflito = alvo && t.atletas.some((a) => {
        const existente = alvo!.atletas.get(a.ordem)
        return existente && normalizar(existente.nome) !== normalizar(a.nome)
      })
      if (!alvo || conflito) {
        const base = t.titulo.replace(/\(cont\.?\)/i, '').trim()
        alvo = { titulo: instancias.length ? `${base} (${instancias.length + 1})` : base, atletas: new Map() }
        if (instancias.length) avisos.push(`Há 2 escalões chamados "${base}". O segundo ficou "${alvo.titulo}": confirma o nome.`)
        instancias.push(alvo)
        porTitulo.set(chave, instancias)
        escaloes.push(alvo)
      }
      for (const a of t.atletas) {
        alvo.atletas.set(a.ordem, { ordem: a.ordem, nome: a.nome.trim(), clube: a.clube.trim() })
      }
    }
  }
  if (escaloes.length === 0) throw new Error('A IA não encontrou nenhuma tabela de atletas neste PDF.')

  const lista = escaloes.map((e) => {
    const atletas = [...e.atletas.values()].sort((a, b) => a.ordem - b.ordem)
    return { titulo: e.titulo, atletas, de: atletas[0].ordem, ate: atletas[atletas.length - 1].ordem }
  })

  // 5. VALIDAÇÃO: buracos na numeração (ex: 1,2,3,5 -> falta o 4)
  for (const e of lista) {
    const esperados = e.ate - e.de + 1
    if (e.atletas.length !== esperados) {
      const faltam = Array.from({ length: esperados }, (_, i) => e.de + i).filter((n) => !e.atletas.some((a) => a.ordem === n))
      avisos.push(`"${e.titulo}": faltam as ordens ${faltam.slice(0, 10).join(', ')}${faltam.length > 10 ? '...' : ''}. Confirma no PDF.`)
    }
  }

  // 6. DIAS: as páginas de horário vão em TEXTO ORIGINAL, num só pedido, com a lista de escalões.
  //    Página de horário = menciona dias da semana, ou não tem linhas de atletas.
  //    (\b = palavra inteira: "Domingos" num apelido não conta; e ignoramos as linhas de atletas)
  const DIAS_SEMANA = /\b((segunda|terça|terca|quarta|quinta|sexta)-feira|s[áa]bado|domingo)\b/i
  const mencionaDia = (texto: string) => {
    const atletas = new Set(linhasDeAtleta(texto))
    return texto.split('\n').some((l) => !atletas.has(l) && DIAS_SEMANA.test(l))
  }
  const paginasHorario = paginas.filter((p) => mencionaDia(p.texto) || linhasDeAtleta(p.texto).length === 0)
  const textoHorario = paginasHorario.map((p) => `--- página ${p.numero} ---\n${p.texto}`).join('\n\n')
  const temHorario = paginasHorario.some((p) => mencionaDia(p.texto))

  let sessoesPorTitulo = new Map<string, { dia: string; ordem_inicio: number; ordem_fim: number }[]>()
  if (temHorario) {
    console.log(`[IA] Horário encontrado nas páginas ${paginasHorario.map((p) => p.numero).join(', ')}`)
    progresso('A associar escalões aos dias do horário...')
    const r = await pedir<{ escaloes: { titulo: string; sessoes: { dia: string; ordem_inicio: number; ordem_fim: number }[] }[] }>(
      'Dias', promptDias(lista, textoHorario), SCHEMA_DIAS
    )
    sessoesPorTitulo = new Map(r.escaloes.map((e) => [normalizar(e.titulo), e.sessoes]))
  }

  // Partir escalões que competem em vários dias
  const resultado: EscalaoIA[] = []
  for (const e of lista) {
    const sessoes = sessoesPorTitulo.get(normalizar(e.titulo)) ?? []
    if (temHorario && sessoes.length === 0) avisos.push(`"${e.titulo}": não encontrei o dia no horário. Ficou em "Dia 1".`)

    const diaDe = (ordem: number) =>
      sessoes.find((s) => s.ordem_inicio > 0 && ordem >= s.ordem_inicio && ordem <= s.ordem_fim)?.dia ??
      sessoes.find((s) => s.ordem_inicio === 0)?.dia ??
      sessoes[0]?.dia ??
      'Dia 1'

    const partes: EscalaoIA[] = []
    for (const a of e.atletas) {
      const dia = diaDe(a.ordem)
      const ultima = partes[partes.length - 1]
      if (ultima && ultima.dia === dia) ultima.atletas.push(a)
      else partes.push({ nome: e.titulo, dia, atletas: [a] })
    }
    if (partes.length > 1) {
      partes.forEach((p) => (p.nome = `${e.titulo} (${p.atletas[0].ordem} a ${p.atletas[p.atletas.length - 1].ordem})`))
    }
    resultado.push(...partes)
  }

  return { escaloes: resultado, avisos }
}