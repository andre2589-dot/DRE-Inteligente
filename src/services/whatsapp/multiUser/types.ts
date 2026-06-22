/**
 * Interfaces e tipos para o sistema Multi-Contas do WhatsApp.
 * Permite que cada usuário ou empresa conecte sua própria sessão com QR Code
 * de forma isolada, persistente e monitorada.
 */

export type SessionState = 'DISCONNECTED' | 'INITIALIZING' | 'QR_READY' | 'CONNECTED' | 'FAILED';

export interface WhatsAppSession {
  sessionId: string;      // Identificador único da sessão (ex: userId ou `${companyId}:${userId}`)
  userId: string;         // Usuário dono da conexão
  companyId: string;      // Empresa vinculada
  status: SessionState;   // Estado atual da conexão
  qrCode?: string;        // URL base64 do QR Code ativo para digitalização
  phone?: string;         // Número de telefone associado após a conexão
  pushname?: string;      // Nome do perfil do WhatsApp conectado
  logs: string[];         // Logs de eventos exclusivos desta sessão
  createdAt: string;      // Data/Hora de criação do registro de sessão
  updatedAt: string;      // Última atualização de status
}

export interface SessionConfig {
  sessionId: string;
  userId: string;
  companyId: string;
  clientId?: string;      // Identificador do cliente no whatsapp-web.js
}

export interface SendMessagePayload {
  sessionId: string;      // Sessão de origem
  toPhone: string;        // Número do destinatário (ex: 5511999999999)
  message: string;        // Corpo do texto da mensagem
}

export interface WhatsAppMessageEvent {
  messageId: string;
  sessionId: string;
  from: string;
  to: string;
  body: string;
  timestamp: string;
  isGroup: boolean;
  fromMe: boolean;
}
