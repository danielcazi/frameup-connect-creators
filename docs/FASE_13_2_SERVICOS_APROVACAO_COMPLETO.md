# FRAMEUP - FASE 13.2: TIPOS E SERVIÇOS TYPESCRIPT ✅

## ✅ Tarefas Concluídas

### 1. Tipos TypeScript Adicionados
**Arquivo:** `src/types/admin.ts` (atualizado)

#### Interfaces Criadas:

**EditorApprovalQueue**
```typescript
{
  id: string;
  editor_id: string;
  status: 'pending' | 'approved' | 'rejected';
  portfolio_quality_score: number | null;
  profile_completeness_score: number | null;
  reviewer_notes: string | null;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  submitted_at: string;
  has_duplicate_portfolio: boolean;
  has_suspicious_links: boolean;
  auto_flags: Record<string, any>;
  created_at: string;
  updated_at: string;
}
```

**EditorApprovalDetails** (extends EditorApprovalQueue)
```typescript
{
  ...EditorApprovalQueue,
  editor: {
    id, name, email, bio,
    city, state,
    software_skills[], specialties[]
  },
  portfolio: [{
    id, video_url, video_type,
    title, order_position
  }]
}
```

---

### 2. Serviço de Aprovação
**Arquivo:** `src/services/adminApprovals.ts`

#### Funções Principais:

##### **1. getApprovalQueue()**
```typescript
getApprovalQueue(status?: 'pending' | 'approved' | 'rejected' | 'all')
```
- ✅ Busca fila de aprovação filtrada por status
- ✅ Inclui dados básicos do editor (email, nome)
- ✅ Ordenado por data de submissão (FIFO)
- ✅ Retorna array de EditorApprovalQueue

**Uso:**
```typescript
const pending = await getApprovalQueue('pending');
const all = await getApprovalQueue('all');
```

##### **2. getEditorApprovalDetails()**
```typescript
getEditorApprovalDetails(editorId: string)
```
- ✅ Busca dados completos de um editor
- ✅ Combina dados de 4 tabelas:
  - editor_approval_queue
  - users
  - editor_profiles
  - portfolio_videos
- ✅ Retorna EditorApprovalDetails | null

**Uso:**
```typescript
const details = await getEditorApprovalDetails(editorId);
if (details) {
  console.log(details.editor.name);
  console.log(details.portfolio.length);
}
```

##### **3. approveEditor()**
```typescript
approveEditor(
  editorId: string,
  adminId: string,
  portfolioScore: number,
  profileScore: number,
  notes: string
)
```
- ✅ Chama função PostgreSQL `approve_editor()`
- ✅ Atualiza status para 'approved'
- ✅ Salva scores e notas
- ✅ Cria log de auditoria automático
- ✅ TODO: Enviar email de boas-vindas

**Uso:**
```typescript
await approveEditor(
  editorId,
  adminId,
  4, // portfolio score
  5, // profile score
  'Excelente portfólio!'
);
```

##### **4. rejectEditor()**
```typescript
rejectEditor(
  editorId: string,
  adminId: string,
  rejectionReason: string,
  portfolioScore: number,
  profileScore: number
)
```
- ✅ Chama função PostgreSQL `reject_editor()`
- ✅ Atualiza status para 'rejected'
- ✅ Salva motivo da rejeição
- ✅ Cria log de auditoria automático
- ✅ TODO: Enviar email de feedback

**Uso:**
```typescript
await rejectEditor(
  editorId,
  adminId,
  'Portfólio não atende aos requisitos mínimos',
  2, // portfolio score
  3  // profile score
);
```

##### **5. runAutoChecks()**
```typescript
runAutoChecks(editorId: string)
```
- ✅ Executa 3 verificações automáticas:
  - `verifyPortfolioLinks()` - Links válidos?
  - `checkDuplicatePortfolio()` - Portfólio duplicado?
  - `calculateProfileCompleteness()` - Score de completude
- ✅ Salva flags na tabela
- ✅ Retorna objeto com resultados

**Uso:**
```typescript
const checks = await runAutoChecks(editorId);
console.log(checks.portfolio_valid);
console.log(checks.has_duplicates);
console.log(checks.profile_complete); // 0-100
```

##### **6. getApprovalStats()**
```typescript
getApprovalStats()
```
- ✅ Retorna estatísticas de aprovação:
  - total_pending
  - total_approved_today
  - total_rejected_today
- ✅ Útil para dashboard

**Uso:**
```typescript
const stats = await getApprovalStats();
console.log(`Pendentes: ${stats.total_pending}`);
```

---

#### Funções Helper (Privadas):

##### **verifyPortfolioLinks()**
- ✅ Verifica se URLs são de plataformas válidas
- ✅ Plataformas aceitas:
  - youtube.com
  - youtu.be
  - vimeo.com
  - drive.google.com
- ✅ Não faz requests externos (apenas validação de string)

##### **checkDuplicatePortfolio()**
- ✅ Busca vídeos com mesmas URLs
- ✅ Compara com outros editores
- ✅ Retorna true se encontrar duplicatas

##### **calculateProfileCompleteness()**
- ✅ Calcula score de 0-100:
  - Bio > 50 chars: +20
  - Cidade + Estado: +20
  - Software skills: +20
  - Especialidades: +20
  - 3 vídeos de portfólio: +20
- ✅ Retorna número de 0 a 100

---

## 📊 Arquitetura do Serviço

### Fluxo de Dados:

```
Component/Page
    ↓
adminApprovals.ts (service)
    ↓
Supabase Client
    ↓
PostgreSQL Functions/Tables
    ↓
Retorna dados tipados
```

### Integração com Banco:

