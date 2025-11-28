# 🎬 FRAMEUP - Project State

> **Documento de Estado do Projeto**  
> Mantenha este arquivo atualizado para manter continuidade entre sessões de desenvolvimento.

**Última Atualização:** 28/11/2025  
**Versão:** 1.0.0  
**Stack:** React 18 + TypeScript + Vite + Tailwind + Supabase + Stripe

---

## 📊 STATUS GERAL: 90% Completo

```
██████████████████░░ 90%
```

---

## 🏗️ STATUS POR MÓDULO

### 🔐 Autenticação & Cadastro
| Funcionalidade | Status | Arquivo | Observações |
|----------------|--------|---------|-------------|
| Login | ✅ Completo | `pages/Login.tsx` | Email + senha |
| Cadastro Creator | ✅ Completo | `pages/Signup.tsx` | Validação Zod |
| Cadastro Editor | ✅ Completo | `pages/Signup.tsx` | 3 vídeos obrigatórios |
| Recuperar Senha | ⚠️ Verificar | `pages/RecoverPassword.tsx` | Arquivo pequeno (1.5KB) |
| Logout | ✅ Completo | `contexts/AuthContext.tsx` | - |
| Proteção de Rotas | ✅ Completo | `components/ProtectedRoute.tsx` | Por userType |

### 👤 Área do Creator
| Funcionalidade | Status | Arquivo | Observações |
|----------------|--------|---------|-------------|
| Dashboard | ✅ Completo | `pages/creator/Dashboard.tsx` | Métricas + lista projetos |
| Criar Projeto | ✅ Completo | `pages/creator/NewProject.tsx` | Wizard multi-step |
| Ver Candidaturas | ✅ Completo | `pages/creator/ProjectApplications.tsx` | Aceitar/rejeitar |
| Pagamento Projeto | ✅ Completo | `pages/creator/Payment.tsx` | Stripe integration |
| Revisar Entrega | ✅ Completo | `pages/creator/ReviewVideo.tsx` | Aprovar/solicitar revisão |
| Chat com Editor | ✅ Completo | `pages/shared/Chat.tsx` | Real-time |
| Avaliar Editor | ✅ Completo | `pages/shared/CreateReview.tsx` | 4 dimensões |
| Mensagens | ✅ Completo | `pages/shared/Messages.tsx` | Lista de conversas |

### ✂️ Área do Editor
| Funcionalidade | Status | Arquivo | Observações |
|----------------|--------|---------|-------------|
| Dashboard/Marketplace | ✅ Completo | `pages/editor/Dashboard.tsx` | Filtros avançados |
| Ver Detalhes Projeto | ✅ Completo | `pages/editor/ProjectDetails.tsx` | Candidatar-se |
| Planos de Assinatura | ✅ Completo | `pages/editor/SubscriptionPlans.tsx` | Basic/Pro |
| Gerenciar Assinatura | ✅ Completo | `pages/editor/ManageSubscription.tsx` | Portal Stripe |
| Entregar Vídeo | ✅ Completo | `pages/editor/DeliverVideo.tsx` | Link externo |
| Meu Perfil | ✅ Completo | `pages/editor/MyProfile.tsx` | View only |
| Editar Perfil | ✅ Completo | `pages/editor/EditProfile.tsx` | Portfólio + bio |
| Perfil Público | ✅ Completo | `pages/public/EditorPublicProfile.tsx` | Visível para creators |
| Chat com Creator | ✅ Completo | `pages/shared/Chat.tsx` | Compartilhado |
| Avaliar Creator | ✅ Completo | `pages/shared/CreateReview.tsx` | Compartilhado |

### 🛡️ Painel Administrativo
| Funcionalidade | Status | Arquivo | Observações |
|----------------|--------|---------|-------------|
| Login Admin | ✅ Completo | `pages/admin/Login.tsx` | Separado do login normal |
| Dashboard | ✅ Completo | `pages/admin/AdminDashboard.tsx` | Métricas + alertas |
| Aprovar Editores | ✅ Completo | `pages/admin/EditorApprovals.tsx` | Fila com flags |
| Detalhe Aprovação | ✅ Completo | `pages/admin/EditorApprovalDetail.tsx` | Análise completa |
| Disputas | ✅ Completo | `pages/admin/Disputes.tsx` | Lista com filtros |
| Detalhe Disputa | ✅ Completo | `pages/admin/DisputeDetail.tsx` | Mediação completa |
| Financeiro | ✅ Completo | `pages/admin/Financial.tsx` | Dados reais |
| Descontos | ✅ Completo | `pages/admin/Discounts.tsx` | CRUD cupons |
| Usuários Suspeitos | ✅ Completo | `pages/admin/SuspiciousUsers.tsx` | Bias score |
| Gerenciar Admins | ✅ Completo | `pages/admin/AdminUsers.tsx` | CRUD admins |
| Analytics | ✅ Completo | `pages/admin/Analytics.tsx` | - |

