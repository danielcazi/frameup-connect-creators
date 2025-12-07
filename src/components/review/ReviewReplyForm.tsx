import React, { useState } from 'react';
import { Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface ReviewReplyFormProps {
    onSubmit: (content: string) => Promise<void>;
    onCancel: () => void;
    isSubmitting?: boolean;
}

export function ReviewReplyForm({ onSubmit, onCancel, isSubmitting }: ReviewReplyFormProps) {
    const [content, setContent] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() || isSubmitting) return;

        await onSubmit(content.trim());
        setContent('');
    };

    return (
        <form onSubmit={handleSubmit} className="bg-muted/30 rounded-lg p-3 border">
            <Textarea
                placeholder="Escreva sua resposta..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={2}
                className="resize-none text-sm mb-2"
                disabled={isSubmitting}
            />
            <div className="flex justify-end gap-2">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onCancel}
                    disabled={isSubmitting}
                >
                    <X className="h-4 w-4 mr-1" />
                    Cancelar
                </Button>
                <Button
                    type="submit"
                    size="sm"
                    disabled={!content.trim() || isSubmitting}
                >
                    <Send className="h-4 w-4 mr-1" />
                    {isSubmitting ? 'Enviando...' : 'Responder'}
                </Button>
            </div>
        </form>
    );
}
