-- Migration: Analytics Schema
-- Description: Creates tables and functions for the admin analytics module
-- Date: 2025-11-26

-- 1. Tabela de Métricas Diárias
CREATE TABLE IF NOT EXISTS analytics_daily_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_date DATE UNIQUE NOT NULL,
    new_creators INTEGER DEFAULT 0,
    new_editors INTEGER DEFAULT 0,
    total_signups INTEGER DEFAULT 0,
    new_projects INTEGER DEFAULT 0,
    completed_projects INTEGER DEFAULT 0,
    total_revenue NUMERIC(10, 2) DEFAULT 0,
    platform_fees NUMERIC(10, 2) DEFAULT 0,
    active_subscriptions INTEGER DEFAULT 0,
    new_disputes INTEGER DEFAULT 0,
    resolved_disputes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de Métricas de Qualidade
CREATE TABLE IF NOT EXISTS analytics_quality_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_date DATE NOT NULL,
    period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly')),
    avg_rating NUMERIC(3, 2) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    nps_score NUMERIC(5, 2) DEFAULT 0,
    nps_promoters INTEGER DEFAULT 0,
    nps_detractors INTEGER DEFAULT 0,
    nps_passives INTEGER DEFAULT 0,
    projects_on_time INTEGER DEFAULT 0,
    projects_late INTEGER DEFAULT 0,
    on_time_rate NUMERIC(5, 2) DEFAULT 0,
    avg_revisions NUMERIC(5, 2) DEFAULT 0,
    first_delivery_approval_rate NUMERIC(5, 2) DEFAULT 0,
    avg_response_time_hours NUMERIC(10, 2) DEFAULT 0,
    repeat_hire_rate NUMERIC(5, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(metric_date, period_type)
);

-- 3. Tabela de Funil de Projetos
CREATE TABLE IF NOT EXISTS analytics_project_funnel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    first_application_at TIMESTAMP WITH TIME ZONE,
    assigned_at TIMESTAMP WITH TIME ZONE,
    first_delivery_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    time_to_first_application INTERVAL,
    time_to_assignment INTERVAL,
    time_to_first_delivery INTERVAL,
    time_to_approval INTERVAL,
    total_time_to_completion INTERVAL,
    total_revisions INTEGER DEFAULT 0,
    UNIQUE(project_id)
);

-- 4. Tabela de Ranking de Editores
CREATE TABLE IF NOT EXISTS analytics_editor_rankings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    editor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_projects_completed INTEGER DEFAULT 0,
    avg_rating NUMERIC(3, 2) DEFAULT 0,
    total_revenue_generated NUMERIC(10, 2) DEFAULT 0,
    on_time_delivery_rate NUMERIC(5, 2) DEFAULT 0,
    avg_revisions NUMERIC(5, 2) DEFAULT 0,
    repeat_clients INTEGER DEFAULT 0,
    overall_rank INTEGER,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(editor_id, period_start, period_end)
);

-- 5. Função para atualizar métricas diárias
DROP FUNCTION IF EXISTS update_daily_metrics(DATE);
CREATE OR REPLACE FUNCTION update_daily_metrics(target_date DATE)
RETURNS VOID AS $$
DECLARE
    v_new_creators INTEGER;
    v_new_editors INTEGER;
    v_new_projects INTEGER;
    v_completed_projects INTEGER;
    v_total_revenue NUMERIC;
    v_platform_fees NUMERIC;
    v_active_subscriptions INTEGER;
    v_new_disputes INTEGER;
    v_resolved_disputes INTEGER;
