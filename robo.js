const qrcode = require("qrcode-terminal");
const { Client, LocalAuth } = require("whatsapp-web.js");
const fs = require("fs");

console.log("💅 Iniciando bot WhatsApp da Raquel...");

// Configuração do cliente
const client = new Client({
  authStrategy: new LocalAuth({
    clientId: "raquel-bot",
    dataPath: "./.wwebjs_auth"
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
      "--log-level=3"
    ],
    executablePath: process.env.CHROME_PATH || undefined
  },
  webVersionCache: {
    type: 'remote',
    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1017542676.html'
  }
});

// Configuração de tempo de resposta
const TEMPO_RESPOSTA = 2000;

// Verificar e criar diretórios necessários
const dirs = ['./.wwebjs_auth', './data'];
dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`🌸 Diretório criado: ${dir}`);
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
      console.log(`📁 Arquivo ${file.path} criado`);
    }
  });
};

initializeFiles();

// Funções auxiliares
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Função para simular que a Raquel está digitando
const simularDigitacao = async (chat, tempo = TEMPO_RESPOSTA) => {
  try {
    console.log(`⌨️  Simulando digitação por ${tempo}ms`);
    await chat.sendStateTyping();
    await delay(tempo);
  } catch (error) {
    console.log(`⚠️  ${error.message}`);
    await delay(tempo);
  }
};

const getSaudacao = () => {
  const hora = new Date().getHours();
  if (hora >= 5 && hora < 12) return "☀️  Bom dia";
  if (hora >= 12 && hora < 18) return "🌤️  Boa tarde";
  return "🌙  Boa noite";
};

