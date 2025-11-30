# 🏗️ FRAMEUP - PROJECT STATE

## 📊 STATUS GERAL
**Fase Atual:** 25.7 - Integrações e Rotas
**Progresso Geral:** 98%
**Próxima Fase:** 26.0 - Testes Finais e Deploy

---

## 📅 HISTÓRICO DE FASES

### ✅ Fase 1: Setup e Autenticação
- [x] Setup React + Vite + Tailwind
- [x] Configuração Supabase
- [x] Login/Signup (Creator e Editor)
- [x] Protected Routes

### ✅ Fase 2-10: Funcionalidades Core (Concluídas)
- [x] Dashboard Creator/Editor
- [x] Criação de Projetos
- [x] Marketplace de Projetos
- [x] Candidaturas
- [x] Chat em Tempo Real
- [x] Sistema de Pagamentos (Stripe)
- [x] Upload de Arquivos
- [x] Sistema de Avaliações

### ✅ Fase 11-17: Funcionalidades Avançadas (Concluídas)
- [x] Admin Dashboard
- [x] Analytics
- [x] Sistema de Assinaturas
- [x] Notificações
- [x] Disputas
- [x] Cupons de Desconto

### ✅ Fase 18: Recuperação de Senha
- [x] Página RecoverPassword.tsx
- [x] Integração Supabase Auth (resetPasswordForEmail)
- [x] Fluxo de UI (Request -> Email Sent -> New Password -> Success)

### ✅ Fase 25: Refinamentos Finais
- [x] 25.1 - Correção de Lint/Types
- [x] 25.2 - Otimização de Performance
- [x] 25.3 - Melhorias de UX/UI
- [x] 25.4 - Recontratação (Rehire Flow)
- [x] 25.5 - Modal de Seleção de Editor
- [x] 25.6 - Página de Propostas do Editor
- [x] 25.7 - Rotas e Sidebar
- [x] 25.8 - Correção de visualização de perfil de editor

---

## 📂 ESTRUTURA DE ARQUIVOS PRINCIPAIS

```
src/
├── components/
│   ├── admin/                      # Componentes do painel admin
│   ├── auth/                       # Componentes de autenticação
│   ├── chat/                       # Componentes do chat
│   ├── dashboard/                  # Componentes dos dashboards
│   ├── layout/                     # Layouts (Sidebar, Header)
│   ├── projects/                   # Componentes de projetos
│   ├── rehire/                     # Componentes de recontratação
│   └── ui/                         # Componentes base (shadcn)
│
├── contexts/
│   ├── AuthContext.tsx             # Contexto de autenticação
│   ├── AdminContext.tsx            # Contexto admin
│   └── NotificationContext.tsx     # Contexto notificações
│
├── hooks/                          # Custom hooks
│
├── lib/
│   ├── supabase.ts                 # Cliente Supabase
│   ├── stripe.ts                   # Cliente Stripe
│   └── utils.ts                    # Utilitários
│
├── pages/
│   ├── admin/                      # Páginas admin
│   ├── auth/                       # Páginas auth
│   ├── creator/                    # Páginas creator
│   ├── editor/                     # Páginas editor
│   ├── public/                     # Páginas públicas
│   └── RecoverPassword.tsx         # Recuperação de senha
│
├── types/
│   ├── database.ts                 # Tipos do banco
│   ├── admin.ts                    # Tipos admin
│   ├── approval.ts                 # Tipos aprovação
│   └── index.ts                    # Exports
│
├── App.tsx                         # Rotas principais
├── main.tsx                        # Entry point
└── index.css                       # Design system Tailwind
```

---

## 🗄️ ESTRUTURA DO BANCO DE DADOS

### Tabelas Principais
| Tabela | Descrição | Migration |
|--------|-----------|-----------|
| `users` | Usuários (auth.users extension) | Supabase default |
| `profiles` | Perfis de usuário | - |
| `editor_profiles` | Dados específicos editor | - |
| `portfolio_videos` | Vídeos do portfólio | - |
| `projects` | Projetos de edição | - |
| `project_applications` | Candidaturas | - |
| `messages` | Mensagens do chat | - |
| `reviews` | Avaliações | - |
| `editor_subscriptions` | Assinaturas | - |
| `subscription_plans` | Planos disponíveis | - |
| `notifications` | Notificações | `20251126_notifications.sql` |
| `notification_preferences` | Preferências | `20251126_notifications.sql` |

