import React from 'react';
import { useAppStore } from './stores/appStore';
import Home from './pages/Home';
import Sidebar from './components/Sidebar';
import Notes from './pages/Notes';
import Music from './pages/Music';
import Characters from './pages/Characters';
import Soundboard from './pages/Soundboard';
import Monsters from './pages/Monsters';

// ============================================================

function renderSection(section: string): React.ReactElement {
  switch (section) {
    case 'notes':
      return <Notes />;
    case 'music':
      return <Music />;
    case 'characters':
      return <Characters />;
    case 'soundboard':
      return <Soundboard />;
    case 'monsters':
      return <Monsters />;
    default:
      return <Notes />;
  }
}

// ============================================================

export default function App(): React.ReactElement {
  const { activeCampaign, activeSection } = useAppStore();

  if (!activeCampaign) return <Home />;

  return (
    <div className="layout">
      <Sidebar />
      <main className="layout-content">{renderSection(activeSection)}</main>
    </div>
  );
}
