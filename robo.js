const qrcode = require("qrcode-terminal")
const { Client, LocalAuth } = require("whatsapp-web.js")
const fs = require("fs")

console.log("Iniciando bot WhatsApp da Raquel...")

const client = new Client({
  authStrategy: new LocalAuth({
    clientId: "raquel-bot",
  }),
  puppeteer: {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--disable-gpu",
    ],
  },
})

// Arquivos para armazenar dados
const CLIENTES_FILE = "./clientes.json"
const CONVERSAS_FILE = "./conversas.json"
const ATIVACOES_FILE = "./ativacoes.json"

// Inicializar arquivos se não existirem
if (!fs.existsSync(CLIENTES_FILE)) {
  fs.writeFileSync(CLIENTES_FILE, JSON.stringify({}))
}
if (!fs.existsSync(CONVERSAS_FILE)) {
  fs.writeFileSync(CONVERSAS_FILE, JSON.stringify({}))
}
if (!fs.existsSync(ATIVACOES_FILE)) {
  fs.writeFileSync(ATIVACOES_FILE, JSON.stringify({}))
}

// Funções auxiliares
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const getSaudacao = () => {
  const hora = new Date().getHours()
  if (hora >= 5 && hora < 12) return "Bom dia"
  if (hora >= 12 && hora < 18) return "Boa tarde"
  return "Boa noite"
}

const carregarClientes = () => {
  try {
    return JSON.parse(fs.readFileSync(CLIENTES_FILE, "utf8"))
  } catch {
    return {}
  }
}

const salvarClientes = (clientes) => {
  fs.writeFileSync(CLIENTES_FILE, JSON.stringify(clientes, null, 2))
}

const carregarConversas = () => {
  try {
    return JSON.parse(fs.readFileSync(CONVERSAS_FILE, "utf8"))
  } catch {
    return {}
  }
}

const salvarConversas = (conversas) => {
  fs.writeFileSync(CONVERSAS_FILE, JSON.stringify(conversas, null, 2))
}

const cadastrarCliente = (numero, dados) => {
  const clientes = carregarClientes()
  clientes[numero] = { ...dados, dataCadastro: new Date().toISOString() }
  salvarClientes(clientes)
}

const getConversaEstado = (numero) => {
  const conversas = carregarConversas()
  return conversas[numero] || null
}

const setConversaEstado = (numero, estado) => {
  const conversas = carregarConversas()
  conversas[numero] = estado
  salvarConversas(conversas)
}

const limparConversaEstado = (numero) => {
  const conversas = carregarConversas()
  delete conversas[numero]
  salvarConversas(conversas)
}

const isContatoSalvo = async (msg) => {
  try {
    const numero = msg.from

    // Primeiro verifica se o cliente já está cadastrado no sistema
    const clientes = carregarClientes()
    if (clientes[numero]) {
      console.log(`[v0] [CLIENTE CADASTRADO] Encontrado no sistema: ${clientes[numero].nome}`)
      return true
    }

    // Se não está no sistema, verifica se está salvo nos contatos do WhatsApp
    const contact = await msg.getContact()
    const isSalvoWhatsApp = contact.isMyContact || (contact.name && contact.name !== contact.number)

    if (isSalvoWhatsApp) {
      console.log(`[v0] [CONTATO SALVO] Encontrado no WhatsApp: ${contact.name || contact.pushname}`)
    }

    return isSalvoWhatsApp
  } catch (error) {
    console.error("[ERRO] Erro ao verificar contato:", error)
    return false
  }
}

// Funções para gerenciar ativações com período de 24h
const carregarAtivacoes = () => {
  try {
    return JSON.parse(fs.readFileSync(ATIVACOES_FILE, "utf8"))
  } catch {
    return {}
  }
}

const salvarAtivacoes = (ativacoes) => {
  fs.writeFileSync(ATIVACOES_FILE, JSON.stringify(ativacoes, null, 2))
}

const registrarAtivacao = (numero) => {
  const ativacoes = carregarAtivacoes()
  ativacoes[numero] = new Date().getTime()
  salvarAtivacoes(ativacoes)
  console.log(`[v0] [ATIVACAO REGISTRADA] ${numero} em ${new Date().toLocaleString("pt-BR")}`)
}

