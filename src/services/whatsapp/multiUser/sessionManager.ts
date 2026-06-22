import { WhatsAppSession, SessionState, SessionConfig, SendMessagePayload } from './types';

/**
 * Gerenciador de Sessões Multi-Usuário do WhatsApp.
 * Mantém, inicializa e monitora conexões individuais de múltiplos usuários/empresas.
 * Preparado para futura acoplagem com bibliotecas de automação (como whatsapp-web.js).
 */
export class WhatsAppSessionManager {
  private static instance: WhatsAppSessionManager;
  
  // Dicionário de sessões ativas indexadas pelo `sessionId`
  private sessions: Map<string, WhatsAppSession> = new Map();
  
  // Instâncias reais dos clientes WhatsApp (futuro whatsapp-web.js)
  private clients: Map<string, any> = new Map();

  private constructor() {
    console.log('[Multi-User WhatsApp] Session Manager estruturado e pronto.');
  }

  /**
   * Obtém a instância singleton do gerenciador.
   */
  public static getInstance(): WhatsAppSessionManager {
    if (!WhatsAppSessionManager.instance) {
      WhatsAppSessionManager.instance = new WhatsAppSessionManager();
    }
    return WhatsAppSessionManager.instance;
  }

  /**
   * Inicializa uma nova sessão de WhatsApp para o usuário.
   * Cria o objeto de estado e deixa em fase de 'INITIALIZING' aguardando o QR Code.
   */
  public async createSession(config: SessionConfig): Promise<WhatsAppSession> {
    const { sessionId, userId, companyId } = config;
    
    // Se a sessão já existe, retorna ou reconecta
    if (this.sessions.has(sessionId)) {
      const existing = this.sessions.get(sessionId)!;
      this.addLog(sessionId, 'Sessão já existente consultada. Ignorando recriação.');
      return existing;
    }

    const newSession: WhatsAppSession = {
      sessionId,
      userId,
      companyId,
      status: 'INITIALIZING',
      logs: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.sessions.set(sessionId, newSession);
    this.addLog(sessionId, `Sessão inicializada para o usuário ${userId} da empresa ${companyId}.`);
    
    // Aqui no futuro será acoplado o: new Client({ authStrategy: ... })
    // No momento, deixamos a estrutura pronta.
    this.simulateSetup(sessionId);

    return newSession;
  }

  /**
   * Obtém os dados de status de uma sessão específica.
   */
  public getSession(sessionId: string): WhatsAppSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Lista todas as sessões ativas do sistema.
   */
  public getAllSessions(): WhatsAppSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Envia uma mensagem utilizando a sessão conectada de um usuário específico.
   */
  public async sendMessage(payload: SendMessagePayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const { sessionId, toPhone, message } = payload;
    const session = this.sessions.get(sessionId);

    if (!session) {
      return { success: false, error: `Sessão ${sessionId} não encontrada.` };
    }

    if (session.status !== 'CONNECTED') {
      return { success: false, error: `Sessão ${sessionId} não está no estado CONECTADO. Estado atual: ${session.status}` };
    }

    this.addLog(sessionId, `Mensagem enviada para ${toPhone}: "${message.substring(0, 30)}..."`);
    
    // Simulação de entrega
    return {
      success: true,
      messageId: `msg_${Math.random().toString(36).substring(2, 11)}`
    };
  }

  /**
   * Solicita a desconexão ou encerramento de sessão de um usuário.
   */
  public async disconnectSession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    // Remove referências do cliente real
    this.clients.delete(sessionId);
    
    // Atualiza estado local
    session.status = 'DISCONNECTED';
    session.qrCode = undefined;
    session.updatedAt = new Date().toISOString();
    
    this.addLog(sessionId, 'Sessão desconectada via comando do usuário.');
    return true;
  }

  /**
   * Adiciona logs específicos para uma sessão.
   */
  private addLog(sessionId: string, message: string) {
    const session = this.sessions.get(sessionId);
    if (session) {
      const timestamp = new Date().toLocaleTimeString('pt-BR');
      const logLine = `[${timestamp}] ${message}`;
      session.logs.unshift(logLine);
      session.updatedAt = new Date().toISOString();
      
      if (session.logs.length > 30) {
        session.logs.pop();
      }
    }
  }

  /**
   * Auxiliar de simulação do fluxo de setup estrutural.
   */
  private simulateSetup(sessionId: string) {
    setTimeout(() => {
      const session = this.sessions.get(sessionId);
      if (session && session.status === 'INITIALIZING') {
        session.status = 'QR_READY';
        // QR Code fira fútil para mock da imagem de conexão
        session.qrCode = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150" viewBox="0 0 150 150"><rect width="150" height="150" fill="white"/><text x="15" y="80" fill="indigo" font-family="monospace" font-size="20">QR MULTI-USER</text></svg>';
        this.addLog(sessionId, 'QR Code gerado com sucesso. Aguardando a captação do celular do usuário.');
      }
    }, 2000);
  }

  /**
   * Força a simulação da conexão bem sucedida na estrutura (mock para visualização imediata).
   */
  public async simulateScanSuccess(sessionId: string, phone: string = '5511999999999'): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.status = 'CONNECTED';
    session.phone = phone;
    session.pushname = 'Usuário Gestor DRE';
    session.qrCode = undefined;
    this.addLog(sessionId, `QR Code captado com sucesso! Aparelho conectado: ${phone}`);
    return true;
  }
}

export const whatsappSessionManager = WhatsAppSessionManager.getInstance();
