# Análise do Sistema de Pontos Atual

## Problema Principal
O `totalPoints` no `users` é atualizado com `sql\`totalPoints + X\`` que é frágil:
- Se a query falha silenciosamente, o points_log é criado mas totalPoints não atualiza
- Se o revert falha, os pontos ficam inconsistentes
- Não há como recalcular totalPoints a partir dos logs
- O getUserPoints retorna apenas 50 registros (LIMIT 50)

## Solução: Sistema BRUTO
1. Criar tabela `point_transactions` com TUDO registrado
2. O `totalPoints` do user deve ser SEMPRE recalculado a partir da soma de point_transactions
3. Criar função `recalculateUserPoints` que soma tudo e atualiza
4. Nova página Logs no admin para ver todas as transações
5. Filtro por colaborador, por tarefa, por período
6. Admin pode atribuir pontos manualmente
7. Admin pode corrigir pontos manualmente
