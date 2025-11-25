import React, { useState } from 'react';
import { useAdmin } from '@/hooks/useAdmin';
import { issueWarning } from '@/services/adminWarnings';
import { X } from 'lucide-react';

interface Props {
    userId: string;
    onClose: () => void;
    onSuccess: () => void;
}

export default function IssueWarningModal({ userId, onClose, onSuccess }: Props) {
    const { admin } = useAdmin();
    const [warningType, setWarningType] = useState('other');
    const [severity, setSeverity] = useState<'warning' | 'suspension' | 'ban'>('warning');
    const [reason, setReason] = useState('');
    const [suspensionUntil, setSuspensionUntil] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!admin || !reason.trim()) return;

        setSubmitting(true);
        try {
            await issueWarning(
                userId,
                admin.id,
                warningType,
                severity,
                reason,
                severity === 'suspension' ? suspensionUntil : undefined
            );
            alert('Warning emitido com sucesso!');
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Erro ao emitir warning:', error);
            alert('Erro ao emitir warning');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    <X className="w-5 h-5" />
                </button>

                <h3 className="text-xl font-bold mb-6 text-gray-900">Emitir Warning</h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Tipo */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Infração</label>
                        <select
                            value={warningType}
                            onChange={(e) => setWarningType(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        >
                            <option value="contact_sharing">Compartilhamento de Contato</option>
                            <option value="inappropriate_behavior">Comportamento Inadequado</option>
                            <option value="spam">Spam</option>
                            <option value="poor_quality">Qualidade Baixa</option>
                            <option value="repeated_cancellations">Cancelamentos Repetidos</option>
                            <option value="payment_abuse">Abuso de Pagamento</option>
                            <option value="fake_portfolio">Portfólio Falso</option>
                            <option value="other">Outro</option>
                        </select>
                    </div>

                    {/* Severidade */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Severidade</label>
                        <select
                            value={severity}
                            onChange={(e) => setSeverity(e.target.value as any)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        >
                            <option value="warning">⚠️ Warning (Advertência)</option>
                            <option value="suspension">🚫 Suspensão Temporária</option>
                            <option value="ban">❌ Banimento Permanente</option>
                        </select>
                    </div>

                    {/* Data de suspensão */}
                    {severity === 'suspension' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Suspenso Até</label>
                            <input
                                type="date"
                                value={suspensionUntil}
                                onChange={(e) => setSuspensionUntil(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                required
                            />
                        </div>
                    )}

                    {/* Motivo */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Motivo *</label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                            rows={4}
                            placeholder="Descreva o motivo da penalidade..."
                            required
                        />
                    </div>

                    {/* Botões */}
                    <div className="flex space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || !reason.trim()}
                            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium disabled:opacity-50 flex items-center justify-center"
                        >
                            {submitting ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                            ) : (
                                'Confirmar'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
