# TaskFlow — Relatório de Melhorias e Correções

**Projeto:** TaskFlow - Sistema de Gestão de Tarefas Corporativo  
**Data:** 15/02/2026  
**Versão atual:** v11 (após 11 refatorações)

---

## Resumo dos Problemas Identificados

Após análise completa do código-fonte (client, server, schema, CSS, todas as páginas e componentes), identifiquei **4 grandes áreas de trabalho** divididas em **6 partes** executáveis de forma independente e sequencial.

---

## PARTE 1 — Correção do Modo Escuro (Dark Mode Bugs)

**Prioridade: ALTA** | **Estimativa: ~200 linhas de alteração**

### Problemas encontrados:

1. **Tooltip dos gráficos (Home.tsx)** — O `contentStyle` do Recharts Tooltip tem cores hardcoded para dark mode (`background: "oklch(0.19 0.02 270)"`, `color: "oklch(0.93 0.005 270)"`). No modo claro, o tooltip aparece com fundo escuro.

2. **CartesianGrid (Home.tsx)** — A cor do grid (`stroke: "oklch(0.26 0.018 270 / 0.5)"`) é fixa para dark mode. No light mode fica quase invisível.

3. **AreaChart gradient (Home.tsx)** — O gradiente `colorCount` usa cores fixas de dark mode.

4. **XAxis/YAxis tick colors (Home.tsx)** — Cores fixas `fill: "oklch(0.6 0.015 270)"` não se adaptam ao tema.

5. **Glass-card CSS (index.css)** — Os seletores `:root:not(.dark)` podem conflitar porque a classe `.dark` fica no `<html>` mas o seletor verifica `:root:not(.dark)`. Precisa testar e ajustar se necessário.

6. **Kanban card overlay e drag states** — Sombras e bordas com cores hardcoded de dark mode que aparecem incorretamente no light mode.

### O que será feito:

- Criar um hook `useThemeColors()` que retorna as cores corretas para gráficos baseado no tema atual
- Atualizar `Home.tsx` para usar cores dinâmicas nos Tooltips, grids, eixos e gradientes
- Revisar todas as classes CSS customizadas em `index.css` para garantir que os seletores light/dark funcionam corretamente
- Testar todos os componentes que usam `oklch()` hardcoded dentro de JSX inline styles

### Arquivos afetados:

- `client/src/pages/Home.tsx`
- `client/src/index.css`
- `client/src/pages/CollaboratorKanban.tsx`
- Novo: `client/src/hooks/useThemeColors.ts`

---

## PARTE 2 — Correção do Tema Claro (Light Mode + Rosa)

**Prioridade: ALTA** | **Estimativa: ~150 linhas de alteração**

### Problemas encontrados:

1. **Sidebar rosa muito forte** — A cor `oklch(0.55 0.2 340)` é muito saturada e escura, dificultando a leitura do texto e ícones sobre ela. O rosa "tampa" informações.

2. **Contraste insuficiente** — Itens ativos no menu (`bg-primary/15 text-primary`) ficam quase invisíveis sobre o fundo rosa da sidebar.

3. **Gradiente de texto ilegível** — O `gradient-text` no light mode usa rosa escuro que compete visualmente com a sidebar rosa.

4. **Hover states na sidebar** — `hover:bg-sidebar-accent` resulta em rosa sobre rosa, sem distinção visual.

5. **Avatar e badge no footer** — O `bg-primary/20 text-primary` no avatar fica rosa sobre rosa na sidebar.

6. **Toggle de tema (Sun/Moon)** — Difícil de ver sobre o fundo rosa, especialmente o ícone `text-sidebar-foreground/70`.

### O que será feito:

