import { Box } from '@mui/material';
import WAFRuleTree from '../components/WAFView/WAFView';
import Sidebar from '../components/layout/Sidebar';
import { useState } from 'react';
import RequestDebugger from '../debugger/RequestDebugger';

export default function ExplorerPage() {
  const [view, setView] = useState('tree');
  const [data, setData] = useState(null);

  return (
    <Box sx={{ display: 'flex', width: '100%', height: '100vh' }}>
      <Sidebar view={view} setView={setView} />
      <Box sx={{ flex: 1,overflow: 'auto' }}>
        {view === 'tree' && <WAFRuleTree data={data} setData={setData}/>}
        {view === 'debugger' && <RequestDebugger rules={data} />}
      </Box>
    </Box>
  );
}