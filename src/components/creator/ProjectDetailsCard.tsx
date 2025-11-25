import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LinkIcon, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ProjectDetailsCardProps {
    project: any; // Using any for now to match the prompt's flexibility, but ideally should be typed
}

export function ProjectDetailsCard({ project }: ProjectDetailsCardProps) {
    const navigate = useNavigate();

    return (
        <Card className="p-6">
            <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold">{project.title}</h2>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/creator/project/${project.id}/edit`)}
                    className="flex items-center gap-2"
                >
                    <Pencil className="w-4 h-4" />
                    Editar
                </Button>
            </div>

            <div className="space-y-8">
                {/* Tipo e Configurações */}
                <section>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Configurações</h3>
                    <div className="grid grid-cols-2 gap-6 bg-muted/30 p-4 rounded-lg">
                        <div>
                            <span className="text-xs text-muted-foreground block mb-1">Tipo de Vídeo</span>
                            <p className="font-semibold capitalize">{project.video_type}</p>
                        </div>
                        <div>
                            <span className="text-xs text-muted-foreground block mb-1">Estilo de Edição</span>
                            <p className="font-semibold capitalize">{project.editing_style}</p>
                        </div>
                        <div>
                            <span className="text-xs text-muted-foreground block mb-1">Duração</span>
                            <p className="font-semibold">{project.duration_category}</p>
                        </div>
                        <div>
                            <span className="text-xs text-muted-foreground block mb-1">Prazo Estimado</span>
                            <p className="font-semibold">{project.estimated_delivery_days} dias</p>
                        </div>
                    </div>
                </section>

                {/* Descrição */}
                <section>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Descrição</h3>
                    <p className="text-foreground whitespace-pre-line leading-relaxed">{project.description}</p>
                </section>

                {/* Materiais */}
                <section>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Materiais</h3>
                    <a
                        href={project.reference_files_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-2 bg-primary/5 p-3 rounded-md w-fit transition-colors hover:bg-primary/10"
                    >
                        <LinkIcon className="w-4 h-4" />
                        Acessar arquivos do projeto
                    </a>
                </section>

                {/* Contexto (se houver) */}
                {project.context_description && (
                    <section>
                        <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Contexto</h3>
                        <p className="text-foreground leading-relaxed">{project.context_description}</p>
                    </section>
                )}

                {/* Referências (se houver) */}
                {project.reference_links && (
                    <section>
                        <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Referências</h3>
                        <p className="text-foreground whitespace-pre-line leading-relaxed">{project.reference_links}</p>
                    </section>
                )}

                {/* Features Incluídas */}
                {project.pricing?.features && (
                    <section>
                        <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Incluído no Pacote</h3>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {project.pricing.features.map((feature: string, index: number) => (
                                <li key={index} className="flex items-center gap-2 text-sm text-foreground bg-green-500/5 p-2 rounded border border-green-500/10">
                                    <span className="text-green-500 font-bold">✓</span>
                                    <span>{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
            </div>
        </Card>
    );
}
