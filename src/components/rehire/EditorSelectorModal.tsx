// src/components/rehire/EditorSelectorModal.tsx

import { User, Star, X, Clock, Briefcase } from 'lucide-react';
import { WorkedEditor, formatProjectsCount, formatLastProjectDate } from '@/services/rehireService';
import { cn } from '@/lib/utils';

interface EditorSelectorModalProps {
    editors: WorkedEditor[];
    onSelect: (editor: WorkedEditor) => void;
    onClose: () => void;
}

export default function EditorSelectorModal({
    editors,
    onSelect,
    onClose,
}: EditorSelectorModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Selecionar Editor</h2>
                        <p className="text-sm text-gray-500">
                            Editores com quem você já trabalhou
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Lista de Editores */}
                <div className="overflow-y-auto max-h-[60vh] p-4">
                    {editors.length === 0 ? (
                        <div className="text-center py-8">
                            <User className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p className="text-gray-500">
                                Você ainda não trabalhou com nenhum editor
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {editors.map((editor) => (
                                <button
                                    key={editor.editor_id}
                                    onClick={() => onSelect(editor)}
                                    disabled={editor.has_pending_proposal}
                                    className={cn(
                                        'w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left',
                                        editor.has_pending_proposal
                                            ? 'border-yellow-200 bg-yellow-50 cursor-not-allowed'
                                            : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer'
                                    )}
                                >
                                    {/* Avatar */}
                                    {editor.editor_photo ? (
                                        <img
                                            src={editor.editor_photo}
                                            alt={editor.editor_name}
                                            className="w-14 h-14 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                                            <User className="w-7 h-7 text-gray-400" />
                                        </div>
                                    )}

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-medium text-gray-900 truncate">
                                                {editor.editor_name}
                                            </h3>
                                            {editor.last_rating_given && (
                                                <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                                                    <Star className="w-3 h-3 fill-current" />
                                                    {editor.last_rating_given.toFixed(1)}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                                            <span className="flex items-center gap-1">
                                                <Briefcase className="w-3.5 h-3.5" />
                                                {formatProjectsCount(editor.projects_together)}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3.5 h-3.5" />
                                                {formatLastProjectDate(editor.last_project_at)}
                                            </span>
                                        </div>

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

                                    {/* Status */}
                                    {editor.has_pending_proposal && (
                                        <span className="flex-shrink-0 px-3 py-1.5 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                                            Proposta pendente
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
