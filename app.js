const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const express = require('express');
const { body, validationResult } = require('express-validator');
const socketIO = require('socket.io');
const qrcode = require('qrcode');
const http = require('http');
const fileUpload = require('express-fileupload');
const axios = require('axios');
const mime = require('mime-types');
const port = process.env.PORT || 8000;
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

function delay(t, v) {
  return new Promise(function(resolve) { 
      setTimeout(resolve.bind(null, v), t)
  });
}

app.use(express.json());
app.use(express.urlencoded({
extended: true
}));
app.use(fileUpload({
debug: true
}));
app.use("/", express.static(__dirname + "/"))

app.get('/', (req, res) => {
  res.sendFile('index.html', {
    root: __dirname
  });
});

const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'bot-zdg' }),
  puppeteer: { headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process', // <- this one doesn't works in Windows
      '--disable-gpu'
    ] }
});

client.initialize();

io.on('connection', function(socket) {
  socket.emit('message', 'PRONTO - Iniciado');
  socket.emit('qr', './icon.svg');

client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
    qrcode.toDataURL(qr, (err, url) => {
      socket.emit('qr', url);
      socket.emit('message', ' QRCode recebido, aponte a câmera  seu celular!');
    });
});

client.on('ready', () => {
    socket.emit('ready', 'Dispositivo pronto!');
    socket.emit('message', 'Dispositivo pronto!');
    socket.emit('qr', './check.svg')	
    console.log('Dispositivo pronto');
});

client.on('authenticated', () => {
    socket.emit('authenticated', 'Autenticado!');
    socket.emit('message', 'Autenticado!');
    console.log('Autenticado');
});

client.on('auth_failure', function() {
    socket.emit('message', 'Falha na autenticação, reiniciando...');
    console.error('Falha na autenticação');
});

client.on('change_state', state => {
  console.log('Status de conexão: ', state );
});

client.on('disconnected', (reason) => {
  socket.emit('message', 'Cliente desconectado!');
  console.log('Cliente desconectado', reason);
  client.initialize();
});
});

// Send message
app.post('/zdg-message', [
  body('number').notEmpty(),
  body('message').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req).formatWith(({
    msg
  }) => {
    return msg;
  });

  if (!errors.isEmpty()) {
    return res.status(422).json({
      status: false,
      message: errors.mapped()
    });
  }

  const number = req.body.number;
  const numberDDI = number.substr(0, 2);
  const numberDDD = number.substr(2, 2);
  const numberUser = number.substr(-8, 8);
  const message = req.body.message;

  if (numberDDI !== "55") {
    const numberZDG = number + "@c.us";
    client.sendMessage(numberZDG, message).then(response => {
    res.status(200).json({
      status: true,
      message: 'BOT-ZDG Mensagem enviada',
      response: response
    });
    }).catch(err => {
    res.status(500).json({
      status: false,
      message: 'Mensagem não enviada',
      response: err.text
    });
    });
  }
  else if (numberDDI === "55" && parseInt(numberDDD) <= 30) {
    const numberZDG = "55" + numberDDD + "9" + numberUser + "@c.us";
    client.sendMessage(numberZDG, message).then(response => {
    res.status(200).json({
      status: true,
      message: 'Mensagem enviada',
      response: response
    });
    }).catch(err => {
    res.status(500).json({
      status: false,
      message: 'Mensagem não enviada',
      response: err.text
    });
    });
  }
  else if (numberDDI === "55" && parseInt(numberDDD) > 30) {
    const numberZDG = "55" + numberDDD + numberUser + "@c.us";
    client.sendMessage(numberZDG, message).then(response => {
    res.status(200).json({
      status: true,
      message: 'Mensagem enviada',
      response: response
    });
    }).catch(err => {
    res.status(500).json({
      status: false,
      message: 'Mensagem não enviada',
      response: err.text
    });
    });
  }
});