BEGIN
    -- Contar novos usuários
    SELECT COUNT(*) INTO v_new_creators
    FROM profiles
    WHERE user_type = 'creator' AND DATE(created_at) = target_date;

    SELECT COUNT(*) INTO v_new_editors
    FROM profiles
    WHERE user_type = 'editor' AND DATE(created_at) = target_date;

    -- Contar projetos
    SELECT COUNT(*) INTO v_new_projects
    FROM projects
    WHERE DATE(created_at) = target_date;

    SELECT COUNT(*) INTO v_completed_projects
    FROM projects
    WHERE status = 'completed' AND DATE(updated_at) = target_date;

    -- Calcular receita (baseado em projetos pagos)
    SELECT COALESCE(SUM(total_paid_by_creator), 0), COALESCE(SUM(platform_fee), 0)
    INTO v_total_revenue, v_platform_fees
    FROM projects
    WHERE payment_status = 'paid' AND DATE(updated_at) = target_date;

    -- Contar assinaturas ativas (snapshot do dia)
    SELECT COUNT(*) INTO v_active_subscriptions
    FROM editor_subscriptions
    WHERE status = 'active';

    -- Contar disputas (assumindo tabela disputes existe)
    BEGIN
        SELECT COUNT(*) INTO v_new_disputes
        FROM disputes
        WHERE DATE(created_at) = target_date;

        SELECT COUNT(*) INTO v_resolved_disputes
        FROM disputes
        WHERE status = 'resolved' AND DATE(updated_at) = target_date;
    EXCEPTION WHEN undefined_table THEN
        v_new_disputes := 0;
        v_resolved_disputes := 0;
    END;

    -- Inserir ou atualizar
    INSERT INTO analytics_daily_metrics (
        metric_date,
        new_creators,
        new_editors,
        total_signups,
        new_projects,
        completed_projects,
        total_revenue,
        platform_fees,
        active_subscriptions,
        new_disputes,
        resolved_disputes,
        updated_at
    ) VALUES (
        target_date,
        v_new_creators,
        v_new_editors,
        v_new_creators + v_new_editors,
        v_new_projects,
        v_completed_projects,
        v_total_revenue,
        v_platform_fees,
        v_active_subscriptions,
        v_new_disputes,
        v_resolved_disputes,
        NOW()
    )
    ON CONFLICT (metric_date) DO UPDATE SET
        new_creators = EXCLUDED.new_creators,
        new_editors = EXCLUDED.new_editors,
        total_signups = EXCLUDED.total_signups,
        new_projects = EXCLUDED.new_projects,
        completed_projects = EXCLUDED.completed_projects,
        total_revenue = EXCLUDED.total_revenue,
        platform_fees = EXCLUDED.platform_fees,
        active_subscriptions = EXCLUDED.active_subscriptions,
        new_disputes = EXCLUDED.new_disputes,
        resolved_disputes = EXCLUDED.resolved_disputes,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Função para atualizar métricas de qualidade
DROP FUNCTION IF EXISTS update_quality_metrics(DATE, TEXT);
CREATE OR REPLACE FUNCTION update_quality_metrics(target_date DATE, p_period_type TEXT)
RETURNS VOID AS $$
DECLARE
    v_avg_rating NUMERIC;
    v_total_reviews INTEGER;
    v_promoters INTEGER;
    v_detractors INTEGER;
    v_passives INTEGER;
    v_nps NUMERIC;
    v_projects_on_time INTEGER;
    v_projects_late INTEGER;
    v_on_time_rate NUMERIC;
    v_start_date DATE;
