import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import qrcode from 'qrcode';

dotenv.config();

// Define types for WhatsApp entities
export interface WhatsappContact {
  id: string; // e.g. "contact_alpha"
  name: string;
  representative: string;
  phone: string;
  description: string;
  category: string;
  initials: string;
  company_id: string;
  created_at?: string;
}

export interface WhatsappConversation {
  id: string; // matches contact_id
  contact_id: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  company_id: string;
  created_at?: string;
}

export interface WhatsappMessage {
  id: string;
  conversation_id: string;
  sender: 'me' | 'supplier'; // 'me' is the user, 'supplier' is the supplier
  content: string;
  timestamp: string; // ISO string or simple hh:mm
  status: 'sent' | 'delivered' | 'read';
  company_id: string;
  created_at?: string;
}

export interface WhatsappStatus {
  status: 'CONNECTED' | 'QR_REQUIRED' | 'INITIALIZING' | 'DISCONNECTED';
  mode: 'REAL' | 'SIMULATOR';
  qrCodeUrl?: string; // QR code base64 data url
  logs: string[];
}

class WhatsappService {
  private status: WhatsappStatus['status'] = 'DISCONNECTED';
  private mode: WhatsappStatus['mode'] = 'SIMULATOR';
  private qrCodeString: string = '';
  private qrCodeUrl: string = '';
  private logs: string[] = ['Serviço de WhatsApp criado.'];
  private client: any = null;
  private dbPath: string = '';
  private supabase: any = null;
  
  // Local active simulations
  private isAutoRespondingMap: Record<string, boolean> = {};

  constructor() {
    this.dbPath = process.env.VERCEL
      ? path.join('/tmp', 'app_db.json')
      : path.join(process.cwd(), 'app_db.json');
  }

  // Log helper
  private addLog(message: string) {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    const logLine = `[${timestamp}] ${message}`;
    console.log(logLine);
    this.logs.unshift(logLine);
    if (this.logs.length > 50) this.logs.pop();
  }

  // Pre-seed contacts if database is empty
  private async getInitialContacts(companyId: string): Promise<WhatsappContact[]> {
    return [
      {
        id: 'contact_alpha',
        name: 'Fornecedor Alpha (Café e Grãos)',
        representative: 'Beto • Grãos & Sourcing',
        phone: '5511987654321',
        description: 'Cafés especiais, açúcar e insumos orgânicos secos.',
        category: 'Grãos e Insumos Secos',
        initials: 'AG',
        company_id: companyId
      },
      {
        id: 'contact_beta',
        name: 'Fornecedor Beta (Copos e Descartáveis)',
        representative: 'Alice • Comercial',
        phone: '5511976543210',
        description: 'Copos personalizados, fardos de embalagens Kraft e apoio.',
        category: 'Materiais de Apoio e Embalagens',
        initials: 'BD',
        company_id: companyId
      },
      {
        id: 'contact_gama',
        name: 'Fornecedor Gama (Leite e Laticínios)',
        representative: 'Carlos • Vendas Corp',
        phone: '5511965432109',
        description: 'UHT integral, cremes frescos e laticínios faturados.',
        category: 'Laticínios e Insumos Frescos',
        initials: 'GL',
        company_id: companyId
      }
    ];
  }

  private async getInitialConversations(companyId: string): Promise<WhatsappConversation[]> {
    return [
      {
        id: 'contact_alpha',
        contact_id: 'contact_alpha',
        last_message: 'Olá! Sou o Beto da Alpha Grãos e Café. Recebemos cotações para sacas de café especial e açúcar refinado com negociação no faturamento. Quando precisar, mande sua lista aqui!',
        last_message_at: new Date().toISOString(),
        unread_count: 0,
        company_id: companyId
      },
      {
        id: 'contact_beta',
        contact_id: 'contact_beta',
        last_message: 'Como vai? Aqui é a Alice da Beta Copos e Descartáveis. Pronta para cotar copos personalizados e embalagens de alta qualidade com o melhor saving da região!',
        last_message_at: new Date(Date.now() - 30 * 60000).toISOString(),
        unread_count: 0,
        company_id: companyId
      },
      {
        id: 'contact_gama',
        contact_id: 'contact_gama',
        last_message: 'Carlos por aqui do Laticínios Gama. Temos leite UHT fresco com vencimento longo para entrega rápida. Mandando a lista fazemos boleto de 28 dias!',
        last_message_at: new Date(Date.now() - 60 * 60000).toISOString(),
        unread_count: 0,
        company_id: companyId
      }
    ];
  }

