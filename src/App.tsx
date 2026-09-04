import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { 
  LayoutDashboard, ListTodo, BookOpen, Search, Filter, 
  Plus, X, Edit, Calendar, User, UserCircle, CheckCircle2,
  AlertCircle, Clock, Save, Sparkles, Loader2, Bot, FileText,
  AlignLeft, CalendarDays, Activity, Trash2, AlertTriangle,
  Database, FileSpreadsheet, FileJson, FolderTree,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ArrowUpDown, RefreshCcw, Printer, Kanban, XCircle, Tag,
  DollarSign, ClipboardList, Settings, Radar, LogOut, Shield, Lock, Unlock, KeyRound, Map,
  Radio, LogIn, TrendingUp
} from 'lucide-react';
import { db, doc, setDoc, deleteDoc, collection, onSnapshot } from './lib/dataStore';
import { callClaudeWithRetry } from './lib/claude';
import {
  fetchProfile,
  signInWithPassword,
  signOut as authSignOut,
  getSession,
  onAuthStateChange,
  updateOwnPassword,
} from './lib/auth';
import { adminCreateUser, adminDeleteUser } from './lib/adminUsers';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

const initialDemandTypes = [
  { id: 'TYPE-1', name: 'Melhorias' },
  { id: 'TYPE-2', name: 'Projeto Estruturante' },
  { id: 'TYPE-3', name: 'Inovação' },
  { id: 'TYPE-4', name: 'Correção de Bug' }
];

const initialSystems = [
  'SAP', 'Senior', 'Thomson Tax One', 'Thomson OSGT', 'Thomson DFE', 
  'Thomson DFE Governance', 'Lantek', 'Guardian', 'Team Center', 
  '4MDG', 'APPs Personalizados', 'Jira'
].map((name, i) => ({ id: `SYS-${i}`, name }));

const initialSponsors = [
  { id: 'SPO-1', name: 'Diretoria Executiva', email: 'diretoria@empresa.com' },
  { id: 'SPO-2', name: 'Gerência de TI', email: 'ti@empresa.com' }
];

const AREAS_SOLICITANTES = [
  'Almoxarifado', 'Assistência Técnica', 'Comercial', 'Contabilidade', 
  'Controladoria', 'Controle da Qualidade', 'Embalagem de EF', 
  'Embalagem por Componente', 'Engenharia de Processos', 'Engenharia de Produtos', 
  'Estação de Testes', 'Expedição', 'Financeiro', 'Fiscal', 
  'Gestão da Qualidade', 'Medicina', 'PMO', 'PPCP', 'Produção', 
  'RH', 'Segurança do Trabalho'
];

const initialTickets = [
  { id: 'TKTI-11427', type: 'Melhorias', sprint: '', description: 'Melhoria do processo de saída da Galvanização', keyUser: 'Marcelo Nascimento', analyst: 'Rafael Nunes', status: '00 - Cancelado', progress: 0, goLive: '', logs: [
    { id: 1, date: '2026-03-25', text: 'Reunião com os coordenadores realizando as tratativas do processos.', author: 'Rafael Nunes' },
    { id: 5, date: '2026-04-16', text: 'Devido a mudança na estrutura organizacional (descontinuação da torre de controle) estamos cancelando esse chamado e realizando uma revisitação completa do processo de saida da Gal e entrega no destino interno (PMO, Piquete, Expedição). A Hagapy está conduzindo esse estudo. Após conclusão, avaliaremos a necessidade de melhorias e serão abertos os devidos chamados.', author: 'Rafael Nunes' }
  ]},
  { id: 'TKTI-11405', type: 'Inovação', sprint: '', description: 'Fardos/caixas alocados para uma pré-carga não possam ser movimentados', keyUser: 'Marcelo Nascimento', analyst: 'Wildner', status: '00 - Paralisado', progress: 10, goLive: '', logs: [
    { id: 1, date: '2026-02-24', text: 'Informado em chamado que a TI não recomenda a implemantação da trava sistêmica e os motivos estão no chamado.', author: 'Wildner' },
    { id: 9, date: '2026-04-16', text: 'Chamado Paralisado. Estamos aguardando retorno desde 10/03. (37 dias)', author: 'Wildner' },
    { id: 12, date: '2026-04-29', text: 'Informado pela área que está aguardando o retorno do Marcelo. (férias)', author: 'Wildner' }
  ]},
  { id: 'TKTI-10515', type: 'Melhorias', sprint: '', description: 'Melhoria no processo da interface na marcação da reserva de MP na ordem de produção', keyUser: 'Thiago Guzzo', analyst: 'Ursula', status: '00 - Paralisado', progress: 10, goLive: '', logs: [
    { id: 1, date: '2026-03-06', text: 'Chamado será visto internamente com consultor alocado', author: 'Ursula' },
    { id: 11, date: '2026-04-15', text: 'Chamado foi paralisado por concorrencia de recursos e de priorização de demandas como TKTI 2401.', author: 'Ursula' }
  ]},
  { id: 'TKTI-11133', type: 'Projeto Estruturante', sprint: '', description: 'Incluir novos Status para OF do SAP | SAP S/4 Hana', keyUser: 'Marcelo Nascimento', analyst: 'Rafael Nunes', status: '1 - Em analise', progress: 10, goLive: '', logs: [
    { id: 1, date: '2026-03-02', text: 'Posicionamento da TI é que a gestão de pátio será feita através do Guardian. Marcada visita da Toledo para montagem de relatório sobre pontos de melhorias, correções e processes.', author: 'Rafael Nunes' },
    { id: 12, date: '2026-04-29', text: 'Em reunião feita hoje Wanderson solicitou que haja uma outra reunião pois o mesmo não pode ficar devido a reunião com a diretoria e que precisaria envolver também pessoas da portaria e almoxarifado, Toledo sugeriu que a próxima reunião seja presencial, data mais próxima 20 ou 21 de maio.', author: 'Rafael Nunes' }
  ]},
  { id: 'TKTI-12029', type: 'Correção de Bug', sprint: 'Sprint 04/26', description: 'Retirar zeros do código do material no XML de agrupamento', keyUser: 'Thiago Guzzo', analyst: 'Ursula', status: '10 - Concluído', progress: 100, goLive: '2026-04-29', logs: [
    { id: 1, date: '2026-04-29', text: 'Demanda feita fora da Sprint 04/26.', author: 'Ursula' }
  ]},
  { id: 'TKTI-11989', type: 'Melhorias', sprint: 'Sprint 04/26', description: 'Ajuste SINIEF 49/25', keyUser: 'Poliana Proença', analyst: 'Rafael Nunes', status: '10 - Concluído', progress: 100, goLive: '2026-04-30', logs: [
    { id: 1, date: '2026-04-29', text: 'Demanda Urgente fora da Sprint 04/26, feita para atender resolução SINIEF 49/25 do CONFAZ, será realizado validação pela Key User dos campos no XML.', author: 'Rafael Nunes' }
  ]},
  { id: 'TKTI-12408', type: 'Melhorias', sprint: '', description: 'Ajuste no APP Gestão de Elemento de Fixação', keyUser: 'Thiago Guzzo', analyst: 'Ursula', status: '6 - Desenvolvimento', progress: 65, goLive: '', logs: [
    { id: 1, date: '2026-03-05', text: 'Abertura do chamado solicitando ajustes.', author: 'Ursula' },
    { id: 15, date: '2026-04-30', text: 'Em conversa com consultoria a mesma informa que não sonseguirá liberar para testes hoje, previsão é para segunda-feira, cronograma em atraso.', author: 'Ursula' }
  ]},
  { id: 'TKTI-11046', type: 'Melhorias', sprint: '', description: 'Ajuste relatório de visibilidade', keyUser: 'Thais Agrizzi', analyst: 'Ursula', status: '7 - Testes', progress: 85, goLive: '', logs: [
    { id: 1, date: '2026-04-08', text: 'EF disponivel para aprovação da Thais Agrizzi.', author: 'Ursula' },
    { id: 8, date: '2026-04-30', text: 'As duas divergências encontradas pela Thais estão sendo tratadas pela consultoria e o retorno para novos testes é na segunda 04/05.', author: 'Ursula' }
  ]},
  { id: 'TKTI-11117', type: 'Melhorias', sprint: '', description: 'Melhoria no relatório Demandas – Embalagem por Componentes', keyUser: 'Thais Agrizzi', analyst: 'Ursula', status: '7 - Testes', progress: 90, goLive: '', logs: [
    { id: 1, date: '2026-04-08', text: 'Chamado encontra-se em testes unitários e correções no desenvolvimento, previsão é de entregar para testes integrados ainda nesta semana.', author: 'Ursula' },
    { id: 9, date: '2026-04-30', text: 'Em conversa com consultoria, os dois pontos de ajuste que a Thais solicitou estão sendo realizados e o retorno para novos testes acontece na segunda dia 04/05.', author: 'Ursula' }
  ]}
];

// --- SEED DE USUÁRIOS DO SISTEMA (mantido só como referência histórica) ---
// Não é mais usado para criar contas automaticamente: logins agora exigem
// o Supabase Auth (ver README.md, "Criar o primeiro usuário Admin" e
// scripts/import-legacy-json.mjs).
const initialAppUsers = [
  { id: 'USR-ADMIN', username: 'admin', password: 'admin', name: 'Administrador', roles: ['Admin'] },
  { id: 'USR-1', username: 'rafael', password: '123', name: 'Rafael Nunes', roles: ['Analista'] },
  { id: 'USR-2', username: 'ursula', password: '123', name: 'Ursula', roles: ['Analista'] },
  { id: 'USR-3', username: 'wildner', password: '123', name: 'Wildner', roles: ['Analista'] },
  { id: 'USR-4', username: 'marcelo', password: '123', name: 'Marcelo Nascimento', roles: ['Key User'] },
  { id: 'USR-5', username: 'thiago', password: '123', name: 'Thiago Guzzo', roles: ['Key User'] },
  { id: 'USR-6', username: 'poliana', password: '123', name: 'Poliana Proença', roles: ['Key User'] },
  { id: 'USR-7', username: 'thais', password: '123', name: 'Thais Agrizzi', roles: ['Key User'] }
];

const STATUS_COLORS = {
  '1 - Em analise': '#64748B', 
  '2 - Consult. - DAM': '#8B5CF6', 
  '3 - Área de Neg. - DAM': '#D946EF', 
  '4 - Consult. - EF': '#EC4899', 
  '5 - Área de Neg. - EF': '#F43F5E', 
  '6 - Desenvolvimento': '#3B82F6', 
  '7 - Testes': '#F59E0B', 
  '8 - Deploy': '#0EA5E9', 
  '9 - Operação Assistida': '#14B8A6', 
  '10 - Concluído': '#10B981', 
  '00 - Paralisado': '#F97316', 
  '00 - Bloqueado': '#EF4444', 
  '00 - Cancelado': '#9CA3AF', 
};

const STATUS_OPTIONS = Object.keys(STATUS_COLORS);

const SCHEDULE_STEPS = [
  'Validação de Escopo',
  'Especificação Funcional e Técnica',
  'Aprovação de Especificação',
  'Desenvolvimento',
  'Testes',
  'Go Live'
];

// --- FUNÇÕES AUXILIARES GLOBAIS ---
const generateGanttPhases = (ticket) => {
  if (!ticket) return [];
  const schedule = ticket.schedule || {};
  const stepsToUse = ticket.customSteps && ticket.customSteps.length > 0 ? ticket.customSteps : SCHEDULE_STEPS;

  return stepsToUse.map(step => {
    const data = schedule[step] || {};
    const pStart = data.plannedStart || data.start;
    const pEnd = data.plannedEnd || data.end;
    const aStart = data.actualStart;
    const aEnd = data.actualEnd;
    const stepProgress = data.progress !== undefined && data.progress !== '' ? Number(data.progress) : 0; 
    
    return { 
      name: step, 
      plannedStartMs: pStart ? new Date(pStart + 'T00:00:00').getTime() : null, 
      plannedEndMs: pEnd ? new Date(pEnd + 'T00:00:00').getTime() : null, 
      actualStartMs: aStart ? new Date(aStart + 'T00:00:00').getTime() : null, 
      actualEndMs: aEnd ? new Date(aEnd + 'T00:00:00').getTime() : null, 
      progress: stepProgress, 
      isReal: true 
    };
  });
};

const calculateDays = (startStr, endStr) => {
  const start = new Date(startStr).getTime();
  const fallbackToday = new Date('2026-05-10').getTime();
  const now = Date.now();
  const referenceEnd = now < fallbackToday ? fallbackToday : now;
  
  const end = endStr ? new Date(endStr).getTime() : referenceEnd;
  const diffTime = Math.max(0, end - start);
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

const formatMonthYear = (ms) => {
  if (!ms) return '';
  const d = new Date(ms);
  const text = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const formatShortMonthYear = (ms) => {
  if (!ms) return '';
  const d = new Date(ms);
  const m = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
  const y = d.toLocaleDateString('pt-BR', { year: '2-digit' });
  return `${m}/${y}`;
};

const formatDateShort = (ms) => {
  if (!ms) return '';
  const d = new Date(ms);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

const sortLogsDesc = (logs) => {
  if (!logs) return [];
  return [...logs].sort((a, b) => {
    const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (dateDiff !== 0) return dateDiff;
    return (b.id || 0) - (a.id || 0);
  });
};

const sortLogsAsc = (logs) => {
  if (!logs) return [];
  return [...logs].sort((a, b) => {
    const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (dateDiff !== 0) return dateDiff;
    return (a.id || 0) - (b.id || 0);
  });
};

// Calcula o intervalo de datas planejado/realizado de uma demanda a partir do
// cronograma (mesma regra usada no Roadmap: usa a data real quando existe,
// senão cai para a planejada). Reaproveitado tanto pelo Roadmap quanto pelo
// indicador "Demandas Atrasadas" da página Principal, para que as duas telas
// concordem sobre o que conta como atrasado.
const getTicketScheduleRange = (t) => {
  let tMin = Infinity;
  let tMax = 0;
  let hasDates = false;
  const schedule = t.schedule || {};
  const steps = t.customSteps && t.customSteps.length > 0 ? t.customSteps : SCHEDULE_STEPS;

  steps.forEach(step => {
    const phase = schedule[step];
    if (phase) {
      const pStart = phase.plannedStart ? new Date(phase.plannedStart + 'T00:00:00').getTime() : null;
      const pEnd = phase.plannedEnd ? new Date(phase.plannedEnd + 'T00:00:00').getTime() : null;
      const aStart = phase.actualStart ? new Date(phase.actualStart + 'T00:00:00').getTime() : null;
      const aEnd = phase.actualEnd ? new Date(phase.actualEnd + 'T00:00:00').getTime() : null;

      const start = aStart || pStart;
      const end = aEnd || pEnd;

      if (start) { tMin = Math.min(tMin, start); hasDates = true; }
      if (end) { tMax = Math.max(tMax, end); hasDates = true; }
    }
  });

  if (hasDates && tMax < tMin) tMax = tMin + 86400000;
  return { tMin: hasDates ? tMin : null, tMax: hasDates ? tMax : null, hasDates };
};

// Uma demanda está atrasada quando ainda está em aberto (não concluída, não
// cancelada/paralisada/bloqueada — mesmo critério de "aberta" do Roadmap) e a
// data final do cronograma já passou.
const isTicketOverdue = (t, now = Date.now()) => {
  const isOpen = t.status !== '10 - Concluído' && !(t.status || '').startsWith('00');
  if (!isOpen) return false;
  const { tMax, hasDates } = getTicketScheduleRange(t);
  return hasDates && tMax < now;
};

// Remove o prefixo numérico de ordenação ("00 - ", "1 - "...) dos status para
// exibição em legendas e rótulos — a numeração existe para ordenar as colunas
// no banco, não é algo que o usuário final precise ler.
const friendlyStatusLabel = (status) => (status || '').replace(/^\d+\s*-\s*/, '');

// --- COMPONENTES REUTILIZÁVEIS ---
function RadarLogo({ className = '', compact = false }) {
  // `compact` é usado quando a barra lateral está recolhida: mantém só o
  // ícone girando (identidade visual reconhecível), sem o nome por extenso
  // e o slogan, que não caberiam numa coluna só de ícones.
  if (compact) {
    return (
      <div className={`relative flex items-center justify-center text-blue-500 shrink-0 ${className}`}>
        <Radar size={26} className="animate-[spin_4s_linear_infinite]" />
        <div className="absolute inset-0 border-2 border-blue-500 rounded-full animate-ping opacity-30"></div>
      </div>
    );
  }
  return (
    <div className={`flex flex-col items-center justify-center select-none ${className}`}>
      <div className="flex items-center gap-2">
        <div className="relative flex items-center justify-center text-blue-500">
          <Radar size={28} className="animate-[spin_4s_linear_infinite]" />
          <div className="absolute inset-0 border-2 border-blue-500 rounded-full animate-ping opacity-30"></div>
        </div>
        <h1 className="text-3xl font-black tracking-widest text-white uppercase drop-shadow-md">Radar</h1>
      </div>
      <p className="text-[8px] sm:text-[9px] uppercase tracking-[0.2em] text-blue-200 mt-1 font-bold text-center opacity-80">
        Solução em gestão de demandas
      </p>
    </div>
  );
}

// Item de navegação da barra lateral: com a barra recolhida, mostra só o
// ícone centralizado e move o rótulo para o `title` (tooltip nativo do
// navegador ao passar o mouse), em vez de duplicar o botão inteiro em cada
// um dos ~12 itens do menu com um `if` para o modo recolhido.
function NavButton({ icon, label, isActive, onClick, collapsed }) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`w-full flex items-center rounded-lg transition-colors ${collapsed ? 'justify-center py-3' : 'gap-3 px-4 py-3'} ${isActive ? 'bg-blue-600' : 'text-slate-300 hover:bg-slate-800'}`}
    >
      {icon}
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  );
}

function StatCard({ title, value, icon, color, onClick, isSelected, interactive = true, hint }) {
  return (
    <div
      onClick={interactive ? onClick : undefined}
      className={`bg-white p-4 rounded-xl shadow-sm border transition-all flex flex-col overflow-hidden min-w-0 ${interactive ? 'cursor-pointer' : ''} ${isSelected ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300 hover:shadow-md'}`}
    >
      <div className="flex items-center justify-between mb-3 gap-2">
        <h3 className="text-sm font-semibold text-slate-600 truncate flex-1">{title}</h3>
        <div className={`${color} text-white p-2 rounded-lg shrink-0`}>{icon}</div>
      </div>
      <p className="text-2xl font-black text-slate-800 truncate">{value}</p>
      {hint && <p className="text-[11px] text-slate-400 mt-0.5 truncate">{hint}</p>}
    </div>
  );
}

