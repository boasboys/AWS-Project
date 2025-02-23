import { StrictMode, useState } from "react";
import ReactDOM from "react-dom";
import { ReactFlowProvider } from "react-flow-renderer";

import Toolbar from './components/Toolbar';
import CampaignProfile from "./CampaignProfile";
import FullScreen from "./FullScreen";
import "./styles.css";

import steps from './campaign';

const App = () => {
  const [mode, setMode] = useState('profile');

  return (
    <ReactFlowProvider>
      <Toolbar
        currentMode={mode}
        changeMode={setMode}
      />
      { mode === 'profile' && (
        <CampaignProfile steps={steps} />
      )}
      { mode === 'fullscreen' && (
        <FullScreen steps={steps} />
      )}
    </ReactFlowProvider>
  );
}

const rootElement = document.getElementById("root");
ReactDOM.render(
  <StrictMode>
    <App />
  </StrictMode>,
  rootElement
);
