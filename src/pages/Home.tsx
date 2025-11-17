import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Video, Sparkles, Users, Shield, Zap, TrendingUp } from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Users,
      title: 'Profissionais Verificados',
      description: 'Editores selecionados com portfólio validado'
    },
    {
      icon: Shield,
      title: 'Pagamento Seguro',
      description: 'Seu dinheiro protegido até a aprovação final'
    },
    {
      icon: Zap,
      title: 'Entrega Rápida',
      description: 'Receba seus vídeos editados em poucos dias'
    },
    {
      icon: TrendingUp,
      title: 'Cresça Seu Canal',
      description: 'Foque no conteúdo enquanto cuidamos da edição'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-light to-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold text-foreground">FRAMEUP</span>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => navigate('/login')}>
                Entrar
              </Button>
              <Button onClick={() => navigate('/cadastro')}>
                Começar Agora
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
            <Sparkles className="h-4 w-4" />
            Marketplace de Edição de Vídeo
          </div>
          
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground md:text-6xl lg:text-7xl">
            Conecte Criadores e
            <span className="bg-gradient-to-r from-primary to-primary-hover bg-clip-text text-transparent">
              {' '}Editores Profissionais
            </span>
          </h1>
          
          <p className="mb-10 text-lg text-muted-foreground md:text-xl">
            A plataforma que une criadores de conteúdo com editores de vídeo especializados.
            Simplifique sua produção e escale seu canal.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button 
              size="lg" 
              className="w-full bg-primary hover:bg-primary-hover sm:w-auto"
              onClick={() => navigate('/cadastro?tipo=creator')}
            >
              <Video className="mr-2 h-5 w-5" />
              Sou Creator
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground sm:w-auto"
              onClick={() => navigate('/cadastro?tipo=editor')}
            >
              <Sparkles className="mr-2 h-5 w-5" />
              Sou Editor
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="border-t border-border/40 bg-card py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
              Por que escolher o FRAMEUP?
            </h2>
            <p className="text-lg text-muted-foreground">
              A solução completa para conectar talento e demanda no mundo da criação de conteúdo
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group rounded-xl border border-border bg-background p-6 transition-all hover:border-primary/50 hover:shadow-lg"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl rounded-2xl bg-gradient-to-r from-primary to-primary-hover p-10 text-center md:p-16">
            <h2 className="mb-4 text-3xl font-bold text-primary-foreground md:text-4xl">
              Pronto para começar?
            </h2>
            <p className="mb-8 text-lg text-primary-foreground/90">
              Junte-se a centenas de criadores e editores que já estão transformando conteúdo
            </p>
            <Button 
              size="lg"
              variant="secondary"
              className="bg-background text-foreground hover:bg-background/90"
              onClick={() => navigate('/cadastro')}
            >
              Criar Conta Gratuita
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-card py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <Video className="h-6 w-6 text-primary" />
              <span className="font-semibold text-foreground">FRAMEUP</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 FRAMEUP. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
