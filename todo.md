# Project TODO

## Database & Schema
- [x] Tabela de tarefas (tasks) com título, descrição, prazo, prioridade, status, responsável
- [x] Tabela de pontos/gamificação (points_log) para registrar pontuação
- [x] Tabela de badges/conquistas (badges, user_badges)
- [x] Tabela de histórico de atividades (activity_log)
- [x] Migração do banco de dados

## Backend - API & Lógica
- [x] CRUD de tarefas (criar, listar, atualizar, deletar)
- [x] Atribuição de tarefas a colaboradores
- [x] Atualização de status de tarefas (pendente, em andamento, concluída)
- [x] Sistema de pontuação automática (pontos por conclusão no prazo, qualidade)
- [x] Sistema de badges/conquistas automático
- [x] Dashboard stats (tarefas concluídas, pendentes, atrasadas, taxa de conclusão)
- [x] Ranking de produtividade dos colaboradores
- [x] Filtros e busca de tarefas (status, prioridade, responsável)
- [x] Histórico de atividades
- [x] Relatórios de desempenho individual e por equipe
- [x] Controle de acesso admin vs colaborador
- [x] Listagem de usuários para atribuição

## Frontend - Design & UI
- [x] Tema elegante e profissional (cores, tipografia, espaçamento)
- [x] DashboardLayout com sidebar de navegação
- [x] Página Dashboard com métricas em tempo real (cards + gráficos)
- [x] Página de Tarefas com listagem, filtros e busca
- [x] Modal/formulário de criação/edição de tarefas
- [x] Página de Ranking com leaderboard e gamificação
- [x] Página de Badges/Conquistas
- [x] Página de Relatórios de desempenho
- [x] Página de Perfil do usuário com estatísticas
- [x] Indicadores visuais de prioridade e status
- [x] Notificações visuais para prazos próximos e tarefas atrasadas
- [x] Estados de loading, empty e error em todas as páginas
- [x] Responsividade mobile

## Testes
- [x] Testes vitest para API de tarefas (CRUD, permissões)
- [x] Testes vitest para dashboard stats
- [x] Testes vitest para gamificação (ranking, badges)
- [x] Testes vitest para atividades e usuários
- [x] Todos os 16 testes passando

## Refatoração v2
- [x] Transformar página de Tarefas em Kanban com colunas por status
- [x] Implementar drag-and-drop para mover tarefas entre colunas
- [x] Facilitar criação rápida de tarefas direto no Kanban
- [x] Remover página de Relatórios por equipe (foco em colaborador individual)
- [x] Elevar design visual para nível premium/sofisticado em todas as páginas
- [x] Melhorar Dashboard com visual mais rico e impactante
- [x] Melhorar Ranking com visual mais elaborado
- [x] Melhorar Conquistas com visual mais atraente
- [x] Melhorar sidebar e layout geral
- [x] Ajustar navegação (remover Relatórios do menu)

## Refatoração v3 - Kanban Premium
- [x] Cards do Kanban mais elaborados com mais informações visíveis
- [x] Indicadores visuais de prazo (atrasado, próximo do vencimento, no prazo)
- [x] Avatares dos responsáveis nos cards
- [x] Cores por prioridade mais marcantes e diferenciadas
- [x] Animações e transições suaves no drag-and-drop
- [x] Header das colunas mais rico com contadores e ícones
- [x] Barra de progresso ou indicador visual em cada card
- [x] Layout geral do Kanban mais impactante e profissional
- [x] Modal de criação de tarefa mais completo e bonito
- [x] Filtros visuais no Kanban (por responsável, prioridade)