// Send media
app.post('/zdg-media', [
  body('number').notEmpty(),
  body('caption').notEmpty(),
  body('file').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req).formatWith(({
    msg
  }) => {
    return msg;
  });

  if (!errors.isEmpty()) {
    return res.status(422).json({
      status: false,
      message: errors.mapped()
    });
  }

  const number = req.body.number;
  const numberDDI = number.substr(0, 2);
  const numberDDD = number.substr(2, 2);
  const numberUser = number.substr(-8, 8);
  const caption = req.body.caption;
  const fileUrl = req.body.file;

  let mimetype;
  const attachment = await axios.get(fileUrl, {
    responseType: 'arraybuffer'
  }).then(response => {
    mimetype = response.headers['content-type'];
    return response.data.toString('base64');
  });

  const media = new MessageMedia(mimetype, attachment, 'Media');

  if (numberDDI !== "55") {
    const numberZDG = number + "@c.us";
    client.sendMessage(numberZDG, media, {caption: caption}).then(response => {
    res.status(200).json({
      status: true,
      message: 'Imagem enviada',
      response: response
    });
    }).catch(err => {
    res.status(500).json({
      status: false,
      message: 'Imagem não enviada',
      response: err.text
    });
    });
  }
  else if (numberDDI === "55" && parseInt(numberDDD) <= 30) {
    const numberZDG = "55" + numberDDD + "9" + numberUser + "@c.us";
    client.sendMessage(numberZDG, media, {caption: caption}).then(response => {
    res.status(200).json({
      status: true,
      message: 'Imagem enviada',
      response: response
    });
    }).catch(err => {
    res.status(500).json({
      status: false,
      message: 'Imagem não enviada',
      response: err.text
    });
    });
  }
  else if (numberDDI === "55" && parseInt(numberDDD) > 30) {
    const numberZDG = "55" + numberDDD + numberUser + "@c.us";
    client.sendMessage(numberZDG, media, {caption: caption}).then(response => {
    res.status(200).json({
      status: true,
      message: 'Imagem enviada',
      response: response
    });
    }).catch(err => {
    res.status(500).json({
      status: false,
      message: 'Imagem não enviada',
      response: err.text
    });
    });
  }
});

