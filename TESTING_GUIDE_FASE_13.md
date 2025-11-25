# 🧪 GUIA DE TESTES - FASE 13: SISTEMA DE APROVAÇÃO DE EDITORES

## 📋 Pré-requisitos

1. ✅ Servidor de desenvolvimento rodando (`npm run dev`)
2. ✅ Banco de dados Supabase configurado
3. ✅ Usuário admin criado no sistema
4. ✅ Pelo menos um editor cadastrado na fila de aprovação

## 🔐 1. Login como Admin

### Passos:
1. Acesse: `http://localhost:8080/admin/login`
2. Faça login com credenciais de admin
3. Você será redirecionado para `/admin` (Dashboard)

### Verificar:
- ✅ Login bem-sucedido
- ✅ Redirecionamento automático
- ✅ Sidebar com menu de navegação visível

---

## 📊 2. Acessar Fila de Aprovações

### Passos:
1. No menu lateral, clique em "Aprovações"
2. Ou navegue diretamente para: `http://localhost:8080/admin/approvals`

### Verificar:
- ✅ Página carrega sem erros
- ✅ Cards de estatísticas aparecem:
  - Pendentes (amarelo)
  - Aprovados (verde)
  - Rejeitados (vermelho)
  - Com Alertas (laranja)
- ✅ Filtros funcionam (Pending, Approved, Rejected, All)
- ✅ Lista de editores aparece
- ✅ Cada editor mostra:
  - Avatar com inicial
  - Email
  - Dias aguardando
  - Status badge
  - Botão "Analisar"

### Alertas Automáticos:
- ✅ Editores com portfólio duplicado mostram badge "⚠️ Portfólio Duplicado"
- ✅ Editores com links suspeitos mostram badge "⚠️ Links Suspeitos"

---

## 🔍 3. Análise Detalhada de Editor

### Passos:
1. Clique em "Analisar" em qualquer editor da lista
2. Você será redirecionado para: `/admin/approvals/:editorId`

### Verificar Layout:

#### Header:
- ✅ Botão "Voltar para fila" funciona
- ✅ Título "Análise de Editor"
- ✅ Email do editor exibido
- ✅ Botões "Rejeitar" (vermelho) e "Aprovar" (verde) visíveis (apenas se status = pending)

#### Alertas Automáticos (se aplicável):
- ✅ Box laranja com alertas aparece
- ✅ Lista de problemas detectados

#### Informações do Perfil (Card Esquerdo):
- ✅ Nome do editor
- ✅ Email do editor
- ✅ Localização (cidade, estado) com ícone de pin
- ✅ Bio do editor
- ✅ Softwares (badges azuis)
- ✅ Especialidades (badges roxas)

#### Portfólio (Card Direito):
- ✅ Título mostra "Portfólio (X/3)"
- ✅ Cada vídeo mostra:
  - Número do vídeo
  - Tipo do vídeo
  - Título
  - URL (truncada)
  - Ícone de link externo (clicável)
- ✅ Links externos abrem em nova aba
- ✅ Se não houver vídeos: "Sem vídeos no portfólio"

#### Sistema de Avaliação:
- ✅ Seção "Avaliação" visível
- ✅ Duas categorias de scoring:
  - Qualidade do Portfólio
  - Completude do Perfil
- ✅ Estrelas interativas (1-5)
- ✅ Estrelas mudam de cor ao clicar
- ✅ Contador mostra "X/5"
- ✅ Valor padrão: 5/5

---

## ✅ 4. Testar Aprovação

### Passos:
1. Ajuste os scores conforme desejado
2. Clique no botão "Aprovar" (verde)
3. Modal de aprovação abre

### Verificar Modal de Aprovação:
- ✅ Título: "Aprovar Editor"
- ✅ Campo de texto para "Notas do Revisor (opcional)"
- ✅ Placeholder: "Portfólio de alta qualidade..."
- ✅ Botão "Cancelar" (cinza)
- ✅ Botão "Confirmar Aprovação" (verde)

### Testar Funcionalidades:
1. **Cancelar:**
   - ✅ Clique em "Cancelar"
   - ✅ Modal fecha
   - ✅ Nada é salvo

