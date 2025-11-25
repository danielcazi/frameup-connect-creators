#!/bin/bash

# Script para configurar e fazer deploy do FrameUp no GitHub Pages

echo "🚀 FrameUp - Deploy Setup"
echo "=========================="
echo ""

# Verificar se está em um repositório git
if [ ! -d ".git" ]; then
    echo "📦 Inicializando repositório Git..."
    git init
    echo "✅ Repositório Git inicializado"
else
    echo "✅ Repositório Git já existe"
fi

echo ""
echo "📝 Próximos passos:"
echo ""
echo "1. Criar repositório no GitHub:"
echo "   https://github.com/new"
echo ""
echo "2. Configurar remote (substitua SEU-USUARIO):"
echo "   git remote add origin https://github.com/SEU-USUARIO/frameup-connect-creators.git"
echo ""
echo "3. Configurar secrets no GitHub:"
echo "   Vá para: Settings → Secrets and variables → Actions"
echo "   Adicione os seguintes secrets:"
echo "   - VITE_SUPABASE_URL"
echo "   - VITE_SUPABASE_ANON_KEY"
echo "   - VITE_STRIPE_PUBLISHABLE_KEY"
echo "   - VITE_STRIPE_BASIC_PRICE_ID"
echo "   - VITE_STRIPE_PRO_PRICE_ID"
echo "   - VITE_APP_URL"
echo ""
echo "4. Habilitar GitHub Pages:"
echo "   Settings → Pages → Source: GitHub Actions"
echo ""
echo "5. Fazer primeiro deploy:"
echo "   git add ."
echo "   git commit -m 'Initial commit with GitHub Pages deployment'"
echo "   git push -u origin main"
echo ""
echo "📖 Para mais detalhes, leia o arquivo DEPLOY.md"
echo ""
