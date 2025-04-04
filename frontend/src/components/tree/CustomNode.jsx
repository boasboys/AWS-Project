import React from 'react';
import { Handle, Position } from '@xyflow/react';

const getNodeStyle = (action, height, width) => {
    const nodeStyle = {
        padding: 15,
        borderRadius: 10,
        width: width,
        height: height,
        fontSize: '14px',
        fontWeight: 'bold',
        whiteSpace: 'pre-wrap',
        textAlign: 'left',
        color: 'white',
        boxShadow: '0 4px 6px rgba(56, 57, 59, 0.3)',
        border: '2px solidrgb(23, 26, 23)',
    }
    switch (action) {
        case 'Block':
            return {
                ...nodeStyle,
                background: '#8b0000',
            };
        case 'Count':
            return {
                ...nodeStyle,
                background: '#1060a5',
            };
        case 'Allow':
            return {
                ...nodeStyle,
                background: '#1f9e21',
            };
        default:
            return {
                ...nodeStyle,
                background: '#2f4f4f',
            };
    }
};

export default function CustomNode({ data, id }) {

    return (
        <div style={{ ...getNodeStyle(data.action, data.hw.height, data.hw.width) }}>
            <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
            <div>
                {data.warnings?.length > 0 && <span>⚠️</span>}
                {data.ruleLabels?.length > 0 && <span>🏷️</span>}
                {data.labelState?.length > 0 && <span>🔗</span>}
                {data.insertHeaders?.length > 0 && <span>📜</span>}
            </div>
            <p>{data.name}</p>
            <p>{data.action}  |  priority {data.priority}</p>
            {data.ruleLabels?.length > 0 && <p>🏷️: {data.ruleLabels.join(', ')}</p>}

            {data.labelState?.length > 0 && (
                <p>
                    🔗:{' '}
                    {data.labelState.map(([logic, rule, _], i) => (
                        <span key={i} style={{ cursor: 'pointer', marginRight: '5px' }}>
                            {i > 0 && <span> {'      '}</span>}
                            {logic === '!' && i > 0 && data.labelState[i - 1][0] && (
                                <span style={{ color: '#ff9800' }}>{data.labelState[i - 1][0]} </span>
                            )}
                            {logic && <span style={{ color: '#ff9800' }}>{logic} </span>}
                            <span>{rule}</span> <br />
                        </span>
                    ))}
                </p>
            )}
            <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
        </div>
    );
}