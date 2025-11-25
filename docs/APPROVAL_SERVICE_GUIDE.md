// GUIA RÁPIDO: Serviço de Aprovação de Editores

import { 
  getApprovalQueue,
  getEditorApprovalDetails,
  approveEditor,
  rejectEditor,
  runAutoChecks,
  getApprovalStats
} from '@/services/adminApprovals';

// ============================================
// 1. LISTAR EDITORES PENDENTES
// ============================================

// Buscar apenas pendentes
const pendingEditors = await getApprovalQueue('pending');

// Buscar todos
const allEditors = await getApprovalQueue('all');

// Buscar aprovados
const approvedEditors = await getApprovalQueue('approved');

// Buscar rejeitados
const rejectedEditors = await getApprovalQueue('rejected');

// ============================================
// 2. VER DETALHES DE UM EDITOR
// ============================================

const details = await getEditorApprovalDetails(editorId);

if (details) {
  // Dados do editor
  console.log(details.editor.name);
  console.log(details.editor.email);
  console.log(details.editor.bio);
  console.log(details.editor.city);
  console.log(details.editor.state);
  console.log(details.editor.specialties);
  console.log(details.editor.software_skills);
  
  // Portfólio
  console.log(`${details.portfolio.length} vídeos`);
  details.portfolio.forEach(video => {
    console.log(video.video_url);
    console.log(video.video_type);
  });
  
  // Dados da fila
  console.log(details.status);
  console.log(details.submitted_at);
  console.log(details.auto_flags);
}

// ============================================
// 3. APROVAR EDITOR
// ============================================

try {
  await approveEditor(
    editorId,
    adminId,
    4, // portfolio score (1-5)
    5, // profile score (1-5)
    'Portfólio excelente! Bem-vindo ao FRAMEUP.'
  );
  
  console.log('✅ Editor aprovado!');
} catch (error) {
  console.error('❌ Erro ao aprovar:', error);
}

// ============================================
// 4. REJEITAR EDITOR
// ============================================

try {
  await rejectEditor(
    editorId,
    adminId,
    'Portfólio não atende aos requisitos mínimos. Por favor, adicione mais exemplos de trabalho.',
    2, // portfolio score (1-5)
    3  // profile score (1-5)
  );
  
  console.log('✅ Editor rejeitado');
} catch (error) {
  console.error('❌ Erro ao rejeitar:', error);
}

// ============================================
// 5. EXECUTAR VERIFICAÇÕES AUTOMÁTICAS
// ============================================

const checks = await runAutoChecks(editorId);

if (checks) {
  // Verificar links válidos
  if (!checks.portfolio_valid) {
    console.warn('⚠️ Links de portfólio inválidos');
  }
  
  // Verificar duplicatas
  if (checks.has_duplicates) {
    console.warn('⚠️ Portfólio duplicado detectado');
  }
  
  // Verificar completude (0-100)
  if (checks.profile_complete < 60) {
    console.warn(`⚠️ Perfil incompleto: ${checks.profile_complete}%`);
  } else {
    console.log(`✅ Perfil completo: ${checks.profile_complete}%`);
  }
}

// ============================================
// 6. BUSCAR ESTATÍSTICAS
// ============================================

const stats = await getApprovalStats();

console.log(`Pendentes: ${stats.total_pending}`);
console.log(`Aprovados hoje: ${stats.total_approved_today}`);
console.log(`Rejeitados hoje: ${stats.total_rejected_today}`);

// ============================================
// 7. EXEMPLO COMPLETO - COMPONENTE REACT
// ============================================

import { useState, useEffect } from 'react';
import { useAdmin } from '@/hooks/useAdmin';

