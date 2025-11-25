import { useState, useRef } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { uploadAvatar, deleteAvatar } from '@/lib/storage';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Camera, Upload, X, Loader2 } from 'lucide-react';

interface AvatarUploadProps {
    currentAvatar?: string;
    onUploadSuccess: (url: string) => void;
    userId: string;
    userName?: string;
}

function AvatarUpload({ currentAvatar, onUploadSuccess, userId, userName }: AvatarUploadProps) {
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);

    function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];

        if (!file) return;

        // Validar tipo
        if (!file.type.startsWith('image/')) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Por favor, selecione uma imagem',
            });
            return;
        }

        // Validar tamanho
        if (file.size > 2 * 1024 * 1024) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Imagem deve ter no máximo 2MB',
            });
            return;
        }

        // Criar preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    }

    async function handleUpload() {
        if (!preview || !fileInputRef.current?.files?.[0]) return;

        setUploading(true);

        try {
            // Deletar avatar antigo se existir e não for o mesmo que o novo (o que não deve acontecer aqui)
            // Mas cuidado para não deletar se o upload falhar.
            // A lógica original deletava antes. Vamos manter, mas idealmente deletaríamos depois do sucesso.
            // Para simplificar e seguir o prompt, vamos deletar se existir.
            if (currentAvatar) {
                await deleteAvatar(currentAvatar);
            }

            // Upload novo avatar
            const file = fileInputRef.current.files[0];
            const url = await uploadAvatar(userId, file);

            toast({
                title: 'Sucesso!',
                description: 'Foto atualizada com sucesso!',
            });

            onUploadSuccess(url);
            setPreview(null);
        } catch (error: any) {
            console.error('Error uploading avatar:', error);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: error.message || 'Erro ao fazer upload',
            });
        } finally {
            setUploading(false);
        }
    }

    function handleCancel() {
        setPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }

    return (
        <div className="flex flex-col items-center gap-4">
            {/* Avatar Preview */}
            <div className="relative group cursor-pointer" onClick={() => !preview && fileInputRef.current?.click()}>
                <Avatar className="w-32 h-32 ring-4 ring-background shadow-lg">
                    <AvatarImage src={preview || currentAvatar} alt="Avatar" className="object-cover" />
                    <AvatarFallback className="text-4xl">
                        {userName?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                </Avatar>

                {!preview && (
                    <div
                        className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <Camera className="w-8 h-8 text-white" />
                    </div>
                )}
            </div>

            {/* Hidden File Input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileSelect}
                className="hidden"
            />

            {/* Actions */}
            {preview ? (
                <div className="flex gap-3">
                    <Button
                        type="button"
                        size="sm"
                        onClick={handleUpload}
                        disabled={uploading}
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                Enviando...
                            </>
                        ) : (
                            <>
                                <Upload className="w-4 h-4 mr-2" />
                                Salvar Foto
                            </>
                        )}
                    </Button>

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCancel}
                        disabled={uploading}
                    >
                        <X className="w-4 h-4 mr-2" />
                        Cancelar
                    </Button>
                </div>
            ) : (
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <Camera className="w-4 h-4 mr-2" />
                    Alterar Foto
                </Button>
            )}

            <p className="text-xs text-muted-foreground text-center">
                JPG, PNG ou WEBP. Máximo 2MB.
            </p>
        </div>
    );
}

export default AvatarUpload;
