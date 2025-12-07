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

        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${Date.now()}.${fileExt}`;

        // Upload - usando bucket 'avatars'
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
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/avatars/');

        if (pathParts.length < 2) return;

        const path = pathParts[1];

        if (!path) return;

        await supabase.storage.from('avatars').remove([path]);
    } catch (error) {
        console.error('Error deleting avatar:', error);
    }
}

export function getAvatarUrl(userId: string, timestamp?: number): string {
    return '';
}