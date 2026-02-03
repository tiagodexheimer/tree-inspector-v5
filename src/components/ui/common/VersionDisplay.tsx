import React from 'react';
import packageJson from '../../../../package.json';

const VersionDisplay: React.FC = () => {
    return (
        <div style={{
            fontSize: '11px',
            color: '#888',
            padding: '10px 20px',
            textAlign: 'center',
            borderTop: '1px solid #eee'
        }}>
            Versão v{packageJson.version}
        </div>
    );
};

export default VersionDisplay;
