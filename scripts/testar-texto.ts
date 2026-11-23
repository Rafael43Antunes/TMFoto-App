import { extrairTextoPdf } from '../src/main/services/ia/textoPdf'

async function main() {
  const caminho = process.argv[2] // o PDF que passas na linha de comandos
  const paginas = await extrairTextoPdf(caminho)

  const total = paginas.reduce((soma, p) => soma + p.texto.length, 0)
  console.log(`${paginas.length} páginas, ${total} caracteres\n`)

  // Mostra as primeiras 15 linhas da página que escolheres (por defeito a 1)
  const numPagina = Number(process.argv[3] ?? 1)
  console.log(`--- Página ${numPagina} ---`)
  console.log(paginas[numPagina - 1].texto.split('\n').slice(0, 15).join('\n'))
}

main()