import { useState, useRef, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Paperclip, Smile, Loader2 } from 'lucide-react';

interface MessageInputProps {
    onSend: (text: string) => Promise<void> | void;
    disabled?: boolean;
}

function MessageInput({ onSend, disabled = false }: MessageInputProps) {
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    async function handleSend() {
        const trimmedText = text.trim();

        if (!trimmedText || sending || disabled) return;

        setSending(true);

        try {
            await onSend(trimmedText);
            setText('');

            // Reset textarea height
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
            }
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setSending(false);
        }
    }

    function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
        // Send with Enter (Shift+Enter for new line)
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }

    function handleTextChange(value: string) {
        setText(value);

        // Auto-resize textarea
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(
                textareaRef.current.scrollHeight,
                120
            )}px`;
        }
    }

    const canSend = text.trim().length > 0 && !sending && !disabled;

    return (
        <div className="flex items-end gap-3">
            {/* Emoji Button (opcional - pode adicionar picker depois) */}
            <button
                type="button"
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={disabled}
                title="Emojis (em breve)"
            >
                <Smile className="w-5 h-5" />
            </button>

            {/* Text Input */}
            <div className="flex-1 relative">
                <Textarea
                    ref={textareaRef}
                    value={text}
                    onChange={(e) => handleTextChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Digite sua mensagem..."
                    disabled={disabled || sending}
                    rows={1}
                    className="resize-none pr-12 min-h-[44px]"
                    style={{ maxHeight: '120px' }}
                />

                {/* Attachment Button (dentro do textarea) */}
                <button
                    type="button"
                    className="absolute right-3 bottom-3 p-1 text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={disabled}
                    title="Anexar arquivo (em breve)"
                >
                    <Paperclip className="w-5 h-5" />
                </button>
            </div>

            {/* Send Button */}
            <Button
                onClick={handleSend}
                disabled={!canSend}
                size="icon"
                className="h-[44px] w-[44px] flex-shrink-0"
            >
                {sending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                    <Send className="w-5 h-5" />
                )}
            </Button>
        </div>
    );
}

export default MessageInput;