- Redesenhar as variáveis CSS do light mode para a sidebar: trocar o rosa forte por uma paleta mais suave (rosa claro/lilás com bom contraste)
- Alternativa: sidebar branca/cinza claro com acentos rosa (mais profissional)
- Ajustar `--sidebar-accent`, `--sidebar-foreground`, `--sidebar-primary` para garantir contraste WCAG AA
- Atualizar `--primary` do light mode para um tom mais equilibrado que funcione tanto na sidebar quanto no conteúdo
- Ajustar o `gradient-text` do light mode
- Corrigir os hover states e active states da sidebar no `DashboardLayout.tsx`

### Arquivos afetados:

- `client/src/index.css` (variáveis CSS `:root`)
- `client/src/components/DashboardLayout.tsx`

---

## PARTE 3 — Campo de Telefone + Registro de Usuários

**Prioridade: ALTA** | **Estimativa: ~300 linhas de alteração**

### O que falta:

1. **Campo `phone` na tabela `users`** — Não existe no schema. Necessário para integração WhatsApp.

2. **Tela de cadastro de colaboradores** — Atualmente o sistema depende de login via auth externo (cookie-based). Não há formulário para admin cadastrar usuários com telefone.

3. **Validação de telefone** — Formato brasileiro (+55 DDD NÚMERO) para integrar com API do WhatsApp.

### O que será feito:

- **Schema/Migração:**
  - Adicionar campo `phone` (varchar 20) na tabela `users`
  - Criar migração Drizzle `0005_add_phone.sql`

- **Backend:**
  - Novo endpoint `users.update` (admin) para editar dados de usuário incluindo telefone
  - Novo endpoint `users.create` (admin) para cadastrar colaborador manualmente (nome, email, telefone, role)
  - Validação de telefone no formato brasileiro

- **Frontend:**
  - Modal/página de cadastro de colaborador (admin only)
  - Campo de telefone no perfil do usuário
  - Campo de telefone na listagem de colaboradores
  - Máscara de input para telefone brasileiro

### Arquivos afetados:

- `drizzle/schema.ts`
- Nova migração: `drizzle/0005_add_phone_field.sql`
- `server/routers.ts` (novos endpoints)
- `server/db.ts` (novas queries)
- `client/src/pages/Collaborators.tsx` (botão + modal de cadastro)
- `client/src/pages/Profile.tsx` (exibir/editar telefone)
- Novo: `client/src/components/PhoneInput.tsx`

---

## PARTE 4 — Integração WhatsApp (Notificações de Tarefas)

**Prioridade: MÉDIA** | **Estimativa: ~250 linhas de alteração**

### O que será feito:

- **Backend — Serviço de WhatsApp:**
  - Criar módulo `server/whatsapp.ts` com integração via API (Evolution API, Baileys, ou Z-API — a definir)
  - Função `sendWhatsAppNotification(phone, message)` reutilizável
  - Configuração via variáveis de ambiente (API_URL, TOKEN, etc.)

- **Notificações automáticas:**
  - Quando uma tarefa for **criada** e atribuída → notificar o colaborador
  - Quando o **status mudar** → notificar o colaborador
  - Quando o **prazo estiver próximo** (24h) → notificar o colaborador
  - Quando uma tarefa estiver **atrasada** → notificar o colaborador

- **Backend — Gatilhos:**
  - Integrar nos endpoints `tasks.create`, `tasks.updateStatus`, `tasks.update`
  - Criar job/cron para verificar prazos diariamente

- **Frontend:**
  - Indicador visual de "notificação WhatsApp enviada" no card da tarefa
  - Configuração admin para ativar/desativar notificações WhatsApp
  - Botão para reenviar notificação manualmente

### Arquivos afetados:

- Novo: `server/whatsapp.ts`
- `server/routers.ts` (integrar notificações nos endpoints existentes)
- `server/db.ts` (query para buscar telefone do assignee)
- `client/src/pages/CollaboratorKanban.tsx` (indicador visual)
- Novo: configuração de ambiente (`.env`)

---

## PARTE 5 — Melhorias de UI/UX e Profissionalismo

**Prioridade: MÉDIA** | **Estimativa: ~400 linhas de alteração**

### O que será feito:

