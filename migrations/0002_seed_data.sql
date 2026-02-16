-- Seed Data: Badges
INSERT OR IGNORE INTO badges (name, description, icon, requirement, threshold) VALUES
  ('Primeira Tarefa', 'Completou a primeira tarefa', '🎯', 'tasks_completed', 1),
  ('Produtivo', 'Completou 10 tarefas', '⚡', 'tasks_completed', 10),
  ('Máquina', 'Completou 50 tarefas', '🔥', 'tasks_completed', 50),
  ('Lenda', 'Completou 100 tarefas', '🏆', 'tasks_completed', 100),
  ('Pontual', 'Completou 5 tarefas no prazo', '⏰', 'on_time', 5),
  ('Relógio Suíço', 'Completou 25 tarefas no prazo', '🕐', 'on_time', 25),
  ('Iniciante', 'Alcançou 100 pontos', '⭐', 'points', 100),
  ('Experiente', 'Alcançou 500 pontos', '🌟', 'points', 500),
  ('Mestre', 'Alcançou 1000 pontos', '💎', 'points', 1000),
  ('Velocista', 'Completou 5 tarefas urgentes', '🚀', 'urgent_completed', 5);
