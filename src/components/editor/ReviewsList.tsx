import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import RatingStars, { RatingDisplay } from '@/components/ui/RatingStars';
import {
    Star,
    MessageSquare,
    Clock,
    Award,
    Users,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';

interface Review {
    id: string;
    rating_communication: number;
    rating_quality: number;
    rating_deadline: number;
    rating_professionalism: number;
    rating_overall: number;
    comment?: string;
    created_at: string;
    reviewer: {
        full_name: string;
        username: string;
        profile_photo_url?: string;
    };
    project: {
        title: string;
    };
}

interface ReviewsListProps {
    editorId: string;
    showSummary?: boolean;
}

function ReviewsList({ editorId, showSummary = true }: ReviewsListProps) {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set());

    // Stats
    const [avgCommunication, setAvgCommunication] = useState(0);
    const [avgQuality, setAvgQuality] = useState(0);
    const [avgDeadline, setAvgDeadline] = useState(0);
    const [avgProfessionalism, setAvgProfessionalism] = useState(0);
    const [overallRating, setOverallRating] = useState(0);

    useEffect(() => {
        if (editorId) {
            loadReviews();
        }
    }, [editorId]);

    async function loadReviews() {
        try {
            const { data, error } = await supabase
                .from('reviews')
                .select(`
          id,
          rating_communication,
          rating_quality,
          rating_deadline,
          rating_professionalism,
          rating_overall,
          comment,
          created_at,
          reviewer:users!reviews_reviewer_id_fkey (
            full_name,
            username,
            profile_photo_url
          ),
          project:projects (
            title
          )
        `)
                .eq('reviewee_id', editorId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            setReviews(data || []);

            // Calcular médias
            if (data && data.length > 0) {
                const total = data.length;
                setAvgCommunication(
                    data.reduce((sum, r) => sum + r.rating_communication, 0) / total
                );
                setAvgQuality(
                    data.reduce((sum, r) => sum + r.rating_quality, 0) / total
                );
                setAvgDeadline(
                    data.reduce((sum, r) => sum + r.rating_deadline, 0) / total
                );
                setAvgProfessionalism(
                    data.reduce((sum, r) => sum + r.rating_professionalism, 0) / total
                );
                setOverallRating(
                    data.reduce((sum, r) => sum + r.rating_overall, 0) / total
                );
            }
        } catch (error) {
            console.error('Error loading reviews:', error);
        } finally {
            setLoading(false);
        }
    }

    function toggleExpanded(reviewId: string) {
        setExpandedReviews((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(reviewId)) {
                newSet.delete(reviewId);
            } else {
                newSet.add(reviewId);
            }
            return newSet;
        });
    }

    function formatDate(date: string) {
        return new Date(date).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        });
    }

    if (loading) {
        return null;
    }

    if (reviews.length === 0) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                    <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
                        <Star className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-1">Nenhuma avaliação ainda</h3>
                    <p className="text-muted-foreground">As avaliações aparecerão aqui após projetos concluídos</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Summary */}
            {showSummary && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl font-semibold text-foreground">
                            Resumo das Avaliações
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Overall */}
                            <div className="md:col-span-2 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-900/10 rounded-lg p-6 text-center border border-yellow-200 dark:border-yellow-800">
                                <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">Avaliação Geral</p>
                                <p className="text-5xl font-bold text-yellow-900 dark:text-yellow-100 mb-3">
                                    {overallRating.toFixed(1)}
                                </p>
                                <div className="flex justify-center">
                                    <RatingStars value={overallRating} readonly size="large" />
                                </div>
                                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-3">
                                    Baseado em {reviews.length} avaliação{reviews.length !== 1 ? 'ões' : ''}
                                </p>
                            </div>

                            {/* Communication */}
                            <div className="bg-muted/50 rounded-lg p-4 border">
                                <div className="flex items-center gap-2 mb-3">
                                    <MessageSquare className="w-5 h-5 text-primary" />
                                    <p className="font-medium text-foreground">Comunicação</p>
                                </div>
                                <RatingDisplay
                                    rating={avgCommunication}
                                    size="small"
                                    showLabel={false}
                                />
                            </div>

                            {/* Quality */}
                            <div className="bg-muted/50 rounded-lg p-4 border">
                                <div className="flex items-center gap-2 mb-3">
                                    <Award className="w-5 h-5 text-primary" />
                                    <p className="font-medium text-foreground">Qualidade</p>
                                </div>
                                <RatingDisplay rating={avgQuality} size="small" showLabel={false} />
                            </div>

                            {/* Deadline */}
                            <div className="bg-muted/50 rounded-lg p-4 border">
                                <div className="flex items-center gap-2 mb-3">
                                    <Clock className="w-5 h-5 text-primary" />
                                    <p className="font-medium text-foreground">Prazo</p>
                                </div>
                                <RatingDisplay rating={avgDeadline} size="small" showLabel={false} />
                            </div>

                            {/* Professionalism */}
                            <div className="bg-muted/50 rounded-lg p-4 border">
                                <div className="flex items-center gap-2 mb-3">
                                    <Users className="w-5 h-5 text-primary" />
                                    <p className="font-medium text-foreground">Profissionalismo</p>
                                </div>
                                <RatingDisplay
                                    rating={avgProfessionalism}
                                    size="small"
                                    showLabel={false}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Reviews List */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl font-semibold text-foreground">
                        Todas as Avaliações ({reviews.length})
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {reviews.map((review) => {
                        const isExpanded = expandedReviews.has(review.id);

                        return (
                            <div
                                key={review.id}
                                className="border-b border-border last:border-0 pb-6 last:pb-0"
                            >
                                {/* Header */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <Avatar>
                                            <AvatarImage src={review.reviewer.profile_photo_url} alt={review.reviewer.full_name} />
                                            <AvatarFallback>{review.reviewer.full_name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-semibold text-foreground">
                                                {review.reviewer.full_name}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                @{review.reviewer.username}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <RatingDisplay
                                            rating={review.rating_overall}
                                            size="small"
                                            showLabel={false}
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {formatDate(review.created_at)}
                                        </p>
                                    </div>
                                </div>

                                {/* Project */}
                                <p className="text-sm text-muted-foreground mb-4">
                                    Projeto: <span className="font-medium text-foreground">{review.project.title}</span>
                                </p>

                                {/* Comment */}
                                {review.comment && (
                                    <div className="bg-muted/30 rounded-lg p-4 mb-4 border border-border">
                                        <p className="text-foreground leading-relaxed">{review.comment}</p>
                                    </div>
                                )}

                                {/* Detailed Ratings (collapsible) */}
                                <button
                                    onClick={() => toggleExpanded(review.id)}
                                    className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors"
                                >
                                    {isExpanded ? (
                                        <>
                                            Ocultar detalhes
                                            <ChevronUp className="w-4 h-4" />
                                        </>
                                    ) : (
                                        <>
                                            Ver detalhes da avaliação
                                            <ChevronDown className="w-4 h-4" />
                                        </>
                                    )}
                                </button>

                                {isExpanded && (
                                    <div className="mt-4 grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-lg">
                                        <div>
                                            <RatingStars
                                                value={review.rating_communication}
                                                readonly
                                                size="small"
                                                label="Comunicação"
                                            />
                                        </div>
                                        <div>
                                            <RatingStars
                                                value={review.rating_quality}
                                                readonly
                                                size="small"
                                                label="Qualidade"
                                            />
                                        </div>
                                        <div>
                                            <RatingStars
                                                value={review.rating_deadline}
                                                readonly
                                                size="small"
                                                label="Prazo"
                                            />
                                        </div>
                                        <div>
                                            <RatingStars
                                                value={review.rating_professionalism}
                                                readonly
                                                size="small"
                                                label="Profissionalismo"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </CardContent>
            </Card>
        </div>
    );
}

export default ReviewsList;