### Tabelas Admin
| Tabela | Descrição | Migration |
|--------|-----------|-----------|
| `admin_users` | Usuários admin | `admin_schema.sql` |
| `admin_action_logs` | Logs de ações | `admin_schema.sql` |
| `editor_approval_queue` | Fila aprovação | `editor_approval_schema.sql` |
| `disputes` | Disputas | `20250123_disputes_schema.sql` |
| `dispute_messages` | Mensagens disputa | `20250123_disputes_schema.sql` |
| `discount_codes` | Cupons desconto | `20250124_financial_schema.sql` |
| `user_warnings` | Avisos usuários | `20250124_warnings_schema.sql` |

### Tabelas Analytics
| Tabela | Descrição | Migration |
|--------|-----------| ----------|
| `analytics_events` | Eventos de tracking | ✅ Criada (analytics_schema) |
| `analytics_daily_metrics` | Métricas diárias | ✅ Criada (analytics_schema) |
| `analytics_project_funnel` | Funil projetos | ✅ Criada (analytics_schema) |
| `analytics_editor_rankings` | Ranking editores | ✅ Criada (analytics_schema) |
| `analytics_user_cohorts` | Cohorts usuários | ✅ Criada (analytics_schema) |

---

## 🔧 DECISÕES TÉCNICAS DOCUMENTADAS

### Arquitetura
- **Frontend:** React 18 + TypeScript + Vite
- **Estilização:** Tailwind CSS + shadcn/ui
- **Backend:** Supabase (PostgreSQL + Auth + Realtime + Storage)
- **Pagamentos:** Stripe (Checkout + Subscriptions + Portal)
- **Estado:** React Context (Auth, Admin) + React Query para cache

### Padrões de Código
- **Validação:** Zod para formulários
- **Formulários:** react-hook-form
- **Ícones:** Lucide React
- **Gráficos:** Recharts
- **Datas:** date-fns (quando necessário)

### Decisões de Negócio
- **Taxa plataforma:** 5% sobre projetos
- **Planos Editor:** Basic (R$39,99) e Pro (R$79,99)
- **Limite candidaturas:** Definido pelo plano
- **Portfólio obrigatório:** 3 vídeos para editores
- **Chat:** Liberado apenas quando projeto está `in_progress`

### Segurança
- **RLS:** Row Level Security ativo em todas tabelas
- **Auth:** Supabase Auth com email/senha
- **Admin:** Sistema de roles separado (super_admin, admin, financial, support)
- **Permissões:** Baseado em array de permissions por role

---

## 🐛 BUGS CONHECIDOS

| Bug | Severidade | Arquivo | Status |
|-----|------------|---------|--------|
| - | - | - | - |

---

## 🚀 PRÓXIMOS PASSOS PRIORIZADOS

### 🔴 Prioridade Alta (Sprint Atual)
1. **[x] Verificar/Completar RecoverPassword**
   - Arquivo completo e revisado
   - Fluxo completo implementado (Request, Email Sent, New Password, Success, Error)

2. **[ ] Popular Dados Iniciais nas Tabelas Analytics**
   - Criar script SQL ou função RPC para gerar dados fake/iniciais
   - Validar dashboard de analytics com dados reais

3. **[ ] Testes E2E do Fluxo de Recontratação**
   - Testar criação de proposta de recontratação
   - Testar aceitação/rejeição pelo editor
   - Verificar notificações

### 🟡 Prioridade Média
1. **[ ] Melhorar Responsividade Mobile**
   - Revisar tabelas no mobile
   - Revisar modais

2. **[ ] Otimizar Carregamento de Imagens**
   - Implementar lazy loading
   - Otimizar tamanhos

### 🟢 Prioridade Baixa (Backlog)
1. **[ ] Dark Mode Completo**
   - Revisar contrastes
   - Persistir preferência

2. **[ ] Internacionalização (i18n)**
   - Preparar estrutura para EN/ES
