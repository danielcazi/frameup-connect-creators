// Editor Approval System Types
import { ApprovalStatus } from './database';


export interface EditorApprovalQueue {
    id: string;
    editor_id: string;
    status: ApprovalStatus;
    portfolio_quality_score: number | null;
    profile_completeness_score: number | null;
    reviewer_notes: string | null;
    rejection_reason: string | null;
    reviewed_by: string | null;
    reviewed_at: string | null;
    submitted_at: string;
    has_duplicate_portfolio: boolean;
    has_suspicious_links: boolean;
    auto_flags: AutoFlags;
    created_at: string;
    updated_at: string;
}

export interface AutoFlags {
    no_portfolio?: boolean;
    incomplete_bio?: boolean;
    no_specialties?: boolean;
    no_software_skills?: boolean;
    [key: string]: boolean | undefined;
}

export interface PendingEditor {
    id: string;
    editor_id: string;
    status: ApprovalStatus;
    portfolio_quality_score: number | null;
    profile_completeness_score: number | null;
    reviewer_notes: string | null;
    rejection_reason: string | null;
    reviewed_by: string | null;
    reviewed_at: string | null;
    submitted_at: string;
    auto_flags: AutoFlags;

    // Dados do usuário
    email: string;
    full_name: string;
    username: string;
    user_created_at: string;

    // Dados do perfil
    bio: string | null;
    city: string | null;
    state: string | null;
    specialties: string[] | null;
    software_skills: string[] | null;

    // Estatísticas
    portfolio_count: number;
    reviewer_role: string | null;
    hours_in_queue: number;
}

export interface ApprovalDecision {
    editor_id: string;
    admin_id: string;
    portfolio_score?: number;
    profile_score?: number;
    notes?: string;
    rejection_reason?: string;
}

export interface EditorApprovalStats {
    total_pending: number;
    total_approved_today: number;
    total_rejected_today: number;
    average_review_time_hours: number;
    oldest_pending_hours: number;
}

// Helper para verificar se editor tem flags críticas
export function hasCriticalFlags(flags: AutoFlags): boolean {
    return !!(flags.no_portfolio || flags.no_specialties);
}

// Helper para calcular score de completude
export function calculateCompletenessScore(editor: PendingEditor): number {
    let score = 0;

    // Bio completa (2 pontos)
    if (editor.bio && editor.bio.length >= 50) score += 2;
    else if (editor.bio && editor.bio.length >= 20) score += 1;

    // Especialidades (1 ponto)
    if (editor.specialties && editor.specialties.length > 0) score += 1;

    // Software skills (1 ponto)
    if (editor.software_skills && editor.software_skills.length > 0) score += 1;

    // Portfólio (1 ponto)
    if (editor.portfolio_count > 0) score += 1;

    return score; // 0-5
}

// Helper para obter mensagem de flag
export function getFlagMessage(flag: keyof AutoFlags): string {
    const messages: Record<string, string> = {
        no_portfolio: 'Nenhum vídeo de portfólio enviado',
        incomplete_bio: 'Bio incompleta (menos de 50 caracteres)',
        no_specialties: 'Nenhuma especialidade selecionada',
        no_software_skills: 'Nenhum software listado',
    };

    return messages[String(flag)] || 'Flag desconhecida';
}

// Helper para obter cor da flag
export function getFlagColor(flag: keyof AutoFlags): 'red' | 'yellow' | 'blue' {
    const criticalFlags = ['no_portfolio', 'no_specialties'];
    if (criticalFlags.includes(String(flag))) return 'red';
    return 'yellow';
}

