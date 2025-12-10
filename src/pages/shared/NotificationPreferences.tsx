import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Bell,
    Mail,
    Smartphone,
    Monitor,
    Clock,
    Save,
    RotateCcw,
    Loader2,
    CheckCircle,
    XCircle,
    MessageSquare,
    Briefcase,
    DollarSign,
    Heart,
    FileText,
    AlertCircle,
    Send
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

// Tipos de notificação com metadados
const NOTIFICATION_TYPES = [
    {
        key: 'application_accepted',
        label: 'Candidatura aceita',
        description: 'Quando um creator aceita sua candidatura',
        icon: CheckCircle,
        color: 'text-green-600',
        userTypes: ['editor'],
    },
    {
        key: 'application_rejected',
        label: 'Candidatura rejeitada',
        description: 'Quando um creator rejeita sua candidatura',
        icon: XCircle,
        color: 'text-red-600',
        userTypes: ['editor'],
    },
    {
        key: 'new_message',
        label: 'Nova mensagem',
        description: 'Quando você recebe uma mensagem no chat',
        icon: MessageSquare,
        color: 'text-blue-600',
        userTypes: ['editor', 'creator'],
    },
    {
        key: 'project_assigned',
        label: 'Projeto atribuído',
        description: 'Quando você é selecionado para um projeto',
        icon: Briefcase,
        color: 'text-purple-600',
        userTypes: ['editor'],
    },
    {
        key: 'delivery_feedback',
        label: 'Feedback de entrega',
        description: 'Quando o creator aprova ou solicita revisão',
        icon: FileText,
        color: 'text-amber-600',
        userTypes: ['editor'],
    },
    {
        key: 'payment_received',
        label: 'Pagamento recebido',
        description: 'Quando um pagamento é liberado para você',
        icon: DollarSign,
        color: 'text-green-600',
        userTypes: ['editor'],
    },
    {
        key: 'new_favorite',
        label: 'Novo favorito',
        description: 'Quando alguém adiciona você aos favoritos',
        icon: Heart,
        color: 'text-pink-600',
        userTypes: ['editor'],
    },
    {
        key: 'new_projects_digest',
        label: 'Resumo de novos projetos',
        description: 'Receba um resumo dos novos projetos disponíveis',
        icon: Send,
        color: 'text-indigo-600',
        userTypes: ['editor'],
    },
];

// Opções de frequência
const FREQUENCY_OPTIONS = [
    { value: 'immediate', label: 'Imediatamente', description: 'Receba cada notificação assim que ocorrer' },
    { value: 'daily', label: 'Diariamente', description: 'Receba um resumo diário das notificações' },
    { value: 'weekly', label: 'Semanalmente', description: 'Receba um resumo semanal das notificações' },
    { value: 'never', label: 'Nunca', description: 'Não receber emails de notificação' },
];

// Horários para digest
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
    value: i,
    label: `${i.toString().padStart(2, '0')}:00`,
}));

