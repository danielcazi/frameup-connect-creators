// GUIA DE INTEGRAÇÃO RÁPIDA - Sistema Admin FRAMEUP

// ============================================
// PASSO 1: CONFIGURAR O PROVIDER
// ============================================

// Em src/App.tsx ou src/main.tsx
import { AdminProvider } from '@/hooks/useAdmin';

function App() {
  return (
    <AdminProvider>
      {/* Resto da aplicação */}
      <Router>
        <Routes>
          {/* suas rotas */}
        </Routes>
      </Router>
    </AdminProvider>
  );
}

// ============================================
// PASSO 2: CRIAR ROTAS ADMINISTRATIVAS
// ============================================

import { ProtectedAdminRoute } from '@/components/admin/ProtectedAdminRoute';
import AdminLogin from '@/pages/admin/Login';
import AdminDashboard from '@/pages/admin/Dashboard';

// Rotas públicas
<Route path="/admin/login" element={<AdminLogin />} />

// Rotas protegidas
<Route 
  path="/admin/dashboard" 
  element={
    <ProtectedAdminRoute>
      <AdminDashboard />
    </ProtectedAdminRoute>
  } 
/>

// Rota com permissões específicas
<Route 
  path="/admin/users" 
  element={
    <ProtectedAdminRoute requiredPermissions={['view_users']}>
      <UsersManagementPage />
    </ProtectedAdminRoute>
  } 
/>

// ============================================
// PASSO 3: USAR O HOOK EM COMPONENTES
// ============================================

import { useAdmin } from '@/hooks/useAdmin';

function MyAdminComponent() {
  const { admin, loading, hasPermission, isAdmin, logout } = useAdmin();

  // Mostrar loading
  if (loading) {
    return <div>Carregando...</div>;
  }

  // Verificar se está autenticado
  if (!isAdmin) {
    return <div>Acesso negado</div>;
  }

  // Usar dados do admin
  return (
    <div>
      <h1>Olá, {admin?.role}</h1>
      <p>Departamento: {admin?.department}</p>
      
      {/* Renderização condicional baseada em permissão */}
      {hasPermission('ban_users') && (
        <button>Banir Usuários</button>
      )}
      
      <button onClick={logout}>Sair</button>
    </div>
  );
}

// ============================================
// PASSO 4: USAR COMPONENTE RequirePermission
// ============================================

import { RequirePermission } from '@/components/admin/RequirePermission';

function Toolbar() {
  return (
    <div className="toolbar">
      {/* Botão visível apenas para quem pode banir */}
      <RequirePermission permission="ban_users">
        <button>Banir Usuário</button>
      </RequirePermission>

      {/* Botão visível para quem tem TODAS as permissões */}
      <RequirePermission 
        permissions={['view_financial_data', 'modify_pricing_table']} 
        requireAll
      >
        <button>Gerenciar Preços</button>
      </RequirePermission>

      {/* Botão visível para quem tem PELO MENOS UMA permissão */}
      <RequirePermission 
        permissions={['ban_users', 'unban_users']} 
        requireAll={false}
      >
        <button>Ações de Usuário</button>
      </RequirePermission>

      {/* Com fallback customizado */}
      <RequirePermission 
        permission="view_analytics"
        fallback={<span>Sem acesso</span>}
      >
        <button>Ver Analytics</button>
      </RequirePermission>
    </div>
  );
}

// ============================================
// PASSO 5: USAR O ADMIN SERVICE
// ============================================

import { adminService } from '@/services/adminService';
import { useAdmin } from '@/hooks/useAdmin';

function UserManagement() {
  const { admin } = useAdmin();
  const [users, setUsers] = useState([]);

  // Banir usuário
  const handleBanUser = async (userId: string) => {
    if (!admin) return;
    
    const success = await adminService.banUser(
      admin.id,
      userId,
      'Violação dos termos de uso'
    );
    
    if (success) {
      toast.success('Usuário banido com sucesso!');
      // Atualizar lista
    }
  };

  // Desbanir usuário
  const handleUnbanUser = async (userId: string) => {
    if (!admin) return;
    
    const success = await adminService.unbanUser(admin.id, userId);
    
    if (success) {
      toast.success('Usuário desbanido!');
    }
  };

  // Aprovar editor
  const handleApproveEditor = async (editorId: string) => {
    if (!admin) return;
    
    const success = await adminService.approveEditor(
      admin.id,
      editorId,
      'Portfólio aprovado'
    );
    
    if (success) {
      toast.success('Editor aprovado!');
    }
  };

  return (
    <div>
      {/* UI de gerenciamento */}
    </div>
  );
}

// ============================================
// PASSO 6: BUSCAR DADOS ADMINISTRATIVOS
// ============================================

