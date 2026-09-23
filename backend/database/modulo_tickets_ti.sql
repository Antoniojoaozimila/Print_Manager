-- Módulo: Tickets TI — Assistência Diária + Projectos e Tarefas
-- Matriz de Controlo Diário do Departamento de TI
USE print_manager;

CREATE TABLE IF NOT EXISTS tickets_assistencias (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  numero INT NOT NULL,
  data DATE NOT NULL,
  tecnico VARCHAR(120) NOT NULL,
  usuario_id CHAR(36) NULL,
  hora_inicio TIME NOT NULL,
  hora_fim TIME NULL,
  duracao_min INT NULL,
  departamento VARCHAR(120) NULL,
  provincia VARCHAR(120) NULL,
  colaborador_assistido VARCHAR(200) NULL,
  tipo_solicitacao VARCHAR(120) NOT NULL,
  problema TEXT NOT NULL,
  resolucao TEXT NULL,
  estado ENUM('Pendente', 'Em Progresso', 'Concluído', 'Cancelado') NOT NULL DEFAULT 'Em Progresso',
  urgencia TINYINT(1) NOT NULL DEFAULT 0,
  descricao_urgencia TEXT NULL,
  num_chamadas INT NOT NULL DEFAULT 1,
  meio_solicitacao VARCHAR(80) NULL,
  observacoes TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY tickets_assist_numero_uq (numero),
  KEY tickets_assist_data_idx (data),
  KEY tickets_assist_tecnico_idx (tecnico),
  KEY tickets_assist_estado_idx (estado),
  CONSTRAINT fk_tickets_assist_user FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tickets_projectos (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  numero INT NOT NULL,
  data DATE NOT NULL,
  responsavel VARCHAR(120) NOT NULL,
  usuario_id CHAR(36) NULL,
  projecto_sistema VARCHAR(255) NOT NULL,
  tarefa TEXT NOT NULL,
  data_atribuicao DATE NOT NULL,
  prazo DATE NULL,
  fase_actual VARCHAR(80) NULL,
  percentagem_conclusao INT NOT NULL DEFAULT 0,
  alteracoes_solicitadas TEXT NULL,
  data_alteracao DATE NULL,
  descricao_alteracao TEXT NULL,
  accao_realizada TEXT NULL,
  estado ENUM('Pendente', 'Em Progresso', 'Concluído', 'Cancelado') NOT NULL DEFAULT 'Pendente',
  observacoes TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY tickets_proj_numero_uq (numero),
  KEY tickets_proj_data_idx (data),
  KEY tickets_proj_resp_idx (responsavel),
  KEY tickets_proj_estado_idx (estado),
  CONSTRAINT fk_tickets_proj_user FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
