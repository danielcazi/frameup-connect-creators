import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { useToast } from '@/hooks/use-toast';
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
    Briefcase,
    DollarSign,
    AlertTriangle,
    Ban,
    Shield,
    FileText,
    TrendingUp,
    TrendingDown,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    MoreVertical,
    CreditCard,
    Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { getUserFullDetails, banUser, unbanUser, issueWarning } from '@/services/adminUsers';
import type { UserFullDetails } from '@/services/adminUsers';

export default function UserDetails() {
    const { userId } = useParams();
    const navigate = useNavigate();
    const { admin, hasPermission } = useAdmin();
    const { toast } = useToast();

    const [user, setUser] = useState<UserFullDetails | null>(null);
    const [loading, setLoading] = useState(true);
    
    // Modals
    const [showBanModal, setShowBanModal] = useState(false);
    const [showWarningModal, setShowWarningModal] = useState(false);
    const [banReason, setBanReason] = useState('');
    const [warningType, setWarningType] = useState('');
    const [warningSeverity, setWarningSeverity] = useState<'low' | 'medium' | 'high'>('medium');
    const [warningReason, setWarningReason] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        if (userId) {
            loadUserData();
        }
    }, [userId]);

    const loadUserData = async () => {
        try {
            setLoading(true);
            const data = await getUserFullDetails(userId!);
            if (data) {
                setUser(data);
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Erro',
                    description: 'Usuário não encontrado.'
                });
                navigate('/admin/users');
            }
        } catch (error) {
            console.error('Erro ao carregar usuário:', error);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Erro ao carregar dados do usuário.'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleBanUser = async () => {
        if (!admin || !userId || !banReason.trim()) return;
        
        setActionLoading(true);
        try {
            const isBanned = user?.metadata?.is_banned;
            
            if (isBanned) {
                const result = await unbanUser(userId, admin.id);
                if (result.success) {
                    toast({ title: 'Sucesso', description: 'Usuário desbanido com sucesso.' });
                    loadUserData();
                } else {
                    throw new Error(result.error);
                }
            } else {
                const result = await banUser(userId, admin.id, banReason);
                if (result.success) {
                    toast({ title: 'Sucesso', description: 'Usuário banido com sucesso.' });
                    loadUserData();
                } else {
                    throw new Error(result.error);
                }
            }
            setShowBanModal(false);
            setBanReason('');
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: error.message || 'Erro ao executar ação.'
            });
        } finally {
            setActionLoading(false);
        }
    };

    const handleIssueWarning = async () => {
        if (!admin || !userId || !warningType || !warningReason.trim()) return;
        
        setActionLoading(true);
        try {
            const result = await issueWarning(
                userId,
                admin.id,
                warningType,
                warningSeverity,
                warningReason
            );
            
            if (result.success) {
                toast({ title: 'Sucesso', description: 'Advertência emitida com sucesso.' });
                loadUserData();
                setShowWarningModal(false);
                setWarningType('');
                setWarningSeverity('medium');
                setWarningReason('');
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: error.message || 'Erro ao emitir advertência.'
            });
        } finally {
            setActionLoading(false);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const getStatusBadge = (status: string) => {
        const configs: Record<string, string> = {
            open: 'bg-yellow-100 text-yellow-800',
            in_progress: 'bg-blue-100 text-blue-800',
            in_review: 'bg-purple-100 text-purple-800',
            completed: 'bg-green-100 text-green-800',
            cancelled: 'bg-red-100 text-red-800',
        };
        return configs[status] || 'bg-gray-100 text-gray-800';
    };

    const getPaymentStatusBadge = (status: string) => {
        const configs: Record<string, string> = {
            pending: 'bg-yellow-100 text-yellow-800',
            paid: 'bg-green-100 text-green-800',
            held: 'bg-blue-100 text-blue-800',
            released: 'bg-green-100 text-green-800',
            refunded: 'bg-red-100 text-red-800',
        };
        return configs[status] || 'bg-gray-100 text-gray-800';
    };

    if (loading) {
        return (
            <div className="p-6 max-w-7xl mx-auto">
                <div className="flex items-center gap-4 mb-6">
                    <Skeleton className="h-10 w-10" />
                    <Skeleton className="h-8 w-64" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <Skeleton className="h-[400px]" />
                    <Skeleton className="h-[400px] lg:col-span-3" />
                </div>
            </div>
        );
    }

    if (!user) return null;

    const isBanned = user.metadata?.is_banned || false;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/admin/users')}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                            user.profile.user_type === 'creator' ? 'bg-blue-500' : 'bg-purple-500'
                        }`}>
                            {user.profile.full_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold text-gray-900">{user.profile.full_name}</h1>
                                <Badge className={user.profile.user_type === 'creator' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}>
                                    {user.profile.user_type === 'creator' ? 'Creator' : 'Editor'}
                                </Badge>
                                {isBanned && (
                                    <Badge variant="destructive">Banido</Badge>
                                )}
                            </div>
                            <p className="text-sm text-gray-500">{user.profile.email}</p>
                        </div>
                    </div>
                </div>

                {/* Actions Dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline">
                            <MoreVertical className="w-4 h-4 mr-2" />
                            Ações
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {hasPermission('ban_users') && (
                            <DropdownMenuItem onClick={() => setShowBanModal(true)}>
                                <Ban className="w-4 h-4 mr-2" />
                                {isBanned ? 'Desbanir Usuário' : 'Banir Usuário'}
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => setShowWarningModal(true)}>
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            Emitir Advertência
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem disabled>
                            <FileText className="w-4 h-4 mr-2" />
                            Ver Logs de Ações
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Main Content: Sidebar + Tabs */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Sidebar */}
                <div className="space-y-4">
                    {/* Profile Info */}
                    <Card className="p-4">
                        <h3 className="font-semibold text-gray-900 mb-3">Informações</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex items-center gap-2 text-gray-600">
                                <Mail className="w-4 h-4" />
                                <span className="truncate">{user.profile.email}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                                <Phone className="w-4 h-4" />
                                <span>{user.profile.phone || 'Não informado'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                                <Calendar className="w-4 h-4" />
                                <span>Cadastro: {format(new Date(user.profile.created_at), 'dd/MM/yyyy', { locale: ptBR })}</span>
                            </div>
                            {user.editor_profile?.city && (
                                <div className="flex items-center gap-2 text-gray-600">
                                    <MapPin className="w-4 h-4" />
                                    <span>{user.editor_profile.city}, {user.editor_profile.state}</span>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Stats */}
                    <Card className="p-4">
                        <h3 className="font-semibold text-gray-900 mb-3">Estatísticas</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Total de Projetos</span>
                                <span className="font-medium">{user.stats.total_projects}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Concluídos</span>
                                <span className="font-medium text-green-600">{user.stats.completed_projects}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Cancelados</span>
                                <span className="font-medium text-red-600">{user.stats.cancelled_projects}</span>
                            </div>
                            {user.stats.average_rating > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Avaliação Média</span>
                                    <span className="font-medium flex items-center gap-1">
                                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                        {user.stats.average_rating.toFixed(1)}
                                    </span>
                                </div>
                            )}
                            <div className="border-t pt-2 mt-2">
                                {user.profile.user_type === 'creator' ? (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Total Gasto</span>
                                        <span className="font-medium">{formatCurrency(user.stats.total_spent)}</span>
                                    </div>
                                ) : (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Total Recebido</span>
                                        <span className="font-medium text-green-600">{formatCurrency(user.stats.total_earned)}</span>
                                    </div>
                                )}
                                {user.stats.payment_held > 0 && (
                                    <div className="flex justify-between mt-1">
                                        <span className="text-gray-600">Valor Retido</span>
                                        <span className="font-medium text-orange-600">{formatCurrency(user.stats.payment_held)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>

                    {/* Alerts */}
                    {(user.stats.open_disputes > 0 || (user.metadata?.total_warnings || 0) > 0) && (
                        <Card className="p-4 border-orange-200 bg-orange-50">
                            <h3 className="font-semibold text-orange-800 mb-3 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" />
                                Alertas
                            </h3>
                            <div className="space-y-2 text-sm">
                                {user.stats.open_disputes > 0 && (
                                    <div className="flex justify-between text-orange-700">
                                        <span>Disputas Abertas</span>
                                        <Badge variant="outline" className="border-orange-300 text-orange-700">
                                            {user.stats.open_disputes}
                                        </Badge>
                                    </div>
                                )}
                                {(user.metadata?.total_warnings || 0) > 0 && (
                                    <div className="flex justify-between text-orange-700">
                                        <span>Advertências</span>
                                        <Badge variant="outline" className="border-orange-300 text-orange-700">
                                            {user.metadata?.total_warnings}
                                        </Badge>
                                    </div>
                                )}
                            </div>
                        </Card>
                    )}

                    {/* Subscription (Editor only) */}
                    {user.profile.user_type === 'editor' && user.subscription && (
                        <Card className="p-4">
                            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <CreditCard className="w-4 h-4" />
                                Assinatura
                            </h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Plano</span>
                                    <span className="font-medium">{user.subscription.plan_name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Status</span>
                                    <Badge className={user.subscription.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                                        {user.subscription.status === 'active' ? 'Ativa' : user.subscription.status}
                                    </Badge>
                                </div>
                                {user.subscription.current_period_end && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Expira em</span>
                                        <span className="text-xs">{format(new Date(user.subscription.current_period_end), 'dd/MM/yyyy', { locale: ptBR })}</span>
                                    </div>
                                )}
                            </div>
                        </Card>
                    )}
                </div>

                {/* Tabs Content */}
                <div className="lg:col-span-3">
                    <Tabs defaultValue="projects" className="space-y-4">
                        <TabsList>
                            <TabsTrigger value="projects" className="flex items-center gap-2">
                                <Briefcase className="w-4 h-4" />
                                Projetos
                            </TabsTrigger>
                            <TabsTrigger value="financial" className="flex items-center gap-2">
                                <DollarSign className="w-4 h-4" />
                                Financeiro
                            </TabsTrigger>
                            <TabsTrigger value="disputes" className="flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                Disputas
                            </TabsTrigger>
                            <TabsTrigger value="history" className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                Histórico
                            </TabsTrigger>
                        </TabsList>

                        {/* Projects Tab */}
                        <TabsContent value="projects">
                            <Card className="p-4">
                                <h3 className="font-semibold mb-4">Projetos ({user.projects.length})</h3>
                                {user.projects.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        <Briefcase className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                        <p>Nenhum projeto encontrado</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {user.projects.map((project) => (
                                            <div
                                                key={project.id}
                                                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                                                onClick={() => navigate(`/admin/projects/${project.id}`)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Badge variant="outline" className="text-xs">
                                                        {project.role === 'creator' ? 'Criador' : 'Editor'}
                                                    </Badge>
                                                    <div>
                                                        <p className="font-medium text-gray-900">{project.title}</p>
                                                        <p className="text-xs text-gray-500">
                                                            {project.other_party ? `com ${project.other_party.name}` : 'Sem atribuição'} • {formatCurrency(project.base_price)}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge className={getStatusBadge(project.status)}>
                                                        {project.status}
                                                    </Badge>
                                                    <Eye className="w-4 h-4 text-gray-400" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Card>
                        </TabsContent>

                        {/* Financial Tab */}
                        <TabsContent value="financial">
                            <Card className="p-4">
                                <h3 className="font-semibold mb-4">Transações ({user.transactions.length})</h3>
                                {user.transactions.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                        <p>Nenhuma transação encontrada</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {user.transactions.map((tx) => (
                                            <div key={tx.id} className="flex items-center justify-between p-3 border rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                                        tx.type === 'editor_payout' ? 'bg-green-100' :
                                                        tx.type === 'refund' ? 'bg-red-100' : 'bg-blue-100'
                                                    }`}>
                                                        {tx.type === 'editor_payout' ? (
                                                            <TrendingUp className="w-5 h-5 text-green-600" />
                                                        ) : tx.type === 'refund' ? (
                                                            <TrendingDown className="w-5 h-5 text-red-600" />
                                                        ) : (
                                                            <DollarSign className="w-5 h-5 text-blue-600" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900 capitalize">
                                                            {tx.type.replace(/_/g, ' ')}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            {tx.project_title || tx.description || 'Sem descrição'} • {format(new Date(tx.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`font-semibold ${tx.type === 'refund' ? 'text-red-600' : 'text-gray-900'}`}>
                                                        {tx.type === 'refund' ? '-' : ''}{formatCurrency(tx.amount)}
                                                    </p>
                                                    <Badge className={getPaymentStatusBadge(tx.status)} variant="outline">
                                                        {tx.status}
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Card>
                        </TabsContent>

                        {/* Disputes Tab */}
                        <TabsContent value="disputes">
                            <Card className="p-4">
                                <h3 className="font-semibold mb-4">Disputas ({user.disputes.length})</h3>
                                {user.disputes.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                        <p>Nenhuma disputa encontrada</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {user.disputes.map((dispute) => (
                                            <div
                                                key={dispute.id}
                                                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                                                onClick={() => navigate(`/admin/disputes/${dispute.id}`)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Badge variant="outline" className={dispute.role === 'opener' ? 'border-blue-300 text-blue-700' : 'border-orange-300 text-orange-700'}>
                                                        {dispute.role === 'opener' ? 'Abriu' : 'Disputado'}
                                                    </Badge>
                                                    <div>
                                                        <p className="font-medium text-gray-900">{dispute.title}</p>
                                                        <p className="text-xs text-gray-500">
                                                            {dispute.other_party?.name || 'N/A'} • {dispute.project?.title || 'Projeto N/A'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge className={
                                                        dispute.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                                                        dispute.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                                        'bg-gray-100 text-gray-800'
                                                    }>
                                                        {dispute.priority}
                                                    </Badge>
                                                    <Badge variant="outline">{dispute.status}</Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Card>
                        </TabsContent>

                        {/* History Tab */}
                        <TabsContent value="history">
                            <div className="space-y-4">
                                {/* Warnings */}
                                <Card className="p-4">
                                    <h3 className="font-semibold mb-4">Advertências ({user.warnings.length})</h3>
                                    {user.warnings.length === 0 ? (
                                        <div className="text-center py-6 text-gray-500">
                                            <Shield className="w-10 h-10 mx-auto mb-2 opacity-20" />
                                            <p>Nenhuma advertência</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {user.warnings.map((warning) => (
                                                <div key={warning.id} className={`p-3 border rounded-lg ${
                                                    warning.severity === 'high' ? 'border-red-200 bg-red-50' :
                                                    warning.severity === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                                                    'border-blue-200 bg-blue-50'
                                                }`}>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <Badge className={
                                                                warning.severity === 'high' ? 'bg-red-100 text-red-800' :
                                                                warning.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                                                'bg-blue-100 text-blue-800'
                                                            }>
                                                                {warning.severity.toUpperCase()}
                                                            </Badge>
                                                            <span className="font-medium capitalize">{warning.warning_type.replace(/_/g, ' ')}</span>
                                                        </div>
                                                        {!warning.is_active && (
                                                            <Badge variant="outline">Expirada</Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-700">{warning.reason}</p>
                                                    <p className="text-xs text-gray-500 mt-2">
                                                        {format(new Date(warning.issued_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </Card>

                                {/* Reviews */}
                                <Card className="p-4">
                                    <h3 className="font-semibold mb-4">Avaliações Recebidas ({user.reviews.length})</h3>
                                    {user.reviews.length === 0 ? (
                                        <div className="text-center py-6 text-gray-500">
                                            <Star className="w-10 h-10 mx-auto mb-2 opacity-20" />
                                            <p>Nenhuma avaliação</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {user.reviews.map((review) => (
                                                <div key={review.id} className="p-3 border rounded-lg">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex items-center">
                                                                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                                                <span className="font-semibold ml-1">{review.rating_overall.toFixed(1)}</span>
                                                            </div>
                                                            <span className="text-sm text-gray-500">por {review.reviewer_name || 'Usuário'}</span>
                                                        </div>
                                                        <span className="text-xs text-gray-500">
                                                            {format(new Date(review.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                                                        </span>
                                                    </div>
                                                    {review.comment && (
                                                        <p className="text-sm text-gray-700 mb-2">"{review.comment}"</p>
                                                    )}
                                                    <p className="text-xs text-gray-500">Projeto: {review.project_title || 'N/A'}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </Card>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            {/* Ban Modal */}
            <Dialog open={showBanModal} onOpenChange={setShowBanModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{isBanned ? 'Desbanir Usuário' : 'Banir Usuário'}</DialogTitle>
                        <DialogDescription>
                            {isBanned 
                                ? 'O usuário poderá acessar a plataforma novamente.'
                                : 'O usuário será impedido de acessar a plataforma.'}
                        </DialogDescription>
                    </DialogHeader>
                    {!isBanned && (
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Motivo do banimento *</Label>
                                <Textarea
                                    placeholder="Descreva o motivo do banimento..."
                                    value={banReason}
                                    onChange={(e) => setBanReason(e.target.value)}
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowBanModal(false)}>
                            Cancelar
                        </Button>
                        <Button 
                            variant={isBanned ? 'default' : 'destructive'}
                            onClick={handleBanUser}
                            disabled={actionLoading || (!isBanned && !banReason.trim())}
                        >
                            {actionLoading ? 'Processando...' : (isBanned ? 'Desbanir' : 'Banir Usuário')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Warning Modal */}
            <Dialog open={showWarningModal} onOpenChange={setShowWarningModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Emitir Advertência</DialogTitle>
                        <DialogDescription>
                            Esta advertência ficará registrada no histórico do usuário.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Tipo de Advertência *</Label>
                            <Select value={warningType} onValueChange={setWarningType}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="comportamento_inadequado">Comportamento Inadequado</SelectItem>
                                    <SelectItem value="atraso_entregas">Atraso em Entregas</SelectItem>
                                    <SelectItem value="comunicacao_ofensiva">Comunicação Ofensiva</SelectItem>
                                    <SelectItem value="fraude_tentativa">Tentativa de Fraude</SelectItem>
                                    <SelectItem value="spam">Spam</SelectItem>
                                    <SelectItem value="cancelamentos_excessivos">Cancelamentos Excessivos</SelectItem>
                                    <SelectItem value="outro">Outro</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Severidade *</Label>
                            <Select value={warningSeverity} onValueChange={(v) => setWarningSeverity(v as 'low' | 'medium' | 'high')}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">Baixa</SelectItem>
                                    <SelectItem value="medium">Média</SelectItem>
                                    <SelectItem value="high">Alta</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Motivo *</Label>
                            <Textarea
                                placeholder="Descreva o motivo da advertência..."
                                value={warningReason}
                                onChange={(e) => setWarningReason(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowWarningModal(false)}>
                            Cancelar
                        </Button>
                        <Button 
                            onClick={handleIssueWarning}
                            disabled={actionLoading || !warningType || !warningReason.trim()}
                        >
                            {actionLoading ? 'Processando...' : 'Emitir Advertência'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
