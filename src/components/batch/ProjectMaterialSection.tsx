import { Info, ExternalLink, FolderOpen, Music, Type, Palette, Film } from 'lucide-react';
import { RawFootageDuration } from '@/types';

interface ProjectMaterialData {
    raw_footage_url: string;
    raw_footage_duration: RawFootageDuration | string;
    brand_identity_url: string;
    fonts_url: string;
    music_sfx_url?: string;
    reference_links?: string;
}

interface ProjectMaterialSectionProps {
    data: ProjectMaterialData;
    onChange: (updates: Partial<ProjectMaterialData>) => void;
    required?: boolean;
}

export function ProjectMaterialSection({
    data,
    onChange,
    required = true
}: ProjectMaterialSectionProps) {

    const durationOptions = [
        { value: '0-30min', label: '0-30 minutos', icon: '⚡' },
        { value: '30min-1h', label: '30 minutos - 1 hora', icon: '📹' },
        { value: '1-3h', label: '1-3 horas (ex: podcast)', icon: '🎙️' },
        { value: '3h+', label: 'Mais de 3 horas', icon: '🎬' },
    ];

    return (
        <section className="space-y-5 border-t-2 border-border pt-6 mt-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                    <FolderOpen className="w-5 h-5 text-primary" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-foreground">
                        📋 Material do Projeto
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        Links para os arquivos que o editor vai precisar
                    </p>
                </div>
            </div>

            {/* Material Bruto */}
            <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Film className="w-4 h-4 text-primary" />
                    Link do Material Bruto (Drive/WeTransfer) {required && '*'}
                </label>
                <input
                    type="url"
                    placeholder="https://drive.google.com/drive/folders/..."
                    value={data.raw_footage_url || ''}
                    onChange={(e) => onChange({ raw_footage_url: e.target.value })}
                    required={required}
                    className="w-full px-4 py-3 border-2 border-input rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 bg-background"
                />
                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    Certifique-se que o link está público ou com permissão de visualização
                </p>
            </div>

            {/* Duração do Material Bruto */}
            <div className="space-y-2">
                <label className="block text-sm font-semibold text-foreground">
                    Duração Total do Material Bruto {required && '*'}
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {durationOptions.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => onChange({ raw_footage_duration: option.value as RawFootageDuration })}
                            className={`p-3 border-2 rounded-lg text-left transition-all ${data.raw_footage_duration === option.value
                                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                                    : 'border-border hover:border-muted-foreground/50 bg-card'
                                }`}
                        >
                            <div className="text-2xl mb-1">{option.icon}</div>
                            <div className="text-xs font-medium text-foreground">{option.label}</div>
                        </button>
                    ))}
                </div>
                <p className="text-xs text-muted-foreground">
                    💡 Ajuda o editor a se preparar e organizar o trabalho
                </p>
            </div>

            {/* Identidade Visual */}
            <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Palette className="w-4 h-4 text-primary" />
                    Identidade Visual / Brandkit (Drive) {required && '*'}
                </label>
                <input
                    type="url"
                    placeholder="https://drive.google.com/... (pasta com logo, cores, templates)"
                    value={data.brand_identity_url || ''}
                    onChange={(e) => onChange({ brand_identity_url: e.target.value })}
                    required={required}
                    className="w-full px-4 py-3 border-2 border-input rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 bg-background"
                />
                <p className="text-xs text-muted-foreground">
                    Logotipo, paleta de cores, templates, overlays, lower thirds, etc.
                </p>
            </div>

            {/* Fontes */}
            <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Type className="w-4 h-4 text-primary" />
                    Fontes Utilizadas {required && '*'}
                </label>
                <input
                    type="text"
                    placeholder="Link do Drive ou nomes das fontes (ex: Montserrat Bold, Inter Regular)"
                    value={data.fonts_url || ''}
                    onChange={(e) => onChange({ fonts_url: e.target.value })}
                    required={required}
                    className="w-full px-4 py-3 border-2 border-input rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 bg-background"
                />
                <p className="text-xs text-muted-foreground">
                    Se usar fontes pagas, envie os arquivos .ttf ou .otf
                </p>
            </div>

            {/* Música/SFX (Opcional) */}
            <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Music className="w-4 h-4 text-primary" />
                    Música/Efeitos Sonoros (Opcional)
                </label>
                <input
                    type="url"
                    placeholder="https://drive.google.com/... (deixe vazio se editor pode escolher)"
                    value={data.music_sfx_url || ''}
                    onChange={(e) => onChange({ music_sfx_url: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-input rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 bg-background"
                />
                <p className="text-xs text-muted-foreground">
                    Se deixar vazio, o editor poderá sugerir músicas royalty-free
                </p>
            </div>

            {/* Referências */}
            <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <ExternalLink className="w-4 h-4 text-primary" />
                    Links de Referência {required && '*'}
                </label>
                <textarea
                    rows={3}
                    placeholder="Cole links de vídeos que inspiram o estilo desejado (YouTube, Instagram, TikTok)..."
                    value={data.reference_links || ''}
                    onChange={(e) => onChange({ reference_links: e.target.value })}
                    required={required}
                    className="w-full px-4 py-3 border-2 border-input rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 bg-background resize-none"
                />
                <p className="text-xs text-muted-foreground">
                    Quanto mais referências, melhor o editor entenderá seu estilo
                </p>
            </div>

            {/* Dica Final */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mt-4">
                <p className="text-sm text-foreground">
                    💡 <strong>Dica:</strong> Organize todos os arquivos em uma única pasta do Google Drive
                    com subpastas claras (Material Bruto, Identidade Visual, Músicas, etc.)
                </p>
            </div>
        </section>
    );
}