function ChartCard({ title, children, className = '' }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col ${className}`}>
      <h3 className="font-semibold text-slate-700 mb-6">{title}</h3>
      <div className="flex-1 w-full">{children}</div>
    </div>
  );
}

function MultiSelectFilter({ options, selected, onChange, label }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = (opt) => {
    if (opt === 'Todos') {
      onChange(['Todos']);
      return;
    }
    let newSelected = selected.includes('Todos') ? [] : [...selected];
    if (newSelected.includes(opt)) {
      newSelected = newSelected.filter(item => item !== opt);
      if (newSelected.length === 0) newSelected = ['Todos'];
    } else {
      newSelected.push(opt);
    }
    onChange(newSelected);
  };

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">{label}</label>
      <div 
        className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white cursor-pointer flex justify-between items-center"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate pr-2 font-medium text-slate-700">
          {selected.includes('Todos') ? 'Todos' : `${selected.length} item(s) selecionado(s)`}
        </span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
          <label className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 cursor-pointer text-sm font-bold text-slate-700 border-b border-slate-100 sticky top-0 bg-white">
            <input type="checkbox" checked={selected.includes('Todos')} onChange={() => handleToggle('Todos')} className="rounded text-blue-600 w-4 h-4" />
            Selecionar Todos
          </label>
          {options.map(opt => (
            <label key={opt} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm text-slate-600">
              <input type="checkbox" checked={selected.includes(opt)} onChange={() => handleToggle(opt)} className="rounded text-blue-600 w-4 h-4" />
              <span className="truncate">{opt}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// Filtro compacto de valor único: rótulo e seleção vivem lado a lado dentro
// de uma única pílula, em vez do padrão anterior (rótulo em cima, caixa
// embaixo) que empilhava a barra de filtros em duas linhas por campo.
function FilterSelect({ label, value, onChange, options, className = '' }) {
  return (
    <div className={`flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg pl-2.5 pr-1.5 py-1.5 hover:border-slate-300 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-colors ${className}`}>
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">{label}</span>
      <select
        className="bg-transparent outline-none text-sm font-medium text-slate-700 cursor-pointer min-w-0 max-w-[160px] truncate"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

// --- CONFIGURAÇÃO DA CLOUD (SUPABASE) ---
// Antes este app rodava só dentro do Gemini Canvas, que injetava a config do
// Firebase, o appId e o token de login como variáveis globais do ambiente
// (__firebase_config, __app_id, __initial_auth_token). Fora do Canvas nada
// disso existe. Agora o backend é o Supabase (ver src/lib/supabase.ts) e o
// `db`/`appId` abaixo só existem para manter a mesma "forma" de chamada do
// código original (doc/collection com um prefixo fixo) — ver
// src/lib/dataStore.ts para o motivo.
const appId = 'default-app-id';

export default function App() {
  // Antes: `user` era a sessão anônima do Firebase, só usada como sinal de
  // "já posso ler o banco". Com Supabase Auth, a sessão real É o login do
  // sistema (systemUser) — não existe mais um estado "autenticado mas anônimo".
  const [authChecked, setAuthChecked] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]); 
  const [projects, setProjects] = useState<any[]>([]); 
  const [demandTypes, setDemandTypes] = useState<any[]>([]); 
  const [systems, setSystems] = useState<any[]>([]); 
  const [appUsers, setAppUsers] = useState<any[]>([]); 
  const [sponsors, setSponsors] = useState<any[]>([]); 
  const [accessLogs, setAccessLogs] = useState<any[]>([]);
  const [presence, setPresence] = useState<any[]>([]);
  
  const [systemUser, setSystemUser] = useState<any>(null); // Utilizador Logado

  const [activeTab, setActiveTab] = useState('dashboard');
  // Preferência de UI (recolher a barra lateral pra só ícones) — persistida
  // localmente para o usuário não precisar reabrir a cada visita.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('radar_sidebar_collapsed') === '1';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem('radar_sidebar_collapsed', sidebarCollapsed ? '1' : '0');
    } catch {
      // Armazenamento local indisponível (modo privado, etc.) — a preferência
      // simplesmente não persiste entre sessões, sem quebrar a navegação.
    }
  }, [sidebarCollapsed]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [isNewTicket, setIsNewTicket] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<any>(null);
  const [listFilterStatus, setListFilterStatus] = useState('Todos');
  const [showProfileModal, setShowProfileModal] = useState(false);

  const handleNavigateToList = (statusFilter) => {
    setListFilterStatus(statusFilter);
    setActiveTab('list');
  };

  const handleLogin = async (loggedUser) => {
    setSystemUser(loggedUser);
    try {
       await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'presence', loggedUser.username), {
          name: loggedUser.name,
          role: loggedUser.roles ? loggedUser.roles.join(', ') : 'Não definido',
          isOnline: true,
          lastLogin: Date.now()
       });
       await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accessLogs', `LOG-${Date.now()}`), {
          name: loggedUser.name,
          username: loggedUser.username,
          role: loggedUser.roles ? loggedUser.roles.join(', ') : 'Não definido',
          action: 'LOGIN',
          timestamp: Date.now()
       });
    } catch(e) { console.error("Erro ao registrar log", e); }
  };

  const handleLogout = async () => {
    if (systemUser) {
       try {
         await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'presence', systemUser.username), {
            isOnline: false,
            lastLogout: Date.now()
         }, { merge: true });
         await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accessLogs', `LOG-${Date.now()}`), {
            name: systemUser.name,
            username: systemUser.username,
            role: systemUser.roles ? systemUser.roles.join(', ') : 'Não definido',
            action: 'LOGOUT',
            timestamp: Date.now()
         });
       } catch(e) {}
    }
    await authSignOut();
    setSystemUser(null);
    setActiveTab('dashboard');
  };

  const handleUpdateOwnPassword = async (oldPassword, newPassword) => {
    if (!systemUser) return;
    // Lança em caso de erro (senha atual incorreta, etc.) — o ResetPasswordModal
    // captura e mostra a mensagem no formulário.
    await updateOwnPassword(systemUser.email, oldPassword, newPassword);
    showToast("Senha redefinida com sucesso!", "success");
    setShowProfileModal(false);
  };

  // --- DETETAR QUANDO O UTILIZADOR FECHA A ABA/NAVEGADOR + HEARTBEAT ---
  useEffect(() => {
    if (!systemUser) return;

    // 1. Heartbeat (Ping) - Atualiza a presença a cada 30 segundos para provar que está online
    const updatePresence = () => {
      try {
        setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'presence', systemUser.username), {
          lastPing: Date.now(),
          isOnline: true
        }, { merge: true });
      } catch(e) {}
    };
    
    // Dispara imediatamente ao logar e depois repete a cada 30s
    updatePresence();
    const pingInterval = setInterval(updatePresence, 30000);

    // 2. Tentativa de desconexão limpa no fecho da aba (Fallback rápido)
    const handleBeforeUnload = () => {
       try {
         // Executamos a gravação imediatamente (sem await) para o navegador disparar antes da página morrer
         setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'presence', systemUser.username), {
            isOnline: false,
            lastLogout: Date.now()
         }, { merge: true });
         setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accessLogs', `LOG-${Date.now()}`), {
            name: systemUser.name,
            username: systemUser.username,
            role: systemUser.roles ? systemUser.roles.join(', ') : 'Não definido',
            action: 'LOGOUT_TAB_CLOSED',
            timestamp: Date.now()
         });
       } catch(e) {}
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      clearInterval(pingInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [systemUser, appId]);

  // --- SESSÃO DO SUPABASE AUTH ---
  // Ao carregar, tenta restaurar uma sessão existente (usuário já logado
  // antes, ex.: recarregou a página). Depois, ouve mudanças de sessão
  // (login/logout em qualquer aba) e mantém `systemUser` (perfil + roles)
  // sincronizado com o usuário autenticado.
  useEffect(() => {
    let active = true;

    const loadFromSession = async (session) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        if (!active) return;
        if (profile) setSystemUser({ ...profile, email: session.user.email || profile.email });
        else setSystemUser(null);
      } else {
        if (active) setSystemUser(null);
      }
    };

    (async () => {
      try {
        const session = await getSession();
        await loadFromSession(session);
      } catch (error) {
        console.error("Erro ao recuperar sessão:", error);
      } finally {
        if (active) setAuthChecked(true);
      }
    })();

    const unsubscribe = onAuthStateChange((session) => { loadFromSession(session); });
    return () => { active = false; unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!systemUser) return;

    // TICKETS
    const ticketsRef = collection(db, 'artifacts', appId, 'public', 'data', 'tickets');
    const unsubscribeTickets = onSnapshot(ticketsRef, async (snapshot) => {
      if (snapshot.empty) {
        for (const t of initialTickets) {
          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tickets', t.id), t);
        }
        setIsLoading(false);
        return;
      }
      const fetchedTickets = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      fetchedTickets.sort((a, b) => {
        const numA = parseInt(a.id.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.id.replace(/\D/g, '')) || 0;
        return numB - numA; 
      });
      setTickets(fetchedTickets);
      setIsLoading(false);
    }, (error) => {
      console.error("Erro ao carregar dados:", error);
      setIsLoading(false);
      showToast("Erro ao carregar base de dados.", "error");
    });

    // USERS (RBAC) — lê da tabela `profiles` (ligada ao Supabase Auth).
    // Diferente das outras coleções, esta nunca é "semeada" automaticamente
    // aqui: criar um login exige a Edge Function admin-users (ver
    // src/lib/adminUsers.ts), porque precisa da service_role key.
    const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'profiles');
    const unsubscribeUsers = onSnapshot(usersRef, (snapshot) => {
      const fetchedUsers = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
           ...data,
           id: doc.id,
           roles: data.roles || (data.role ? [data.role] : ['Analista']) // Compatibilidade com dados antigos
        };
      });
      setAppUsers(fetchedUsers);
    }, (error) => console.error("Erro ao carregar usuários:", error));

    // REPORTS
    const reportsRef = collection(db, 'artifacts', appId, 'public', 'data', 'reports');
    const unsubscribeReports = onSnapshot(reportsRef, (snapshot) => {
      const fetchedReports = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      fetchedReports.sort((a, b) => b.createdAt - a.createdAt);
      setReports(fetchedReports);
    }, (error) => console.error("Erro ao carregar relatórios:", error));

    // PROJECTS
    const projectsRef = collection(db, 'artifacts', appId, 'public', 'data', 'projects');
    const unsubscribeProjects = onSnapshot(projectsRef, (snapshot) => {
      const fetchedProjects = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setProjects(fetchedProjects);
    }, (error) => console.error("Erro ao carregar projetos:", error));

    // DEMAND TYPES 
    const typesRef = collection(db, 'artifacts', appId, 'public', 'data', 'demandTypes');
    const unsubscribeTypes = onSnapshot(typesRef, async (snapshot) => {
      if (snapshot.empty) {
        for (const t of initialDemandTypes) { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'demandTypes', t.id), t); }
        return;
      }
      const fetchedTypes = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      fetchedTypes.sort((a, b) => a.name.localeCompare(b.name));
      setDemandTypes(fetchedTypes);
    }, (error) => console.error("Erro ao carregar tipos de demanda:", error));

    // SYSTEMS
    const sysRef = collection(db, 'artifacts', appId, 'public', 'data', 'systems');
    const unsubscribeSystems = onSnapshot(sysRef, async (snapshot) => {
      if (snapshot.empty) {
        for (const s of initialSystems) { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'systems', s.id), s); }
        return;
      }
      const fetchedSys = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      fetchedSys.sort((a, b) => a.name.localeCompare(b.name));
      setSystems(fetchedSys);
    }, (error) => console.error("Erro ao carregar sistemas:", error));

    // SPONSORS
    const sponRef = collection(db, 'artifacts', appId, 'public', 'data', 'sponsors');
    const unsubscribeSponsors = onSnapshot(sponRef, async (snapshot) => {
      if (snapshot.empty) {
        for (const s of initialSponsors) { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sponsors', s.id), s); }
        return;
      }
      const fetchedSponsors = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      fetchedSponsors.sort((a, b) => a.name.localeCompare(b.name));
      setSponsors(fetchedSponsors);
    }, (error) => console.error("Erro ao carregar patrocinadores:", error));

    // PRESENCE (Usuários Online)
    const presenceRef = collection(db, 'artifacts', appId, 'public', 'data', 'presence');
    const unsubscribePresence = onSnapshot(presenceRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), username: doc.id }));
      setPresence(data);
    }, (err) => console.error(err));

    // ACCESS LOGS (Histórico)
    const logsRef = collection(db, 'artifacts', appId, 'public', 'data', 'accessLogs');
    const unsubscribeAccessLogs = onSnapshot(logsRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      data.sort((a, b) => b.timestamp - a.timestamp);
      setAccessLogs(data);
    }, (err) => console.error(err));

    return () => {
      unsubscribeTickets();
      unsubscribeReports();
      unsubscribeProjects();
      unsubscribeTypes();
      unsubscribeSystems();
      unsubscribeUsers();
      unsubscribeSponsors();
      unsubscribePresence();
      unsubscribeAccessLogs();
    };
  }, [systemUser, appId]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSaveDemandType = async (typeName) => {
    if (!systemUser || !typeName.trim()) return;
    try {
      const newId = `TYPE-${Date.now()}`;
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'demandTypes', newId), { name: typeName.trim() });
      showToast("Tipo de demanda adicionado com sucesso!");
    } catch (e) { showToast("Erro ao adicionar tipo de demanda.", "error"); }
  };

  const handleDeleteDemandType = async (typeId) => {
    if (!systemUser) return;
    try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'demandTypes', typeId)); showToast("Tipo de demanda removido.", "success"); } 
    catch (e) { showToast("Erro ao remover tipo de demanda.", "error"); }
  };

  const handleSaveSystem = async (systemName) => {
    if (!systemUser || !systemName.trim()) return;
    try {
      const newId = `SYS-${Date.now()}`;
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'systems', newId), { name: systemName.trim() });
      showToast("Sistema adicionado com sucesso!");
    } catch (e) { showToast("Erro ao adicionar sistema.", "error"); }
  };

  const handleDeleteSystem = async (systemId) => {
    if (!systemUser) return;
    try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'systems', systemId)); showToast("Sistema removido.", "success"); } 
    catch (e) { showToast("Erro ao remover sistema.", "error"); }
  };

  const handleSaveSponsor = async (sponsorData) => {
    if (!systemUser || !sponsorData.name.trim()) return;
    try {
      const newId = sponsorData.id || `SPO-${Date.now()}`;
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sponsors', newId), { name: sponsorData.name.trim(), email: sponsorData.email?.trim() || '' }, { merge: true });
      showToast("Patrocinador salvo com sucesso!");
    } catch (e) { showToast("Erro ao salvar patrocinador.", "error"); }
  };

  const handleDeleteSponsor = async (sponsorId) => {
    if (!systemUser) return;
    try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sponsors', sponsorId)); showToast("Patrocinador removido.", "success"); } 
    catch (e) { showToast("Erro ao remover patrocinador.", "error"); }
  };

  const handleSaveAppUser = async (userData) => {
    if (!systemUser) return;
    if (!userData.id) {
      // Usuário novo: precisa criar o login no Supabase Auth (server-side).
      await adminCreateUser({
        email: userData.email,
        password: userData.password,
        username: userData.username,
        name: userData.name,
        roles: userData.roles,
      });
      showToast("Usuário criado com sucesso!");
      return;
    }
    // Usuário existente: só atualiza nome/roles/estado no perfil.
    try {
      const { password, email, ...profileData } = userData;
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'profiles', userData.id), profileData, { merge: true });
      showToast("Usuário guardado com sucesso!");
    } catch (e) { showToast("Erro ao guardar usuário.", "error"); }
  };

  const handleDeleteAppUser = async (userId) => {
    if (!systemUser) return;
    try {
      await adminDeleteUser(userId);
      showToast("Usuário removido.", "success");
    } catch (e) { showToast("Erro ao remover usuário.", "error"); }
  };

  // NOTA: o código original tinha aqui handleSaveRole/handleDeleteRole/hasPermission,
  // que liam um estado `rolesConfig` que nunca chegou a ser declarado (nenhum
  // useState, nenhuma tela usava essas funções). Isso não compilava fora do
  // Canvas (ReferenceError em runtime, erro de tipo em build). Removido por
  // ser código morto — os perfis de acesso (Admin/Key User/Analista) hoje
  // são fixos, geridos em UserManagementSection.

  const handleSaveTicket = async (updatedTicket) => {
    if (!systemUser) { showToast("Sessão expirada ou utilizador não autenticado.", "error"); return; }
    let finalId = updatedTicket.id?.trim();
    const oldId = selectedTicket ? selectedTicket.id : null;

    if (isNewTicket) {
       if (!finalId) { finalId = `TKTI-${Math.floor(Math.random() * 100000)}`; } 
       else if (tickets.some(t => t.id === finalId)) { showToast("Este ID já existe. Escolha outro ou deixe em branco.", "error"); return; }
    } else { 
       if (!finalId) return; 
       if (oldId && oldId !== finalId && tickets.some(t => t.id === finalId)) {
          showToast("Este novo ID já está em uso por outra demanda.", "error"); return;
       }
    }

    updatedTicket.id = finalId;
    updatedTicket.lastUpdatedAt = new Date().toISOString();
    
    // Auto assinar o autor correto baseando-se no utilizador logado
    if (isNewTicket && systemUser) {
        if (systemUser.roles?.includes('Key User') && !updatedTicket.keyUser) updatedTicket.keyUser = systemUser.name;
        if (systemUser.roles?.includes('Analista') && !updatedTicket.analyst) updatedTicket.analyst = systemUser.name;
    }

    setTickets(prev => {
      if (isNewTicket) return [updatedTicket, ...prev];
      const targetId = oldId && oldId !== finalId ? oldId : finalId;
      return prev.map(t => t.id === targetId ? updatedTicket : t);
    });

    try {
      const cleanTicket = JSON.parse(JSON.stringify(updatedTicket));
      
      if (!isNewTicket && oldId && oldId !== finalId) {
         await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tickets', oldId));
      }

      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tickets', finalId), cleanTicket, { merge: true });
      showToast(isNewTicket ? "Nova demanda criada com sucesso!" : "Demanda guardada com sucesso!");
      if (selectedTicket && activeTab !== 'onepage') { setSelectedTicket(null); setIsNewTicket(false); }
    } catch (error) { showToast("Erro ao guardar no banco de dados. Tente novamente.", "error"); }
  };

  const handleUpdateSprint = async (ticketId, newSprint) => {
    if (!systemUser) return;
    const nowIso = new Date().toISOString();
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, sprint: newSprint, lastUpdatedAt: nowIso } : t));
    try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tickets', ticketId), { sprint: newSprint || "", lastUpdatedAt: nowIso }, { merge: true }); showToast("Sprint gravada com sucesso!", "success"); } 
    catch (error) { showToast("Erro ao gravar Sprint no banco de dados.", "error"); }
  };

  const handleUpdateTicketStatus = async (ticketId, newStatus) => {
    if (!systemUser) return;
    const ticketToUpdate = tickets.find(t => t.id === ticketId);
    if (!ticketToUpdate || ticketToUpdate.status === newStatus) return;

    const today = new Date().toISOString().split('T')[0];
    const nowIso = new Date().toISOString();
    const currentHistory = ticketToUpdate.statusHistory || [{ status: ticketToUpdate.status, date: ticketToUpdate.logs?.[0]?.date || today }];
    const newHistory = [...currentHistory, { status: newStatus, date: today }];

    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus, statusHistory: newHistory, lastUpdatedAt: nowIso } : t));
    try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tickets', ticketId), { status: newStatus, statusHistory: newHistory, lastUpdatedAt: nowIso }, { merge: true }); showToast(`Status atualizado para ${newStatus}`, "success"); } 
    catch (error) { showToast("Erro ao gravar novo status.", "error"); }
  };

  const handleImportJSON = (event) => {
    if (!systemUser || !systemUser?.roles?.includes('Admin')) return;
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        setIsLoading(true);

        if (Array.isArray(importedData)) {
          for (const t of importedData) await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tickets', t.id), t, { merge: true });
        } else if (importedData && typeof importedData === 'object') {
          if (importedData.tickets) for (const t of importedData.tickets) await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tickets', t.id), t, { merge: true });
          if (importedData.projects) for (const p of importedData.projects) await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'projects', p.id), p, { merge: true });
          if (importedData.demandTypes) for (const dt of importedData.demandTypes) await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'demandTypes', dt.id), dt, { merge: true });
          if (importedData.systems) for (const sys of importedData.systems) await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'systems', sys.id), sys, { merge: true });
          // Contas de usuário (login) não são restauradas por aqui: exigem o Supabase Auth
          // (ver UserManagementSection / src/lib/adminUsers.ts), não apenas uma linha de tabela.
          if (importedData.sponsors) for (const sp of importedData.sponsors) await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sponsors', sp.id), sp, { merge: true });
        }
        showToast("Backup importado e restaurado com sucesso!", "success");
      } catch (error) { showToast("Erro ao ler o ficheiro.", "error"); } finally { setIsLoading(false); }
    };
    reader.readAsText(file);
    event.target.value = null; 
  };

  const handleCreateNewTicket = () => {
    const canCreate = systemUser?.roles?.includes('Admin') || systemUser?.roles?.includes('Key User');
    if (!canCreate) {
      showToast("Acesso negado: Analistas não podem criar novas demandas.", "error");
      return;
    }
    try {
      const today = new Date().toISOString().split('T')[0];
      const defaultType = demandTypes.length > 0 ? demandTypes[0].name : '';
      
      let defaultKeyUser = '';
      let defaultAnalyst = '';
      if (systemUser) {
         if (systemUser.roles?.includes('Key User')) defaultKeyUser = systemUser.name;
         if (systemUser.roles?.includes('Analista')) defaultAnalyst = systemUser.name;
      }

      setSelectedTicket({
        id: '', description: '', scope: '', keyUser: defaultKeyUser, analyst: defaultAnalyst, recursos: [], sponsor: '', sprint: '', type: defaultType, sistema: '',
        responsavelCusto: 'TI', areaSolicitante: '',
        status: '1 - Em analise', progress: 0, goLive: '', logs: [],
        statusHistory: [{ status: '1 - Em analise', date: today }], schedule: {}, customSteps: [...SCHEDULE_STEPS]
      });
      setIsNewTicket(true);
    } catch (error) { showToast("Erro ao abrir formulário de nova demanda.", "error"); }
  };

  const handleDeleteTicket = async () => {
    if (!systemUser || !ticketToDelete) return;
    try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tickets', ticketToDelete.id)); setTicketToDelete(null); setSelectedTicket(null); showToast("Demanda excluída com sucesso."); } 
    catch (error) { showToast("Erro ao excluir demanda.", "error"); }
  };

  const handleSaveReport = async (reportContent, filterSummary) => {
    if (!systemUser) return;
    try { await setDoc(doc(collection(db, 'artifacts', appId, 'public', 'data', 'reports')), { content: reportContent, filterSummary: filterSummary, createdAt: Date.now() }); showToast("Relatório salvo com sucesso no histórico!"); } 
    catch (error) { showToast("Erro ao salvar relatório.", "error"); }
  };

  const handleDeleteReport = async (reportId) => {
    if (!systemUser) return;
    try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'reports', reportId)); showToast("Relatório excluído do histórico."); } 
    catch (error) { showToast("Erro ao excluir relatório.", "error"); }
  };

  const handleSaveProject = async (projectData, linkedTicketIds) => {
    if (!systemUser) return;
    let finalId = projectData.id?.trim() || `PRJ-${Math.floor(Math.random() * 100000)}`;
    projectData.id = finalId;
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'projects', finalId), projectData, { merge: true });
      if (Array.isArray(linkedTicketIds)) {
        for (const t of tickets) {
          const currentProjectIds = t.projectIds || [];
          if (t.projectId && !currentProjectIds.includes(t.projectId)) currentProjectIds.push(t.projectId);
          const shouldBeLinked = linkedTicketIds.includes(t.id);
          const isLinked = currentProjectIds.includes(finalId);
          if (shouldBeLinked && !isLinked) await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tickets', t.id), { projectIds: [...currentProjectIds, finalId], projectId: '' }, { merge: true });
          else if (!shouldBeLinked && isLinked) await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tickets', t.id), { projectIds: currentProjectIds.filter(id => id !== finalId), projectId: '' }, { merge: true });
        }
      }
      showToast("Capa de projeto salva com sucesso!");
    } catch (e) { showToast("Erro ao salvar projeto.", "error"); }
  };

  const handleDeleteProject = async (projectId) => {
    if (!systemUser) return;
    const linkedTickets = tickets.filter(t => (t.projectIds || []).includes(projectId) || t.projectId === projectId);
    if (linkedTickets.length > 0) { showToast("Não é possível excluir a capa. Existem demandas associadas.", "error"); return; }
    try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'projects', projectId)); showToast("Capa excluída com sucesso."); } 
    catch (e) { showToast("Erro ao excluir capa.", "error"); }
  };

  // ==========================================
  // FILTRAGEM DE ACESSO (RBAC)
  // ==========================================
  const accessibleTickets = useMemo(() => {
    if (!systemUser || !systemUser.roles) return [];
    if (systemUser.roles.includes('Admin')) return tickets;
    
    const isAnalyst = systemUser.roles.includes('Analista');
    const isKeyUser = systemUser.roles.includes('Key User');
    
    return tickets.filter(t => {
      const asAnalyst = isAnalyst && (t.analyst === systemUser.name || (t.analyst || '').includes(systemUser.name));
      const asKeyUser = isKeyUser && (t.keyUser === systemUser.name || (t.keyUser || '').includes(systemUser.name));
      return asAnalyst || asKeyUser;
    });
  }, [tickets, systemUser]);

  // 1) Ainda não sabemos se há uma sessão Supabase válida -> spinner.
  if (!authChecked) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 size={36} className="animate-spin text-blue-600" /></div>;

  // 2) Sabemos que não há sessão -> tela de login (login é feito direto no Supabase Auth).
  if (!systemUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // 3) Há sessão, mas os dados (tickets, etc.) ainda estão a carregar -> spinner.
  if (isLoading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 size={36} className="animate-spin text-blue-600" /></div>;

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          html, body, #root { height: auto !important; overflow: visible !important; min-height: 100% !important; display: block !important; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background-color: white !important; }
          .break-after-page { break-after: page; page-break-after: always; display: block; }
          .no-break { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>
      <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-800 print:block print:bg-white">
        <aside className={`w-full ${sidebarCollapsed ? 'md:w-20' : 'md:w-64'} bg-slate-900 text-white flex flex-col shadow-xl z-10 shrink-0 print:hidden transition-[width] duration-200`}>
          <div className={`border-b border-slate-800 bg-slate-950/30 ${sidebarCollapsed ? 'p-3' : 'p-6'}`}>
            <div className={`flex items-center ${sidebarCollapsed ? 'flex-col gap-2' : 'justify-between'}`}>
              <RadarLogo compact={sidebarCollapsed} className={sidebarCollapsed ? '' : 'scale-95 origin-left'} />
              {/* Recolher/expandir só existe em telas médias+ (md:) — no celular a barra
                  já vira uma faixa no topo, onde esconder rótulos não ganha espaço real. */}
              <button
                onClick={() => setSidebarCollapsed(v => !v)}
                className="hidden md:flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
                title={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
              >
                {sidebarCollapsed ? <ChevronRight size={16}/> : <ChevronLeft size={16}/>}
              </button>
            </div>
            {!sidebarCollapsed && (
              <div className="flex items-center justify-between mt-6">
                <p className="text-[10px] text-slate-400 flex items-center gap-1"><Sparkles size={12} className="text-yellow-400"/> AI Powered</p>
                <span className="text-[10px] font-mono text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded-full border border-slate-700/50 cursor-default" title="Versão 0.2.3 (Múltiplos Perfis)">v0.2.3</span>
              </div>
            )}
          </div>

          {(systemUser.roles?.includes('Admin') || systemUser.roles?.includes('Key User')) && (
            <div className={`mb-4 ${sidebarCollapsed ? 'px-2' : 'px-4'}`}>
               <button onClick={handleCreateNewTicket} title="Nova Demanda" className={`w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg flex items-center justify-center gap-2 text-sm font-bold transition-all shadow-lg border border-emerald-400 active:scale-95 ${sidebarCollapsed ? 'p-3' : 'px-4 py-3'}`}>
                 <Plus size={20} /> {!sidebarCollapsed && 'Nova Demanda'}
               </button>
            </div>
          )}

          <nav className={`flex-1 space-y-2 overflow-y-auto pb-4 ${sidebarCollapsed ? 'px-2' : 'px-4'}`}>
            <NavButton collapsed={sidebarCollapsed} icon={<LayoutDashboard size={20} />} label="Principal" isActive={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
            <NavButton collapsed={sidebarCollapsed} icon={<TrendingUp size={20} />} label="Dashboards Estatísticos" isActive={activeTab === 'statistics'} onClick={() => setActiveTab('statistics')} />
            <NavButton collapsed={sidebarCollapsed} icon={<FolderTree size={20} />} label="Capas (Projetos)" isActive={activeTab === 'projects'} onClick={() => setActiveTab('projects')} />
            <NavButton collapsed={sidebarCollapsed} icon={<Map size={20} />} label="Roadmap Global" isActive={activeTab === 'roadmap'} onClick={() => setActiveTab('roadmap')} />
            <NavButton collapsed={sidebarCollapsed} icon={<Kanban size={20} />} label="Kanban" isActive={activeTab === 'kanban'} onClick={() => setActiveTab('kanban')} />
            <NavButton collapsed={sidebarCollapsed} icon={<ListTodo size={20} />} label="Demandas" isActive={activeTab === 'list'} onClick={() => setActiveTab('list')} />
            <NavButton collapsed={sidebarCollapsed} icon={<ClipboardList size={20} />} label="Status Report" isActive={activeTab === 'statusreport'} onClick={() => setActiveTab('statusreport')} />
            <NavButton collapsed={sidebarCollapsed} icon={<FileText size={20} />} label="One Page" isActive={activeTab === 'onepage'} onClick={() => setActiveTab('onepage')} />
            <NavButton collapsed={sidebarCollapsed} icon={<Printer size={20} />} label="Relatório PDF" isActive={activeTab === 'pdfexport'} onClick={() => setActiveTab('pdfexport')} />

            {systemUser.roles?.includes('Admin') && (
              <>
                <NavButton collapsed={sidebarCollapsed} icon={<Database size={20} />} label="Backup Dados" isActive={activeTab === 'export'} onClick={() => setActiveTab('export')} />
                <NavButton collapsed={sidebarCollapsed} icon={<Radio size={20} />} label="Monitoramento (Logs)" isActive={activeTab === 'accesslogs'} onClick={() => setActiveTab('accesslogs')} />
                <div className="pt-4 mt-4 border-t border-slate-800"></div>
                <NavButton collapsed={sidebarCollapsed} icon={<Settings size={20} />} label="Configurações" isActive={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
              </>
            )}
          </nav>

          <div className={`border-t border-slate-800 bg-slate-950/50 mt-auto shrink-0 flex items-center ${sidebarCollapsed ? 'flex-col gap-2 p-3' : 'justify-between p-4'}`}>
            {!sidebarCollapsed && (
              <div className="flex flex-col overflow-hidden mr-2">
                 <span className="text-sm font-bold text-white truncate">{systemUser.name}</span>
                 <span className="text-[10px] uppercase font-bold text-slate-400 truncate flex items-center gap-1"><Shield size={10}/> Perfil: {systemUser.roles?.join(', ')}</span>
              </div>
            )}
            <div className={`flex items-center gap-1 shrink-0 ${sidebarCollapsed ? 'flex-col' : ''}`}>
              <button onClick={() => setShowProfileModal(true)} className="p-2 bg-slate-800 hover:bg-blue-500 rounded-lg text-slate-300 hover:text-white transition-colors" title="Redefinir Senha"><KeyRound size={16}/></button>
              <button onClick={handleLogout} className="p-2 bg-slate-800 hover:bg-red-600 rounded-lg text-slate-300 hover:text-white transition-colors" title="Encerrar Sessão"><LogOut size={16}/></button>
            </div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col h-screen overflow-hidden print:h-auto print:overflow-visible print:block relative z-0">
          <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center shrink-0 relative z-50 shadow-sm print:hidden">
            <h2 className="text-xl font-semibold text-slate-800">
              {activeTab === 'dashboard' && 'Principal'}
              {activeTab === 'statistics' && 'Dashboards Estatísticos e Métricas'}
              {activeTab === 'projects' && 'Capas de Projetos (Macro)'}
              {activeTab === 'roadmap' && 'Roadmap Global (Gantt)'}
              {activeTab === 'kanban' && 'Quadro Kanban'}
              {activeTab === 'list' && 'Lista de Demandas'}
              {activeTab === 'statusreport' && 'Status Report Executivo'}
              {activeTab === 'onepage' && 'One Page: Visão Detalhada'}
              {activeTab === 'pdfexport' && 'Exportação de Relatório PDF'}
              {activeTab === 'export' && 'Extração e Backup de Dados'}
              {activeTab === 'accesslogs' && 'Monitoramento de Acessos'}
              {activeTab === 'settings' && 'Configurações do Sistema'}
            </h2>
            {!systemUser.roles?.includes('Admin') && <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-200 flex items-center gap-2"><Lock size={12}/> Visão Filtrada: {systemUser.name}</div>}
          </header>

          <div className="flex-1 overflow-auto p-4 md:p-8 print:p-0 print:overflow-visible print:block relative z-10">
            {activeTab === 'dashboard' && <DashboardView tickets={accessibleTickets} onNavigateToList={handleNavigateToList} />}
          {activeTab === 'statistics' && <StatisticsDashboardView tickets={accessibleTickets} />}
          {activeTab === 'projects' && <ProjectsView projects={projects} tickets={accessibleTickets} onSaveProject={handleSaveProject} onDeleteProject={handleDeleteProject} onSelectTicket={(t) => { setSelectedTicket(t); setIsNewTicket(false); }} systemUser={systemUser} />}
          {activeTab === 'roadmap' && <RoadmapView tickets={accessibleTickets} sponsors={sponsors} systems={systems} onSelect={setSelectedTicket} />}
          {activeTab === 'kanban' && <KanbanView tickets={accessibleTickets} onSelect={setSelectedTicket} onStatusChange={handleUpdateTicketStatus} />}
          {activeTab === 'list' && <TicketList tickets={accessibleTickets} onSelect={setSelectedTicket} onDeleteClick={setTicketToDelete} onUpdateSprint={handleUpdateSprint} filterStatus={listFilterStatus} setFilterStatus={setListFilterStatus} demandTypes={demandTypes} systems={systems} sponsors={sponsors} />}
          {activeTab === 'statusreport' && <StatusReportView tickets={accessibleTickets} onSelect={setSelectedTicket} reports={reports} onSaveReport={handleSaveReport} onDeleteReport={handleDeleteReport} />}
          {activeTab === 'onepage' && <OnePageView tickets={accessibleTickets} onSave={handleSaveTicket} systemUser={systemUser} />}
          {activeTab === 'pdfexport' && <PdfReportView tickets={accessibleTickets} showToast={showToast} />}
          {activeTab === 'export' && <DataExportView tickets={accessibleTickets} projects={projects} demandTypes={demandTypes} systems={systems} appUsers={appUsers} sponsors={sponsors} onImportJSON={handleImportJSON} />}
          {activeTab === 'accesslogs' && <AccessLogsView accessLogs={accessLogs} presence={presence} />}
          {activeTab === 'settings' && <SettingsView demandTypes={demandTypes} onAdd={handleSaveDemandType} onDelete={handleDeleteDemandType} systems={systems} onAddSystem={handleSaveSystem} onDeleteSystem={handleDeleteSystem} appUsers={appUsers} onSaveAppUser={handleSaveAppUser} onDeleteAppUser={handleDeleteAppUser} sponsors={sponsors} onSaveSponsor={handleSaveSponsor} onDeleteSponsor={handleDeleteSponsor} />}
        </div>
      </main>

      {['dashboard', 'kanban', 'list', 'statusreport', 'roadmap'].includes(activeTab) && (systemUser.roles?.includes('Admin') || systemUser.roles?.includes('Key User')) && (
          <button
            onClick={handleCreateNewTicket}
            className="fixed bottom-6 right-6 md:bottom-10 md:right-10 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-2xl z-[99999] flex items-center justify-center transition-transform hover:scale-110 print:hidden group border-4 border-white"
            title="Nova Demanda"
          >
            <Plus size={28} />
            <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 ease-in-out font-bold text-sm flex items-center">
              <span className="pl-2 pr-1">Criar Demanda</span>
            </span>
          </button>
    )}

    {selectedTicket && activeTab !== 'onepage' && (
      <TicketModal ticket={selectedTicket} projects={projects} demandTypes={demandTypes} systems={systems} appUsers={appUsers} systemUser={systemUser} sponsors={sponsors} onClose={() => { setSelectedTicket(null); setIsNewTicket(false); }} onSave={handleSaveTicket} isNew={isNewTicket} />
    )}

    {ticketToDelete && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 print:hidden">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
              <div className="flex items-center gap-4 text-red-600 mb-4">
                <div className="bg-red-100 p-3 rounded-full shrink-0"><AlertTriangle size={24} /></div>
                <h3 className="text-lg font-bold text-slate-800">Excluir Demanda</h3>
              </div>
              <p className="text-slate-600 mb-6">Tem a certeza que pretende excluir a demanda <strong>{ticketToDelete.id}</strong>?</p>
              <div className="flex justify-end gap-3">
              <button onClick={() => setTicketToDelete(null)} className="px-4 py-2 rounded-lg font-medium text-slate-600 hover:bg-slate-100">Cancelar</button>
              <button onClick={handleDeleteTicket} className="px-4 py-2 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700">Excluir Demanda</button>
            </div>
          </div>
        </div>
      )}

      {showProfileModal && (
        <ResetPasswordModal user={systemUser} onClose={() => setShowProfileModal(false)} onSave={handleUpdateOwnPassword} />
      )}

      {toast && (
        <div className={`fixed bottom-4 right-4 px-5 py-4 rounded-xl shadow-2xl border flex items-center gap-3 z-[99999] animate-in slide-in-from-bottom-5 print:hidden ${toast.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
            {toast.type === 'error' ? <AlertCircle size={24} /> : <CheckCircle2 size={24} />}
            <p className="font-bold text-sm">{toast.msg}</p>
          </div>
        )}
      </div>
    </>
  );
}

