'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import DocumentAccordion from '@/components/DocumentAccordion';
import Stamp from '@/components/Stamp';
import { 
  getLarpConfig, 
  saveLarpConfig, 
  LarpConfig, 
  OrganizaceRow, 
  DokumentRow, 
  getAdminStats, 
  MOCK_ORGANIZACE, 
  MOCK_DOKUMENTY,
  fetchSheetData,
  sortDocuments,
  groupDocumentsByType,
  getLarpConfigFromData
} from '@/lib/data';

interface AdminStats {
  totalCharacters: number;
  totalDocuments: number;
  lastUpdate: string;
  runInfo: string;
}

interface EditModalData {
  type: 'config' | 'character' | null;
  data?: any;
}

export default function AdminPage() {
  console.log('Rendering admin page');
  
  // Start with mock data immediately to prevent loading screen issues
  const [data, setData] = useState<{
    organizace: OrganizaceRow[];
    dokumenty: DokumentRow[];
    loading: boolean;
    error: string | null;
  }>({
    organizace: MOCK_ORGANIZACE,
    dokumenty: MOCK_DOKUMENTY,
    loading: false,
    error: 'Používají se demo data. Pokud chcete načíst data z Google Sheets, obnovte stránku.'
  });

  // Get config from data (or fallback to localStorage)
  const config = getLarpConfigFromData(data.organizace);
  console.log('Config from data:', config);

  // Check if URL needs fixing
  const localStorageConfig = getLarpConfig();
  const needsUrlFix = localStorageConfig.sheetsUrl && localStorageConfig.sheetsUrl.includes('/edit');
  
  // Manual URL fix function
  const fixUrl = () => {
    console.log('🔧 Manually fixing URL format...');
    const spreadsheetIdMatch = localStorageConfig.sheetsUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (spreadsheetIdMatch) {
      const spreadsheetId = spreadsheetIdMatch[1];
      const newSheetsUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=`;
      const updatedConfig = { ...localStorageConfig, sheetsUrl: newSheetsUrl };
      saveLarpConfig(updatedConfig);
      console.log('✅ URL format updated, reloading page...');
      window.location.reload();
    }
  };

  // Try to load real data in background, but don't block rendering
  useEffect(() => {
    console.log('🚀 Attempting to load real data from Google Sheets...');
    console.log('⏰ Current time:', new Date().toISOString());
    
    const loadRealData = async () => {
      try {
        console.log('📡 Starting fetch requests to Google Sheets...');
        const [organizaceData, dokumentyData] = await Promise.all([
          fetchSheetData('organizace'),
          fetchSheetData('dokumenty')
        ]);
        
        console.log(`📊 Fetched from sheets: ${organizaceData.length} organizace, ${dokumentyData.length} documents`);
        
        if (organizaceData.length > 0 && dokumentyData.length > 0) {
          console.log(`✅ Successfully loaded real data: ${organizaceData.length} organizace, ${dokumentyData.length} documents`);
          console.log('👥 Real characters from sheets:', organizaceData.filter(item => item.typ === 'postava').map(c => c.jmeno));
          console.log('📄 Real documents from sheets:', dokumentyData.slice(0, 3).map(d => ({ typ: d.typ, komu: d.komu, nadpis: d.nadpis })));
          
          setData({
            organizace: organizaceData,
            dokumenty: dokumentyData,
            loading: false,
            error: null
          });
        } else if (organizaceData.length === 0 && dokumentyData.length === 0) {
          console.log('📋 No data from Google Sheets, using demo data');
          setData(prev => ({
            ...prev,
            error: 'Používají se demo data. Pro načtení z Google Sheets zkontrolujte nastavení.'
          }));
        } else {
          console.log('⚠️ Partial data from Google Sheets, using demo data for consistency');
          setData(prev => ({
            ...prev,
            error: 'Částečná data z Google Sheets. Používají se demo data pro konzistenci.'
          }));
        }
      } catch (error) {
        // This should rarely happen now due to improved error handling in fetchSheetData
        console.log('🔄 Fallback to demo data due to loading error');
        console.log('👥 Mock characters being used:', MOCK_ORGANIZACE.filter(item => item.typ === 'postava').map(c => c.jmeno));
        
        setData(prev => ({
          ...prev,
          error: 'Nepodařilo se načíst data z Google Sheets. Používají se demo data.'
        }));
      }
    };
    
    // Add small delay to allow initial render
    setTimeout(loadRealData, 500);
  }, []);

  // Filter characters
  console.log('🔍 All organizace data:', data.organizace);
  const characters = data.organizace.filter(item => item.typ === 'postava');
  console.log(`Found ${characters.length} characters:`, characters.map(c => c.jmeno));
  console.log('🔍 Character details:', characters.map(c => ({ jmeno: c.jmeno, slug: c.slug, skupina: c.skupina })));

  // Sort and filter documents for admin view (vsichni only)
  const adminDocuments = data.dokumenty.filter(doc => doc.komu === 'vsichni');
  const sortedDocs = sortDocuments(adminDocuments);
  const documents = groupDocumentsByType(sortedDocs);
  
  console.log(`Found ${adminDocuments.length} documents for admin view`);
  console.log('Admin documents:', adminDocuments.map(d => ({ typ: d.typ, nadpis: d.nadpis })));
  console.log('Grouped documents:', Object.keys(documents));

  // Calculate statistics
  const lastUpdate = data.dokumenty.length > 0 
    ? new Date(Math.max(...data.dokumenty.map(doc => new Date(doc['datum-zverejneni']).getTime())))
    : new Date();
  
  const stats = {
    totalCharacters: characters.length,
    totalDocuments: data.dokumenty.length,
    lastUpdate: lastUpdate.toLocaleString('cs-CZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }),
    runInfo: `${config.beh.cislo} | ${config.beh.datum}`
  };
  
  console.log('Admin statistics:', stats);
  
  const [editModal, setEditModal] = useState<{ type: string; data?: any } | null>(null);
  const [isFirstTime, setIsFirstTime] = useState(false);
  
  useEffect(() => {
    checkFirstTimeSetup();
  }, []);

  const checkFirstTimeSetup = () => {
    const hasSheets = localStorageConfig.sheetsUrl && !localStorageConfig.sheetsUrl.includes('EXAMPLE');
    setIsFirstTime(!hasSheets);
    console.log('First time setup needed:', !hasSheets);
  };

  const handleSaveConfig = (newConfig: LarpConfig) => {
    saveLarpConfig(newConfig);
    setEditModal(null);
    setIsFirstTime(false);
    console.log('Config saved');
  };

  const renderFirstTimeSetup = () => {
    if (!isFirstTime) return null;

    return (
      <div className="mb-8 p-6 bg-vintage-paper2 border-2 border-vintage-red rounded-sm">
        <div className="text-center">
          <Stamp type="top-secret">PRVNÍ NASTAVENÍ</Stamp>
          <h2 className="title-section mt-4">Vítejte v admin rozhraní!</h2>
          <p className="text-body mb-6">
            Pro začátek práce je potřeba nastavit URL Google Sheets tabulky s daty pro váš LARP.
          </p>
          <button
            onClick={() => setEditModal({ type: 'config', data: localStorageConfig })}
            className="btn-primary"
          >
            Nastavit Google Sheets URL
          </button>
        </div>
      </div>
    );
  };

  const renderCharactersList = () => {
    console.log(`Rendering characters list: ${characters.length} characters`);
    
    if (characters.length === 0) {
      return (
        <div className="text-center p-8">
          <Stamp type="confidential">ŽÁDNÉ POSTAVY</Stamp>
          <div className="mt-4 text-vintage-brown font-typewriter text-sm">
            V databázi nejsou registrováni žádní agenti.
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {characters.map((character) => {
          // Find medailonek for this character
          const medailonek = data.dokumenty.find(doc => 
            doc.typ === 'medailonek' && doc.komu === character.slug
          );
          
          return (
            <div key={character.slug} className="character-card bg-vintage-paper2 p-4 rounded-sm border border-vintage-brown border-opacity-30">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Stamp type="classified">CLASSIFIED</Stamp>
                </div>
              </div>
              
              <h3 className="font-serif text-lg font-bold text-vintage-ink mb-1">
                {character.jmeno}
              </h3>
              
              <div className="text-sm text-vintage-brown font-typewriter mb-3">
                <span className="font-bold">Jednotka:</span> {character.skupina}
              </div>
              
              <div className="text-xs text-vintage-brown font-typewriter mb-3">
                Dokumenty: {data.dokumenty.filter(doc => doc.komu === character.slug || doc.komu === 'vsichni').length} | 
                Akt: {stats.lastUpdate}
              </div>
              
              <div className="flex gap-2">
                <Link 
                  href={`/hrac/${character.slug}`}
                  target="_blank"
                  className="btn-primary text-xs"
                >
                  Prohlédnout profil
                </Link>
              </div>
              
              {medailonek && (
                <div className="mt-3 text-xs text-vintage-green font-typewriter">
                  ✏️ Medailonek je nastaven
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderEditModal = () => {
    if (!editModal || !editModal.type) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-vintage-paper border-2 border-vintage-brown rounded-sm max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="title-section">
                {editModal.type === 'config' ? 'Nastavení Google Sheets' : 'Upravit medailonek'}
              </h3>
              <button
                onClick={() => setEditModal(null)}
                className="text-vintage-brown hover:text-vintage-dark text-2xl"
              >
                ×
              </button>
            </div>
            
            {editModal.type === 'config' && (
              <SheetsUrlEditForm 
                config={editModal.data} 
                onSave={handleSaveConfig}
                onCancel={() => setEditModal(null)}
              />
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Layout title={`${config.nazev} - Admin Panel`}>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="text-center">
          <h1 className="text-3xl font-serif font-bold text-vintage-ink mb-2">
            ADMIN PANEL
          </h1>
          <div className="text-vintage-brown font-typewriter text-sm">
            {config.nazev} - Správa operace
          </div>
          {data.error && (
            <div className="mt-2 text-xs text-vintage-red font-typewriter">
              ⚠️ {data.error}
            </div>
          )}
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="stat-card text-center">
            <div className="text-2xl font-bold text-vintage-ink">{config.beh.cislo}</div>
            <div className="text-sm text-vintage-brown font-typewriter">Běh</div>
            <div className="text-xs text-vintage-brown">{config.beh.datum}</div>
            <div className="text-xs text-vintage-brown">{config.beh.misto}</div>
          </div>
          <div className="stat-card text-center">
            <div className="text-2xl font-bold text-vintage-ink">{stats.totalCharacters}</div>
            <div className="text-sm text-vintage-brown font-typewriter">Postavy</div>
          </div>
          <div className="stat-card text-center">
            <div className="text-2xl font-bold text-vintage-ink">{stats.totalDocuments}</div>
            <div className="text-sm text-vintage-brown font-typewriter">Dokumenty</div>
          </div>
          <div className="stat-card text-center">
            <div className="text-2xl font-bold text-vintage-ink">{stats.lastUpdate.split(' ')[1]}</div>
            <div className="text-sm text-vintage-brown font-typewriter">Aktualizace</div>
            <div className="text-xs text-vintage-brown">{stats.lastUpdate.split(' ')[0]}</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4">
          {needsUrlFix && (
            <button 
              onClick={fixUrl}
              className="btn-primary bg-vintage-red hover:bg-red-700"
            >
              🔧 Opravit URL format
            </button>
          )}
          <button 
            onClick={() => setEditModal({ type: 'config', data: localStorageConfig })}
            className="btn-secondary"
          >
            Změnit URL Google Sheets
          </button>
        </div>

        {/* Characters Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-serif font-bold text-vintage-ink">
            POSTAVY
          </h2>
          {renderCharactersList()}
        </div>

        {/* Documents Section */}
        {Object.keys(documents).length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-xl font-serif font-bold text-vintage-ink">
              DOKUMENTY PRO VŠECHNY
            </h2>
            <DocumentAccordion documents={documents} />
          </div>
        ) : (
          <div className="document-card">
            <div className="p-8 text-center">
              <div className="text-4xl mb-4 font-typewriter font-bold">!</div>
              <Stamp type="confidential">ŽÁDNÉ DOKUMENTY</Stamp>
              <div className="mt-4 text-vintage-brown font-typewriter text-sm">
                Žádné dokumenty k dispozici pro všechny účastníky.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editModal && renderEditModal()}
    </Layout>
  );
}

// Sheets URL Edit Form Component
const SheetsUrlEditForm: React.FC<{
  config: LarpConfig;
  onSave: (config: LarpConfig) => void;
  onCancel: () => void;
}> = ({ config, onSave, onCancel }) => {
  const [formData, setFormData] = useState<LarpConfig>(config);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Saving sheets URL:', formData.sheetsUrl);
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h4 className="font-serif font-bold mb-4">Nastavení Google Sheets:</h4>
        <div className="text-sm text-vintage-brown mb-4">
          Všechna data (postavy, dokumenty, konfigurace) se načítají z Google Sheets tabulky.
          Pro úpravu dat použijte přímo Google Sheets.
        </div>
      </div>

      <div>
        <h4 className="font-serif font-bold mb-4">URL Google Sheets:</h4>
        <div>
          <label className="block text-sm font-bold text-vintage-brown mb-1">
            URL tabulky:
          </label>
          <input
            type="url"
            value={formData.sheetsUrl}
            onChange={(e) => setFormData({...formData, sheetsUrl: e.target.value})}
            className="form-input w-full"
            placeholder="https://docs.google.com/spreadsheets/d/YOUR_ID/gviz/tq?tqx=out:csv&sheet="
            required
          />
          <div className="text-xs text-vintage-brown mt-1">
            Zadejte základní URL bez názvu listu (končí na &sheet=)
          </div>
        </div>
      </div>

      <div className="flex gap-4 pt-4 border-t border-vintage-brown border-opacity-30">
        <button type="submit" className="btn-primary">
          Uložit URL
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">
          Zrušit
        </button>
      </div>
    </form>
  );
};