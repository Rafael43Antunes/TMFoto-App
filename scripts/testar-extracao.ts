import { extrairOrdemSaidaIA } from '../src/main/services/ia/extracaoIA'
import { criarRouter } from '../src/main/services/ia/routerIA'
import { criarGroq, criarOllama } from '../src/main/services/ia/fornecedores'

async function main() {
  const chave = process.env.MAIN_VITE_GROQ_API_KEY
  const pedir = criarRouter([
    [criarGroq(chave, 'openai/gpt-oss-120b'), criarGroq(chave, 'openai/gpt-oss-20b')],
    [criarOllama('qwen3:8b')] // ainda não está instalado: só é usado se o Groq falhar
  ])

  const inicio = Date.now()
  const { escaloes, avisos } = await extrairOrdemSaidaIA(process.argv[2], pedir, (msg) => console.log(`⏳ ${msg}`))

  const total = escaloes.reduce((soma, e) => soma + e.atletas.length, 0)
  console.log(`\n✅ ${escaloes.length} escalões, ${total} atletas, ${((Date.now() - inicio) / 1000).toFixed(0)}s\n`)
  for (const e of escaloes) {
    console.log(`${e.dia.padEnd(28)} ${e.nome.padEnd(50)} ${e.atletas.length}`)
  }
  if (avisos.length) {
    console.log('\n⚠️  Avisos:')
    avisos.forEach((a) => console.log(`   - ${a}`))
  }
}

main().catch((err) => console.log(`❌ ${err.message}`))
