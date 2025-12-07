import React, { useState } from 'react';
import { Send, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { formatTimestamp, parseTimestamp } from '@/types/delivery';

interface AddCommentFormProps {
    currentTime: number;
    videoType: 'youtube' | 'gdrive';
    isSubmitting?: boolean;
    onSubmit: (data: {
        content: string;
        timestampSeconds: number;
    }) => Promise<void>;
}

export function AddCommentForm({
    currentTime,
    videoType,
    isSubmitting,
    onSubmit
}: AddCommentFormProps) {
    const [content, setContent] = useState('');
    const [manualTimestamp, setManualTimestamp] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() || isSubmitting) return;

        const timestampToUse = videoType === 'gdrive' && manualTimestamp
            ? parseTimestamp(manualTimestamp)
            : currentTime;

        await onSubmit({
            content: content.trim(),
            timestampSeconds: timestampToUse,
        });

        setContent('');
        setManualTimestamp('');
    };

    return (
        <form onSubmit={handleSubmit} className="bg-card border rounded-lg p-4 space-y-3">
            {/* Timestamp Display */}
            <div className="flex items-center justify-between">
                {videoType === 'youtube' ? (
                    <>
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <div className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md font-mono text-sm font-semibold">
                                {formatTimestamp(currentTime)}
                            </div>
                        </div>
                        <span className="text-muted-foreground text-xs">Momento atual do vídeo</span>
                    </>
                ) : (
                    <div className="flex items-center gap-3 flex-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="0:00"
                            value={manualTimestamp}
                            onChange={(e) => setManualTimestamp(e.target.value)}
                            className="w-24 text-center font-mono"
                        />
                        <span className="text-muted-foreground text-xs">Digite o timestamp (ex: 1:30)</span>
                    </div>
                )}
            </div>


            {/* Comment Input */}
            <div className="relative">
                <Textarea
                    placeholder="Escreva seu comentário sobre este momento do vídeo..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={3}
                    className="resize-none pr-24"
                    disabled={isSubmitting}
                />
                <Button
                    type="submit"
                    size="sm"
                    className="absolute bottom-2 right-2"
                    disabled={!content.trim() || isSubmitting}
                >
                    <Send className="h-4 w-4 mr-1" />
                    {isSubmitting ? 'Enviando...' : 'Enviar'}
                </Button>
            </div>
        </form>
    );
}