const verificarPeriodo24h = (numero) => {
  const ativacoes = carregarAtivacoes()
  const ultimaAtivacao = ativacoes[numero]

  if (!ultimaAtivacao) {
    return false // Primeira ativação, permite
  }

  const agora = new Date().getTime()
  const diferenca = agora - ultimaAtivacao
  const horas24 = 24 * 60 * 60 * 1000

  if (diferenca < horas24) {
    const horasRestantes = Math.ceil((horas24 - diferenca) / (60 * 60 * 1000))
    console.log(`[v0] [BLOQUEADO] Período de 24h ativo. Faltam ${horasRestantes}h para nova ativação`)
    return true // Está dentro do período de 24h, bloqueia
  }

  return false // Período expirou, permite
}

// Eventos do cliente WhatsApp
client.on("qr", (qr) => {
  console.log("\n========================================")
  console.log("Escaneie o QR Code abaixo:")
  console.log("========================================\n")
  qrcode.generate(qr, { small: true })
})

client.on("ready", () => {
  console.log("\n========================================")
  console.log("WhatsApp conectado com sucesso!")
  console.log("Bot da Raquel ativo e pronto!")
  console.log("========================================\n")
})

client.on("authenticated", () => {
  console.log("Autenticacao realizada com sucesso!")
})

client.on("auth_failure", (msg) => {
  console.error("Falha na autenticacao:", msg)
})

client.on("disconnected", (reason) => {
  console.log("Desconectado. Motivo:", reason)
})

client.on("message", async (msg) => {
  try {
    console.log(`\n========================================`)
    console.log(`[v0] NOVA MENSAGEM RECEBIDA`)
    console.log(`[v0] De: ${msg.from}`)
    console.log(`[v0] Conteudo: "${msg.body}"`)
    console.log(`[v0] Tipo: ${msg.type}`)
    console.log(`[v0] É do bot?: ${msg.fromMe}`)
    console.log(`========================================`)

    if (msg.fromMe) {
      console.log("[v0] [IGNORADO] Mensagem enviada por mim (bot)")
      return
    }

    if (msg.from.includes("@g.us")) {
      console.log("[v0] [IGNORADO] Mensagem de grupo")
      return
    }

    // A validação de grupo acima já é suficiente para filtrar mensagens não individuais

    const numero = msg.from
    const mensagem = msg.body.toLowerCase().trim()
    const chat = await msg.getChat()

    const contact = await msg.getContact()
    console.log(`[v0] [CONTATO INFO]`)
    console.log(`[v0] Nome: ${contact.name || "sem nome"}`)
    console.log(`[v0] Pushname: ${contact.pushname || "sem pushname"}`)
    console.log(`[v0] isMyContact: ${contact.isMyContact}`)
    console.log(`[v0] Número: ${contact.number}`)

    console.log(`[v0] [INFO] Processando mensagem de: ${numero}`)

    const estadoConversa = getConversaEstado(numero)

    if (estadoConversa) {
      console.log(`[v0] [CONVERSA ATIVA] Estado: ${JSON.stringify(estadoConversa)}`)
      await processarFluxoConversa(msg, chat, numero, estadoConversa)
      return
    }

    const palavrasChave = [
      "oi",
      "olá",
      "ola",
      "dia",
      "tarde",
      "noite",
      "valores",
      "agenda",
      "horario",
      "horário",
      "marcar",
      "agendar",
      "valor",
      "opa",
      "eae",
      "hey",
      "alo",
      "alô",
      "ooi",
      "ooie",
      "oie",
    ]

    let palavraEncontrada = null
    for (const palavra of palavrasChave) {
      const regex = new RegExp(`\\b${palavra}\\b|^${palavra}`, "i")
      if (regex.test(mensagem) || mensagem === palavra || mensagem.startsWith(palavra)) {
        palavraEncontrada = palavra
        console.log(`[v0] [PALAVRA-CHAVE ENCONTRADA] "${palavra}" em "${mensagem}"`)
        break
      }
    }

    if (!palavraEncontrada) {
      console.log(`[v0] [NAO ATIVADO] Nenhuma palavra-chave encontrada em: "${mensagem}"`)
      console.log(`[v0] [DICA] Palavras aceitas: ${palavrasChave.join(", ")}`)
      return
    }

    if (verificarPeriodo24h(numero)) {
      console.log(`[v0] [IGNORADO] Palavra-chave detectada mas período de 24h ainda ativo`)
      return
    }

    console.log(`[v0] ✓ [BOT ATIVADO] Palavra-chave: "${palavraEncontrada}"`)

    registrarAtivacao(numero)

    await chat.sendStateTyping()
    await delay(1500)

    const saudacao = getSaudacao()

    const contatoSalvo = await isContatoSalvo(msg)
    console.log(`[v0] [INFO] Contato salvo no WhatsApp: ${contatoSalvo}`)

    await mostrarMenuInicial(msg, chat, saudacao, contatoSalvo)
  } catch (error) {
    console.error("[v0] [ERRO] Erro ao processar mensagem:", error)
    console.error("[v0] [ERRO] Stack:", error.stack)
  }
})