  private async getInitialMessages(companyId: string): Promise<WhatsappMessage[]> {
    return [
      {
        id: 'msg_alpha_1',
        conversation_id: 'contact_alpha',
        sender: 'supplier',
        content: 'Olá! Sou o Beto da Alpha Grãos e Café. Recebemos cotações para sacas de café especial e açúcar refinado com negociação no faturamento. Quando precisar, mande sua lista aqui!',
        timestamp: new Date().toISOString(),
        status: 'read',
        company_id: companyId
      },
      {
        id: 'msg_beta_1',
        conversation_id: 'contact_beta',
        sender: 'supplier',
        content: 'Como vai? Aqui é a Alice da Beta Copos e Descartáveis. Pronta para cotar copos personalizados e embalagens de alta qualidade com o melhor saving da região!',
        timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
        status: 'read',
        company_id: companyId
      },
      {
        id: 'msg_gama_1',
        conversation_id: 'contact_gama',
        sender: 'supplier',
        content: 'Carlos por aqui do Laticínios Gama. Temos leite UHT fresco com vencimento longo para entrega rápida. Mandando a lista fazemos boleto de 28 dias!',
        timestamp: new Date(Date.now() - 60 * 60000).toISOString(),
        status: 'read',
        company_id: companyId
      }
    ];
  }

  // Read local app_db.json file safely
  private readLocalDb(): any {
    try {
      if (fs.existsSync(this.dbPath)) {
        return JSON.parse(fs.readFileSync(this.dbPath, 'utf8'));
      }
    } catch (e) {
      this.addLog(`Erro ao ler base de dados local: ${(e as Error).message}`);
    }
    return {};
  }

  // Write local app_db.json file safely
  private writeLocalDb(data: any) {
    try {
      fs.writeFileSync(this.dbPath, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
      this.addLog(`Erro ao salvar base de dados local: ${(e as Error).message}`);
    }
  }

  // Get active Supabase client or null
  private getSupabaseClient(): any {
    return this.supabase;
  }

  // Set the instantiated Supabase client
  public setSupabase(supabaseClient: any) {
    this.supabase = supabaseClient;
    this.addLog(`Vinculado cliente do Supabase ao serviço WhatsApp.`);
  }

  // Read/Save with unified dual persistence (Supabase dynamic fallback)
  public async getContacts(companyId: string): Promise<WhatsappContact[]> {
    companyId = companyId || 'c1';
    
    // 1. Try Supabase if active
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('whatsapp_contacts')
          .select('*')
          .eq('company_id', companyId);
        
        if (!error && data && data.length > 0) {
          return data;
        }
        
        // If query returns no data but no error, check if we need to insert seed data
        if (!error && (data === null || data.length === 0)) {
          const seeds = await this.getInitialContacts(companyId);
          await this.supabase.from('whatsapp_contacts').insert(seeds);
          return seeds;
        }
      } catch (err) {
        this.addLog(`Erro Supabase ao obter contatos (usando fallback local): ${(err as Error).message}`);
      }
    }

    // 2. Fallback to app_db.json
    const db = this.readLocalDb();
    if (!db.whatsapp_contacts) {
      db.whatsapp_contacts = await this.getInitialContacts(companyId);
      this.writeLocalDb(db);
    }
    
