'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import DocumentAccordion from '@/components/DocumentAccordion';
import Stamp from '@/components/Stamp';
import { 
  fetchSheetData,
  getLarpConfig, 
  saveLarpConfig,
  LarpConfig,
  getCharacterBySlug, 
  getDocumentsForCharacter, 
  sortDocuments, 
  groupDocumentsByType,
  OrganizaceRow,
  DokumentRow,
  MOCK_ORGANIZACE,
  MOCK_DOKUMENTY,
  getLarpConfigFromData
} from '@/lib/data';

interface HracPageProps {
  params: Promise<{ slug: string }>;
}

// Client component that handles state and hooks
function CharacterPageClient({ slug }: { slug: string }) {
  console.log(`Rendering character page for: ${slug}`);
  
  // Get config from localStorage first (for sheets URL)
  const localStorageConfig = getLarpConfig();
  
  // Check if URL needs fixing (same logic as admin page)
  const needsUrlFix = localStorageConfig.sheetsUrl.includes('/edit') || 
                      localStorageConfig.sheetsUrl.includes('#gid=') ||
                      localStorageConfig.sheetsUrl.includes('EXAMPLE');
  
  console.log('Character page - Current config:', localStorageConfig);
  console.log('Character page - Needs URL fix:', needsUrlFix);
  
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
    error: needsUrlFix 
      ? 'Detekován nesprávný formát URL. Kontaktujte administrátora pro opravu nastavení.'
      : 'Používají se demo data. Pokud chcete načíst data z Google Sheets, obnovte stránku.'
  });

  // Try to load real data in background, but don't block rendering
  useEffect(() => {
    console.log(`🚀 Character page: Attempting to load real data for character: ${slug}`);
    console.log('⏰ Current time:', new Date().toISOString());
    
    const loadRealData = async () => {
      try {
        console.log('📡 Character page: Starting fetch requests to Google Sheets...');
        const [organizaceData, dokumentyData] = await Promise.all([
          fetchSheetData('organizace'),
          fetchSheetData('dokumenty')
        ]);
        
        console.log(`📊 Character page: Fetched from sheets for ${slug}: ${organizaceData.length} organizace, ${dokumentyData.length} documents`);
        
        if (organizaceData.length > 0 && dokumentyData.length > 0) {
          console.log(`✅ Character page: Successfully loaded real data for ${slug}: ${organizaceData.length} organizace, ${dokumentyData.length} documents`);
          console.log('👥 Real characters from sheets:', organizaceData.filter(item => item.typ === 'postava').map(c => c.jmeno));
          console.log('📄 Real documents from sheets:', dokumentyData.slice(0, 3).map(d => ({ typ: d.typ, komu: d.komu, nadpis: d.nadpis })));
          
          setData({
            organizace: organizaceData,
            dokumenty: dokumentyData,
            loading: false,
            error: null
          });
        } else if (organizaceData.length === 0 && dokumentyData.length === 0) {
          console.log(`📋 Character page: No data from Google Sheets for ${slug}, using demo data`);
          setData(prev => ({
            ...prev,
            error: 'Používají se demo data. Pro načtení z Google Sheets zkontrolujte nastavení.'
          }));
        } else {
          console.log(`⚠️ Character page: Partial data from Google Sheets for ${slug}, using demo data for consistency`);
          setData(prev => ({
            ...prev,
            error: 'Částečná data z Google Sheets. Používají se demo data pro konzistenci.'
          }));
        }
      } catch (error) {
        // This should rarely happen now due to improved error handling in fetchSheetData
        console.log(`🔄 Character page: Fallback to demo data for ${slug} due to loading error`);
        console.log('👥 Mock characters being used:', MOCK_ORGANIZACE.filter(item => item.typ === 'postava').map(c => c.jmeno));
        
        setData(prev => ({
          ...prev,
          error: 'Nepodařilo se načíst data z Google Sheets. Používají se demo data.'
        }));
      }
    };
    
    // Add small delay to allow initial render
    setTimeout(loadRealData, 500);
  }, [slug]);

  // No loading screen - we start with mock data immediately

  // Get config from data (or fallback to localStorage)
  const config = getLarpConfigFromData(data.organizace);
  const character = data.organizace.find(item => item.typ === 'postava' && item.slug === slug);

  if (!character) {
    return (
      <Layout title="Agent nenalezen">
        <div className="text-center p-8">
          <Stamp type="confidential">CLASSIFIED</Stamp>
          <div className="mt-8">
            <h1 className="text-2xl font-serif font-bold text-vintage-ink mb-4">
              AGENT NENALEZEN
            </h1>
            <div className="text-vintage-brown font-typewriter">
              Agent s kódovým označením "{slug}" nebyl nalezen v databázi.
            </div>
            <div className="mt-6">
              <Link href="/" className="btn-primary">
                Návrat na hlavní stránku
              </Link>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Get documents for this character (both personal and general)
  const characterDocuments = getDocumentsForCharacter(data.dokumenty, character.slug, data.organizace);
  
  console.log(`Found ${characterDocuments.length} documents for ${character.jmeno}`);
  console.log('Character documents:', characterDocuments.map(d => ({ typ: d.typ, komu: d.komu, nadpis: d.nadpis })));
  console.log('Character slug:', character.slug);
  console.log('All document komu values:', Array.from(new Set(data.dokumenty.map(d => d.komu))));

  // Separate medailonek from other documents
  const medailonek = characterDocuments.find(doc => doc.typ === 'medailonek');
  const otherDocuments = characterDocuments.filter(doc => doc.typ !== 'medailonek');

  const sortedDocs = sortDocuments(otherDocuments);
  const documents = groupDocumentsByType(sortedDocs);
  
  console.log('Grouped character documents:', Object.keys(documents));
  console.log('Medailonek found:', medailonek ? 'yes' : 'no');

  return (
    <Layout title={`${character.jmeno} - ${config.nazev}`}>
      <div className="space-y-8">
        {data.error && (
          <div className="text-center text-xs text-vintage-red font-typewriter">
            ⚠️ {data.error}
          </div>
        )}

        {/* Character Header */}
        <div className="text-center">
          <Stamp type="classified">CLASSIFIED</Stamp>
          <div className="mt-6">
            <h1 className="text-3xl font-serif font-bold text-vintage-ink mb-2">
              {character.jmeno}
            </h1>
            <div className="text-vintage-brown font-typewriter text-lg">
              Jednotka: {character.skupina}
            </div>
          </div>
        </div>

        {/* Character Medallion/Description */}
        {medailonek && (
          <div className="document-card">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Stamp type="confidential">PERSONAL</Stamp>
                <h2 className="text-xl font-serif font-bold text-vintage-ink">
                  {medailonek.nadpis}
                </h2>
              </div>
              
              <div className="bg-vintage-paper2 p-4 rounded-sm border border-vintage-brown border-opacity-30">
                <div 
                  className="font-typewriter text-sm text-vintage-ink leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: medailonek.obsah }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Special Operations Executive Section */}
        <div className="document-card">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Stamp type="official">OFFICIAL</Stamp>
              <h2 className="text-xl font-serif font-bold text-vintage-ink">
                Special Operations Executive
              </h2>
            </div>
            
            <div className="bg-vintage-paper2 p-4 rounded-sm border border-vintage-brown border-opacity-30 mb-4">
              <div className="font-typewriter text-sm text-vintage-ink leading-relaxed">
                <strong>Běh:</strong> {config.beh.cislo}<br />
                <strong>Datum:</strong> {config.beh.datum}<br />
                <strong>Místo:</strong> {config.beh.misto}<br />
                <strong>Adresa:</strong> {config.beh.adresa}
              </div>
            </div>

            <div className="font-typewriter text-sm text-vintage-ink leading-relaxed">
              <p className="mb-4">
                {character.jmeno}, zde jsou aktuální informace pro vaši účast v operaci.
              </p>
              <p>
                Jako člen jednotky <strong>{character.skupina}</strong> máte přístup k následujícím 
                dokumentům a instrukcím. Zachovejte maximální utajení a postupujte podle stanovených protokolů.
              </p>
            </div>
          </div>
        </div>

        {/* Documents Section */}
        {Object.keys(documents).length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-xl font-serif font-bold text-vintage-ink">
              OPERAČNÍ DOKUMENTY
            </h2>
            <DocumentAccordion documents={documents} />
          </div>
        ) : (
          <div className="document-card">
            <div className="p-8 text-center">
              <div className="text-4xl mb-4 font-typewriter font-bold">!</div>
              <Stamp type="confidential">ŽÁDNÉ DOKUMENTY</Stamp>
              <div className="mt-4 text-vintage-brown font-typewriter text-sm">
                Pro tohoto agenta nejsou aktuálně k dispozici žádné operační dokumenty.
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

// Server component that handles async params
export default async function CharacterPage({ params }: HracPageProps) {
  const { slug } = await params;
  return <CharacterPageClient slug={slug} />;
}