async function mostrarMenuInicial(msg, chat, saudacao, contatoSalvo) {
  console.log(`[v0] [ENVIANDO] Menu inicial para ${msg.from}`)
  console.log(`[v0] [MODO] ${contatoSalvo ? "Contato Salvo (Menu 1-5)" : "Contato Novo (Cadastro)"}`)
  const numero = msg.from

  if (contatoSalvo) {
    console.log(`[v0] [CONTATO SALVO] Enviando menu principal com opções 1-5`)
    const contact = await msg.getContact()
    const nomeContato = contact.name || contact.pushname || "Cliente"

    await client.sendMessage(
      numero,
      `${saudacao}, ${nomeContato}!\n\nSeja bem-vinda! Sou a assistente virtual da Raquel!\n\n*Como posso te ajudar hoje?*\n\n*Digite o número da opção:*\n\n1 - Falar com a Raquel\n\n2 - Agendar/Cancelar/Alterar horário ou consultar seu próximo agendamento\n\n3 - Ver tabela de valores\n\n4 - Solicitar reparo de unha\n\n5 - Não sabe oq fazer na próxima manutenção? Eu te ajudo!\n\nResponda com o número da sua escolha.`,
    )

    setConversaEstado(numero, { tipo: "menu_principal" })
    console.log(`[v0] [ESTADO SALVO] menu_principal para ${numero}`)
  } else {
    console.log(`[v0] [CONTATO NÃO SALVO] Enviando saudação de cadastro`)
    await client.sendMessage(
      numero,
      `${saudacao}!\n\nSeja bem-vinda! Sou a assistente virtual da Raquel!\n\nVejo que é sua primeira vez por aqui. Que alegria ter você!\n\n*Vou estar fazendo algumas perguntas para agilizar o seu atendimento.*\n\n*Qual é o seu nome completo?*\n\nDigite seu nome para continuar.`,
    )

    setConversaEstado(numero, { tipo: "cadastro", etapa: "nome" })
    console.log(`[v0] [ESTADO SALVO] cadastro (nova cliente) para ${numero}`)
  }
}

async function processarFluxoConversa(msg, chat, numero, estado) {
  const { tipo } = estado

  // Permite voltar ao menu inicial
  if (msg.body.toLowerCase() === "0" || msg.body.toLowerCase() === "voltar") {
    console.log(`[ACAO] Voltando ao menu inicial`)
    await voltarMenuInicial(msg, chat)
    return
  }

  if (tipo === "menu_principal") {
    await processarMenuPrincipal(msg, chat, numero)
    return
  }

  if (tipo === "aguardando_agendamento_valores") {
    await processarRespostaAgendamento(msg, chat, numero)
    return
  }

  if (tipo === "aguardando_foto_reparo") {
    await processarFotoReparo(msg, chat, numero)
    return
  }

  if (tipo === "aguardando_resposta_inspiracao") {
    await processarRespostaInspiracao(msg, chat, numero)
    return
  }

  if (tipo === "cadastro") {
    await processarFluxoCadastro(msg, chat, numero, estado)
    return
  }
}