### 💬 Sistema de Chat
| Funcionalidade | Status | Arquivo | Observações |
|----------------|--------|---------|-------------|
| Enviar Mensagem | ✅ Completo | `pages/shared/Chat.tsx` | - |
| Real-time | ✅ Completo | `pages/shared/Chat.tsx` | Supabase Realtime |
| Marcar como Lida | ✅ Completo | `pages/shared/Chat.tsx` | Automático |
| Contador Não Lidas | ✅ Completo | `hooks/useUnreadMessages.ts` | Integrado no header |
| Lista de Conversas | ✅ Completo | `pages/shared/Messages.tsx` | - |

### 🔔 Sistema de Notificações
| Funcionalidade | Status | Arquivo | Observações |
|----------------|--------|---------|-------------|
| Notificações In-App | ✅ Completo | `pages/shared/Notifications.tsx` | Lista completa |
| Badge no Header | ✅ Completo | `components/notifications/NotificationDropdown.tsx` | Dropdown |
| Email Transacional | ❌ Não existe | - | **A IMPLEMENTAR** |
| Push Notifications | ❌ Não existe | - | Futuro |

---

## 📁 ESTRUTURA DE ARQUIVOS PRINCIPAIS

```
src/
├── pages/
│   ├── Home.tsx                    # Landing page
│   ├── Login.tsx                   # Login geral
│   ├── Signup.tsx                  # Cadastro (748 linhas)
│   ├── RecoverPassword.tsx         # Recuperação de senha
│   ├── NotFound.tsx                # 404
│   │
│   ├── creator/
│   │   ├── Dashboard.tsx           # Dashboard creator
│   │   ├── NewProject.tsx          # Criar projeto
│   │   ├── ProjectApplications.tsx # Ver candidaturas
│   │   ├── Payment.tsx             # Pagamento
│   │   ├── PaymentSuccess.tsx      # Sucesso pagamento
│   │   ├── ReviewVideo.tsx         # Revisar entrega
│   │   └── ProjectPreview.tsx      # Preview projeto
│   │
│   ├── editor/
│   │   ├── Dashboard.tsx           # Marketplace
│   │   ├── ProjectDetails.tsx      # Detalhes + candidatura
│   │   ├── SubscriptionPlans.tsx   # Planos
│   │   ├── SubscriptionSuccess.tsx # Sucesso assinatura
│   │   ├── ManageSubscription.tsx  # Gerenciar assinatura
│   │   ├── DeliverVideo.tsx        # Entregar vídeo
│   │   ├── MyProfile.tsx           # Meu perfil
│   │   ├── EditProfile.tsx         # Editar perfil
│   │   └── Pricing.tsx             # Tabela de preços
│   │
│   ├── admin/
│   │   ├── Login.tsx               # Login admin
│   │   ├── AdminLayout.tsx         # Layout com sidebar
│   │   ├── Dashboard.tsx           # Redirect
│   │   ├── AdminDashboard.tsx      # Dashboard principal
│   │   ├── EditorApprovals.tsx     # Fila aprovação
│   │   ├── EditorApprovalDetail.tsx
│   │   ├── Disputes.tsx            # Lista disputas
│   │   ├── DisputeDetail.tsx       # Detalhe disputa
│   │   ├── Financial.tsx           # Dashboard financeiro
│   │   ├── Discounts.tsx           # Cupons
│   │   ├── SuspiciousUsers.tsx     # Usuários suspeitos
│   │   ├── AdminUsers.tsx          # Gerenciar admins
│   │   └── Analytics.tsx           # Analytics completo
│   │
│   ├── shared/
│   │   ├── Chat.tsx                # Chat real-time
│   │   ├── Messages.tsx            # Lista mensagens
│   │   ├── CreateReview.tsx        # Criar avaliação
│   │   └── PublicProfile.tsx       # Perfil público
│   │
│   └── public/
│       └── EditorPublicProfile.tsx # Perfil editor público
│
├── components/
│   ├── layout/
│   │   └── DashboardLayout.tsx     # Layout principal
│   ├── guards/
│   │   └── SubscriptionGuard.tsx   # Guard de assinatura
│   ├── chat/
│   │   ├── MessageBubble.tsx
│   │   └── MessageInput.tsx
│   ├── messages/
│   │   └── MessageBadge.tsx        # Badge de mensagens 🆕
│   ├── notifications/
│   │   └── NotificationDropdown.tsx # Dropdown notificações 🆕
│   ├── creator/
│   │   ├── ProjectCard.tsx
│   │   ├── MetricCard.tsx
│   │   └── ... (10+ componentes)
│   ├── editor/
│   │   ├── ProjectCard.tsx
│   │   ├── ProjectFilters.tsx
│   │   └── SubscriptionBanner.tsx
│   └── ui/                         # shadcn/ui (40+ componentes)
│
├── services/
│   ├── adminAnalytics.ts           # Analytics service (completo)
│   ├── adminFinancial.ts           # Financial service
│   ├── adminApprovals.ts           # Aprovações service
│   ├── adminDisputes.ts            # Disputas service
│   ├── adminDashboard.ts           # Dashboard service
│   ├── adminService.ts             # Service geral
│   ├── adminUsers.ts               # Users service
│   └── adminWarnings.ts            # Warnings service
│
├── hooks/
│   ├── useAdmin.tsx                # Context + hook admin
│   ├── useSubscription.ts          # Hook assinatura
│   ├── useUnreadMessages.ts        # Contador mensagens
│   ├── useProjectPricing.ts        # Cálculo preços
│   ├── useUser.ts                  # Hook usuário
│   ├── useAuth.tsx                 # Hook auth
│   ├── use-toast.ts                # Toast notifications
│   ├── use-mobile.tsx              # Detecção mobile
│   └── useBreakpoint.ts            # Breakpoints
│
├── contexts/
│   └── AuthContext.tsx             # Context autenticação
│
├── lib/
│   ├── supabase.ts                 # Cliente Supabase
│   ├── stripe.ts                   # Cliente Stripe
│   ├── storage.ts                  # Storage helpers
│   ├── projects.ts                 # Project helpers
│   ├── adminAuth.ts                # Auth admin
│   └── utils.ts                    # Utilities (cn, etc)
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
| RecoverPassword incompleto | 🟡 Média | `pages/RecoverPassword.tsx` | Pendente |

---

## 🚀 PRÓXIMOS PASSOS PRIORIZADOS

### 🔴 Prioridade Alta (Sprint Atual)
1. **[ ] Verificar/Completar RecoverPassword**
   - Arquivo muito pequeno
   - Testar fluxo completo

2. **[ ] Popular Dados Iniciais nas Tabelas Analytics**
   - Criar função para popular `analytics_daily_metrics`
   - Configurar triggers automáticos
   - Backfill de dados históricos

### 🟡 Prioridade Média (Próximo Sprint)
3. **[ ] Sistema de Favoritos**
4. **[ ] Templates de Briefing**
5. **[ ] Modo Escuro (toggle)**

### 🟢 Prioridade Baixa (Backlog)
6. **[ ] Email Transacional**

---

## 📝 CHANGELOG

### [2025-11-28] - Fase 23: Gestão de Administradores
#### Adicionado
- Sistema completo de gestão de admins
- Roles: Super Admin, Financeiro, Suporte, Gestor
- Permissões granulares
- Logs de auditoria
- Scripts de criação de usuários admin

#### Status Atualizado
- Gestão de Admins: ❌ Básico → ✅ Completo

### [2025-11-28] - Fase 24: Sistema de Favoritos
#### Adicionado
- Tabela `creator_favorites` no Supabase
- Service `favoritesService.ts`
- Hook `useFavorites.ts` e `useFavoriteCheck`
- Componente `FavoriteButton.tsx`
- Página `Favorites.tsx` para creators
- Botão de favoritar nos cards de editor
- Nota pessoal em cada favorito
- Notificação para editor quando favoritado

#### Status Atualizado
- Sistema de Favoritos: ❌ Não existe → ✅ Completo

### [2025-11-28] - Fase 22: Badge de Mensagens no Header
#### Adicionado
- Componente `MessageBadge.tsx`
- Dropdown com preview de conversas
- Badge com contador de não lidas
- Navegação direta para chat
- Funções RPC para mensagens

#### Alterado
- `useUnreadMessages.ts` expandido com mais dados
- `DashboardLayout.tsx` com MessageBadge no header

#### Status Atualizado
- useUnreadMessages integrado: ❌ Não → ✅ Sim
- Badge de mensagens no header: ❌ Não → ✅ Sim

### [2025-11-27] - Fase 21: Financial com Dados Reais
#### Adicionado
- Tabela `transactions` no Supabase
- Tabela `financial_daily_summary`
- Service `adminFinancial.ts` com dados reais
- Página `/admin/financial` atualizada
- Seed de dados para testes financeiros
- Exportação de relatórios (CSV)

#### Alterado
- Dashboard financeiro agora consome dados reais
- Adicionado tratamento de erro para tabelas inexistentes

#### Status Atualizado
- Dashboard Financeiro: ❌ Mock → ✅ Real

### [2025-11-26] - Fase 20: Sistema de Notificações
#### Adicionado
- Tabela `notifications` no Supabase
- Tabela `notification_preferences`
- Service `notificationService.ts`
- Hook `useNotifications.ts` com real-time
- Componente `NotificationDropdown.tsx`
- Página `/notifications` para ver todas
- Triggers para notificações automáticas
- Badge de notificações no header

#### Alterado
- DashboardLayout.tsx com header e sino de notificações

#### Status Atualizado
- Sistema de Notificações: ❌ Não existe → ✅ Completo

### [2025-11-26] - Fase 19: Analytics Completo
#### Adicionado
- Tabelas de analytics no Supabase
- Aba "Qualidade" com métricas completas
- Exportação de relatórios em CSV
- Gráficos de tendência de qualidade
- Ranking de editores por qualidade

#### Alterado
- Analytics.tsx agora carrega métricas de qualidade
- adminAnalytics.ts com novas funções

#### Status Atualizado
- Analytics:  Parcial → ✅ Completo

### [2025-11-26] - Deploy e Analytics Implementados
#### Adicionado
- ✅ Sistema de Analytics completo (Fase 18)
  - Schema SQL com 5 tabelas
  - Services para queries analíticas
  - Dashboard com 6 abas (Overview, Growth, Projects, Editors, Financial, Quality)
  - Gráficos interativos com Recharts
- ✅ GitHub Pages deployment configurado
  - Workflow automático (`.github/workflows/deploy.yml`)
  - Base path configurado para `/Frame-up-antigravity/`
  - Documentação completa (DEPLOY.md)
- ✅ Página de gestão de usuários admin
  - Listagem com filtros
  - Estatísticas de usuários
  - Integração com permissões

#### Identificado
- 🟡 Financial com dados mock (Próximo passo)
- 🟡 Hook useUnreadMessages não integrado
- ❌ Sistema de notificações inexistente

### [2025-11-26] - Análise Inicial
#### Analisado
- Estrutura completa do projeto (40+ páginas)
- Todos os services e hooks
- Migrations do banco
- Design system

---

## 🔗 LINKS ÚTEIS

- **Repositório:** https://github.com/danielcazi/Frame-up-antigravity
- **Deploy:** https://danielcazi.github.io/Frame-up-antigravity
- **GitHub Actions:** Configurado para deploy automático
- **Lovable:** https://lovable.dev/projects/442ad423-a1a7-4328-b4ef-c464c44562b0
- **Supabase:** https://ojgmtkzvpbrulxfklkmr.supabase.co
- **Stripe:** [Configurar no projeto]

### Deploy
- ✅ GitHub Pages configurado
- ✅ Workflow automático (`.github/workflows/deploy.yml`)
- ⚠️ Secrets precisam ser configurados no GitHub
- ⚠️ GitHub Pages precisa ser habilitado nas configurações

---

## 📋 COMO USAR ESTE DOCUMENTO

### Para Continuar Desenvolvimento com IA:
1. Atualize este arquivo quando fizer mudanças significativas
2. No início de cada sessão, envie este arquivo
3. A IA terá contexto completo do projeto

### Para Atualizar:
```markdown
## 📝 CHANGELOG

### [DATA] - Descrição
#### Adicionado
- Item adicionado

#### Alterado
- Item alterado

#### Corrigido
- Bug corrigido
```

---

*Documento gerado em 26/11/2025 por análise completa do projeto*
