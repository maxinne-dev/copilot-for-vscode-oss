import React from 'react';
import './AccessDeniedScreen.css';

const AccessDeniedScreen: React.FC = () => {
    return (
        <div className="access-denied-container">
            <div className="access-denied-content">
                <div className="icon-container">
                    <i className="codicon codicon-workspace-untrusted"></i>
                </div>
                <h1>Access Denied</h1>
                <p>
                    Due to internal policies, the user's company is not licensed to use the extension.
                </p>
                <div className="contact-info">
                    <p>Please contact the author if you want more information.</p>
                </div>
            </div>
        </div>
    );
};

export default AccessDeniedScreen;