2. **Aprovar:**
   - ✅ Digite notas (opcional)
   - ✅ Clique em "Confirmar Aprovação"
   - ✅ Botão muda para "Aprovando..."
   - ✅ Botão fica desabilitado
   - ✅ Após sucesso: alert "Editor aprovado com sucesso!"
   - ✅ Redirecionamento para `/admin/approvals`
   - ✅ Editor não aparece mais na lista de pendentes
   - ✅ Editor aparece na lista de aprovados (filtro "Approved")

### Verificar no Banco de Dados:
```sql
-- Verificar status na fila
SELECT * FROM editor_approval_queue WHERE editor_id = 'ID_DO_EDITOR';

-- Verificar log de ação
SELECT * FROM admin_action_logs 
WHERE target_id = 'ID_DO_EDITOR' 
AND action_type = 'approve_editor';

-- Verificar status do usuário
SELECT approval_status FROM user_metadata_extension 
WHERE user_id = 'ID_DO_EDITOR';
```

**Resultados Esperados:**
- `editor_approval_queue.status` = 'approved'
- `editor_approval_queue.reviewed_by` = ID do admin
- `editor_approval_queue.portfolio_quality_score` = score definido
- `editor_approval_queue.profile_completeness_score` = score definido
- `editor_approval_queue.reviewer_notes` = notas digitadas
- `user_metadata_extension.approval_status` = 'approved'
- Log criado em `admin_action_logs`

---

## ❌ 5. Testar Rejeição

### Passos:
1. Navegue para um editor pendente
2. Clique no botão "Rejeitar" (vermelho)
3. Modal de rejeição abre

### Verificar Modal de Rejeição:
- ✅ Título: "Rejeitar Editor"
- ✅ Campo de texto para "Motivo da Rejeição *" (obrigatório)
- ✅ Placeholder: "Portfólio não atende aos padrões mínimos..."
- ✅ Botão "Cancelar" (cinza)
- ✅ Botão "Confirmar Rejeição" (vermelho)

### Testar Funcionalidades:
1. **Validação:**
   - ✅ Botão "Confirmar Rejeição" desabilitado se campo vazio
   - ✅ Botão habilita ao digitar texto

2. **Cancelar:**
   - ✅ Clique em "Cancelar"
   - ✅ Modal fecha
   - ✅ Nada é salvo

3. **Rejeitar:**
   - ✅ Digite motivo da rejeição
   - ✅ Clique em "Confirmar Rejeição"
   - ✅ Botão muda para "Rejeitando..."
   - ✅ Botão fica desabilitado
   - ✅ Após sucesso: alert "Editor rejeitado"
   - ✅ Redirecionamento para `/admin/approvals`
   - ✅ Editor não aparece mais na lista de pendentes
   - ✅ Editor aparece na lista de rejeitados (filtro "Rejected")

### Verificar no Banco de Dados:
```sql
-- Verificar status na fila
SELECT * FROM editor_approval_queue WHERE editor_id = 'ID_DO_EDITOR';

-- Verificar log de ação
SELECT * FROM admin_action_logs 
WHERE target_id = 'ID_DO_EDITOR' 
AND action_type = 'reject_editor';

-- Verificar status do usuário
SELECT approval_status FROM user_metadata_extension 
WHERE user_id = 'ID_DO_EDITOR';
```

**Resultados Esperados:**
- `editor_approval_queue.status` = 'rejected'
- `editor_approval_queue.reviewed_by` = ID do admin
- `editor_approval_queue.rejection_reason` = motivo digitado
- `editor_approval_queue.portfolio_quality_score` = score definido
- `editor_approval_queue.profile_completeness_score` = score definido
- `user_metadata_extension.approval_status` = 'rejected'
- Log criado em `admin_action_logs`

---

## 🔄 6. Testar Navegação

### Voltar para Fila:
- ✅ Clique em "Voltar para fila" na página de detalhes
- ✅ Redirecionamento para `/admin/approvals`
- ✅ Estado da lista preservado (filtro atual mantido)

### Navegação Direta:
- ✅ Acesse `/admin/approvals/EDITOR_ID_INVALIDO`
- ✅ Mensagem "Editor não encontrado" aparece
- ✅ Link "Voltar para fila" funciona

---

## 🚨 7. Testar Verificações Automáticas

