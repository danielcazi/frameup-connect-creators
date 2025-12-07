import { useNavigate } from 'react-router-dom';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crown, Check, ArrowRight } from 'lucide-react';

interface SubscriptionRequiredModalProps {
    isOpen: boolean;
    onClose: () => void;
}

function SubscriptionRequiredModal({ isOpen, onClose }: SubscriptionRequiredModalProps) {
    const navigate = useNavigate();

    function handleSubscribe() {
        onClose();
        navigate('/editor/subscription/plans');
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader className="text-center">
                    <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                        <Crown className="w-8 h-8 text-primary" />
                    </div>
                    <DialogTitle className="text-xl">Assine para se Candidatar</DialogTitle>
                    <DialogDescription className="text-center">
                        Para se candidatar a projetos, você precisa ter uma assinatura ativa.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Benefícios */}
                    <div className="space-y-3">
                        <p className="text-sm font-medium text-foreground">
                            Com uma assinatura você pode:
                        </p>
                        <ul className="space-y-2">
                            <li className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                                Se candidatar a projetos ilimitados
                            </li>
                            <li className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                                Trabalhar em até 4 projetos simultâneos
                            </li>
                            <li className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                                Ter taxa de plataforma reduzida
                            </li>
                            <li className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                                Receber badge de Editor verificado
                            </li>
                        </ul>
                    </div>

                    {/* Preços */}
                    <div className="bg-muted/50 rounded-lg p-4 text-center">
                        <p className="text-sm text-muted-foreground mb-1">A partir de</p>
                        <p className="text-2xl font-bold text-foreground">
                            R$ 47,00<span className="text-sm font-normal text-muted-foreground">/mês</span>
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                    <Button size="lg" onClick={handleSubscribe}>
                        Ver Planos
                        <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                    <Button variant="ghost" onClick={onClose}>
                        Agora não
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default SubscriptionRequiredModal;