// ==========================================
// COMPONENTE DE LOGIN (TELA INICIAL)
// ==========================================
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const { data, error: authError } = await signInWithPassword(email.trim(), password);
      if (authError || !data.user) {
        setError('Credenciais inválidas. Verifique o e-mail e a senha.');
        return;
      }
      const profile = await fetchProfile(data.user.id);
      if (!profile) {
        setError('Login efetuado, mas não há perfil de acesso associado a este usuário. Contacte o administrador.');
        await authSignOut();
        return;
      }
      if (profile.blocked) {
        setError('Conta bloqueada. Contacte o administrador.');
        await authSignOut();
        return;
      }
      onLogin({ ...profile, email: data.user.email || profile.email });
    } catch (err) {
      setError('Não foi possível entrar. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-900 p-8 flex flex-col items-center justify-center text-center">
          <RadarLogo className="mb-5" />
          <div className="w-12 h-1 bg-blue-600 rounded-full mb-3"></div>
          <h2 className="text-sm font-bold text-slate-300 tracking-wide uppercase">Acesso ao Sistema</h2>
        </div>
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm font-medium">{error}</div>}
            
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">E-mail</label>
              <div className="relative">
                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="ex: nome@empresa.com" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Senha</label>
              <div className="relative">
                <KeyRound size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="password" required value={password} onChange={e=>setPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="••••••••" />
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg flex justify-center items-center gap-2 transition-colors mt-4 disabled:opacity-60">
              <Lock size={18}/> {isSubmitting ? 'A entrar...' : 'Entrar no Sistema'}
            </button>
          </form>
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
             <p className="text-xs text-slate-400 font-medium">Ambiente Seguro e Monitorizado</p>
             <p className="text-[10px] text-slate-400 mt-1 font-bold uppercase tracking-wider">Versão v0.2.2</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ==========================================
// COMPONENTE DE REDEFINIÇÃO DE SENHA
// ==========================================
function ResetPasswordModal({ user, onClose, onSave }) {
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // A senha atual não é mais comparada no cliente (o Supabase Auth não expõe
  // a senha salva) — a validação da senha atual é feita reautenticando no
  // servidor, dentro de onSave (handleUpdateOwnPassword).
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (newPass !== confirmPass) {
      setError("As novas senhas não coincidem.");
      return;
    }
    if (newPass.length < 6) {
      setError("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setIsSaving(true);
    try {
      await onSave(oldPass, newPass);
    } catch (err) {
      setError(err?.message || "Não foi possível atualizar a senha.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-[9999] p-4 print:hidden">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col animate-in fade-in">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-lg text-slate-800">Redefinir Senha</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg font-medium border border-red-100">{error}</div>}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Senha Atual</label>
            <input type="password" required value={oldPass} onChange={e=>setOldPass(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white" placeholder="Sua senha atual..." />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nova Senha</label>
            <input type="password" required value={newPass} onChange={e=>setNewPass(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white" placeholder="Mínimo 4 caracteres..." />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Confirmar Nova Senha</label>
            <input type="password" required value={confirmPass} onChange={e=>setConfirmPass(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white" placeholder="Repita a nova senha..." />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>
            <button type="submit" disabled={isSaving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-60">{isSaving ? 'A guardar...' : 'Guardar Senha'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// VIEWS DO SISTEMA
// ==========================================

function RoadmapView({ tickets, sponsors, systems, onSelect }) {
  const [filterSprint, setFilterSprint] = useState('Todas');
  const [filterSponsor, setFilterSponsor] = useState('Todos');
  const [filterKeyUser, setFilterKeyUser] = useState('Todos');
  const [filterAnalyst, setFilterAnalyst] = useState('Todos');
  const [filterSistema, setFilterSistema] = useState('Todos');
  const [filterCronograma, setFilterCronograma] = useState('Todos');
  const [filterRecurso, setFilterRecurso] = useState('Todos');

  const sprints = useMemo(() => ['Todas', ...new Set(tickets.map(t => t.sprint).filter(Boolean))].sort(), [tickets]);
  const sponsorsList = useMemo(() => ['Todos', ...new Set(sponsors.map(s => s.name))].sort(), [sponsors]);
  const keyUsers = useMemo(() => ['Todos', ...new Set(tickets.map(t => t.keyUser).filter(Boolean))].sort(), [tickets]);
  const analysts = useMemo(() => ['Todos', ...new Set(tickets.map(t => t.analyst).filter(Boolean))].sort(), [tickets]);
  const sistemasList = useMemo(() => ['Todos', ...new Set(systems.map(s => s.name))].sort(), [systems]);
  
  const recursosList = useMemo(() => {
    const allRecursos = [];
    tickets.forEach(t => {
      if (t.recursos && t.recursos.length > 0) allRecursos.push(...t.recursos);
      else if (t.recurso) allRecursos.push(t.recurso);
    });
    return ['Todos', ...new Set(allRecursos)].sort();
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      // Mostrar apenas demandas em aberto (ignora Concluídos, Cancelados, Paralisados e Bloqueados)
      const isOpen = t.status !== '10 - Concluído' && !t.status.startsWith('00');
      if (!isOpen) return false;
      
      if (filterSprint !== 'Todas' && t.sprint !== filterSprint) return false;
      if (filterSponsor !== 'Todos' && t.sponsor !== filterSponsor) return false;
      if (filterKeyUser !== 'Todos' && t.keyUser !== filterKeyUser) return false;
      if (filterAnalyst !== 'Todos' && t.analyst !== filterAnalyst) return false;
      if (filterSistema !== 'Todos' && (t.sistema || 'Não Definido') !== filterSistema) return false;
      
      const matchRecurso = filterRecurso === 'Todos' || (t.recursos && t.recursos.includes(filterRecurso)) || t.recurso === filterRecurso;
      if (!matchRecurso) return false;

      let hasDates = false;
      const schedule = t.schedule || {};
      const steps = t.customSteps && t.customSteps.length > 0 ? t.customSteps : SCHEDULE_STEPS;
      steps.forEach(step => {
        const phase = schedule[step];
        if (phase && (phase.plannedStart || phase.plannedEnd || phase.actualStart || phase.actualEnd)) {
          hasDates = true;
        }
      });

      if (filterCronograma === 'Com Cronograma' && !hasDates) return false;
      if (filterCronograma === 'Sem Cronograma' && hasDates) return false;

      return true;
    });
  }, [tickets, filterSprint, filterSponsor, filterKeyUser, filterAnalyst, filterSistema, filterCronograma, filterRecurso]);

  const ganttData = useMemo(() => {
    const data = [];
    let globalMin = Infinity;
    let globalMax = 0;
    const now = Date.now(); // Variável para verificar a data atual

    filteredTickets.forEach(t => {
      let tMin = Infinity;
      let tMax = 0;
      let hasDates = false;
      const schedule = t.schedule || {};
      const steps = t.customSteps && t.customSteps.length > 0 ? t.customSteps : SCHEDULE_STEPS;
      
      steps.forEach(step => {
        const phase = schedule[step];
        if (phase) {
          const pStart = phase.plannedStart ? new Date(phase.plannedStart + 'T00:00:00').getTime() : null;
          const pEnd = phase.plannedEnd ? new Date(phase.plannedEnd + 'T00:00:00').getTime() : null;
          const aStart = phase.actualStart ? new Date(phase.actualStart + 'T00:00:00').getTime() : null;
          const aEnd = phase.actualEnd ? new Date(phase.actualEnd + 'T00:00:00').getTime() : null;

          const start = aStart || pStart;
          const end = aEnd || pEnd;

          if (start) { tMin = Math.min(tMin, start); hasDates = true; }
          if (end) { tMax = Math.max(tMax, end); hasDates = true; }
        }
      });

      if (hasDates) {
        if (tMax < tMin) tMax = tMin + 86400000; 
        const isDelayed = tMax < now; // Se a data final for menor que hoje, está atrasada
        data.push({ ticket: t, startMs: tMin, endMs: tMax, hasDates: true, isDelayed });
        globalMin = Math.min(globalMin, tMin);
        globalMax = Math.max(globalMax, tMax);
      } else {
        data.push({ ticket: t, startMs: null, endMs: null, hasDates: false, isDelayed: false });
      }
    });

    if (globalMin === Infinity) {
      globalMin = new Date().getTime() - 15 * 86400000;
      globalMax = new Date().getTime() + 15 * 86400000;
    } else {
      globalMin -= 15 * 86400000;
      globalMax += 15 * 86400000;
    }

    return { 
      items: data.sort((a, b) => {
        if (a.hasDates && b.hasDates) return a.startMs - b.startMs;
        if (a.hasDates) return -1;
        if (b.hasDates) return 1;
        return 0;
      }), 
      minMs: globalMin, 
      maxMs: globalMax, 
      totalMs: Math.max(globalMax - globalMin, 86400000) 
    };
  }, [filteredTickets]);

  const months = useMemo(() => {
    const m = [];
    if (ganttData.minMs !== Infinity) {
      let d = new Date(ganttData.minMs);
      d.setDate(1);
      while (d.getTime() <= ganttData.maxMs) {
        m.push(d.getTime());
        d.setMonth(d.getMonth() + 1);
      }
    }
    return m;
  }, [ganttData]);

  return (
    <div className="flex flex-col h-full space-y-4 animate-in fade-in">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-500">Sprint:</span>
          <select className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white" value={filterSprint} onChange={(e) => setFilterSprint(e.target.value)}>
            {sprints.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-500">Sistema:</span>
          <select className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white" value={filterSistema} onChange={(e) => setFilterSistema(e.target.value)}>
             <option value="Todos">Todos</option>
             <option value="Não Definido">Não Definido</option>
             {sistemasList.filter(s => s !== 'Todos').map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-500">Patrocinador:</span>
          <select className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white" value={filterSponsor} onChange={(e) => setFilterSponsor(e.target.value)}>
            {sponsorsList.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-500">Key User:</span>
          <select className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white" value={filterKeyUser} onChange={(e) => setFilterKeyUser(e.target.value)}>
            {keyUsers.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-500">Analista:</span>
          <select className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white" value={filterAnalyst} onChange={(e) => setFilterAnalyst(e.target.value)}>
            {analysts.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-500">Recurso:</span>
          <select className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white" value={filterRecurso} onChange={(e) => setFilterRecurso(e.target.value)}>
            {recursosList.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-500">Cronograma:</span>
          <select className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white" value={filterCronograma} onChange={(e) => setFilterCronograma(e.target.value)}>
            <option value="Todos">Todos</option>
            <option value="Com Cronograma">Com Cronograma</option>
            <option value="Sem Cronograma">Sem Cronograma</option>
          </select>
        </div>
        
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1.5 rounded-lg font-bold">
            {ganttData.items.length} demandas projetadas
          </span>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col relative z-0">
        {ganttData.items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-10 bg-slate-50">
            <Map size={48} className="text-slate-300 mb-4" />
            <p className="font-medium text-slate-500">Nenhuma demanda em aberto para os filtros selecionados.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto relative custom-scrollbar">
             <div className="min-w-[1200px] w-full pb-8">
                {/* Header do Gráfico (Sticky Top) */}
                <div className="flex border-b border-slate-200 bg-slate-50 sticky top-0 z-30 shadow-sm">
                   <div className="w-[350px] shrink-0 sticky left-0 bg-slate-50 border-r border-slate-200 z-40 p-4 flex flex-col justify-center shadow-[2px_0_5px_rgba(0,0,0,0.03)]">
                      <span className="font-black text-xs text-slate-600 uppercase tracking-wider">Demanda / Projeto Em Aberto</span>
                   </div>
                   <div className="flex-1 relative h-12 bg-slate-50/80">
                      {months.map(ms => {
                         const left = ((ms - ganttData.minMs) / ganttData.totalMs) * 100;
                         if (left < 0 || left > 100) return null;
                         const isNearEnd = left > 85;
                         return (
                           <div key={ms} className="absolute top-0 bottom-0 border-l border-slate-300" style={{ left: `${left}%` }}>
                             <span className={`absolute top-3 ${isNearEnd ? 'right-2' : 'left-2'} text-[10px] font-black text-slate-500 uppercase tracking-wider bg-slate-50/80 px-1 rounded backdrop-blur-sm whitespace-nowrap`}>
                               {formatShortMonthYear(ms)}
                             </span>
                           </div>
                         );
                      })}
                   </div>
                </div>

                {/* Linhas (Tickets) */}
                <div className="relative">
                   {ganttData.items.map((item) => {
                      let left = 0;
                      let width = 0;
                      if (item.hasDates) {
                        left = ((item.startMs - ganttData.minMs) / ganttData.totalMs) * 100;
                        width = ((item.endMs - item.startMs) / ganttData.totalMs) * 100;
                      }
                      
                      return (
                        <div key={item.ticket.id} className={`flex border-b border-slate-100 group ${item.isDelayed ? 'hover:bg-red-50/20' : 'hover:bg-blue-50/30'}`}>
                           {/* Painel de Informação (Sticky Left) */}
                           <div 
                             className={`w-[350px] shrink-0 sticky left-0 z-20 p-3 cursor-pointer shadow-[2px_0_5px_rgba(0,0,0,0.02)] transition-colors overflow-hidden border-r border-slate-200 ${item.isDelayed ? 'bg-red-50/30 group-hover:bg-red-50/60 border-l-4 border-l-red-500' : 'bg-white group-hover:bg-blue-50/30'}`} 
                             onClick={() => onSelect(item.ticket)}
                           >
                              <div className="flex items-center justify-between mb-1 gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                   <span className={`font-bold text-sm hover:underline truncate min-w-0 ${item.isDelayed ? 'text-red-700' : 'text-blue-700'}`}>{item.ticket.id}</span>
                                   {item.isDelayed && (
                                     <span className="flex items-center gap-1 bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-[9px] font-black uppercase border border-red-200 shrink-0 animate-pulse" title="A data final do cronograma foi ultrapassada">
                                       <AlertCircle size={10} /> Atrasado
                                     </span>
                                   )}
                                </div>
                                {item.ticket.sistema && (
                                  <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded text-teal-700 border border-teal-200 bg-teal-50 truncate max-w-[120px] shrink-0">
                                    {item.ticket.sistema}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs font-medium text-slate-800 line-clamp-1 mb-2 break-words" title={item.ticket.description}>
                                {item.ticket.description}
                              </div>
                              <div className="flex items-center gap-3 text-[10px] text-slate-500 font-semibold min-w-0">
                                 <span className="truncate flex-1 min-w-0" title={`Resp: ${item.ticket.analyst}`}><UserCircle size={10} className="inline mr-1 text-purple-400 shrink-0"/>{item.ticket.analyst || '-'}</span>
                                 <div className="flex items-center gap-1 shrink-0">
                                   <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{backgroundColor: STATUS_COLORS[item.ticket.status]}}></span>
                                   <span className="truncate max-w-[100px]">{item.ticket.status}</span>
                                 </div>
                              </div>
                           </div>

                           {/* Área do Gantt */}
                           <div className="flex-1 relative py-2 min-h-[70px]">
                              {/* Linhas de Grade Verticais (Meses) */}
                              {months.map(ms => {
                                 const mLeft = ((ms - ganttData.minMs) / ganttData.totalMs) * 100;
                                 if (mLeft < 0 || mLeft > 100) return null;
                                 return <div key={`grid-${ms}`} className="absolute top-0 bottom-0 border-l border-slate-200/50 pointer-events-none" style={{ left: `${mLeft}%` }}></div>;
                              })}
                              
                              {/* Barra de Progresso do Gantt */}
                              {item.hasDates ? (
                                <>
                                  <div 
                                    className="absolute top-1/2 -translate-y-1/2 h-8 rounded-md shadow-sm border border-black/10 overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-400 hover:scale-[1.01] transition-all z-10" 
                                    style={{ 
                                      left: `calc(${left}% + 1px)`, 
                                      width: `calc(${width}% - 2px)`, 
                                      backgroundColor: STATUS_COLORS[item.ticket.status] || '#cbd5e1' 
                                    }}
                                    onClick={() => onSelect(item.ticket)}
                                    title={`${item.ticket.id} | ${new Date(item.startMs).toLocaleDateString('pt-BR')} até ${new Date(item.endMs).toLocaleDateString('pt-BR')}`}
                                  >
                                    <div className="h-full bg-black/15 relative" style={{ width: `${item.ticket.progress}%` }}>
                                       {/* Efeito de brilho na barra de progresso */}
                                       <div className="absolute top-0 right-0 bottom-0 w-1 bg-white/30"></div>
                                    </div>
                                  </div>
                                  <div className="absolute top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none z-20 whitespace-nowrap" style={{ left: `calc(${left + width}% + 8px)` }}>
                                    <span className="text-[11px] font-black text-slate-700">{item.ticket.progress}%</span>
                                    <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                                      <span className="w-1 h-1 rounded-full bg-slate-400"></span>
                                      {new Date(item.startMs).toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})} a {new Date(item.endMs).toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})}
                                    </span>
                                  </div>
                                </>
                              ) : (
                                <div className="absolute inset-0 flex items-center px-4" onClick={() => onSelect(item.ticket)}>
                                   <span className="text-[11px] font-medium text-slate-500 italic bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full border border-slate-200/80 shadow-sm cursor-pointer hover:border-slate-300">
                                      Cronograma não definido
                                   </span>
                                </div>
                              )}
                           </div>
                        </div>
                      );
                   })}
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ConfigSection({ title, description, items, onAddItem, onDeleteItem, placeholder }) {
  const [newValue, setNewValue] = useState('');
  const handleAddClick = () => { if (newValue.trim()) { onAddItem(newValue); setNewValue(''); } };

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col h-full">
       <div className="bg-slate-50 border-b border-slate-200 p-4">
          <h4 className="font-bold text-slate-700">{title}</h4>
          <p className="text-xs text-slate-500 mt-1">{description}</p>
       </div>
       <div className="p-5 bg-white flex-1 flex flex-col">
           <div className="flex gap-3 mb-6">
              <input type="text" value={newValue} onChange={e => setNewValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddClick()} placeholder={placeholder} className="flex-1 border border-slate-300 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors" />
              <button onClick={handleAddClick} disabled={!newValue.trim()} className="bg-blue-600 text-white px-5 py-2 rounded-lg font-bold text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-colors shadow-sm"><Plus size={16}/> Adicionar</button>
           </div>
           <div className="grid grid-cols-1 gap-3 overflow-y-auto max-h-64 pr-2">
              {items && items.length === 0 ? (
                 <p className="text-sm text-slate-500 italic py-4 text-center">Nenhum item cadastrado.</p>
              ) : (
                 items && items.map(item => (
                    <div key={item.id} className="flex justify-between items-center border border-slate-200 rounded-lg p-3 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/30 transition-colors group">
                       <span className="font-semibold text-sm text-slate-700">{item.name}</span>
                       <button onClick={() => onDeleteItem(item.id)} className="text-slate-400 hover:text-red-600 transition-colors p-1 opacity-0 group-hover:opacity-100 focus:opacity-100"><Trash2 size={16}/></button>
                    </div>
                 ))
              )}
           </div>
       </div>
    </div>
  );
}

function UserManagementSection({ appUsers, onSaveAppUser, onDeleteAppUser }) {
  const [editingUser, setEditingUser] = useState<any>(null);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [saveError, setSaveError] = useState('');

  const handleEdit = (user) => setEditingUser(user);
  const handleNew = () => setEditingUser({ id: '', name: '', username: '', email: '', password: '', roles: ['Analista'], blocked: false });
  const isNewUser = !!editingUser && !editingUser.id;
  const canSave = editingUser && editingUser.name && editingUser.username && editingUser.roles?.length > 0 && (!isNewUser || (editingUser.email && editingUser.password));

  const handleSave = async () => {
    if (!canSave) return;
    setSaveError('');
    setIsSavingUser(true);
    try {
      await onSaveAppUser(editingUser);
      setEditingUser(null);
    } catch (err) {
      setSaveError(err?.message || 'Erro ao guardar usuário.');
    } finally {
      setIsSavingUser(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
       <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-slate-800">Controle de Acessos (Usuários)</h3>
            <p className="text-xs text-slate-500 mt-1">Gerencie quem tem acesso ao sistema e quais filtros se aplicam.</p>
          </div>
          <button onClick={handleNew} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors"><Plus size={16}/> Novo Usuário</button>
       </div>
       <div className="p-5">
         <div className="overflow-x-auto">
           <table className="w-full text-left text-sm border-collapse">
             <thead>
               <tr className="border-b border-slate-200 text-slate-500">
                 <th className="py-3 px-4 font-bold">Nome de Exibição</th>
                 <th className="py-3 px-4 font-bold">Username (Login)</th>
                 <th className="py-3 px-4 font-bold">Senha</th>
                 <th className="py-3 px-4 font-bold">Perfis de Acesso</th>
                 <th className="py-3 px-4 font-bold text-center">Estado</th>
                 <th className="py-3 px-4 font-bold text-center">Ações</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
               {appUsers && appUsers.map(u => (
                 <tr key={u.id} className="hover:bg-slate-50">
                   <td className="py-3 px-4 font-semibold text-slate-800">{u.name}</td>
                   <td className="py-3 px-4"><span className="bg-slate-100 text-slate-600 px-2 py-1 rounded font-mono text-xs border border-slate-200">{u.username}</span></td>
                   <td className="py-3 px-4 text-slate-400 text-xs">••••••••</td>
                   <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {u.roles?.map(r => (
                           <span key={r} className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${r === 'Admin' ? 'bg-red-100 text-red-700' : r === 'Key User' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{r}</span>
                        ))}
                      </div>
                   </td>
                   <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${u.blocked ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                         {u.blocked ? 'Bloqueado' : 'Activo'}
                      </span>
                   </td>
                   <td className="py-3 px-4 text-center">
                     <div className="flex items-center justify-center gap-2">
                       <button onClick={() => handleEdit(u)} className="p-1.5 text-slate-400 hover:text-blue-600 bg-white rounded shadow-sm border border-slate-200 transition-colors"><Edit size={14}/></button>
                       <button onClick={() => onSaveAppUser({...u, blocked: !u.blocked})} disabled={u.username === 'admin'} className="p-1.5 text-slate-400 hover:text-orange-600 bg-white rounded shadow-sm border border-slate-200 transition-colors disabled:opacity-30" title={u.blocked ? "Desbloquear usuario" : "Bloquear usuario"}>{u.blocked ? <Unlock size={14}/> : <Lock size={14}/>}</button>
                       <button onClick={() => onDeleteAppUser(u.id)} disabled={u.username === 'admin'} className="p-1.5 text-slate-400 hover:text-red-600 bg-white rounded shadow-sm border border-slate-200 transition-colors disabled:opacity-30"><Trash2 size={14}/></button>
                     </div>
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
         </div>
       </div>

       {editingUser && (
         <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-[9999] p-4">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in">
             <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center"><h3 className="font-bold text-lg">{editingUser.id ? 'Editar Usuário' : 'Novo Usuário'}</h3><button onClick={()=>setEditingUser(null)} className="text-slate-400 hover:text-slate-700"><X size={20}/></button></div>
             <div className="p-6 space-y-4">
               {saveError && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg font-medium border border-red-100">{saveError}</div>}
               {!isNewUser && (
                 <div className="p-3 bg-blue-50 text-blue-700 text-xs rounded-lg border border-blue-100">
                   A senha de usuários existentes não é editada aqui. Peça para a pessoa usar "Esqueci minha senha" na tela de login, ou redefina pelo painel do Supabase.
                 </div>
               )}
               <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome de Exibição (Aparece nos Filtros)</label><input type="text" value={editingUser.name} onChange={e=>setEditingUser({...editingUser, name: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: João Silva" /></div>
               <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Username (Para Login)</label><input type="text" value={editingUser.username} onChange={e=>setEditingUser({...editingUser, username: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: joao.silva" /></div>
               {isNewUser && (
                 <>
                   <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">E-mail (Para Login)</label><input type="email" value={editingUser.email} onChange={e=>setEditingUser({...editingUser, email: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="joao.silva@empresa.com" /></div>
                   <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Senha Inicial</label><input type="text" value={editingUser.password} onChange={e=>setEditingUser({...editingUser, password: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Mínimo 6 caracteres..." /></div>
                 </>
               )}
               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Perfis de Acesso (Selecione 1 ou mais)</label>
                 <div className="flex flex-wrap gap-4 bg-slate-50 border border-slate-300 rounded-lg p-3">
                   {['Admin', 'Key User', 'Analista'].map(r => (
                     <label key={r} className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700 select-none hover:text-blue-700">
                        <input type="checkbox" checked={editingUser.roles?.includes(r)} onChange={(e) => {
                           let newRoles = [...(editingUser.roles || [])];
                           if (e.target.checked) newRoles.push(r);
                           else newRoles = newRoles.filter(role => role !== r);
                           setEditingUser({...editingUser, roles: newRoles});
                        }} className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer" />
                        {r}
                     </label>
                   ))}
                 </div>
               </div>
             </div>
             <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3"><button onClick={()=>setEditingUser(null)} className="px-4 py-2 text-slate-600 bg-white border border-slate-300 rounded-lg font-bold text-sm">Cancelar</button><button onClick={handleSave} disabled={!canSave || isSavingUser} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 disabled:opacity-50">{isSavingUser ? 'A guardar...' : 'Guardar Usuário'}</button></div>
           </div>
         </div>
       )}
    </div>
  );
}

function SponsorConfigSection({ items, onSave, onDelete }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const handleAdd = () => { if (name.trim()) { onSave({ name, email }); setName(''); setEmail(''); } };

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col h-full lg:col-span-2 mt-2">
       <div className="bg-slate-50 border-b border-slate-200 p-4">
          <h4 className="font-bold text-slate-700">Patrocinadores</h4>
          <p className="text-xs text-slate-500 mt-1">Cadastro de diretores e gerentes que patrocinam os projetos, incluindo e-mail para envio de reportes.</p>
       </div>
       <div className="p-5 bg-white flex-1 flex flex-col">
           <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="Nome do Patrocinador" className="flex-1 border border-slate-300 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white" />
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="E-mail (Opcional)" className="flex-1 border border-slate-300 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white" />
              <button onClick={handleAdd} disabled={!name.trim()} className="bg-blue-600 text-white px-5 py-2 rounded-lg font-bold text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm shrink-0"><Plus size={16}/> Adicionar</button>
           </div>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto max-h-64 pr-2">
              {items && items.length === 0 ? <p className="text-sm text-slate-500 italic py-4 text-center sm:col-span-2">Nenhum patrocinador cadastrado.</p> : items && items.map(item => (
                 <div key={item.id} className="flex justify-between items-center border border-slate-200 rounded-lg p-3 bg-slate-50 group hover:border-blue-300 hover:bg-blue-50/30 transition-colors">
                    <div className="flex flex-col overflow-hidden mr-2">
                       <span className="font-semibold text-sm text-slate-700 truncate">{item.name}</span>
                       {item.email && <span className="text-xs text-slate-500 truncate">{item.email}</span>}
                    </div>
                    <button onClick={()=>onDelete(item.id)} className="text-slate-400 hover:text-red-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                 </div>
              ))}
           </div>
       </div>
    </div>
  );
}

function SettingsView({ demandTypes, onAdd, onDelete, systems, onAddSystem, onDeleteSystem, appUsers, onSaveAppUser, onDeleteAppUser, sponsors, onSaveSponsor, onDeleteSponsor }) {
  const [activeSettingsTab, setActiveSettingsTab] = useState('listas');

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in">
       <div className="flex gap-2 border-b border-slate-200 pb-2 mb-6">
          <button onClick={()=>setActiveSettingsTab('listas')} className={`px-4 py-2 font-bold text-sm rounded-lg transition-colors ${activeSettingsTab === 'listas' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-100'}`}>Listas de Seleção</button>
          <button onClick={()=>setActiveSettingsTab('usuarios')} className={`px-4 py-2 font-bold text-sm rounded-lg transition-colors flex items-center gap-2 ${activeSettingsTab === 'usuarios' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-100'}`}><Shield size={16}/> Gestão de Acessos</button>
       </div>

       {activeSettingsTab === 'listas' ? (
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ConfigSection title="Tipos de Demanda" description="Categorias disponíveis ao criar ou editar uma demanda." items={demandTypes} onAddItem={onAdd} onDeleteItem={onDelete} placeholder="Ex: Melhoria Técnica, Urgente, etc..." />
            <ConfigSection title="Sistemas" description="Sistemas, aplicações ou plataformas disponíveis no portfólio." items={systems} onAddItem={onAddSystem} onDeleteItem={onDeleteSystem} placeholder="Ex: SAP, Jira, TOTVS..." />
            <SponsorConfigSection items={sponsors} onSave={onSaveSponsor} onDelete={onDeleteSponsor} />
         </div>
       ) : (
         <UserManagementSection appUsers={appUsers} onSaveAppUser={onSaveAppUser} onDeleteAppUser={onDeleteAppUser} />
       )}
    </div>
  );
}

function DashboardView({ tickets, onNavigateToList }) {
  const [activeFilter, setActiveFilter] = useState('Todos'); 
  const [analystFilter, setAnalystFilter] = useState('Todos'); 
  const [keyUserFilter, setKeyUserFilter] = useState('Todos'); 
  const [sponsorFilter, setSponsorFilter] = useState('Todos'); 
  const [sprintFilter, setSprintFilter] = useState('Todas'); 
  const [typeFilter, setTypeFilter] = useState(['Todos']); 

  const handleFilterToggle = (filter) => {
    setActiveFilter(prev => prev === filter ? 'Todos' : filter);
  };

  const handleAnalystToggle = (data) => {
    if (data && data.name) setAnalystFilter(prev => prev === data.name ? 'Todos' : data.name);
  };

  const handleKeyUserToggle = (data) => {
    if (data && data.name) setKeyUserFilter(prev => prev === data.name ? 'Todos' : data.name);
  };

  const handleSponsorToggle = (data) => {
    if (data && data.name) setSponsorFilter(prev => prev === data.name ? 'Todos' : data.name);
  };

  const handleStatusToggle = (data) => {
    if (data && data.name) setActiveFilter(prev => prev === data.name ? 'Todos' : data.name);
  };

  const sprints = useMemo(() => {
    return ['Todas', ...new Set(tickets.map(t => t.sprint || 'Sem Sprint'))].sort();
  }, [tickets]);

  const demandTypesList = useMemo(() => {
    return [...new Set(tickets.map(t => t.type || 'Não Definido'))].sort();
  }, [tickets]);

  const analystsList = useMemo(() => {
    return ['Todos', ...new Set(tickets.map(t => t.analyst || 'Não Atribuído'))].sort();
  }, [tickets]);

  const keyUsersList = useMemo(() => {
    return ['Todos', ...new Set(tickets.map(t => t.keyUser || 'Não Atribuído'))].sort();
  }, [tickets]);

  const sponsorsList = useMemo(() => {
    return ['Todos', ...new Set(tickets.map(t => t.sponsor || 'Não Definido'))].sort();
  }, [tickets]);

  const baseFilteredTickets = useMemo(() => {
    return tickets.filter(t => {
      const matchSp = sprintFilter === 'Todas' || (t.sprint || 'Sem Sprint') === sprintFilter;
      const matchTy = typeFilter.includes('Todos') || typeFilter.includes(t.type || 'Não Definido');
      const matchAn = analystFilter === 'Todos' || (t.analyst || 'Não Atribuído') === analystFilter;
      const matchKu = keyUserFilter === 'Todos' || (t.keyUser || 'Não Atribuído') === keyUserFilter;
      const matchSpn = sponsorFilter === 'Todos' || (t.sponsor || 'Não Definido') === sponsorFilter;
      
      return matchSp && matchTy && matchAn && matchKu && matchSpn;
    });
  }, [tickets, sprintFilter, typeFilter, analystFilter, keyUserFilter, sponsorFilter]);

  const total = baseFilteredTickets.length;
  const completed = baseFilteredTickets.filter(t => t.status === '10 - Concluído').length;
  const inProgress = baseFilteredTickets.filter(t => t.status !== '10 - Concluído' && t.status !== '00 - Cancelado' && t.status !== '00 - Paralisado' && t.status !== '00 - Bloqueado').length;
  const paralisadas = baseFilteredTickets.filter(t => t.status === '00 - Paralisado').length;
  const bloqueadas = baseFilteredTickets.filter(t => t.status === '00 - Bloqueado').length;
  const canceladas = baseFilteredTickets.filter(t => t.status === '00 - Cancelado').length;

  // Novo indicador: demandas em aberto cuja data final de cronograma já passou
  // (mesmo critério usado no Roadmap Macro).
  const delayed = useMemo(() => {
    const now = Date.now();
    return baseFilteredTickets.filter(t => isTicketOverdue(t, now)).length;
  }, [baseFilteredTickets]);

  // Novo indicador: tempo médio (em dias) entre a criação e a conclusão das
  // demandas já concluídas, a partir do histórico de status.
  const avgCompletionDays = useMemo(() => {
    const concluidas = baseFilteredTickets.filter(t => t.status === '10 - Concluído');
    if (concluidas.length === 0) return null;
    let sum = 0;
    let counted = 0;
    concluidas.forEach(t => {
      const creationDate = t.statusHistory?.[0]?.date || t.logs?.[0]?.date;
      const completedHist = t.statusHistory?.slice().reverse().find(h => h.status === '10 - Concluído');
      const completedDate = completedHist?.date || t.logs?.[0]?.date;
      if (!creationDate || !completedDate) return;
      const start = new Date(creationDate + 'T00:00:00').getTime();
      const end = new Date(completedDate + 'T00:00:00').getTime();
      if (Number.isNaN(start) || Number.isNaN(end)) return;
      sum += Math.max(0, Math.round((end - start) / 86400000));
      counted += 1;
    });
    return counted > 0 ? Math.round(sum / counted) : null;
  }, [baseFilteredTickets]);

  const chartTickets = useMemo(() => {
    let result = baseFilteredTickets;

    if (activeFilter !== 'Todos') {
      if (activeFilter === 'Em Andamento') {
        result = result.filter(t => t.status !== '10 - Concluído' && t.status !== '00 - Cancelado' && t.status !== '00 - Paralisado' && t.status !== '00 - Bloqueado');
      } else {
        result = result.filter(t => t.status === activeFilter);
      }
    }

    return result;
  }, [baseFilteredTickets, activeFilter]);

  const activeStatuses = [...new Set(chartTickets.map(t => t.status))].sort();
  const hasInteractiveFilters = activeFilter !== 'Todos' || analystFilter !== 'Todos' || keyUserFilter !== 'Todos' || sponsorFilter !== 'Todos';
  const hasBaseFiltersActive = sprintFilter !== 'Todas' || !typeFilter.includes('Todos') || analystFilter !== 'Todos' || keyUserFilter !== 'Todos' || sponsorFilter !== 'Todos';
  const clearBaseFilters = () => {
    setSprintFilter('Todas');
    setTypeFilter(['Todos']);
    setAnalystFilter('Todos');
    setKeyUserFilter('Todos');
    setSponsorFilter('Todos');
  };

  const statusCounts = {};
  chartTickets.forEach(t => { statusCounts[t.status] = (statusCounts[t.status] || 0) + 1; });
  const statusData = Object.keys(statusCounts).map(key => ({ name: key, quantidade: statusCounts[key], fill: STATUS_COLORS[key] || '#8884d8' })).sort((a, b) => b.quantidade - a.quantidade);

  const analystMap = {};
  chartTickets.forEach(t => { 
    const a = t.analyst || 'Não Atribuído';
    if (!analystMap[a]) {
      analystMap[a] = { name: a, total: 0 };
      activeStatuses.forEach(s => analystMap[a][s] = 0);
    }
    analystMap[a][t.status] += 1;
    analystMap[a].total += 1;
  });
  const analystData = Object.values(analystMap).sort((a, b) => b.total - a.total);

  const keyUserMap = {};
  chartTickets.forEach(t => { 
    const k = t.keyUser || 'Não Atribuído';
    if (!keyUserMap[k]) {
      keyUserMap[k] = { name: k, total: 0 };
      activeStatuses.forEach(s => keyUserMap[k][s] = 0);
    }
    keyUserMap[k][t.status] += 1;
    keyUserMap[k].total += 1;
  });
  const keyUserData = Object.values(keyUserMap).sort((a, b) => b.total - a.total);

  const sponsorMap = {};
  chartTickets.forEach(t => { 
    const s = t.sponsor || 'Não Definido';
    if (!sponsorMap[s]) {
      sponsorMap[s] = { name: s, total: 0 };
      activeStatuses.forEach(st => sponsorMap[s][st] = 0);
    }
    sponsorMap[s][t.status] += 1;
    sponsorMap[s].total += 1;
  });
  const sponsorData = Object.values(sponsorMap).sort((a, b) => b.total - a.total);

  const temperatureStatuses = [
    '1 - Em analise', '2 - Consult. - DAM', '3 - Área de Neg. - DAM',
    '4 - Consult. - EF', '5 - Área de Neg. - EF', '6 - Desenvolvimento',
    '7 - Testes', '8 - Deploy', '9 - Operação Assistida', '10 - Concluído'
  ];

  const temperatureData = temperatureStatuses.map(status => {
    const ticketsInStatus = chartTickets.filter(t => t.status === status);
    return {
      name: status,
      count: ticketsInStatus.length,
      tickets: ticketsInStatus.map(t => t.id),
      fill: STATUS_COLORS[status] || '#ccc'
    };
  });

  const CustomTemperatureTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-slate-200 shadow-xl rounded-lg max-w-xs z-50">
          <p className="font-bold text-slate-800 border-b border-slate-100 pb-2 mb-2">{label}</p>
          <p className="text-sm text-slate-600 mb-2">Total: <span className="font-bold text-slate-900">{data.count}</span> demanda(s)</p>
          {data.count > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {data.tickets.map(id => (
                <span key={id} className="bg-slate-100 text-xs font-semibold text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">{id}</span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">Nenhuma demanda nesta fase.</p>
          )}
        </div>
      );
    }
    return null;
  };

  // Nota: o topo do gráfico precisa reservar espaço real para este rótulo
  // (ver margin={{ top: STACKED_CHART_TOP_MARGIN }} nos BarCharts abaixo) —
  // antes a margem era menor que o deslocamento do texto, então o total
  // ficava cortado sempre que a barra chegava perto do topo do eixo Y.
  //
  // Segunda causa raiz encontrada ao testar de verdade (não só ler o
  // código): no Recharts usado aqui (v3), a função de label ligada
  // diretamente a um <Bar> recebe x/y/width/index/value — mas NUNCA recebe
  // `payload` com a linha inteira. Como o total só existe no objeto da
  // linha (analystData[i].total), a checagem antiga (`payload.total`) dava
  // sempre `undefined` e a função retornava null pra TODAS as barras — ou
  // seja, o rótulo de total nunca aparecia, não só nas barras mais altas.
  // A correção usa `index` para buscar a linha certa no array de dados de
  // origem (fica curried por gráfico, já que cada um tem seu próprio array).
  const STACKED_CHART_TOP_MARGIN = 28;
  const makeTopLabelRenderer = (dataArray) => (props) => {
    const { x, y, width, index } = props;
    const row = dataArray[index];
    if (!row || row.total === undefined) return null;
    return (
      <text x={x + width / 2} y={y - 8} fill="#475569" textAnchor="middle" fontSize={12} fontWeight="bold" className="pointer-events-none">
        {row.total}
      </text>
    );
  };

  const dashboardGanttData = useMemo(() => {
    const data = [];
    let globalMin = Infinity;
    let globalMax = 0;

    chartTickets.forEach(t => {
      const { tMin, tMax, hasDates } = getTicketScheduleRange(t);

      if (hasDates) {
        data.push({ ticket: t, startMs: tMin, endMs: tMax, hasDates: true });
        globalMin = Math.min(globalMin, tMin);
        globalMax = Math.max(globalMax, tMax);
      } else {
        data.push({ ticket: t, startMs: null, endMs: null, hasDates: false });
      }
    });

    if (data.length === 0) return { items: [], minMs: Date.now(), maxMs: Date.now() + 86400000, totalMs: 86400000 };

    if (globalMin === Infinity) {
      globalMin = new Date().getTime() - 15 * 86400000;
      globalMax = new Date().getTime() + 15 * 86400000;
    } else {
      globalMin -= 15 * 86400000; // Margem de segurança esquerda
      globalMax += 15 * 86400000; // Margem de segurança direita
    }

    return {
      items: data.sort((a, b) => {
        if (a.hasDates && b.hasDates) return a.startMs - b.startMs;
        if (a.hasDates) return -1;
        if (b.hasDates) return 1;
        return 0;
      }),
      minMs: globalMin,
      maxMs: globalMax,
      totalMs: Math.max(globalMax - globalMin, 86400000)
    };
  }, [chartTickets]);

  // Cabeçalho do Roadmap Macro: em vez de espremer os rótulos de mês num
  // container de largura fixa (o que forçava a esconder meses inteiros
  // quando o período era longo — ex.: Agosto/Setembro sobrepostos, ou meses
  // inteiros pulados), a linha do tempo agora usa uma coluna de largura fixa
  // por semana e cresce para a largura real que precisa; o card ganha
  // rolagem horizontal para o resto. O cabeçalho tem duas linhas: mês (uma
  // célula por mês, mesclando as semanas que ele contém) e semana (data de
  // início de cada semana).
  const WEEK_COL_PX = 52;
  const roadmapTimeline = useMemo(() => {
    if (dashboardGanttData.items.length === 0) {
      return { weeks: [], monthGroups: [], totalWidth: 0, startMs: dashboardGanttData.minMs };
    }

    // Alinha o início da grade à segunda-feira anterior (ou igual) ao início
    // do período, para que as colunas de semana sigam um padrão previsível.
    const alignToMonday = (ms) => {
      const d = new Date(ms);
      d.setHours(0, 0, 0, 0);
      const day = d.getDay(); // 0=Dom .. 6=Sáb
      const diff = (day === 0 ? -6 : 1) - day;
      d.setDate(d.getDate() + diff);
      return d.getTime();
    };

    const startMs = alignToMonday(dashboardGanttData.minMs);
    const weeks = [];
    let cursor = startMs;
    while (cursor <= dashboardGanttData.maxMs) {
      weeks.push(cursor);
      cursor += 7 * 86400000;
    }

    const monthGroups = [];
    weeks.forEach(ms => {
      const d = new Date(ms);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const lastGroup = monthGroups[monthGroups.length - 1];
      if (lastGroup && lastGroup.key === key) {
        lastGroup.weekCount += 1;
      } else {
        monthGroups.push({ key, label: formatShortMonthYear(ms), weekCount: 1 });
      }
    });

    return { weeks, monthGroups, totalWidth: weeks.length * WEEK_COL_PX, startMs };
  }, [dashboardGanttData]);

  const msToPx = (ms) => ((ms - roadmapTimeline.startMs) / (7 * 86400000)) * WEEK_COL_PX;

  // Novo indicador: distribuição das demandas filtradas por sistema —
  // dado já coletado em cada ticket (campo `sistema`) mas até agora só
  // explorado no Roadmap e nas Estatísticas, nunca na página Principal.
  const systemData = useMemo(() => {
    const map = {};
    chartTickets.forEach(t => {
      const s = t.sistema || 'Não Definido';
      map[s] = (map[s] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }, [chartTickets]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      <div className="bg-white p-3.5 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-3">
        <div className="flex flex-wrap items-end gap-2.5">
           <div className="flex items-center gap-1.5 text-slate-400 shrink-0 pr-0.5 pb-2">
              <Filter size={14} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Filtros</span>
           </div>

           <div className="w-[180px] shrink-0 relative z-20">
             <MultiSelectFilter label="Tipo" options={demandTypesList} selected={typeFilter} onChange={setTypeFilter} />
           </div>

           <FilterSelect label="Sprint" value={sprintFilter} onChange={setSprintFilter} options={sprints} />
           <FilterSelect label="Analista" value={analystFilter} onChange={setAnalystFilter} options={analystsList} />
           <FilterSelect label="Key User" value={keyUserFilter} onChange={setKeyUserFilter} options={keyUsersList} />
           <FilterSelect label="Patrocinador" value={sponsorFilter} onChange={setSponsorFilter} options={sponsorsList} />

           {hasBaseFiltersActive && (
             <button onClick={clearBaseFilters} className="text-xs font-semibold text-slate-400 hover:text-slate-700 transition-colors ml-auto shrink-0 flex items-center gap-1">
               <X size={13} /> Limpar filtros
             </button>
           )}
        </div>

        {hasInteractiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100 animate-in fade-in">
             <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">Cruzamento ativo</span>
             {activeFilter !== 'Todos' && <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-100 pl-2.5 pr-1 py-1 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" />Status: {friendlyStatusLabel(activeFilter)}<button onClick={()=>setActiveFilter('Todos')} className="hover:text-slate-900 hover:bg-slate-200 rounded-full p-0.5 transition-colors"><X size={11}/></button></span>}
             {analystFilter !== 'Todos' && <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-100 pl-2.5 pr-1 py-1 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-purple-500" />Analista: {analystFilter}<button onClick={()=>setAnalystFilter('Todos')} className="hover:text-slate-900 hover:bg-slate-200 rounded-full p-0.5 transition-colors"><X size={11}/></button></span>}
             {keyUserFilter !== 'Todos' && <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-100 pl-2.5 pr-1 py-1 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Key User: {keyUserFilter}<button onClick={()=>setKeyUserFilter('Todos')} className="hover:text-slate-900 hover:bg-slate-200 rounded-full p-0.5 transition-colors"><X size={11}/></button></span>}
             {sponsorFilter !== 'Todos' && <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-100 pl-2.5 pr-1 py-1 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />Patrocinador: {sponsorFilter}<button onClick={()=>setSponsorFilter('Todos')} className="hover:text-slate-900 hover:bg-slate-200 rounded-full p-0.5 transition-colors"><X size={11}/></button></span>}

             <div className="flex items-center gap-3 ml-auto shrink-0">
                <button onClick={() => { setActiveFilter('Todos'); setAnalystFilter('Todos'); setKeyUserFilter('Todos'); setSponsorFilter('Todos'); }} className="text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors">Limpar cruzamentos</button>
                <button onClick={() => onNavigateToList(activeFilter)} className="bg-blue-600 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors shadow-sm">
                  Ver as {chartTickets.length} demandas
                </button>
             </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Demandas" value={total} icon={<ListTodo size={24} />} color="bg-blue-500" onClick={() => handleFilterToggle('Todos')} isSelected={activeFilter === 'Todos'} />
        <StatCard title="Concluídas" value={completed} icon={<CheckCircle2 size={24} />} color="bg-emerald-500" onClick={() => handleFilterToggle('10 - Concluído')} isSelected={activeFilter === '10 - Concluído'} />
        <StatCard title="Em Andamento" value={inProgress} icon={<Activity size={24} />} color="bg-amber-500" onClick={() => handleFilterToggle('Em Andamento')} isSelected={activeFilter === 'Em Andamento'} />
        <StatCard title="Atrasadas" value={delayed} icon={<Clock size={24} />} color="bg-rose-600" interactive={false} hint="Prazo final do cronograma já passou" />
        <StatCard title="Paralisadas" value={paralisadas} icon={<AlertCircle size={24} />} color="bg-orange-500" onClick={() => handleFilterToggle('00 - Paralisado')} isSelected={activeFilter === '00 - Paralisado'} />
        <StatCard title="Bloqueadas" value={bloqueadas} icon={<AlertTriangle size={24} />} color="bg-red-500" onClick={() => handleFilterToggle('00 - Bloqueado')} isSelected={activeFilter === '00 - Bloqueado'} />
        <StatCard title="Canceladas" value={canceladas} icon={<XCircle size={24} />} color="bg-slate-500" onClick={() => handleFilterToggle('00 - Cancelado')} isSelected={activeFilter === '00 - Cancelado'} />
        <StatCard title="Tempo Médio de Conclusão" value={avgCompletionDays !== null ? `${avgCompletionDays}d` : '—'} icon={<CalendarDays size={24} />} color="bg-cyan-600" interactive={false} hint="Da criação até concluído" />
      </div>

      <div className="flex flex-col gap-8">
        
        <ChartCard title="Roadmap Macro (Projetos Filtrados)" className="w-full border-l-4 border-l-blue-500">
          <div className="w-full bg-slate-50 rounded-lg border border-slate-200 flex flex-col relative" style={{ height: '350px' }}>
            {dashboardGanttData.items.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-10">
                <Map size={32} className="text-slate-300 mb-3" />
                <p className="font-medium text-slate-500 text-sm">Nenhuma demanda atende aos filtros atuais.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-auto relative custom-scrollbar">
                 <div className="pb-4" style={{ width: 280 + roadmapTimeline.totalWidth }}>
                    {/* Header: linha de mês (uma célula por mês) + linha de semana (início de cada semana) */}
                    <div className="flex border-b border-slate-200 bg-white sticky top-0 z-30 shadow-sm">
                       <div className="w-[280px] shrink-0 sticky left-0 bg-white border-r border-slate-200 z-40 p-3 flex flex-col justify-center">
                          <span className="font-black text-[10px] text-slate-500 uppercase tracking-wider">Demanda</span>
                       </div>
                       <div className="shrink-0 flex flex-col bg-slate-50/50" style={{ width: roadmapTimeline.totalWidth }}>
                          <div className="flex h-5 border-b border-slate-200">
                             {roadmapTimeline.monthGroups.map(g => (
                               <div key={g.key} className="shrink-0 flex items-center pl-1.5 border-l border-slate-300 text-[9px] font-black text-slate-600 uppercase tracking-wider overflow-hidden" style={{ width: g.weekCount * WEEK_COL_PX }}>
                                 {g.label}
                               </div>
                             ))}
                          </div>
                          <div className="flex h-5">
                             {roadmapTimeline.weeks.map(ms => (
                               <div key={ms} className="shrink-0 flex items-center justify-center border-l border-slate-200/70 text-[9px] font-medium text-slate-400" style={{ width: WEEK_COL_PX }}>
                                 {formatDateShort(ms)}
                               </div>
                             ))}
                          </div>
                       </div>
                    </div>

                    {/* Linhas */}
                    <div className="relative">
                       {dashboardGanttData.items.map((item) => {
                          let left = 0;
                          let width = 0;
                          if (item.hasDates) {
                            left = msToPx(item.startMs);
                            width = msToPx(item.endMs) - msToPx(item.startMs);
                          }

                          return (
                            <div key={item.ticket.id} className="flex border-b border-slate-100 hover:bg-blue-50/30 group">
                               <div className="w-[280px] shrink-0 sticky left-0 bg-white group-hover:bg-blue-50/30 border-r border-slate-200 z-20 p-2.5 flex flex-col justify-center transition-colors overflow-hidden">
                                  <div className="flex items-center justify-between mb-0.5 gap-2">
                                    <span className="font-bold text-blue-700 text-xs truncate min-w-0 flex-1">{item.ticket.id}</span>
                                    <span className="text-[9px] font-semibold text-slate-400 truncate max-w-[90px] shrink-0" title={item.ticket.analyst}>{item.ticket.analyst}</span>
                                  </div>
                                  <span className="text-[10px] text-slate-600 line-clamp-1 break-words" title={item.ticket.description}>{item.ticket.description}</span>
                               </div>
                               <div className="shrink-0 relative py-1.5 min-h-[44px]" style={{ width: roadmapTimeline.totalWidth }}>
                                  {roadmapTimeline.weeks.map(ms => {
                                     const isMonthStart = new Date(ms).getDate() <= 7;
                                     return (
                                       <div
                                         key={`grid-${ms}`}
                                         className={`absolute top-0 bottom-0 pointer-events-none ${isMonthStart ? 'border-l border-slate-300/70' : 'border-l border-slate-200/50'}`}
                                         style={{ left: msToPx(ms) }}
                                       />
                                     );
                                  })}

                                  {item.hasDates ? (
                                    <div
                                      className="absolute top-1/2 -translate-y-1/2 h-5 rounded shadow-sm border border-black/10 overflow-hidden hover:ring-2 hover:ring-blue-400 transition-all z-10"
                                      style={{
                                        left: left + 1,
                                        width: Math.max(width - 2, 2),
                                        backgroundColor: STATUS_COLORS[item.ticket.status] || '#cbd5e1'
                                      }}
                                      title={`${item.ticket.id} | Progresso: ${item.ticket.progress}% | ${item.ticket.status}`}
                                    >
                                      <div className="h-full bg-black/15 relative" style={{ width: `${item.ticket.progress}%` }}></div>
                                    </div>
                                  ) : (
                                    <div className="absolute inset-0 flex items-center px-4 pointer-events-none z-10">
                                       <span className="text-[10px] font-medium text-slate-500 italic bg-white/60 px-2 py-0.5 rounded backdrop-blur-sm border border-slate-200/50 shadow-sm">Cronograma não definido</span>
                                    </div>
                                  )}
                               </div>
                            </div>
                          );
                       })}
                    </div>
                 </div>
              </div>
            )}
          </div>
        </ChartCard>

        <ChartCard title="Termômetro de Evolução (Proximidade do Go-Live)" className="w-full border-l-4 border-l-orange-500">
          {chartTickets.length > 0 ? (
            <ResponsiveContainer width="100%" height={450}>
              <BarChart data={temperatureData} margin={{ top: 30, right: 30, left: 20, bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{fontSize: 11, fill: '#475569'}} angle={-45} textAnchor="end" />
                <YAxis allowDecimals={false} />
                <RechartsTooltip content={<CustomTemperatureTooltip />} cursor={{fill: '#f1f5f9'}} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} cursor="pointer" onClick={handleStatusToggle} label={{ position: 'top', fill: '#ea580c', fontSize: 16, fontWeight: '900', formatter: (val) => val > 0 ? val : '' }}>
                  {temperatureData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={entry.fill} className="hover:opacity-80 transition-opacity" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-center text-slate-400 mt-20">Sem dados para este filtro.</p>}
        </ChartCard>
        
        <ChartCard title="Demandas por Sistema" className="w-full border-l-4 border-l-violet-500">
          {systemData.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(320, systemData.length * 34)}>
              <BarChart data={systemData} layout="vertical" margin={{ top: 5, right: 40, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#475569' }} />
                <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11, fill: '#475569' }} />
                <RechartsTooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="total" fill="#7C3AED" radius={[0, 4, 4, 0]} barSize={18} label={{ position: 'right', fill: '#475569', fontSize: 12, fontWeight: 'bold' }} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-center text-slate-400 mt-20">Sem dados para este filtro.</p>}
        </ChartCard>

        {/* As três distribuições abaixo (Analista / Key User / Patrocinador) usam a
            mesma paleta de status — uma única legenda compartilhada evita repetir os
            13 rótulos de status três vezes seguidas na mesma tela. */}
        {activeStatuses.length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-2 items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">Legenda dos status</span>
            {activeStatuses.map(status => (
              <span key={status} className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: STATUS_COLORS[status] || '#CBD5E1' }} />
                {friendlyStatusLabel(status)}
              </span>
            ))}
          </div>
        )}

        <ChartCard title="Carga por Analista (Clique nas barras)" className="w-full">
          {chartTickets.length > 0 ? (
            <ResponsiveContainer width="100%" height={600}>
              <BarChart data={analystData} margin={{ top: STACKED_CHART_TOP_MARGIN, right: 30, left: 20, bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{fontSize: 11, fill: '#475569'}} angle={-45} textAnchor="end" />
                <YAxis />
                <RechartsTooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                {activeStatuses.map((status, index) => (
                   <Bar key={status} dataKey={status} stackId="a" fill={STATUS_COLORS[status] || '#CBD5E1'} cursor="pointer" onClick={handleAnalystToggle} className="hover:opacity-80 transition-opacity" label={index === activeStatuses.length - 1 ? makeTopLabelRenderer(analystData) : null} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-center text-slate-400 mt-20">Sem dados para este filtro.</p>}
        </ChartCard>

        <ChartCard title="Total por Key User (Clique nas barras)" className="w-full">
          {chartTickets.length > 0 ? (
            <ResponsiveContainer width="100%" height={600}>
              <BarChart data={keyUserData} margin={{ top: STACKED_CHART_TOP_MARGIN, right: 30, left: 20, bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{fontSize: 11, fill: '#475569'}} angle={-45} textAnchor="end" />
                <YAxis />
                <RechartsTooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                {activeStatuses.map((status, index) => (
                   <Bar key={status} dataKey={status} stackId="a" fill={STATUS_COLORS[status] || '#CBD5E1'} cursor="pointer" onClick={handleKeyUserToggle} className="hover:opacity-80 transition-opacity" label={index === activeStatuses.length - 1 ? makeTopLabelRenderer(keyUserData) : null} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-center text-slate-400 mt-20">Sem dados para este filtro.</p>}
        </ChartCard>

        <ChartCard title="Total por Patrocinador (Clique nas barras)" className="w-full">
          {chartTickets.length > 0 ? (
            <ResponsiveContainer width="100%" height={600}>
              <BarChart data={sponsorData} margin={{ top: STACKED_CHART_TOP_MARGIN, right: 30, left: 20, bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{fontSize: 11, fill: '#475569'}} angle={-45} textAnchor="end" />
                <YAxis />
                <RechartsTooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                {activeStatuses.map((status, index) => (
                   <Bar key={status} dataKey={status} stackId="a" fill={STATUS_COLORS[status] || '#CBD5E1'} cursor="pointer" onClick={handleSponsorToggle} className="hover:opacity-80 transition-opacity" label={index === activeStatuses.length - 1 ? makeTopLabelRenderer(sponsorData) : null} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-center text-slate-400 mt-20">Sem dados para este filtro.</p>}
        </ChartCard>
      </div>
    </div>
  );
}

function StatusReportView({ tickets, onSelect, reports = [], onSaveReport, onDeleteReport }) {
  const [filterSprint, setFilterSprint] = useState('Todas');
  const [filterKeyUser, setFilterKeyUser] = useState('Todos');
  const [filterType, setFilterType] = useState('Todos');
  const [aiReport, setAiReport] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [viewingPastReport, setViewingPastReport] = useState<any>(null);

  const sprints = useMemo(() => ['Todas', ...new Set(tickets.map(t => t.sprint || 'Sem Sprint'))].sort(), [tickets]);
  const keyUsers = useMemo(() => ['Todos', ...new Set(tickets.map(t => t.keyUser).filter(Boolean))].sort(), [tickets]);
  const types = useMemo(() => ['Todos', ...new Set(tickets.map(t => t.type || 'Não Definido'))].sort(), [tickets]);

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      const matchSp = filterSprint === 'Todas' || (t.sprint || 'Sem Sprint') === filterSprint;
      const matchKU = filterKeyUser === 'Todos' || t.keyUser === filterKeyUser;
      const matchTy = filterType === 'Todos' || (t.type || 'Não Definido') === filterType;
      return matchSp && matchKU && matchTy;
    });
  }, [tickets, filterSprint, filterKeyUser, filterType]);

  useEffect(() => {
    setViewingPastReport(null);
  }, [filterSprint, filterKeyUser, filterType]);

  const handleGenerateAIReport = async () => {
    setIsGenerating(true);
    setAiReport('');
    setViewingPastReport(null);
    
    const dataStr = filteredTickets.map(t => 
      `ID: ${t.id} | Status: ${t.status} | Progresso: ${t.progress}% | Responsável: ${t.analyst} | Key User: ${t.keyUser}\nDescrição: ${t.description}\nÚltimo Apontamento (Diário): ${t.logs?.[0]?.text || 'Nenhum registro'}`
    ).join('\n\n---\n\n');

    const prompt = `Atue como um Diretor de PMO (Project Management Office) especialista em relatórios executivos. Escreva um "Status Report Executivo" profissional e direto ao ponto com base na seguinte lista de demandas/projetos de TI.\n\nRegras de formatação (use SOMENTE Markdown puro, evite tags HTML):\n1. Inicie com um "Resumo Geral do Portfólio" destacando a saúde geral (quantas estão bem, quantas estão bloqueadas/paralisadas).\n2. Crie uma seção de "Principais Avanços" (destaques positivos).\n3. Crie uma seção crítica de "Pontos de Atenção e Riscos" (focando explicitamente nos projetos com problemas, bloqueios ou atrasos lidos nos últimos diários).\n4. Finalize com "Recomendações e Próximos Passos".\n\nDADOS REAIS DOS PROJETOS PARA ANALISAR:\n${dataStr || 'Nenhum projeto encontrado nos filtros.'}`;

    try {
      const result = await callClaudeWithRetry(prompt);
      setAiReport(result);
    } catch (e) {
      setAiReport("❌ Ocorreu um erro ao gerar o Status Report com a IA. Por favor, verifique a conexão e tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const groupedByStatus = filteredTickets.reduce((acc, ticket) => {
    if (!acc[ticket.status]) acc[ticket.status] = [];
    acc[ticket.status].push(ticket);
    return acc;
  }, {});

  const displayedReport = viewingPastReport ? viewingPastReport.content : aiReport;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 print:hidden">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-3">
            <ClipboardList className="text-blue-600" size={24} />
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Status Report</h3>
              <p className="text-xs text-slate-500">Acompanhamento executivo e geração de relatório inteligente.</p>
            </div>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-500">Tipo:</span>
              <select className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                {types.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-500">Sprint:</span>
              <select className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white" value={filterSprint} onChange={(e) => setFilterSprint(e.target.value)}>
                {sprints.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-500">Key User:</span>
              <select className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white" value={filterKeyUser} onChange={(e) => setFilterKeyUser(e.target.value)}>
                {keyUsers.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div className="border-l border-slate-200 pl-4 flex gap-2">
              <button onClick={handlePrint} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors">
                <Printer size={16} /> Imprimir
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <div className="xl:col-span-1 flex flex-col gap-6 print:hidden">
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl shadow-sm border border-indigo-200 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-indigo-200/50 flex justify-between items-center bg-white/50 backdrop-blur-sm">
              <h3 className="font-bold text-indigo-900 flex items-center gap-2"><Sparkles size={18} className="text-indigo-600"/> Resumo Executivo (IA)</h3>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <p className="text-xs text-indigo-800 font-medium leading-relaxed">
                A Inteligência Artificial irá ler o progresso, o status e as <strong>últimas atualizações do diário de bordo</strong> de todos os {filteredTickets.length} projetos selecionados e criará um Status Report pronto a ser enviado.
              </p>
              
              {!isGenerating && (
                <button onClick={handleGenerateAIReport} disabled={filteredTickets.length === 0} className="w-full bg-indigo-600 text-white px-5 py-3 rounded-xl text-sm font-bold flex justify-center items-center gap-2 shadow-sm hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  <Bot size={18} /> {aiReport || viewingPastReport ? 'Regerar Relatório Atual' : 'Gerar Status Report com IA'}
                </button>
              )}

              {isGenerating && (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <Loader2 className="animate-spin text-indigo-600" size={32} />
                  <span className="text-xs font-bold text-indigo-800 animate-pulse">A analisar diários e redigir o relatório...</span>
                </div>
              )}

              {aiReport && !isGenerating && !viewingPastReport && (
                 <button onClick={() => onSaveReport(aiReport, `Sprint: ${filterSprint} | Key User: ${filterKeyUser} | Tipo: ${filterType}`)} className="w-full bg-emerald-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold flex justify-center items-center gap-2 hover:bg-emerald-700 transition-colors shadow-sm">
                   <Save size={16} /> Salvar no Histórico
                 </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
             <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
                <Database size={18} className="text-slate-500" />
                <h3 className="font-bold text-slate-700 text-sm">Histórico Salvo</h3>
             </div>
             <div className="p-4 flex flex-col gap-3 max-h-[400px] overflow-y-auto">
                {reports.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">Nenhum relatório salvo no banco de dados.</p>
                ) : (
                  reports.map(rep => (
                    <div key={rep.id} className={`p-3 rounded-lg border cursor-pointer transition-all ${viewingPastReport?.id === rep.id ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-400' : 'bg-slate-50 border-slate-200 hover:border-blue-400'}`} onClick={() => setViewingPastReport(rep)}>
                      <div className="flex justify-between items-start mb-1.5">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5"><Calendar size={12}/> {new Date(rep.createdAt).toLocaleString('pt-BR')}</span>
                        <button onClick={(e) => { e.stopPropagation(); onDeleteReport(rep.id); }} className="text-slate-400 hover:text-red-500 p-0.5" title="Excluir"><Trash2 size={14}/></button>
                      </div>
                      <p className="text-[10px] text-slate-500 font-medium">{rep.filterSummary}</p>
                    </div>
                  ))
                )}
             </div>
          </div>
        </div>

        <div className="xl:col-span-2 flex flex-col gap-6">
          {(displayedReport || viewingPastReport) && (
            <div className="bg-white rounded-xl shadow-sm border border-indigo-200 overflow-hidden flex flex-col print:border-none print:shadow-none">
              <div className="p-4 border-b border-slate-200 bg-indigo-50/50 flex justify-between items-center print:hidden">
                 <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                   {viewingPastReport ? <><Database size={18} className="text-indigo-600"/> Lendo Relatório Histórico ({new Date(viewingPastReport.createdAt).toLocaleString('pt-BR')})</> : <><Sparkles size={18} className="text-indigo-600"/> Relatório Executivo Gerado</>}
                 </h3>
                 {viewingPastReport && (
                   <button onClick={() => setViewingPastReport(null)} className="text-xs bg-white border border-slate-300 px-3 py-1.5 rounded-lg font-bold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
                     Voltar ao Atual
                   </button>
                 )}
              </div>
              <div className="p-6 text-[14px] text-slate-800 whitespace-pre-wrap leading-relaxed">
                {displayedReport.split('\n').map((line, idx) => {
                  const trimmedLine = line.trim();
                  if (!trimmedLine) return <div key={idx} className="h-2"></div>;
                  
                  const formatText = (text) => text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>');

                  if (trimmedLine.startsWith('### ')) {
                    return <h4 key={idx} className="block mt-4 mb-2 text-indigo-800 text-md font-bold">{trimmedLine.replace(/^###\s/, '')}</h4>;
                  }
                  if (trimmedLine.startsWith('## ')) {
                    return <h3 key={idx} className="block mt-6 mb-3 text-indigo-900 text-lg font-bold border-b border-slate-200 pb-1">{trimmedLine.replace(/^##\s/, '')}</h3>;
                  }
                  if (trimmedLine.startsWith('# ')) {
                    return <h2 key={idx} className="block mt-6 mb-4 text-indigo-950 text-xl font-black border-b-2 border-slate-300 pb-2">{trimmedLine.replace(/^#\s/, '')}</h2>;
                  }
                  if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
                    return <li key={idx} className="ml-5 mb-1.5 list-disc text-slate-700" dangerouslySetInnerHTML={{__html: formatText(trimmedLine.substring(2))}}></li>;
                  }
                  if (/^\d+\.\s/.test(trimmedLine)) {
                    const content = trimmedLine.replace(/^\d+\.\s/, '');
                    return <li key={idx} className="ml-5 mb-1.5 list-decimal text-slate-700 font-semibold" dangerouslySetInnerHTML={{__html: formatText(content)}}></li>;
                  }
                  
                  return <p key={idx} className="mb-3 text-slate-700" dangerouslySetInnerHTML={{__html: formatText(trimmedLine)}}></p>;
                })}
              </div>
            </div>
          )}

          {!viewingPastReport && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col print:hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><ListTodo size={18} className="text-slate-500" /> Projetos Lidos ({filteredTickets.length})</h3>
                <span className="text-xs bg-slate-200 text-slate-700 font-bold px-2 py-1 rounded">Base de Dados Atual</span>
              </div>
              
              <div className="p-0 overflow-y-auto max-h-[600px] divide-y divide-slate-100">
                {filteredTickets.length === 0 ? (
                  <div className="p-10 text-center text-slate-500">Nenhum projeto encontrado com os filtros selecionados.</div>
                ) : (
                  STATUS_OPTIONS.map(status => {
                    const ticketsInStatus = groupedByStatus[status];
                    if (!ticketsInStatus || ticketsInStatus.length === 0) return null;
                    
                    return (
                      <div key={status} className="pb-2">
                        <div className="sticky top-0 z-10 px-5 py-2.5 border-b border-slate-200 flex items-center gap-3 bg-white">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_COLORS[status] }}></div>
                          <h4 className="font-bold text-slate-800 text-sm">{status}</h4>
                          <span className="text-xs font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{ticketsInStatus.length}</span>
                        </div>

                        <div className="px-5 py-2 space-y-3">
                          {ticketsInStatus.map(ticket => (
                            <div key={ticket.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 hover:border-blue-300 transition-colors overflow-hidden">
                              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-3 mb-1.5">
                                    <button onClick={() => onSelect(ticket)} className="font-bold text-blue-700 hover:underline cursor-pointer truncate min-w-0">{ticket.id}</button>
                                    <span className="text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-500 font-semibold shrink-0 truncate max-w-[120px]">{ticket.type || 'Não Definido'}</span>
                                  </div>
                                  <p className="text-sm font-medium text-slate-800 leading-tight mb-3 line-clamp-2 break-words">{ticket.description}</p>
                                  
                                  <div className="flex items-center gap-4 text-xs text-slate-600 font-medium overflow-hidden">
                                    <span className="flex items-center gap-1.5 truncate min-w-0 flex-1"><UserCircle size={14} className="text-purple-500 shrink-0"/> <span className="truncate">{ticket.analyst || '-'}</span></span>
                                    <span className="flex items-center gap-1.5 truncate min-w-0 flex-1"><User size={14} className="text-blue-500 shrink-0"/> <span className="truncate">{ticket.keyUser || '-'}</span></span>
                                  </div>
                                </div>
                                
                                <div className="w-full md:w-48 shrink-0 flex flex-col gap-2 bg-white p-3 rounded-lg border border-slate-100">
                                   <p className="text-[10px] font-bold text-slate-500 uppercase truncate">Progresso Geral</p>
                                   <div className="flex items-center gap-2">
                                     <div className="w-full bg-slate-200 rounded-full h-2 flex-1"><div className="h-2 rounded-full" style={{ width: `${ticket.progress}%`, backgroundColor: STATUS_COLORS[status] || '#3B82F6' }}></div></div>
                                     <span className="text-xs font-black text-slate-700 shrink-0">{ticket.progress}%</span>
                                   </div>
                                </div>
                              </div>

                              <div className="mt-4 pt-3 border-t border-slate-200/60">
                                 <p className="text-[10px] font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-1.5"><Clock size={12}/> Última Atualização no Diário</p>
                                 {ticket.logs && ticket.logs.length > 0 ? (
                                   <div className="bg-white border-l-2 border-blue-400 pl-3 py-1">
                                     <div className="flex items-center gap-2 mb-0.5">
                                        <span className="text-[10px] font-bold text-slate-700">{ticket.logs[0].date}</span>
                                        <span className="text-[9px] text-slate-500 bg-slate-100 px-1 rounded">{ticket.logs[0].author}</span>
                                     </div>
                                     <p className="text-[11px] text-slate-600 line-clamp-3 leading-snug">{ticket.logs[0].text}</p>
                                   </div>
                                 ) : (
                                   <p className="text-[11px] text-slate-400 italic">Nenhum apontamento registrado.</p>
                                 )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TicketList({ tickets, onSelect, onDeleteClick, onUpdateSprint, filterStatus, setFilterStatus, demandTypes = [], systems = [], sponsors = [] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAnalyst, setFilterAnalyst] = useState('Todos');
  const [filterKeyUser, setFilterKeyUser] = useState('Todos');
  const [filterSprint, setFilterSprint] = useState('Todas');
  const [filterType, setFilterType] = useState('Todos');
  const [filterSistema, setFilterSistema] = useState('Todos');
  const [filterSponsor, setFilterSponsor] = useState('Todos');
  const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'desc' });

  const SPRINT_OPTIONS = ['Sprint 04/26', 'Sprint 05/26', 'Sprint 06/26', 'Sprint 07/26', 'Sprint 08/26', 'Sprint 09/26', 'Sprint 10/26', 'Sprint 11/26', 'Sprint 12/26'];
  const analysts = ['Todos', ...new Set(tickets.map(t => t.analyst))];
  const keyUsers = ['Todos', ...new Set(tickets.map(t => t.keyUser).filter(Boolean))].sort();
  const sprints = ['Todas', ...new Set(tickets.map(t => t.sprint).filter(Boolean))].sort();
  
  const dynamicTypes = demandTypes.length > 0 ? demandTypes.map(t => t.name) : [];
  const existingTypes = tickets.map(t => t.type || 'Não Definido');
  const types = ['Todos', ...new Set([...dynamicTypes, ...existingTypes])].sort();

  const dynamicSystems = systems.length > 0 ? systems.map(s => s.name) : [];
  const existingSystems = tickets.map(t => t.sistema || 'Não Definido');
  const sistemasList = ['Todos', ...new Set([...dynamicSystems, ...existingSystems])].sort();

  const dynamicSponsors = sponsors.length > 0 ? sponsors.map(s => s.name) : [];
  const existingSponsors = tickets.map(t => t.sponsor || 'Não Definido');
  const sponsorsList = ['Todos', ...new Set([...dynamicSponsors, ...existingSponsors])].sort();

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown size={14} className="text-slate-300 ml-1" />;
    return sortConfig.direction === 'asc' ? <ChevronUp size={14} className="text-blue-500 ml-1" /> : <ChevronDown size={14} className="text-blue-500 ml-1" />;
  };

  const filteredAndSortedTickets = useMemo(() => {
    let result = tickets.filter(t => {
      const matchesSearch = t.id.toLowerCase().includes(searchTerm.toLowerCase()) || t.description.toLowerCase().includes(searchTerm.toLowerCase()) || (t.keyUser || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesAnalyst = filterAnalyst === 'Todos' || t.analyst === filterAnalyst;
      const matchesKeyUser = filterKeyUser === 'Todos' || t.keyUser === filterKeyUser;
      const matchesSprint = filterSprint === 'Todas' || t.sprint === filterSprint;
      const matchesType = filterType === 'Todos' || (t.type || 'Não Definido') === filterType;
      const matchesSistema = filterSistema === 'Todos' || (t.sistema || 'Não Definido') === filterSistema;
      const matchesSponsor = filterSponsor === 'Todos' || (t.sponsor || 'Não Definido') === filterSponsor;
      const matchesStatus = filterStatus === 'Todos' ? true :
                            filterStatus === 'Em Andamento' ? (t.status !== '10 - Concluído' && t.status !== '00 - Cancelado' && t.status !== '00 - Paralisado' && t.status !== '00 - Bloqueado') :
                            t.status === filterStatus;
      return matchesSearch && matchesAnalyst && matchesKeyUser && matchesSprint && matchesType && matchesSistema && matchesStatus && matchesSponsor;
    });

    result.sort((a, b) => {
      let aValue = a[sortConfig.key] || '';
      let bValue = b[sortConfig.key] || '';
      if (sortConfig.key === 'id') {
        aValue = parseInt(aValue.replace(/\D/g, '')) || 0;
        bValue = parseInt(bValue.replace(/\D/g, '')) || 0;
      }
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [tickets, searchTerm, filterAnalyst, filterKeyUser, filterSprint, filterType, sortConfig, filterStatus, filterSistema, filterSponsor]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row gap-4 justify-between bg-slate-50 flex-wrap">
        <div className="relative w-full lg:w-80 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="Pesquisar ID ou Descrição..." className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-blue-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-500">Tipo:</span>
        <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-slate-500">Sistema:</span>
        <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500" value={filterSistema} onChange={(e) => setFilterSistema(e.target.value)}>
          {sistemasList.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-slate-500">Patrocinador:</span>
        <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500" value={filterSponsor} onChange={(e) => setFilterSponsor(e.target.value)}>
          {sponsorsList.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-slate-500">Key User:</span>
            <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500" value={filterKeyUser} onChange={(e) => setFilterKeyUser(e.target.value)}>
              {keyUsers.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-500">Analista:</span>
            <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500" value={filterAnalyst} onChange={(e) => setFilterAnalyst(e.target.value)}>
              {analysts.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-500">Sprint:</span>
            <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500" value={filterSprint} onChange={(e) => setFilterSprint(e.target.value)}>
              {sprints.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-500">Status:</span>
            <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="Todos">Todos</option>
              <option value="Em Andamento">Em Andamento</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider">
              <th className="px-6 py-4 font-semibold cursor-pointer select-none" onClick={() => handleSort('id')}><div className="flex items-center">ID <SortIcon columnKey="id" /></div></th>
              <th className="px-6 py-4 font-semibold cursor-pointer select-none" onClick={() => handleSort('description')}><div className="flex items-center">Descrição <SortIcon columnKey="description" /></div></th>
              <th className="px-6 py-4 font-semibold cursor-pointer select-none" onClick={() => handleSort('sistema')}><div className="flex items-center">Sistema <SortIcon columnKey="sistema" /></div></th>
              <th className="px-6 py-4 font-semibold cursor-pointer select-none" onClick={() => handleSort('sponsor')}><div className="flex items-center">Patrocinador <SortIcon columnKey="sponsor" /></div></th>
              <th className="px-6 py-4 font-semibold cursor-pointer select-none" onClick={() => handleSort('keyUser')}><div className="flex items-center">Key User <SortIcon columnKey="keyUser" /></div></th>
              <th className="px-6 py-4 font-semibold cursor-pointer select-none" onClick={() => handleSort('type')}><div className="flex items-center">Tipo <SortIcon columnKey="type" /></div></th>
              <th className="px-6 py-4 font-semibold cursor-pointer select-none" onClick={() => handleSort('sprint')}><div className="flex items-center">Sprint <SortIcon columnKey="sprint" /></div></th>
              <th className="px-6 py-4 font-semibold cursor-pointer select-none" onClick={() => handleSort('analyst')}><div className="flex items-center">Analista <SortIcon columnKey="analyst" /></div></th>
              <th className="px-6 py-4 font-semibold cursor-pointer select-none" onClick={() => handleSort('status')}><div className="flex items-center">Status <SortIcon columnKey="status" /></div></th>
              <th className="px-6 py-4 font-semibold cursor-pointer select-none text-center" onClick={() => handleSort('progress')}><div className="flex items-center justify-center">Progresso <SortIcon columnKey="progress" /></div></th>
              <th className="px-6 py-4 font-semibold text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredAndSortedTickets.map(ticket => (
              <tr key={ticket.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-medium"><button onClick={() => onSelect(ticket)} className="text-blue-600 hover:underline">{ticket.id}</button></td>
                <td className="px-6 py-4"><div className="line-clamp-2 text-sm">{ticket.description}</div></td>
                <td className="px-6 py-4"><span className="text-sm font-medium text-slate-700">{ticket.sistema || '-'}</span></td>
                <td className="px-6 py-4"><span className="text-sm text-slate-600 truncate block max-w-[150px]" title={ticket.sponsor}>{ticket.sponsor || '-'}</span></td>
                <td className="px-6 py-4"><span className="text-sm text-slate-600 truncate block max-w-[150px]" title={ticket.keyUser}>{ticket.keyUser || '-'}</span></td>
                <td className="px-6 py-4"><span className="inline-flex gap-1.5 px-2.5 py-1 rounded text-xs bg-slate-100 text-slate-600 border border-slate-200"><Tag size={12} />{ticket.type || 'Não Definido'}</span></td>
                <td className="px-6 py-4">
                  <select
                    className={`border rounded px-2 py-1 outline-none text-sm cursor-pointer min-w-[130px] ${ticket.sprint ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                    value={ticket.sprint || ""}
                    onChange={(e) => { e.stopPropagation(); onUpdateSprint(ticket.id, e.target.value); }}
                  >
                    <option value="">-- Definir Sprint --</option>
                    {SPRINT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="px-6 py-4 text-sm">{ticket.analyst}</td>
                <td className="px-6 py-4"><span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium border" style={{ backgroundColor: `${STATUS_COLORS[ticket.status]}15`, color: STATUS_COLORS[ticket.status], borderColor: `${STATUS_COLORS[ticket.status]}40` }}>{ticket.status}</span></td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-full bg-slate-200 rounded-full h-2 min-w-[60px]"><div className="h-2 rounded-full" style={{ width: `${ticket.progress}%`, backgroundColor: STATUS_COLORS[ticket.status] || '#3B82F6' }}></div></div>
                    <span className="text-xs font-semibold">{ticket.progress}%</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => onSelect(ticket)} className="text-slate-400 hover:text-blue-600 p-2"><Edit size={18} /></button>
                    <button onClick={() => onDeleteClick(ticket)} className="text-slate-400 hover:text-red-600 p-2"><Trash2 size={18} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredAndSortedTickets.length === 0 && <tr><td colSpan="11" className="px-6 py-12 text-center text-slate-500">Sem demandas.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OnePageView({ tickets, onSave, systemUser }) {
  const [filterKeyUser, setFilterKeyUser] = useState('Todos');
  const [filterSprint, setFilterSprint] = useState('Todas');
  const [filterAnalyst, setFilterAnalyst] = useState('Todos');
  const [filterSponsor, setFilterSponsor] = useState('Todos');
  const [filterType, setFilterType] = useState('Todos');

  const keyUsers = useMemo(() => ['Todos', ...new Set(tickets.map(t => t.keyUser).filter(Boolean))].sort(), [tickets]);
  const sprints = useMemo(() => ['Todas', ...new Set(tickets.map(t => t.sprint || 'Sem Sprint'))].sort(), [tickets]);
  const analysts = useMemo(() => ['Todos', ...new Set(tickets.map(t => t.analyst).filter(Boolean))].sort(), [tickets]);
  const sponsors = useMemo(() => ['Todos', ...new Set(tickets.map(t => t.sponsor).filter(Boolean))].sort(), [tickets]);
  const types = useMemo(() => ['Todos', ...new Set(tickets.map(t => t.type || 'Não Definido'))].sort(), [tickets]);

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      const matchKU = filterKeyUser === 'Todos' || t.keyUser === filterKeyUser;
      const matchSp = filterSprint === 'Todas' || (t.sprint || 'Sem Sprint') === filterSprint;
      const matchAn = filterAnalyst === 'Todos' || t.analyst === filterAnalyst;
      const matchSpon = filterSponsor === 'Todos' || t.sponsor === filterSponsor;
      const matchType = filterType === 'Todos' || (t.type || 'Não Definido') === filterType;
      return matchKU && matchSp && matchAn && matchSpon && matchType;
    });
  }, [tickets, filterKeyUser, filterSprint, filterAnalyst, filterSponsor, filterType]);

  const [selectedId, setSelectedId] = useState(tickets[0]?.id || '');

  useEffect(() => {
    if (filteredTickets.length > 0) {
      if (!filteredTickets.find(t => t.id === selectedId)) setSelectedId(filteredTickets[0].id);
    } else {
      setSelectedId('');
    }
  }, [filteredTickets, selectedId]);

  const safeTicket = useMemo(() => tickets.find(t => t.id === selectedId) || filteredTickets[0] || null, [tickets, selectedId, filteredTickets]);

  const [aiSummary, setAiSummary] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [aiNextSteps, setAiNextSteps] = useState('');
  const [isGeneratingNextSteps, setIsGeneratingNextSteps] = useState(false);
  const timelineRef = useRef(null);
  const [localSchedule, setLocalSchedule] = useState<any>({});
  const [dragState, setDragState] = useState<any>(null); 

  useEffect(() => { if (safeTicket) setLocalSchedule(safeTicket.schedule || {}); }, [safeTicket]);

  const handleGenerateAISummary = async (targetTicket) => {
    if (!targetTicket) return;
    setIsGeneratingSummary(true);
    setAiSummary('');
    const historyText = targetTicket.logs && targetTicket.logs.length > 0 ? sortLogsAsc(targetTicket.logs).map(l => `${l.date} (${l.author}): ${l.text}`).join('\n') : "Nenhum histórico registrado.";
    const prompt = `Resumo executivo do histórico da demanda: ${targetTicket.id} - ${targetTicket.description}. Formate em Markdown.\n${historyText}`;
    try { const result = await callClaudeWithRetry(prompt); setAiSummary(result); } catch (e) { setAiSummary("Erro ao gerar resumo."); } finally { setIsGeneratingSummary(false); }
  };

  const handleGenerateNextSteps = async (targetTicket) => {
    if (!targetTicket) return;
    setIsGeneratingNextSteps(true);
    setAiNextSteps('');
    const historyText = targetTicket.logs && targetTicket.logs.length > 0 ? sortLogsAsc(targetTicket.logs).map(l => `${l.date} (${l.author}): ${l.text}`).join('\n') : "Nenhum histórico registrado.";
    const prompt = `Atue como um Scrum Master. Analise o status, descrição e histórico desta demanda e liste os 3 próximos passos práticos, lógicos e imediatos para fazê-la avançar. Formate a resposta usando Markdown (bullet points).\nDemanda: ${targetTicket.description}\nStatus Atual: ${targetTicket.status}\nHistórico: ${historyText}`;
    try { const result = await callClaudeWithRetry(prompt); setAiNextSteps(result); } catch (e) { setAiNextSteps("Erro ao gerar próximos passos."); } finally { setIsGeneratingNextSteps(false); }
  };

  useEffect(() => { 
    if (safeTicket) {
      handleGenerateAISummary(safeTicket);
      setAiNextSteps(''); 
    }
  }, [selectedId, safeTicket?.id]);

  const dynamicTicket = useMemo(() => ({ ...safeTicket, schedule: localSchedule }), [safeTicket, localSchedule]);
  const ganttPhases = useMemo(() => dynamicTicket ? generateGanttPhases(dynamicTicket) : [], [dynamicTicket]);
  const sortedLogsDesc = useMemo(() => sortLogsDesc(safeTicket?.logs), [safeTicket]);
  const ticketHistory = safeTicket?.statusHistory || [{ status: safeTicket?.status, date: safeTicket?.logs?.[0]?.date || new Date().toISOString().split('T')[0] }];

  let minDateMs = Infinity, maxDateMs = 0;
  ganttPhases.forEach(p => {
     if (p.plannedStartMs) minDateMs = Math.min(minDateMs, p.plannedStartMs);
     if (p.actualStartMs) minDateMs = Math.min(minDateMs, p.actualStartMs);
     if (p.plannedEndMs) maxDateMs = Math.max(maxDateMs, p.plannedEndMs);
     if (p.actualEndMs) maxDateMs = Math.max(maxDateMs, p.actualEndMs);
  });
  if (minDateMs === Infinity) minDateMs = new Date().getTime();
  if (maxDateMs === 0) maxDateMs = new Date().getTime() + 86400000;
  const totalMs = Math.max(maxDateMs - minDateMs, 86400000);

  const startDrag = (e, phaseName, handleType) => {
    e.preventDefault();
    if (!timelineRef.current) return;
    const pxPerMs = timelineRef.current.offsetWidth / totalMs;
    const phaseData = localSchedule[phaseName] || {};
    let initialDateStr = handleType === 'start' ? phaseData.actualStart : phaseData.actualEnd;
    let initialDateMs = initialDateStr ? new Date(initialDateStr + 'T00:00:00').getTime() : new Date().getTime();
    setDragState({ phaseName, handleType, initialX: e.clientX, initialDateMs, pxPerMs });
  };

  useEffect(() => {
    if (!dragState) return;
    const handleMouseMove = (e) => {
      const deltaMs = (e.clientX - dragState.initialX) / dragState.pxPerMs;
      const newDateStr = new Date(dragState.initialDateMs + deltaMs - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];

      setLocalSchedule(prev => {
        const updated = { ...prev };
        if (!updated[dragState.phaseName]) updated[dragState.phaseName] = {};
        if (dragState.handleType === 'start') {
          updated[dragState.phaseName].actualStart = newDateStr;
          if (updated[dragState.phaseName].actualEnd && new Date(updated[dragState.phaseName].actualEnd) < new Date(newDateStr)) updated[dragState.phaseName].actualEnd = newDateStr;
        } else {
          updated[dragState.phaseName].actualEnd = newDateStr;
          if (updated[dragState.phaseName].actualStart && new Date(updated[dragState.phaseName].actualStart) > new Date(newDateStr)) updated[dragState.phaseName].actualStart = newDateStr;
        }
        return updated;
      });
    };
    const handleMouseUp = () => { setDragState(null); setTimeout(() => setLocalSchedule(c => { onSave({ ...safeTicket, schedule: c }); return c; }), 0); };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'ew-resize';
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); document.body.style.cursor = 'default'; };
  }, [dragState, safeTicket, onSave]);

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col gap-4">
        
        <div className="flex flex-wrap items-center gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-500">Tipo:</span>
            <select className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              {types.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-500">Key User:</span>
            <select className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white" value={filterKeyUser} onChange={(e) => setFilterKeyUser(e.target.value)}>
              {keyUsers.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-500">Sprint:</span>
            <select className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white" value={filterSprint} onChange={(e) => setFilterSprint(e.target.value)}>
              {sprints.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-500">Analista:</span>
            <select className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white" value={filterAnalyst} onChange={(e) => setFilterAnalyst(e.target.value)}>
              {analysts.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-500">Patrocinador:</span>
            <select className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white" value={filterSponsor} onChange={(e) => setFilterSponsor(e.target.value)}>
              {sponsors.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full">
          <div className="bg-blue-100 text-blue-600 p-2 rounded-lg"><Search size={20} /></div>
          <select 
            className="w-full text-lg font-semibold text-slate-800 bg-transparent outline-none cursor-pointer disabled:opacity-50" 
            value={selectedId} 
            onChange={(e) => setSelectedId(e.target.value)}
            disabled={filteredTickets.length === 0}
          >
            {filteredTickets.map(t => <option key={t.id} value={t.id}>{t.id} - {t.description}</option>)}
            {filteredTickets.length === 0 && <option value="">Nenhuma demanda encontrada para os filtros selecionados</option>}
          </select>
        </div>
      </div>

      {!safeTicket ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-10 text-center text-slate-500 font-medium flex flex-col items-center justify-center">
          <Search size={48} className="text-slate-300 mb-4" />
          Nenhuma demanda disponível para os filtros selecionados.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 border-l-4" style={{borderLeftColor: STATUS_COLORS[safeTicket.status] || '#CBD5E1'}}><p className="text-xs text-slate-500 font-semibold uppercase mb-1">Status Atual</p><p className="font-bold text-slate-800 truncate" style={{color: STATUS_COLORS[safeTicket.status]}}>{safeTicket.status}</p></div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200"><p className="text-xs text-slate-500 font-semibold uppercase mb-1">Progresso</p><div className="flex items-center gap-2"><div className="w-full bg-slate-200 rounded-full h-2"><div className="h-2 rounded-full bg-blue-600" style={{ width: `${safeTicket.progress}%` }}></div></div><span className="text-sm font-bold text-slate-700">{safeTicket.progress}%</span></div></div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200"><p className="text-xs text-slate-500 font-semibold uppercase mb-1">Sistema</p><p className="font-bold text-slate-800 flex items-center gap-2 truncate"><Database size={16} className="text-teal-500 shrink-0"/> {safeTicket.sistema || '-'}</p></div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200"><p className="text-xs text-slate-500 font-semibold uppercase mb-1">Key User / Tipo</p><p className="font-bold text-slate-800 flex items-center gap-2 truncate"><User size={16} className="text-blue-500 shrink-0"/> {safeTicket.keyUser}</p></div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200"><p className="text-xs text-slate-500 font-semibold uppercase mb-1">Analista (Resp.)</p><p className="font-bold text-slate-800 flex items-center gap-2"><UserCircle size={16} className="text-purple-500"/> {safeTicket.analyst}</p></div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200"><p className="text-xs text-slate-500 font-semibold uppercase mb-1">Recursos (Equipe)</p><p className="font-bold text-slate-800 flex items-center gap-2 truncate" title={safeTicket.recursos?.length > 0 ? safeTicket.recursos.join(', ') : (safeTicket.recurso || '-')}><User size={16} className="text-emerald-500 shrink-0"/> {safeTicket.recursos?.length > 0 ? safeTicket.recursos.join(', ') : (safeTicket.recurso || '-')}</p></div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200"><p className="text-xs text-slate-500 font-semibold uppercase mb-1">Patrocinador</p><p className="font-bold text-slate-800 flex items-center gap-2 truncate"><Shield size={16} className="text-indigo-500 shrink-0"/> {safeTicket.sponsor || '-'}</p></div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200"><p className="text-xs text-slate-500 font-semibold uppercase mb-1">Sprint</p><p className="font-bold text-slate-800 flex items-center gap-2 truncate"><Tag size={16} className="text-orange-500 shrink-0"/> {safeTicket.sprint || 'Sem Sprint'}</p></div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col w-full" style={{ userSelect: dragState ? 'none' : 'auto' }}>
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-700">Cronograma do Projeto</h3>
            </div>
            <div className="p-5 overflow-x-auto relative">
              <div className="min-w-[900px]">
                <div className="flex border-b border-slate-200 pb-2 mb-4 text-xs font-bold text-slate-400 uppercase">
                  <div className="w-[20%]"></div>
                  <div className="w-[80%] flex justify-between px-2">
                    <div className="text-left whitespace-nowrap">{formatMonthYear(minDateMs)}</div>
                    <div className="text-right whitespace-nowrap">{formatMonthYear(maxDateMs)}</div>
                  </div>
                </div>
                <div className="relative">
                  {ganttPhases.map((phase, i) => {
                    let pLeftPos = 0, pWidthPos = 0, aLeftPos = 0, aWidthPos = 0;
                    if (phase.plannedStartMs && phase.plannedEndMs) { pLeftPos = ((phase.plannedStartMs - minDateMs) / totalMs) * 100; pWidthPos = ((phase.plannedEndMs - phase.plannedStartMs) / totalMs) * 100; }
                    if (phase.actualStartMs && phase.actualEndMs) { aLeftPos = ((phase.actualStartMs - minDateMs) / totalMs) * 100; aWidthPos = ((phase.actualEndMs - phase.actualStartMs) / totalMs) * 100; } 
                    else if (phase.actualStartMs) { aLeftPos = ((phase.actualStartMs - minDateMs) / totalMs) * 100; aWidthPos = ((Math.min(new Date().getTime(), maxDateMs) - phase.actualStartMs) / totalMs) * 100; }
                    return (
                      <div key={i} className="flex items-center border-b border-slate-50 py-3 relative group">
                        <div className="w-[20%] pr-4 z-10 bg-white"><span className="text-xs font-bold text-slate-700 truncate block">{phase.name}</span></div>
                        <div className="w-[80%] relative flex flex-col justify-center gap-2 h-full pt-1 px-2" ref={i === 0 ? timelineRef : null}>
                          
                          {(phase.plannedStartMs && phase.plannedEndMs) ? (
                            <div className="flex items-center" style={{ marginLeft: `calc(${pLeftPos}% - 0.5rem)` }}>
                              <div className="h-6 rounded-md bg-slate-200 opacity-90 shrink-0" style={{ width: `${pWidthPos}%`, minWidth: '40px' }}></div>
                              <span className="ml-2 text-[10px] font-bold text-slate-400 whitespace-nowrap">
                                 {formatDateShort(phase.plannedStartMs)} a {formatDateShort(phase.plannedEndMs)}
                              </span>
                            </div>
                          ) : <div className="h-6"></div>}
                          
                          {phase.actualStartMs ? (
                            <div className="flex items-center" style={{ marginLeft: `calc(${aLeftPos}% - 0.5rem)` }}>
                              <div className={`h-8 rounded-md shadow-sm border relative ${dragState?.phaseName === phase.name ? 'ring-2 ring-blue-400' : 'border-slate-300'} bg-slate-100`} style={{ width: `${aWidthPos}%`, minWidth: '70px' }}>
                                <div className={`absolute top-0 left-0 h-full ${phase.progress === 100 ? 'bg-emerald-500' : (phase.progress > 0 ? 'bg-blue-500' : 'bg-slate-300')}`} style={{ width: `${phase.progress}%`, minWidth: '2px' }}></div>
                                <div className="absolute top-0 left-0 bottom-0 w-3 cursor-ew-resize bg-black/0 hover:bg-black/10 transition-colors rounded-l-md z-10" onMouseDown={(e) => startDrag(e, phase.name, 'start')}></div>
                                {phase.actualEndMs && <div className="absolute top-0 right-0 bottom-0 w-3 cursor-ew-resize bg-black/0 hover:bg-black/10 transition-colors rounded-r-md z-10" onMouseDown={(e) => startDrag(e, phase.name, 'end')}></div>}
                              </div>
                              <div className="ml-2 flex items-center gap-1.5 pointer-events-none whitespace-nowrap">
                                 <span className="text-[11px] font-black text-slate-700">{phase.progress}%</span>
                                 <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                                    <span className="w-1 h-1 rounded-full bg-slate-400"></span>
                                    {formatDateShort(phase.actualStartMs)} {phase.actualEndMs ? `a ${formatDateShort(phase.actualEndMs)}` : ''}
                                 </span>
                              </div>
                            </div>
                          ) : <div className="h-8"></div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <div className="flex flex-col gap-6">
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl shadow-sm border border-indigo-100 overflow-hidden flex flex-col">
                <div className="p-4 border-b border-indigo-100/50 flex justify-between items-center"><h3 className="font-bold text-indigo-900">Resumo Executivo (IA)</h3></div>
                <div className="p-5 flex flex-col gap-4">
                  {!isGeneratingSummary ? (aiSummary ? <div className="text-[14px] text-slate-800 whitespace-pre-wrap">{aiSummary}</div> : <button onClick={() => handleGenerateAISummary(safeTicket)} className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-bold flex justify-center gap-2 mx-auto"><Sparkles size={16} /> Gerar Resumo Inteligente</button>) : <div className="flex justify-center py-4"><Loader2 className="animate-spin text-indigo-600" /></div>}
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-xl shadow-sm border border-teal-100 overflow-hidden flex flex-col">
                <div className="p-4 border-b border-teal-100/50 flex justify-between items-center"><h3 className="font-bold text-teal-900">Próximos Passos (IA)</h3></div>
                <div className="p-5 flex flex-col gap-4">
                  {!isGeneratingNextSteps ? (aiNextSteps ? <div className="text-[14px] text-slate-800 whitespace-pre-wrap">{aiNextSteps}</div> : <button onClick={() => handleGenerateNextSteps(safeTicket)} className="bg-teal-600 text-white px-5 py-2 rounded-lg text-sm font-bold flex justify-center gap-2 mx-auto"><Sparkles size={16} /> ✨ Sugerir Próximos Passos</button>) : <div className="flex justify-center py-4"><Loader2 className="animate-spin text-teal-600" /></div>}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2"><Clock size={18} className="text-slate-500" /><h3 className="font-semibold text-slate-700">Tempo por Status</h3></div>
                <div className="p-5">
                  <div className="flex flex-wrap gap-4">
                    {ticketHistory.map((h, i) => (
                      <div key={i} className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3 flex-1 min-w-[180px]">
                        <div className="w-2 h-full min-h-[30px] rounded-full" style={{ backgroundColor: STATUS_COLORS[h.status] || '#ccc' }}></div>
                        <div className="flex-1 overflow-hidden"><p className="text-xs font-bold text-slate-700 truncate">{h.status}</p><p className="text-[10px] text-slate-500">{h.date}</p></div>
                        <div className="text-right pl-2 border-l border-slate-200"><p className="text-xl font-black text-slate-700">{calculateDays(h.date, ticketHistory[i + 1]?.date)}</p></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between"><div className="flex items-center gap-2"><CalendarDays size={18} className="text-slate-500" /><h3 className="font-semibold text-slate-700">Diário de Bordo</h3></div></div>
              <div className="p-5 flex-1 overflow-y-auto space-y-4">
                {sortedLogsDesc.length === 0 ? <p className="text-slate-400 text-center mt-10">Nenhum registo.</p> : sortedLogsDesc.map((log, i) => (
                  <div key={log.id || i} className="bg-slate-50 border border-slate-100 rounded-lg p-3"><div className="flex justify-between items-start mb-1"><span className="text-xs font-bold text-slate-700">{log.date}</span><span className="text-[10px] text-slate-500">{log.author}</span></div><p className="text-sm text-slate-600 whitespace-pre-wrap">{log.text}</p></div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PdfReportView({ tickets, showToast }) {
  const [filterType, setFilterType] = useState(['Todos']);
  const [filterKeyUser, setFilterKeyUser] = useState(['Todos']);
  const [filterSprint, setFilterSprint] = useState(['Todos']);
  const [filterStatus, setFilterStatus] = useState(['Todos']);
  const [filterSponsor, setFilterSponsor] = useState(['Todos']);
  
  const types = [...new Set(tickets.map(t => t.type || 'Não Definido'))].sort();
  const keyUsers = [...new Set(tickets.map(t => t.keyUser).filter(Boolean))].sort();
  const sprints = [...new Set(tickets.map(t => t.sprint || 'Sem Sprint'))].sort();
  const sponsorsList = [...new Set(tickets.map(t => t.sponsor || 'Não Definido'))].sort();
  const statuses = [...STATUS_OPTIONS];

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      const matchTyp = filterType.includes('Todos') || filterType.includes(t.type || 'Não Definido');
      const matchKU = filterKeyUser.includes('Todos') || filterKeyUser.includes(t.keyUser);
      const matchSp = filterSprint.includes('Todos') || filterSprint.includes(t.sprint || 'Sem Sprint');
      const matchSt = filterStatus.includes('Todos') || filterStatus.includes(t.status);
      const matchSpn = filterSponsor.includes('Todos') || filterSponsor.includes(t.sponsor || 'Não Definido');
      return matchTyp && matchKU && matchSp && matchSt && matchSpn;
    });
  }, [tickets, filterType, filterKeyUser, filterSprint, filterStatus, filterSponsor]);

  const handlePrint = () => {
    window.print();
    setTimeout(() => {
      if (showToast) showToast("Se a janela não abrir automaticamente, prima Ctrl+P (ou Cmd+P) e escolha 'Guardar como PDF'.", "success");
    }, 500);
  };

  // Nota técnica: o app usava a lib "html2pdf.js" (que embute uma versão antiga
  // do html2canvas, carregada em tempo de execução via CDN). Essa versão
  // antiga não sabe interpretar as cores no formato oklch()/lab() que o
  // Tailwind CSS v4 passou a usar por padrão em toda a paleta de cores — ela
  // quebra com o erro "Attempting to parse an unsupported color function
  // 'oklch'" assim que tenta capturar qualquer elemento colorido, o que fazia
  // a geração do PDF falhar sempre (o botão parecia não fazer nada, ou o
  // download nunca completava). A correção é usar "html2canvas-pro" — um fork
  // mantido, com a mesma API, que entende essas cores modernas — junto com o
  // jsPDF, ambos agora como dependências reais do projeto (sem depender de
  // script externo em tempo de execução, o que também evita falhas por causa
  // de rede/proxy corporativo). O PDF é montado página a página (uma demanda
  // por página, replicando o que a classe "break-after-page" já fazia na
  // impressão pelo navegador).
  //
  // Segunda causa raiz encontrada (a folha de estilos era carregada, mas o
  // PDF saía sem nenhuma formatação — só texto corrido): o html2canvas
  // reconstrói a página numa cópia (clone) isolada e, para isso, precisa
  // reler a folha de estilos por conta própria; reproduzi em laboratório um
  // caso em que essa releitura falha silenciosamente (mesmo com a página já
  // 100% carregada e exibida corretamente na tela) e o resultado é
  // exatamente o que foi reportado: card/grid/cores desaparecem, sobra só o
  // texto em ordem, com uma exceção pontual aqui ou ali colorida via estilo
  // inline. A correção definitiva é não depender dessa releitura: com o hook
  // "onclone" do html2canvas, antes de capturar, copiamos o estilo já
  // computado (o que o navegador está exibindo de verdade, elemento por
  // elemento) diretamente para o clone, como estilo inline. Assim o
  // html2canvas não precisa mais reinterpretar a folha de estilos — ele já
  // recebe o resultado final, garantido de bater com o que aparece na tela.
  function inlineComputedStyles(source: Element, clone: Element) {
    const sourceStyle = window.getComputedStyle(source);
    const cloneStyle = (clone as HTMLElement).style;
    for (let i = 0; i < sourceStyle.length; i++) {
      const prop = sourceStyle.item(i);
      cloneStyle.setProperty(prop, sourceStyle.getPropertyValue(prop), sourceStyle.getPropertyPriority(prop));
    }
    const sourceChildren = source.children;
    const cloneChildren = clone.children;
    for (let i = 0; i < sourceChildren.length; i++) {
      inlineComputedStyles(sourceChildren[i], cloneChildren[i]);
    }
  }

  const handleDownloadPDF = async () => {
    if (showToast) showToast("A gerar arquivo PDF. Isto pode demorar alguns segundos...", "success");

    const container = document.getElementById('pdf-report-content');
    if (!container) return;

    try {
      const pages = Array.from(container.children).filter((el) => el.nodeType === 1);
      if (pages.length === 0) return;

      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const usableWidth = pageWidth - margin * 2;
      const usableHeight = pageHeight - margin * 2;

      for (let i = 0; i < pages.length; i++) {
        const canvas = await html2canvas(pages[i], {
          scale: 2,
          windowWidth: 1200,
          useCORS: true,
          onclone: (_doc, clonedEl) => {
            inlineComputedStyles(pages[i], clonedEl);
          },
        });
        const imgData = canvas.toDataURL('image/jpeg', 0.98);
        let renderWidth = usableWidth;
        let renderHeight = (canvas.height * usableWidth) / canvas.width;
        if (renderHeight > usableHeight) {
          const ratio = usableHeight / renderHeight;
          renderHeight = usableHeight;
          renderWidth = renderWidth * ratio;
        }
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', margin, margin, renderWidth, renderHeight);
      }

      pdf.save(`Relatorio_Demandas_${new Date().toISOString().split('T')[0]}.pdf`);
      if (showToast) showToast("PDF gerado com sucesso!", "success");
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      if (showToast) showToast("Erro ao gerar o PDF. Tente novamente ou use 'Imprimir (Navegador)'.", "error");
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto print:max-w-none">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 print:hidden">
        <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2"><Printer className="text-blue-600" /> Relatório Consolidado para PDF</h3>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
          <MultiSelectFilter label="Tipo" options={types} selected={filterType} onChange={setFilterType} />
          <MultiSelectFilter label="Key User" options={keyUsers} selected={filterKeyUser} onChange={setFilterKeyUser} />
          <MultiSelectFilter label="Sprint" options={sprints} selected={filterSprint} onChange={setFilterSprint} />
          <MultiSelectFilter label="Status" options={statuses} selected={filterStatus} onChange={setFilterStatus} />
          <MultiSelectFilter label="Patrocinador" options={sponsorsList} selected={filterSponsor} onChange={setFilterSponsor} />
        </div>
        <div className="mt-6 flex flex-col md:flex-row md:items-center justify-between border-t border-slate-200 pt-6 gap-4">
          <span className="bg-blue-100 text-blue-800 font-bold px-4 py-2 rounded-lg text-sm inline-block w-max">{filteredTickets.length} Demanda(s) Selecionada(s)</span>
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={handlePrint} disabled={filteredTickets.length === 0} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"><Printer size={18} /> Imprimir (Navegador)</button>
            <button onClick={handleDownloadPDF} disabled={filteredTickets.length === 0} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-colors"><FileText size={18} /> Exportar Arquivo PDF</button>
          </div>
        </div>
      </div>
      {filteredTickets.length > 0 ? (
        <div id="pdf-report-content" className="print:block space-y-12 print:space-y-0 pb-10">
          {filteredTickets.map((ticket, index) => (
            <div key={ticket.id} className="break-after-page print:pt-4 bg-white rounded-xl p-6 print:p-0 print:block"><PrintableOnePage ticket={ticket} pageNumber={index + 1} totalPages={filteredTickets.length} /></div>
          ))}
        </div>
      ) : <div className="text-center py-10">Nenhum relatório.</div>}
    </div>
  );
}

function PrintableOnePage({ ticket, pageNumber, totalPages }) {
  const ganttPhases = useMemo(() => generateGanttPhases(ticket), [ticket]);
  
  let minDateMs = Infinity, maxDateMs = 0;
  ganttPhases.forEach(p => {
     if (p.plannedStartMs) minDateMs = Math.min(minDateMs, p.plannedStartMs);
     if (p.actualStartMs) minDateMs = Math.min(minDateMs, p.actualStartMs);
     if (p.plannedEndMs) maxDateMs = Math.max(maxDateMs, p.plannedEndMs);
     if (p.actualEndMs) maxDateMs = Math.max(maxDateMs, p.actualEndMs);
  });
  if (minDateMs === Infinity) minDateMs = new Date().getTime();
  if (maxDateMs === 0) maxDateMs = new Date().getTime() + 86400000;
  const totalMs = Math.max(maxDateMs - minDateMs, 86400000);
  
  const ticketHistory = ticket.statusHistory || [{ status: ticket.status, date: ticket.logs?.[0]?.date || new Date().toISOString().split('T')[0] }];
  const sortedLogs = sortLogsDesc(ticket.logs);

  return (
    <div className="flex flex-col bg-white font-sans text-slate-800 space-y-6 print:block">
      
      <div className="border-b-2 border-slate-800 pb-4 flex justify-between items-end no-break shrink-0 print:mb-6">
        <div>
          <p className="text-sm font-bold text-slate-500 uppercase">One Page Report</p>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black text-slate-900">{ticket.id}</h2>
            <span className="text-xs bg-slate-50 border border-slate-200 px-2 py-0.5 rounded text-slate-600 font-semibold">{ticket.type || 'Não Definido'}</span>
          </div>
          <p className="text-base font-medium text-slate-700 mt-1 max-w-3xl">{ticket.description}</p>
          {ticket.scope && (
             <div className="mt-3">
               <p className="text-[10px] font-bold text-slate-500 uppercase">Escopo</p>
               <p className="text-sm font-medium text-slate-700 max-w-3xl whitespace-pre-wrap">{ticket.scope}</p>
             </div>
          )}
        </div>
        <div className="text-right pb-1">
          <p className="text-sm font-bold text-slate-500">Pág. {pageNumber} / {totalPages}</p>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-4 no-break shrink-0">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 border-l-4" style={{borderLeftColor: STATUS_COLORS[ticket.status] || '#CBD5E1'}}>
          <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Status Atual</p>
          <p className="font-black text-sm truncate" style={{color: STATUS_COLORS[ticket.status]}}>{ticket.status}</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Progresso</p>
          <div className="flex items-center gap-2">
            <div className="w-full bg-slate-200 rounded-full h-1.5"><div className="h-1.5 rounded-full bg-blue-600" style={{ width: `${ticket.progress}%` }}></div></div>
            <span className="text-xs font-black text-slate-700">{ticket.progress}%</span>
          </div>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Key User</p>
          <p className="font-bold text-sm text-slate-800 truncate">{ticket.keyUser || '-'}</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Analista Resp.</p>
          <p className="font-bold text-sm text-slate-800 truncate">{ticket.analyst || '-'}</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Recursos (Equipe)</p>
          <p className="font-bold text-sm text-slate-800 truncate">{ticket.recursos?.length > 0 ? ticket.recursos.join(', ') : (ticket.recurso || '-')}</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Patrocinador</p>
          <p className="font-bold text-sm text-slate-800 truncate">{ticket.sponsor || '-'}</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Sprint</p>
          <p className="font-bold text-sm text-slate-800 truncate">{ticket.sprint || 'Sem Sprint'}</p>
        </div>
      </div>

      <div className="border border-slate-200 rounded-xl overflow-hidden flex flex-col w-full no-break shrink-0">
        <div className="p-3 border-b border-slate-200 bg-slate-100 flex items-center gap-2">
          <AlignLeft size={16} className="text-slate-500" />
          <h3 className="font-bold text-sm text-slate-700 uppercase tracking-wider">Cronograma de Fases</h3>
        </div>
        <div className="p-5">
          <div className="flex border-b border-slate-200 pb-2 mb-3 text-[10px] font-bold text-slate-400 uppercase">
            <div className="w-[25%]">Fase</div>
            <div className="w-[75%] flex justify-between px-2">
              <div className="text-left">{formatMonthYear(minDateMs)}</div>
              <div className="text-right">{formatMonthYear(maxDateMs)}</div>
            </div>
          </div>
          <div className="relative space-y-2">
            {ganttPhases.map((phase, i) => {
              let pLeftPos = 0, pWidthPos = 0, aLeftPos = 0, aWidthPos = 0;
              if (phase.plannedStartMs && phase.plannedEndMs) { pLeftPos = ((phase.plannedStartMs - minDateMs) / totalMs) * 100; pWidthPos = ((phase.plannedEndMs - phase.plannedStartMs) / totalMs) * 100; }
              if (phase.actualStartMs && phase.actualEndMs) { aLeftPos = ((phase.actualStartMs - minDateMs) / totalMs) * 100; aWidthPos = ((phase.actualEndMs - phase.actualStartMs) / totalMs) * 100; } 
              else if (phase.actualStartMs) { aLeftPos = ((phase.actualStartMs - minDateMs) / totalMs) * 100; aWidthPos = ((Math.min(new Date().getTime(), maxDateMs) - phase.actualStartMs) / totalMs) * 100; }
              return (
                <div key={i} className="flex items-center border-b border-slate-50/50 pb-2 mb-2 relative">
                  <div className="w-[25%] pr-2"><span className="text-[11px] font-bold text-slate-700 leading-tight block">{phase.name}</span></div>
                  <div className="w-[75%] relative flex flex-col justify-center gap-1.5 px-2">
                    {(phase.plannedStartMs && phase.plannedEndMs) ? (
                      <div className="flex items-center" style={{ marginLeft: `${pLeftPos}%` }}>
                        <div className="h-3 rounded bg-slate-200 opacity-90 print:bg-slate-200 print:opacity-100 shrink-0" style={{ width: `${pWidthPos}%`, minWidth: '30px' }}></div>
                        <span className="ml-1 text-[8px] font-bold text-slate-400 whitespace-nowrap">
                           {formatDateShort(phase.plannedStartMs)} a {formatDateShort(phase.plannedEndMs)}
                        </span>
                      </div>
                    ) : <div className="h-3"></div>}
                    {phase.actualStartMs ? (
                      <div className="flex items-center" style={{ marginLeft: `${aLeftPos}%` }}>
                        <div className="h-4 rounded bg-slate-100 border border-slate-300 relative print:bg-slate-100" style={{ width: `${aWidthPos}%`, minWidth: '40px' }}>
                          <div className={`absolute top-0 left-0 h-full ${phase.progress === 100 ? 'bg-emerald-500' : (phase.progress > 0 ? 'bg-blue-500' : 'bg-slate-300')} print:opacity-100`} style={{ width: `${phase.progress}%`, minWidth: '2px' }}></div>
                        </div>
                        <div className="ml-1.5 flex items-center gap-1.5 pointer-events-none whitespace-nowrap">
                           <span className="text-[9px] font-black text-slate-700">{phase.progress}%</span>
                           <span className="text-[8px] font-bold text-slate-500 flex items-center gap-1">
                              <span className="w-1 h-1 rounded-full bg-slate-400"></span>
                              {formatDateShort(phase.actualStartMs)} {phase.actualEndMs ? `a ${formatDateShort(phase.actualEndMs)}` : ''}
                           </span>
                        </div>
                      </div>
                    ) : <div className="h-4"></div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 no-break shrink-0">
        <div className="border border-slate-200 rounded-xl overflow-hidden flex flex-col">
          <div className="p-3 border-b border-slate-200 bg-slate-100 flex items-center gap-2">
            <Clock size={16} className="text-slate-500" />
            <h3 className="font-bold text-sm text-slate-700 uppercase tracking-wider">Tempo por Status</h3>
          </div>
          <div className="p-4">
            <div className="flex flex-col gap-3">
              {ticketHistory.map((h, i) => (
                <div key={i} className="flex items-center gap-3 bg-white border border-slate-100 rounded-lg p-2.5">
                  <div className="w-1.5 h-full min-h-[24px] rounded-full" style={{ backgroundColor: STATUS_COLORS[h.status] || '#ccc' }}></div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-[11px] font-bold text-slate-700 truncate">{h.status}</p>
                    <p className="text-[9px] text-slate-500">{h.date}</p>
                  </div>
                  <div className="text-right pl-2 border-l border-slate-100">
                    <p className="text-lg font-black text-slate-700 leading-none">{calculateDays(h.date, ticketHistory[i + 1]?.date)}<span className="text-[10px] font-normal text-slate-400 ml-0.5">dias</span></p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden flex flex-col">
          <div className="p-3 border-b border-slate-200 bg-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays size={16} className="text-slate-500" />
              <h3 className="font-bold text-sm text-slate-700 uppercase tracking-wider">Últimos Registos</h3>
            </div>
          </div>
          <div className="p-4 space-y-3">
            {sortedLogs.length === 0 ? <p className="text-xs text-slate-400 text-center py-4">Sem registos no diário.</p> : sortedLogs.slice(0, 5).map((log, i) => (
              <div key={log.id || i} className="border-l-2 border-blue-200 pl-3 pb-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold text-slate-700">{log.date}</span>
                  <span className="text-[9px] text-slate-500 font-medium bg-slate-50 px-1 rounded">{log.author}</span>
                </div>
                <p className="text-[11px] text-slate-600 whitespace-pre-wrap leading-snug line-clamp-3">{log.text}</p>
              </div>
            ))}
            {sortedLogs.length > 5 && <div className="text-center pt-2 border-t border-slate-100"><span className="text-[10px] font-bold text-slate-400">+ {sortedLogs.length - 5} registo(s) oculto(s)</span></div>}
          </div>
        </div>
      </div>

    </div>
  );
}

function KanbanView({ tickets, onSelect, onStatusChange }) {
  const [filterSprint, setFilterSprint] = useState('Todas');
  const [filterKeyUser, setFilterKeyUser] = useState('Todos');
  const [filterAnalyst, setFilterAnalyst] = useState('Todos');

  const sprints = useMemo(() => ['Todas', ...new Set(tickets.map(t => t.sprint || 'Sem Sprint'))].sort(), [tickets]);
  const keyUsers = useMemo(() => ['Todos', ...new Set(tickets.map(t => t.keyUser).filter(Boolean))].sort(), [tickets]);
  const analysts = useMemo(() => ['Todos', ...new Set(tickets.map(t => t.analyst).filter(Boolean))].sort(), [tickets]);

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      const matchSp = filterSprint === 'Todas' || (t.sprint || 'Sem Sprint') === filterSprint;
      const matchKU = filterKeyUser === 'Todos' || t.keyUser === filterKeyUser;
      const matchAn = filterAnalyst === 'Todos' || t.analyst === filterAnalyst;
      return matchSp && matchKU && matchAn;
    });
  }, [tickets, filterSprint, filterKeyUser, filterAnalyst]);

  const handleDrop = (e, status) => { e.preventDefault(); const id = e.dataTransfer.getData("ticketId"); if (id) onStatusChange(id, status); };
  
  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-500">Sprint:</span>
          <select className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white" value={filterSprint} onChange={(e) => setFilterSprint(e.target.value)}>
            {sprints.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-500">Key User:</span>
          <select className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white" value={filterKeyUser} onChange={(e) => setFilterKeyUser(e.target.value)}>
            {keyUsers.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-500">Analista:</span>
          <select className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white" value={filterAnalyst} onChange={(e) => setFilterAnalyst(e.target.value)}>
            {analysts.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="ml-auto text-xs font-bold text-slate-400">
          Mostrando {filteredTickets.length} demanda(s)
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-4 h-full pb-4 items-start min-w-max">
          {STATUS_OPTIONS.map(status => {
            const columnTickets = filteredTickets.filter(t => t.status === status);
            return (
              <div key={status} className="bg-slate-100 rounded-xl flex flex-col shrink-0 w-[320px] max-h-full border border-slate-200 shadow-sm" onDragOver={e=>e.preventDefault()} onDrop={e=>handleDrop(e, status)}>
                <div className="p-3 border-b border-slate-200 bg-slate-50/50 rounded-t-xl"><h3 className="font-bold text-sm text-slate-700">{status}</h3></div>
                <div className="p-3 flex-1 overflow-y-auto space-y-3 min-h-[150px]">
                  {columnTickets.map(ticket => (
                    <div key={ticket.id} draggable onDragStart={e => e.dataTransfer.setData("ticketId", ticket.id)} onClick={() => onSelect(ticket)} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:border-blue-400 overflow-hidden flex flex-col min-w-0">
                       <div className="flex justify-between items-start mb-2 gap-2">
                         <span className="text-xs font-bold text-blue-600 truncate min-w-0 flex-1">{ticket.id}</span>
                       </div>
                       
                       <p className="text-sm text-slate-700 font-medium mb-3 line-clamp-2 break-words">{ticket.description}</p>
                       
                       <div className="flex flex-col gap-1.5 mb-3 bg-slate-50 rounded p-2 border border-slate-100 overflow-hidden min-w-0">
                         <div className="flex items-center gap-1.5 text-xs text-slate-600 min-w-0" title={`Key User: ${ticket.keyUser}`}>
                           <User size={13} className="text-blue-500 shrink-0" />
                           <span className="truncate min-w-0 flex-1">{ticket.keyUser || 'Não Atribuído'}</span>
                         </div>
                         <div className="flex items-center gap-1.5 text-xs text-slate-600 min-w-0" title={`Analista: ${ticket.analyst}`}>
                           <UserCircle size={13} className="text-purple-500 shrink-0" />
                           <span className="truncate min-w-0 flex-1">{ticket.analyst || 'Não Atribuído'}</span>
                         </div>
                       </div>

                       <div className="flex items-center gap-2 w-full mt-auto">
                         <div className="w-full bg-slate-100 rounded-full h-1.5 flex-1 min-w-0">
                           <div className="h-1.5 rounded-full" style={{ width: `${ticket.progress}%`, backgroundColor: STATUS_COLORS[status] }}></div>
                         </div>
                         <span className="text-[10px] font-black shrink-0">{ticket.progress}%</span>
                       </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  );
}

function TicketModal({ ticket, projects = [], demandTypes = [], systems = [], onClose, onSave, isNew, appUsers, systemUser, sponsors = [] }) {
  const [formData, setFormData] = useState({ 
    ...ticket, 
    recursos: ticket.recursos || (ticket.recurso ? [ticket.recurso] : []),
    schedule: ticket.schedule || {},
    customSteps: ticket.customSteps && ticket.customSteps.length > 0 ? ticket.customSteps : [...SCHEDULE_STEPS]
  });
  const [newLog, setNewLog] = useState('');
  const [activeTab, setActiveTab] = useState('geral');
  const [isEnhancingScope, setIsEnhancingScope] = useState(false);
  
  const [editingLogId, setEditingLogId] = useState<any>(null);
  const [editingLogText, setEditingLogText] = useState('');

  const timelineRef = useRef(null);
  const [dragState, setDragState] = useState<any>(null);

  // --- State para Manutenção de Fases ---
  const [newPhaseName, setNewPhaseName] = useState('');
  const [editingPhase, setEditingPhase] = useState({ oldName: '', newName: '' });

  // Derivar Analistas e Key Users dinamicamente dos Utilizadores do Sistema (RBAC)
  const availableAnalysts = appUsers.filter(u => u.roles?.includes('Analista')).map(u => u.name).sort();
  const availableKeyUsers = appUsers.filter(u => u.roles?.includes('Key User')).map(u => u.name).sort();
  const allUserNames = [...new Set(appUsers.map(u => u.name))].sort();
  const availableResourcesNames = [...new Set(appUsers.filter(u => u.roles?.includes('Admin') || u.roles?.includes('Analista')).map(u => u.name))].sort();
  
  const handleAddPhase = () => {
    const trimmed = newPhaseName.trim();
    if (trimmed && !formData.customSteps.includes(trimmed)) {
      setFormData(prev => ({ ...prev, customSteps: [...prev.customSteps, trimmed] }));
      setNewPhaseName('');
    }
  };

  const handleDeletePhase = (phaseName) => {
    if (window.confirm(`Tem a certeza que deseja excluir a fase "${phaseName}"? Todos os apontamentos de datas desta fase serão perdidos.`)) {
      setFormData(prev => {
        const updatedSteps = prev.customSteps.filter(p => p !== phaseName);
        const updatedSchedule = { ...prev.schedule };
        delete updatedSchedule[phaseName];
        return { ...prev, customSteps: updatedSteps, schedule: updatedSchedule };
      });
    }
  };

  const startEditPhase = (phaseName) => {
    setEditingPhase({ oldName: phaseName, newName: phaseName });
  };

  const saveEditPhase = () => {
    const trimmed = editingPhase.newName.trim();
    if (trimmed && trimmed !== editingPhase.oldName && !formData.customSteps.includes(trimmed)) {
      setFormData(prev => {
        const updatedSteps = prev.customSteps.map(p => p === editingPhase.oldName ? trimmed : p);
        const updatedSchedule = { ...prev.schedule };
        if (updatedSchedule[editingPhase.oldName]) {
          updatedSchedule[trimmed] = updatedSchedule[editingPhase.oldName];
          delete updatedSchedule[editingPhase.oldName];
        }
        return { ...prev, customSteps: updatedSteps, schedule: updatedSchedule };
      });
      setEditingPhase({ oldName: '', newName: '' });
    } else if (trimmed === editingPhase.oldName) {
      setEditingPhase({ oldName: '', newName: '' });
    }
  };

  const handleScheduleChange = (step, field, value) => {
    setFormData(prev => {
      const updatedSchedule = {
        ...prev.schedule,
        [step]: {
          ...(prev.schedule[step] || {}),
          [field]: value
        }
      };

      let newOverallProgress = prev.progress;

      if (field === 'progress') {
         const stepsToUse = prev.customSteps && prev.customSteps.length > 0 ? prev.customSteps : SCHEDULE_STEPS;
         let totalProgress = 0;
         stepsToUse.forEach(s => {
           const p = s === step ? (Number(value) || 0) : (Number((prev.schedule[s] || {}).progress) || 0);
           totalProgress += p;
         });
         newOverallProgress = stepsToUse.length > 0 ? Math.round(totalProgress / stepsToUse.length) : prev.progress;
      }

      return {
        ...prev,
        schedule: updatedSchedule,
        ...(field === 'progress' ? { progress: newOverallProgress } : {})
      };
    });
  };

  const handleEnhanceScope = async () => {
    if (!formData.scope) return;
    setIsEnhancingScope(true);
    const prompt = `Atue como um Analista de Requisitos Sênior. Expanda e melhore o seguinte escopo de um chamado/demanda de TI, detalhando limites, requisitos e entregáveis de forma profissional, clara e estruturada. Se faltarem informações de contexto, inclua placeholders apropriados. Retorne apenas o texto melhorado. Escopo original: "${formData.scope}"`;
    try {
      const result = await callClaudeWithRetry(prompt);
      setFormData(prev => ({ ...prev, scope: result }));
    } catch (e) {
      console.error("Erro ao melhorar escopo:", e);
    } finally {
      setIsEnhancingScope(false);
    }
  };

  const handleAddLog = () => {
    if (!newLog.trim()) return;
    const newEntry = {
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      text: newLog.trim(),
      author: systemUser.name
    };
    setFormData(prev => ({
      ...prev,
      logs: [newEntry, ...(prev.logs || [])]
    }));
    setNewLog(''); // Limpa a caixa de texto após inserir
  };

  const startEditLog = (log) => {
    setEditingLogId(log.id);
    setEditingLogText(log.text);
  };

  const saveEditLog = (logId) => {
    if (!editingLogText.trim()) return;
    setFormData(prev => ({
      ...prev,
      logs: prev.logs.map(l => l.id === logId ? { ...l, text: editingLogText.trim() } : l)
    }));
    setEditingLogId(null);
    setEditingLogText('');
  };

  const cancelEditLog = () => {
    setEditingLogId(null);
    setEditingLogText('');
  };

  const handleDeleteLog = (logId) => {
    if (window.confirm("Tem certeza que deseja excluir este registro do histórico?")) {
      setFormData(prev => ({
        ...prev,
        logs: prev.logs.filter(l => l.id !== logId)
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const updatedTicket = { ...formData };
    if (newLog.trim()) {
      updatedTicket.logs = [{ id: Date.now(), date: new Date().toISOString().split('T')[0], text: newLog, author: systemUser.name }, ...(updatedTicket.logs || [])];
    }
    onSave(updatedTicket);
  };

  const stepsToUse = formData.customSteps && formData.customSteps.length > 0 ? formData.customSteps : SCHEDULE_STEPS;
  
  const ganttPhases = useMemo(() => generateGanttPhases(formData), [formData]);
  let minDateMs = Infinity, maxDateMs = 0;
  ganttPhases.forEach(p => {
     if (p.plannedStartMs) minDateMs = Math.min(minDateMs, p.plannedStartMs);
     if (p.actualStartMs) minDateMs = Math.min(minDateMs, p.actualStartMs);
     if (p.plannedEndMs) maxDateMs = Math.max(maxDateMs, p.plannedEndMs);
     if (p.actualEndMs) maxDateMs = Math.max(maxDateMs, p.actualEndMs);
  });
  if (minDateMs === Infinity) minDateMs = new Date().getTime();
  if (maxDateMs === 0) maxDateMs = new Date().getTime() + 86400000;
  const totalMs = Math.max(maxDateMs - minDateMs, 86400000);

  const startDrag = (e, phaseName, handleType) => {
    e.preventDefault();
    if (!timelineRef.current) return;
    const pxPerMs = timelineRef.current.offsetWidth / totalMs;
    const phaseData = formData.schedule[phaseName] || {};
    let initialDateStr = handleType === 'start' ? phaseData.actualStart : phaseData.actualEnd;
    let initialDateMs = initialDateStr ? new Date(initialDateStr + 'T00:00:00').getTime() : new Date().getTime();
    setDragState({ phaseName, handleType, initialX: e.clientX, initialDateMs, pxPerMs });
  };

  useEffect(() => {
    if (!dragState) return;
    const handleMouseMove = (e) => {
      const deltaMs = (e.clientX - dragState.initialX) / dragState.pxPerMs;
      const newDateStr = new Date(dragState.initialDateMs + deltaMs - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];

      setFormData(prev => {
        const updated = { ...prev };
        if (!updated.schedule) updated.schedule = {};
        if (!updated.schedule[dragState.phaseName]) updated.schedule[dragState.phaseName] = {};

        if (dragState.handleType === 'start') {
          updated.schedule[dragState.phaseName].actualStart = newDateStr;
          if (updated.schedule[dragState.phaseName].actualEnd && new Date(updated.schedule[dragState.phaseName].actualEnd) < new Date(newDateStr)) {
            updated.schedule[dragState.phaseName].actualEnd = newDateStr;
          }
        } else {
          updated.schedule[dragState.phaseName].actualEnd = newDateStr;
          if (updated.schedule[dragState.phaseName].actualStart && new Date(updated.schedule[dragState.phaseName].actualStart) > new Date(newDateStr)) {
            updated.schedule[dragState.phaseName].actualStart = newDateStr;
          }
        }
        return updated;
      });
    };
    const handleMouseUp = () => setDragState(null);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'ew-resize';
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); document.body.style.cursor = 'default'; };
  }, [dragState]);

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
          <h2 className="text-xl font-bold text-slate-800">{isNew ? 'Criar Nova Demanda' : `Atualizar Demanda ${formData.id}`}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"><X size={20} /></button>
        </div>

        <div className="flex border-b border-slate-200 bg-slate-50 px-6 shrink-0 overflow-x-auto hide-scrollbar">
          <button onClick={() => setActiveTab('geral')} className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors shrink-0 ${activeTab === 'geral' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Geral & Diário</button>
          <button onClick={() => setActiveTab('equipe')} className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors shrink-0 ${activeTab === 'equipe' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Equipe & Envolvidos</button>
          <button onClick={() => setActiveTab('cronograma')} className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors shrink-0 ${activeTab === 'cronograma' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Cronograma de Fases</button>
          <button onClick={() => setActiveTab('custos')} className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors shrink-0 ${activeTab === 'custos' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Custos e Esforço</button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-white">
          
          {activeTab === 'geral' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full animate-in fade-in duration-200">
              <div className="space-y-4">
                 <div>
                   <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">ID do Chamado</label>
                   <input type="text" value={formData.id} onChange={e=>setFormData({...formData, id: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white" placeholder="Ex: TKTI-12345" />
                 </div>
                 
                 <div>
                   <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Descrição</label>
                   <textarea rows="3" value={formData.description} onChange={e=>setFormData({...formData, description: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white" placeholder="Escreva um breve resumo da solicitação..." />
                 </div>

                 <div className="relative">
                   <div className="flex justify-between items-center mb-1">
                     <label className="text-xs font-bold text-slate-500 uppercase">Escopo</label>
                     <button onClick={handleEnhanceScope} disabled={isEnhancingScope || !formData.scope} type="button" className="text-[10px] bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-2 py-0.5 rounded font-bold transition-colors flex items-center gap-1 disabled:opacity-50">
                       {isEnhancingScope ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                       ✨ Melhorar Escopo
                     </button>
                   </div>
                   <textarea rows="3" value={formData.scope || ''} onChange={e=>setFormData({...formData, scope: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white" placeholder="Escreva um esboço dos limites e entregas e clique em '✨ Melhorar Escopo'..." />
                 </div>

                 <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                   <div className="col-span-2 md:col-span-3">
                     <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Capas Associadas (Projetos Macro)</label>
                     <div className="w-full border border-slate-300 rounded-lg p-2 max-h-32 overflow-y-auto bg-slate-50 focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white transition-colors">
                        {projects.length === 0 ? (
                           <span className="text-xs text-slate-500 italic px-2">Nenhuma capa cadastrada.</span>
                        ) : (
                           <div className="flex flex-col gap-1">
                              {projects.map(p => {
                                 const isChecked = (formData.projectIds || []).includes(p.id) || formData.projectId === p.id;
                                 return (
                                    <label key={p.id} className="flex items-center gap-2 text-sm p-1.5 hover:bg-slate-100 rounded cursor-pointer transition-colors">
                                       <input 
                                          type="checkbox" 
                                          className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                          checked={isChecked} 
                                          onChange={(e) => {
                                             let newIds = [...(formData.projectIds || [])];
                                             if (formData.projectId && !newIds.includes(formData.projectId)) newIds.push(formData.projectId);
                                             if (e.target.checked) {
                                                if (!newIds.includes(p.id)) newIds.push(p.id);
                                             } else {
                                                newIds = newIds.filter(id => id !== p.id);
                                             }
                                             setFormData({...formData, projectIds: newIds, projectId: ''});
                                          }} 
                                       />
                                       <span className="truncate">{p.name}</span>
                                    </label>
                                 );
                              })}
                           </div>
                        )}
                     </div>
                   </div>
                   <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Tipo</label>
                      <select value={formData.type || ''} onChange={e=>setFormData({...formData, type: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white">
                         <option value="">-- Selecione --</option>
                         {demandTypes.map(t=><option key={t.id} value={t.name}>{t.name}</option>)}
                      </select>
                   </div>
                   <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Status</label><select value={formData.status} onChange={e=>setFormData({...formData, status: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white">{STATUS_OPTIONS.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
                   <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Sistema</label><select value={formData.sistema || ''} onChange={e=>setFormData({...formData, sistema: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white"><option value="">-- Selecionar --</option>{systems.map(s=><option key={s.id} value={s.name}>{s.name}</option>)}</select></div>
                   <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Progresso (%)</label><input type="number" min="0" max="100" value={formData.progress} onChange={e=>setFormData({...formData, progress: Number(e.target.value)})} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white" /></div>
                 </div>
              </div>
              <div className="flex flex-col gap-4 h-full min-h-[350px]">
                <div className="flex flex-col border border-slate-200 rounded-xl overflow-hidden shadow-sm shrink-0">
                  <div className="p-3 bg-slate-50 border-b border-slate-200"><h3 className="font-semibold text-sm text-slate-700">Novo Registro no Diário ({systemUser.name})</h3></div>
                  <textarea className="w-full p-3 outline-none text-sm resize-none bg-white min-h-[100px]" placeholder="O que foi feito hoje?" value={newLog} onChange={e=>setNewLog(e.target.value)}></textarea>
                  <div className="p-2 bg-slate-50 border-t border-slate-100 flex justify-end">
                    <button type="button" onClick={handleAddLog} disabled={!newLog.trim()} className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 hover:bg-blue-700 transition-colors disabled:opacity-50">
                      <Plus size={14} /> Adicionar ao Histórico
                    </button>
                  </div>
                </div>
                <div className="flex flex-col border border-slate-200 rounded-xl overflow-hidden shadow-sm flex-1">
                  <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="font-semibold text-sm text-slate-700">Histórico de Registros</h3>
                    <span className="bg-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded-full font-bold">{formData.logs?.length || 0}</span>
                  </div>
                  <div className="p-3 bg-slate-50/50 flex-1 overflow-y-auto space-y-3 max-h-[300px]">
                    {formData.logs && formData.logs.length > 0 ? formData.logs.map((log, i) => (
                      <div key={log.id || i} className="bg-white border border-slate-100 rounded-lg p-3 shadow-sm group">
                        <div className="flex justify-between items-start mb-1.5">
                          <div className="flex items-center gap-2">
                             <span className="text-xs font-bold text-slate-700">{log.date}</span>
                             <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-medium">{log.author}</span>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button type="button" onClick={() => startEditLog(log)} className="text-slate-400 hover:text-blue-600 p-1 rounded transition-colors" title="Editar"><Edit size={14}/></button>
                             <button type="button" onClick={() => handleDeleteLog(log.id)} className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors" title="Excluir"><Trash2 size={14}/></button>
                          </div>
                        </div>
                        {editingLogId === log.id ? (
                          <div className="flex flex-col gap-2 mt-2">
                            <textarea 
                              className="w-full p-2 border border-blue-300 bg-blue-50/30 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]" 
                              value={editingLogText} 
                              onChange={e => setEditingLogText(e.target.value)}
                              autoFocus
                            />
                            <div className="flex justify-end gap-2">
                              <button type="button" onClick={cancelEditLog} className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded hover:bg-slate-200 transition-colors">Cancelar</button>
                              <button type="button" onClick={() => saveEditLog(log.id)} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700 transition-colors flex items-center gap-1"><Save size={12}/> Salvar</button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-600 whitespace-pre-wrap">{log.text}</p>
                        )}
                      </div>
                    )) : <p className="text-xs text-slate-400 text-center py-4">Nenhum registro no diário.</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'equipe' && (
             <div className="space-y-6 animate-in fade-in duration-200">
               <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
                     <User size={18} className="text-slate-500" />
                     <h3 className="font-bold text-sm text-slate-700">Responsáveis e Aprovadores</h3>
                  </div>
                  <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-6">
                     <div>
                       <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Key User</label>
                       <select disabled={!systemUser.roles?.includes('Admin') && !systemUser.roles?.includes('Analista')} value={formData.keyUser || ''} onChange={e=>setFormData({...formData, keyUser: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white disabled:opacity-60">
                          <option value="">-- Selecionar --</option>
                          {availableKeyUsers.map(ku => <option key={ku} value={ku}>{ku}</option>)}
                       </select>
                     </div>
                     <div>
                       <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Analista (Responsável)</label>
                       <select disabled={!systemUser.roles?.includes('Admin') && !systemUser.roles?.includes('Key User')} value={formData.analyst || ''} onChange={e=>setFormData({...formData, analyst: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white disabled:opacity-60">
                          <option value="">-- Selecionar --</option>
                          {availableAnalysts.map(an => <option key={an} value={an}>{an}</option>)}
                       </select>
                     </div>
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Patrocinador</label>
                        <select value={formData.sponsor || ''} onChange={e=>setFormData({...formData, sponsor: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white">
                           <option value="">-- Selecionar --</option>
                           {sponsors.map(sp => <option key={sp.id} value={sp.name}>{sp.name}</option>)}
                        </select>
                     </div>
                  </div>
               </div>

               <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
                     <UserCircle size={18} className="text-slate-500" />
                     <h3 className="font-bold text-sm text-slate-700">Recursos Alocados (Equipe de Execução)</h3>
                  </div>
                  <div className="p-5">
                     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {availableResourcesNames.map(nome => (
                           <label key={nome} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded-lg border border-slate-200 transition-colors">
                              <input
                                 type="checkbox"
                                 checked={(formData.recursos || []).includes(nome)}
                                 onChange={(e) => {
                                   let current = [...(formData.recursos || [])];
                                   if (e.target.checked) current.push(nome);
                                   else current = current.filter(n => n !== nome);
                                   setFormData({...formData, recursos: current});
                                 }}
                                 className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                              />
                              <span className="text-sm text-slate-700 font-medium truncate">{nome}</span>
                           </label>
                        ))}
                     </div>
                  </div>
               </div>
             </div>
          )}

          {activeTab === 'cronograma' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 bg-blue-50 border border-blue-200 p-4 rounded-xl text-sm">
                 <div className="text-blue-700">
                   <strong>Gantt Inteligente:</strong> Arraste as bordas laterais das barras reais (azuis/verdes) no gráfico abaixo para ajustar as datas ou preencha diretamente na tabela.
                 </div>
                 <button
                   onClick={(e) => { e.preventDefault(); setFormData(prev => ({...prev, schedule: {}})); }}
                   className="bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors shrink-0 shadow-sm"
                   title="Apagar todas as datas do cronograma"
                 >
                   <Trash2 size={16} /> Limpar Cronograma
                 </button>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col w-full" style={{ userSelect: dragState ? 'none' : 'auto' }}>
                <div className="p-3 border-b border-slate-200 bg-slate-50"><h3 className="font-semibold text-sm text-slate-700">Ajuste Visual Rápido</h3></div>
                <div className="p-4 overflow-x-auto relative">
                  <div className="min-w-[800px]">
                    <div className="flex border-b border-slate-200 pb-2 mb-4 text-xs font-bold text-slate-400 uppercase"><div className="w-[25%]"></div><div className="w-[75%] flex justify-between px-2"><div className="text-left">{formatMonthYear(minDateMs)}</div><div className="text-right">{formatMonthYear(maxDateMs)}</div></div></div>
                    <div className="relative">
                      {ganttPhases.map((phase, i) => {
                        let pLeftPos = 0, pWidthPos = 0, aLeftPos = 0, aWidthPos = 0;
                        if (phase.plannedStartMs && phase.plannedEndMs) { pLeftPos = ((phase.plannedStartMs - minDateMs) / totalMs) * 100; pWidthPos = ((phase.plannedEndMs - phase.plannedStartMs) / totalMs) * 100; }
                        if (phase.actualStartMs && phase.actualEndMs) { aLeftPos = ((phase.actualStartMs - minDateMs) / totalMs) * 100; aWidthPos = ((phase.actualEndMs - phase.actualStartMs) / totalMs) * 100; } 
                        else if (phase.actualStartMs) { aLeftPos = ((phase.actualStartMs - minDateMs) / totalMs) * 100; aWidthPos = ((Math.min(new Date().getTime(), maxDateMs) - phase.actualStartMs) / totalMs) * 100; }
                        return (
                          <div key={i} className="flex items-center border-b border-slate-50 py-3 relative group">
                            <div className="w-[25%] pr-4 z-10 bg-white"><span className="text-xs font-bold text-slate-700 truncate block">{phase.name}</span></div>
                            <div className="w-[75%] relative flex flex-col justify-center gap-2 h-full pt-1 px-2" ref={i === 0 ? timelineRef : null}>
                              
                              {(phase.plannedStartMs && phase.plannedEndMs) ? (
                                <div className="flex items-center" style={{ marginLeft: `calc(${pLeftPos}% - 0.5rem)` }}>
                                  <div className="h-4 rounded-md bg-slate-200 opacity-90 shrink-0" style={{ width: `${pWidthPos}%`, minWidth: '40px' }}></div>
                                  <span className="ml-1.5 text-[9px] font-bold text-slate-400 whitespace-nowrap">
                                     {formatDateShort(phase.plannedStartMs)} a {formatDateShort(phase.plannedEndMs)}
                                  </span>
                                </div>
                              ) : <div className="h-4"></div>}
                              
                              {phase.actualStartMs ? (
                                <div className="flex items-center" style={{ marginLeft: `calc(${aLeftPos}% - 0.5rem)` }}>
                                  <div className={`h-6 rounded-md bg-slate-100 shadow-sm border border-slate-300 relative ${dragState?.phaseName === phase.name ? 'ring-2 ring-blue-400' : ''}`} style={{ width: `${aWidthPos}%`, minWidth: '70px' }}>
                                    <div className={`absolute top-0 left-0 h-full ${phase.progress === 100 ? 'bg-emerald-500' : (phase.progress > 0 ? 'bg-blue-500' : 'bg-slate-300')}`} style={{ width: `${phase.progress}%`, minWidth: '2px' }}></div>
                                    <div className="absolute top-0 left-0 bottom-0 w-3 cursor-ew-resize bg-black/0 hover:bg-black/10 transition-colors rounded-l-md z-10" onMouseDown={(e) => startDrag(e, phase.name, 'start')}></div>
                                    {phase.actualEndMs && <div className="absolute top-0 right-0 bottom-0 w-3 cursor-ew-resize bg-black/0 hover:bg-black/10 transition-colors rounded-r-md z-10" onMouseDown={(e) => startDrag(e, phase.name, 'end')}></div>}
                                  </div>
                                  <div className="ml-2 flex items-center gap-1.5 pointer-events-none whitespace-nowrap">
                                     <span className="text-[11px] font-black text-slate-700">{phase.progress}%</span>
                                     <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                                        <span className="w-1 h-1 rounded-full bg-slate-400"></span>
                                        {formatDateShort(phase.actualStartMs)} {phase.actualEndMs ? `a ${formatDateShort(phase.actualEndMs)}` : ''}
                                     </span>
                                  </div>
                                </div>
                              ) : <div className="h-6"></div>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                 <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                    <h3 className="font-semibold text-sm text-slate-700">Tabela de Fases</h3>
                 </div>
                 <div className="overflow-x-auto">
                   <table className="w-full text-left text-sm min-w-[800px]">
                     <thead>
                       <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                         <th className="p-3 font-bold w-1/4">Fase</th>
                         <th className="p-3 font-bold">Início Planejado</th>
                         <th className="p-3 font-bold">Fim Planejado</th>
                         <th className="p-3 font-bold">Início Real</th>
                         <th className="p-3 font-bold">Fim Real</th>
                         <th className="p-3 font-bold w-24">Progresso (%)</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                       {stepsToUse.map(step => {
                         const sData = formData.schedule[step] || {};
                         const isEditing = editingPhase.oldName === step;
                         return (
                           <tr key={step} className="hover:bg-slate-50/50 group">
                             <td className="p-3">
                                {isEditing ? (
                                  <div className="flex items-center gap-1">
                                    <input type="text" value={editingPhase.newName} onChange={e=>setEditingPhase({...editingPhase, newName: e.target.value})} className="w-full border border-slate-300 rounded p-1 text-xs outline-none focus:ring-1 focus:ring-blue-500" autoFocus />
                                    <button onClick={saveEditPhase} className="text-emerald-600 hover:bg-emerald-50 p-1 rounded transition-colors"><Save size={14}/></button>
                                    <button onClick={()=>setEditingPhase({oldName:'', newName:''})} className="text-red-600 hover:bg-red-50 p-1 rounded transition-colors"><X size={14}/></button>
                                  </div>
                                ) : (
                                  <div className="flex justify-between items-center">
                                    <span className="font-semibold text-slate-700 text-xs truncate pr-2" title={step}>{step}</span>
                                    <div className="hidden group-hover:flex items-center gap-1 shrink-0">
                                      <button onClick={()=>startEditPhase(step)} className="text-blue-500 hover:bg-blue-50 p-1 rounded transition-colors" title="Editar Nome"><Edit size={14}/></button>
                                      <button onClick={()=>handleDeletePhase(step)} className="text-red-500 hover:bg-red-50 p-1 rounded transition-colors" title="Excluir Fase"><Trash2 size={14}/></button>
                                    </div>
                                  </div>
                                )}
                             </td>
                             <td className="p-2"><input type="date" value={sData.plannedStart || ''} onChange={e=>handleScheduleChange(step, 'plannedStart', e.target.value)} className="w-full border border-slate-300 rounded p-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500" /></td>
                             <td className="p-2"><input type="date" value={sData.plannedEnd || ''} onChange={e=>handleScheduleChange(step, 'plannedEnd', e.target.value)} className="w-full border border-slate-300 rounded p-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500" /></td>
                             <td className="p-2"><input type="date" value={sData.actualStart || ''} onChange={e=>handleScheduleChange(step, 'actualStart', e.target.value)} className="w-full border border-slate-300 rounded p-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500" /></td>
                             <td className="p-2"><input type="date" value={sData.actualEnd || ''} onChange={e=>handleScheduleChange(step, 'actualEnd', e.target.value)} className="w-full border border-slate-300 rounded p-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500" /></td>
                             <td className="p-2"><input type="number" min="0" max="100" value={sData.progress || ''} onChange={e=>handleScheduleChange(step, 'progress', e.target.value)} className="w-full border border-slate-300 rounded p-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500" /></td>
                           </tr>
                         )
                       })}
                       <tr className="bg-slate-50/30">
                          <td className="p-3 border-t border-slate-200 border-dashed">
                            <div className="flex items-center gap-2">
                               <input type="text" value={newPhaseName} onChange={e=>setNewPhaseName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddPhase()} placeholder="Nova fase..." className="w-full border border-slate-300 rounded p-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500" />
                               <button onClick={handleAddPhase} disabled={!newPhaseName.trim()} className="bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-50 p-1.5 rounded transition-colors shrink-0" title="Adicionar Fase"><Plus size={14}/></button>
                            </div>
                          </td>
                          <td colSpan="5" className="p-3 border-t border-slate-200 border-dashed">
                             <div className="text-xs text-slate-400 italic">Adicione uma nova fase para o cronograma acima. As novas fases aparecerão automaticamente no gráfico de Gantt.</div>
                          </td>
                       </tr>
                     </tbody>
                   </table>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'custos' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
                    <Clock size={16} className="text-slate-500" />
                    <h3 className="font-bold text-sm text-slate-700">Controle de Esforço (Horas)</h3>
                  </div>
                  <div className="p-5 space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Horas Estimadas</label>
                      <input type="number" min="0" value={formData.estimatedHours || ''} onChange={e=>setFormData({...formData, estimatedHours: Number(e.target.value)})} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: 120" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Horas Realizadas</label>
                      <input type="number" min="0" value={formData.actualHours || ''} onChange={e=>setFormData({...formData, actualHours: Number(e.target.value)})} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: 15" />
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
                    <DollarSign size={16} className="text-slate-500" />
                    <h3 className="font-bold text-sm text-slate-700">Controle Financeiro</h3>
                  </div>
                  <div className="p-5 space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Orçamento Previsto</label>
                      <input type="text" value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(formData.budget || 0)} onChange={e => { const raw = e.target.value.replace(/\D/g, ''); setFormData({...formData, budget: Number(raw) / 100}); }} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700" placeholder="Ex: R$ 50.000,00" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Custo Realizado</label>
                      <input type="text" value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(formData.actualCost || 0)} onChange={e => { const raw = e.target.value.replace(/\D/g, ''); setFormData({...formData, actualCost: Number(raw) / 100}); }} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700" placeholder="Ex: R$ 15.000,00" />
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm md:col-span-2">
                   <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
                    <User size={16} className="text-slate-500" />
                    <h3 className="font-bold text-sm text-slate-700">Responsabilidade e Centro de Custo</h3>
                  </div>
                  <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Responsável pelo Custo</label>
                      <select value={formData.responsavelCusto || 'TI'} onChange={e=>setFormData({...formData, responsavelCusto: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                         <option value="TI">TI</option>
                         <option value="Solicitante">Área Solicitante</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Área Solicitante</label>
                      <select value={formData.areaSolicitante || ''} onChange={e=>setFormData({...formData, areaSolicitante: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                         <option value="">-- Selecionar --</option>
                         {AREAS_SOLICITANTES.map(area => <option key={area} value={area}>{area}</option>)}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Observações Financeiras / Notas de Fornecedores</label>
                      <textarea rows="3" value={formData.financialNotes || ''} onChange={e=>setFormData({...formData, financialNotes: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Anote aqui acordos comerciais, números de propostas, etc." />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-lg font-bold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 transition-colors shadow-sm">Cancelar</button>
          <button type="button" onClick={handleSubmit} className="px-5 py-2.5 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-2 transition-colors shadow-sm"><Save size={18} /> Salvar Demanda</button>
        </div>
      </div>
    </div>
  );
}

function DataExportView({ tickets, projects, demandTypes, systems, appUsers, sponsors, onImportJSON }) {
  const handleExport = () => {
    const data = { tickets, projects, demandTypes, systems, appUsers, sponsors };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_gestao_projetos_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 max-w-2xl mx-auto space-y-6">
      <h2 className="text-xl font-bold text-slate-800">Backup e Extração de Dados</h2>
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-bold text-blue-800 mb-2">Exportar Dados (JSON)</h3>
        <p className="text-sm text-blue-700 mb-4">Baixe um arquivo contendo todas as demandas, projetos, usuários, patrocinadores e configurações.</p>
        <button onClick={handleExport} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700"><Database size={18} /> Baixar Backup</button>
      </div>
      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
        <h3 className="font-bold text-emerald-800 mb-2">Importar Dados (JSON)</h3>
        <p className="text-sm text-emerald-700 mb-4">Restaure um backup anterior. Isso irá mesclar com os dados existentes.</p>
        <input type="file" accept=".json" onChange={onImportJSON} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer" />
      </div>
    </div>
  );
}

function ProjectsView({ projects, tickets, onSaveProject, onDeleteProject, onSelectTicket, systemUser }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [expandedProjects, setExpandedProjects] = useState<any[]>([]);
  const [ticketSearchTerm, setTicketSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('Ativo');

  const toggleExpand = (id) => {
    setExpandedProjects(prev => prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]);
  };

  const handleOpenNew = () => {
    if (!systemUser?.roles?.includes('Admin') && !systemUser?.roles?.includes('Key User')) return;
    setEditingProject({ id: '', name: '', description: '', status: 'Ativo', sponsor: '' });
    setTicketSearchTerm('');
    setIsModalOpen(true);
  };

  const handleEdit = (proj) => {
    const linkedTickets = tickets.filter(t => (t.projectIds || []).includes(proj.id) || t.projectId === proj.id);
    setEditingProject({...proj, linkedTicketIds: linkedTickets.map(t=>t.id)});
    setTicketSearchTerm('');
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!editingProject.name) return;
    onSaveProject(editingProject, editingProject.linkedTicketIds || []);
    setIsModalOpen(false);
  };

  const filteredTicketsForLinking = tickets.filter(t => 
    t.id.toLowerCase().includes(ticketSearchTerm.toLowerCase()) || 
    t.description.toLowerCase().includes(ticketSearchTerm.toLowerCase())
  );

  const filteredProjects = projects.filter(p => filterStatus === 'Todos' || (p.status || 'Ativo') === filterStatus);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200 gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Capas de Projetos (Macro)</h2>
          <p className="text-sm text-slate-500">Agrupe várias demandas em um único grande projeto estruturante.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 border-r border-slate-200 pr-3">
             <span className="text-sm font-semibold text-slate-500">Status:</span>
             <select 
               value={filterStatus} 
               onChange={(e) => setFilterStatus(e.target.value)}
               className="border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
             >
               <option value="Todos">Todos</option>
               <option value="Ativo">Ativos</option>
               <option value="Concluído">Concluídos</option>
               <option value="Cancelado">Cancelados</option>
             </select>
          </div>
          {(systemUser?.roles?.includes('Admin') || systemUser?.roles?.includes('Key User')) && (
            <button onClick={handleOpenNew} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors shrink-0"><Plus size={18} /> Nova Capa</button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {filteredProjects.length === 0 ? <div className="text-center text-slate-500 py-10 bg-white rounded-xl border border-dashed border-slate-300">Nenhuma capa de projeto encontrada para este filtro.</div> : filteredProjects.map(proj => {
          const linkedTickets = tickets.filter(t => (t.projectIds || []).includes(proj.id) || t.projectId === proj.id);
          const progressSum = linkedTickets.reduce((acc, t) => acc + t.progress, 0);
          const avgProgress = linkedTickets.length > 0 ? Math.round(progressSum / linkedTickets.length) : 0;
          const isExpanded = expandedProjects.includes(proj.id);
          
          return (
            <div key={proj.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col transition-all w-full">
              <div 
                className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center cursor-pointer hover:bg-slate-100/80 transition-colors overflow-hidden"
                onClick={() => toggleExpand(proj.id)}
              >
                <div className="flex-1 pr-4 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 min-w-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                       <h3 className="font-bold text-slate-800 text-lg truncate min-w-0">{proj.name}</h3>
                       <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded shrink-0 ${proj.status === 'Concluído' ? 'bg-emerald-100 text-emerald-700' : proj.status === 'Cancelado' ? 'bg-slate-200 text-slate-600' : 'bg-blue-100 text-blue-700'}`}>
                          {proj.status || 'Ativo'}
                       </span>
                    </div>
                    <p className="text-sm text-slate-500 truncate">{proj.id} • {linkedTickets.length} demanda(s) vinculada(s)</p>
                  </div>
                  <div className="hidden md:flex flex-col items-end w-48 shrink-0 sm:pr-4 sm:border-r border-slate-200">
                     <span className="text-[10px] font-bold text-slate-400 uppercase mb-1">Progresso Global</span>
                     <div className="flex items-center gap-2 w-full">
                        <div className="flex-1 bg-slate-200 rounded-full h-2 min-w-0"><div className="h-2 rounded-full bg-blue-600 transition-all duration-500" style={{ width: `${avgProgress}%` }}></div></div>
                        <span className="text-xs font-black text-slate-700 shrink-0">{avgProgress}%</span>
                     </div>
                  </div>
                </div>
                <div className="flex gap-2 items-center shrink-0">
                  <button onClick={(e) => { e.stopPropagation(); handleEdit(proj); }} className="text-slate-400 hover:text-blue-600 p-2 rounded hover:bg-white"><Edit size={18} /></button>
                  <button onClick={(e) => { e.stopPropagation(); onDeleteProject(proj.id); }} className="text-slate-400 hover:text-red-600 p-2 rounded hover:bg-white"><Trash2 size={18} /></button>
                  <div className="w-px h-6 bg-slate-200 mx-1"></div>
                  {isExpanded ? <ChevronUp size={24} className="text-slate-500 shrink-0" /> : <ChevronDown size={24} className="text-slate-500 shrink-0" />}
                </div>
              </div>
              
              {isExpanded && (
                <div className="p-5 flex-1 animate-in slide-in-from-top-2 fade-in duration-200 bg-slate-50/50">
                  <div className="mb-6">
                     <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Descrição do Projeto Macro</h4>
                     <p className="text-sm text-slate-700 whitespace-pre-wrap bg-white p-4 rounded-lg border border-slate-100">{proj.description || <span className="italic text-slate-400">Sem descrição.</span>}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex justify-between items-center">
                       <span>Demandas Vinculadas ({linkedTickets.length})</span>
                    </h4>
                    <div className="flex flex-col gap-4">
                      {linkedTickets.length === 0 ? <div className="text-sm italic text-slate-400 bg-white p-4 rounded-lg border border-slate-100 text-center">Nenhuma demanda vinculada a esta capa.</div> : linkedTickets.map(t => {
                        
                        const ganttPhases = generateGanttPhases(t);
                        let minMs = Infinity, maxMs = 0;
                        ganttPhases.forEach(p => {
                           if (p.plannedStartMs) minMs = Math.min(minMs, p.plannedStartMs);
                           if (p.actualStartMs) minMs = Math.min(minMs, p.actualStartMs);
                           if (p.plannedEndMs) maxMs = Math.max(maxMs, p.plannedEndMs);
                           if (p.actualEndMs) maxMs = Math.max(maxMs, p.actualEndMs);
                        });
                        if (minMs === Infinity) minMs = new Date().getTime();
                        if (maxMs === 0) maxMs = new Date().getTime() + 86400000;
                        const totalMs = Math.max(maxMs - minMs, 86400000);

                        return (
                          <div key={t.id} onClick={() => onSelectTicket(t)} className="bg-white p-4 rounded-xl border border-slate-200 cursor-pointer hover:border-blue-400 hover:shadow-md transition-all flex flex-col lg:flex-row gap-6 overflow-hidden">
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start mb-2 gap-2">
                                <span className="font-bold text-blue-600 text-lg hover:underline truncate min-w-0 flex-1">{t.id}</span>
                                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border shrink-0 max-w-[120px] truncate" style={{ backgroundColor: `${STATUS_COLORS[t.status] || '#cbd5e1'}15`, color: STATUS_COLORS[t.status] || '#64748b', borderColor: `${STATUS_COLORS[t.status] || '#cbd5e1'}40` }}>{t.status}</span>
                              </div>
                              <p className="text-sm font-medium text-slate-800 line-clamp-2 mb-3 break-words">{t.description}</p>
                              <div className="flex items-center gap-4 text-xs text-slate-500 font-medium overflow-hidden">
                                <span className="flex items-center gap-1.5 truncate min-w-0 flex-1"><UserCircle size={14} className="text-purple-500 shrink-0"/> <span className="truncate">{t.analyst || '-'}</span></span>
                                <span className="flex items-center gap-1.5 truncate min-w-0 flex-1"><User size={14} className="text-blue-500 shrink-0"/> <span className="truncate">{t.keyUser || '-'}</span></span>
                              </div>
                            </div>
                            
                            <div className="lg:w-[400px] xl:w-[500px] shrink-0 bg-slate-50 p-3.5 rounded-lg border border-slate-100 flex flex-col justify-center">
                               <div className="text-[10px] font-bold text-slate-400 uppercase mb-2.5 flex justify-between items-center">
                                  <span className="flex items-center gap-1.5"><Calendar size={12}/> Cronograma Macro</span>
                                  {ganttPhases.filter(p => p.plannedStartMs || p.actualStartMs).length > 0 && <span className="bg-white px-2 py-0.5 rounded border border-slate-200">{formatDateShort(minMs)} até {formatDateShort(maxMs)}</span>}
                               </div>
                               
                               <div className="space-y-1.5">
                                 {ganttPhases.filter(p => p.plannedStartMs || p.actualStartMs).length === 0 ? (
                                    <span className="text-xs text-slate-400 italic block text-center py-2">Cronograma não iniciado.</span>
                                 ) : (
                                    ganttPhases.filter(p => p.plannedStartMs || p.actualStartMs).map((p, i) => {
                                       const pLeft = p.plannedStartMs ? ((p.plannedStartMs - minMs) / totalMs) * 100 : 0;
                                       const pWidth = (p.plannedStartMs && p.plannedEndMs) ? ((p.plannedEndMs - p.plannedStartMs) / totalMs) * 100 : 0;
                                       const aLeft = p.actualStartMs ? ((p.actualStartMs - minMs) / totalMs) * 100 : 0;
                                       const aWidth = p.actualStartMs ? (((p.actualEndMs || Math.min(new Date().getTime(), maxMs)) - p.actualStartMs) / totalMs) * 100 : 0;
                                       return (
                                         <div key={i} className="flex items-center text-[10px] gap-3">
                                           <div className="w-28 truncate text-slate-600 font-semibold" title={p.name}>{p.name}</div>
                                           <div className="flex-1 relative h-3 bg-slate-200/50 rounded-full overflow-hidden">
                                              {p.plannedStartMs && p.plannedEndMs && <div className="absolute top-0 h-1 bg-slate-300 rounded-full" style={{left: `${pLeft}%`, width: `${pWidth}%`}}></div>}
                                              {p.actualStartMs && <div className="absolute bottom-0 top-1 h-2 bg-blue-200 rounded-full" style={{left: `${aLeft}%`, width: `${aWidth}%`}}><div className="h-full bg-blue-500 rounded-full" style={{width: `${p.progress}%`}}></div></div>}
                                           </div>
                                           <div className="w-8 text-right font-black text-slate-600">{p.progress}%</div>
                                         </div>
                                       )
                                    })
                                 )}
                               </div>
                            </div>

                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="font-bold text-lg">{editingProject.id ? 'Editar Capa' : 'Nova Capa de Projeto'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="flex gap-4">
                <div className="flex-1"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome do Projeto Macro</label><input type="text" value={editingProject.name} onChange={e=>setEditingProject({...editingProject, name: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" /></div>
                <div className="w-1/3">
                   <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status</label>
                   <select value={editingProject.status || 'Ativo'} onChange={e=>setEditingProject({...editingProject, status: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                     <option value="Ativo">Ativo</option>
                     <option value="Concluído">Concluído</option>
                     <option value="Cancelado">Cancelado</option>
                   </select>
                </div>
              </div>
              <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrição Detalhada</label><textarea value={editingProject.description} onChange={e=>setEditingProject({...editingProject, description: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" rows="3" /></div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex justify-between items-center">
                  <span>Vincular Demandas ao Projeto</span>
                  <span className="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">{editingProject.linkedTicketIds?.length || 0} selecionadas</span>
                </label>
                <div className="relative mb-2">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Pesquisar por ID ou descrição..." 
                    value={ticketSearchTerm}
                    onChange={(e) => setTicketSearchTerm(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
                <div className="border border-slate-300 rounded-lg p-2 min-h-[120px] max-h-48 overflow-y-auto bg-slate-50 flex flex-col gap-1">
                  {filteredTicketsForLinking.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-4 italic">Nenhuma demanda encontrada.</p>
                  ) : (
                    filteredTicketsForLinking.map(t => (
                      <label key={t.id} className="flex items-center gap-3 text-sm p-2 hover:bg-slate-100 rounded cursor-pointer transition-colors border border-transparent hover:border-slate-200">
                        <input type="checkbox" checked={(editingProject.linkedTicketIds || []).includes(t.id)} onChange={(e) => {
                          const newIds = e.target.checked ? [...(editingProject.linkedTicketIds || []), t.id] : (editingProject.linkedTicketIds || []).filter(id => id !== t.id);
                          setEditingProject({...editingProject, linkedTicketIds: newIds});
                        }} className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer" />
                        <span className="truncate text-slate-700 font-medium"><strong className="text-blue-600 mr-1">{t.id}</strong> {t.description}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 shrink-0">
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 border border-slate-300 bg-white shadow-sm rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>
              <button onClick={handleSave} className="px-5 py-2.5 bg-blue-600 shadow-sm rounded-lg text-sm font-bold text-white hover:bg-blue-700 flex items-center gap-2"><Save size={16}/> Salvar Capa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AccessLogsView({ accessLogs, presence }) {
  const [now, setNow] = useState(Date.now());
  
  // Atualiza o relógio interno a cada 10 segundos para reavaliar quem está online
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(interval);
  }, []);

  // Um usuário é considerado online se declarou estar online E enviou um ping (ou fez login) há menos de 60 segundos.
  const onlineUsers = presence.filter(p => {
     if (!p.isOnline) return false;
     const lastActivity = p.lastPing || p.lastLogin || 0;
     return (now - lastActivity) < 60000;
  });
  
  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in">
      
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
         <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
           <Radio className="text-emerald-500 animate-pulse" /> Usuários Online Agora ({onlineUsers.length})
         </h2>
         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {onlineUsers.length === 0 ? (
              <p className="text-sm text-slate-500 italic md:col-span-4">Nenhum usuário online no momento.</p>
            ) : (
              onlineUsers.map(u => (
                <div key={u.username} className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-lg shadow-sm">
                  <div className="relative">
                    <UserCircle size={32} className="text-emerald-600" />
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <p className="text-sm font-bold text-slate-700 leading-tight truncate">{u.name}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase truncate tracking-wider">{u.role}</p>
                  </div>
                </div>
              ))
            )}
         </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
         <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 flex items-center gap-2"><Clock size={18} className="text-slate-500"/> Histórico de Entradas e Saídas</h3>
            <span className="text-xs font-bold bg-slate-200 text-slate-600 px-3 py-1 rounded-full">{accessLogs.length} Registos</span>
         </div>
         <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
            <table className="w-full text-left text-sm">
               <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-slate-600 shadow-sm z-10">
                  <tr>
                     <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Data / Hora</th>
                     <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Usuário</th>
                     <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Perfil de Acesso</th>
                     <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Ação Detectada</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {accessLogs.slice(0, 100).map(log => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                       <td className="px-6 py-4 text-slate-600 font-mono text-xs">{new Date(log.timestamp).toLocaleString('pt-BR')}</td>
                       <td className="px-6 py-4 font-semibold text-slate-800">{log.name} <span className="text-[10px] font-normal text-slate-400 block sm:inline">({log.username})</span></td>
                       <td className="px-6 py-4"><span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 px-2.5 py-1 rounded border border-slate-200">{log.role}</span></td>
                       <td className="px-6 py-4">
                          {log.action === 'LOGIN' ? (
                            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded w-max"><LogIn size={16}/> Entrada no Sistema (Login)</span>
                          ) : log.action === 'LOGOUT_TAB_CLOSED' ? (
                            <span className="flex items-center gap-1.5 text-xs font-bold text-orange-500 bg-orange-50 px-3 py-1.5 rounded w-max"><LogOut size={16}/> Desconexão (Navegador Fechado)</span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded w-max"><LogOut size={16}/> Saída do Sistema (Logout Manual)</span>
                          )}
                       </td>
                    </tr>
                  ))}
                  {accessLogs.length === 0 && <tr><td colSpan="4" className="text-center py-12 text-slate-500 font-medium">Nenhum registo de acesso encontrado na base de dados.</td></tr>}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
}

function StatisticsDashboardView({ tickets }) {
  const [filterSprint, setFilterSprint] = useState('Todas');
  const [filterType, setFilterType] = useState('Todos');
  const [filterAnalyst, setFilterAnalyst] = useState('Todos');
  const [filterSystem, setFilterSystem] = useState('Todos');
  const [filterSponsor, setFilterSponsor] = useState('Todos');

  const sprints = useMemo(() => ['Todas', ...new Set(tickets.map(t => t.sprint || 'Sem Sprint'))].sort(), [tickets]);
  const types = useMemo(() => ['Todos', ...new Set(tickets.map(t => t.type || 'Não Definido'))].sort(), [tickets]);
  const analysts = useMemo(() => ['Todos', ...new Set(tickets.map(t => t.analyst || 'Não Atribuído'))].sort(), [tickets]);
  const systems = useMemo(() => ['Todos', ...new Set(tickets.map(t => t.sistema || 'Não Definido'))].sort(), [tickets]);
  const sponsorsList = useMemo(() => ['Todos', ...new Set(tickets.map(t => t.sponsor || 'Não Definido'))].sort(), [tickets]);

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
       if (filterSprint !== 'Todas' && (t.sprint || 'Sem Sprint') !== filterSprint) return false;
       if (filterType !== 'Todos' && (t.type || 'Não Definido') !== filterType) return false;
       if (filterAnalyst !== 'Todos' && (t.analyst || 'Não Atribuído') !== filterAnalyst) return false;
       if (filterSystem !== 'Todos' && (t.sistema || 'Não Definido') !== filterSystem) return false;
       if (filterSponsor !== 'Todos' && (t.sponsor || 'Não Definido') !== filterSponsor) return false;
       return true;
    });
  }, [tickets, filterSprint, filterType, filterAnalyst, filterSystem, filterSponsor]);

  // 1. Dados para Evolução Mensal (Demandas Criadas vs Concluídas)
  const monthlyDataMap = {};
  filteredTickets.forEach(t => {
     // Usa o primeiro registro no histórico como data de criação, ou a data de hoje como contingência
     const creationDate = t.statusHistory?.[0]?.date || new Date().toISOString().split('T')[0];
     const creationMonth = creationDate.substring(0, 7); // Extrai o formato YYYY-MM
     
     if (!monthlyDataMap[creationMonth]) monthlyDataMap[creationMonth] = { rawName: creationMonth, Abertas: 0, Concluídas: 0 };
     monthlyDataMap[creationMonth].Abertas += 1;

     // Se o chamado estiver concluído, recolhe o momento em que isso ocorreu
     if (t.status === '10 - Concluído') {
        const completedHist = t.statusHistory?.slice().reverse().find(h => h.status === '10 - Concluído');
        const completedDate = completedHist?.date || t.logs?.[0]?.date || new Date().toISOString().split('T')[0];
        const completedMonth = completedDate.substring(0, 7);
        
        if (!monthlyDataMap[completedMonth]) monthlyDataMap[completedMonth] = { rawName: completedMonth, Abertas: 0, Concluídas: 0 };
        monthlyDataMap[completedMonth].Concluídas += 1;
     }
  });

  const monthlyData = Object.values(monthlyDataMap)
    .sort((a, b) => a.rawName.localeCompare(b.rawName))
    .map(item => {
      const [year, month] = item.rawName.split('-');
      const date = new Date(year, parseInt(month) - 1);
      const formattedName = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '');
      return { ...item, name: formattedName.charAt(0).toUpperCase() + formattedName.slice(1) };
    });

  // 2. Dados de Carga de Trabalho por Recurso (Só contempla demandas ativas)
  const activeTickets = filteredTickets.filter(t => !['10 - Concluído', '00 - Cancelado', '00 - Paralisado', '00 - Bloqueado'].includes(t.status));
  const resourceMap = {};
  activeTickets.forEach(t => {
     // Compila tanto os recursos de execução como o analista responsável em um Set (para não duplicar caso o analista também esteja marcado na equipa)
     const allInvolved = new Set([...(t.recursos || []), t.recurso, t.analyst].filter(Boolean));
     allInvolved.forEach(r => {
        if (!resourceMap[r]) resourceMap[r] = { name: r, Ativas: 0 };
        resourceMap[r].Ativas += 1;
     });
  });
  const resourceData = Object.values(resourceMap).sort((a, b) => b.Ativas - a.Ativas).slice(0, 10); // Mostra o top 10

  // 3. Distribuição por Tipos de Demanda (Geral)
  const typeMap = {};
  filteredTickets.forEach(t => {
     const typeName = t.type || 'Não Definido';
     if (!typeMap[typeName]) typeMap[typeName] = { name: typeName, value: 0 };
     typeMap[typeName].value += 1;
  });
  const typeData = Object.values(typeMap).sort((a, b) => b.value - a.value);
  const PIE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#F43F5E', '#8B5CF6', '#14B8A6', '#64748B'];

  // 4. Dados Financeiros (Orçado vs Realizado)
  const totalBudget = filteredTickets.reduce((acc, t) => acc + (Number(t.budget) || 0), 0);
  const totalActualCost = filteredTickets.reduce((acc, t) => acc + (Number(t.actualCost) || 0), 0);
  const financialData = [
     { name: 'Orçamento Previsto', valor: totalBudget, fill: '#3B82F6' },
     { name: 'Custo Realizado', valor: totalActualCost, fill: '#EF4444' }
  ];

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in">
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-1">
              <TrendingUp className="text-blue-600" /> Visão Estatística e Produtividade
            </h2>
            <p className="text-sm text-slate-500">Métricas consolidadas de evolução de throughput, carga de recursos e saúde financeira do portfólio de demandas.</p>
          </div>
          <div className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-blue-200 shrink-0">
            {filteredTickets.length} demanda(s) no filtro
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-500">Sprint:</span>
            <select className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white" value={filterSprint} onChange={(e) => setFilterSprint(e.target.value)}>
              {sprints.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-500">Tipo:</span>
            <select className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              {types.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-500">Analista:</span>
            <select className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white" value={filterAnalyst} onChange={(e) => setFilterAnalyst(e.target.value)}>
              {analysts.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-500">Sistema:</span>
            <select className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white" value={filterSystem} onChange={(e) => setFilterSystem(e.target.value)}>
              {systems.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-500">Patrocinador:</span>
            <select className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white" value={filterSponsor} onChange={(e) => setFilterSponsor(e.target.value)}>
              {sponsorsList.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <ChartCard title="Evolução Mensal (Criadas vs Concluídas)" className="border-t-4 border-t-indigo-500">
           {monthlyData.length > 0 ? (
             <ResponsiveContainer width="100%" height={320}>
               <LineChart data={monthlyData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} />
                 <XAxis dataKey="name" tick={{fontSize: 12, fill: '#64748b'}} />
                 <YAxis tick={{fontSize: 12, fill: '#64748b'}} allowDecimals={false} />
                 <RechartsTooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                 <Legend wrapperStyle={{fontSize: '12px'}} />
                 <Line type="monotone" name="Demandas Abertas" dataKey="Abertas" stroke="#6366F1" strokeWidth={3} activeDot={{ r: 6 }} />
                 <Line type="monotone" name="Demandas Concluídas" dataKey="Concluídas" stroke="#10B981" strokeWidth={3} />
               </LineChart>
             </ResponsiveContainer>
           ) : <p className="text-center text-slate-400 py-20">Sem histórico suficiente.</p>}
        </ChartCard>

        <ChartCard title="Carga de Trabalho (Top 10 - Demandas Ativas)" className="border-t-4 border-t-purple-500">
           {resourceData.length > 0 ? (
             <ResponsiveContainer width="100%" height={320}>
               <BarChart data={resourceData} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                 <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                 <XAxis type="number" tick={{fontSize: 12, fill: '#64748b'}} allowDecimals={false} />
                 <YAxis dataKey="name" type="category" tick={{fontSize: 11, fill: '#475569'}} width={110} />
                 <RechartsTooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                 <Bar dataKey="Ativas" name="Em Andamento" fill="#8B5CF6" radius={[0, 4, 4, 0]} label={{ position: 'right', fill: '#64748b', fontSize: 12 }} />
               </BarChart>
             </ResponsiveContainer>
           ) : <p className="text-center text-slate-400 py-20">Nenhuma demanda em andamento identificada.</p>}
        </ChartCard>

        <ChartCard title="Distribuição Global por Tipo (Portfólio Todo)" className="border-t-4 border-t-amber-500">
           {typeData.length > 0 ? (
             <ResponsiveContainer width="100%" height={320}>
               <PieChart>
                 <Pie 
                    data={typeData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={5} 
                    dataKey="value" 
                    labelLine={false}
                 >
                   {typeData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                   ))}
                 </Pie>
                 <RechartsTooltip 
                   formatter={(value, name) => [`${value} demanda(s)`, name]}
                   contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                 />
                 <Legend wrapperStyle={{fontSize: '11px'}} />
               </PieChart>
             </ResponsiveContainer>
           ) : <p className="text-center text-slate-400 py-20">Sem tipos de demanda registados.</p>}
        </ChartCard>

        <ChartCard title="Saúde Financeira Global (Budget vs Realizado)" className="border-t-4 border-t-emerald-500">
           {totalBudget > 0 || totalActualCost > 0 ? (
             <ResponsiveContainer width="100%" height={320}>
               <BarChart data={financialData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} />
                 <XAxis dataKey="name" tick={{fontSize: 12, fill: '#64748b'}} />
                 <YAxis tickFormatter={(val) => `R$ ${(val/1000).toFixed(0)}k`} tick={{fontSize: 12, fill: '#64748b'}} />
                 <RechartsTooltip 
                   formatter={(value) => formatCurrency(value)} 
                   cursor={{fill: '#f1f5f9'}} 
                   contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                 />
                 <Bar dataKey="valor" name="Total (R$)" radius={[6, 6, 0, 0]} label={{ position: 'top', fill: '#475569', fontSize: 12, formatter: (val) => formatCurrency(val) }}>
                   {financialData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={entry.fill} />
                   ))}
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
           ) : <p className="text-center text-slate-400 py-20">Nenhum custo ou orçamento inserido nas demandas ainda.</p>}
        </ChartCard>

      </div>
    </div>
  );
}