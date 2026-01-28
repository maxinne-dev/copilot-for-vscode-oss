import { useTranslation } from 'react-i18next';
import './AccessDeniedScreen.css';

const AccessDeniedScreen: React.FC = () => {
    const { t } = useTranslation();

    return (
        <div className="access-denied-container">
            <div className="access-denied-content">
                <div className="icon-container">
                    <i className="codicon codicon-workspace-untrusted"></i>
                </div>
                <h1>{t('access.denied')}</h1>
                <p>
                    {t('access.message')}
                </p>
                <div className="contact-info">
                    <p>{t('access.contactInfo')}</p>
                </div>
            </div>
        </div>
    );
};

export default AccessDeniedScreen;
