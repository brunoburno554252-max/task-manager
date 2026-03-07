-- Adicionar novos campos à tabela complaints
ALTER TABLE complaints ADD COLUMN involvedName TEXT;
ALTER TABLE complaints ADD COLUMN involvedPhone TEXT;
ALTER TABLE complaints ADD COLUMN resolutionDate TEXT;
