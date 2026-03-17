import React, { useState } from 'react';
import { useAppStore } from '../stores/appStore';
import type { Campaign } from '../types';

// ============================================================
// COMPOSANT MODAL — Créer une campagne
// ============================================================

interface CreateCampaignModalProps {
  onConfirm: (name: string, description?: string) => void;
  onCancel: () => void;
}

function CreateCampaignModal({
  onConfirm,
  onCancel,
}: CreateCampaignModalProps): React.ReactElement {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Nouvelle campagne</h2>

        <div className="modal-field">
          <label htmlFor="campaign-name">Nom de la campagne</label>
          <input
            id="campaign-name"
            type="text"
            placeholder="Ex : La Malédiction de Strahd"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>

        <div className="modal-field">
          <label htmlFor="campaign-desc">Description (optionnel)</label>
          <textarea
            id="campaign-desc"
            placeholder="Une courte description de la campagne..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onCancel}>
            Annuler
          </button>
          <button
            className="btn-primary"
            onClick={() => onConfirm(name, description)}
            disabled={name.trim() === ''}
          >
            Créer
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// COMPOSANT PRINCIPAL — Écran d'accueil
// ============================================================

export default function Home(): React.ReactElement {
  const { setActiveCampaign, setActiveSection } = useAppStore();

  const [showCreateModal, setShowCreateModal] = useState(false);

  const [campaigns, setCampaigns] = useState<Campaign[]>(() => {
    try {
      const saved = localStorage.getItem('dm-companion-campaigns');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  function handleCreateCampaign(name: string, description?: string): void {
    const newCampaign: Campaign = {
      id: crypto.randomUUID(),
      name,
      description,
      sessions: [],
      createdAt: new Date(),
    };
    const updated = [...campaigns, newCampaign];
    setCampaigns(updated);
    localStorage.setItem('dm-companion-campaigns', JSON.stringify(updated));
    setShowCreateModal(false);
    loadCampaign(newCampaign);
  }

  function loadCampaign(campaign: Campaign): void {
    setActiveCampaign(campaign);
    setActiveSection('notes');
  }

  return (
    <div className="home">
      {/* En-tête */}
      <header className="home-header">
        <div className="home-logo">X</div>
        <h1 className="home-title">DMing</h1>
        <p className="home-subtitle">L&apos;outil de MJ polyvalent</p>
      </header>

      {/* Actions principales */}
      <main className="home-main">
        <button className="btn-primary btn-large" onClick={() => setShowCreateModal(true)}>
          + Nouvelle campagne
        </button>

        {campaigns.length > 0 ? (
          <section className="campaigns-section">
            <h2>Campagnes récentes</h2>
            <ul className="campaigns-list">
              {campaigns
                .slice()
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((campaign) => (
                  <li key={campaign.id}>
                    <button className="campaign-card" onClick={() => loadCampaign(campaign)}>
                      <div className="campaign-card-info">
                        <span className="campaign-card-name">{campaign.name}</span>
                        {campaign.description && (
                          <span className="campaign-card-desc">{campaign.description}</span>
                        )}
                      </div>
                      <div className="campaign-card-meta">
                        <span>
                          {campaign.sessions?.length ?? 0} session
                          {(campaign.sessions?.length ?? 0) !== 1 ? 's' : ''}
                        </span>
                        <span>{new Date(campaign.createdAt).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </button>
                  </li>
                ))}
            </ul>
          </section>
        ) : (
          <p className="home-empty">
            Aucune campagne pour l&apos;instant, crées ta première maintenant.
          </p>
        )}
      </main>

      {/* Modal création */}
      {showCreateModal && (
        <CreateCampaignModal
          onConfirm={handleCreateCampaign}
          onCancel={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}
