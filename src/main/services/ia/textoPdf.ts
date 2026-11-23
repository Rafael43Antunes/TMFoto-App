import fs from 'fs'

export interface PaginaTexto {
  numero: number
  texto: string
}

// Um "pedaço" de texto do PDF, com a sua posição
interface Item {
  x: number      // distância à esquerda
  y: number      // altura na página (no PDF, 0 é o FUNDO da página)
  largura: number
  str: string    // o texto
}

export async function extrairTextoPdf(caminhoPdf: string): Promise<PaginaTexto[]> {
  // import dinâmico porque o pdfjs-dist é um módulo ESM
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const data = new Uint8Array(fs.readFileSync(caminhoPdf))
  const doc = await pdfjs.getDocument({ data, isEvalSupported: false, useSystemFonts: true }).promise

  const paginas: PaginaTexto[] = []

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p)
    const conteudo = await page.getTextContent()

    const itens: Item[] = (conteudo.items as any[])
      .filter((i) => i.str?.trim())
      .map((i) => ({ x: i.transform[4], y: i.transform[5], largura: i.width, str: i.str.trim() }))

    const linhas: Item[][] = []
    for (const item of itens) {
      const linha = linhas.find((l) => Math.abs(l[0].y - item.y) < 2)
      if (linha) linha.push(item)
      else linhas.push([item])
    }

    linhas.sort((a, b) => b[0].y - a[0].y)

    const texto = linhas
      .map((linha) => {
        linha.sort((a, b) => a.x - b.x)
        let out = linha[0].str
        for (let i = 1; i < linha.length; i++) {
          const fimAnterior = linha[i - 1].x + linha[i - 1].largura
          const espaco = linha[i].x - fimAnterior
          // 4. Decide o separador pelo tamanho do espaço:
          //    < 1pt  -> mesma palavra partida ("H" + "orário")
          //    1-3pt  -> espaço normal entre palavras
          //    > 3pt  -> mudou de coluna
          out += espaco < 1 ? '' : espaco <= 3 ? ' ' : ' | '
          out += linha[i].str
        }
        return out
      })
      .join('\n')

    paginas.push({ numero: p, texto })
  }

  await doc.destroy()
  return paginas
}