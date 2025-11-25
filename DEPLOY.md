# FrameUp - Marketplace de Edição de Vídeos

Plataforma que conecta creators com editores de vídeo profissionais.

## 🚀 Deploy no GitHub Pages

Este projeto está configurado para deploy automático no GitHub Pages usando GitHub Actions.

### Pré-requisitos

1. Conta no GitHub
2. Repositório criado no GitHub
3. Variáveis de ambiente configuradas

### Passo a Passo para Deploy

#### 1. Configurar Secrets no GitHub

Vá para o seu repositório no GitHub e configure os seguintes secrets:

**Settings → Secrets and variables → Actions → New repository secret**

Adicione os seguintes secrets:

- `VITE_SUPABASE_URL`: URL do seu projeto Supabase
- `VITE_SUPABASE_ANON_KEY`: Chave anônima do Supabase
- `VITE_STRIPE_PUBLISHABLE_KEY`: Chave pública do Stripe
- `VITE_STRIPE_BASIC_PRICE_ID`: ID do plano básico no Stripe
- `VITE_STRIPE_PRO_PRICE_ID`: ID do plano pro no Stripe
- `VITE_APP_URL`: URL da aplicação (ex: `https://seu-usuario.github.io/frameup-connect-creators`)

#### 2. Habilitar GitHub Pages

1. Vá para **Settings → Pages**
2. Em **Source**, selecione **GitHub Actions**
3. Salve as configurações

#### 3. Fazer Push para o GitHub

```bash
# Inicializar repositório (se ainda não foi feito)
git init

# Adicionar remote
git remote add origin https://github.com/seu-usuario/frameup-connect-creators.git

# Adicionar arquivos
git add .

# Commit
git commit -m "Initial commit with GitHub Pages deployment"

# Push para main
git push -u origin main
```

#### 4. Verificar Deploy

1. Vá para a aba **Actions** no seu repositório
2. Você verá o workflow "Deploy to GitHub Pages" rodando
3. Aguarde a conclusão (geralmente 2-3 minutos)
4. Acesse: `https://seu-usuario.github.io/frameup-connect-creators`

### 🔄 Deploys Automáticos

Após a configuração inicial, **todo push para a branch `main`** irá automaticamente:

1. Instalar dependências
2. Fazer build da aplicação
3. Fazer deploy no GitHub Pages

### 🛠️ Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Copiar .env.example para .env
cp .env.example .env

# Editar .env com suas credenciais
# Depois rodar o servidor de desenvolvimento
npm run dev
```

### 📦 Build Manual

```bash
# Build de produção
npm run build

# Preview do build
npm run preview
```

### 🔧 Tecnologias

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase
- **Pagamentos**: Stripe
- **Deploy**: GitHub Pages + GitHub Actions

### 📝 Estrutura do Projeto

```
frameup-connect-creators/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions workflow
├── src/
│   ├── components/             # Componentes React
│   ├── pages/                  # Páginas da aplicação
│   ├── services/               # Serviços e APIs
│   ├── hooks/                  # Custom hooks
│   ├── lib/                    # Bibliotecas e configurações
│   └── types/                  # TypeScript types
├── supabase/
│   └── migrations/             # Migrações do banco de dados
├── .env.example                # Exemplo de variáveis de ambiente
├── vite.config.ts              # Configuração do Vite
└── package.json                # Dependências do projeto
```

### 🐛 Troubleshooting

**Erro: "Failed to deploy"**
- Verifique se todos os secrets estão configurados corretamente
- Verifique se o GitHub Pages está habilitado nas configurações

**Erro: "Build failed"**
- Verifique os logs na aba Actions
- Certifique-se de que todas as variáveis de ambiente estão configuradas

**Página em branco após deploy**
- Verifique se o `base` no `vite.config.ts` está correto
- Limpe o cache do navegador

### 📄 Licença

MIT

### 👥 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

### 📞 Suporte

Para suporte, abra uma issue no repositório do GitHub.
