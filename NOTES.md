# Análise do Sistema de Notificações Existente

## Já existe:
- Tabela `notifications` com: userId, type, title, message, entityType, entityId, isRead, createdAt
- Rotas tRPC: list, unreadCount, markRead, markAllRead
- NotificationPanel no DashboardLayout com ícones por tipo
- Polling a cada 15s para novas notificações
- Tipos existentes: task_review, task_approved, task_rejected, chat_message

## O que falta para tornar robusto:
1. Som ao receber notificação nova
2. Mais tipos de notificação para admin: task_overdue, task_created, task_status_changed, user_registered, user_deactivated
3. Notificações automáticas quando tarefas ficam atrasadas
4. Badge animada quando tem nova notificação
5. Categorias/filtros no painel de notificações

## Cadastros - Menu 3 pontinhos:
- Substituir botões de ação por DropdownMenu com MoreVertical icon
- Items: Ver logs, Editar, Inativar/Reativar, Excluir
