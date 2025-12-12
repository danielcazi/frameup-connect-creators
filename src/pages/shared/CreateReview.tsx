import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import RatingStars from '@/components/ui/RatingStars';
import {
    Star,
    MessageSquare,
    Clock,
    Award,
    Users,
    Loader2,
    ArrowLeft,
    CheckCircle,
} from 'lucide-react';

interface Project {
    id: string;
    title: string;
    status: string;
    creator_id: string;
    assigned_editor_id: string;
    other_user: {
        id: string;
        full_name: string;
        username: string;
        profile_photo_url?: string;
    };
}

function CreateReview() {
    const { id } = useParams();
    const { user, userType } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();

    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [canReview, setCanReview] = useState(false);

    const [ratings, setRatings] = useState({
        communication: 0,
        quality: 0,
        deadline: 0,
        professionalism: 0,
    });
    const [comment, setComment] = useState('');

    useEffect(() => {
        if (user && id) {
            loadProject();
            checkCanReview();
        }
    }, [id, user]);

    async function loadProject() {
        try {
            const { data, error } = await supabase
                .from('projects')
                .select(`
          id,
          title,
          status,
          creator_id,
          assigned_editor_id,
          other_user:users!${userType === 'creator'
                        ? 'projects_assigned_editor_id_fkey'
                        : 'projects_creator_id_fkey'
                    } (
            id,
            full_name,
            username,
            profile_photo_url
          )
        `)
                .eq('id', id)
                .single();

            if (error) throw error;

            setProject(data);
        } catch (error) {
            console.error('Error loading project:', error);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Projeto não encontrado',
            });
            navigate(`/${userType}/dashboard`);
        } finally {
            setLoading(false);
        }
    }

    async function checkCanReview() {
        try {
            const { data, error } = await supabase.rpc('can_review_project', {
                p_project_id: id,
                p_user_id: user?.id,
            });

            if (error) throw error;

            const result = data && data[0];

            if (!result || !result.can_review) {
                toast({
                    variant: 'destructive',
                    title: 'Atenção',
                    description: result?.error_message || 'Você não pode avaliar este projeto.',
                });
                navigate(`/${userType}/dashboard`);
                return;
            }

            setCanReview(true);
        } catch (error) {
            console.error('Error checking review permission:', error);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        // Validar ratings
        if (Object.values(ratings).some(r => r === 0)) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Por favor, avalie todos os critérios',
            });
            return;
        }

        // Validar comentário (se fornecido)
        if (comment.trim() && comment.trim().length < 5) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Comentário deve ter pelo menos 5 caracteres',
            });
            return;
        }

        setSubmitting(true);

        try {
            const { data, error } = await supabase.rpc('create_review', {
                p_project_id: id,
                p_reviewer_id: user?.id,
                p_rating_communication: ratings.communication,
                p_rating_quality: ratings.quality,
                p_rating_deadline: ratings.deadline,
                p_rating_professionalism: ratings.professionalism,
                p_comment: comment.trim() || null,
            });

            if (error) throw error;

            const result = data && data[0];

            if (!result || !result.success) {
                throw new Error(result?.error_message || 'Erro ao enviar avaliação');
            }

            toast({
                title: 'Sucesso! ⭐',
                description: 'Avaliação enviada com sucesso!',
            });

            navigate(`/${userType}/dashboard`);
        } catch (error: any) {
            console.error('Error creating review:', error);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: error.message || 'Erro ao enviar avaliação',
            });
        } finally {
            setSubmitting(false);
        }
    }

    const overallRating =
        ratings.communication || ratings.quality || ratings.deadline || ratings.professionalism
            ? (
                (ratings.communication +
                    ratings.quality +
                    ratings.deadline +
                    ratings.professionalism) /
                4
            ).toFixed(1)
            : '0.0';

    const allRated = Object.values(ratings).every(r => r > 0);

    if (loading || !canReview) {
        return (
            <DashboardLayout
                userType={userType as 'creator' | 'editor'}
                title="Avaliar"
                subtitle="Carregando..."
            >
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout
            userType={userType as 'creator' | 'editor'}
            title="Avaliar Trabalho"
            subtitle={project?.title}
        >
            <div className="max-w-3xl mx-auto space-y-6">
                {/* Back Button */}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/${userType}/dashboard`)}
                    className="pl-0 hover:pl-2 transition-all"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar ao Dashboard
                </Button>

                {/* Header Card */}
                <Card>
                    <CardContent className="p-6">
                        <div className="text-center mb-6">
                            <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                                <Star className="w-10 h-10 text-white fill-white" />
                            </div>
                            <h2 className="text-2xl font-bold text-foreground mb-2">
                                Como foi trabalhar com {project?.other_user.full_name}?
                            </h2>
                            <p className="text-muted-foreground">
                                Sua avaliação ajuda a manter a qualidade da plataforma
                            </p>
                        </div>

                        {/* Overall Rating Display */}
                        <div className="bg-muted/50 rounded-lg p-6 text-center border">
                            <p className="text-sm text-muted-foreground mb-2">Avaliação Geral</p>
                            <p className="text-5xl font-bold text-foreground mb-2">{overallRating}</p>
                            <div className="flex justify-center">
                                <RatingStars
                                    value={parseFloat(overallRating)}
                                    readonly
                                    size="large"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Rating Form */}
                <form onSubmit={handleSubmit}>
                    <Card className="space-y-8">
                        <CardHeader>
                            <CardTitle className="text-xl font-semibold text-foreground">
                                Avalie os Critérios
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            {/* Communication */}
                            <div>
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-start gap-3">
                                        <MessageSquare className="w-5 h-5 text-primary mt-1" />
                                        <div>
                                            <p className="font-medium text-foreground">Comunicação</p>
                                            <p className="text-sm text-muted-foreground">
                                                Clareza, responsividade e profissionalismo na comunicação
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <RatingStars
                                    value={ratings.communication}
                                    onChange={(value) =>
                                        setRatings((prev) => ({ ...prev, communication: value }))
                                    }
                                    size="large"
                                    showValue
                                />
                            </div>

                            {/* Quality */}
                            <div className="pt-6 border-t">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-start gap-3">
                                        <Award className="w-5 h-5 text-primary mt-1" />
                                        <div>
                                            <p className="font-medium text-foreground">Qualidade</p>
                                            <p className="text-sm text-muted-foreground">
                                                Resultado final e atenção aos detalhes
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <RatingStars
                                    value={ratings.quality}
                                    onChange={(value) =>
                                        setRatings((prev) => ({ ...prev, quality: value }))
                                    }
                                    size="large"
                                    showValue
                                />
                            </div>

                            {/* Deadline */}
                            <div className="pt-6 border-t">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-start gap-3">
                                        <Clock className="w-5 h-5 text-primary mt-1" />
                                        <div>
                                            <p className="font-medium text-foreground">Prazo</p>
                                            <p className="text-sm text-muted-foreground">
                                                Entrega dentro do prazo combinado
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <RatingStars
                                    value={ratings.deadline}
                                    onChange={(value) =>
                                        setRatings((prev) => ({ ...prev, deadline: value }))
                                    }
                                    size="large"
                                    showValue
                                />
                            </div>

                            {/* Professionalism */}
                            <div className="pt-6 border-t">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-start gap-3">
                                        <Users className="w-5 h-5 text-primary mt-1" />
                                        <div>
                                            <p className="font-medium text-foreground">Profissionalismo</p>
                                            <p className="text-sm text-muted-foreground">
                                                Conduta geral e feedback construtivo
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <RatingStars
                                    value={ratings.professionalism}
                                    onChange={(value) =>
                                        setRatings((prev) => ({ ...prev, professionalism: value }))
                                    }
                                    size="large"
                                    showValue
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Comment */}
                    <Card className="mt-6">
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold text-foreground">
                                Comentário (opcional)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Compartilhe sua experiência trabalhando neste projeto..."
                                rows={6}
                                maxLength={500}
                                className="resize-none"
                            />

                            <div className="flex items-center justify-between mt-2">
                                <p className="text-sm text-muted-foreground">
                                    {comment.trim() ? 'Mínimo 5 caracteres' : 'Opcional'}
                                </p>
                                <p
                                    className={`text-sm ${comment.length > 500
                                        ? 'text-destructive font-semibold'
                                        : 'text-muted-foreground'
                                        }`}
                                >
                                    {comment.length} / 500
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Submit */}
                    <Card className="mt-6">
                        <CardContent className="p-6">
                            <Button
                                type="submit"
                                size="lg"
                                className="w-full"
                                disabled={submitting || !allRated}
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                        Enviando Avaliação...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="w-5 h-5 mr-2" />
                                        Enviar Avaliação
                                    </>
                                )}
                            </Button>

                            {!allRated && (
                                <p className="text-sm text-center text-muted-foreground mt-3">
                                    Avalie todos os critérios para continuar
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </form>
            </div>
        </DashboardLayout>
    );
}

export default CreateReview;
