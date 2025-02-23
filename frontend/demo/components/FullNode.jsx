import { Handle }  from 'react-flow-renderer';
import {
  Typography,
  Box,
  TableContainer,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Grid,
} from '@material-ui/core';

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

const FullNode = ({ data: nodeData }) => {
  const stepIcon = getIcon(nodeData);
  const notReachedValue = nodeData.data.potentialTarget - nodeData.data.target;
  const formatDecimal = (value) => +parseFloat(value).toFixed(2);
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
            width: '100%',
            marginTop: 7,
            display: "flex",
            flexDirection: 'row',
            alignItems: 'center',
          }}>
          <Box flexGrow={1}>
            <ProgressIcon
              values={nodeData.data.analytics}
              total={nodeData.data.potentialTarget}
              icon={stepIcon}
            />
          </Box>
          <div style={{ marginLeft: 10, marginRight: 10, flexGrow: 3 }}>
            <Typography style={{ fontSize: '12px', color: "#666666" }}>
              {nodeData.name}
            </Typography>
            { !!nodeData.contentName && (
              <Typography style={{ fontSize: '12px' }} title={nodeData.contentName}>
                { nodeData.contentName.length > 45 ?  nodeData.contentName.substring(0,45) + '...' : nodeData.contentName }
              </Typography>
            )}
            <Box mt={1} mb={1}>
              <Typography style={{ fontSize: '12px', color: "#666666" }}>
                Date
              </Typography>
              { typeof(nodeData.date) === 'object' && (
                <Box>
                  <Typography style={{ fontSize: '12px' }}>
                    From { nodeData.date.from } to { nodeData.date.to}
                  </Typography>
                </Box>
              )}
              { typeof(nodeData.date) === 'string' && (
                <Box>
                  <Typography style={{ fontSize: '12px' }}>
                    { nodeData.date }
                  </Typography>
                </Box>
              )}
            </Box>
            <Grid container>
              <Grid item xs={4} style={{ textAlign: "left"}}>
                <Typography style={{ fontSize: '12px', color: "#666666" }}>
                  Potential
                </Typography>
                <Typography style={{ fontSize: '13px' }}>
                  { nodeData.data.potentialTarget }
                </Typography>
              </Grid>
              <Grid item xs={4} style={{ textAlign: "center"}}>
                <Typography style={{ fontSize: '12px', color: "#666666" }}>
                  Target
                </Typography>
                <Typography style={{ fontSize: '13px' }}>
                  { nodeData.data.target }
                </Typography>
              </Grid>
              <Grid item xs={4} style={{ textAlign: "right"}}>
                <Typography style={{ fontSize: '12px', color: "#666666" }}>
                  { nodeData.data.percentOK.label }
                </Typography>
                <Typography style={{ fontSize: '13px' }}>
                  { nodeData.data.percentOK.value } %
                </Typography>
              </Grid>
            </Grid>
          </div>
        </div>
        <Box style={{ width: '98%', padding: 3}}>
          <TableContainer style={{ width: '100%', marginTop: 10 }}>
            <Table size="small">
              <TableBody >
                {  nodeData.data.analytics.map(({ value, label, color }, index) => (
                  <TableRow key={index}>
                    <TableCell style={{ padding: 0}}>
                      <div style={{
                        border: `5px solid ${color}`,
                        borderRadius: 5
                      }}/>
                    </TableCell>
                    <TableCell style={{ fontSize: '10px'}}>{label}</TableCell>
                    <TableCell style={{ fontSize: '10px', textAlign: 'right'}}>{value}</TableCell>
                    <TableCell style={{ fontSize: '10px', textAlign: 'right'}}>{formatDecimal(value / nodeData.data.potentialTarget * 100)} %</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell style={{ padding: 0}}>
                    <div style={{
                      border: `5px solid #cccccc`,
                      borderRadius: 5
                    }}/>
                  </TableCell>
                  <TableCell style={{ fontSize: '10px'}}>Not Reached</TableCell>
                  <TableCell style={{ fontSize: '10px', textAlign: 'right'}}>{ notReachedValue }</TableCell>
                  <TableCell style={{ fontSize: '10px', textAlign: 'right'}}>{formatDecimal(notReachedValue / nodeData.data.potentialTarget * 100)} %</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
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

export default FullNode;