function ApprovalsPage() {
  const { admin } = useAdmin();
  const [editors, setEditors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  
  useEffect(() => {
    loadData();
  }, []);
  
  async function loadData() {
    try {
      // Carregar editores pendentes
      const pending = await getApprovalQueue('pending');
      setEditors(pending);
      
      // Carregar estatísticas
      const statistics = await getApprovalStats();
      setStats(statistics);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  }
  
  async function handleApprove(editorId: string) {
    if (!admin) return;
    
    try {
      await approveEditor(
        editorId,
        admin.id,
        4,
        5,
        'Aprovado!'
      );
      
      // Recarregar lista
      await loadData();
      alert('Editor aprovado com sucesso!');
    } catch (error) {
      alert('Erro ao aprovar editor');
    }
  }
  
  async function handleReject(editorId: string) {
    if (!admin) return;
    
    const reason = prompt('Motivo da rejeição:');
    if (!reason) return;
    
    try {
      await rejectEditor(
        editorId,
        admin.id,
        reason,
        2,
        3
      );
      
      // Recarregar lista
      await loadData();
      alert('Editor rejeitado');
    } catch (error) {
      alert('Erro ao rejeitar editor');
    }
  }
  
  if (loading) return <div>Carregando...</div>;
  
  return (
    <div>
      <h1>Aprovações de Editores</h1>
      
      {/* Estatísticas */}
      {stats && (
        <div className="stats">
          <div>Pendentes: {stats.total_pending}</div>
          <div>Aprovados hoje: {stats.total_approved_today}</div>
          <div>Rejeitados hoje: {stats.total_rejected_today}</div>
        </div>
      )}
      
      {/* Lista de editores */}
      <div className="editors-list">
        {editors.map(editor => (
          <div key={editor.id} className="editor-card">
            <h3>{editor.editor.email}</h3>
            <p>Submetido em: {new Date(editor.submitted_at).toLocaleDateString()}</p>
            
            <div className="actions">
              <button onClick={() => handleApprove(editor.editor_id)}>
                Aprovar
              </button>
              <button onClick={() => handleReject(editor.editor_id)}>
                Rejeitar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// 8. EXEMPLO - MODAL DE DETALHES
// ============================================

function EditorDetailsModal({ editorId, onClose }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadDetails();
  }, [editorId]);
  
  async function loadDetails() {
    try {
      const data = await getEditorApprovalDetails(editorId);
      setDetails(data);
      
      // Executar verificações automáticas
      await runAutoChecks(editorId);
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  }
  
  if (loading) return <div>Carregando...</div>;
  if (!details) return <div>Editor não encontrado</div>;
  
  return (
    <div className="modal">
      <h2>{details.editor.name}</h2>
      <p>{details.editor.email}</p>
      
      <div className="section">
        <h3>Bio</h3>
        <p>{details.editor.bio}</p>
      </div>
      
      <div className="section">
        <h3>Localização</h3>
        <p>{details.editor.city}, {details.editor.state}</p>
      </div>
      
      <div className="section">
        <h3>Especialidades</h3>
        <ul>
          {details.editor.specialties.map(s => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </div>
      
      <div className="section">
        <h3>Softwares</h3>
        <ul>
          {details.editor.software_skills.map(s => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </div>
      
      <div className="section">
        <h3>Portfólio ({details.portfolio.length} vídeos)</h3>
        {details.portfolio.map(video => (
          <div key={video.id}>
            <a href={video.video_url} target="_blank">
              {video.title || 'Vídeo ' + video.order_position}
            </a>
          </div>
        ))}
      </div>
      
      <div className="section">
        <h3>Flags Automáticas</h3>
        <pre>{JSON.stringify(details.auto_flags, null, 2)}</pre>
      </div>
      
      <button onClick={onClose}>Fechar</button>
    </div>
  );
}

// ============================================
// 9. SCORES DE QUALIDADE
// ============================================

// Portfolio Quality Score (1-5)
const PORTFOLIO_SCORES = {
  1: 'Ruim - Portfólio inadequado',
  2: 'Regular - Qualidade questionável',
  3: 'Bom - Aceitável',
  4: 'Muito Bom - Boa qualidade',
  5: 'Excelente - Profissional',
};

// Profile Completeness Score (1-5)
const PROFILE_SCORES = {
  1: 'Muito incompleto',
  2: 'Incompleto',
  3: 'Parcialmente completo',
  4: 'Quase completo',
  5: 'Completo',
};

// ============================================
// 10. CHECKLIST DE APROVAÇÃO
// ============================================

async function shouldApprove(editorId: string): Promise<boolean> {
  const details = await getEditorApprovalDetails(editorId);
  if (!details) return false;
  
  const checks = await runAutoChecks(editorId);
  if (!checks) return false;
  
  // Critérios mínimos
  const hasPortfolio = details.portfolio.length >= 2;
  const hasBio = details.editor.bio.length >= 50;
  const hasSpecialties = details.editor.specialties.length > 0;
  const validLinks = checks.portfolio_valid;
  const noDuplicates = !checks.has_duplicates;
  const profileComplete = checks.profile_complete >= 60;
  
  return (
    hasPortfolio &&
    hasBio &&
    hasSpecialties &&
    validLinks &&
    noDuplicates &&
    profileComplete
  );
}

// Uso
const canApprove = await shouldApprove(editorId);
if (canApprove) {
  console.log('✅ Editor atende aos critérios mínimos');
} else {
  console.log('❌ Editor não atende aos critérios');
}