export default function NotificationPreferences() {
    const { userType } = useAuth();
    const navigate = useNavigate();

    const {
        preferences,
        loading,
        saving,
        updatePreference,
        savePreferences,
        resetToDefaults,
        hasChanges,
    } = useNotificationPreferences();

    // Filtra tipos de notificação baseado no userType
    const filteredNotificationTypes = NOTIFICATION_TYPES.filter(
        (type) => type.userTypes.includes(userType || 'editor')
    );

    const handleBack = () => {
        const path = userType === 'creator'
            ? '/creator/notifications'
            : '/editor/notifications';
        navigate(path);
    };

    if (loading) {
        return (
            <DashboardLayout
                userType={userType as 'creator' | 'editor'}
                title="Preferências de Notificações"
                subtitle="Carregando..."
            >
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout
            userType={userType as 'creator' | 'editor'}
            title="Preferências de Notificações"
            subtitle="Configure como você deseja receber notificações"
        >
            <div className="max-w-3xl mx-auto space-y-6">
                {/* Botão Voltar */}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBack}
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar para Notificações
                </Button>

                {/* Canais de Notificação */}
                <Card className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Bell className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold">Canais de Notificação</h2>
                            <p className="text-sm text-muted-foreground">
                                Escolha onde deseja receber suas notificações
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {/* In-App */}
                        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                            <div className="flex items-center gap-3">
                                <Monitor className="w-5 h-5 text-muted-foreground" />
                                <div>
                                    <Label className="text-sm font-medium">No aplicativo</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Notificações dentro da plataforma
                                    </p>
                                </div>
                            </div>
                            <Switch
                                checked={preferences?.channel_in_app ?? true}
                                onCheckedChange={(checked) => updatePreference('channel_in_app', checked)}
                            />
                        </div>

                        {/* Email */}
                        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                            <div className="flex items-center gap-3">
                                <Mail className="w-5 h-5 text-muted-foreground" />
                                <div>
                                    <Label className="text-sm font-medium">Email</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Receba notificações por email
                                    </p>
                                </div>
                            </div>
                            <Switch
                                checked={preferences?.channel_email ?? true}
                                onCheckedChange={(checked) => updatePreference('channel_email', checked)}
                            />
                        </div>

                        {/* Push */}
                        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                            <div className="flex items-center gap-3">
                                <Smartphone className="w-5 h-5 text-muted-foreground" />
                                <div>
                                    <Label className="text-sm font-medium">Push (em breve)</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Notificações push no celular
                                    </p>
                                </div>
                            </div>
                            <Switch
                                checked={preferences?.channel_push ?? false}
                                onCheckedChange={(checked) => updatePreference('channel_push', checked)}
                                disabled
                            />
                        </div>
                    </div>
                </Card>

                {/* Frequência de Email */}
                {preferences?.channel_email && (
                    <Card className="p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Clock className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold">Frequência de Emails</h2>
                                <p className="text-sm text-muted-foreground">
                                    Defina com que frequência deseja receber emails
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {/* Seletor de frequência */}
                            <div className="grid gap-3">
                                {FREQUENCY_OPTIONS.map((option) => (
                                    <div
                                        key={option.value}
                                        onClick={() => updatePreference('email_frequency', option.value)}
                                        className={cn(
                                            'flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-colors',
                                            preferences?.email_frequency === option.value
                                                ? 'border-primary bg-primary/5'
                                                : 'border-transparent bg-muted/30 hover:bg-muted/50'
                                        )}
                                    >
                                        <div>
                                            <p className="font-medium">{option.label}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {option.description}
                                            </p>
                                        </div>
                                        <div className={cn(
                                            'w-4 h-4 rounded-full border-2',
                                            preferences?.email_frequency === option.value
                                                ? 'border-primary bg-primary'
                                                : 'border-muted-foreground'
                                        )}>
                                            {preferences?.email_frequency === option.value && (
                                                <div className="w-full h-full rounded-full bg-primary" />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Horário do digest */}
                            {(preferences?.email_frequency === 'daily' || preferences?.email_frequency === 'weekly') && (
                                <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label className="text-sm font-medium">Horário do resumo</Label>
                                            <p className="text-xs text-muted-foreground">
                                                Escolha o horário preferido para receber o resumo
                                            </p>
                                        </div>
                                        <Select
                                            value={preferences?.digest_hour?.toString() ?? '9'}
                                            onValueChange={(value) => updatePreference('digest_hour', parseInt(value))}
                                        >
                                            <SelectTrigger className="w-[120px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {HOUR_OPTIONS.map((option) => (
                                                    <SelectItem key={option.value} value={option.value.toString()}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>
                )}

                {/* Tipos de Notificação */}
                <Card className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <AlertCircle className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold">Tipos de Notificação</h2>
                            <p className="text-sm text-muted-foreground">
                                Escolha quais notificações deseja receber
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {filteredNotificationTypes.map((type, index) => {
                            const Icon = type.icon;
                            const isEnabled = preferences?.[type.key as keyof typeof preferences] ?? true;

                            return (
                                <div key={type.key}>
                                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className={cn('p-2 rounded-lg bg-background', type.color)}>
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <Label className="text-sm font-medium">{type.label}</Label>
                                                <p className="text-xs text-muted-foreground">
                                                    {type.description}
                                                </p>
                                            </div>
                                        </div>
                                        <Switch
                                            checked={isEnabled as boolean}
                                            onCheckedChange={(checked) =>
                                                updatePreference(type.key as keyof typeof preferences, checked)
                                            }
                                        />
                                    </div>
                                    {index < filteredNotificationTypes.length - 1 && (
                                        <Separator className="my-1" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </Card>

                {/* Ações */}
                <div className="flex items-center justify-between p-4 bg-card border rounded-lg sticky bottom-4">
                    <Button
                        variant="outline"
                        onClick={resetToDefaults}
                        disabled={saving}
                    >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Restaurar padrões
                    </Button>

                    <div className="flex items-center gap-3">
                        {hasChanges && (
                            <span className="text-sm text-muted-foreground">
                                Alterações não salvas
                            </span>
                        )}
                        <Button
                            onClick={savePreferences}
                            disabled={saving || !hasChanges}
                        >
                            {saving ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4 mr-2" />
                            )}
                            Salvar preferências
                        </Button>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