1. **Dashboard mais rico:**
   - Adicionar card de "Tarefas da Semana" com mini-timeline
   - Gráfico de barras comparativo entre colaboradores
   - Indicador de tendência (seta verde/vermelha) nos stat cards

2. **Kanban melhorado:**
   - Contador de tarefas atrasadas por coluna com destaque vermelho
   - Filtro rápido por prioridade (chips clicáveis)
   - Animação de celebração ao completar tarefa (confetti simples)
   - Melhorar o painel lateral de detalhes: tipografia, espaçamentos, separadores visuais

3. **Sidebar/Layout:**
   - Indicador de notificações no menu (badge numérico)
   - Breadcrumb no header mobile
   - Transição suave ao trocar de tema (dark ↔ light)

4. **Ranking:**
   - Animações no pódio (entrada com delay)
   - Gráfico de evolução de pontos por colaborador

5. **Perfil:**
   - Upload de foto de perfil (avatar real)
   - Edição do nome e informações pessoais

6. **Chat:**
   - Indicador de "digitando..."
   - Suporte a emojis
   - Mensagens não lidas (badge no menu)

### Arquivos afetados:

- Praticamente todas as páginas em `client/src/pages/`
- `client/src/components/DashboardLayout.tsx`
- `client/src/index.css`
- Possíveis novos componentes em `client/src/components/`

---

## PARTE 6 — Melhorias de Estrutura e Código

**Prioridade: BAIXA** | **Estimativa: ~200 linhas de alteração**

### O que será feito:

1. **Organização de código:**
   - Extrair constantes de cores/configuração para arquivo centralizado
   - Criar tipos compartilhados para as configs de status/prioridade (atualmente duplicados entre páginas)
   - Separar o `CollaboratorKanban.tsx` (1043 linhas!) em componentes menores: `KanbanColumn`, `TaskCard`, `TaskDetailPanel`, `NewTaskDialog`

2. **Performance:**
   - Memoizar componentes pesados do Kanban
   - Lazy loading para páginas (React.lazy + Suspense)
   - Otimizar polling do Chat (WebSocket ou SSE no futuro)

3. **Acessibilidade:**
   - Adicionar `aria-labels` nos botões de ação
   - Contraste mínimo WCAG AA em todos os elementos
   - Focus trap nos modais/dialogs

4. **Testes:**
   - Adicionar testes para os novos endpoints (phone, WhatsApp)
   - Testar permissões de admin vs colaborador

### Arquivos afetados:

- `client/src/pages/CollaboratorKanban.tsx` (split em componentes)
- `client/src/App.tsx` (lazy loading)
- Novo: `client/src/config/theme.ts` (constantes centralizadas)
- Novo: `shared/taskConfig.ts` (configs compartilhadas)
- `server/tasks.test.ts` (novos testes)

---

## Ordem de Execução Recomendada

| Ordem | Parte | Descrição | Dependência |
|-------|-------|-----------|-------------|
| 1º | **Parte 1** | Fix Dark Mode | Nenhuma |
| 2º | **Parte 2** | Fix Light Mode / Rosa | Parte 1 (mesmo CSS) |
| 3º | **Parte 3** | Telefone + Cadastro | Nenhuma |
| 4º | **Parte 4** | WhatsApp | Parte 3 (precisa do phone) |
| 5º | **Parte 5** | UI/UX Premium | Partes 1+2 (tema correto) |
| 6º | **Parte 6** | Estrutura/Código | Melhor fazer por último |

---

## Notas Técnicas

- **Stack:** React + TypeScript + Vite (client) / Express + tRPC + Drizzle ORM + MySQL (server)
- **UI Library:** shadcn/ui + Tailwind CSS + Lucide Icons + Recharts + Framer Motion + dnd-kit
- **Auth:** Cookie-based session com auth externo
- **Testes:** Vitest (16 testes passando)
- **Arquivo mais crítico:** `CollaboratorKanban.tsx` com 1043 linhas (candidato a refatoração)
