import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import {
    getUserFullDetails,
    UserFullDetails,
    banUser,
    unbanUser,
    issueWarning,
} from '@/services/adminUsers';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    ArrowLeft,
    User,
    Mail,
    Phone,
    Calendar,
    MapPin,
    Star,
    Ban,
    Shield,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Clock,
    DollarSign,
    Briefcase,
    MessageSquare,
    FileText,
    TrendingUp,
    TrendingDown,
    ExternalLink,
    MoreVertical,
    AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

export default function UserDetails() {
    const { userId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const { admin, hasPermission } = useAdmin();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<UserFullDetails | null>(null);
    const [activeTab, setActiveTab] = useState('projects');

    // Modais
    const [showBanModal, setShowBanModal] = useState(false);
    const [showWarningModal, setShowWarningModal] = useState(false);
    const [banReason, setBanReason] = useState('');
    const [warningType, setWarningType] = useState('');
    const [warningSeverity, setWarningSeverity] = useState<'low' | 'medium' | 'high'>('medium');
    const [warningReason, setWarningReason] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        if (userId) {
            loadUserDetails();
        }
    }, [userId]);

    const loadUserDetails = async () => {
        setLoading(true);
        try {
            const data = await getUserFullDetails(userId!);
            setUser(data);
        } catch (error) {
            console.error('Erro ao carregar usuário:', error);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Não foi possível carregar os dados do usuário.',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleBanUser = async () => {
        if (!banReason.trim()) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Informe o motivo do banimento.' });
            return;
        }

        setActionLoading(true);
        try {
            const result = await banUser(userId!, admin!.id, banReason);
            if (result.success) {
                toast({ title: 'Sucesso', description: 'Usuário banido com sucesso.' });
                setShowBanModal(false);
                setBanReason('');
                loadUserDetails();
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Erro', description: error.message });
        } finally {
            setActionLoading(false);
        }
    };

    const handleUnbanUser = async () => {
        setActionLoading(true);
        try {
            const result = await unbanUser(userId!, admin!.id);
            if (result.success) {
                toast({ title: 'Sucesso', description: 'Usuário desbanido com sucesso.' });
                loadUserDetails();
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Erro', description: error.message });
        } finally {
            setActionLoading(false);
        }
    };

    const handleIssueWarning = async () => {
        if (!warningType || !warningReason.trim()) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Preencha todos os campos.' });
            return;
        }

        setActionLoading(true);
        try {
            const result = await issueWarning(userId!, admin!.id, warningType, warningSeverity, warningReason);
            if (result.success) {
                toast({ title: 'Sucesso', description: 'Advertência emitida com sucesso.' });
                setShowWarningModal(false);
                setWarningType('');
                setWarningReason('');
                loadUserDetails();
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Erro', description: error.message });
        } finally {
            setActionLoading(false);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value);
    };

    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { color: string; label: string }> = {
            open: { color: 'bg-blue-100 text-blue-800', label: 'Aberto' },
            in_progress: { color: 'bg-yellow-100 text-yellow-800', label: 'Em Andamento' },
            in_review: { color: 'bg-purple-100 text-purple-800', label: 'Em Revisão' },
            completed: { color: 'bg-green-100 text-green-800', label: 'Concluído' },
            cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelado' },
            pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pendente' },
            paid: { color: 'bg-green-100 text-green-800', label: 'Pago' },
            held: { color: 'bg-orange-100 text-orange-800', label: 'Retido' },
            released: { color: 'bg-green-100 text-green-800', label: 'Liberado' },
            refunded: { color: 'bg-red-100 text-red-800', label: 'Reembolsado' },
            investigating: { color: 'bg-yellow-100 text-yellow-800', label: 'Investigando' },
            resolved: { color: 'bg-green-100 text-green-800', label: 'Resolvida' },
            closed: { color: 'bg-gray-100 text-gray-800', label: 'Fechada' },
        };
        const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', label: status };
        return <Badge className={config.color}>{config.label}</Badge>;
    };

    if (loading) {
        return (
            <div className="p-6 max-w-7xl mx-auto">
                <Skeleton className="h-8 w-48 mb-6" />
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <Skeleton className="h-96" />
                    <div className="lg:col-span-3">
                        <Skeleton className="h-96" />
                    </div>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="p-6 max-w-7xl mx-auto">
                <div className="text-center py-12">
                    <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900">Usuário não encontrado</h2>
                    <p className="text-gray-500 mt-2">O usuário solicitado não existe ou foi removido.</p>
                    <Button onClick={() => navigate('/admin/users')} className="mt-4">
                        Voltar para lista
                    </Button>
                </div>
            </div>
        );
    }

    const isBanned = user.metadata?.is_banned || false;

    return (
        <div className="p-4 lg:p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => navigate('/admin/users')}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Voltar
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{user.profile.full_name}</h1>
                        <p className="text-sm text-gray-500">
                            {user.profile.user_type === 'creator' ? 'Criador de Conteúdo' : 'Editor de Vídeo'}
                        </p>
                    </div>
                </div>

                {/* Ações */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline">
                            <MoreVertical className="w-4 h-4 mr-2" />
                            Ações
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {hasPermission('ban_users') && (
                            <>
                                {isBanned ? (
                                    <DropdownMenuItem onClick={handleUnbanUser} disabled={actionLoading}>
                                        <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                                        Remover Banimento
                                    </DropdownMenuItem>
                                ) : (
                                    <DropdownMenuItem onClick={() => setShowBanModal(true)}>
                                        <Ban className="w-4 h-4 mr-2 text-red-600" />
                                        Banir Usuário
                                    </DropdownMenuItem>
                                )}
                            </>
                        )}
                        <DropdownMenuItem onClick={() => setShowWarningModal(true)}>
                            <AlertTriangle className="w-4 h-4 mr-2 text-yellow-600" />
                            Emitir Advertência
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => navigate(`/admin/users/${userId}/logs`)}>
                            <FileText className="w-4 h-4 mr-2" />
                            Ver Logs de Ações
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Alert se banido */}
            {isBanned && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                    <Ban className="w-5 h-5 text-red-600 mt-0.5" />
                    <div>
                        <h3 className="font-medium text-red-800">Usuário Banido</h3>
                        <p className="text-sm text-red-600 mt-1">{user.metadata?.ban_reason || 'Motivo não informado'}</p>
                        {user.metadata?.banned_at && (
                            <p className="text-xs text-red-500 mt-1">
                                Banido em {format(new Date(user.metadata.banned_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Layout principal: Sidebar + Conteúdo */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Sidebar - Informações do Perfil */}
                <div className="lg:col-span-1 space-y-4">
                    {/* Card de Perfil */}
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-center mb-4">
                                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3">
                                    {user.profile.full_name.charAt(0).toUpperCase()}
                                </div>
                                <Badge className={user.profile.user_type === 'creator' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}>
                                    {user.profile.user_type === 'creator' ? 'Creator' : 'Editor'}
                                </Badge>
                            </div>

                            <div className="space-y-3 text-sm">
                                <div className="flex items-center gap-2 text-gray-600">
                                    <Mail className="w-4 h-4" />
                                    <span className="truncate">{user.profile.email}</span>
                                </div>
                                {user.profile.phone && (
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <Phone className="w-4 h-4" />
                                        <span>{user.profile.phone}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2 text-gray-600">
                                    <Calendar className="w-4 h-4" />
                                    <span>Desde {format(new Date(user.profile.created_at), 'MMM yyyy', { locale: ptBR })}</span>
                                </div>
                                {user.editor_profile?.city && (
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <MapPin className="w-4 h-4" />
                                        <span>{user.editor_profile.city}, {user.editor_profile.state}</span>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Card de Estatísticas */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600">Estatísticas</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Projetos</span>
                                <span className="font-semibold">{user.stats.total_projects}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Concluídos</span>
                                <span className="font-semibold text-green-600">{user.stats.completed_projects}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Cancelados</span>
                                <span className="font-semibold text-red-600">{user.stats.cancelled_projects}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Avaliação</span>
                                <div className="flex items-center gap-1">
                                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                    <span className="font-semibold">{user.stats.average_rating.toFixed(1)}</span>
                                </div>
                            </div>
                            {user.profile.user_type === 'creator' && (
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Total Gasto</span>
                                    <span className="font-semibold">{formatCurrency(user.stats.total_spent)}</span>
                                </div>
                            )}
                            {user.profile.user_type === 'editor' && (
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Total Ganho</span>
                                    <span className="font-semibold text-green-600">{formatCurrency(user.stats.total_earned)}</span>
                                </div>
                            )}
                            {user.stats.payment_held > 0 && (
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Retido</span>
                                    <span className="font-semibold text-orange-600">{formatCurrency(user.stats.payment_held)}</span>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Card de Alertas */}
                    {(user.stats.open_disputes > 0 || user.warnings.filter(w => w.is_active).length > 0) && (
                        <Card className="border-yellow-200 bg-yellow-50">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-yellow-800 flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" />
                                    Alertas
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                {user.stats.open_disputes > 0 && (
                                    <div className="text-yellow-800">
                                        {user.stats.open_disputes} disputa(s) em aberto
                                    </div>
                                )}
                                {user.warnings.filter(w => w.is_active).length > 0 && (
                                    <div className="text-yellow-800">
                                        {user.warnings.filter(w => w.is_active).length} advertência(s) ativa(s)
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Assinatura (se editor) */}
                    {user.subscription && (
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-gray-600">Assinatura</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-semibold">{user.subscription.plan_name}</span>
                                    {getStatusBadge(user.subscription.status)}
                                </div>
                                <p className="text-xs text-gray-500">
                                    Válida até {format(new Date(user.subscription.current_period_end), 'dd/MM/yyyy')}
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Conteúdo Principal - Tabs */}
                <div className="lg:col-span-3">
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="grid grid-cols-4 mb-4">
                            <TabsTrigger value="projects" className="flex items-center gap-2">
                                <Briefcase className="w-4 h-4" />
                                <span className="hidden sm:inline">Projetos</span>
                            </TabsTrigger>
                            <TabsTrigger value="financial" className="flex items-center gap-2">
                                <DollarSign className="w-4 h-4" />
                                <span className="hidden sm:inline">Financeiro</span>
                            </TabsTrigger>
                            <TabsTrigger value="disputes" className="flex items-center gap-2">
                                <MessageSquare className="w-4 h-4" />
                                <span className="hidden sm:inline">Disputas</span>
                                {user.stats.open_disputes > 0 && (
                                    <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 justify-center">
                                        {user.stats.open_disputes}
                                    </Badge>
                                )}
                            </TabsTrigger>
                            <TabsTrigger value="history" className="flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                <span className="hidden sm:inline">Histórico</span>
                            </TabsTrigger>
                        </TabsList>

                        {/* Tab: Projetos */}
                        <TabsContent value="projects">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Histórico de Projetos</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {user.projects.length === 0 ? (
                                        <div className="text-center py-8 text-gray-500">
                                            <Briefcase className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                                            <p>Nenhum projeto encontrado</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {user.projects.map((project) => (
                                                <div
                                                    key={project.id}
                                                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                                                    onClick={() => navigate(`/admin/projects/${project.id}`)}
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h4 className="font-medium text-gray-900 truncate">{project.title}</h4>
                                                            <Badge variant="outline" className="text-xs">
                                                                {project.role === 'creator' ? 'Como Creator' : 'Como Editor'}
                                                            </Badge>
                                                        </div>
                                                        <div className="flex items-center gap-4 text-sm text-gray-500">
                                                            <span>{formatCurrency(project.base_price)}</span>
                                                            {project.other_party && (
                                                                <span>
                                                                    {project.role === 'creator' ? 'Editor: ' : 'Creator: '}
                                                                    {project.other_party.name}
                                                                </span>
                                                            )}
                                                            <span>{format(new Date(project.created_at), 'dd/MM/yyyy')}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {getStatusBadge(project.status)}
                                                        <ExternalLink className="w-4 h-4 text-gray-400" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Tab: Financeiro */}
                        <TabsContent value="financial">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Movimentações Financeiras</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {user.transactions.length === 0 ? (
                                        <div className="text-center py-8 text-gray-500">
                                            <DollarSign className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                                            <p>Nenhuma transação encontrada</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {user.transactions.map((tx) => (
                                                <div key={tx.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'project_payment' || tx.type === 'subscription_payment'
                                                                ? 'bg-green-100'
                                                                : tx.type === 'refund'
                                                                    ? 'bg-red-100'
                                                                    : 'bg-blue-100'
                                                            }`}>
                                                            {tx.type === 'project_payment' || tx.type === 'editor_payout' ? (
                                                                <TrendingUp className={`w-5 h-5 ${tx.type === 'project_payment' ? 'text-green-600' : 'text-blue-600'
                                                                    }`} />
                                                            ) : tx.type === 'refund' ? (
                                                                <TrendingDown className="w-5 h-5 text-red-600" />
                                                            ) : (
                                                                <DollarSign className="w-5 h-5 text-blue-600" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-gray-900">
                                                                {tx.type === 'project_payment' && 'Pagamento de Projeto'}
                                                                {tx.type === 'editor_payout' && 'Repasse para Editor'}
                                                                {tx.type === 'subscription_payment' && 'Pagamento de Assinatura'}
                                                                {tx.type === 'refund' && 'Reembolso'}
                                                                {tx.type === 'platform_fee' && 'Taxa da Plataforma'}
                                                            </p>
                                                            <p className="text-sm text-gray-500">
                                                                {tx.project_title && <span>{tx.project_title} • </span>}
                                                                {format(new Date(tx.created_at), "dd/MM/yyyy 'às' HH:mm")}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className={`font-semibold ${tx.type === 'refund' ? 'text-red-600' : 'text-gray-900'
                                                            }`}>
                                                            {tx.type === 'refund' ? '-' : ''}{formatCurrency(tx.amount)}
                                                        </p>
                                                        {getStatusBadge(tx.status)}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Tab: Disputas */}
                        <TabsContent value="disputes">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Disputas</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {user.disputes.length === 0 ? (
                                        <div className="text-center py-8 text-gray-500">
                                            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                                            <p>Nenhuma disputa encontrada</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {user.disputes.map((dispute) => (
                                                <div
                                                    key={dispute.id}
                                                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                                                    onClick={() => navigate(`/admin/disputes/${dispute.id}`)}
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h4 className="font-medium text-gray-900 truncate">{dispute.title}</h4>
                                                            <Badge variant={dispute.role === 'opener' ? 'outline' : 'destructive'} className="text-xs">
                                                                {dispute.role === 'opener' ? 'Abriu' : 'Disputado'}
                                                            </Badge>
                                                        </div>
                                                        <div className="flex items-center gap-4 text-sm text-gray-500">
                                                            <span className="capitalize">{dispute.category.replace('_', ' ')}</span>
                                                            {dispute.other_party && (
                                                                <span>vs {dispute.other_party.name}</span>
                                                            )}
                                                            <span>{format(new Date(dispute.created_at), 'dd/MM/yyyy')}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Badge className={
                                                            dispute.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                                                                dispute.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                                                    dispute.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                                                        'bg-gray-100 text-gray-800'
                                                        }>
                                                            {dispute.priority}
                                                        </Badge>
                                                        {getStatusBadge(dispute.status)}
                                                        <ExternalLink className="w-4 h-4 text-gray-400" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Tab: Histórico */}
                        <TabsContent value="history">
                            <div className="space-y-6">
                                {/* Advertências */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <AlertTriangle className="w-5 h-5 text-yellow-600" />
                                            Advertências
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {user.warnings.length === 0 ? (
                                            <p className="text-gray-500 text-center py-4">Nenhuma advertência registrada</p>
                                        ) : (
                                            <div className="space-y-3">
                                                {user.warnings.map((warning) => (
                                                    <div key={warning.id} className={`p-4 rounded-lg border ${warning.is_active
                                                            ? warning.severity === 'high'
                                                                ? 'bg-red-50 border-red-200'
                                                                : warning.severity === 'medium'
                                                                    ? 'bg-yellow-50 border-yellow-200'
                                                                    : 'bg-blue-50 border-blue-200'
                                                            : 'bg-gray-50 border-gray-200'
                                                        }`}>
                                                        <div className="flex items-start justify-between">
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-medium">{warning.warning_type}</span>
                                                                    <Badge className={
                                                                        warning.severity === 'high' ? 'bg-red-100 text-red-800' :
                                                                            warning.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                                                                'bg-blue-100 text-blue-800'
                                                                    }>
                                                                        {warning.severity}
                                                                    </Badge>
                                                                    {!warning.is_active && (
                                                                        <Badge variant="outline" className="text-gray-500">Expirada</Badge>
                                                                    )}
                                                                </div>
                                                                <p className="text-sm text-gray-600 mt-1">{warning.reason}</p>
                                                                <p className="text-xs text-gray-400 mt-2">
                                                                    Emitida em {format(new Date(warning.issued_at), "dd/MM/yyyy 'às' HH:mm")}
                                                                    {warning.issued_by_name && ` por ${warning.issued_by_name}`}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Avaliações */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Star className="w-5 h-5 text-yellow-500" />
                                            Avaliações Recebidas
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {user.reviews.length === 0 ? (
                                            <p className="text-gray-500 text-center py-4">Nenhuma avaliação recebida</p>
                                        ) : (
                                            <div className="space-y-4">
                                                {user.reviews.map((review) => (
                                                    <div key={review.id} className="p-4 bg-gray-50 rounded-lg">
                                                        <div className="flex items-start justify-between mb-2">
                                                            <div>
                                                                <p className="font-medium">{review.reviewer_name || 'Usuário Anônimo'}</p>
                                                                <p className="text-sm text-gray-500">{review.project_title}</p>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                                                                <span className="font-semibold">{review.rating_overall.toFixed(1)}</span>
                                                            </div>
                                                        </div>
                                                        {review.comment && (
                                                            <p className="text-sm text-gray-600 mb-2">"{review.comment}"</p>
                                                        )}
                                                        <div className="grid grid-cols-4 gap-2 text-xs text-gray-500">
                                                            <div>Comunicação: {review.rating_communication}/5</div>
                                                            <div>Qualidade: {review.rating_quality}/5</div>
                                                            <div>Prazo: {review.rating_deadline}/5</div>
                                                            <div>Profissionalismo: {review.rating_professionalism}/5</div>
                                                        </div>
                                                        <p className="text-xs text-gray-400 mt-2">
                                                            {format(new Date(review.created_at), "dd/MM/yyyy")}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            {/* Modal de Banimento */}
            <Dialog open={showBanModal} onOpenChange={setShowBanModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <Ban className="w-5 h-5" />
                            Banir Usuário
                        </DialogTitle>
                        <DialogDescription>
                            Esta ação irá impedir que {user.profile.full_name} acesse a plataforma.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <label className="text-sm font-medium text-gray-700">Motivo do banimento *</label>
                        <Textarea
                            value={banReason}
                            onChange={(e) => setBanReason(e.target.value)}
                            placeholder="Descreva o motivo do banimento..."
                            className="mt-2"
                            rows={4}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowBanModal(false)}>
                            Cancelar
                        </Button>
                        <Button variant="destructive" onClick={handleBanUser} disabled={actionLoading}>
                            {actionLoading ? 'Processando...' : 'Confirmar Banimento'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de Advertência */}
            <Dialog open={showWarningModal} onOpenChange={setShowWarningModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-yellow-600">
                            <AlertTriangle className="w-5 h-5" />
                            Emitir Advertência
                        </DialogTitle>
                        <DialogDescription>
                            Registrar uma advertência formal para {user.profile.full_name}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <label className="text-sm font-medium text-gray-700">Tipo de Advertência *</label>
                            <Select value={warningType} onValueChange={setWarningType}>
                                <SelectTrigger className="mt-2">
                                    <SelectValue placeholder="Selecione o tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="comportamento">Comportamento Inadequado</SelectItem>
                                    <SelectItem value="atraso">Atrasos Recorrentes</SelectItem>
                                    <SelectItem value="qualidade">Qualidade Insatisfatória</SelectItem>
                                    <SelectItem value="comunicacao">Falta de Comunicação</SelectItem>
                                    <SelectItem value="pagamento">Problemas de Pagamento</SelectItem>
                                    <SelectItem value="fraude">Tentativa de Fraude</SelectItem>
                                    <SelectItem value="outro">Outro</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700">Severidade *</label>
                            <Select value={warningSeverity} onValueChange={(v) => setWarningSeverity(v as any)}>
                                <SelectTrigger className="mt-2">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">Baixa</SelectItem>
                                    <SelectItem value="medium">Média</SelectItem>
                                    <SelectItem value="high">Alta</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700">Descrição *</label>
                            <Textarea
                                value={warningReason}
                                onChange={(e) => setWarningReason(e.target.value)}
                                placeholder="Descreva o motivo da advertência..."
                                className="mt-2"
                                rows={4}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowWarningModal(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleIssueWarning} disabled={actionLoading} className="bg-yellow-600 hover:bg-yellow-700">
                            {actionLoading ? 'Processando...' : 'Emitir Advertência'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
