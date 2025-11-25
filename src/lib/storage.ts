import { supabase } from './supabase';

export async function uploadAvatar(userId: string, file: File): Promise<string> {
    try {
        // Validar arquivo
        if (!file.type.startsWith('image/')) {
            throw new Error('Arquivo deve ser uma imagem');
        }

        if (file.size > 2 * 1024 * 1024) {
            throw new Error('Imagem deve ter no máximo 2MB');
        }

        // Gerar nome único (usando timestamp para evitar cache)
        // Estrutura: user_id/avatar.ext
        // Nota: Vamos padronizar para avatar.jpg ou manter a extensão original?
        // Manter original com timestamp no nome do arquivo é mais seguro para evitar cache
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${Date.now()}.${fileExt}`;

        // Upload
        const { data, error } = await supabase.storage
            .from('avatars')
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: true,
            });

        if (error) throw error;

        // Retornar URL pública
        const { data: urlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);

        return urlData.publicUrl;
    } catch (error) {
        console.error('Error uploading avatar:', error);
        throw error;
    }
}

export async function deleteAvatar(url: string): Promise<void> {
    try {
        // Extrair path do URL
        // Ex: https://.../storage/v1/object/public/avatars/user_id/filename.jpg
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/avatars/');

        if (pathParts.length < 2) return;

        const path = pathParts[1]; // user_id/filename.jpg

        if (!path) return;

        await supabase.storage.from('avatars').remove([path]);
    } catch (error) {
        console.error('Error deleting avatar:', error);
    }
}

export function getAvatarUrl(userId: string, timestamp?: number): string {
    // Esta função assume que o avatar é salvo sempre com o mesmo nome se quisermos URL previsível,
    // mas como estamos usando timestamp no nome do arquivo no upload, a URL muda.
    // Se quisermos usar esta função helper, precisaríamos salvar sempre como 'avatar.jpg'.
    // Por enquanto, vamos confiar na URL salva no perfil do usuário.
    return '';
}
