import React from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Twitter, Youtube, Linkedin } from 'lucide-react';
import { cn } from '@/lib/utils';

const Footer: React.FC = () => {
  const productLinks = [
    { label: 'Como Funciona', href: '/how-it-works' },
    { label: 'Preços', href: '/pricing' },
    { label: 'Para Creators', href: '/creators' },
    { label: 'Para Editores', href: '/editors' },
  ];

  const companyLinks = [
    { label: 'Sobre Nós', href: '/about' },
    { label: 'Blog', href: '/blog' },
    { label: 'Carreiras', href: '/careers' },
    { label: 'Contato', href: '/contact' },
  ];

  const legalLinks = [
    { label: 'Termos de Serviço', href: '/terms' },
    { label: 'Política de Privacidade', href: '/privacy' },
    { label: 'Política de Cookies', href: '/cookies' },
    { label: 'LGPD', href: '/lgpd' },
  ];

  const socialLinks = [
    { icon: Instagram, href: 'https://instagram.com', label: 'Instagram' },
    { icon: Twitter, href: 'https://twitter.com', label: 'Twitter' },
    { icon: Youtube, href: 'https://youtube.com', label: 'YouTube' },
    { icon: Linkedin, href: 'https://linkedin.com', label: 'LinkedIn' },
  ];

  return (
    <footer className="bg-[#111827] text-[#D1D5DB]">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Top Section - Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Column 1 - Brand */}
          <div>
            <h2 className="text-xl font-bold text-white mb-3">
              FRAMEUP
            </h2>
            <p className="text-sm text-[#9CA3AF] max-w-[280px] mb-6">
              Conectando criadores de conteúdo com os melhores editores de vídeo profissionais.
            </p>
            
            {/* Social Icons */}
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'w-8 h-8 rounded-full',
                    'border border-[#374151]',
                    'flex items-center justify-center',
                    'text-[#9CA3AF] hover:text-white',
                    'hover:bg-primary hover:border-primary',
                    'transition-all duration-200'
                  )}
                  aria-label={social.label}
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Column 2 - Product */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">
              Produto
            </h3>
            <ul className="space-y-2">
              {productLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-sm text-[#9CA3AF] hover:text-white transition-colors duration-200 block"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3 - Company */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">
              Empresa
            </h3>
            <ul className="space-y-2">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-sm text-[#9CA3AF] hover:text-white transition-colors duration-200 block"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4 - Legal */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">
              Legal
            </h3>
            <ul className="space-y-2">
              {legalLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-sm text-[#9CA3AF] hover:text-white transition-colors duration-200 block"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-[#374151] my-8" />

        {/* Bottom Section */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[#6B7280]">
            © 2024 FRAMEUP. Todos os direitos reservados.
          </p>

          {/* Payment Icons */}
          <div className="flex items-center gap-3 opacity-70">
            <div className="text-xs text-[#6B7280] font-medium px-3 py-1 bg-[#1F2937] rounded">
              VISA
            </div>
            <div className="text-xs text-[#6B7280] font-medium px-3 py-1 bg-[#1F2937] rounded">
              MASTERCARD
            </div>
            <div className="text-xs text-[#6B7280] font-medium px-3 py-1 bg-[#1F2937] rounded">
              STRIPE
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
