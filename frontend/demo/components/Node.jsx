import { Handle }  from 'react-flow-renderer';

import ProgressIcon from './ProgressIcon';

const getIcon = (node) => {
  switch (node.type) {
    case 'email-1to1':
      return '&#xf658;';
    case 'automated-email':
      return '&#xf674;';
    case 'sms':
      return '&#xf7cd;';
    case 'survey':
      return '&#xf681;';
    case 'call':
      return '&#xf0f0;';
    case 'event':
      return '&#xf073;';
    default: break;
  };
}

const Node = ({ data: nodeData }) => {
  const stepIcon = getIcon(nodeData);
  return (
    <>
      <div className="node-container">
        <div className={`node-status node-status-${nodeData.phase.toLowerCase()}`}>
          { nodeData.phase }
        </div>
        { nodeData.previous.length > 0 && (
          <Handle
            type="target"
            position="left"
            style={{
              border: '1px solid rgb(152,152,152)',
              backgroundColor: 'white',
            }}
          />
        )}
        <div style={{
            height: '100%',
            width: '100%',
            marginTop: 7,
            flex: 3,
            display: "flex",
            flexDirection: 'column',
            alignItems: 'center',
          }}>
          <ProgressIcon
            values={nodeData.data.analytics}
            total={nodeData.data.potentialTarget}
            icon={stepIcon}
          />
          <div style={{ display: 'flex', flexDirection: 'row', justifyContent: "space-between", width: '100%'}}>
            <div style={{ fontSize: '10px', paddingLeft: 5}} title="Target">
              <i className="fas fa-bullseye" style={{ color: '#2E86C1', paddingRight: 3}}></i>
              { nodeData.data.target }
            </div>
            <div style={{ fontSize: '10px', paddingRight: 5}} title={ nodeData.data.percentOK?.label }>
              <i className="fas fa-check-circle" style={{ color: '#2E86C1', paddingRight: 3}}></i>
              { nodeData.data.percentOK?.value } %
            </div>
          </div>
        </div>
        { nodeData.final !== true && (
          <Handle
            type="source"
            position="right"
            style={{ 
              border: '1px solid rgb(152,152,152)',
              backgroundColor: 'white',
            }}
          />
        )}
      </div>
    </>
  );
};

export default Node;