async function processarMenuPrincipal(msg, chat, numero) {
  const opcao = msg.body.trim()
  console.log(`[MENU PRINCIPAL] Opcao escolhida: ${opcao}`)

  await chat.sendStateTyping()
  await delay(1500)

  switch (opcao) {
    case "1":
      await client.sendMessage(
        msg.from,
        "Falar com a Raquel\n\nVou transferir você para a Raquel. Ela entrará em contato o mais breve possível!\n\nObrigada por entrar em contato!",
      )
      limparConversaEstado(numero)
      break

    case "2":
      await client.sendMessage(
        msg.from,
        "Agendamento/Cancelamento/Alteração\n\nPara agendar, cancelar ou alterar seu horário, acesse nossa plataforma:\n\nhttps://online.maapp.com.br/raquelprustnail\n\nLá você pode fazer tudo sozinha de forma rápida e fácil!\n\nQualquer dúvida, é só chamar!",
      )
      limparConversaEstado(numero)
      break

    case "3":
      await client.sendMessage(
        msg.from,
        "Tabela de Valores\n\nServiços:\n\nAplicação banho de gel - R$ 230,00\n\nEsmaltação em gel (a partir de) - R$ 90,00\n\nAlongamento de unhas - R$ 260,00\n\nManutenção de alongamento e banho de gel (a partir de) - R$ 150,00\n\nReparo de unha (a partir de) - R$ 10,00\n\nAplicação de blindagem - R$ 180,00\n\nManutenção de blindagem (a partir de) - R$ 120,00\n\nEsmaltação pés - R$ 100,00\n\nOs valores podem variar de acordo com o período de manutenção e se há necessidade de reparos.",
      )

      await delay(2000)

      await client.sendMessage(msg.from, "Vamos agendar o seu horário?\n\nhttps://online.maapp.com.br/raquelprustnail")

      limparConversaEstado(numero)
      break

    case "4":
      await client.sendMessage(
        msg.from,
        "Reparo de Unha\n\nPor favor, envie uma foto da unha para que eu possa encaminhar para a Raquel avaliar.\n\nAguardo a foto!\n\nDigite 0 ou voltar para retornar ao menu anterior.",
      )
      setConversaEstado(numero, { tipo: "aguardando_foto_reparo" })
      break

    case "5":
      await client.sendMessage(
        msg.from,
        "Inspiração para Unhas\n\nNão sabe oq fazer na próxima manutenção? Eu te ajudo!\n\nAcesse nosso catálogo completo e confira diversas ideias e referências:\n\nhttps://abrir.link/SCckV\n\nSe precisar de mais ajuda, a Raquel está à disposição para te ajudar a escolher!\n\nQuer conversar com ela? Responda *Sim* ou *Não*.",
      )
      setConversaEstado(numero, { tipo: "aguardando_resposta_inspiracao" })
      break

    case "0":
      await voltarMenuInicial(msg, chat)
      break

    default:
      await client.sendMessage(
        msg.from,
        "Opção inválida. Por favor, digite um número de 1 a 5 para escolher uma opção do menu, ou 0 para voltar.",
      )
      break
  }
}

async function processarRespostaAgendamento(msg, chat, numero) {
  const resposta = msg.body.toLowerCase().trim()

  await chat.sendStateTyping()
  await delay(1500)

  if (resposta.includes("sim")) {
    await client.sendMessage(
      msg.from,
      "Perfeito! Vou redirecionar você para nossa plataforma de agendamento:\n\nhttps://online.maapp.com.br/raquelprustnail\n\nLá você poderá escolher o melhor horário para você!\n\nQualquer dúvida, é só chamar!",
    )
    limparConversaEstado(numero)
  } else if (resposta.includes("não") || resposta.includes("nao")) {
    await client.sendMessage(
      msg.from,
      "Tudo bem! Qualquer dúvida ou quando estiver pronta para agendar, é só me chamar novamente!\n\nEstou sempre por aqui para ajudar!",
    )
    limparConversaEstado(numero)
  } else {
    await client.sendMessage(
      msg.from,
      "Desculpe, não entendi sua resposta. Por favor, digite *Sim* ou *Não*.\n\nVocê gostaria de agendar seu horário?",
    )
  }
}