import { adminService } from '@/services/adminService';

function AdminDashboard() {
  const { admin } = useAdmin();
  const [pendingEditors, setPendingEditors] = useState([]);
  const [adminLogs, setAdminLogs] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!admin) return;

    // Buscar editores pendentes
    const editors = await adminService.getPendingEditors();
    setPendingEditors(editors);

    // Buscar logs do admin atual
    const logs = await adminService.getAdminLogs(admin.id, 50);
    setAdminLogs(logs);
  };

  return (
    <div>
      <h2>Editores Pendentes: {pendingEditors.length}</h2>
      <h2>Minhas Ações: {adminLogs.length}</h2>
    </div>
  );
}

// ============================================
// PASSO 7: CRIAR NOVO ADMIN (SUPER ADMIN ONLY)
// ============================================

import { adminService } from '@/services/adminService';
import { useAdmin } from '@/hooks/useAdmin';

function CreateAdminForm() {
  const { admin } = useAdmin();
  const [formData, setFormData] = useState({
    userId: '',
    role: 'support' as AdminRole,
    department: '',
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admin) return;

    const newAdmin = await adminService.createAdmin(
      admin.id,
      formData.userId,
      formData.role,
      formData.department,
      formData.notes
    );

    if (newAdmin) {
      toast.success('Admin criado com sucesso!');
      // Reset form
    }
  };

  return (
    <RequirePermission permission="manage_admin_users">
      <form onSubmit={handleSubmit}>
        {/* Campos do formulário */}
      </form>
    </RequirePermission>
  );
}

// ============================================
// PASSO 8: VERIFICAR PERMISSÕES PROGRAMATICAMENTE
// ============================================

import { checkIsAdmin, hasAdminPermission } from '@/lib/adminAuth';

// Em um middleware ou função assíncrona
async function checkUserPermissions(userId: string) {
  // Verificar se é admin
  const admin = await checkIsAdmin(userId);
  if (!admin) {
    throw new Error('Usuário não é admin');
  }

  // Verificar permissão específica
  const canBan = await hasAdminPermission(userId, 'ban_users');
  if (!canBan) {
    throw new Error('Sem permissão para banir usuários');
  }

  // Continuar com a operação
}

// ============================================
// PASSO 9: LOGGING MANUAL DE AÇÕES
// ============================================

import { logAdminAction } from '@/lib/adminAuth';

async function customAdminAction(adminId: string) {
  // Realizar alguma ação customizada
  // ...

  // Registrar no log
  await logAdminAction(
    adminId,
    'custom_action',
    'project',
    projectId,
    {
      oldPrice: 100,
      newPrice: 150,
      reason: 'Ajuste de mercado'
    },
    'Preço do projeto ajustado'
  );
}

// ============================================
// PASSO 10: EXEMPLO COMPLETO - PÁGINA DE USUÁRIOS
// ============================================

import { useAdmin } from '@/hooks/useAdmin';
import { RequirePermission } from '@/components/admin/RequirePermission';
import { adminService } from '@/services/adminService';

function UsersPage() {
  const { admin, hasPermission } = useAdmin();
  const [users, setUsers] = useState([]);

  const handleBan = async (userId: string) => {
    if (!admin || !hasPermission('ban_users')) return;
    
    const reason = prompt('Motivo do banimento:');
    if (!reason) return;

    const success = await adminService.banUser(admin.id, userId, reason);
    if (success) {
      toast.success('Usuário banido!');
      loadUsers(); // Recarregar lista
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Gerenciamento de Usuários</h1>
      
      <div className="space-y-4">
        {users.map(user => (
          <div key={user.id} className="flex items-center justify-between p-4 border rounded">
            <div>
              <h3>{user.full_name}</h3>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
            
            <div className="flex gap-2">
              <RequirePermission permission="ban_users">
                <button 
                  onClick={() => handleBan(user.id)}
                  className="px-4 py-2 bg-red-500 text-white rounded"
                >
                  Banir
                </button>
              </RequirePermission>
              
              <RequirePermission permission="view_users">
                <button className="px-4 py-2 bg-blue-500 text-white rounded">
                  Ver Detalhes
                </button>
              </RequirePermission>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// CHECKLIST DE INTEGRAÇÃO
// ============================================

/*
✅ 1. Adicionar AdminProvider no App.tsx
✅ 2. Criar rota /admin/login
✅ 3. Proteger rotas admin com ProtectedAdminRoute
✅ 4. Usar useAdmin() nos componentes
✅ 5. Usar RequirePermission para UI condicional
✅ 6. Usar adminService para operações
✅ 7. Testar fluxo de login
✅ 8. Testar verificação de permissões
✅ 9. Verificar logs sendo criados
✅ 10. Criar primeiro super admin no banco
*/
