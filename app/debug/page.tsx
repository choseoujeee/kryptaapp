'use client';

import React, { useEffect, useState } from 'react';
import { 
  fetchSheetData,
  getLarpConfig, 
  getLarpConfigFromData,
  OrganizaceRow, 
  DokumentRow, 
  MOCK_ORGANIZACE, 
  MOCK_DOKUMENTY
} from '@/lib/data';

export default function DebugPage() {
  const [data, setData] = useState<{
    organizace: OrganizaceRow[];
    dokumenty: DokumentRow[];
    loading: boolean;
    error: string | null;
  }>({
    organizace: MOCK_ORGANIZACE,
    dokumenty: MOCK_DOKUMENTY,
    loading: false,
    error: null
  });

  const [sheetsData, setSheetsData] = useState<{
    organizace: any[];
    dokumenty: any[];
    error: string | null;
  }>({
    organizace: [],
    dokumenty: [],
    error: null
  });

  useEffect(() => {
    const loadSheetsData = async () => {
      try {
        console.log('🔍 Debug: Loading data from Google Sheets...');
        const [organizaceData, dokumentyData] = await Promise.all([
          fetchSheetData('organizace'),
          fetchSheetData('dokumenty')
        ]);
        
        setSheetsData({
          organizace: organizaceData,
          dokumenty: dokumentyData,
          error: null
        });
        
        console.log('🔍 Debug: Sheets data loaded:', {
          organizace: organizaceData.length,
          dokumenty: dokumentyData.length
        });
      } catch (error) {
        console.error('🔍 Debug: Error loading sheets data:', error);
        setSheetsData({
          organizace: [],
          dokumenty: [],
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    };
    
    loadSheetsData();
  }, []);

  const config = getLarpConfigFromData(data.organizace);
  const characters = data.organizace.filter(item => item.typ === 'postava');
  const sheetsCharacters = sheetsData.organizace.filter((item: any) => item.typ === 'postava');

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold mb-8">DEBUG STRÁNKA</h1>
      
      {/* Config Info */}
      <div className="bg-gray-100 p-4 rounded">
        <h2 className="text-xl font-bold mb-4">Konfigurace</h2>
        <pre className="text-sm">{JSON.stringify(config, null, 2)}</pre>
      </div>

      {/* Mock Data */}
      <div className="bg-blue-100 p-4 rounded">
        <h2 className="text-xl font-bold mb-4">Mock Data</h2>
        <div className="mb-4">
          <strong>Postavy (mock):</strong> {characters.length}
          <ul className="ml-4 mt-2">
            {characters.map(char => (
              <li key={char.slug}>- {char.jmeno} ({char.slug}) - {char.skupina}</li>
            ))}
          </ul>
        </div>
        <div>
          <strong>Dokumenty (mock):</strong> {data.dokumenty.length}
        </div>
      </div>

      {/* Sheets Data */}
      <div className="bg-green-100 p-4 rounded">
        <h2 className="text-xl font-bold mb-4">Google Sheets Data</h2>
        {sheetsData.error ? (
          <div className="text-red-600">
            <strong>Error:</strong> {sheetsData.error}
          </div>
        ) : (
          <div>
            <div className="mb-4">
              <strong>Postavy (sheets):</strong> {sheetsCharacters.length}
              <ul className="ml-4 mt-2">
                {sheetsCharacters.map((char: any, index: number) => (
                  <li key={index}>- {char.jmeno} ({char.slug}) - {char.skupina}</li>
                ))}
              </ul>
            </div>
            <div>
              <strong>Dokumenty (sheets):</strong> {sheetsData.dokumenty.length}
            </div>
          </div>
        )}
      </div>

      {/* Raw Sheets Data */}
      <div className="bg-yellow-100 p-4 rounded">
        <h2 className="text-xl font-bold mb-4">Raw Sheets Data</h2>
        <div className="mb-4">
          <strong>Organizace:</strong>
          <pre className="text-xs mt-2 bg-white p-2 rounded overflow-auto max-h-40">
            {JSON.stringify(sheetsData.organizace, null, 2)}
          </pre>
        </div>
        <div>
          <strong>Dokumenty:</strong>
          <pre className="text-xs mt-2 bg-white p-2 rounded overflow-auto max-h-40">
            {JSON.stringify(sheetsData.dokumenty, null, 2)}
          </pre>
        </div>
      </div>

      {/* URL Info */}
      <div className="bg-purple-100 p-4 rounded">
        <h2 className="text-xl font-bold mb-4">URL Info</h2>
        <div>
          <strong>Sheets URL:</strong> {getLarpConfig().sheetsUrl}
        </div>
      </div>
    </div>
  );
}