// Regras de "dados em falta" de um pedido, usadas na lista de pedidos e nos formulários.
// Para mudar as regras, só mexes na tabela REGRAS.

export type Campo = 'email' | 'telemovel' | 'caminho' | 'observacoes'

// Que campos cada produto obriga a ter preenchidos.
// "produto" é procurado DENTRO do tipo_pedido (sem maiúsculas), por isso "email" apanha "Email",
// e num pedido com vários produtos ("Email + Estatueta") as regras somam-se.
const REGRAS: { produto: string; campos: Campo[] }[] = [
  { produto: 'email', campos: ['email', 'telemovel', 'caminho'] },
  { produto: 'estatueta', campos: ['email', 'telemovel', 'observacoes'] }
]

// Nome de cada campo nas mensagens ("Falta contacto")
const NOMES: Record<Campo, string> = {
  email: 'email',
  telemovel: 'contacto',
  caminho: 'caminho',
  observacoes: 'observações'
}

export interface DadosPedido {
  tipo_pedido?: string | null
  email?: string | null
  telemovel?: string | null
  caminho_pasta_atleta?: string | null
  observacoes?: string | null
  estado?: string | null
}

export interface ProblemaPedido {
  campo: Campo
  mensagem: string
}

// Campos obrigatórios para este pedido (sem repetidos)
export function camposObrigatorios(tipoPedido?: string | null): Campo[] {
  const tipo = (tipoPedido ?? '').toLowerCase()
  const campos = REGRAS.filter((r) => tipo.includes(r.produto)).flatMap((r) => r.campos)
  return [...new Set(campos)]
}

export function problemasPedido(p: DadosPedido): ProblemaPedido[] {
  if (p.estado === 'concluido') return [] // já foi entregue: não interessa

  // .trim() faz com que um campo só com espaços conte como vazio
  const valores: Record<Campo, string> = {
    email: p.email?.trim() ?? '',
    telemovel: p.telemovel?.trim() ?? '',
    caminho: p.caminho_pasta_atleta?.trim() ?? '',
    observacoes: p.observacoes?.trim() ?? ''
  }

  const problemas: ProblemaPedido[] = []
  for (const campo of camposObrigatorios(p.tipo_pedido)) {
    if (!valores[campo]) {
      problemas.push({ campo, mensagem: `Falta ${NOMES[campo]}` })
    }
  }
  return problemas
}

// Classes Tailwind para um input: vermelho se o campo estiver em falta
export function classeCampo(base: string, emFalta: boolean): string {
  return emFalta ? `${base} !border-red-500 !bg-red-50 dark:!bg-red-500/10` : base
}