```typescript
// Queries diretas
getApprovalQueue() → SELECT from editor_approval_queue
getEditorApprovalDetails() → SELECT from 4 tabelas

// Funções PostgreSQL (RPC)
approveEditor() → CALL approve_editor()
rejectEditor() → CALL reject_editor()

// Updates diretos
runAutoChecks() → UPDATE editor_approval_queue
```

---

## 🎯 Exemplos de Uso Completos

### 1. Listar Editores Pendentes
```typescript
import { getApprovalQueue } from '@/services/adminApprovals';

function ApprovalsList() {
  const [editors, setEditors] = useState([]);
  
  useEffect(() => {
    async function load() {
      const data = await getApprovalQueue('pending');
      setEditors(data);
    }
    load();
  }, []);
  
  return (
    <div>
      {editors.map(editor => (
        <div key={editor.id}>
          {editor.editor.email} - {editor.status}
        </div>
      ))}
    </div>
  );
}
```

### 2. Ver Detalhes de um Editor
```typescript
import { getEditorApprovalDetails } from '@/services/adminApprovals';

async function viewEditor(editorId: string) {
  const details = await getEditorApprovalDetails(editorId);
  
  if (!details) {
    console.error('Editor não encontrado');
    return;
  }
  
  console.log('Nome:', details.editor.name);
  console.log('Bio:', details.editor.bio);
  console.log('Especialidades:', details.editor.specialties);
  console.log('Portfólio:', details.portfolio.length, 'vídeos');
  console.log('Flags:', details.auto_flags);
}
```

### 3. Aprovar Editor
```typescript
import { approveEditor } from '@/services/adminApprovals';
import { useAdmin } from '@/hooks/useAdmin';

function ApproveButton({ editorId }: { editorId: string }) {
  const { admin } = useAdmin();
  
  const handleApprove = async () => {
    if (!admin) return;
    
    try {
      await approveEditor(
        editorId,
        admin.id,
        4, // portfolio score
        5, // profile score
        'Aprovado! Bem-vindo ao FRAMEUP.'
      );
      
      toast.success('Editor aprovado com sucesso!');
    } catch (error) {
      toast.error('Erro ao aprovar editor');
    }
  };
  
  return <button onClick={handleApprove}>Aprovar</button>;
}
```

### 4. Rejeitar Editor
```typescript
import { rejectEditor } from '@/services/adminApprovals';

async function handleReject(editorId: string, adminId: string) {
  const reason = prompt('Motivo da rejeição:');
  if (!reason) return;
  
  try {
    await rejectEditor(
      editorId,
      adminId,
      reason,
      2, // portfolio score
      3  // profile score
    );
    
    alert('Editor rejeitado');
  } catch (error) {
    alert('Erro ao rejeitar');
  }
}
```

### 5. Executar Verificações
```typescript
import { runAutoChecks } from '@/services/adminApprovals';

async function checkEditor(editorId: string) {
  const checks = await runAutoChecks(editorId);
  
  if (!checks) {
    console.error('Erro nas verificações');
    return;
  }
  
  if (!checks.portfolio_valid) {
    alert('⚠️ Links de portfólio inválidos!');
  }
  
  if (checks.has_duplicates) {
    alert('⚠️ Portfólio duplicado detectado!');
  }
  
  if (checks.profile_complete < 60) {
    alert('⚠️ Perfil incompleto (score: ' + checks.profile_complete + ')');
  }
}
```

### 6. Dashboard de Aprovações
```typescript
import { getApprovalStats } from '@/services/adminApprovals';

function ApprovalsDashboard() {
  const [stats, setStats] = useState({
    total_pending: 0,
    total_approved_today: 0,
    total_rejected_today: 0,
  });
  
  useEffect(() => {
    async function load() {
      const data = await getApprovalStats();
      setStats(data);
    }
    load();
  }, []);
  
  return (
    <div>
      <h2>Estatísticas de Aprovação</h2>
      <p>Pendentes: {stats.total_pending}</p>
      <p>Aprovados hoje: {stats.total_approved_today}</p>
      <p>Rejeitados hoje: {stats.total_rejected_today}</p>
    </div>
  );
}
```

---

## ✅ Validações

- ✅ Tipos TypeScript criados e exportados
- ✅ Serviço completo com 6 funções principais
- ✅ 3 funções helper privadas
- ✅ Integração com Supabase
- ✅ Chamadas RPC para funções PostgreSQL
- ✅ Error handling em todas as funções
- ✅ Build TypeScript sem erros
- ✅ Documentação com exemplos

---

## 📝 Próximos Passos

### Task 13.3 - Página de Aprovações
Criar `src/pages/admin/Approvals.tsx`:
- ✅ Lista de editores pendentes
- ✅ Cards com preview
- ✅ Filtros (pending/approved/rejected)
- ✅ Busca por nome/email
- ✅ Botão para ver detalhes

### Task 13.4 - Modal de Revisão
Criar componente `EditorReviewModal`:
- ✅ Visualização de portfólio (vídeos)
- ✅ Dados completos do perfil
- ✅ Flags automáticas destacadas
- ✅ Sliders para scores (1-5)
- ✅ Campo de notas
- ✅ Botões de aprovar/rejeitar

---

**Status:** ✅ **TASK 13.2 CONCLUÍDA**  
**Arquivos Criados:** 1 (adminApprovals.ts)  
**Arquivos Atualizados:** 1 (admin.ts)  
**Linhas de Código:** ~300+  
**Funções:** 9 (6 públicas + 3 privadas)  
**Build:** ✅ Sem erros  
**Próxima Task:** 13.3 - Página de Aprovações

🎉 **Serviço de aprovação de editores totalmente implementado!**
