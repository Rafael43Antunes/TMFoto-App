import { criarGroq } from '../src/main/services/ia/fornecedores'

async function main() {
  const groq = criarGroq(process.env.MAIN_VITE_GROQ_API_KEY, 'openai/gpt-oss-120b')

  // Um schema pequeno: queremos { "atletas": [ { "nome": ..., "clube": ... } ] }
  const schema = {
    type: 'object',
    additionalProperties: false,
    required: ['atletas'],
    properties: {
      atletas: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['nome', 'clube'],
          properties: { nome: { type: 'string' }, clube: { type: 'string' } }
        }
      }
    }
  }

  const prompt = `Extrai os atletas desta tabela:
OS | Nº FPP | NOME DO ATLETA | CLUBE
1 | 97343 | Francisca Silva Quiaios | IDV
2 | 100257 | Laura Cunha Bernardes | SCSJV`

  try {
    const resposta = await groq.pedirJSON(prompt, schema)
    console.log('✅ Resposta do Groq:')
    console.log(JSON.stringify(resposta, null, 2))
  } catch (err: any) {
    console.log(`❌ Erro (${err.tipo}): ${err.message}`)
  }
}

main()