    return db.whatsapp_contacts.filter((c: any) => c.company_id === companyId);
  }

  public async getConversations(companyId: string): Promise<WhatsappConversation[]> {
    companyId = companyId || 'c1';
    
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('whatsapp_conversations')
          .select('*')
          .eq('company_id', companyId)
          .order('last_message_at', { ascending: false });
        
        if (!error && data && data.length > 0) {
          return data;
        }

        if (!error && (data === null || data.length === 0)) {
          const seeds = await this.getInitialConversations(companyId);
          await this.supabase.from('whatsapp_conversations').insert(seeds);
          return seeds;
        }
      } catch (err) {
        this.addLog(`Erro Supabase ao obter conversas (usando fallback local): ${(err as Error).message}`);
      }
    }

    const db = this.readLocalDb();
    if (!db.whatsapp_conversations) {
      db.whatsapp_conversations = await this.getInitialConversations(companyId);
      this.writeLocalDb(db);
    }
    
    return db.whatsapp_conversations
      .filter((c: any) => c.company_id === companyId)
      .sort((a: any, b: any) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
  }

  public async getMessages(companyId: string): Promise<WhatsappMessage[]> {
    companyId = companyId || 'c1';
    
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('whatsapp_messages')
          .select('*')
          .eq('company_id', companyId)
          .order('timestamp', { ascending: true });
        
        if (!error && data && data.length > 0) {
          return data;
        }

        if (!error && (data === null || data.length === 0)) {
          const seeds = await this.getInitialMessages(companyId);
          await this.supabase.from('whatsapp_messages').insert(seeds);
          return seeds;
        }
      } catch (err) {
        this.addLog(`Erro Supabase ao obter mensagens (usando fallback local): ${(err as Error).message}`);
      }
    }

    const db = this.readLocalDb();
    if (!db.whatsapp_messages) {
      db.whatsapp_messages = await this.getInitialMessages(companyId);
      this.writeLocalDb(db);
    }
    
    return db.whatsapp_messages
      .filter((m: any) => m.company_id === companyId)
      .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  // Insert a new WhatsApp message (and update last_message on conversation)
  public async addMessage(
    companyId: string, 
    conversationId: string, 
    sender: 'me' | 'supplier', 
    content: string
  ): Promise<WhatsappMessage> {
    companyId = companyId || 'c1';
    const messageId = `msg_${Date.now()}`;
    const isoString = new Date().toISOString();

    const newMessage: WhatsappMessage = {
      id: messageId,
      conversation_id: conversationId,
      sender,
      content,
      timestamp: isoString,
      status: sender === 'me' ? 'sent' : 'read',
      company_id: companyId
    };

    // 1. Double Persistence flow
    if (this.supabase) {
      try {
        // Safe insert message
        const { error: msgErr } = await this.supabase
          .from('whatsapp_messages')
          .insert([newMessage]);
        
        // Update/insert conversation state
        const { error: convErr } = await this.supabase
          .from('whatsapp_conversations')
          .upsert({
            id: conversationId,
            contact_id: conversationId,
            last_message: content,
            last_message_at: isoString,
            unread_count: sender === 'supplier' ? 1 : 0,
            company_id: companyId
          });

        if (!msgErr && !convErr) {
          this.addLog(`Mensagem adicionada com sucesso no Supabase.`);
          return newMessage;
        }
      } catch (err) {
        this.addLog(`Erro Supabase ao salvar mensagem (fallback local ativado): ${(err as Error).message}`);
      }
    }

    // 2. Local fallback
    const db = this.readLocalDb();
    if (!db.whatsapp_messages) db.whatsapp_messages = [];
    if (!db.whatsapp_conversations) db.whatsapp_conversations = [];

    db.whatsapp_messages.push(newMessage);

    // Update conversation
    const extConvIdx = db.whatsapp_conversations.findIndex((c: any) => c.id === conversationId);
    if (extConvIdx !== -1) {
      db.whatsapp_conversations[extConvIdx].last_message = content;
      db.whatsapp_conversations[extConvIdx].last_message_at = isoString;
      if (sender === 'supplier') {
        db.whatsapp_conversations[extConvIdx].unread_count = (db.whatsapp_conversations[extConvIdx].unread_count || 0) + 1;
      }
    } else {
      db.whatsapp_conversations.push({
        id: conversationId,
        contact_id: conversationId,
        last_message: content,
        last_message_at: isoString,
        unread_count: sender === 'supplier' ? 1 : 0,
        company_id: companyId
      });
    }

    this.writeLocalDb(db);
    this.addLog(`Mensagem adicionada na base local.`);
    return newMessage;
  }

  // Clear unread counts for a conversation
  public async clearUnreads(companyId: string, conversationId: string) {
    companyId = companyId || 'c1';
    
    if (this.supabase) {
      try {
        await this.supabase
          .from('whatsapp_conversations')
          .update({ unread_count: 0 })
          .eq('id', conversationId);
      } catch (e) {
        // Ignore fallback
      }
    }

    const db = this.readLocalDb();
    if (db.whatsapp_conversations) {
      const idx = db.whatsapp_conversations.findIndex((c: any) => c.id === conversationId);
      if (idx !== -1) {
        db.whatsapp_conversations[idx].unread_count = 0;
        this.writeLocalDb(db);
      }
    }
  }

  // Get current status of the service
  public getStatus(): WhatsappStatus {
    return {
      status: this.status,
      mode: this.mode,
      qrCodeUrl: this.qrCodeUrl || undefined,
      logs: this.logs
    };
  }

  // Manual fast-connection mock trigger (for simulating scan in real-time)
  public async simulateScan() {
    this.addLog("Iniciando simulação de scaneamento de QR Code...");
    this.status = 'INITIALIZING';
    
    setTimeout(() => {
      this.status = 'CONNECTED';
      this.mode = 'SIMULATOR';
      this.qrCodeUrl = '';
      this.qrCodeString = '';
      this.addLog("✅ WhatsApp conectado com sucesso via simulador virtual.");
    }, 1500);
  }

  // Simulate disconnecting
  public async disconnect() {
    this.addLog("Desconectando sessão do WhatsApp...");
    this.status = 'DISCONNECTED';
    this.qrCodeUrl = '';
    this.qrCodeString = '';
    
    // Regenerate QR immediately
    this.generateFakeQr();
  }

  private async generateFakeQr() {
    try {
      this.status = 'QR_REQUIRED';
      const fakeToken = `WWebJS_session_${Math.random().toString(36).substring(7)}`;
      this.qrCodeString = fakeToken;
      this.qrCodeUrl = await qrcode.toDataURL(fakeToken);
      this.addLog(`QR Code virtual gerado para leitura.`);
    } catch (err) {
      this.addLog(`Erro ao gerar QR Code virtual: ${(err as Error).message}`);
    }
  }

  // Main service boot launcher (Safely tries Puppeteer + falls back instantly)
  public async initialize() {
    this.addLog('Iniciando carregamento do WhatsApp Service...');
    
    // Always pre-generate simulated parameters so there is an instant QR code ready
    await this.generateFakeQr();

    // Check if we can import and launch whatsapp-web.js
    try {
      this.addLog('Verificando suporte ao whatsapp-web.js real...');
      
      // Dynamic import to prevent premature crash if modules/puppeteer are incomplete
      const WWebJS = await import('whatsapp-web.js');
      
      if (!WWebJS || !WWebJS.Client) {
        throw new Error('whatsapp-web.js Client export não encontrado.');
      }
      
      this.addLog('Instanciando novo cliente whatsapp-web.js...');
      
      // Try initializing- If Puppeteer crashes on headless flags or missing Chromium libraries,
      // it throws and launches our beautiful simulator mode safely.
      this.client = new WWebJS.Client({
        authStrategy: new WWebJS.LocalAuth({
          dataPath: path.join(process.cwd(), '.wwebjs_auth')
        }),
        puppeteer: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-gpu',
            '--disable-dev-shm-usage',
            '--no-first-run',
            '--no-zygote',
            '--single-process'
          ]
        }
      });

      // Bind events
      this.client.on('qr', async (qr: string) => {
        this.addLog('Real QR Code recebido do whatsapp-web.js.');
        this.status = 'QR_REQUIRED';
        this.mode = 'REAL';
        this.qrCodeString = qr;
        this.qrCodeUrl = await qrcode.toDataURL(qr);
      });

      this.client.on('ready', () => {
        this.addLog('✅ WhatsApp Web Client está PRONTO para envio real!');
        this.status = 'CONNECTED';
        this.mode = 'REAL';
        this.qrCodeUrl = '';
        this.qrCodeString = '';
      });

      this.client.on('authenticated', () => {
        this.addLog('Sessão autenticada pelo whatsapp-web.js.');
      });

      this.client.on('auth_failure', (msg: string) => {
        this.addLog(`Falha na autenticação real do WWebJS: ${msg}`);
        this.status = 'DISCONNECTED';
      });

      this.client.on('disconnected', (reason: string) => {
        this.addLog(`Cliente desconectado: ${reason}`);
        this.status = 'DISCONNECTED';
        this.generateFakeQr();
      });

      // Try running client.initialize()
      this.addLog('Tentando iniciar o processo Puppeteer do WhatsApp...');
      
      // Run asynchronously with a timeout so it never blocks Express startup!
      const initPromise = this.client.initialize();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout na inicialização do Puppeteer')), 6000)
      );

      Promise.race([initPromise, timeoutPromise])
        .then(() => {
          this.addLog('Inicialização do WWebJS real concluída.');
        })
        .catch((err) => {
          this.addLog(`⚠️ Alerta: Processo de WhatsApp real excedeu limite de carregamento. Ativando Modo Simulador Inteligente.`);
          this.mode = 'SIMULATOR';
          this.status = 'QR_REQUIRED'; // Allow virtual code scan
        });

    } catch (e) {
      this.addLog(`⚠️ Não foi possível iniciar o WhatsApp real no servidor local devido à falta de bibliotecas de renderização Chromium ou permissão de Sandbox Linux.`);
      this.addLog(`🔧 Ativando o Simulador Inteligente Integrado. Todos os endpoints funcionam 100% com dados virtuais.`);
      this.mode = 'SIMULATOR';
      this.status = 'QR_REQUIRED';
    }
  }

  // Unified send message function
  public async sendMessage(companyId: string, phone: string, text: string, supplierId: string): Promise<WhatsappMessage> {
    companyId = companyId || 'c1';
    supplierId = supplierId || 'contact_alpha';
    this.addLog(`Solicitação de envio para ${phone}: "${text.substring(0, 40)}..."`);

    // 1. Store in DB
    const savedMsg = await this.addMessage(companyId, supplierId, 'me', text);

    // 2. Try sending via Real WhatsApp Client if CONNECTED & REAL
    if (this.status === 'CONNECTED' && this.mode === 'REAL' && this.client) {
      try {
        const formattedPhone = phone.includes('@c.us') ? phone : `${phone}@c.us`;
        await this.client.sendMessage(formattedPhone, text);
        this.addLog(`Mensagem enviada com sucesso ao WhatsApp real.`);
      } catch (err) {
        this.addLog(`Falha ao disparar mensagem real: ${(err as Error).message}`);
      }
    } else {
      this.addLog(`Simulando envio de mensagem via fila virtual.`);
    }

    // 3. Trigger supplier dynamic auto-response simulation with AI/Context criteria
    this.triggerAutoResponse(companyId, supplierId, text);

    return savedMsg;
  }

  // Supplier Response Simulation Agent
  private triggerAutoResponse(companyId: string, supplierId: string, userMessage: string) {
    if (this.isAutoRespondingMap[supplierId]) return; // Avoid infinite loops

    this.isAutoRespondingMap[supplierId] = true;
    this.addLog(`Iniciando simulação de resposta do Fornecedor para: ${supplierId}`);

    // Dynamic typewriter delays
    setTimeout(async () => {
      try {
        let replyText = 'Entendido!';
        const name = supplierId.toLowerCase();

        if (name.includes('alpha')) {
          if (userMessage.includes('café') || userMessage.includes('saca')) {
            replyText = `Recebido! Beto falando.\n\nFizemos as contas para o seu Café Especial Arábica. Consigo alongar o faturamento para um faturamento esticado de **45 dias**, mantendo a cotação em R$ 265,00 por saca com frete incluso.\n\nIsso joga o seu PMP para cima e melhora muito seu ciclo operacional. Se fechar o Pix agora, fechamos a R$ 251,00/saca. O que acha?`;
          } else {
            replyText = `Olá! Tudo bem? Beto aqui da Alpha. Recebemos o faturamento dos insumos secos. Vou formalizar com o financeiro para podermos faturar para 30 ou 45 dias para facilitar o seu capital de giro. Posso encaminhar?`;
          }
        } else if (name.includes('beta')) {
          if (userMessage.includes('copo') || userMessage.includes('kraft')) {
            replyText = `Alice da Beta Comercial de volta!\n\nTabela ótima para copos personalizados e sacos Kraft. Fechando o seu lote sugerido (40 un) faturado de 15 dias consigo aprovar R$ 143,50 por milhar. \n\nNo Pix hoje faço a R$ 138,00. Despachamos direto do nosso centro de logística amanhã com nota fiscal fiscal normal!`;
          } else {
            replyText = `Tudo bem? Alice por aqui. Cotação de embalagens de apoio recebida. Me avise se deseja faturamento direto em boleto ou desconto à vista no Pix!`;
          }
        } else {
          // Gama
          if (userMessage.includes('leite') || userMessage.includes('lote')) {
            replyText = `Carlos aqui do Laticínios Gama falando.\n\nPara o seu faturamento de Leite UHT Integral, consigo reter a cotação promocional faturada de **R$ 73,50** por caixa faturada para boleto de 28 dias diretos.\n\nEntrega programada para amanhã Cedinho na sua unidade para evitar qualquer risco de ruptura. Deseja fechar?`;
          } else {
            replyText = `Carlos na linha! Recebemos sua lista. Vou aprovar o boleto de 28 dias no seu CNPJ e envio o romaneio de carga para entrega!`;
          }
        }

        // Save reply
        await this.addMessage(companyId, supplierId, 'supplier', replyText);
        this.addLog(`Fornecedor ${supplierId} respondeu com sucesso.`);

      } catch (e) {
        this.addLog(`Falha na resposta automática do fornecedor: ${(e as Error).message}`);
      } finally {
        this.isAutoRespondingMap[supplierId] = false;
      }
    }, 4000); // 4 seconds delay to feel extremely natural!
  }
}

// Export singleton instance
export const whatsappService = new WhatsappService();
