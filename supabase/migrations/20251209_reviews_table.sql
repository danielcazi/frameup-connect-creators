-- =====================================================
-- TABELA: reviews
-- DESCRIÇÃO: Armazena avaliações de editores feitas por criadores após conclusão de projetos
-- =====================================================

CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relacionamentos
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reviewee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Avaliações por critério (escala 1-5)
    rating_communication INTEGER NOT NULL CHECK (rating_communication >= 1 AND rating_communication <= 5),
    rating_quality INTEGER NOT NULL CHECK (rating_quality >= 1 AND rating_quality <= 5),
    rating_deadline INTEGER NOT NULL CHECK (rating_deadline >= 1 AND rating_deadline <= 5),
    rating_professionalism INTEGER NOT NULL CHECK (rating_professionalism >= 1 AND rating_professionalism <= 5),
    rating_overall NUMERIC(3,2) NOT NULL CHECK (rating_overall >= 1.0 AND rating_overall <= 5.0),
    
    -- Feedback textual
    comment TEXT,
    
    -- Metadados
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_review_per_project UNIQUE (project_id, reviewer_id)
);

-- =====================================================
-- COMENTÁRIOS NA TABELA
-- =====================================================
COMMENT ON TABLE public.reviews IS 'Avaliações de editores feitas por criadores após conclusão de projetos';
COMMENT ON COLUMN public.reviews.reviewer_id IS 'ID do criador que está avaliando';
COMMENT ON COLUMN public.reviews.reviewee_id IS 'ID do editor que está sendo avaliado';
COMMENT ON COLUMN public.reviews.rating_overall IS 'Média calculada das 4 avaliações individuais';
COMMENT ON COLUMN public.reviews.project_id IS 'Projeto relacionado à avaliação';

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================
CREATE INDEX idx_reviews_reviewee_id ON public.reviews(reviewee_id);
CREATE INDEX idx_reviews_reviewer_id ON public.reviews(reviewer_id);
CREATE INDEX idx_reviews_project_id ON public.reviews(project_id);
CREATE INDEX idx_reviews_created_at ON public.reviews(created_at DESC);

-- =====================================================
-- TRIGGER PARA ATUALIZAR updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_reviews_updated_at 
    BEFORE UPDATE ON public.reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- HABILITAR RLS (Row Level Security)
-- =====================================================
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLICY 1: Leitura Pública
-- Qualquer usuário autenticado pode ler avaliações
-- =====================================================
CREATE POLICY "reviews_select_policy"
ON public.reviews
FOR SELECT
TO authenticated
USING (true);

-- =====================================================
-- POLICY 2: Inserção - Apenas Criadores
-- Apenas o criador do projeto pode criar avaliação
-- =====================================================
CREATE POLICY "reviews_insert_policy"
ON public.reviews
FOR INSERT
TO authenticated
WITH CHECK (
    -- Verificar se é o criador do projeto
    reviewer_id = auth.uid() 
    AND EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = project_id
        AND p.creator_id = auth.uid()
        AND p.status = 'completed'
    )
);

-- =====================================================
-- POLICY 3: Atualização - Apenas o Criador Original
-- Apenas quem criou a avaliação pode editar (dentro de 7 dias)
-- =====================================================
CREATE POLICY "reviews_update_policy"
ON public.reviews
FOR UPDATE
TO authenticated
USING (
    reviewer_id = auth.uid()
    AND created_at > NOW() - INTERVAL '7 days'
)
WITH CHECK (
    reviewer_id = auth.uid()
);

-- =====================================================
-- POLICY 4: Exclusão - Apenas Administradores
-- Apenas admins podem deletar avaliações
-- =====================================================
CREATE POLICY "reviews_delete_policy"
ON public.reviews
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE user_id = auth.uid()
        AND is_active = true
    )
);
