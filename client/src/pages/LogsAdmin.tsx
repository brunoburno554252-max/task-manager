import { useState } from "react";
import { trpc } from "../lib/trpc";
import {
  ScrollText, Search, Filter, User, Plus, Minus, RefreshCw, ArrowUpDown,
  TrendingUp, TrendingDown, Zap, AlertTriangle, RotateCcw, Settings,
  Award, Star, CheckCircle, XCircle, Clock, Database, ChevronDown, ChevronUp,
  Eye, Download
} from "lucide-react";

const typeLabels: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  task_completion: { label: "Tarefa Concluída", icon: CheckCircle, color: "text-green-400", bg: "bg-green-500/10" },
  task_overdue_penalty: { label: "Penalidade Atraso", icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10" },
  task_revert: { label: "Pontos Revertidos", icon: RotateCcw, color: "text-orange-400", bg: "bg-orange-500/10" },
  manual_add: { label: "Adição Manual", icon: Plus, color: "text-blue-400", bg: "bg-blue-500/10" },
  manual_remove: { label: "Remoção Manual", icon: Minus, color: "text-red-400", bg: "bg-red-500/10" },
  manual_adjust: { label: "Ajuste Manual", icon: Settings, color: "text-purple-400", bg: "bg-purple-500/10" },
  highlight_bonus: { label: "Bônus Destaque", icon: Star, color: "text-yellow-400", bg: "bg-yellow-500/10" },
  achievement_bonus: { label: "Bônus Conquista", icon: Award, color: "text-cyan-400", bg: "bg-cyan-500/10" },
  correction: { label: "Correção", icon: RefreshCw, color: "text-gray-400", bg: "bg-gray-500/10" },
};

