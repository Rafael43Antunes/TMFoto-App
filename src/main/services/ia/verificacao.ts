/**
 * Verifica a resposta da IA contra o texto que lhe enviámos.
 * A IA interpreta; mas os números e nomes têm de EXISTIR no texto. Se não existirem, a IA inventou/enganou-se.
 */
import type { AtletaIA } from './extracaoIA'

function normalizar(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

// Linhas do texto que parecem linhas de atleta: começam por "número |"
export function linhasDeAtleta(texto: string): string[] {
  return texto.split('\n').filter((l) => /^\d{1,3} \|/.test(l.trim()))
}

export interface ResultadoVerificacao {
  corrigidos: number // ordens corrigidas a partir do texto
  duplicados: number // atletas repetidos pela IA (removidos)
  emFalta: string[] // linhas do texto que a IA não devolveu
}

export function verificarBloco(texto: string, tabelas: { titulo: string; atletas: AtletaIA[] }[]): ResultadoVerificacao {
  const linhas = linhasDeAtleta(texto)
  const linhasUsadas = new Set<number>()
  let corrigidos = 0
  let duplicados = 0

  for (const t of tabelas) {
    const manter: AtletaIA[] = []
    for (const a of t.atletas) {
      const nome = normalizar(a.nome)
      // Linhas que contêm o nome do atleta (ainda não usadas por outro atleta)
      const candidatas = linhas
        .map((l, i) => ({ l, i }))
        .filter(({ l, i }) => !linhasUsadas.has(i) && normalizar(l).includes(nome))
      if (candidatas.length === 0) {
        // O nome existe no texto mas a linha já foi usada por outro atleta -> a IA repetiu-o
        if (linhas.some((l) => normalizar(l).includes(nome))) {
          duplicados++
          continue // não entra em "manter"
        }
        manter.push(a) // nome não encontrado tal e qual (ex: a IA corrigiu uma gralha): não mexemos
        continue
      }

      // Prefere a linha cujo número coincide com a ordem dada pela IA
      const escolhida = candidatas.find(({ l }) => Number(l.split(' |')[0]) === Number(a.ordem)) ?? candidatas[0]
      linhasUsadas.add(escolhida.i)

      const ordemTexto = Number(escolhida.l.split(' |')[0])
      if (ordemTexto !== Number(a.ordem)) {
        a.ordem = ordemTexto // o número do PDF manda
        corrigidos++
      }
      manter.push(a)
    }
    t.atletas = manter
  }

  const emFalta = linhas.filter((_, i) => !linhasUsadas.has(i))
  return { corrigidos, duplicados, emFalta }
}