BEGIN
    -- Definir período
    IF p_period_type = 'daily' THEN
        v_start_date := target_date;
    ELSIF p_period_type = 'weekly' THEN
        v_start_date := target_date - INTERVAL '1 week';
    ELSIF p_period_type = 'monthly' THEN
        v_start_date := target_date - INTERVAL '1 month';
    ELSE
        RAISE EXCEPTION 'Invalid period type';
    END IF;

    -- Calcular NPS e Ratings (assumindo tabela reviews)
    BEGIN
        SELECT 
            COALESCE(AVG(rating), 0),
            COUNT(*),
            COUNT(*) FILTER (WHERE rating >= 9),
            COUNT(*) FILTER (WHERE rating <= 6),
            COUNT(*) FILTER (WHERE rating >= 7 AND rating <= 8)
        INTO v_avg_rating, v_total_reviews, v_promoters, v_detractors, v_passives
        FROM reviews
        WHERE DATE(created_at) >= v_start_date AND DATE(created_at) <= target_date;

        IF v_total_reviews > 0 THEN
            v_nps := ((v_promoters::NUMERIC - v_detractors::NUMERIC) / v_total_reviews::NUMERIC) * 100;
        ELSE
            v_nps := 0;
        END IF;
    EXCEPTION WHEN undefined_table THEN
        v_avg_rating := 0;
        v_total_reviews := 0;
        v_nps := 0;
        v_promoters := 0;
        v_detractors := 0;
        v_passives := 0;
    END;

    -- Calcular entregas no prazo (mock logic se colunas não existirem)
    v_projects_on_time := 0;
    v_projects_late := 0;
    v_on_time_rate := 0;

    -- Inserir ou atualizar
    INSERT INTO analytics_quality_metrics (
        metric_date,
        period_type,
        avg_rating,
        total_reviews,
        nps_score,
        nps_promoters,
        nps_detractors,
        nps_passives,
        projects_on_time,
        projects_late,
        on_time_rate,
        created_at
    ) VALUES (
        target_date,
        p_period_type,
        v_avg_rating,
        v_total_reviews,
        v_nps,
        v_promoters,
        v_detractors,
        v_passives,
        v_projects_on_time,
        v_projects_late,
        v_on_time_rate,
        NOW()
    )
    ON CONFLICT (metric_date, period_type) DO UPDATE SET
        avg_rating = EXCLUDED.avg_rating,
        total_reviews = EXCLUDED.total_reviews,
        nps_score = EXCLUDED.nps_score,
        nps_promoters = EXCLUDED.nps_promoters,
        nps_detractors = EXCLUDED.nps_detractors,
        nps_passives = EXCLUDED.nps_passives,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Função e Trigger para Funil de Projetos
DROP TRIGGER IF EXISTS on_project_update_funnel ON projects;
DROP FUNCTION IF EXISTS update_project_funnel();

CREATE OR REPLACE FUNCTION update_project_funnel()
RETURNS TRIGGER AS $$
BEGIN
    -- Se inserindo novo projeto
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO analytics_project_funnel (project_id, created_at)
        VALUES (NEW.id, NEW.created_at);
        RETURN NEW;
    END IF;

    -- Se atualizando
    IF (TG_OP = 'UPDATE') THEN
        UPDATE analytics_project_funnel
        SET 
            assigned_at = CASE 
                WHEN NEW.status = 'in_progress' AND OLD.status != 'in_progress' THEN NOW() 
                ELSE assigned_at 
            END,
            first_delivery_at = CASE 
                WHEN NEW.status = 'in_review' AND OLD.status != 'in_review' AND first_delivery_at IS NULL THEN NOW() 
                ELSE first_delivery_at 
            END,
            completed_at = CASE 
                WHEN NEW.status = 'completed' AND OLD.status != 'completed' THEN NOW() 
                ELSE completed_at 
            END,
            total_revisions = NEW.current_revisions
        WHERE project_id = NEW.id;
        
        UPDATE analytics_project_funnel
        SET
            time_to_assignment = assigned_at - created_at,
            time_to_first_delivery = first_delivery_at - assigned_at,
            total_time_to_completion = completed_at - created_at
        WHERE project_id = NEW.id;
        
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
CREATE TRIGGER on_project_update_funnel
    AFTER INSERT OR UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_project_funnel();

-- 9. RLS Policies
ALTER TABLE analytics_daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_quality_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_project_funnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_editor_rankings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view daily metrics" ON analytics_daily_metrics;
CREATE POLICY "Admins can view daily metrics" ON analytics_daily_metrics
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admins can view quality metrics" ON analytics_quality_metrics;
CREATE POLICY "Admins can view quality metrics" ON analytics_quality_metrics
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admins can view project funnel" ON analytics_project_funnel;
CREATE POLICY "Admins can view project funnel" ON analytics_project_funnel
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admins can view editor rankings" ON analytics_editor_rankings;
CREATE POLICY "Admins can view editor rankings" ON analytics_editor_rankings
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE user_id = auth.uid()
        )
    );
