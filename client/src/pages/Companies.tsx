import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Building2, Plus, Search, Pencil, Trash2, ChevronRight,
  ClipboardList, Clock, CheckCircle2, Users,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

const colorOptions = [
  "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
  "#ec4899", "#f43f5e", "#ef4444", "#f97316",
  "#eab308", "#22c55e", "#14b8a6", "#06b6d4",
  "#3b82f6", "#2563eb", "#4f46e5", "#7c3aed",
];

export default function Companies() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingCompany, setEditingCompany] = useState<any>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#6366f1");

  const { data: companies, isLoading } = trpc.companies.listWithStats.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.companies.create.useMutation({
    onSuccess: () => {
      utils.companies.listWithStats.invalidate();
      setShowCreateDialog(false);
      resetForm();
      toast.success("Empresa criada com sucesso!");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.companies.update.useMutation({
    onSuccess: () => {
      utils.companies.listWithStats.invalidate();
      setEditingCompany(null);
      resetForm();
      toast.success("Empresa atualizada!");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.companies.delete.useMutation({
    onSuccess: () => {
      utils.companies.listWithStats.invalidate();
      toast.success("Empresa excluída!");
    },
    onError: (err) => toast.error(err.message),
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setColor("#6366f1");
  };

  const openEdit = (company: any) => {
    setEditingCompany(company);
    setName(company.name);
    setDescription(company.description || "");
    setColor(company.color || "#6366f1");
  };

  const handleSubmit = () => {
    if (!name.trim()) return toast.error("Nome é obrigatório");
    if (editingCompany) {
      updateMutation.mutate({ id: editingCompany.id, name, description: description || null, color });
    } else {
      createMutation.mutate({ name, description: description || undefined, color });
    }
  };

  const filteredCompanies = useMemo(() => {
    if (!companies) return [];
    if (!search.trim()) return companies;
    const q = search.toLowerCase();
    return companies.filter(c => c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q));
  }, [companies, search]);

  const totalStats = useMemo(() => {
    if (!companies) return { total: 0, pending: 0, inProgress: 0, completed: 0 };
    return companies.reduce((acc, c) => ({
      total: acc.total + c.totalTasks,
      pending: acc.pending + c.pendingTasks,
      inProgress: acc.inProgress + c.inProgressTasks,
      completed: acc.completed + c.completedTasks,
    }), { total: 0, pending: 0, inProgress: 0, completed: 0 });
  }, [companies]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Carregando empresas...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/20">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Empresas</h1>
            <p className="text-sm text-muted-foreground">{companies?.length || 0} empresas cadastradas</p>
          </div>
        </div>
        <Button onClick={() => { resetForm(); setShowCreateDialog(true); }}
          className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-lg shadow-primary/20">
          <Plus className="h-4 w-4 mr-2" /> Nova Empresa
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl bg-card/80 border border-border/30 p-4 flex items-center gap-3">
          <ClipboardList className="h-5 w-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Total Tarefas</p>
            <p className="text-xl font-bold">{totalStats.total}</p>
          </div>
        </div>
        <div className="rounded-xl bg-card/80 border border-border/30 p-4 flex items-center gap-3">
          <Clock className="h-5 w-5 text-orange-500" />
          <div>
            <p className="text-xs text-muted-foreground">Pendentes</p>
            <p className="text-xl font-bold">{totalStats.pending}</p>
          </div>
        </div>
        <div className="rounded-xl bg-card/80 border border-border/30 p-4 flex items-center gap-3">
          <Clock className="h-5 w-5 text-blue-500" />
          <div>
            <p className="text-xs text-muted-foreground">Em Andamento</p>
            <p className="text-xl font-bold">{totalStats.inProgress}</p>
          </div>
        </div>
        <div className="rounded-xl bg-card/80 border border-border/30 p-4 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          <div>
            <p className="text-xs text-muted-foreground">Concluídas</p>
            <p className="text-xl font-bold">{totalStats.completed}</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar empresa..." value={search} onChange={e => setSearch(e.target.value)}
          className="pl-10 bg-card/80 border-border/30" />
      </div>

      {/* Company Cards */}
      {filteredCompanies.length === 0 ? (
        <div className="text-center py-16 rounded-xl bg-card/80 border border-border/30">
          <Building2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-1">Nenhuma empresa encontrada</h3>
          <p className="text-sm text-muted-foreground mb-4">Crie sua primeira empresa para organizar as tarefas</p>
          <Button onClick={() => { resetForm(); setShowCreateDialog(true); }} variant="outline">
            <Plus className="h-4 w-4 mr-2" /> Criar Empresa
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCompanies.map(company => {
            const progress = company.totalTasks > 0
              ? Math.round((company.completedTasks / company.totalTasks) * 100)
              : 0;
            return (
              <div key={company.id}
                className="group rounded-xl bg-card/80 border border-border/30 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 cursor-pointer overflow-hidden"
                onClick={() => setLocation(`/company/${company.id}`)}>
                {/* Color bar */}
                <div className="h-1.5" style={{ backgroundColor: company.color }} />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md"
                        style={{ backgroundColor: company.color }}>
                        {company.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-base group-hover:text-primary transition-colors">{company.name}</h3>
                        {company.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{company.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => openEdit(company)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm(`Excluir "${company.name}"? As tarefas não serão excluídas.`)) {
                            deleteMutation.mutate({ id: company.id });
                          }
                        }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="text-center rounded-lg bg-orange-500/10 py-2">
                      <p className="text-lg font-bold text-orange-500">{company.pendingTasks}</p>
                      <p className="text-[10px] text-muted-foreground">Pendentes</p>
                    </div>
                    <div className="text-center rounded-lg bg-blue-500/10 py-2">
                      <p className="text-lg font-bold text-blue-500">{company.inProgressTasks}</p>
                      <p className="text-[10px] text-muted-foreground">Andamento</p>
                    </div>
                    <div className="text-center rounded-lg bg-emerald-500/10 py-2">
                      <p className="text-lg font-bold text-emerald-500">{company.completedTasks}</p>
                      <p className="text-[10px] text-muted-foreground">Concluídas</p>
                    </div>
                  </div>

                  {/* Progress + collaborators */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      <span>{company.collaboratorCount} colaboradores</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>Progresso {progress}%</span>
                      <div className="w-16 h-1.5 rounded-full bg-muted/30 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${progress}%`, backgroundColor: company.color }} />
                      </div>
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="flex justify-end mt-2">
                    <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog || !!editingCompany} onOpenChange={(open) => {
        if (!open) { setShowCreateDialog(false); setEditingCompany(null); resetForm(); }
      }}>
        <DialogContent className="sm:max-w-md bg-card border-border/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              {editingCompany ? "Editar Empresa" : "Nova Empresa"}
            </DialogTitle>
            <DialogDescription>
              {editingCompany ? "Atualize os dados da empresa" : "Cadastre uma nova empresa ou sede"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-medium">Nome *</Label>
              <Input placeholder="Nome da empresa" value={name} onChange={e => setName(e.target.value)}
                className="mt-1 bg-muted/10 border-border/20" />
            </div>
            <div>
              <Label className="text-xs font-medium">Descrição</Label>
              <Textarea placeholder="Descrição da empresa..." value={description}
                onChange={e => setDescription(e.target.value)}
                className="mt-1 bg-muted/10 border-border/20 min-h-[60px]" />
            </div>
            <div>
              <Label className="text-xs font-medium">Cor</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {colorOptions.map(c => (
                  <button key={c} onClick={() => setColor(c)}
                    className={`h-7 w-7 rounded-lg transition-all ${color === c ? "ring-2 ring-offset-2 ring-offset-background ring-primary scale-110" : "hover:scale-105"}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreateDialog(false); setEditingCompany(null); resetForm(); }}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-gradient-to-r from-primary to-purple-600">
              {editingCompany ? "Salvar" : "Criar Empresa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
