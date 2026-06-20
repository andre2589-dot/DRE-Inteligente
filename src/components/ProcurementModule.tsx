import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash, 
  Bot, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  DollarSign, 
  Check, 
  Package, 
  RefreshCw, 
  FileText, 
  Send,
  Sparkles,
  Layers,
  ArrowRight,
  Upload,
  MessageSquare,
  Building,
  User,
  Calendar,
  Layers3,
  CheckSquare,
  ShieldCheck,
  ChevronRight,
  History,
  Tag,
  Wifi,
  WifiOff,
  QrCode,
  LogOut
} from 'lucide-react';
import { safeFetchJson } from '../utils/safeFetch';

interface QuoteItem {
  id?: string;
  item_name: string;
  quantity: number;
  supplier_name: string;
  price: number;
  lead_time: number;
  category: 'Grains' | 'Packaging' | 'Dairy' | 'Support';
}

interface RepoItem {
  id: string;
  item_name: string;
  current_stock: number;
  min_stock: number;
  avg_consumption: number;
  lead_time: number;
  expiration_date?: string;
  sales_rate?: string; // e.g., 'Alta demanda', 'Média', 'Baixa'
}

interface ProcurementModuleProps {
  companyId: string;
  userId: string;
  dreContext: any;
  activeSubTab?: 'indicators' | 'quotes' | 'whatsapp';
  onSubTabChange?: (tab: 'indicators' | 'quotes' | 'whatsapp') => void;
}

// Supplier template
interface SupplierContact {
  id: 'alpha' | 'beta' | 'gama';
  name: string;
  representative: string;
  phone: string;
  description: string;
  category: string;
  initials: string;
}

const SUPPLIERS: SupplierContact[] = [
  {
    id: 'alpha',
    name: 'Fornecedor Alpha (Café e Grãos)',
    representative: 'Beto • Grãos & Sourcing',
    phone: '+55 (11) 98765-4321',
    description: 'Cafés especiais, açúcar e insumos orgânicos secos.',
    category: 'Grãos e Insumos Secos',
    initials: 'AG'
  },
  {
    id: 'beta',
    name: 'Fornecedor Beta (Copos e Descartáveis)',
    representative: 'Alice • Comercial',
    phone: '+55 (11) 97654-3210',
    description: 'Copos personalizados, fardos de embalagens Kraft e apoio.',
    category: 'Materiais de Apoio e Embalagens',
    initials: 'BD'
  },
  {
    id: 'gama',
    name: 'Fornecedor Gama (Leite e Laticínios)',
    representative: 'Carlos • Vendas Corp',
    phone: '+55 (11) 96543-2109',
    description: 'UHT integral, cremes frescos e laticínios faturados.',
    category: 'Laticínios e Insumos Frescos',
    initials: 'GL'
  }
];

