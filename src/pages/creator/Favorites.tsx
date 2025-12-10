import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Star,
    Search,
    MessageSquare,
    ExternalLink,
    Edit3,
    Trash2,
    X,
    Check,
    Loader2,
    UserPlus,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFavorites, FavoriteEditor } from '@/hooks/useFavorites';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { cn } from '@/lib/utils';

export default function Favorites() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [search, setSearch] = useState('');
    const [editingNote, setEditingNote] = useState<string | null>(null);
    const [noteValue, setNoteValue] = useState('');

    const {
        favorites,
        total,
        loading,
        error,
        toggle,
        updateNote,
        refresh,
        loadMore,
        hasMore,
    } = useFavorites({ search: search || undefined });

    const handleRemoveFavorite = async (editor: FavoriteEditor) => {
        if (!confirm(`Remover ${editor.editor_name} dos favoritos?`)) return;

        try {
            await toggle(editor.editor_id);
            toast({
                title: 'Removido dos favoritos',
                description: `${editor.editor_name} foi removido.`,
            });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Não foi possível remover dos favoritos.',
            });
        }
    };

    const handleEditNote = (editor: FavoriteEditor) => {
        setEditingNote(editor.editor_id);
        setNoteValue(editor.note || '');
    };

    const handleSaveNote = async (editorId: string) => {
        try {
            await updateNote(editorId, noteValue);
            toast({ title: 'Nota atualizada' });
            setEditingNote(null);
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Não foi possível salvar a nota.',
            });
        }
    };

    const handleCancelEdit = () => {
        setEditingNote(null);
        setNoteValue('');
    };

    return (
        <DashboardLayout userType="creator">
            <div className="p-6 lg:p-8 max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-yellow-100 rounded-lg">
                            <Star className="w-6 h-6 text-yellow-600" />
                        </div>
                        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
                            Meus Favoritos
                        </h1>
                    </div>
                    <p className="text-gray-600">
                        Editores que você salvou para fácil acesso
                    </p>
                </div>

                {/* Search */}
                <div className="mb-6">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar nos favoritos..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Stats */}
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                    <p className="text-sm text-yellow-800">
                        <Star className="w-4 h-4 inline mr-1 fill-yellow-500 text-yellow-500" />
                        Você tem <strong>{total}</strong> editor{total !== 1 ? 'es' : ''} nos favoritos
                    </p>
                </div>

                {/* Content */}
                {loading && favorites.length === 0 ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                    </div>
                ) : error ? (
                    <div className="text-center py-12">
                        <p className="text-red-600 mb-4">{error}</p>
                        <button
                            onClick={refresh}
                            className="text-primary hover:underline"
                        >
                            Tentar novamente
                        </button>
                    </div>
                ) : favorites.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                        <Star className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {search ? 'Nenhum favorito encontrado' : 'Nenhum favorito ainda'}
                        </h3>
                        <p className="text-gray-500 mb-6 max-w-md mx-auto">
                            {search
                                ? 'Tente buscar com outros termos.'
                                : 'Ao encontrar editores que você gosta, clique no ícone de estrela para salvá-los aqui.'}
                        </p>
                        {!search && (
                            <Link
                                to="/creator/search"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                            >
                                <Search className="w-4 h-4" />
                                Buscar editores
                            </Link>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Grid de favoritos */}
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {favorites.map((editor) => (
                                <FavoriteCard
                                    key={editor.favorite_id}
                                    editor={editor}
                                    isEditingNote={editingNote === editor.editor_id}
                                    noteValue={noteValue}
                                    onNoteChange={setNoteValue}
                                    onEditNote={() => handleEditNote(editor)}
                                    onSaveNote={() => handleSaveNote(editor.editor_id)}
                                    onCancelEdit={handleCancelEdit}
                                    onRemove={() => handleRemoveFavorite(editor)}
                                    onViewProfile={() => navigate(`/editor/profile/${editor.editor_username}`)}
                                />
                            ))}
                        </div>

                        {/* Load More */}
                        {hasMore && (
                            <div className="mt-8 text-center">
                                <button
                                    onClick={loadMore}
                                    disabled={loading}
                                    className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                                >
                                    {loading ? (
                                        <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                                    ) : (
                                        'Carregar mais'
                                    )}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}

// ================================================
// COMPONENTE DO CARD
// ================================================

interface FavoriteCardProps {
    editor: FavoriteEditor;
    isEditingNote: boolean;
    noteValue: string;
    onNoteChange: (value: string) => void;
    onEditNote: () => void;
    onSaveNote: () => void;
    onCancelEdit: () => void;
    onRemove: () => void;
    onViewProfile: () => void;
}

function FavoriteCard({
    editor,
    isEditingNote,
    noteValue,
    onNoteChange,
    onEditNote,
    onSaveNote,
    onCancelEdit,
    onRemove,
    onViewProfile,
}: FavoriteCardProps) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
            {/* Header com foto */}
            <div className="p-4 border-b border-gray-100">
                <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                        {editor.editor_photo ? (
                            <img
                                src={editor.editor_photo}
                                alt={editor.editor_name}
                                className="w-14 h-14 rounded-full object-cover"
                            />
                        ) : (
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white font-bold text-lg">
                                {editor.editor_name.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">
                            {editor.editor_name}
                        </h3>
                        <p className="text-xs text-gray-500 truncate">@{editor.editor_username}</p>

                        {/* Rating e Projetos */}
                        <div className="flex items-center gap-3 mt-1 text-sm">
                            <span className="flex items-center gap-1 text-yellow-600">
                                <Star className="w-4 h-4 fill-current" />
                                {editor.editor_rating.toFixed(1)}
                            </span>
                            <span className="text-gray-500">
                                {editor.editor_total_projects} projeto{editor.editor_total_projects !== 1 ? 's' : ''}
                            </span>
                        </div>

                        {/* Especialidades */}
                        {editor.editor_specialties && editor.editor_specialties.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                                {editor.editor_specialties.slice(0, 3).map((spec) => (
                                    <span
                                        key={spec}
                                        className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
                                    >
                                        {spec}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Estrela indicadora */}
                    <Star className="w-5 h-5 text-yellow-500 fill-current flex-shrink-0" />
                </div>
            </div>

            {/* Nota */}
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                {isEditingNote ? (
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={noteValue}
                            onChange={(e) => onNoteChange(e.target.value)}
                            placeholder="Adicionar nota..."
                            className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            autoFocus
                        />
                        <button
                            onClick={onSaveNote}
                            className="p-1.5 text-green-600 hover:bg-green-100 rounded-lg"
                        >
                            <Check className="w-4 h-4" />
                        </button>
                        <button
                            onClick={onCancelEdit}
                            className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-lg"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600 italic truncate">
                            {editor.note || 'Sem nota'}
                        </p>
                        <button
                            onClick={onEditNote}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg"
                            title="Editar nota"
                        >
                            <Edit3 className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            {/* Ações */}
            <div className="p-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <button
                        onClick={onViewProfile}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
                    >
                        <ExternalLink className="w-4 h-4" />
                        Ver perfil
                    </button>
                </div>

                <button
                    onClick={onRemove}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remover dos favoritos"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            {/* Favoritado em */}
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
                <p className="text-xs text-gray-400">
                    Favoritado em {new Date(editor.favorited_at).toLocaleDateString('pt-BR')}
                </p>
            </div>
        </div>
    );
}