client.on('message', async msg => {

  const nomeContato = msg._data.notifyName;
  let groupChat = await msg.getChat();
  
  if (groupChat.isGroup) return null;

  if (msg.type.toLowerCase() == "e2e_notification") return null;
  
  if (msg.body == "") return null;
  
  if (msg.from.includes("@g.us")) return null;

  if (msg.body !== null && msg.body === "1") {
   msg.reply("Na *Comunidade ZDG* você vai integrar APIs, automações com chatbots e sistemas de atendimento multiusuário para whatsapp. Com *scripts para copiar e colar e suporte todos os dias no grupo de alunos*.\n\nhttps://comunidadezdg.com.br/ \n\n*⏱️ As inscrições estão ABERTAS*\n\nAssista o vídeo abaixo e entenda porque tanta gente comum está economizando tempo e ganhando dinheiro explorando a API do WPP, mesmo sem saber nada de programação.\n\n📺 https://www.youtube.com/watch?v=AoRhC_X6p5w")
  } 
  
  else if (msg.body !== null && msg.body === "2") {
    msg.reply("*" + nomeContato + "*, na Comunidade ZDG, você vai:\n\n- Utilizar códigos já testados para automatizar seu atendimento com chatbots no whatsapp\n- Criar e aplicativos para gestão de CRM e plataformas multiusuários para chats de atendimento\n- Aprender integrações com ferramentas e APIs que já foram testadas e aprovadas pela comunidade\n- Curadoria de plugins e ferramentas gratuitas para impulsionar o marketing de conversa no seu negócio\n- Se conectar a mais de 2.000 alunos que também estão estudando e implementando soluções de marketing de conversa\n- Grupo de alunos organizado por tópicos\n- Ter acesso ao meu suporte pessoal todos os dias");
  }
  
  else if (msg.body !== null && msg.body === "3") {
    msg.reply("*" + nomeContato + "*, " + "essas são as principais APIs que a ZDG vai te ensinar a usar com o WhatsApp:\nBaileys, Venom-BOT, WPPConnect, WPPWeb-JS e Cloud API (Api Oficial)\n\n*Essas são as principais integrações que a ZDG vai te ensinar a fazer com o WhatsApp:*\nBubble, WordPress (WooCommerce e Elementor), Botpress, N8N, DialogFlow, ChatWoot e plataformas como Hotmart, Edduz, Monetizze, Rd Station, Mautic, Google Sheets, Active Campaing, entre outras.");
  }
  
  else if (msg.body !== null && msg.body === "4") {

        const contact = await msg.getContact();
        setTimeout(function() {
            msg.reply(`@${contact.number}` + ' seu contato já foi encaminhado para o Desenvolvedor');  
            client.sendMessage('5518991242966@c.us','Contato . https://wa.me/' + `${contact.number}`);
	    //client.sendMessage('5515998566622@c.us',`${contact.number}`);
          },1000 + Math.floor(Math.random() * 1000));
  
  }
  
  else if (msg.body !== null && msg.body === "4") {
    msg.reply("Seu contato já foi encaminhado para o Desenvolvedor");
  }
  
  else if (msg.body !== null && msg.body === "5") {
    //msg.reply("*" + nomeContato + "*, " + "aproveite o conteúdo e aprenda em poucos minutos como colocar sua API de WPP no ar, gratuitamente:\r\n\r\n🎥 https://youtu.be/sF9uJqVfWpg");
    msg.reply("*" + nomeContato + "*, " + "Enviando mensagem:\r\n\r\n🎥 ");
  }
  
  else if (msg.body !== null && msg.body === "7") {
    msg.reply("*" + nomeContato + "*, " + ", que ótimo, vou te enviar alguns videos:\n\n\n" + 
	      "Livro 1: IKIGAI: descubra o propósito de sua vida com o livro de Ken Mogi.📺 https://youtu.be/0xQIoiFsZtY\n" + 
	      "Livro 2: ME POUPE - Nathalia Arcuri.\n\n📺 https://youtu.be/0N_b4zlv044\n "+
	      "Livro 3: DINHEIRO: DOMINE ESSE JOGO - 7 PASSOS PARA A LIBERDADE FINANCEIRA - TONY ROBBINS.\n\n📺 https://youtu.be/XP2ns7TOdIQ\n"+
	      "Livro 4: Um Único Hábito Pode Mudar Sua Vida - Mel Robbins.📺 https://youtu.be/TcJ9vhzDwM4\n");
    //msg.reply("*" + nomeContato + "*, " + ", que ótimo, vou te enviar alguns cases de sucesso:\n\n");
  }

  else if (msg.body !== null && msg.body === "8") {
    msg.reply("😁 Olá,");
  }
  
  else if (msg.body !== null && msg.body === "9") {
    msg.reply("	DO ZERO AO BILHÃO - A HISTÓRIA DE CARLOS WIZARD MARTINS - CRIADOR DA WIZARD:   https://www.youtube.com/watch?v=9_ORI_Grhcw   ");
  } 
  
  else if (msg.body !== null && msg.body === "10") {
    msg.reply(" Resposta a msg valor 10");
  }
  
  else if (msg.body !== null && msg.body === "11") {
    msg.reply(" Resposta a msg valor 11 ");
  }
  
  else if (msg.body !== null && msg.body === "12") {

        const contact = await msg.getContact();
        setTimeout(function() {
            msg.reply(`@${contact.number}` + ' your contact has already been forwarded to Developer');  
            client.sendMessage('5518991242966@c.us','Contato - EN. https://wa.me/' + `${contact.number}`);
	    //client.sendMessage('5518991242966@c.us',`${contact.number}`);
          },1000 + Math.floor(Math.random() * 1000));
  
  }
  
  else if (msg.body !== null && msg.body === "12") {
    msg.reply("Your contact has already been forwarded to Developer");
  }
  
  else if (msg.body !== null && msg.body === "13") {
    msg.reply("Enjoy the content and learn in a few minutes how to put your WPP API online, for free:\r\n\r\n🎥 https://www.youtube.com/watch?v=-848aVrj1Ss");
  }
  
  else if (msg.body !== null && msg.body === "15") {
    msg.reply("*" + nomeContato + "*, " + ", que ótimo, vou te enviar alguns videos:\n\n\n" + 
	      "Livro 1: IKIGAI: descubra o propósito de sua vida com o livro de Ken Mogi.📺 https://youtu.be/0xQIoiFsZtY\n" + 
	      "Livro 2: ME POUPE - Nathalia Arcuri.\n\n📺 https://youtu.be/0N_b4zlv044\n "+
	      "Livro 3: DINHEIRO: DOMINE ESSE JOGO - 7 PASSOS PARA A LIBERDADE FINANCEIRA - TONY ROBBINS.\n\n📺 https://youtu.be/XP2ns7TOdIQ\n"+
	      "Livro 4: Um Único Hábito Pode Mudar Sua Vida - Mel Robbins.📺 https://youtu.be/TcJ9vhzDwM4\n");
  }

  
  else if (msg.body !== null && msg.body === "20") {
        const contact = await msg.getContact();
        setTimeout(function() {
            msg.reply(`@${contact.number}` + ' su contacto ya ha sido reenviado a Pedrinho');  
            client.sendMessage('5518991242966@c.us','Contato- ES. https://wa.me/' + `${contact.number}`);
	    //client.sendMessage('5518991242966@c.us',`${contact.number}`);
          },1000 + Math.floor(Math.random() * 1000));
  }
  
  else if (msg.body !== null && msg.body === "20") {
    msg.reply("Su contacto ya ha sido reenviado a Pedrinho");
  }
  
  else if (msg.body !== null && msg.body === "6"){
    const indice = MessageMedia.fromFilePath('./indice.pdf');
    client.sendMessage(msg.from, indice, {caption: 'Aquecimento 1.0'});
    delay(4500).then(async function() {
      msg.reply("Arquivo PDF");
		});
	  
  }
	else if (msg.body !== null && msg.body === "14"){
    const indic = MessageMedia.fromFilePath('./indice.pdf');
    client.sendMessage(msg.from, indic, {caption: 'Aquecimento 1.0'});
    delay(4500).then(async function() {
		  msg.reply("File PDF");
    });
	}
    else if (msg.body !== null && msg.body === "22"){
    const index = MessageMedia.fromFilePath('./indice.pdf');
    client.sendMessage(msg.from, index, {caption: 'Aquecimento 1.0'});
    delay(4500).then(async function() {
		  msg.reply("Arquivo PDF");
    });
	}
	 else if (msg.body !== null || msg.body === "0" || msg.type === 'ptt' || msg.hasMedia) {
    msg.reply("*Envios automatizados para aquecimento");
    const foto = MessageMedia.fromFilePath('./foto.jpeg');
    client.sendMessage(msg.from, foto)
    delay(3000).then(async function() {
      try{
        const media = MessageMedia.fromFilePath('./audio.ogg');
        client.sendMessage(msg.from, media, {sendAudioAsVoice: true})
        //msg.reply(media, {sendAudioAsVoice: true});
      } catch(e){
        console.log('audio off')
      }
		});
    delay(8000).then(async function() {
      const saudacaoes = ['Olá ' + nomeContato + ', tudo bem?', 'Oi ' + nomeContato + ', como vai você?', 'Opa ' + nomeContato + ', tudo certo?'];
      const saudacao = saudacaoes[Math.floor(Math.random() * saudacaoes.length)];
      msg.reply(saudacao + " Esse é um atendimento automático, e não é monitorado por um humano. " + 
		"Caso queira falar com um atendente, escolha a opção 4. \r\n\r\n" + 
		"Escolha uma das opções abaixo para iniciarmos a nossa conversa: \r\n\r\n" + 
		"*[ 1 ]* - Quero ver como funciona. \r\n"+ 
		"*[ 2 ]* - O que vou receber ao responder? \r\n" + 
		"*[ 3 ]* - Quais tecnologias e ferramentas eu vou aprender na comunidade ZDG? \r\n" + 
		"*[ 4 ]* - Gostaria de falar com o Desenvolvedor, mas obrigado por tentar me ajudar.* \r\n" + 
		"*[ 5 ]* - Quero usar logo esse numero.\r\n" + 
		"*[ 6 ]* - Quero conhecer tudo sobre os livros.\r\n" + 
		"*[ 7 ]* - Gostou dos livros em audio.  \r\n");
		});
    
	}
});

console.log("\n  final ")
console.log("\n FIM\n")
    
server.listen(port, function() {
        console.log('Aplicação rodando na porta *: ' + port + ' . Acesse no link: http://localhost:' + port);
});