export default function ProcurementModule({ companyId, userId, dreContext, activeSubTab: propActiveSubTab, onSubTabChange }: ProcurementModuleProps) {
  const [localActiveSubTab, setLocalActiveSubTab] = useState<'indicators' | 'quotes' | 'whatsapp'>('indicators');
  const activeSubTab = propActiveSubTab !== undefined ? propActiveSubTab : localActiveSubTab;
  
  const setActiveSubTab = (tab: 'indicators' | 'quotes' | 'whatsapp') => {
    if (onSubTabChange) {
      onSubTabChange(tab);
    } else {
      setLocalActiveSubTab(tab);
    }
  };

  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Indicators State & Calculations
  const [giroTarget, setGiroTarget] = useState<number>(10.5); // 10.5 rotations per year
  const [pmpSimulated, setPmpSimulated] = useState<number>(18.4); // Prazo Médio de Pagamento em dias
  const [pmrSimulated, setPmrSimulated] = useState<number>(30.0); // Prazo Médio de Recebimento de Clientes em dias

  // 1. Files & Inputs for Quotes AI List Generator
  const [rawProductsList, setRawProductsList] = useState<string>(
    `Café Especial Arábica (Sacas de 60kg)\nCopos Personalizados 350ml (Milhar)\nAçúcar de Confeiteiro (Fardos de 20kg)\nLeite UHT Integral (Caixas de 12L)\nEmbalagens Kraft Take-Away`
  );
  
  const [inputStateFiles, setInputStateFiles] = useState<{
    listaProdutos: { name: string; size: string; status: string } | null;
    estoque: { name: string; size: string; status: string };
    consumo: { name: string; size: string; status: string };
    validades: { name: string; size: string; status: string };
  }>({
    listaProdutos: null,
    estoque: { name: 'estoque_atual_junho_santos.xlsx', size: '14.2 KB', status: 'pre-seeded' },
    consumo: { name: 'historico_consumo_trimestral.csv', size: '32.5 KB', status: 'pre-seeded' },
    validades: { name: 'tabela_precos_e_validades_vigentes.xlsx', size: '19.8 KB', status: 'pre-seeded' }
  });

  const [customCriteria, setCustomCriteria] = useState<string>(
    'Me dê a lista dos itens que vão faltar nos próximos dias junto com os itens que vão vencer e tem venda, para repor estoque.'
  );

  const [isGeneratingList, setIsGeneratingList] = useState(false);
  const [generationSteps, setGenerationSteps] = useState<string[]>([]);
  const [validatedPurchaseList, setValidatedPurchaseList] = useState<any[]>([]);
  const [isListValidated, setIsListValidated] = useState(false);

  // Form to add custom items to recommended list
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemPrice, setNewItemPrice] = useState(0);

  // WhatsApp states
  const [selectedSupplierId, setSelectedSupplierId] = useState<'alpha' | 'beta' | 'gama'>('alpha');
  const [whatsappChats, setWhatsappChats] = useState<{
    alpha: { role: 'user' | 'supplier', content: string, timestamp: string }[];
    beta: { role: 'user' | 'supplier', content: string, timestamp: string }[];
    gama: { role: 'user' | 'supplier', content: string, timestamp: string }[];
  }>({
    alpha: [
      { role: 'supplier', content: 'Olá! Sou o Beto da Alpha Grãos e Café. Recebemos cotações para sacas de café especial e açúcar refinado com negociação no faturamento. Quando precisar, mande sua lista aqui!', timestamp: '09:00' }
    ],
    beta: [
      { role: 'supplier', content: 'Como vai? Aqui é a Alice da Beta Copos e Descartáveis. Pronta para cotar copos personalizados e embalagens de alta qualidade com o melhor saving da região!', timestamp: '09:12' }
    ],
    gama: [
      { role: 'supplier', content: 'Carlos por aqui do Laticínios Gama. Temos leite UHT fresco com vencimento longo para entrega rápida. Mandando a lista fazemos boleto de 28 dias!', timestamp: '09:30' }
    ]
  });

  const [whatsappStatus, setWhatsappStatus] = useState<{
    status: 'CONNECTED' | 'QR_REQUIRED' | 'INITIALIZING' | 'DISCONNECTED';
    mode: 'REAL' | 'SIMULATOR';
    qrCodeUrl?: string;
    logs: string[];
  }>({
    status: 'DISCONNECTED',
    mode: 'SIMULATOR',
    logs: []
  });

  const [isTypingSupplier, setIsTypingSupplier] = useState<boolean>(false);
  const [whatsappInput, setWhatsappInput] = useState<string>('');

  // Sincronizador de dados do WhatsApp no servidor (polling em segundo plano de 2.5 segundos)
  const syncWhatsappData = async () => {
    try {
      const response = await fetch(`/api/whatsapp/messages?companyId=${companyId}`);
      if (response.ok) {
        const data = await response.json();
        
        const nextChats: typeof whatsappChats = {
          alpha: [],
          beta: [],
          gama: []
        };

        if (data.messages && Array.isArray(data.messages)) {
          data.messages.forEach((msg: any) => {
            const rawId = msg.conversation_id;
            const key = rawId === 'contact_alpha' ? 'alpha' :
                        rawId === 'contact_beta' ? 'beta' :
                        rawId === 'contact_gama' ? 'gama' : 'alpha';

            nextChats[key].push({
              role: msg.sender === 'me' ? 'user' : 'supplier',
              content: msg.content,
              timestamp: new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            });
          });
        }

        // Se o array do canal estiver totalmente vazio, insere o seed inicial para manter a experiência
        if (nextChats.alpha.length === 0) {
          nextChats.alpha.push({ role: 'supplier', content: 'Olá! Sou o Beto da Alpha Grãos e Café. Recebemos cotações para sacas de café especial e açúcar refinado com negociação no faturamento. Quando precisar, mande sua lista aqui!', timestamp: '09:00' });
        }
        if (nextChats.beta.length === 0) {
          nextChats.beta.push({ role: 'supplier', content: 'Como vai? Aqui é a Alice da Beta Copos e Descartáveis. Pronta para cotar copos personalizados e embalagens de alta qualidade com o melhor saving da região!', timestamp: '09:12' });
        }
        if (nextChats.gama.length === 0) {
          nextChats.gama.push({ role: 'supplier', content: 'Carlos por aqui do Laticínios Gama. Temos leite UHT fresco com vencimento longo para entrega rápida. Mandando a lista fazemos boleto de 28 dias!', timestamp: '09:30' });
        }

        setWhatsappChats(nextChats);
      }

      // Buscar status da conexão de retaguarda
      const statusRes = await fetch('/api/whatsapp/status');
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setWhatsappStatus(statusData);
      }
    } catch (err) {
      console.warn("Erro ao ler dados em tempo real do WhatsApp do servidor:", err);
    }
  };

  // Inicializar o loop de sincronização ativa
  useEffect(() => {
    syncWhatsappData();
    const timer = setInterval(syncWhatsappData, 2500);
    return () => clearInterval(timer);
  }, [companyId]);

  // Limpar contadores de mensagens não lidas no servidor sempre que trocar de fornecedor visualizado
  useEffect(() => {
    const rawId = selectedSupplierId === 'alpha' ? 'contact_alpha' :
                  selectedSupplierId === 'beta' ? 'contact_beta' : 'contact_gama';
                  
    fetch('/api/whatsapp/clear-unreads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId, conversationId: rawId })
    }).catch(e => console.warn("Erro ao resetar unread count no servidor:", e));
  }, [selectedSupplierId, companyId]);

  // Default preselected recommended list generated initially to guarantee a robust landing
  useEffect(() => {
    // Set a default recommended list so there is immediate content to audit or send
    setValidatedPurchaseList([
      { id: 'rec_1', item_name: 'Café Especial Torrado (Saca 60kg)', current_stock: 4, runout_days: 6, expiration: 'Vence em 45 dias', sales_rate: 'Alta demanda (CMV ideal)', suggested_qty: 15, last_price: 285.00 },
      { id: 'rec_2', item_name: 'Copos Personalizados 350ml (Milhar)', current_stock: 45, runout_days: 8, expiration: 'Seguro (>90 dias)', sales_rate: 'Média constante', suggested_qty: 40, last_price: 150.00 },
      { id: 'rec_3', item_name: 'Açúcar de Confeiteiro (Fardos 20kg)', current_stock: 15, runout_days: 30, expiration: 'Vence em 12 dias', sales_rate: 'Alta (Venda de doces)', suggested_qty: 10, last_price: 52.00 },
      { id: 'rec_4', item_name: 'Leite UHT Integral (Caixas de 12L)', current_stock: 35, runout_days: 5, expiration: 'Vence em 14 dias', sales_rate: 'Alta (Espresso/Capuccino)', suggested_qty: 35, last_price: 76.50 },
      { id: 'rec_5', item_name: 'Embalagens Kraft Take-Away (Fardo)', current_stock: 250, runout_days: 4, expiration: 'Seguro', sales_rate: 'Crescente delivery', suggested_qty: 12, last_price: 185.00 }
    ]);
  }, [companyId]);

  // Handle fake file uploads
  const triggerFakeUpload = (fileType: 'listaProdutos' | 'estoque' | 'consumo' | 'validades', e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setInputStateFiles(prev => ({
        ...prev,
        [fileType]: {
          name: file.name,
          size: `${(file.size / 1024).toFixed(1)} KB`,
          status: 'uploaded'
        }
      }));
      
      if (fileType === 'listaProdutos') {
        setRawProductsList((prev) => 
          prev + `\n\n[Arquivo importado: ${file.name} (${(file.size / 1024).toFixed(1)} KB)]\n` + 
          `- Café Blend Premium Moído (Fardos de 10kg)\n` +
          `- Copos Kraft biodegradáveis 300ml\n` +
          `- Canudos de Papel Sachê`
        );
      }
      
      // Toast message simulated
      setSaveStatus(`Arquivo '${file.name}' carregado e integrado com sucesso!`);
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  // Generate recommendation list using AI criteria
  const handleGenerateAiPurchaseList = () => {
    setIsGeneratingList(true);
    setGenerationSteps([]);
    setIsListValidated(false);

    const steps = [
      `🔍 Lendo lista de produtos informada (${inputStateFiles.listaProdutos ? 'Arquivo anexado: ' + inputStateFiles.listaProdutos.name : 'Lista de texto direto'})...`,
      `📊 Lendo arquivo de estoque atual: '${inputStateFiles.estoque.name}' (${inputStateFiles.estoque.size}). Encontrado 142 itens catalogados.`,
      `📈 Cruzando com o arquivo de consumo mensal histórico: '${inputStateFiles.consumo.name}' para projetar cobertura diária de dias.`,
      `🗓️ Auditando lotes de vencimentos e últimos preços médios pagos via: '${inputStateFiles.validades.name}'.`,
      `🤖 Aplicando filtro inteligente solicitado: "${customCriteria}"...`,
      '💡 Otimizando lote econômico de compras para mitigar CMB faturado curto e maximizar saving de fornecedores.',
      '🚀 Geração concluída! Exibindo lista recomendada customizada com risco de ruptura mitigado.'
    ];

    let delay = 0;
    steps.forEach((step, idx) => {
      setTimeout(() => {
        setGenerationSteps(prev => [...prev, step]);
        if (idx === steps.length - 1) {
          setIsGeneratingList(false);
          
          // Generate customized outputs matching the criteria!
          const generated = [
            { id: 'ai_1', item_name: 'Café Especial Torrado (Saca 60kg)', current_stock: 4, runout_days: 6, expiration: 'Sem vencimento crítico (Lote novo)', sales_rate: 'Crítico • Giro Máximo', suggested_qty: 20, last_price: 280.00 },
            { id: 'ai_2', item_name: 'Copos Personalizados 350ml (Milhar)', current_stock: 12, runout_days: 3, expiration: 'Seguro (>120 dias)', sales_rate: 'Alta Demanda', suggested_qty: 50, last_price: 145.00 },
            { id: 'ai_3', item_name: 'Açúcar de Confeiteiro (Fardos 20kg)', current_stock: 3, runout_days: 5, expiration: 'Vence em 10 dias (Urgente usar)', sales_rate: 'Giro de Balcão Ativo', suggested_qty: 15, last_price: 50.00 },
            { id: 'ai_4', item_name: 'Leite UHT Integral (Caixas de 12L)', current_stock: 8, runout_days: 2, expiration: 'Vence em 15 dias (Necessita reposição)', sales_rate: 'Crítico • Consumo Espresso', suggested_qty: 45, last_price: 74.00 },
            { id: 'ai_5', item_name: 'Embalagens Kraft Take-Away (Fardo)', current_stock: 40, runout_days: 4, expiration: 'Seguro', sales_rate: 'Giro Constante', suggested_qty: 15, last_price: 180.00 }
          ];
          setValidatedPurchaseList(generated);
          
          setSaveStatus('Nova lista recomendada gerada pela IA de acordo com os arquivos anexados!');
          setTimeout(() => setSaveStatus(null), 4000);
        }
      }, delay);
      delay += 800; // staggered delay
    });
  };

  // Live edits inside purchase list table
  const handleUpdateQty = (id: string, newQty: number) => {
    if (newQty < 0) return;
    setValidatedPurchaseList(prev => 
      prev.map(item => item.id === id ? { ...item, suggested_qty: newQty } : item)
    );
  };

  const handleUpdatePrice = (id: string, newPrice: number) => {
    if (newPrice < 0) return;
    setValidatedPurchaseList(prev => 
      prev.map(item => item.id === id ? { ...item, last_price: newPrice } : item)
    );
  };

  const handleDeleteItem = (id: string) => {
    setValidatedPurchaseList(prev => prev.filter(item => item.id !== id));
  };

  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || newItemQty <= 0) return;
    
    const newItem = {
      id: `add_${Date.now()}`,
      item_name: newItemName,
      current_stock: 0,
      runout_days: 99,
      expiration: 'Seguro',
      sales_rate: 'Manualmente inserido',
      suggested_qty: newItemQty,
      last_price: newItemPrice || 10.00
    };

    setValidatedPurchaseList(prev => [...prev, newItem]);
    setNewItemName('');
    setNewItemQty(1);
    setNewItemPrice(0);
  };

  // Validate and submit list
  const handleValidateList = () => {
    setIsListValidated(true);
    setSaveStatus('Sucesso: Sua lista de compras foi validada e disponibilizada para envio aos fornecedores registrados!');
    setTimeout(() => {
      setSaveStatus(null);
      // Automatically navigate to whatsapp tab to let user coordinate dispatch
      setActiveSubTab('whatsapp');
    }, 2500);
  };

  // Outgoing Chat Handler - Envia real para o back-end via API
  const handleSendWhatsappMessage = async (e?: React.FormEvent, directText?: string) => {
    if (e) e.preventDefault();
    const textToSend = directText || whatsappInput;
    if (!textToSend.trim()) return;

    if (!directText) setWhatsappInput('');

    // Exibir digitando temporariamente para simular lag comercial natural do fornecedor
    setIsTypingSupplier(true);

    const destSupplierId = selectedSupplierId === 'alpha' ? 'contact_alpha' :
                           selectedSupplierId === 'beta' ? 'contact_beta' : 'contact_gama';

    const supObj = SUPPLIERS.find(s => s.id === selectedSupplierId) || SUPPLIERS[0];
    const sanitizedPhone = supObj.phone.replace(/\D/g, '');

    try {
      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          companyId,
          phone: sanitizedPhone,
          text: textToSend,
          supplierId: destSupplierId
        })
      });

      if (response.ok) {
        // Recarregar mensagens imediatamente
        await syncWhatsappData();
      } else {
        console.error("Erro retornado pelo servidor ao enviar mensagem.");
      }
    } catch (err) {
      console.error("Erro de rede ao despachar mensagem pelo whatsapp:", err);
    } finally {
      // Pequeno lag animado para indicar processamento
      setTimeout(() => {
        setIsTypingSupplier(false);
      }, 1000);
    }
  };

  // Pre-load formatted purchase list to WhatsApp field
  const handlePreloadWhatsAppList = () => {
    // Compile items assigned to this supplier filter:
    const filteredItems = validatedPurchaseList.filter(item => {
      const name = item.item_name.toLowerCase();
      if (selectedSupplierId === 'alpha') {
        return name.includes('café') || name.includes('açúcar') || name.includes('grão');
      } else if (selectedSupplierId === 'beta') {
        return name.includes('copo') || name.includes('embalagem') || name.includes('kraft');
      } else if (selectedSupplierId === 'gama') {
        return name.includes('leite') || name.includes('lata') || name.includes('laticínio');
      }
      return true;
    });

    const targetList = filteredItems.length > 0 ? filteredItems : validatedPurchaseList;

    let text = `*SOLICITAÇÃO DE COTAÇÃO INTELIGENTE – ${dreContext?.companyName || 'DRE Inteligente Corp'}*\n`;
    text += `Olá, gostaria de formalizar a cotação faturada para reposição do seguinte lote de insumos:\n\n`;
    
    targetList.forEach(item => {
      text += `• *${item.item_name}* - Qtd: *${item.suggested_qty}* un (Preço habitual: R$ ${item.last_price.toFixed(2)})\n`;
    });

    text += `\nSolicito validação de faturamento comercial focado em faturamento alongado (PMP ideal) ou condições de saving à vista. No aguardo!`;
    
    setWhatsappInput(text);
  };

  const calculatedTotalSpend = validatedPurchaseList.reduce((acc, item) => acc + (item.suggested_qty * item.last_price), 0);
  const calculatedTotalSaving = calculatedTotalSpend * 0.142; // Simulated savings target (avg 14.2%)

  // Recalculating Dynamic Metrics in Real Time base on interactive sliders
  const pmeCalculated = Math.max(10, Math.round(365 / Math.max(1, giroTarget)));
  const cicloOperacionalCalculated = Math.round(pmeCalculated + pmrSimulated);
  
  return (
    <div className="space-y-6">
      
      {/* Compra Inteligente Header / Concept intro */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 relative overflow-hidden shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/25 text-emerald-300 text-[10px] font-black uppercase tracking-wider font-mono">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
              Gestão de Procurement Ativa
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-white leading-tight">
              Compra Inteligente & Sourcing Integrado
            </h1>
            <p className="text-sm text-slate-300 font-sans leading-relaxed">
              Evite rupturas de estoque, maximize o saving negociado de fornecedores e controle o caixa da empresa cruzando o giro de estoque operacional com o Prazo Médio de Pagamento (PMP).
            </p>
          </div>
          
          <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-4 shrink-0 grid grid-cols-2 gap-4 divide-x divide-white/10 font-mono">
            <div className="text-center px-2">
              <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Saving Projetado</span>
              <span className="text-sm font-black text-emerald-400 block mt-1">~14.2%</span>
            </div>
            <div className="text-center pl-4 pr-2">
              <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Ciclo Operacional</span>
              <span className="text-sm font-black text-indigo-300 block mt-1">{cicloOperacionalCalculated} dias</span>
            </div>
          </div>
        </div>

        {/* Dynamic sub navigation tabs inside Procurement Module */}
        <div className="flex flex-wrap gap-2 mt-6 pt-5 border-t border-white/10">
          <button
            onClick={() => setActiveSubTab('indicators')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'indicators'
                ? 'bg-emerald-600 text-white shadow-lg'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
          >
            <Layers3 className="h-4 w-4 shrink-0" />
            Página de Indicadores
          </button>

          <button
            onClick={() => setActiveSubTab('quotes')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'quotes'
                ? 'bg-emerald-600 text-white shadow-lg'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
          >
            <Bot className="h-4 w-4 shrink-0" />
            Cotações Inteligentes (IA)
          </button>

          <button
            onClick={() => setActiveSubTab('whatsapp')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'whatsapp'
                ? 'bg-emerald-600 text-white shadow-lg'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
          >
            <MessageSquare className="h-4 w-4 shrink-0" />
            Zap de Fornecedores {isListValidated && <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />}
          </button>
        </div>
      </div>

      {saveStatus && (
        <div className="bg-emerald-50 border border-emerald-150 p-4 rounded-2xl text-xs text-emerald-800 flex items-center gap-3.5 font-bold animate-fade-in shadow-xs">
          <div className="bg-emerald-550 text-white p-1 rounded-lg">
            <Check className="h-4 w-4" />
          </div>
          <span>{saveStatus}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* PAGE 1: PÁGINA DE INDICADORES (ESTOQUE E COMPRAS)           */}
      {/* ========================================================= */}
      {activeSubTab === 'indicators' && (
        <div className="space-y-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* COLUMN 1: ESTOQUE METRICS (8 Cols) */}
            <div className="lg:col-span-8 bg-white border border-slate-100 rounded-3xl p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Métricas de Estoque & Ciclo Operacional</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Visão analítica de giro de café, copos e insumos contra o ciclo financeiro corporativo.</p>
                </div>
                <span className="p-2 bg-emerald-50 rounded-xl text-emerald-600"><Package className="h-5 w-5" /></span>
              </div>

              {/* Dynamic Interactive Sliders */}
              <div className="bg-slate-50 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-6 border border-slate-150/60">
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                    <span>Giro de Estoque Anual (rotas)</span>
                    <span className="font-mono text-indigo-650 bg-indigo-50 px-2 py-0.5 rounded">{giroTarget.toFixed(1)}x / ano</span>
                  </div>
                  <input 
                    type="range" 
                    min="3" 
                    max="18" 
                    step="0.5" 
                    value={giroTarget} 
                    onChange={(e) => setGiroTarget(parseFloat(e.target.value))}
                    className="w-full accent-emerald-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-slate-400">
                    <span>Rotatividade Baixa</span>
                    <span>Meta Ideal (12x)</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                    <span>Prazo Médio de Recebimento (Clientes)</span>
                    <span className="font-mono text-purple-650 bg-purple-50 px-2 py-0.5 rounded">{pmrSimulated} dias</span>
                  </div>
                  <input 
                    type="range" 
                    min="15" 
                    max="60" 
                    step="1" 
                    value={pmrSimulated} 
                    onChange={(e) => setPmrSimulated(parseInt(e.target.value) || 30)}
                    className="w-full accent-emerald-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-slate-400">
                    <span>À vista / Sem faturamento</span>
                    <span>Faturado de 60 dias</span>
                  </div>
                </div>
              </div>

              {/* Output metric card breakdowns */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                <div className="p-4 border border-slate-100 rounded-2xl bg-white shadow-2xs space-y-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Estocagem (PME)</span>
                  <div className="text-2xl font-black text-slate-800 font-mono">
                    {pmeCalculated} <span className="text-xs font-medium text-slate-450 text-right">dias em hold</span>
                  </div>
                  <div className="text-[10px] text-slate-450 leading-normal">
                    Representa o tempo médio que os fardos e grãos ficam guardados na saca até o consumo final.
                  </div>
                </div>

                <div className="p-4 border border-indigo-100 rounded-2xl bg-indigo-50/20 shadow-2xs space-y-2">
                  <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider block">Ciclo Operacional</span>
                  <div className="text-2xl font-black text-indigo-600 font-mono">
                    {cicloOperacionalCalculated} <span className="text-xs font-medium text-indigo-400">dias totais</span>
                  </div>
                  <div className="text-[10px] text-slate-450 leading-normal">
                    Ciclo total que engloba a entrada física do produto no estoque até recebimento das vendas: <strong className="font-mono">{pmeCalculated} + {pmrSimulated}</strong>.
                  </div>
                </div>

                <div className="p-4 border border-slate-100 rounded-2xl bg-white shadow-2xs space-y-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Cobertura de Estoque</span>
                  <div className="text-2xl font-black text-emerald-600 font-mono">
                    ~24 <span className="text-xs font-medium text-slate-450">dias de segurança</span>
                  </div>
                  <div className="text-[10px] text-slate-450 leading-normal">
                    Nível de estoque faturado de reserva capaz de suportar as flutuações sazonais de venda de balcão.
                  </div>
                </div>

              </div>

              {/* Categorias mais analisadas details */}
              <div className="space-y-3">
                <h4 className="text-[11px] font-extrabold uppercase text-slate-700 tracking-wider">Desempenho por Categoria de Suprimentos</h4>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between items-center text-xs font-bold text-slate-600 mb-1">
                      <span>Café Especial (Grãos)</span>
                      <span className="font-mono text-slate-550">Giro: 8.4x / hold: 12 dias</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: '84%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-xs font-bold text-slate-600 mb-1">
                      <span>Copos e Embalagens Kraft</span>
                      <span className="font-mono text-slate-550">Giro: 12.1x / hold: 30 dias</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: '68%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-xs font-bold text-slate-600 mb-1">
                      <span>Leite frescas e Laticínios</span>
                      <span className="font-mono text-slate-550">Giro: 15.3x / hold: 4 dias</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 rounded-full" style={{ width: '92%' }} />
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* COLUMN 2: COMPRAS METRICS (4 Cols) */}
            <div className="lg:col-span-4 bg-white border border-slate-100 rounded-3xl p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Métricas de Sourcing & Compras</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Savins, custos mitigados e liquidez de caixa faturado.</p>
                </div>
                <span className="p-2 bg-indigo-50 rounded-xl text-indigo-600"><DollarSign className="h-5 w-5" /></span>
              </div>

              {/* KPI Savings Card */}
              <div className="bg-emerald-50/40 p-5 rounded-2xl border border-emerald-100 space-y-1">
                <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider block">Total Saving Negociado IA</span>
                <span className="text-3xl font-black text-emerald-600 block leading-tight font-mono">
                  R$ {(calculatedTotalSpend * 0.142).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-emerald-700 block mt-1">
                  <strong>+14.2%</strong> retido no CMV total de compras da empresa através de seleção da melhor cotação comparatória.
                </span>
              </div>

              {/* DPO / Prazo Médio de Pagamento */}
              <div className="space-y-4">
                <div className="p-4 border border-slate-100 rounded-2xl relative bg-white">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Prazo Médio de Pagamento (PMP)</span>
                  <div className="text-3xl font-black text-slate-800 mt-1 font-mono">
                    {pmpSimulated.toFixed(1)} dias
                  </div>
                  
                  <div className="mt-3 space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-600">
                      <span>Simular alongamento comercial</span>
                      <span className="font-mono text-emerald-600">+{pmpSimulated - 18.4 > 0 ? (pmpSimulated - 18.4).toFixed(1) : '0'} d</span>
                    </div>
                    <input 
                      type="range" 
                      min="15" 
                      max="45" 
                      step="1.5" 
                      value={pmpSimulated} 
                      onChange={(e) => setPmpSimulated(parseFloat(e.target.value))}
                      className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                    />
                  </div>
                  
                  <p className="text-[10px] mt-2.5 text-slate-450 leading-relaxed bg-indigo-50/30 p-2.5 rounded-lg border border-indigo-100/30 text-slate-500">
                    💡 <strong>Alongamento de PMP:</strong> Se você conseguir alongar o prazo com o Fornecedor Alpha de 15 para 45 dias no faturamento, você injeta <strong>R$ 11.200</strong> de caixa imediata de capital de giro!
                  </p>
                </div>

                <div className="border border-slate-100 p-4 rounded-2xl space-y-2">
                  <h4 className="text-[10px] font-black uppercase text-slate-705 tracking-wider">Estoque Parado vs Escoamento</h4>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-450">Capital de Giro Retido:</span>
                    <strong className="font-mono text-slate-700">R$ 5.480,00</strong>
                  </div>
                  <div className="flex justify-between items-center text-xs pb-1 border-b border-slate-100">
                    <span className="text-slate-450">Perda por vencimento (estimada):</span>
                    <strong className="font-mono text-amber-500">R$ 380,00</strong>
                  </div>
                  <p className="text-[9px] text-slate-400 font-medium">Auditoria interna via CFO Inteligente atualizada há poucos minutos.</p>
                </div>
              </div>

            </div>

          </div>

          {/* Quick Action linking to Tab 2 */}
          <div className="bg-gradient-to-r from-emerald-600 to-indigo-650 rounded-2xl p-5 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <h4 className="text-sm font-black uppercase tracking-tight">Estoque abaixo do ponto de pedido crítico?</h4>
              <p className="text-xs text-white/80">Envie seus arquivos de estoque e histórico para que a Inteligência Artificial formule o lote exato de compra agora!</p>
            </div>
            <button
              onClick={() => setActiveSubTab('quotes')}
              className="bg-white text-emerald-900 hover:bg-emerald-50 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shrink-0 transition-all cursor-pointer"
            >
              Iniciar Cotação IA
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* PAGE 2: COTAÇÕES INTELIGENTES (UPLOAD INPUTS & GENERATOR) */}
      {/* ========================================================= */}
      {activeSubTab === 'quotes' && (
        <div className="space-y-6 animate-fade-in">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* INPUT PANEL FOR AUDIT (5 COLS) */}
            <div className="lg:col-span-5 bg-white border border-slate-100 rounded-3xl p-6 shadow-xs space-y-5">
              <div className="border-b border-slate-50 pb-3 flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Upload className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold uppercase text-slate-800 tracking-wider">Arquivos de Auditoria de Sourcing</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Anexe seus dados locais para que o assistente analise tudo cruzando vencimentos.</p>
                </div>
              </div>

              <div className="space-y-4">
                
                {/* INPUT 1: LISTA DE PRODUTOS */}
                <div className="space-y-2 pb-3 border-b border-slate-105">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider block">1. INFORME SUA LISTA DE PRODUTOS</label>
                    <span className="text-[9.5px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-black">Digitação ou Arquivo Anexo</span>
                  </div>
                  
                  <textarea
                    rows={4}
                    value={rawProductsList}
                    onChange={(e) => setRawProductsList(e.target.value)}
                    placeholder="Cole ou escreva os produtos separados por linha..."
                    className="w-full text-xs font-bold leading-normal bg-slate-50 border border-slate-200 p-3 rounded-xl focus:outline-none focus:border-emerald-500 focus:bg-white font-mono"
                  />
                  
                  {/* File attachment for Product List */}
                  <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/85">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-650 mb-1.5">
                      <span className="flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5 text-indigo-505" />
                        Anexar arquivo de produtos faturáveis:
                      </span>
                    </div>
                    
                    <div className="relative border border-dashed border-slate-300 hover:border-emerald-500/60 rounded-lg p-2 text-center bg-white transition-all cursor-pointer">
                      <input 
                        type="file" 
                        accept=".xlsx,.xls,.csv,.txt"
                        onChange={(e) => triggerFakeUpload('listaProdutos', e)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      {inputStateFiles.listaProdutos ? (
                        <div className="flex items-center justify-between gap-2 px-1">
                          <span className="text-xs font-black text-slate-700 truncate max-w-[200px]">
                            ✔️ {inputStateFiles.listaProdutos.name}
                          </span>
                          <span className="text-[9px] font-mono text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded shrink-0 font-bold">
                            {inputStateFiles.listaProdutos.size}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-450 font-bold">
                          <Upload className="h-3 w-3 text-slate-400" />
                          <span>Anexar lista de produtos (.xlsx, .csv, .txt)</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-[9px] text-slate-400 block pl-0.5">Prefilled com itens cruciais para sua cafeteria.</span>
                </div>

                {/* INPUT 2: ESTOQUE ATUAL */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">2. ARQUIVO DO ESTOQUE ATUAL</label>
                  <div className="border-2 border-dashed border-slate-200 hover:border-emerald-500/50 rounded-2xl bg-slate-50/50 p-4 text-center relative transition-all">
                    <input 
                      type="file" 
                      accept=".xlsx,.xls,.csv"
                      onChange={(e) => triggerFakeUpload('estoque', e)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <div className="space-y-1">
                      <div className="mx-auto h-8 w-8 text-slate-400 rounded-full flex items-center justify-center bg-slate-100">
                        <Upload className="h-4 w-4" />
                      </div>
                      <div className="text-xs text-slate-650 font-black">
                        {inputStateFiles.estoque.name}
                      </div>
                      <span className="text-[9px] text-emerald-600 font-mono font-bold bg-emerald-50 px-2 py-0.5 rounded">
                        Tamanho: {inputStateFiles.estoque.size} • Integrado
                      </span>
                    </div>
                  </div>
                </div>

                {/* INPUT 3: HISTÓRICO DE CONSUMO */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">3. HISTÓRICO DE CONSUMO MENSAL</label>
                  <div className="border-2 border-dashed border-slate-200 hover:border-emerald-500/50 rounded-2xl bg-slate-50/50 p-4 text-center relative transition-all">
                    <input 
                      type="file" 
                      accept=".xlsx,.xls,.csv"
                      onChange={(e) => triggerFakeUpload('consumo', e)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <div className="space-y-1">
                      <div className="mx-auto h-8 w-8 text-slate-400 rounded-full flex items-center justify-center bg-slate-100">
                        <Upload className="h-4 w-4" />
                      </div>
                      <div className="text-xs text-slate-650 font-black">
                        {inputStateFiles.consumo.name}
                      </div>
                      <span className="text-[9px] text-emerald-600 font-mono font-bold bg-emerald-50 px-2 py-0.5 rounded">
                        Tamanho: {inputStateFiles.consumo.size} • Consumo Calculado
                      </span>
                    </div>
                  </div>
                </div>

                {/* INPUT 4: VALIDADES E ÚLTIMOS PREÇOS */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">4. VALIDADES & ÚLTIMOS PREÇOS COMPRADOS</label>
                  <div className="border-2 border-dashed border-slate-200 hover:border-emerald-500/50 rounded-2xl bg-slate-50/50 p-4 text-center relative transition-all">
                    <input 
                      type="file" 
                      accept=".xlsx,.xls,.csv"
                      onChange={(e) => triggerFakeUpload('validades', e)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <div className="space-y-1">
                      <div className="mx-auto h-8 w-8 text-slate-400 rounded-full flex items-center justify-center bg-slate-100">
                        <Upload className="h-4 w-4" />
                      </div>
                      <div className="text-xs text-slate-650 font-black">
                        {inputStateFiles.validades.name}
                      </div>
                      <span className="text-[9px] text-emerald-600 font-mono font-bold bg-emerald-50 px-2 py-0.5 rounded">
                        Tamanho: {inputStateFiles.validades.size} • 85 itens mapeados
                      </span>
                    </div>
                  </div>
                </div>

                {/* TEXTAREA DO PROMPT DE DIRETRIZ CRITÉRIO */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <label className="text-[10px] font-black text-emerald-600 uppercase tracking-wider block flex items-center gap-1">
                    <Sparkles className="h-3 w-3 animate-spin" />
                    Critério de Análise do Assistente IA
                  </label>
                  <textarea
                    rows={3}
                    value={customCriteria}
                    onChange={(e) => setCustomCriteria(e.target.value)}
                    placeholder="Informe suas diretrizes específicas de reposição..."
                    className="w-full text-xs font-semibold leading-relaxed bg-slate-50 border border-slate-200 p-2.5 rounded-xl focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                  <div className="flex flex-wrap gap-1">
                    <button
                      onClick={() => setCustomCriteria('Me dê a lista dos itens que vão faltar nos próximos dias junto com os itens que vão vencer e tem venda, para repor estoque.')}
                      className="text-[9px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded px-2 py-1 text-left"
                    >
                      💡 Critério Principal (Estoque + Vencimentos)
                    </button>
                    <button
                      onClick={() => setCustomCriteria('Apenas itens abaixo do nível mínimo de garantia, priorizando o fornecedor com melhor saving comercial.')}
                      className="text-[9px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded px-2 py-1 text-left"
                    >
                      🎯 Foco em Ruptura Crítica & Saving
                    </button>
                  </div>
                </div>

                {/* TRIGGER ACTION */}
                <button
                  onClick={handleGenerateAiPurchaseList}
                  disabled={isGeneratingList}
                  style={{ cursor: 'pointer' }}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase cursor-pointer py-3.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  {isGeneratingList ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Consolidando e Cruzando Dados...
                    </>
                  ) : (
                    <>
                      <Bot className="h-4 w-4" />
                      Gerar Lista de Compra Inteligente por IA
                    </>
                  )}
                </button>

              </div>
            </div>

            {/* RESULTS OUTPUT PANEL (7 COLS) */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* If generating, display terminal steps */}
              {isGeneratingList && (
                <div className="bg-slate-900 text-emerald-400 font-mono text-xs p-5 rounded-2xl border border-slate-850 shadow-lg space-y-2.5 min-h-[300px] flex flex-col justify-center">
                  <span className="text-[10px] text-slate-400 uppercase font-black block border-b border-slate-800 pb-2 mb-2 font-mono">Terminal de Análise de Suprimentos IA</span>
                  {generationSteps.map((step, index) => (
                    <div key={index} className="flex gap-2 items-center animate-fade-in text-[11px]">
                      <span className="text-emerald-500 font-black">⚙️</span>
                      <span>{step}</span>
                    </div>
                  ))}
                  <div className="flex gap-2 items-center animate-pulse text-[10px] text-slate-400 mt-4 pl-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>Lote Econômico de Compras sendo gerado...</span>
                  </div>
                </div>
              )}

              {/* RECOMMENDED PURCHASE LIST TABLE PANEL */}
              {!isGeneratingList && (
                <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-50 pb-3">
                    <div>
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Lista Recomendada pelo Inteligente Assistente</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">Esta lista foi recalculada com base no estoque residual, validades dos lotes e velocidade de vendas.</p>
                    </div>
                    <span className="px-3 py-1 bg-yellow-50 text-amber-700 text-[9px] font-black uppercase tracking-wider font-mono rounded-full">Edição de Rascunho Liberada</span>
                  </div>

                  {/* Editable Items Table */}
                  <div className="overflow-x-auto rounded-xl border border-slate-100/70">
                    <table className="w-full text-xs font-sans text-left">
                      <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-100">
                        <tr>
                          <th className="p-3">Descrição do Item</th>
                          <th className="p-3">Info Alertas</th>
                          <th className="p-3 w-28 text-center text-midnight">Quantidade Sugerida</th>
                          <th className="p-3 text-right">Preço Unitário (R$)</th>
                          <th className="p-3 text-right">Estimado Total</th>
                          <th className="p-3 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {validatedPurchaseList.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-3">
                              <span className="font-extrabold text-slate-800 block text-[11.5px]">{item.item_name}</span>
                              <span className="text-[9.5px] text-slate-400 mt-0.5 block font-medium">Estoque atual: <strong>{item.current_stock} un</strong></span>
                            </td>
                            <td className="p-3">
                              <div className="space-y-1">
                                <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold text-center ${
                                  item.runout_days <= 7 ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  Acaba em {item.runout_days} dias
                                </span>
                                <span className="text-[9px] text-slate-450 block font-bold text-[8.5px]">{item.expiration}</span>
                                <span className="text-[8px] text-indigo-500 font-extrabold block uppercase tracking-wider">{item.sales_rate}</span>
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <div className="inline-flex items-center gap-1.5 bg-slate-100 rounded-lg p-1">
                                <button
                                  onClick={() => handleUpdateQty(item.id, item.suggested_qty - 1)}
                                  className="w-6 h-6 hover:bg-white text-slate-600 font-bold rounded flex items-center justify-center transition-all cursor-pointer"
                                >
                                  -
                                </button>
                                <span className="text-xs font-black font-mono w-6 text-center">{item.suggested_qty}</span>
                                <button
                                  onClick={() => handleUpdateQty(item.id, item.suggested_qty + 1)}
                                  className="w-6 h-6 hover:bg-white text-slate-600 font-bold rounded flex items-center justify-center transition-all cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td className="p-3 text-right">
                              <input 
                                type="number" 
                                step="0.5" 
                                value={item.last_price || ''}
                                onChange={(e) => handleUpdatePrice(item.id, parseFloat(e.target.value) || 0)}
                                className="w-20 text-right text-xs border border-slate-200 bg-slate-50 font-mono font-bold p-1 rounded focus:outline-none focus:border-emerald-500 focus:bg-white"
                              />
                            </td>
                            <td className="p-3 text-right font-mono font-black text-slate-800 text-[11.5px]">
                              R$ {(item.suggested_qty * item.last_price).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => handleDeleteItem(item.id)}
                                className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                              >
                                <Trash className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary / Append Item row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100 bg-slate-50/50 p-4 rounded-2xl border border-slate-150">
                    
                    {/* Fast add custom item form */}
                    <form onSubmit={handleAddCustomItem} className="space-y-2">
                      <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">Inserir Item Manual à Lista</span>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          required
                          placeholder="Ex: Embalagens Personalizadas"
                          value={newItemName}
                          onChange={(e) => setNewItemName(e.target.value)}
                          className="flex-1 text-[11px] font-bold p-1.5 border border-slate-200 bg-white rounded-lg outline-none focus:border-emerald-500"
                        />
                        <input
                          type="number"
                          required
                          min="1"
                          placeholder="Qtd"
                          value={newItemQty || ''}
                          onChange={(e) => setNewItemQty(parseInt(e.target.value) || 1)}
                          className="w-14 text-center text-[11px] font-bold p-1.5 border border-slate-200 bg-white rounded-lg outline-none focus:border-emerald-500 font-mono"
                        />
                        <button
                          type="submit"
                          style={{ cursor: 'pointer' }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 text-xs font-bold rounded-lg flex items-center justify-center shrink-0 cursor-pointer"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </form>

                    {/* Spend totals */}
                    <div className="flex flex-col justify-center items-end text-right space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold block">Valor Total Estimado da Compra</span>
                      <strong className="text-xl font-mono font-black text-slate-800 block">
                        R$ {calculatedTotalSpend.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </strong>
                      <span className="text-[9.5px] text-emerald-600 font-bold flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        Saving financeiro calculado: R$ {calculatedTotalSaving.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                  </div>

                  {/* VALIDATE LIST BUTTON */}
                  <div className="pt-4 flex justify-end">
                    <button
                      onClick={handleValidateList}
                      style={{ cursor: 'pointer' }}
                      className="bg-gradient-to-r from-emerald-600 to-teal-650 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs uppercase px-6 py-3.5 rounded-xl shadow-lg cursor-pointer flex items-center gap-2 transition-all"
                    >
                      <ShieldCheck className="h-4.5 w-4.5 text-white" />
                      Validar e Disponibilizar para WhatsApp dos Fornecedores
                    </button>
                  </div>

                </div>
              )}

            </div>

          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* PAGE 3: ZAP DE FORNECEDORES (WHATSAPP SIMULATOR INTERFACE) */}
      {/* ========================================================= */}
      {activeSubTab === 'whatsapp' && (
        <div className="space-y-6">
          
          {/* WHATSAPP CONNECTION & STATUS MONITOR */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Wifi className={`h-4 w-4 ${whatsappStatus.status === 'CONNECTED' ? 'text-emerald-500 animate-pulse' : 'text-slate-400'}`} />
                  Status de Integração do WhatsApp (Multi-Canal)
                </h3>
                <p className="text-[11px] text-slate-400">Gerencie a sessão de faturamento e canais de contato direto ativo.</p>
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                {whatsappStatus.status === 'CONNECTED' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                    CONECTADO COM SUCESSO
                  </span>
                ) : whatsappStatus.status === 'QR_REQUIRED' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-700 border border-amber-200/50">
                    LEITURA DE QR CODE REQUERIDA
                  </span>
                ) : whatsappStatus.status === 'INITIALIZING' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-blue-50 text-blue-700 border border-blue-200/50 animate-pulse">
                    INICIALIZANDO SERVIÇO...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-slate-50 text-slate-650 border border-slate-200">
                    <WifiOff className="h-3 w-3" />
                    DESCONECTADO
                  </span>
                )}
                
                <span className="text-[9.5px] font-black uppercase px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-150">
                  Modo: {whatsappStatus.mode === 'REAL' ? '🔌 Servidor Real (WWebJS)' : '🤖 Simulador Inteligente'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
              {/* Status Detail and QR Code card */}
              <div className="md:col-span-8 flex flex-col md:flex-row gap-5 bg-slate-50 border border-slate-150/60 rounded-2xl p-4 items-center">
                
                {/* If QR Code is requested */}
                {whatsappStatus.status === 'QR_REQUIRED' && whatsappStatus.qrCodeUrl ? (
                  <div className="flex flex-col items-center gap-2 bg-white p-3.5 rounded-xl border border-slate-200 shadow-inner shrink-0">
                    <img src={whatsappStatus.qrCodeUrl} className="h-32 w-32 object-contain" alt="Scan QR Code" />
                    <span className="text-[9px] font-mono font-bold text-slate-450">Aponte a câmera</span>
                  </div>
                ) : (
                  <div className="h-32 w-32 bg-slate-100 rounded-xl border border-slate-200/75 flex flex-col items-center justify-center text-center p-3 shrink-0">
                    {whatsappStatus.status === 'CONNECTED' ? (
                      <CheckCircle className="h-10 w-10 text-emerald-500 animate-bounce" />
                    ) : (
                      <QrCode className="h-10 w-10 text-slate-350" />
                    )}
                    <span className="text-[9.5px] font-black text-slate-500 mt-2 uppercase tracking-wide text-center">
                      {whatsappStatus.status === 'CONNECTED' ? 'Prontidão Ativa' : 'Sem QR Code'}
                    </span>
                  </div>
                )}

                {/* Guide details */}
                <div className="flex-1 space-y-2 text-center md:text-left">
                  <div>
                    <h4 className="text-[12px] font-black text-slate-700 font-sans">Como conectar seu WhatsApp de Faturamento:</h4>
                    <p className="text-[10.5px] text-slate-450 mt-1 leading-relaxed">
                      {whatsappStatus.status === 'CONNECTED' 
                        ? 'Sua sessão está ativa e salva em ambiente seguro. Seus fornecedores cadastrados responderão automaticamente às solicitações de cotação e negociação faturada em tempo real.'
                        : 'Abra o WhatsApp no seu celular, vá em Aparelhos Conectados > Conectar Aparelho e aponte para o QR Code ao lado. Para fins de testes rápidos no sandbox/preview, clique no botão de conexão simulada abaixo.'
                      }
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1 justify-center md:justify-start">
                    {whatsappStatus.status !== 'CONNECTED' && (
                      <button
                        onClick={async () => {
                          try {
                            const res = await fetch('/api/whatsapp/simulate-scan', { method: 'POST' });
                            if (res.ok) await syncWhatsappData();
                          } catch (e) {
                            console.error(e);
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-lg text-[10.5px] font-black uppercase flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Conectar via Simulador
                      </button>
                    )}

                    {whatsappStatus.status === 'CONNECTED' && (
                      <button
                        onClick={async () => {
                          try {
                            const res = await fetch('/api/whatsapp/disconnect', { method: 'POST' });
                            if (res.ok) await syncWhatsappData();
                          } catch (e) {
                            console.error(e);
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                        className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3.5 py-1.5 rounded-lg text-[10.5px] font-black uppercase flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <LogOut className="h-1.5 w-1.5 shrink-0" />
                        Desconectar Sessão
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Logging terminal monitor */}
              <div className="md:col-span-4 bg-slate-900 rounded-2xl p-3 border border-slate-950 flex flex-col justify-between max-h-[160px] md:max-h-auto">
                <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 border-b border-slate-800 pb-1.5 mb-1.5">
                  <span className="flex items-center gap-1 uppercase">
                    <span className="h-1.5 w-1.5 bg-indigo-400 rounded-full animate-ping" />
                    Log de Eventos do Whatsapp
                  </span>
                  <button 
                    onClick={syncWhatsappData}
                    className="hover:text-white transition-colors"
                  >
                    <RefreshCw className="h-2.5 w-2.5" />
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto font-mono text-[9.5px] text-indigo-200 select-text leading-tight space-y-1 pr-1 max-h-[100px] scrollbar-thin">
                  {whatsappStatus.logs && whatsappStatus.logs.length > 0 ? (
                    whatsappStatus.logs.map((log, i) => (
                      <div key={i} className="truncate select-all" title={log}>{log}</div>
                    ))
                  ) : (
                    <div className="text-slate-600">Aguardando eventos do serviço...</div>
                  )}
                </div>

                <div className="text-[8px] font-mono text-slate-500 text-right mt-1">
                  Sessão persistente ativa
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-100 rounded-3xl p-4 md:p-6 border border-slate-200 shadow-sm min-h-[550px] overflow-hidden items-stretch">
            
            {/* LEFT COLUMN: REGISTERED SUPPLIERS LIST (4 Cols) */}
            <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 flex flex-col overflow-hidden shadow-xs shrink-0 select-none">
              <div className="p-4 bg-slate-50 border-b border-slate-200">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight">Fornecedores Registrados (ZAP)</h3>
                <p className="text-[10px] text-slate-450 mt-0.5">Selecione o fornecedor correspondente para enviar a compra.</p>
              </div>

              {/* List body */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                {SUPPLIERS.map((sup) => {
                  const isActive = selectedSupplierId === sup.id;
                  const lastMessage = whatsappChats[sup.id][whatsappChats[sup.id].length - 1];
                  
                  return (
                    <div
                      key={sup.id}
                      onClick={() => setSelectedSupplierId(sup.id)}
                      className={`p-4 flex items-center gap-3 transition-colors cursor-pointer ${
                        isActive ? 'bg-emerald-50/70 border-l-4 border-emerald-500' : 'hover:bg-slate-50/50'
                      }`}
                    >
                      {/* Avatar */}
                      <div className="h-10 w-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black tracking-tight text-xs shadow-inner uppercase">
                        {sup.initials}
                      </div>

                      {/* Info layout */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-extrabold text-slate-800 block truncate">{sup.name}</span>
                          <span className="text-[8px] text-emerald-500 font-mono flex items-center gap-1">
                            <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" />
                            ativo
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-indigo-500 block">{sup.representative}</span>
                        <p className="text-[10px] text-slate-550 block font-normal truncate">
                          {lastMessage ? lastMessage.content : sup.description}
                        </p>
                      </div>

                      <ChevronRight className="h-3.5 w-3.5 text-slate-350 shrink-0" />
                    </div>
                  );
                })}
              </div>

              <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
                <span className="text-[9px] font-bold text-slate-450">Multi-Empresa: Santos • São Paulo • Rio</span>
              </div>
            </div>

            {/* RIGHT COLUMN: WHATSAPP DECK (8 Cols) */}
            <div className="lg:col-span-8 bg-slate-50/50 rounded-2xl border border-slate-200 flex flex-col overflow-hidden shadow-xs relative">
              
              {/* WhatsApp Emerald Green Top Header */}
              {(() => {
                const activeSup = SUPPLIERS.find(s => s.id === selectedSupplierId) || SUPPLIERS[0];
                return (
                  <div className="bg-emerald-700 text-white p-4 flex items-center justify-between shadow-md z-1 relative">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-white/10 text-white border border-white/20 flex items-center justify-center font-black tracking-tight text-xs uppercase">
                        {activeSup.initials}
                      </div>
                      
                      <div>
                        <div className="font-extrabold text-xs">{activeSup.name}</div>
                        <span className="text-[9.5px] text-emerald-100 block font-bold mt-0.5">
                          {isTypingSupplier ? (
                            <span className="text-yellow-300 font-black animate-pulse">Digitando...</span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <span className="h-1.5 w-1.5 bg-emerald-300 rounded-full animate-bounce" />
                              online
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end whitespace-nowrap">
                      <span className="text-[9.5px] font-mono font-bold text-emerald-100 uppercase tracking-widest">{activeSup.phone}</span>
                      <span className="text-[8.5px] text-emerald-200 font-extrabold block uppercase mt-0.5">{activeSup.category}</span>
                    </div>
                  </div>
                );
              })()}

              {/* WHATSAPP CHAT FLOW CONTENT (SCROLLABLE BACKGROUND MODEL) */}
              <div 
                className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[450px] min-h-[350px] relative scrollbar-thin"
                style={{ 
                  backgroundColor: '#efeae2',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cg fill='%23cccbc6' fill-opacity='0.15'%3E%3Cpath d='M50 50c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10c0 5.523-4.477 10-10 10s-10-4.477-10-10 4.477-10 10-10zM10 10c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10c0 5.523-4.477 10-10 10S0 25.523 0 20s4.477-10 10-10z'/%3E%3C/g%3E%3C/svg%3E")`
                }}
              >
                
                {/* Float template notification banner */}
                <div className="mx-auto max-w-sm bg-indigo-900 border border-indigo-800 text-white rounded-xl p-3.5 shadow-md text-center space-y-2 relative z-10 animate-fade-in">
                  <div className="flex justify-center"><Bot className="h-5 w-5 text-indigo-300 animate-bounce" /></div>
                  <h4 className="text-[10.5px] font-black uppercase text-indigo-300 tracking-wider">Apoio de Sourcing: Lista de Compras Pronta!</h4>
                  <p className="text-[10px] text-white/90">A lista recomendada inteligente de compras já foi gerada e validada no sistema. Deseja carregar no chat para envio?</p>
                  
                  <button
                    onClick={handlePreloadWhatsAppList}
                    style={{ cursor: 'pointer' }}
                    className="mx-auto bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase block shadow-md cursor-pointer transition-all"
                  >
                    💬 Carregar no Chat Inteligente
                  </button>
                </div>

                {/* Actual chat balloons */}
                {whatsappChats[selectedSupplierId] && whatsappChats[selectedSupplierId].map((msg, index) => {
                  const isUser = msg.role === 'user';
                  
                  return (
                    <div
                      key={index}
                      className={`flex ${isUser ? 'justify-end' : 'justify-start'} w-full animate-fade-in`}
                    >
                      {/* Chat bubble wrapper */}
                      <div
                        className={`p-3 max-w-[80%] rounded-2xl relative shadow-sm ${
                          isUser 
                            ? 'bg-emerald-100 text-slate-800 rounded-tr-none border-t border-emerald-200' 
                            : 'bg-white text-slate-800 rounded-tl-none border-t border-slate-100'
                        }`}
                      >
                        <p className="whitespace-pre-line text-[11px] leading-relaxed font-sans">{msg.content}</p>
                        
                        <span className={`text-[8px] block mt-1 text-right font-mono ${isUser ? 'text-emerald-700' : 'text-slate-400'}`}>
                          {msg.timestamp} • lida ✔✔
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Typing Indicator */}
                {isTypingSupplier && (
                  <div className="flex justify-start">
                    <div className="bg-white px-4 py-2.5 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1 animate-pulse">
                      <span className="h-1.5 w-1.5 bg-emerald-600 rounded-full animate-bounce" />
                      <span className="h-1.5 w-1.5 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      <span className="h-1.5 w-1.5 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                    </div>
                  </div>
                )}

              </div>

              {/* WHATSAPP INPUT / CONTROLS TEXTAREA */}
              <div className="p-3 bg-slate-100 border-t border-slate-200">
                <form onSubmit={(e) => handleSendWhatsappMessage(e)} className="flex gap-2 items-end">
                  <textarea
                    rows={Math.min(5, whatsappInput.split('\n').length || 1)}
                    placeholder="Escreva a mensagem de cotação para enviar ao Whatsapp do fornecedor..."
                    value={whatsappInput}
                    onChange={(e) => setWhatsappInput(e.target.value)}
                    className="flex-1 bg-white border border-slate-250 p-2.5 rounded-xl font-bold font-mono text-[10.5px] leading-normal outline-none focus:border-emerald-500 max-h-[140px] resize-none scrollbar-thin"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendWhatsappMessage();
                      }
                    }}
                  />
                  
                  <button
                    type="submit"
                    disabled={isTypingSupplier || !whatsappInput.trim()}
                    style={{ cursor: 'pointer' }}
                    className="bg-emerald-650 hover:bg-emerald-750 text-white p-3.5 rounded-xl transition-all cursor-pointer shadow-md disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
                
                {/* Shortcut templates */}
                <div className="flex flex-wrap gap-1.5 mt-2 pt-1 border-t border-slate-200/50">
                  <button
                    onClick={() => handleSendWhatsappMessage(undefined, 'Podemos faturar em fita direta de 30 dias para otimizar meu fluxo ou vocês dão desconto no PIX?')}
                    className="text-[9px] font-bold text-slate-500 bg-white hover:bg-slate-200 rounded-lg px-2 py-1 text-left border border-slate-200"
                  >
                    💸 Negociar faturamento 30d vs Desconto PIX
                  </button>
                  <button
                    onClick={() => handleSendWhatsappMessage(undefined, 'Confirmado! Pode emitir o faturamento e boleto direto do lote de segurança.')}
                    className="text-[9px] font-bold text-slate-500 bg-white hover:bg-slate-200 rounded-lg px-2 py-1 text-left border border-slate-200"
                  >
                    ✅ Confirmar Fechamento e Boleto
                  </button>
                  <button
                    onClick={() => handleSendWhatsappMessage(undefined, 'Qual o prazo final de entrega (Lead time) se fizermos faturamento hoje?')}
                    className="text-[9px] font-bold text-slate-500 bg-white hover:bg-slate-200 rounded-lg px-2 py-1 text-left border border-slate-200"
                  >
                    ⏱️ Perguntar prazo exato de entrega
                  </button>
                </div>
              </div>

            </div>

          </div>

          {/* Guidelines on multitenancy & testing */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-2xs space-y-2">
            <h4 className="text-xs font-black uppercase text-slate-800 flex items-center gap-1.5">
              <Building className="h-4 w-4 text-emerald-600" />
              Guia Metodológico de Simulação Comercial
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
              O painel de faturamento inteligente do WhatsApp permite que você conecte o número comercial oficial ou use uma sessão virtual de simulação síncrona. Quando você envia as metas de saving ou tabelas de insumo, as inteligências dos fornecedores respondem faturando, concedendo descontos e estendendo o PMP automaticamente.
            </p>
          </div>

        </div>
      )}

    </div>
  );
}
