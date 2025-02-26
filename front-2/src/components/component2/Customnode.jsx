import { Handle } from "@xyflow/react";

const  CustomNode = ({ id, data, selected, dragging, style }) => {
    return (
      <div className="custom-node" style={style}>
        {/* Handle for incoming connections */}
        <Handle type="target" position="top" id="target" style={{ background: '#555' }} />
        {data.issues && data.issues.length > 0 && (
          <div className="node-warning-icon" title="This rule has issues">⚠️</div>
        )}
        <pre className="node-label">{data.label}</pre>
        {/* Handle for outgoing connections */}
        <Handle type="source" position="bottom" id="source" style={{ background: '#555' }} />
      </div>
    );
  };
  export default CustomNode;