async function processarFotoReparo(msg, chat, numero) {
  if (msg.hasMedia) {
    await chat.sendStateTyping()
    await delay(1500)
    await client.sendMessage(
      msg.from,
      "Foto recebida! Vou encaminhar para a Raquel e ela entrará em contato para avaliar o reparo. Obrigada!",
    )
    limparConversaEstado(numero)
  } else {
    await client.sendMessage(
      msg.from,
      "Por favor, envie a foto da unha que precisa de reparo.\n\nDigite 0 ou voltar para retornar ao menu anterior.",
    )
  }
}

async function processarRespostaInspiracao(msg, chat, numero) {
  const resposta = msg.body.toLowerCase().trim()

  await chat.sendStateTyping()
  await delay(1500)

  if (resposta.includes("sim")) {
    await client.sendMessage(
      msg.from,
      "Perfeito! Vou transferir você para a Raquel. Ela vai adorar te ajudar a escolher o melhor design!\n\nEla entrará em contato em breve. Obrigada!",
    )
    limparConversaEstado(numero)
  } else if (resposta.includes("não") || resposta.includes("nao")) {
    await client.sendMessage(
      msg.from,
      "Tudo bem! Se mudar de ideia ou precisar de ajuda, é só me chamar novamente!\n\nEstou sempre por aqui!",
    )
    limparConversaEstado(numero)
  } else {
    await client.sendMessage(
      msg.from,
      "Desculpe, não entendi sua resposta. Por favor, digite *Sim* ou *Não*.\n\nVocê quer conversar com a Raquel sobre inspirações?",
    )
  }
}

async function processarFluxoCadastro(msg, chat, numero, estado) {
  const { etapa } = estado

  await chat.sendStateTyping()
  await delay(1500)

  switch (etapa) {
    case "nome":
      estado.nome = msg.body
      estado.etapa = "servico"
      setConversaEstado(numero, estado)
      await client.sendMessage(
        msg.from,
        `Prazer em te conhecer, ${estado.nome}!\n\n*Qual procedimento você tem interesse?*\n\nExemplos: Alongamento, Manutenção, Esmaltação em gel, Banho de gel, Blindagem, Esmaltação pés, etc.\n\nDigite 0 ou voltar para retornar ao menu inicial.`,
      )
      break

    case "servico":
      estado.servico = msg.body
      estado.etapa = "historico"
      setConversaEstado(numero, estado)
      await client.sendMessage(
        msg.from,
        "Perfeito!\n\n*Você já teve outras experiências com manutenção ou alongamento de unhas com outras profissionais?*\n\nResponda: Sim ou Não\n\nDigite 0 ou voltar para retornar ao menu inicial.",
      )
      break

    case "historico":
      const resposta = msg.body.toLowerCase()
      estado.historico = resposta.includes("sim") ? "Sim" : "Não"
      estado.etapa = "foto"
      setConversaEstado(numero, estado)
      await client.sendMessage(
        msg.from,
        "Entendi!\n\n*Por favor, envie uma foto das suas unhas no momento atual.*\n\nIsso ajudará a Raquel a avaliar melhor o serviço que você precisa!\n\nDigite 0 ou voltar para retornar ao menu inicial.",
      )
      break

    case "foto":
      if (msg.hasMedia) {
        cadastrarCliente(numero, {
          nome: estado.nome,
          servico: estado.servico,
          historico: estado.historico,
          temFoto: true,
        })

        await client.sendMessage(
          msg.from,
          `Obrigada, ${estado.nome}!\n\nAgora é só aguardar!\n\nA Raquel vai analisar as informações e responder o mais breve para agendar seu horário.\n\nQualquer dúvida, é só me chamar novamente!\n\nEnquanto isso, acesse nosso catálogo e conheça nosso trabalho.\nhttps://surl.li/dacdhm`,
        )

        limparConversaEstado(numero)
      } else {
        await client.sendMessage(
          msg.from,
          "Por favor, envie a foto das suas unhas para finalizarmos.\n\nDigite 0 ou voltar para retornar ao menu inicial.",
        )
      }
      break
  }
}

async function voltarMenuInicial(msg, chat) {
  const saudacao = getSaudacao()
  limparConversaEstado(msg.from)
  await chat.sendStateTyping()
  await delay(1500)
  const contatoSalvo = await isContatoSalvo(msg)
  await mostrarMenuInicial(msg, chat, saudacao, contatoSalvo)
}

console.log("Inicializando cliente WhatsApp...\n")
client.initialize()