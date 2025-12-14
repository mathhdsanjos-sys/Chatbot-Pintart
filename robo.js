const qrcode = require("qrcode-terminal");
const { Client, LocalAuth } = require("whatsapp-web.js");
const fs = require("fs");

console.log("Iniciando bot WhatsApp da Raquel...");

// Configuração simplificada do cliente
const client = new Client({
  authStrategy: new LocalAuth({
    clientId: "raquel-bot",
    dataPath: "./.wwebjs_auth"
  }),
  puppeteer: {
    headless: "true", // Usa o novo modo headless
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--disable-gpu",
      "--log-level=3" // Reduz logs do Chrome
    ],
    // Deixa o Puppeteer encontrar o Chrome automaticamente
    executablePath: process.env.CHROME_PATH || undefined
  },
  // Configuração da versão web
  webVersionCache: {
    type: 'remote',
    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
  }
});

// Configuração de tempo de resposta
const TEMPO_RESPOSTA = 2000; // 2 segundos em milissegundos

// Verificar e criar diretórios necessários
const dirs = ['./.wwebjs_auth', './data'];
dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`[INFO] Diretório criado: ${dir}`);
  }
});

// Arquivos para armazenar dados
const CLIENTES_FILE = "./data/clientes.json";
const CONVERSAS_FILE = "./data/conversas.json";
const ATIVACOES_FILE = "./data/ativacoes.json";

// Inicializar arquivos se não existirem
const initializeFiles = () => {
  const files = [
    { path: CLIENTES_FILE, default: {} },
    { path: CONVERSAS_FILE, default: {} },
    { path: ATIVACOES_FILE, default: {} }
  ];

  files.forEach(file => {
    if (!fs.existsSync(file.path)) {
      fs.writeFileSync(file.path, JSON.stringify(file.default, null, 2));
      console.log(`[INFO] Arquivo ${file.path} criado`);
    }
  });
};

initializeFiles();

// Funções auxiliares
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Função para simular que a Raquel está digitando
const simularDigitacao = async (chat, tempo = TEMPO_RESPOSTA) => {
  try {
    console.log(`[DIGITANDO] Simulando digitação por ${tempo}ms`);
    await chat.sendStateTyping();
    await delay(tempo);
  } catch (error) {
    console.log(`[ERRO DIGITACAO] ${error.message}`);
    // Se der erro no typing, apenas espera o tempo
    await delay(tempo);
  }
};

const getSaudacao = () => {
  const hora = new Date().getHours();
  if (hora >= 5 && hora < 12) return "Bom dia";
  if (hora >= 12 && hora < 18) return "Boa tarde";
  return "Boa noite";
};