export default function LogsAdmin() {
  const [activeTab, setActiveTab] = useState<"transactions" | "summary" | "tools">("transactions");
  const [filterUserId, setFilterUserId] = useState<number | undefined>();
  const [filterType, setFilterType] = useState<string | undefined>();
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [showAdjustDialog, setShowAdjustDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number>(0);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [newBalance, setNewBalance] = useState("");
  const [expandedTx, setExpandedTx] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const { data: allUsers } = trpc.users.list.useQuery();
  const { data: transactions, isLoading } = trpc.pointTransactions.list.useQuery(
    { userId: filterUserId, type: filterType, limit: 500 },
    { refetchInterval: 15000 }
  );
  const { data: summaryData } = trpc.pointTransactions.summary.useQuery(
    { userId: filterUserId! },
    { enabled: !!filterUserId }
  );

  const manualAddMut = trpc.pointTransactions.manualAdd.useMutation({
    onSuccess: () => {
      utils.pointTransactions.list.invalidate();
      utils.pointTransactions.summary.invalidate();
      setShowAddDialog(false);
      setAmount("");
      setReason("");
      setSelectedUserId(0);
    },
  });

  const manualRemoveMut = trpc.pointTransactions.manualRemove.useMutation({
    onSuccess: () => {
      utils.pointTransactions.list.invalidate();
      utils.pointTransactions.summary.invalidate();
      setShowRemoveDialog(false);
      setAmount("");
      setReason("");
      setSelectedUserId(0);
    },
  });

  const manualAdjustMut = trpc.pointTransactions.manualAdjust.useMutation({
    onSuccess: () => {
      utils.pointTransactions.list.invalidate();
      utils.pointTransactions.summary.invalidate();
      setShowAdjustDialog(false);
      setNewBalance("");
      setReason("");
      setSelectedUserId(0);
    },
  });

  const recalculateMut = trpc.pointTransactions.recalculate.useMutation({
    onSuccess: () => {
      utils.pointTransactions.list.invalidate();
      utils.pointTransactions.summary.invalidate();
      utils.users.list.invalidate();
    },
  });

  const recalculateAllMut = trpc.pointTransactions.recalculateAll.useMutation({
    onSuccess: () => {
      utils.pointTransactions.list.invalidate();
      utils.users.list.invalidate();
    },
  });

  const migrateMut = trpc.pointTransactions.migrate.useMutation({
    onSuccess: (data) => {
      utils.pointTransactions.list.invalidate();
      alert(`Migração concluída! ${data.migrated} registros migrados de ${data.total} totais.`);
    },
  });

  const filteredTransactions = (transactions || []).filter((tx: any) => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      tx.userName?.toLowerCase().includes(s) ||
      tx.reason?.toLowerCase().includes(s) ||
      tx.taskTitle?.toLowerCase().includes(s) ||
      tx.performedByName?.toLowerCase().includes(s) ||
      String(tx.id).includes(s) ||
      String(tx.taskId).includes(s)
    );
  });

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
  };

  const totalGained = filteredTransactions.filter((t: any) => t.amount > 0).reduce((s: number, t: any) => s + t.amount, 0);
  const totalLost = filteredTransactions.filter((t: any) => t.amount < 0).reduce((s: number, t: any) => s + Math.abs(t.amount), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ScrollText className="w-7 h-7 text-primary" />
            Logs de Pontos
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitoramento bruto de todas as transações de pontos do sistema.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddDialog(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Adicionar Pontos
          </button>
          <button
            onClick={() => setShowRemoveDialog(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Minus className="w-4 h-4" /> Remover Pontos
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Database className="w-4 h-4" /> Total de Transações
          </div>
          <p className="text-2xl font-bold mt-1">{filteredTransactions.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-green-400 text-sm">
            <TrendingUp className="w-4 h-4" /> Total Ganho
          </div>
          <p className="text-2xl font-bold mt-1 text-green-400">+{totalGained}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <TrendingDown className="w-4 h-4" /> Total Perdido
          </div>
          <p className="text-2xl font-bold mt-1 text-red-400">-{totalLost}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-primary text-sm">
            <Zap className="w-4 h-4" /> Saldo Líquido
          </div>
          <p className="text-2xl font-bold mt-1">{totalGained - totalLost}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-2">
        {[
          { id: "transactions" as const, label: "Transações", icon: ScrollText },
          { id: "summary" as const, label: "Resumo por Colaborador", icon: User },
          { id: "tools" as const, label: "Ferramentas", icon: Settings },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center bg-card border border-border rounded-xl p-4">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nome, motivo, ID..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm"
          />
        </div>
        <select
          value={filterUserId || ""}
          onChange={e => setFilterUserId(e.target.value ? Number(e.target.value) : undefined)}
          className="px-3 py-2 bg-background border border-border rounded-lg text-sm min-w-[200px]"
        >
          <option value="">Todos os colaboradores</option>
          {(allUsers || []).map((u: any) => (
            <option key={u.id} value={u.id}>{u.name || u.email}</option>
          ))}
        </select>
        <select
          value={filterType || ""}
          onChange={e => setFilterType(e.target.value || undefined)}
          className="px-3 py-2 bg-background border border-border rounded-lg text-sm min-w-[180px]"
        >
          <option value="">Todos os tipos</option>
          {Object.entries(typeLabels).map(([key, val]) => (
            <option key={key} value={key}>{val.label}</option>
          ))}
        </select>
        {(filterUserId || filterType || searchTerm) && (
          <button
            onClick={() => { setFilterUserId(undefined); setFilterType(undefined); setSearchTerm(""); }}
            className="px-3 py-2 text-sm text-red-400 hover:text-red-300 transition-colors"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Tab Content: Transactions */}
      {activeTab === "transactions" && (
        <div className="space-y-2">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Carregando transações...</div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <Database className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Nenhuma transação encontrada.</p>
              <p className="text-sm text-muted-foreground mt-1">
                As transações aparecerão aqui conforme os pontos são atribuídos ou removidos.
              </p>
            </div>
          ) : (
            filteredTransactions.map((tx: any) => {
              const typeInfo = typeLabels[tx.type] || { label: tx.type, icon: Zap, color: "text-gray-400", bg: "bg-gray-500/10" };
              const TypeIcon = typeInfo.icon;
              const isExpanded = expandedTx === tx.id;

              return (
                <div
                  key={tx.id}
                  className="bg-card border border-border rounded-xl overflow-hidden transition-all hover:border-primary/30"
                >
                  <div
                    className="flex items-center gap-4 p-4 cursor-pointer"
                    onClick={() => setExpandedTx(isExpanded ? null : tx.id)}
                  >
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-full ${typeInfo.bg} flex items-center justify-center flex-shrink-0`}>
                      <TypeIcon className={`w-5 h-5 ${typeInfo.color}`} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{tx.userName || "Desconhecido"}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${typeInfo.bg} ${typeInfo.color}`}>
                          {typeInfo.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{tx.reason}</p>
                    </div>

                    {/* Amount */}
                    <div className="text-right flex-shrink-0">
                      <p className={`text-lg font-bold ${tx.amount >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {tx.amount >= 0 ? "+" : ""}{tx.amount}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(tx.createdAt)}</p>
                    </div>

                    {/* Expand */}
                    <div className="flex-shrink-0">
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-border bg-muted/30 p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">ID Transação</span>
                        <p className="font-mono font-bold">#{tx.id}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Saldo Antes</span>
                        <p className="font-bold">{tx.balanceBefore} pts</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Saldo Depois</span>
                        <p className="font-bold">{tx.balanceAfter} pts</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Variação</span>
                        <p className={`font-bold ${tx.amount >= 0 ? "text-green-400" : "text-red-400"}`}>
                          {tx.amount >= 0 ? "+" : ""}{tx.amount} pts
                        </p>
                      </div>
                      {tx.taskId && (
                        <div>
                          <span className="text-muted-foreground">Tarefa</span>
                          <p className="font-bold">#{tx.taskId} {tx.taskTitle && `- ${tx.taskTitle}`}</p>
                        </div>
                      )}
                      <div>
                        <span className="text-muted-foreground">Executado por</span>
                        <p className="font-bold">{tx.performedByName || "Sistema"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">User ID</span>
                        <p className="font-mono">{tx.userId}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Data/Hora</span>
                        <p>{new Date(tx.createdAt).toLocaleString("pt-BR")}</p>
                      </div>
                      {tx.metadata && (
                        <div className="col-span-2 md:col-span-4">
                          <span className="text-muted-foreground">Metadados</span>
                          <pre className="text-xs bg-background p-2 rounded mt-1 overflow-x-auto">{tx.metadata}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab Content: Summary */}
      {activeTab === "summary" && (
        <div className="space-y-4">
          {!filterUserId ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <User className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Selecione um colaborador no filtro acima para ver o resumo detalhado.</p>
            </div>
          ) : summaryData ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-card border border-border rounded-xl p-4 text-center">
                  <p className="text-sm text-muted-foreground">Saldo Atual</p>
                  <p className="text-3xl font-bold text-primary mt-1">{summaryData.currentBalance}</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-4 text-center">
                  <p className="text-sm text-green-400">Total Ganho</p>
                  <p className="text-3xl font-bold text-green-400 mt-1">+{summaryData.totalGained}</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-4 text-center">
                  <p className="text-sm text-red-400">Total Perdido</p>
                  <p className="text-3xl font-bold text-red-400 mt-1">-{summaryData.totalLost}</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-4 text-center">
                  <p className="text-sm text-muted-foreground">Transações</p>
                  <p className="text-3xl font-bold mt-1">{summaryData.transactionCount}</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-4 text-center">
                  <p className="text-sm text-muted-foreground">Última Transação</p>
                  <p className="text-sm font-medium mt-2">
                    {summaryData.lastTransaction ? formatDate(summaryData.lastTransaction.createdAt) : "Nenhuma"}
                  </p>
                </div>
              </div>

              {/* Histórico do colaborador */}
              <h3 className="text-lg font-semibold mt-4">Histórico de {summaryData.userName}</h3>
              <div className="space-y-2">
                {(summaryData.transactions || []).map((tx: any) => {
                  const typeInfo = typeLabels[tx.type] || { label: tx.type, icon: Zap, color: "text-gray-400", bg: "bg-gray-500/10" };
                  const TypeIcon = typeInfo.icon;
                  return (
                    <div key={tx.id} className="flex items-center gap-3 bg-card border border-border rounded-lg p-3">
                      <div className={`w-8 h-8 rounded-full ${typeInfo.bg} flex items-center justify-center`}>
                        <TypeIcon className={`w-4 h-4 ${typeInfo.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{tx.reason}</p>
                        <p className="text-xs text-muted-foreground">
                          {typeInfo.label} • {formatDate(tx.createdAt)} • por {tx.performedByName || "Sistema"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${tx.amount >= 0 ? "text-green-400" : "text-red-400"}`}>
                          {tx.amount >= 0 ? "+" : ""}{tx.amount}
                        </p>
                        <p className="text-xs text-muted-foreground">{tx.balanceBefore} → {tx.balanceAfter}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          )}
        </div>
      )}

      {/* Tab Content: Tools */}
      {activeTab === "tools" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-semibold flex items-center gap-2 mb-2">
              <ArrowUpDown className="w-5 h-5 text-purple-400" /> Ajustar Saldo
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Definir manualmente o saldo de pontos de um colaborador. Registra a diferença como transação.
            </p>
            <button
              onClick={() => setShowAdjustDialog(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Ajustar Saldo
            </button>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-semibold flex items-center gap-2 mb-2">
              <RefreshCw className="w-5 h-5 text-blue-400" /> Recalcular Pontos
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Recalcula o saldo de um colaborador somando TODAS as transações registradas.
            </p>
            <div className="flex gap-2">
              <select
                value={selectedUserId}
                onChange={e => setSelectedUserId(Number(e.target.value))}
                className="px-3 py-2 bg-background border border-border rounded-lg text-sm flex-1"
              >
                <option value={0}>Selecione...</option>
                {(allUsers || []).map((u: any) => (
                  <option key={u.id} value={u.id}>{u.name || u.email}</option>
                ))}
              </select>
              <button
                onClick={() => selectedUserId && recalculateMut.mutate({ userId: selectedUserId })}
                disabled={!selectedUserId || recalculateMut.isPending}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {recalculateMut.isPending ? "..." : "Recalcular"}
              </button>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-semibold flex items-center gap-2 mb-2">
              <RefreshCw className="w-5 h-5 text-amber-400" /> Recalcular TODOS
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Recalcula o saldo de TODOS os colaboradores. Use com cuidado.
            </p>
            <button
              onClick={() => {
                if (confirm("Tem certeza que deseja recalcular os pontos de TODOS os colaboradores?")) {
                  recalculateAllMut.mutate();
                }
              }}
              disabled={recalculateAllMut.isPending}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {recalculateAllMut.isPending ? "Recalculando..." : "Recalcular Todos"}
            </button>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-semibold flex items-center gap-2 mb-2">
              <Database className="w-5 h-5 text-cyan-400" /> Migrar Dados Antigos
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Importa registros da tabela points_log antiga para o novo sistema. Não exclui dados antigos.
            </p>
            <button
              onClick={() => {
                if (confirm("Isso vai importar os registros antigos do points_log para o novo sistema. Os dados antigos NÃO serão excluídos. Continuar?")) {
                  migrateMut.mutate();
                }
              }}
              disabled={migrateMut.isPending}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {migrateMut.isPending ? "Migrando..." : "Migrar Dados"}
            </button>
          </div>
        </div>
      )}

      {/* Dialog: Adicionar Pontos */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowAddDialog(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
              <Plus className="w-5 h-5 text-green-400" /> Adicionar Pontos
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">Colaborador *</label>
                <select
                  value={selectedUserId}
                  onChange={e => setSelectedUserId(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg text-sm"
                >
                  <option value={0}>Selecione o colaborador...</option>
                  {(allUsers || []).map((u: any) => (
                    <option key={u.id} value={u.id}>{u.name || u.email} ({u.totalPoints || 0} pts)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Quantidade de pontos *</label>
                <input
                  type="number"
                  min="1"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="Ex: 15"
                  className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Motivo *</label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Descreva o motivo da adição de pontos..."
                  rows={3}
                  className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg text-sm resize-none"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowAddDialog(false)}
                  className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (!selectedUserId || !amount || !reason) return alert("Preencha todos os campos!");
                    manualAddMut.mutate({ userId: selectedUserId, amount: Number(amount), reason });
                  }}
                  disabled={manualAddMut.isPending}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {manualAddMut.isPending ? "Adicionando..." : "Confirmar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dialog: Remover Pontos */}
      {showRemoveDialog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowRemoveDialog(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
              <Minus className="w-5 h-5 text-red-400" /> Remover Pontos
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">Colaborador *</label>
                <select
                  value={selectedUserId}
                  onChange={e => setSelectedUserId(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg text-sm"
                >
                  <option value={0}>Selecione o colaborador...</option>
                  {(allUsers || []).map((u: any) => (
                    <option key={u.id} value={u.id}>{u.name || u.email} ({u.totalPoints || 0} pts)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Quantidade de pontos a remover *</label>
                <input
                  type="number"
                  min="1"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="Ex: 10"
                  className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Motivo *</label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Descreva o motivo da remoção de pontos..."
                  rows={3}
                  className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg text-sm resize-none"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowRemoveDialog(false)}
                  className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (!selectedUserId || !amount || !reason) return alert("Preencha todos os campos!");
                    if (confirm(`Tem certeza que deseja remover ${amount} pontos?`)) {
                      manualRemoveMut.mutate({ userId: selectedUserId, amount: Number(amount), reason });
                    }
                  }}
                  disabled={manualRemoveMut.isPending}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {manualRemoveMut.isPending ? "Removendo..." : "Confirmar Remoção"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dialog: Ajustar Saldo */}
      {showAdjustDialog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowAdjustDialog(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
              <ArrowUpDown className="w-5 h-5 text-purple-400" /> Ajustar Saldo
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">Colaborador *</label>
                <select
                  value={selectedUserId}
                  onChange={e => setSelectedUserId(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg text-sm"
                >
                  <option value={0}>Selecione o colaborador...</option>
                  {(allUsers || []).map((u: any) => (
                    <option key={u.id} value={u.id}>{u.name || u.email} (atual: {u.totalPoints || 0} pts)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Novo saldo *</label>
                <input
                  type="number"
                  min="0"
                  value={newBalance}
                  onChange={e => setNewBalance(e.target.value)}
                  placeholder="Ex: 50"
                  className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Motivo *</label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Descreva o motivo do ajuste..."
                  rows={3}
                  className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg text-sm resize-none"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowAdjustDialog(false)}
                  className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (!selectedUserId || newBalance === "" || !reason) return alert("Preencha todos os campos!");
                    if (confirm(`Tem certeza que deseja ajustar o saldo para ${newBalance} pontos?`)) {
                      manualAdjustMut.mutate({ userId: selectedUserId, newBalance: Number(newBalance), reason });
                    }
                  }}
                  disabled={manualAdjustMut.isPending}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {manualAdjustMut.isPending ? "Ajustando..." : "Confirmar Ajuste"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
