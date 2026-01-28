import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './SystemMessageModal.css';

interface SystemMessageModalProps {
    isOpen: boolean;
    initialValue: string;
    onClose: () => void;
    onApply: (message: string) => void;
}

export default function SystemMessageModal({
    isOpen,
    initialValue,
    onClose,
    onApply
}: SystemMessageModalProps) {
    const { t } = useTranslation();
    const [value, setValue] = useState(initialValue);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Sync with initial value when modal opens
    useEffect(() => {
        if (isOpen) {
            setValue(initialValue);
            // Focus textarea when modal opens
            setTimeout(() => textareaRef.current?.focus(), 0);
        }
    }, [isOpen, initialValue]);

    // Handle escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleApply = () => {
        onApply(value);
        onClose();
    };

    return (
        <div className="system-message-overlay" onClick={handleOverlayClick}>
            <div className="system-message-modal">
                <div className="system-message-header">
                    <h3>{t('modal.customSystemMessage')}</h3>
                </div>
                <div className="system-message-body">
                    <textarea
                        ref={textareaRef}
                        className="system-message-textarea"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder={t('modal.placeholder')}
                        rows={6}
                    />
                </div>
                <div className="system-message-footer">
                    <button className="modal-button cancel" onClick={onClose}>
                        {t('modal.cancel')}
                    </button>
                    <button className="modal-button apply" onClick={handleApply}>
                        {t('modal.apply')}
                    </button>
                </div>
            </div>
        </div>
    );
}