const carregarClientes = () => {
  try {
    const data = fs.readFileSync(CLIENTES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.log(`[ERRO] Erro ao carregar clientes: ${error.message}`);
    return {};
  }
};

const salvarClientes = (clientes) => {
  try {
    fs.writeFileSync(CLIENTES_FILE, JSON.stringify(clientes, null, 2));
  } catch (error) {
    console.log(`[ERRO] Erro ao salvar clientes: ${error.message}`);
  }
};

const carregarConversas = () => {
  try {
    const data = fs.readFileSync(CONVERSAS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.log(`[ERRO] Erro ao carregar conversas: ${error.message}`);
    return {};
  }
};

const salvarConversas = (conversas) => {
  try {
    fs.writeFileSync(CONVERSAS_FILE, JSON.stringify(conversas, null, 2));
  } catch (error) {
    console.log(`[ERRO] Erro ao salvar conversas: ${error.message}`);
  }
};

const cadastrarCliente = (numero, dados) => {
  const clientes = carregarClientes();
  clientes[numero] = { 
    ...dados, 
    dataCadastro: new Date().toISOString(),
    ultimaAtualizacao: new Date().toISOString()
  };
  salvarClientes(clientes);
  console.log(`[CLIENTE CADASTRADO] ${numero} - ${dados.nome}`);
};

const getConversaEstado = (numero) => {
  const conversas = carregarConversas();
  return conversas[numero] || null;
};

const setConversaEstado = (numero, estado) => {
  const conversas = carregarConversas();
  conversas[numero] = { 
    ...estado, 
    timestamp: new Date().toISOString() 
  };
  salvarConversas(conversas);
};

const limparConversaEstado = (numero) => {
  const conversas = carregarConversas();
  delete conversas[numero];
  salvarConversas(conversas);
  console.log(`[ESTADO LIMPO] ${numero}`);
};

const isContatoSalvo = async (msg) => {
  try {
    const contact = await msg.getContact();
    return contact.name && contact.name !== contact.number;
  } catch (error) {
    console.error("[ERRO] Erro ao verificar contato:", error.message);
    return false;
  }
};

// Funções para gerenciar ativações com período de 24h
const carregarAtivacoes = () => {
  try {
    const data = fs.readFileSync(ATIVACOES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.log(`[ERRO] Erro ao carregar ativações: ${error.message}`);
    return {};
  }
};

const salvarAtivacoes = (ativacoes) => {
  try {
    fs.writeFileSync(ATIVACOES_FILE, JSON.stringify(ativacoes, null, 2));
  } catch (error) {
    console.log(`[ERRO] Erro ao salvar ativações: ${error.message}`);
  }
};

const registrarAtivacao = (numero) => {
  const ativacoes = carregarAtivacoes();
  ativacoes[numero] = new Date().getTime();
  salvarAtivacoes(ativacoes);
  console.log(`[ATIVACAO REGISTRADA] ${numero} em ${new Date().toLocaleString("pt-BR")}`);
};

const verificarPeriodo24h = (numero) => {
  const ativacoes = carregarAtivacoes();
  const ultimaAtivacao = ativacoes[numero];

  if (!ultimaAtivacao) {
    return false; // Primeira ativação, permite
  }

  const agora = new Date().getTime();
  const diferenca = agora - ultimaAtivacao;
  const horas24 = 24 * 60 * 60 * 1000;

  if (diferenca < horas24) {
    const horasRestantes = Math.ceil((horas24 - diferenca) / (60 * 60 * 1000));
    console.log(`[BLOQUEADO] ${numero} - Período de 24h ativo. Faltam ${horasRestantes}h para nova ativação`);
    return true; // Está dentro do período de 24h, bloqueia
  }

  return false; // Período expirou, permite
};

// Função para verificar se o usuário quer voltar ao menu
const verificarVoltarMenu = (mensagem) => {
  const msgLower = mensagem.toLowerCase().trim();
  return msgLower === "0" || msgLower === "voltar" || msgLower === "menu";
};

// Função para voltar ao menu anterior
async function voltarMenuAnterior(msg, chat, numero, estado) {
  const saudacao = getSaudacao();
  
  console.log(`[VOLTAR MENU] ${numero} - Estado: ${JSON.stringify(estado)}`);
  
  // Mostra que está digitando por 2 segundos
  await simularDigitacao(chat, TEMPO_RESPOSTA);
  
  // Limpa o estado atual
  limparConversaEstado(numero);
  
  // Sempre volta para o menu inicial (menu principal)
  const contatoSalvo = await isContatoSalvo(msg);
  
  if (contatoSalvo) {
    console.log(`[VOLTANDO] ${numero} - Para menu principal (contato salvo)`);
    const contact = await msg.getContact();
    const nomeContato = contact.name || contact.pushname || "Cliente";
    
    await client.sendMessage(
      msg.from,
      `${saudacao}, ${nomeContato}!\n\nVocê voltou ao menu principal!\n\n*Como posso te ajudar hoje?*\n\n*Digite o número da opção:*\n\n1 - Falar com a Raquel\n\n2 - Agendar/Cancelar/Alterar horário ou consultar seu próximo agendamento\n\n3 - Ver tabela de valores\n\n4 - Solicitar reparo de unha\n\n5 - Inspiração para designs de unhas\n\n*Digite 0, "voltar" ou "menu" para retornar ao menu anterior em qualquer momento.*`
    );
    
    setConversaEstado(numero, { tipo: "menu_principal" });
  } else {
    console.log(`[VOLTANDO] ${numero} - Para cadastro inicial (contato não salvo)`);
    await client.sendMessage(
      msg.from,
      `${saudacao}!\n\nVocê voltou ao início!\n\nVejo que é sua primeira vez por aqui. Que alegria ter você!\n\n*Vou estar fazendo algumas perguntas para agilizar o seu atendimento.*\n\n*Qual é o seu nome completo?*\n\nDigite seu nome para continuar.\n\n*Digite 0, "voltar" ou "menu" para retornar ao menu anterior em qualquer momento.*`
    );
    
    setConversaEstado(numero, { tipo: "cadastro", etapa: "nome" });
  }
}

async function mostrarMenuInicial(msg, chat, saudacao, contatoSalvo) {
  console.log(`[ENVIANDO MENU] ${msg.from} - ${contatoSalvo ? "Contato Salvo" : "Contato Novo"}`);
  const numero = msg.from;

  // Mostra que está digitando por 2 segundos
  await simularDigitacao(chat, TEMPO_RESPOSTA);

  if (contatoSalvo) {
    const contact = await msg.getContact();
    const nomeContato = contact.name || contact.pushname || "Cliente";

    await client.sendMessage(
      numero,
      `${saudacao}, ${nomeContato}!\n\nSeja bem-vinda! Sou a assistente virtual da Raquel!\n\n*Como posso te ajudar hoje?*\n\n*Digite o número da opção:*\n\n1 - Falar com a Raquel\n\n2 - Agendar/Cancelar/Alterar horário ou consultar seu próximo agendamento\n\n3 - Ver tabela de valores\n\n4 - Solicitar reparo de unha\n\n5 - Inspiração para designs de unhas\n\n*Digite 0, "voltar" ou "menu" para retornar ao menu anterior em qualquer momento.*`
    );

    setConversaEstado(numero, { tipo: "menu_principal" });
    console.log(`[ESTADO SALVO] ${numero} - menu_principal`);
  } else {
    await client.sendMessage(
      numero,
      `${saudacao}!\n\nSeja bem-vinda! Sou a assistente virtual da Raquel!\n\nVejo que é sua primeira vez por aqui. Que alegria ter você!\n\n*Vou estar fazendo algumas perguntas para agilizar o seu atendimento.*\n\n*Qual é o seu nome completo?*\n\nDigite seu nome para continuar.\n\n*Digite 0, "voltar" ou "menu" para retornar ao menu anterior em qualquer momento.*`
    );

    setConversaEstado(numero, { tipo: "cadastro", etapa: "nome" });
    console.log(`[ESTADO SALVO] ${numero} - cadastro (nova cliente)`);
  }
}

async function processarMenuPrincipal(msg, chat, numero) {
  const opcao = msg.body.trim();
  console.log(`[MENU PRINCIPAL] ${numero} - Opção: ${opcao}`);

  // Mostra que está digitando por 2 segundos
  await simularDigitacao(chat, TEMPO_RESPOSTA);

  // Verificar se é para voltar
  if (verificarVoltarMenu(opcao.toLowerCase())) {
    console.log(`[VOLTAR] ${numero} - Menu principal`);
    const estado = getConversaEstado(numero);
    await voltarMenuAnterior(msg, chat, numero, estado);
    return;
  }

  switch (opcao) {
    case "1":
      await client.sendMessage(
        msg.from,
        "Falar com a Raquel\n\nVou transferir você para a Raquel. Ela entrará em contato o mais breve possível!\n\nObrigada por entrar em contato!\n\n*Digite 0, \"voltar\" ou \"menu\" para retornar ao menu anterior.*"
      );
      break;

    case "2":
      await client.sendMessage(
        msg.from,
        "Agendamento/Cancelamento/Alteração\n\nPara agendar, cancelar ou alterar seu horário, acesse nossa plataforma:\n\nhttps://online.maapp.com.br/raquelprustnail\n\nLá você pode fazer tudo sozinha de forma rápida e fácil!\n\nQualquer dúvida, é só chamar!\n\n*Digite 0, \"voltar\" ou \"menu\" para retornar ao menu anterior.*"
      );
      break;

    case "3":
      // Primeira mensagem da tabela de valores
      await client.sendMessage(
        msg.from,
        "Tabela de Valores\n\nServiços:\n\nAplicação banho de gel - R$ 230,00\nEsmaltação em gel (a partir de) - R$ 90,00\nAlongamento de unhas - R$ 260,00\nManutenção de alongamento e banho de gel (a partir de) - R$ 150,00\nReparo de unha (a partir de) - R$ 10,00\nAplicação de blindagem - R$ 180,00\nManutenção de blindagem (a partir de) - R$ 120,00\nEsmaltação pés - R$ 100,00\n\nOs valores podem variar de acordo com o período de manutenção e se há necessidade de reparos."
      );

      // Mostra que está digitando a segunda parte
      await simularDigitacao(chat, TEMPO_RESPOSTA);

      // Segunda mensagem com link de agendamento
      await client.sendMessage(
        msg.from,
        "Vamos agendar o seu horário?\n\nhttps://online.maapp.com.br/raquelprustnail\n\n*Digite 0, \"voltar\" ou \"menu\" para retornar ao menu anterior.*"
      );

      setConversaEstado(numero, { tipo: "aguardando_agendamento_valores" });
      break;

    case "4":
      await client.sendMessage(
        msg.from,
        "Reparo de Unha\n\nPor favor, envie uma foto da unha para que eu possa encaminhar para a Raquel avaliar.\n\nAguardo a foto!\n\n*Digite 0, \"voltar\" ou \"menu\" para retornar ao menu anterior.*"
      );
      setConversaEstado(numero, { tipo: "aguardando_foto_reparo" });
      break;

    case "5":
      await client.sendMessage(
        msg.from,
        "Não sabe o que fazer? Tenho algumas inspirações pra você dar uma olhadinha!\n\nhttps://x.gd/8KAiJ\n\n*Digite 0, \"voltar\" ou \"menu\" para retornar ao menu anterior.*"
      );
      break;

    default:
      await client.sendMessage(
        msg.from,
        "Opção inválida. Por favor, digite um número de 1 a 5 para escolher uma opção do menu, ou 0 para voltar.\n\n*Digite 0, \"voltar\" ou \"menu\" para retornar ao menu anterior.*"
      );
      break;
  }
}

async function processarRespostaAgendamento(msg, chat, numero) {
  const resposta = msg.body.toLowerCase().trim();

  // Mostra que está digitando por 2 segundos
  await simularDigitacao(chat, TEMPO_RESPOSTA);

  if (verificarVoltarMenu(resposta)) {
    console.log(`[VOLTAR] ${numero} - Resposta de agendamento`);
    const estado = getConversaEstado(numero);
    await voltarMenuAnterior(msg, chat, numero, estado);
    return;
  }

  if (resposta.includes("sim")) {
    await client.sendMessage(
      msg.from,
      "Perfeito! Vou redirecionar você para nossa plataforma de agendamento:\n\nhttps://online.maapp.com.br/raquelprustnail\n\nLá você poderá escolher o melhor horário para você!\n\nQualquer dúvida, é só chamar!\n\n*Digite 0, \"voltar\" ou \"menu\" para retornar ao menu anterior.*"
    );
  } else if (resposta.includes("não") || resposta.includes("nao")) {
    await client.sendMessage(
      msg.from,
      "Tudo bem! Qualquer dúvida ou quando estiver pronta para agendar, é só me chamar novamente!\n\nEstou sempre por aqui para ajudar!\n\n*Digite 0, \"voltar\" ou \"menu\" para retornar ao menu anterior.*"
    );
  } else {
    await client.sendMessage(
      msg.from,
      "Desculpe, não entendi sua resposta. Por favor, digite *Sim* ou *Não*.\n\nVocê gostaria de agendar seu horário?\n\n*Digite 0, \"voltar\" ou \"menu\" para retornar ao menu anterior.*"
    );
  }
}

async function processarFotoReparo(msg, chat, numero) {
  const mensagem = msg.body.toLowerCase().trim();
  
  // Verificar se quer voltar ANTES de processar a foto
  if (verificarVoltarMenu(mensagem)) {
    console.log(`[VOLTAR] ${numero} - Envio de foto`);
    const estado = getConversaEstado(numero);
    await voltarMenuAnterior(msg, chat, numero, estado);
    return;
  }

  if (msg.hasMedia) {
    // Mostra que está digitando por 2 segundos
    await simularDigitacao(chat, TEMPO_RESPOSTA);
    
    await client.sendMessage(
      msg.from,
      "Foto recebida! Vou encaminhar para a Raquel e ela entrará em contato para avaliar o reparo. Obrigada!\n\n*Digite 0, \"voltar\" ou \"menu\" para retornar ao menu anterior.*"
    );
  } else {
    // Mostra que está digitando por 2 segundos
    await simularDigitacao(chat, TEMPO_RESPOSTA);
    
    await client.sendMessage(
      msg.from,
      "Por favor, envie a foto da unha que precisa de reparo.\n\n*Digite 0, \"voltar\" ou \"menu\" para retornar ao menu anterior.*"
    );
  }
}

async function processarFluxoCadastro(msg, chat, numero, estado) {
  const { etapa } = estado;
  const mensagem = msg.body.toLowerCase().trim();

  // Verificar se quer voltar - DEVE SER O PRIMEIRO
  if (verificarVoltarMenu(mensagem)) {
    console.log(`[VOLTAR CADASTRO] ${numero} - Etapa: ${etapa}`);
    await voltarMenuAnterior(msg, chat, numero, estado);
    return;
  }

  // Mostra que está digitando por 2 segundos
  await simularDigitacao(chat, TEMPO_RESPOSTA);

  switch (etapa) {
    case "nome":
      estado.nome = msg.body; // Mantém o texto original
      estado.etapa = "servico";
      setConversaEstado(numero, estado);
      await client.sendMessage(
        msg.from,
        `Prazer em te conhecer, ${estado.nome}!\n\n*Qual procedimento você tem interesse?*\n\nExemplos: Alongamento, Manutenção, Esmaltação em gel, Banho de gel, Blindagem, Esmaltação pés, etc.\n\n*Digite 0, "voltar" ou "menu" para retornar ao menu anterior.*`
      );
      break;

    case "servico":
      estado.servico = msg.body; // Mantém o texto original
      estado.etapa = "historico";
      setConversaEstado(numero, estado);
      await client.sendMessage(
        msg.from,
        "Perfeito!\n\n*Você já teve outras experiências com manutenção ou alongamento de unhas com outras profissionais?*\n\nResponda: Sim ou Não\n\n*Digite 0, \"voltar\" ou \"menu\" para retornar ao menu anterior.*"
      );
      break;

    case "historico":
      const resposta = mensagem;
      estado.historico = resposta.includes("sim") ? "Sim" : "Não";
      estado.etapa = "foto";
      setConversaEstado(numero, estado);
      await client.sendMessage(
        msg.from,
        "Entendi!\n\n*Por favor, envie uma foto das suas unhas no momento atual.*\n\nIsso ajudará a Raquel a avaliar melhor o serviço que você precisa!\n\n*Digite 0, \"voltar\" ou \"menu\" para retornar ao menu anterior.*"
      );
      break;

    case "foto":
      if (msg.hasMedia) {
        cadastrarCliente(numero, {
          nome: estado.nome,
          servico: estado.servico,
          historico: estado.historico,
          temFoto: true,
        });

        // Mostra que está digitando por 2 segundos antes da mensagem final
        await simularDigitacao(chat, TEMPO_RESPOSTA);

        await client.sendMessage(
          msg.from,
          `Obrigada, ${estado.nome}!\n\nAgora é só aguardar!\n\nA Raquel vai analisar as informações e responder o mais breve para agendar seu horário.\n\nQualquer dúvida, é só me chamar novamente!\n\nEnquanto isso, acesse nosso catálogo e conheça nosso trabalho.\nhttps://surl.li/dacdhm\n\n*Digite 0, \"voltar\" ou \"menu\" para retornar ao menu anterior.*`
        );

        // Só limpa o estado após finalizar cadastro
        limparConversaEstado(numero);
      } else {
        await client.sendMessage(
          msg.from,
          "Por favor, envie a foto das suas unhas para finalizarmos.\n\n*Digite 0, \"voltar\" ou \"menu\" para retornar ao menu anterior.*"
        );
      }
      break;
  }
}

async function processarFluxoConversa(msg, chat, numero, estado) {
  const { tipo } = estado;
  const mensagem = msg.body.toLowerCase().trim();

  console.log(`[PROCESSANDO FLUXO] ${numero} - Tipo: ${tipo}, Mensagem: "${mensagem}"`);

  // Verifica se o usuário quer voltar ao menu - DEVE SER A PRIMEIRA COISA
  if (verificarVoltarMenu(mensagem)) {
    console.log(`[VOLTAR MENU] ${numero} - Usuário solicitou voltar`);
    await voltarMenuAnterior(msg, chat, numero, estado);
    return;
  }

  if (tipo === "menu_principal") {
    await processarMenuPrincipal(msg, chat, numero);
    return;
  }

  if (tipo === "aguardando_agendamento_valores") {
    await processarRespostaAgendamento(msg, chat, numero);
    return;
  }

  if (tipo === "aguardando_foto_reparo") {
    await processarFotoReparo(msg, chat, numero);
    return;
  }

  if (tipo === "cadastro") {
    await processarFluxoCadastro(msg, chat, numero, estado);
    return;
  }
  
  // Estado não reconhecido - limpa e volta ao menu
  console.log(`[ESTADO DESCONHECIDO] ${numero} - ${tipo} - limpando estado`);
  limparConversaEstado(numero);
  const saudacao = getSaudacao();
  const contatoSalvo = await isContatoSalvo(msg);
  await mostrarMenuInicial(msg, chat, saudacao, contatoSalvo);
}

// Eventos do cliente WhatsApp
client.on("qr", (qr) => {
  console.log("\n" + "=".repeat(50));
  console.log("📱 ESCANEIE O QR CODE COM O WHATSAPP NO CELULAR");
  console.log("=".repeat(50) + "\n");
  qrcode.generate(qr, { small: true });
  console.log("\n" + "=".repeat(50));
  console.log("1. Abra o WhatsApp no celular");
  console.log("2. Toque em ⋮ (menu) → Dispositivos conectados");
  console.log("3. Toque em 'Conectar um dispositivo'");
  console.log("4. Escaneie o QR Code acima");
  console.log("=".repeat(50) + "\n");
});

client.on("ready", () => {
  console.log("\n" + "=".repeat(50));
  console.log("✅ WhatsApp conectado com sucesso!");
  console.log("🤖 Bot da Raquel ativo e pronto!");
  console.log("⌛ Tempo de resposta configurado para 2 segundos");
  console.log("📅 " + new Date().toLocaleString("pt-BR"));
  console.log("=".repeat(50) + "\n");
});

client.on("authenticated", () => {
  console.log("✅ Autenticação realizada com sucesso!");
});

client.on("auth_failure", (msg) => {
  console.error("❌ Falha na autenticação:", msg);
});

client.on("disconnected", (reason) => {
  console.log("⚠️  Desconectado. Motivo:", reason);
  console.log("🔄 Reconectando em 5 segundos...");
  setTimeout(() => {
    console.log("🔄 Iniciando reconexão...");
    client.initialize();
  }, 5000);
});

client.on("loading_screen", (percent, message) => {
  console.log(`⏳ Carregando: ${percent}% - ${message}`);
});

client.on("message", async (msg) => {
  try {
    console.log(`\n${"=".repeat(50)}`);
    console.log(`📥 NOVA MENSAGEM DE: ${msg.from}`);
    console.log(`📝 Conteúdo: "${msg.body.substring(0, 100)}${msg.body.length > 100 ? '...' : ''}"`);
    console.log(`${"=".repeat(50)}`);

    if (msg.fromMe) {
      console.log("[IGNORADO] Mensagem enviada pelo bot");
      return;
    }

    if (msg.from.includes("@g.us")) {
      console.log("[IGNORADO] Mensagem de grupo");
      return;
    }

    const numero = msg.from;
    const mensagem = msg.body.toLowerCase().trim();
    const chat = await msg.getChat();

    const estadoConversa = getConversaEstado(numero);

    if (estadoConversa) {
      console.log(`[CONVERSA ATIVA] ${numero} - Estado: ${JSON.stringify(estadoConversa)}`);
      await processarFluxoConversa(msg, chat, numero, estadoConversa);
      return;
    }

    const palavrasChave = [
      "oi", "olá", "ola", "dia", "tarde", "noite",
      "valores", "agenda", "horario", "horário", "marcar", "agendar", "valor",
      "opa", "eae", "hey", "alo", "alô", "ooi", "ooie", "oie",
      "inspiração", "inspiracao", "inspirar", "modelo", "unhas",
      "design", "nail", "nailart", "raquel", "salão", "manicure"
    ];

    let palavraEncontrada = false;
    for (const palavra of palavrasChave) {
      if (mensagem.includes(palavra)) {
        palavraEncontrada = true;
        console.log(`[PALAVRA-CHAVE] "${palavra}" encontrada`);
        break;
      }
    }

    if (!palavraEncontrada) {
      console.log(`[NÃO ATIVADO] Nenhuma palavra-chave encontrada`);
      return;
    }

    if (verificarPeriodo24h(numero)) {
      console.log(`[IGNORADO] Período de 24h ainda ativo`);
      return;
    }

    console.log(`✅ [BOT ATIVADO] Palavra-chave detectada`);

    registrarAtivacao(numero);

    // Mostra que está digitando por 2 segundos
    await simularDigitacao(chat, TEMPO_RESPOSTA);

    const saudacao = getSaudacao();

    const contatoSalvo = await isContatoSalvo(msg);
    console.log(`[INFO] Contato salvo no WhatsApp: ${contatoSalvo}`);

    await mostrarMenuInicial(msg, chat, saudacao, contatoSalvo);
  } catch (error) {
    console.error("❌ [ERRO] Erro ao processar mensagem:", error.message);
  }
});

// Gerenciar encerramento
process.on('SIGINT', async () => {
  console.log('\n\n' + "=".repeat(50));
  console.log('🔄 Encerrando bot...');
  console.log("=".repeat(50) + '\n');
  
  try {
    await client.destroy();
    console.log('✅ Bot encerrado com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao encerrar o bot:', error.message);
  }
  
  process.exit(0);
});

// Verificar dependências
console.log("Verificando dependências...");
console.log(`⏱️  Tempo de resposta configurado: ${TEMPO_RESPOSTA/1000} segundos`);

// Função para tentar inicializar com diferentes configurações
async function iniciarBot() {
  try {
    console.log("Inicializando cliente WhatsApp...");
    await client.initialize();
  } catch (error) {
    console.error("❌ Erro ao inicializar:", error.message);
    console.log("\n💡 Soluções possíveis:");
    console.log("1. Instale o Google Chrome no seu computador");
    console.log("2. Ou execute: npm install puppeteer");
    console.log("3. Ou defina a variável de ambiente CHROME_PATH");
    console.log("\n🔄 Tentando alternativa em 5 segundos...");
    
    setTimeout(async () => {
      try {
        // Tenta com puppeteer-core (já está usando)
        console.log("🔄 Tentando conexão novamente...");
        await client.initialize();
      } catch (error2) {
        console.error("❌ Falha na conexão:", error2.message);
        console.log("\n🎯 Instale o Chrome ou execute:");
        console.log("npm install puppeteer");
        console.log("\n🔄 O bot tentará reconectar automaticamente...");
      }
    }, 5000);
  }
}

iniciarBot();