const carregarClientes = () => {
  try {
    const data = fs.readFileSync(CLIENTES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.log(`❌ Erro ao carregar clientes: ${error.message}`);
    return {};
  }
};

const salvarClientes = (clientes) => {
  try {
    fs.writeFileSync(CLIENTES_FILE, JSON.stringify(clientes, null, 2));
  } catch (error) {
    console.log(`❌ Erro ao salvar clientes: ${error.message}`);
  }
};

const carregarConversas = () => {
  try {
    const data = fs.readFileSync(CONVERSAS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.log(`❌ Erro ao carregar conversas: ${error.message}`);
    return {};
  }
};

const salvarConversas = (conversas) => {
  try {
    fs.writeFileSync(CONVERSAS_FILE, JSON.stringify(conversas, null, 2));
  } catch (error) {
    console.log(`❌ Erro ao salvar conversas: ${error.message}`);
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
  console.log(`👩‍💼 Cliente cadastrado: ${numero} - ${dados.nome}`);
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
  console.log(`🔄 Estado limpo: ${numero}`);
};

// FUNÇÃO CORRIGIDA: isContatoSalvo
const isContatoSalvo = async (msg) => {
  try {
    // Método simplificado e mais confiável
    const chat = await msg.getChat();
    
    // Verifica se é um chat individual (não grupo)
    if (chat.isGroup) return false;
    
    // Tenta obter o contato
    const contact = await chat.getContact();
    
    // Verifica se tem informações de contato
    const isContact = await contact.isContact().catch(() => false);
    
    // Verifica se tem nome personalizado
    const hasName = contact.name && 
                   contact.name.trim() !== '' && 
                   !contact.name.includes('@c.us');
    
    return isContact || hasName;
  } catch (error) {
    console.log("⚠️  Usando fallback para verificação de contato");
    // Fallback seguro: sempre tratar como novo contato
    return false;
  }
};

// Funções para gerenciar ativações
const carregarAtivacoes = () => {
  try {
    const data = fs.readFileSync(ATIVACOES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.log(`❌ Erro ao carregar ativações: ${error.message}`);
    return {};
  }
};

const salvarAtivacoes = (ativacoes) => {
  try {
    fs.writeFileSync(ATIVACOES_FILE, JSON.stringify(ativacoes, null, 2));
  } catch (error) {
    console.log(`❌ Erro ao salvar ativações: ${error.message}`);
  }
};

const registrarAtivacao = (numero) => {
  const ativacoes = carregarAtivacoes();
  ativacoes[numero] = new Date().getTime();
  salvarAtivacoes(ativacoes);
  console.log(`✨ Ativação registrada: ${numero}`);
};

const verificarPeriodo24h = (numero) => {
  const ativacoes = carregarAtivacoes();
  const ultimaAtivacao = ativacoes[numero];

  if (!ultimaAtivacao) {
    return false;
  }

  const agora = new Date().getTime();
  const diferenca = agora - ultimaAtivacao;
  const horas24 = 24 * 60 * 60 * 1000;

  if (diferenca < horas24) {
    const horasRestantes = Math.ceil((horas24 - diferenca) / (60 * 60 * 1000));
    console.log(`⏳ ${numero} - Faltam ${horasRestantes}h para nova ativação`);
    return true;
  }

  return false;
};

// Função para verificar se o usuário quer voltar ao menu
const verificarVoltarMenu = (mensagem) => {
  const msgLower = mensagem.toLowerCase().trim();
  return msgLower === "0" || msgLower === "voltar" || msgLower === "menu";
};

// Função para voltar ao menu anterior
async function voltarMenuAnterior(msg, chat, numero, estado) {
  const saudacao = getSaudacao();
  
  console.log(`↩️  Voltando ao menu: ${numero}`);
  
  await simularDigitacao(chat, TEMPO_RESPOSTA);
  
  limparConversaEstado(numero);
  
  const contatoSalvo = await isContatoSalvo(msg);
  
  if (contatoSalvo) {
    try {
      const contact = await msg.getContact();
      const nomeContato = contact.name || contact.pushname || "Princesa";
      
      await client.sendMessage(
        msg.from,
        `${saudacao}, ${nomeContato}! 💖\n\nVocê voltou ao menu principal!\n\n✨ *Como posso te ajudar hoje?* ✨\n\n*Escolha uma opção:*\n\n💬  *1* - Falar com a Raquel\n\n📅  *2* - Agendar/Cancelar/Alterar horário\n\n💰  *3* - Ver tabela de valores\n\n🔧  *4* - Solicitar reparo de unha\n\n💅  *5* - Inspiração para designs\n\n*Digite 0, "voltar" ou "menu" para voltar.*`
      );
      
      setConversaEstado(numero, { tipo: "menu_principal" });
    } catch (error) {
      // Fallback em caso de erro
      await client.sendMessage(
        msg.from,
        `${saudacao}! 💖\n\nVocê voltou ao menu principal!\n\n✨ *Como posso te ajudar hoje?* ✨\n\n*Escolha uma opção:*\n\n💬  *1* - Falar com a Raquel\n\n📅  *2* - Agendar/Cancelar/Alterar horário\n\n💰  *3* - Ver tabela de valores\n\n🔧  *4* - Solicitar reparo de unha\n\n💅  *5* - Inspiração para designs\n\n*Digite 0, "voltar" ou "menu" para voltar.*`
      );
      setConversaEstado(numero, { tipo: "menu_principal" });
    }
  } else {
    await client.sendMessage(
      msg.from,
      `${saudacao}! ✨\n\nVocê voltou ao início!\n\nQue alegria ter você! 💕\n\n*Vou fazer algumas perguntas para agilizar.*\n\n🌸 *Qual é o seu nome completo?* 🌸\n\nDigite seu nome para continuar.\n\n*Digite 0, "voltar" ou "menu" para voltar.*`
    );
    
    setConversaEstado(numero, { tipo: "cadastro", etapa: "nome" });
  }
}

async function mostrarMenuInicial(msg, chat, saudacao, contatoSalvo) {
  console.log(`📲 Enviando menu: ${msg.from}`);
  const numero = msg.from;

  await simularDigitacao(chat, TEMPO_RESPOSTA);

  if (contatoSalvo) {
    try {
      const contact = await msg.getContact();
      const nomeContato = contact.name || contact.pushname || "Minha Princesa";

      await client.sendMessage(
        numero,
        `${saudacao}, ${nomeContato}! 💕\n\nSeja bem-vinda de volta! Sou a assistente virtual da Raquel! 💅\n\n✨ *Como posso te ajudar hoje?* ✨\n\n*Escolha uma opção:*\n\n💬  *1* - Falar com a Raquel\n\n📅  *2* - Agendar/Cancelar/Alterar horário\n\n💰  *3* - Ver tabela de valores\n\n🔧  *4* - Solicitar reparo de unha\n\n💅  *5* - Inspiração para designs\n\n*Digite 0, "voltar" ou "menu" para voltar.*`
      );

      setConversaEstado(numero, { tipo: "menu_principal" });
      console.log(`💾 Estado salvo: ${numero} - menu_principal`);
    } catch (error) {
      // Fallback para erro
      await client.sendMessage(
        numero,
        `${saudacao}! ✨\n\nSeja bem-vinda! Sou a assistente virtual da Raquel! 💅\n\nQue alegria ter você! 💕\n\n*Vou fazer algumas perguntas para agilizar.*\n\n🌸 *Qual é o seu nome completo?* 🌸\n\nDigite seu nome para continuar.\n\n*Digite 0, "voltar" ou "menu" para voltar.*`
      );
      setConversaEstado(numero, { tipo: "cadastro", etapa: "nome" });
    }
  } else {
    await client.sendMessage(
      numero,
      `${saudacao}! ✨\n\nSeja bem-vinda! Sou a assistente virtual da Raquel! 💅\n\nQue alegria ter você! 💕\n\n*Vou fazer algumas perguntas para agilizar.*\n\n🌸 *Qual é o seu nome completo?* 🌸\n\nDigite seu nome para continuar.\n\n*Digite 0, "voltar" ou "menu" para voltar.*`
    );

    setConversaEstado(numero, { tipo: "cadastro", etapa: "nome" });
    console.log(`💾 Estado salvo: ${numero} - cadastro (nova cliente)`);
  }
}

async function processarMenuPrincipal(msg, chat, numero) {
  const opcao = msg.body.trim();
  console.log(`📋 Menu Principal: ${numero} - Opção: ${opcao}`);

  await simularDigitacao(chat, TEMPO_RESPOSTA);

  if (verificarVoltarMenu(opcao.toLowerCase())) {
    console.log(`↩️  ${numero} - Voltando do menu principal`);
    const estado = getConversaEstado(numero);
    await voltarMenuAnterior(msg, chat, numero, estado);
    return;
  }

  switch (opcao) {
    case "1":
      await client.sendMessage(
        msg.from,
        "💬 *Falar com a Raquel*\n\nVou transferir você para a Raquel! Ela entrará em contato o mais breve possível! ⏱️\n\nObrigada por confiar em nós! 💕\n\n*Digite 0, \"voltar\" ou \"menu\" para voltar.*"
      );
      break;

    case "2":
      await client.sendMessage(
        msg.from,
        "📅 *Agendamento*\n\nPara agendar, cancelar ou alterar seu horário:\n\n🔗 https://online.maapp.com.br/raquelprustnail\n\nLá você pode fazer tudo sozinha! ✨\n\nQualquer dúvida, é só chamar! 💕\n\n*Digite 0, \"voltar\" ou \"menu\" para voltar.*"
      );
      break;

    case "3":
      await client.sendMessage(
        msg.from,
        "💰 *Tabela de Valores* 💰\n\n💅 *Serviços:*\n\n✨ Banho de gel - R$ 230,00\n✨ Esmaltação em gel - R$ 90,00\n✨ Alongamento - R$ 260,00\n✨ Manutenção - R$ 150,00\n✨ Reparo - R$ 10,00\n✨ Blindagem - R$ 180,00\n✨ Manutenção blindagem - R$ 120,00\n✨ Esmaltação pés - R$ 100,00\n\n💡 *Valores podem variar.*"
      );

      await simularDigitacao(chat, TEMPO_RESPOSTA);

      await client.sendMessage(
        msg.from,
        "✨ Vamos agendar o seu horário?\n\n🔗 https://online.maapp.com.br/raquelprustnail\n\n*Digite 0, \"voltar\" ou \"menu\" para voltar.*"
      );

      setConversaEstado(numero, { tipo: "aguardando_agendamento_valores" });
      break;

    case "4":
      await client.sendMessage(
        msg.from,
        "🔧 *Reparo de Unha*\n\nPor favor, envie uma foto da unha para avaliação. 📸\n\nAguardo sua foto! 🤍\n\n*Digite 0, \"voltar\" ou \"menu\" para voltar.*"
      );
      setConversaEstado(numero, { tipo: "aguardando_foto_reparo" });
      break;

    case "5":
      await client.sendMessage(
        msg.from,
        "💅 *Inspirações*\n\nTenho algumas inspirações pra você! ✨\n\n🔗 https://x.gd/8KAiJ\n\n*Digite 0, \"voltar\" ou \"menu\" para voltar.*"
      );
      break;

    default:
      await client.sendMessage(
        msg.from,
        "❌ Opção inválida. Digite um número de 1 a 5.\n\n*Digite 0, \"voltar\" ou \"menu\" para voltar.*"
      );
      break;
  }
}

async function processarRespostaAgendamento(msg, chat, numero) {
  const resposta = msg.body.toLowerCase().trim();

  await simularDigitacao(chat, TEMPO_RESPOSTA);

  if (verificarVoltarMenu(resposta)) {
    console.log(`↩️  ${numero} - Voltando da resposta de agendamento`);
    const estado = getConversaEstado(numero);
    await voltarMenuAnterior(msg, chat, numero, estado);
    return;
  }

  if (resposta.includes("sim")) {
    await client.sendMessage(
      msg.from,
      "✨ Perfeito! Acesse nossa plataforma:\n\n🔗 https://online.maapp.com.br/raquelprustnail\n\nEscolha o melhor horário! 📅\n\nQualquer dúvida, é só chamar! 💕\n\n*Digite 0, \"voltar\" ou \"menu\" para voltar.*"
    );
  } else if (resposta.includes("não") || resposta.includes("nao")) {
    await client.sendMessage(
      msg.from,
      "🤍 Tudo bem! Quando estiver pronta para agendar, é só me chamar!\n\nEstou sempre aqui para ajudar! 💅\n\n*Digite 0, \"voltar\" ou \"menu\" para voltar.*"
    );
  } else {
    await client.sendMessage(
      msg.from,
      "🤔 Desculpe, não entendi. Digite *Sim* ou *Não*.\n\n✨ Você gostaria de agendar?\n\n*Digite 0, \"voltar\" ou \"menu\" para voltar.*"
    );
  }
}

async function processarFotoReparo(msg, chat, numero) {
  const mensagem = msg.body.toLowerCase().trim();
  
  if (verificarVoltarMenu(mensagem)) {
    console.log(`↩️  ${numero} - Voltando do envio de foto`);
    const estado = getConversaEstado(numero);
    await voltarMenuAnterior(msg, chat, numero, estado);
    return;
  }

  if (msg.hasMedia) {
    await simularDigitacao(chat, TEMPO_RESPOSTA);
    
    await client.sendMessage(
      msg.from,
      "📸 Foto recebida! Vou encaminhar para a Raquel. Obrigada! 💕\n\n*Digite 0, \"voltar\" ou \"menu\" para voltar.*"
    );
  } else {
    await simularDigitacao(chat, TEMPO_RESPOSTA);
    
    await client.sendMessage(
      msg.from,
      "📸 Por favor, envie a foto da unha.\n\n*Digite 0, \"voltar\" ou \"menu\" para voltar.*"
    );
  }
}

async function processarFluxoCadastro(msg, chat, numero, estado) {
  const { etapa } = estado;
  const mensagem = msg.body.toLowerCase().trim();

  if (verificarVoltarMenu(mensagem)) {
    console.log(`↩️  ${numero} - Voltando do cadastro`);
    await voltarMenuAnterior(msg, chat, numero, estado);
    return;
  }

  await simularDigitacao(chat, TEMPO_RESPOSTA);

  switch (etapa) {
    case "nome":
      estado.nome = msg.body;
      estado.etapa = "servico";
      setConversaEstado(numero, estado);
      await client.sendMessage(
        msg.from,
        `✨ Prazer, ${estado.nome}! 💕\n\n🌸 *Qual procedimento tem interesse?* 🌸\n\nEx: Alongamento, Manutenção, Esmaltação, etc.\n\n*Digite 0, "voltar" ou "menu" para voltar.*`
      );
      break;

    case "servico":
      estado.servico = msg.body;
      estado.etapa = "historico";
      setConversaEstado(numero, estado);
      await client.sendMessage(
        msg.from,
        "💅 Perfeito!\n\n🌸 *Já fez alongamento antes?* 🌸\n\nResponda: Sim ou Não\n\n*Digite 0, \"voltar\" ou \"menu\" para voltar.*"
      );
      break;

    case "historico":
      const resposta = mensagem;
      estado.historico = resposta.includes("sim") ? "Sim" : "Não";
      estado.etapa = "foto";
      setConversaEstado(numero, estado);
      await client.sendMessage(
        msg.from,
        "✨ Entendi!\n\n📸 *Envie uma foto das suas unhas atuais.* 📸\n\nAjudará na avaliação! 💅\n\n*Digite 0, \"voltar\" ou \"menu\" para voltar.*"
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

        await simularDigitacao(chat, TEMPO_RESPOSTA);

        await client.sendMessage(
          msg.from,
          `🎉 Obrigada, ${estado.nome}! 💕\n\nAgora é só aguardar! ⏱️\n\nA Raquel vai analisar e responder em breve. 📅\n\nConheça nosso trabalho: 💅\n🔗 https://surl.li/dacdhm\n\n*Digite 0, \"voltar\" ou \"menu\" para voltar.*`
        );

        limparConversaEstado(numero);
      } else {
        await client.sendMessage(
          msg.from,
          "📸 Por favor, envie a foto das unhas.\n\n*Digite 0, \"voltar\" ou \"menu\" para voltar.*"
        );
      }
      break;
  }
}

async function processarFluxoConversa(msg, chat, numero, estado) {
  const { tipo } = estado;
  const mensagem = msg.body.toLowerCase().trim();

  console.log(`💭 Processando: ${numero} - Tipo: ${tipo}`);

  if (verificarVoltarMenu(mensagem)) {
    console.log(`↩️  ${numero} - Voltando`);
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
  
  console.log(`❓ ${numero} - Estado desconhecido`);
  limparConversaEstado(numero);
  const saudacao = getSaudacao();
  const contatoSalvo = await isContatoSalvo(msg);
  await mostrarMenuInicial(msg, chat, saudacao, contatoSalvo);
}

// Eventos do cliente WhatsApp
client.on("qr", (qr) => {
  console.log("\n" + "💅".repeat(25));
  console.log("📱 ESCANEIE O QR CODE");
  console.log("💅".repeat(25) + "\n");
  
  // Salva o QR code em arquivo para facilitar acesso remoto
  const qrTextPath = "./qrcode.txt";
  fs.writeFileSync(qrTextPath, qr);
  console.log(`📄 QR code salvo em: ${qrTextPath}`);
  console.log(`💡 Para acessar: scp seu_usuario@ip_da_vps:${qrTextPath} .`);
  
  qrcode.generate(qr, { small: true });
  console.log("\n" + "✨".repeat(25));
  console.log("1. Abra o WhatsApp");
  console.log("2. Menu → Dispositivos conectados");
  console.log("3. 'Conectar um dispositivo'");
  console.log("4. Escaneie o QR Code");
  console.log("✨".repeat(25) + "\n");
});

client.on("ready", () => {
  console.log("\n" + "🌸".repeat(25));
  console.log("✅ WhatsApp conectado!");
  console.log("🤖 Bot da Raquel ativo!");
  console.log("💅 Estilo feminino aplicado");
  console.log("⌛ Tempo: 2 segundos");
  console.log("📅 " + new Date().toLocaleString("pt-BR"));
  console.log("🌸".repeat(25) + "\n");
});

client.on("authenticated", () => {
  console.log("🔐 Autenticado com sucesso!");
});

client.on("auth_failure", (msg) => {
  console.error("❌ Falha na autenticação:", msg);
});

client.on("disconnected", (reason) => {
  console.log("⚠️  Desconectado:", reason);
  console.log("🔄 Reconectando em 5s...");
  setTimeout(() => {
    console.log("💫 Reconectando...");
    client.initialize();
  }, 5000);
});

client.on("loading_screen", (percent, message) => {
  console.log(`⏳ ${percent}% - ${message}`);
});

client.on("message", async (msg) => {
  try {
    console.log(`\n${"💅".repeat(25)}`);
    console.log(`📥 DE: ${msg.from}`);
    console.log(`📝 "${msg.body ? msg.body.substring(0, 50) : '[MÍDIA]'}${msg.body && msg.body.length > 50 ? '...' : ''}"`);
    console.log(`${"💅".repeat(25)}`);

    if (msg.fromMe) return;
    if (msg.from.includes("@g.us")) return;

    const numero = msg.from;
    const mensagem = msg.body ? msg.body.toLowerCase().trim() : '';
    const chat = await msg.getChat();

    const estadoConversa = getConversaEstado(numero);

    if (estadoConversa) {
      await processarFluxoConversa(msg, chat, numero, estadoConversa);
      return;
    }

    const palavrasChave = [
      "oi", "olá", "ola", "dia", "tarde", "noite",
      "valores", "agenda", "horario", "horário", "marcar", "agendar", "valor",
      "inspiração", "inspiracao", "unhas", "design", "nail", "raquel", "manicure"
    ];

    let palavraEncontrada = false;
    for (const palavra of palavrasChave) {
      if (mensagem.includes(palavra)) {
        palavraEncontrada = true;
        break;
      }
    }

    if (!palavraEncontrada && mensagem) return;

    if (verificarPeriodo24h(numero)) {
      console.log(`⏳ ${numero} - Período de 24h ativo`);
      return;
    }

    console.log(`✨ ${numero} - Bot ativado`);

    registrarAtivacao(numero);

    await simularDigitacao(chat, TEMPO_RESPOSTA);

    const saudacao = getSaudacao();
    const contatoSalvo = await isContatoSalvo(msg);

    await mostrarMenuInicial(msg, chat, saudacao, contatoSalvo);
  } catch (error) {
    console.error("❌ Erro no processamento da mensagem:", error.message);
  }
});

// Gerenciar encerramento
process.on('SIGINT', async () => {
  console.log('\n\n' + "🌸".repeat(25));
  console.log('💅 Encerrando bot...');
  console.log("🌸".repeat(25) + '\n');
  
  try {
    await client.destroy();
    console.log('✅ Bot encerrado!');
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
  
  process.exit(0);
});

// Inicialização
console.log("🔍 Inicializando bot da Raquel...");
console.log(`⏱️  Tempo de resposta: ${TEMPO_RESPOSTA/1000}s`);
console.log("💡 Dica: Se não mostrar QR Code, instale o Chrome");

// Função de inicialização
async function iniciarBot() {
  try {
    console.log("💫 Conectando ao WhatsApp...");
    await client.initialize();
  } catch (error) {
    console.error("❌ Erro na inicialização:", error.message);
    console.log("\n🔧 Soluções:");
    console.log("1. Instale o Google Chrome");
    console.log("2. Execute: npm install puppeteer");
    console.log("3. Reinicie o bot");
    
    // Tentar novamente
    setTimeout(async () => {
      console.log("🔄 Tentando novamente...");
      try {
        await client.initialize();
      } catch (err) {
        console.error("❌ Falha crítica:", err.message);
      }
    }, 10000);
  }
}

iniciarBot();
