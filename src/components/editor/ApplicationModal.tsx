import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import Modal from '@/components/common/Modal';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Send, Loader2, AlertCircle } from 'lucide-react';

interface Project {
  id: string;
  title: string;
  users: {
    full_name: string;
  };
}

interface ApplicationModalProps {
  project: Project;
  onClose: () => void;
  onSuccess: () => void;
}

// Regex patterns para detectar contatos
const CONTACT_PATTERNS = {
  whatsapp: /\b(whats?app|wpp|zap|telefone|celular|fone|ligar|chamar)\b/gi,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /\b\d{2}[\s.-]?(?:\d{4,5}[\s.-]?\d{4}|\d{8,9})\b/g,
  instagram: /\b(@[A-Za-z0-9._]{3,30}|instagram|insta|dm)\b/gi,
  telegram: /\b(telegram|@\w+_bot)\b/gi,
};

function ApplicationModal({ project, onClose, onSuccess }: ApplicationModalProps) {
  const { user } = useAuth();

  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [detectedContacts, setDetectedContacts] = useState<string[]>([]);
  const [showWarning, setShowWarning] = useState(false);

  function detectContacts(text: string): string[] {
    const detected: string[] = [];

    if (CONTACT_PATTERNS.whatsapp.test(text)) {
      detected.push('WhatsApp/Telefone');
    }

    if (CONTACT_PATTERNS.email.test(text)) {
      detected.push('E-mail');
    }

    if (CONTACT_PATTERNS.phone.test(text)) {
      detected.push('Número de telefone');
    }

    if (CONTACT_PATTERNS.instagram.test(text)) {
      detected.push('Instagram');
    }

    if (CONTACT_PATTERNS.telegram.test(text)) {
      detected.push('Telegram');
    }

    return detected;
  }

  function handleMessageChange(value: string) {
    setMessage(value);
    
    const contacts = detectContacts(value);
    setDetectedContacts(contacts);
    setShowWarning(contacts.length > 0);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validações
    if (message.trim().length < 20) {
      toast({
        title: 'Erro',
        description: 'Sua mensagem deve ter pelo menos 20 caracteres',
        variant: 'destructive',
      });
      return;
    }

    if (message.trim().length > 500) {
      toast({
        title: 'Erro',
        description: 'Sua mensagem não pode ter mais de 500 caracteres',
        variant: 'destructive',
      });
      return;
    }

    // Se detectou contatos, mostrar warning mas permitir
    if (detectedContacts.length > 0) {
      const confirmed = window.confirm(
        'Detectamos possíveis informações de contato na sua mensagem.\n\n' +
        'Compartilhar contatos fora da plataforma pode resultar em suspensão da sua conta.\n\n' +
        'Deseja continuar mesmo assim?'
      );

      if (!confirmed) {
        return;
      }
    }

    setSubmitting(true);

    try {
      const { error } = await supabase.from('project_applications').insert({
        project_id: project.id,
        editor_id: user?.id,
        message: message.trim(),
        status: 'pending',
      });

      if (error) {
        if (error.code === '23505') {
          throw new Error('Você já se candidatou a este projeto');
        }
        throw error;
      }

      toast({
        title: 'Sucesso!',
        description: 'Candidatura enviada com sucesso!',
      });

      onSuccess();
    } catch (error: any) {
      console.error('Error submitting application:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao enviar candidatura',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Candidatar-se ao Projeto"
      size="medium"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Project Info */}
        <div className="bg-muted rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Projeto:</p>
          <p className="font-semibold text-foreground mb-3">{project.title}</p>
          <p className="text-sm text-muted-foreground mb-1">Criador:</p>
          <p className="font-medium text-foreground">{project.users.full_name}</p>
        </div>

        {/* Instructions */}
        <div className="bg-primary/10 rounded-lg p-4">
          <h4 className="font-semibold text-foreground mb-2">
            Dicas para uma boa candidatura:
          </h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>• Demonstre interesse genuíno no projeto</li>
            <li>• Mencione sua experiência relevante</li>
            <li>• Destaque seu diferencial</li>
            <li>• Seja profissional e educado</li>
          </ul>
        </div>

        {/* Message Field */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Mensagem de Candidatura *
          </label>
          <Textarea
            value={message}
            onChange={(e) => handleMessageChange(e.target.value)}
            placeholder="Escreva uma mensagem apresentando-se e explicando por que você é o editor ideal para este projeto..."
            rows={6}
            maxLength={500}
            className={showWarning ? 'border-yellow-500 bg-yellow-50' : ''}
          />
          <div className="flex items-center justify-between mt-2">
            <p className="text-sm text-muted-foreground">Mínimo 20 caracteres</p>
            <p
              className={`text-sm ${
                message.length > 500
                  ? 'text-destructive font-semibold'
                  : 'text-muted-foreground'
              }`}
            >
              {message.length} / 500
            </p>
          </div>
        </div>

        {/* Contact Warning */}
        {showWarning && detectedContacts.length > 0 && (
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-yellow-900 mb-2">
                  ⚠️ Possíveis Informações de Contato Detectadas
                </p>
                <p className="text-sm text-yellow-800 mb-3">
                  Detectamos possível menção a:{' '}
                  <span className="font-semibold">{detectedContacts.join(', ')}</span>
                </p>
                <div className="bg-yellow-100 rounded p-3 mb-3">
                  <p className="text-sm text-yellow-900 font-medium mb-2">
                    🚫 Proibido compartilhar contatos externos
                  </p>
                  <ul className="text-xs text-yellow-800 space-y-1">
                    <li>• Toda comunicação deve ocorrer dentro da plataforma</li>
                    <li>• Compartilhar contatos pode resultar em suspensão</li>
                    <li>• Use o chat integrado após ser selecionado</li>
                  </ul>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full border-yellow-500 text-yellow-700 hover:bg-yellow-100"
                  onClick={() => {
                    setMessage('');
                    setDetectedContacts([]);
                    setShowWarning(false);
                  }}
                >
                  Reescrever Mensagem
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Platform Rules Reminder */}
        <div className="bg-muted rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Lembre-se:</p>
              <p>
                Após ser selecionado, você terá acesso ao chat integrado para comunicação
                direta com o criador. Não compartilhe contatos externos nesta etapa.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="flex-1"
            onClick={onClose}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="default"
            size="lg"
            className="flex-1"
            disabled={submitting || message.trim().length < 20}
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="w-5 h-5 mr-2" />
                Enviar Candidatura
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default ApplicationModal;
