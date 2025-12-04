# 🎬 FrameUp - Marketplace de Edição de Vídeos

Plataforma que conecta creators com editores de vídeo profissionais.

## 🚀 Sobre o Projeto

FrameUp é um marketplace completo onde criadores de conteúdo podem encontrar editores de vídeo qualificados, gerenciar projetos, realizar pagamentos e receber entregas de alta qualidade.

### ✨ Funcionalidades Principais

- **Para Creators:**
  - Publicação de projetos detalhados
  - Busca de editores por especialidade
  - Pagamentos seguros via Stripe
  - Chat em tempo real com editores
  - Sistema de avaliação e feedback

- **Para Editores:**
  - Perfil profissional com portfólio
  - Candidatura a projetos
  - Gestão de assinaturas (Planos Basic e Pro)
  - Dashboard financeiro

## 🛠️ Tecnologias Utilizadas

- **Frontend:** React, TypeScript, Vite
- **UI:** Tailwind CSS, Shadcn/ui
- **Backend:** Supabase (Auth, Database, Realtime, Storage)
- **Pagamentos:** Stripe
- **Deploy:** GitHub Pages

## 📦 Como Rodar Localmente

1. **Clone o repositório**
   ```bash
   git clone https://github.com/danielcazi/frameup-connect-creators.git
   cd frameup-connect-creators
   ```

2. **Instale as dependências**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente**
   Crie um arquivo `.env` na raiz do projeto copiando o exemplo:
   ```bash
   cp .env.example .env
   ```
   Preencha com suas chaves do Supabase e Stripe.

4. **Inicie o servidor de desenvolvimento**
   ```bash
   npm run dev
   ```

## 🚀 Deploy

Este projeto está configurado para deploy automático no GitHub Pages.
Consulte [DEPLOY.md](DEPLOY.md) para mais detalhes.

## 📄 Licença

MIT