### Portfólio Duplicado:
1. Crie dois editores com o mesmo vídeo no portfólio
2. Acesse a análise detalhada
3. ✅ Alerta "Portfólio duplicado detectado" aparece

### Links Suspeitos:
1. Crie um editor com link inválido (ex: "http://exemplo.com")
2. Acesse a análise detalhada
3. ✅ Alerta "Links suspeitos ou inválidos" aparece

### Verificar Auto-Checks:
```sql
SELECT 
  has_duplicate_portfolio,
  has_suspicious_links,
  auto_flags
FROM editor_approval_queue
WHERE editor_id = 'ID_DO_EDITOR';
```

---

## 🎨 8. Testar Responsividade

### Desktop (1920x1080):
- ✅ Layout em 2 colunas (perfil | portfólio)
- ✅ Todos os elementos visíveis
- ✅ Espaçamento adequado

### Tablet (768x1024):
- ✅ Layout ajusta para 1 coluna
- ✅ Cards empilhados verticalmente
- ✅ Botões mantêm tamanho adequado

### Mobile (375x667):
- ✅ Layout totalmente responsivo
- ✅ Modais ocupam largura adequada
- ✅ Texto legível
- ✅ Botões clicáveis

---

## 🐛 9. Testar Casos de Erro

### Editor Sem Portfólio:
- ✅ Mensagem "Sem vídeos no portfólio" aparece
- ✅ Ainda é possível aprovar/rejeitar

### Editor Sem Bio:
- ✅ Texto "Sem bio" aparece
- ✅ Não quebra o layout

### Editor Sem Localização:
- ✅ Seção de localização não aparece
- ✅ Não quebra o layout

### Editor Sem Skills/Especialidades:
- ✅ Seções não aparecem
- ✅ Não quebra o layout

### Erro de Rede:
1. Desconecte do Supabase
2. Tente aprovar/rejeitar
3. ✅ Alert de erro aparece
4. ✅ Modal não fecha
5. ✅ Usuário pode tentar novamente

---

## 📊 10. Verificar Estatísticas

### Na Página de Fila:
- ✅ Contador de pendentes atualiza após aprovação/rejeição
- ✅ Contador de aprovados incrementa após aprovação
- ✅ Contador de rejeitados incrementa após rejeição
- ✅ Contador de alertas mostra editores com flags

### Filtros:
- ✅ "Pending" mostra apenas pendentes
- ✅ "Approved" mostra apenas aprovados
- ✅ "Rejected" mostra apenas rejeitados
- ✅ "All" mostra todos

---

## ✅ CHECKLIST FINAL

### Funcionalidades Core:
- [ ] Login como admin funciona
- [ ] Página de fila carrega corretamente
- [ ] Estatísticas aparecem corretamente
- [ ] Filtros funcionam
- [ ] Navegação para detalhes funciona
- [ ] Informações do editor aparecem completas
- [ ] Portfólio é exibido corretamente
- [ ] Links externos funcionam
- [ ] Sistema de scoring funciona
- [ ] Modal de aprovação funciona
- [ ] Modal de rejeição funciona
- [ ] Validação de campos obrigatórios funciona
- [ ] Aprovação salva no banco
- [ ] Rejeição salva no banco
- [ ] Logs são criados
- [ ] Redirecionamentos funcionam
- [ ] Alertas automáticos aparecem
- [ ] Verificações automáticas executam

### UX/UI:
- [ ] Design está bonito e profissional
- [ ] Cores são consistentes
- [ ] Ícones aparecem corretamente
- [ ] Hover states funcionam
- [ ] Loading states aparecem
- [ ] Mensagens de erro são claras
- [ ] Responsividade funciona
- [ ] Acessibilidade básica (tab navigation)

### Performance:
- [ ] Página carrega rapidamente
- [ ] Sem erros no console
- [ ] Sem warnings no console
- [ ] TypeScript compila sem erros
- [ ] Sem memory leaks visíveis

---

## 🎯 Próximos Passos

Após confirmar que todos os testes passam:

1. ✅ Marcar Fase 13 como completa
2. ✅ Documentar quaisquer bugs encontrados
3. ✅ Preparar para Fase 14 - Sistema de Disputas

---

**Data de Criação:** 2025-11-23  
**Última Atualização:** 2025-11-23  
**Status:** Pronto para Testes
