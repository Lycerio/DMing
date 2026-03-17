// src/renderer/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './src/components/Sidebar';
import { useAppStore } from './src/stores/appStores';
import './App.css'; // Crée ce fichier si nécessaire

// Importe tes pages (pour l'instant, crée des pages vides si elles n'existent pas)
import Notes from './src/pages/Notes.tsx';
import Music from './pages/Music';
import Soundboard from './pages/Soundboard';
import Characters from './pages/Characters';
import Monsters from './pages/Characters'; // On utilise Characters pour l'instant, tu créeras Monsters après

const App: React.FC = () => {
  const { sidebarCollapsed } = useAppStore();

  return (
    <Router>
      <div className="app-container">
        <Sidebar />
        
        <main className={`main-content ${sidebarCollapsed ? 'expanded' : ''}`}>
          <div className="content-wrapper">
            <Routes>
              <Route path="/" element={<Navigate to="/notes" replace />} />
              <Route path="/notes" element={<Notes />} />
              <Route path="/music" element={<Music />} />
              <Route path="/soundboard" element={<Soundboard />} />
              <Route path="/characters" element={<Characters />} />
              <Route path="/monsters" element={<Monsters />} />
              <Route path="*" element={<Navigate to="/notes" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
};

export default App;