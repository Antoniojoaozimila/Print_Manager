# Print Manager

Sistema de gestão de impressões corporativas: API Node.js (Express + Sequelize + MySQL), painel React (Vite + Tailwind) e coletor Windows.

## Estrutura de pastas

```
Print Manager/
├── backend/          # API REST + Socket.io (MVC)
│   └── src/
│       ├── config/   # database, logger
│       ├── controllers/
│       ├── middlewares/
│       ├── models/
│       ├── routes/
│       ├── services/
│       ├── migrations/
│       ├── seeders/
│       └── server.js
├── frontend/         # React + Vite + Tailwind
├── collector/        # Serviço Windows — WMI Win32_PrintJob
└── README.md
```

## Pré-requisitos

- Node.js 18+
- MySQL 8+ (recomendado)
- Cliente `mysqldump` no PATH (para backup automático/manual)

## Backend

```bash
cd backend
cp .env.example .env
# Ajuste DATABASE_URL, JWT_SECRET, FRONTEND_URL
npm install
npx sequelize-cli db:migrate
npx sequelize-cli db:seed:all
npm run dev
```

API padrão: `http://localhost:4000`. Rotas sob `/api`.

**Administrador inicial (seed):** `admin@empresa.local` / `Admin@123` — altere após o primeiro acesso.

### Endpoints principais

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/auth/login` | JWT |
| GET | `/api/auth/me` | Perfil |
| CRUD | `/api/usuarios` | Admin |
| CRUD | `/api/impressoras` | Lista autenticada; criação/edição admin |
| POST | `/api/impressoras/:id/heartbeat` | Admin — atualiza online |
| POST | `/api/collect/jobs` | Coletor — header `X-Collector-Token` |
| GET | `/api/jobs` | Lista jobs (usuário vê só os seus) |
| GET | `/api/dashboard/kpis` | KPIs |
| GET | `/api/relatorios/mensal` | Relatório mensal + export xlsx/pdf |
| GET | `/api/logs` | Admin |
| POST | `/api/backup/executar` | Admin — `mysqldump` |

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Abra `http://localhost:5173`. O proxy do Vite encaminha `/api` e WebSocket para o backend.

## Coletor (Windows 10/11)

1. No painel admin, crie o usuário ou copie o **token do coletor** (`token_acesso`).
2. Copie `collector/config.example.json` para `collector/config.json` e preencha `apiBaseUrl` e `collectorToken`.
3. Teste: `cd collector && npm install && npm start`
4. Instalação como serviço (PowerShell **como administrador**):

```powershell
cd collector
.\instalador.ps1
```

O coletor consulta `Win32_PrintJob` via PowerShell, deduplica por impressora+JobId, envia lotes à API e grava fila em `offline-queue/` se estiver sem rede.

## Segurança

- Helmet, CORS configurável, rate limit global e rota de login.
- JWT para painel; token longo por usuário para o coletor.
- Validação com Joi nos payloads críticos.

## Testes (API)

```bash
cd backend
npm test
```
