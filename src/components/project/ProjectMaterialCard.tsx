import {
    FileVideo,
    Image,
    Type,
    Music,
    Link as LinkIcon,
    ExternalLink,
    Clock,
    FolderOpen
} from 'lucide-react';

// =====================================================
// INTERFACES
// =====================================================
interface ProjectMaterialCardProps {
    rawFootageUrl?: string | null;
    rawFootageDuration?: string | null;
    brandIdentityUrl?: string | null;
    fontsUrl?: string | null;
    musicSfxUrl?: string | null;
    referenceLinks?: string | null;
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================
export function ProjectMaterialCard({
    rawFootageUrl,
    rawFootageDuration,
    brandIdentityUrl,
    fontsUrl,
    musicSfxUrl,
    referenceLinks
}: ProjectMaterialCardProps) {

    // Verificar se há algum material
    const hasMaterial = rawFootageUrl || brandIdentityUrl || fontsUrl || musicSfxUrl || referenceLinks;

    if (!hasMaterial) {
        return (
            <div className="bg-card border-2 border-border rounded-xl p-5">
                <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                    <FolderOpen className="w-5 h-5 text-muted-foreground" />
                    Material do Projeto
                </h3>
                <div className="text-center py-6 text-muted-foreground">
                    <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhum material fornecido</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-card border-2 border-border rounded-xl p-5">
            <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-primary" />
                Material do Projeto
            </h3>

            <div className="space-y-2">
                {/* Material Bruto */}
                {rawFootageUrl && (
                    <MaterialLink
                        href={rawFootageUrl}
                        icon={FileVideo}
                        iconColor="text-blue-500"
                        label="Material Bruto"
                        sublabel={rawFootageDuration || undefined}
                    />
                )}

                {/* Identidade Visual */}
                {brandIdentityUrl && (
                    <MaterialLink
                        href={brandIdentityUrl}
                        icon={Image}
                        iconColor="text-purple-500"
                        label="Identidade Visual"
                        sublabel="Logo, cores, assets"
                    />
                )}

                {/* Fontes */}
                {fontsUrl && (
                    <MaterialItem
                        icon={Type}
                        iconColor="text-green-500"
                        label="Fontes"
                        content={fontsUrl}
                    />
                )}

                {/* Música/SFX */}
                {musicSfxUrl && (
                    <MaterialLink
                        href={musicSfxUrl}
                        icon={Music}
                        iconColor="text-pink-500"
                        label="Música / SFX"
                    />
                )}

                {/* Referências */}
                {referenceLinks && (
                    <div className="pt-2 border-t border-border">
                        <div className="flex items-start gap-3 p-2">
                            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                                <LinkIcon className="w-4 h-4 text-orange-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-medium text-foreground text-sm mb-1">
                                    Referências
                                </div>
                                <div className="text-xs text-muted-foreground space-y-1">
                                    {referenceLinks.split('\n').filter(Boolean).map((link, i) => {
                                        // Verificar se é uma URL válida
                                        const isUrl = link.startsWith('http://') || link.startsWith('https://');
                                        return isUrl ? (
                                            <a
                                                key={i}
                                                href={link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block text-primary hover:underline truncate"
                                            >
                                                {link}
                                            </a>
                                        ) : (
                                            <p key={i} className="text-muted-foreground">
                                                {link}
                                            </p>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// =====================================================
// SUB-COMPONENTES
// =====================================================

interface MaterialLinkProps {
    href: string;
    icon: any;
    iconColor: string;
    label: string;
    sublabel?: string;
}

function MaterialLink({ href, icon: Icon, iconColor, label, sublabel }: MaterialLinkProps) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-lg transition-colors group"
        >
            <div className={`p-2 bg-muted rounded-lg group-hover:scale-105 transition-transform`}>
                <Icon className={`w-4 h-4 ${iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground text-sm group-hover:text-primary transition-colors">
                    {label}
                </div>
                {sublabel && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {sublabel}
                    </div>
                )}
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </a>
    );
}

interface MaterialItemProps {
    icon: any;
    iconColor: string;
    label: string;
    content: string;
}

function MaterialItem({ icon: Icon, iconColor, label, content }: MaterialItemProps) {
    return (
        <div className="flex items-start gap-3 p-2">
            <div className="p-2 bg-muted rounded-lg">
                <Icon className={`w-4 h-4 ${iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground text-sm">
                    {label}
                </div>
                <div className="text-xs text-muted-foreground break-all">
                    {content}
                </div>
            </div>
        </div>
    );
}
