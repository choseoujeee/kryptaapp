export type OrganizaceRow = {
  typ: 'skupina' | 'postava' | 'konfigurace';
  jmeno: string;
  slug: string;
  skupina: string;
  popis?: string; // Character medallion/description or config value
};

export type DokumentRow = {
  typ: 'organizacni' | 'herni' | 'postava' | 'medailonek';
  komu: string;
  nadpis: string;
  obsah: string;
  'datum-zverejneni': string;
  priorita: 'hlavni' | 'normalni';
};

export type LarpConfig = {
  nazev: string;
  organizator: string;
  kontakt: string;
  zapati: string;
  beh: {
    cislo: string;
    datum: string;
    misto: string;
    adresa: string;
  };
  sheetsUrl: string;
};

const DEFAULT_SHEETS_URL = 'https://docs.google.com/spreadsheets/d/1NrE-yz0a5ZJ3FyVKgY8bjRQeiAvgPwBFezdMLgFMrIA/gviz/tq?tqx=out:csv&sheet=';

// Fetch data from Google Sheets
export async function fetchSheetData(sheetName: 'organizace' | 'dokumenty'): Promise<any[]> {
  console.log(`🚀 FETCHSHEETDATA CALLED: ${sheetName} at ${new Date().toISOString()}`);
  console.log(`📊 DEFAULT_SHEETS_URL: ${DEFAULT_SHEETS_URL}`);
  
  // Get sheets URL from current config, not just localStorage
  const config = getLarpConfig();
  let sheetsUrl = config.sheetsUrl;
  
  console.log(`🔧 Config sheetsUrl: ${sheetsUrl}`);
  console.log(`🔧 Config full:`, config);
  
  // Check if we have a sheets URL configured
  if (!sheetsUrl || sheetsUrl.includes('EXAMPLE') || sheetsUrl.trim() === '') {
    console.log(`📋 No valid Google Sheets URL configured, using mock data for ${sheetName}`);
    return [];
  }
  
  // Convert edit URL to CSV API URL if needed
  if (sheetsUrl.includes('/edit')) {
    console.log('🔄 Converting edit URL to CSV API URL');
    const spreadsheetIdMatch = sheetsUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (spreadsheetIdMatch) {
      const spreadsheetId = spreadsheetIdMatch[1];
      sheetsUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=`;
      console.log(`✅ Converted to CSV API URL: ${sheetsUrl}`);
    } else {
      console.log('❌ Could not extract spreadsheet ID from URL');
      return [];
    }
  }
  
  console.log(`🔗 Using sheets URL: ${sheetsUrl}`);
  
  const url = `${sheetsUrl}${sheetName}`;
  
  try {
    console.log(`🌐 Fetching from URL: ${url}`);
    
    // Add a timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(url, {
      signal: controller.signal,
      mode: 'cors',
      cache: 'no-cache'
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const csvText = await response.text();
    
    if (!csvText || csvText.trim().length === 0) {
      console.log(`⚠️ Empty response from Google Sheets for ${sheetName}`);
      return [];
    }
    
    console.log(`📄 Raw CSV data for ${sheetName} (first 200 chars):`, csvText.substring(0, 200));
    
    const rows = csvText.split('\n').filter(row => row.trim());
    if (rows.length === 0) {
      console.log(`📋 No data rows found for ${sheetName}`);
      return [];
    }
    
    const headers = rows[0].split(',').map(h => h.replace(/"/g, '').trim());
    console.log(`📊 Headers for ${sheetName}:`, headers);
    console.log(`📊 Number of headers: ${headers.length}`);
    console.log(`📊 Expected headers for ${sheetName}:`, sheetName === 'organizace' ? ['typ', 'jmeno', 'slug', 'skupina', 'popis'] : ['typ', 'komu', 'nadpis', 'obsah', 'datum-zverejneni', 'priorita']);
    
    const data = rows.slice(1).map((row, rowIndex) => {
      console.log(`📄 Processing row ${rowIndex + 1}:`, row.substring(0, 100) + '...');
      // More robust CSV parsing to handle commas in content
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < row.length; i++) {
        const char = row[i];
        const nextChar = row[i + 1];
        
        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            // Escaped quote
            current += '"';
            i++; // skip next quote
          } else {
            // Toggle quote state
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          // End of field
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      
      // Add last field
      values.push(current.trim());
      
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[header] = values[index] || '';
      });
      
      // Ensure all required fields exist (for backward compatibility)
      if (!obj.hasOwnProperty('popis')) {
        obj.popis = '';
      }
      
      console.log(`✅ Parsed row ${rowIndex + 1}:`, obj);
      return obj;
    });
    
    console.log(`✅ Successfully parsed ${data.length} rows for ${sheetName}`);
    
    // Special logging for organizace sheet
    if (sheetName === 'organizace') {
      const postavy = data.filter((item: any) => item.typ === 'postava');
      const skupiny = data.filter((item: any) => item.typ === 'skupina');
      const konfigurace = data.filter((item: any) => item.typ === 'konfigurace');
      console.log(`📊 Organizace breakdown: ${postavy.length} postavy, ${skupiny.length} skupiny, ${konfigurace.length} konfigurace`);
      console.log(`📊 Postavy:`, postavy.map((p: any) => ({ jmeno: p.jmeno, slug: p.slug, skupina: p.skupina })));
    }
    
    return data;
    
  } catch (error) {
    // More specific error handling
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.log(`⏱️ Timeout loading ${sheetName} data from Google Sheets (using fallback data)`);
      } else if (error.message.includes('Failed to fetch')) {
        console.log(`🌐 Network error loading ${sheetName} data from Google Sheets (using fallback data)`);
        console.log(`💡 Possible causes: CORS policy, private sheet, or network connectivity`);
      } else if (error.message.includes('HTTP')) {
        console.log(`🚫 HTTP error loading ${sheetName} data: ${error.message} (using fallback data)`);
      } else {
        console.log(`❌ Error loading ${sheetName} data: ${error.message} (using fallback data)`);
      }
    } else {
      console.log(`❓ Unknown error loading ${sheetName} data (using fallback data):`, error);
    }
    
    // Return empty array so the calling code can fall back to mock data
    return [];
  }
}

// Get character data by slug
export function getCharacterBySlug(organizaceData: OrganizaceRow[], slug: string): OrganizaceRow | null {
  console.log(`Looking for character with slug: ${slug}`);
  const character = organizaceData.find(item => 
    item.typ === 'postava' && item.slug === slug
  );
  console.log(`Found character:`, character);
  return character || null;
}

// Filter documents for character
export function getDocumentsForCharacter(dokumentyData: DokumentRow[], slug: string, organizaceData: OrganizaceRow[]): DokumentRow[] {
  console.log(`Filtering documents for character: ${slug}`);
  
  // Find character data to get their group
  const character = getCharacterBySlug(organizaceData, slug);
  const characterGroup = character?.skupina || '';
  
  const filtered = dokumentyData.filter(doc => 
    doc.komu === slug || 
    doc.komu === 'vsichni' || 
    doc.komu === characterGroup
  );
  console.log(`Found ${filtered.length} documents for ${slug} (group: ${characterGroup})`);
  return filtered;
}

// Sort documents by priority and date
export function sortDocuments(documents: DokumentRow[]): DokumentRow[] {
  console.log(`Sorting ${documents.length} documents`);
  return documents.sort((a, b) => {
    // Priority first: "hlavni" comes before "normalni"
    if (a.priorita === 'hlavni' && b.priorita !== 'hlavni') return -1;
    if (b.priorita === 'hlavni' && a.priorita !== 'hlavni') return 1;
    
    // Then by date: newest first
    const dateA = new Date(a['datum-zverejneni']);
    const dateB = new Date(b['datum-zverejneni']);
    return dateB.getTime() - dateA.getTime();
  });
}

// Group documents by type
export function groupDocumentsByType(documents: DokumentRow[]): Record<string, DokumentRow[]> {
  console.log(`Grouping ${documents.length} documents by type`);
  const grouped = documents.reduce((acc, doc) => {
    if (!acc[doc.typ]) acc[doc.typ] = [];
    acc[doc.typ].push(doc);
    return acc;
  }, {} as Record<string, DokumentRow[]>);
  
  console.log(`Grouped documents:`, Object.keys(grouped).map(key => `${key}: ${grouped[key].length}`));
  return grouped;
}

// Get LARP configuration from localStorage (fallback)
export function getLarpConfig(): LarpConfig {
  if (typeof window === 'undefined') {
    return getDefaultConfig();
  }
  
  const stored = localStorage.getItem('larpConfig');
  if (!stored) {
    const defaultConfig = getDefaultConfig();
    localStorage.setItem('larpConfig', JSON.stringify(defaultConfig));
    return defaultConfig;
  }
  
  try {
    return JSON.parse(stored);
  } catch {
    return getDefaultConfig();
  }
}

// Save LARP configuration to localStorage (fallback)
export function saveLarpConfig(config: LarpConfig): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('larpConfig', JSON.stringify(config));
    console.log('LARP config saved:', config);
  }
}

// Get LARP configuration from organizace data
export function getLarpConfigFromData(organizaceData: OrganizaceRow[]): LarpConfig {
  const configRows = organizaceData.filter(item => item.typ === 'konfigurace');
  
  if (configRows.length === 0) {
    console.log('No config data found, using default config');
    return getDefaultConfig();
  }
  
  const config: LarpConfig = {
    nazev: '',
    organizator: '',
    kontakt: '',
    zapati: '',
    beh: {
      cislo: '',
      datum: '',
      misto: '',
      adresa: ''
    },
    sheetsUrl: getDefaultConfig().sheetsUrl // Keep sheets URL from localStorage
  };
  
  configRows.forEach(row => {
    switch (row.jmeno) {
      case 'nazev':
        config.nazev = row.skupina;
        break;
      case 'organizator':
        config.organizator = row.skupina;
        break;
      case 'kontakt':
        config.kontakt = row.skupina;
        break;
      case 'zapati':
        config.zapati = row.skupina;
        break;
      case 'beh_cislo':
        config.beh.cislo = row.skupina;
        break;
      case 'beh_datum':
        config.beh.datum = row.skupina;
        break;
      case 'beh_misto':
        config.beh.misto = row.skupina;
        break;
      case 'beh_adresa':
        config.beh.adresa = row.skupina;
        break;
    }
  });
  
  console.log('Config loaded from data:', config);
  return config;
}

// Get default configuration
function getDefaultConfig(): LarpConfig {
  return {
    nazev: 'Krypta 1942',
    organizator: 'XY',
    kontakt: 'kontakt@email.cz',
    zapati: 'Tajná operace - Pouze pro oprávněné osoby',
    beh: {
      cislo: '1',
      datum: '30. 8. 2025',
      misto: 'Praha',
      adresa: 'Kostel sv. Cyrila a Metoděje, Resslova 9a, Praha 2'
    },
    sheetsUrl: DEFAULT_SHEETS_URL
  };
}

// Get statistics for admin dashboard
export async function getAdminStats(): Promise<{
  totalCharacters: number;
  totalDocuments: number;
  lastUpdate: string;
  runInfo: string;
}> {
  console.log('Calculating admin statistics');
  
  try {
    const [organizaceData, dokumentyData] = await Promise.all([
      fetchSheetData('organizace'),
      fetchSheetData('dokumenty')
    ]);
    
    // Use mock data if real data is empty or failed to load
    const actualOrganizaceData = organizaceData.length > 0 ? organizaceData : MOCK_ORGANIZACE;
    const actualDokumentyData = dokumentyData.length > 0 ? dokumentyData : MOCK_DOKUMENTY;
    
    console.log(`Using ${actualOrganizaceData.length > 0 ? 'real' : 'mock'} organizace data: ${actualOrganizaceData.length} items`);
    console.log(`Using ${actualDokumentyData.length > 0 ? 'real' : 'mock'} dokumenty data: ${actualDokumentyData.length} items`);
    
    const characters = actualOrganizaceData.filter((item: OrganizaceRow) => item.typ === 'postava');
    
    // Better date parsing - try different date formats
    let lastUpdate: Date = new Date();
    if (actualDokumentyData.length > 0) {
      const validDates = actualDokumentyData
        .map((doc: DokumentRow) => {
          const dateStr = doc['datum-zverejneni'];
          console.log('Parsing date:', dateStr);
          
          // Skip empty or undefined dates
          if (!dateStr || dateStr.trim() === '') {
            console.warn('Empty date string, using current date');
            return new Date();
          }
          
          // Try parsing as ISO string first
          let parsedDate = new Date(dateStr);
          if (!isNaN(parsedDate.getTime())) {
            console.log('Successfully parsed ISO date:', parsedDate);
            return parsedDate;
          }
          
          // Try parsing Czech format (DD.MM.YYYY HH:MM:SS)
          const czechMatch = dateStr.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})/);
          if (czechMatch) {
            const [, day, month, year, hour, minute, second] = czechMatch;
            parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute), parseInt(second));
            if (!isNaN(parsedDate.getTime())) {
              console.log('Successfully parsed Czech date:', parsedDate);
              return parsedDate;
            }
          }
          
          // Try parsing simple Czech date format (DD.MM.YYYY)
          const simpleCzechMatch = dateStr.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
          if (simpleCzechMatch) {
            const [, day, month, year] = simpleCzechMatch;
            parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            if (!isNaN(parsedDate.getTime())) {
              console.log('Successfully parsed simple Czech date:', parsedDate);
              return parsedDate;
            }
          }
          
          // Fallback to current date if parsing fails
          console.warn('Failed to parse date:', dateStr, 'using current date');
          return new Date();
        })
        .filter(date => date instanceof Date && !isNaN(date.getTime()));
      
      if (validDates.length > 0) {
        lastUpdate = new Date(Math.max(...validDates.map(date => date.getTime())));
        console.log('Latest document date:', lastUpdate);
      }
    }
    
    const config = getLarpConfig();
    
    // Ensure lastUpdate is valid before formatting
    const formattedLastUpdate = lastUpdate && !isNaN(lastUpdate.getTime()) 
      ? lastUpdate.toLocaleString('cs-CZ', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      : new Date().toLocaleString('cs-CZ', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
    
    const stats = {
      totalCharacters: characters.length,
      totalDocuments: actualDokumentyData.length,
      lastUpdate: formattedLastUpdate,
      runInfo: `${config.beh.cislo} | ${config.beh.datum}`
    };
    
    console.log('Admin statistics:', stats);
    return stats;
  } catch (error) {
    console.error('Error calculating admin stats:', error);
    
    // Fallback to mock data statistics
    const mockCharacters = MOCK_ORGANIZACE.filter(item => item.typ === 'postava');
    const currentDate = new Date().toLocaleString('cs-CZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    return {
      totalCharacters: mockCharacters.length,
      totalDocuments: MOCK_DOKUMENTY.length,
      lastUpdate: currentDate,
      runInfo: '1 | 30. 8. 2025'
    };
  }
}

// Mock data for development - CLEARLY MARKED AS MOCK
export const MOCK_ORGANIZACE: OrganizaceRow[] = [
  // Konfigurace LARP - MOCK DATA
  { typ: 'konfigurace', jmeno: 'nazev', slug: '', skupina: 'MOCK LARP - TEST DATA' },
  { typ: 'konfigurace', jmeno: 'organizator', slug: '', skupina: 'MOCK ORGANIZÁTOR' },
  { typ: 'konfigurace', jmeno: 'kontakt', slug: '', skupina: 'mock@test.cz' },
  { typ: 'konfigurace', jmeno: 'zapati', slug: '', skupina: 'MOCK - POUZE PRO TEST' },
  { typ: 'konfigurace', jmeno: 'beh_cislo', slug: '', skupina: '999' },
  { typ: 'konfigurace', jmeno: 'beh_datum', slug: '', skupina: '99. 99. 9999' },
  { typ: 'konfigurace', jmeno: 'beh_misto', slug: '', skupina: 'MOCK MÍSTO' },
  { typ: 'konfigurace', jmeno: 'beh_adresa', slug: '', skupina: 'MOCK ADRESA 999' },
  
  // Skupiny - MOCK DATA
  { typ: 'skupina', jmeno: 'MOCK SKUPINA A', slug: '', skupina: '' },
  { typ: 'skupina', jmeno: 'MOCK SKUPINA B', slug: '', skupina: '' },
  { typ: 'skupina', jmeno: 'MOCK SKUPINA C', slug: '', skupina: '' },
  
  // Postavy - MOCK DATA (99 postav pro test)
  ...Array.from({ length: 99 }, (_, i) => ({
    typ: 'postava' as const,
    jmeno: `MOCK POSTAVA ${i + 1}`,
    slug: `mock-${i + 1}`,
    skupina: `MOCK SKUPINA ${String.fromCharCode(65 + (i % 3))}`, // A, B, C
    popis: `Toto je mock postava číslo ${i + 1}. Používá se pouze pro testování aplikace.`
  }))
];

export const MOCK_DOKUMENTY: DokumentRow[] = [
  {
    typ: 'medailonek',
    komu: 'mock-1',
    nadpis: 'MOCK MEDAILONEK - TEST DATA',
    obsah: '<div class="text-body"><p>Toto je mock medailonek pro testování. Používá se pouze pro vývoj aplikace.</p></div>',
    'datum-zverejneni': '2025-07-26 18:33:42',
    priorita: 'hlavni'
  },
  {
    typ: 'medailonek',
    komu: 'gabcik',
    nadpis: 'Medailonek agenta',
    obsah: '<div class="text-body"><p>Druhý člen operace Anthropoid, expert na lehké zbraně. Pochází z Poluvsí na Slovensku. Vyznačuje se klidem a odhodláním. Má výborné střelecké schopnosti a dokáže zachovat chladnou hlavu i v nejnebezpečnějších situacích.</p></div>',
    'datum-zverejneni': '2025-07-26 18:33:43',
    priorita: 'hlavni'
  },
  {
    typ: 'organizacni',
    komu: 'vsichni',
    nadpis: 'Pravidla akce',
    obsah: '<div class="text-body"><p>Základní pravidla pro účastníky akce Krypta 1942.</p><p>Všichni účastníci se musí řídit těmito pravidly pro bezpečnost a autenticitu akce.</p></div>',
    'datum-zverejneni': '2025-07-26 18:33:44',
    priorita: 'hlavni'
  },
  {
    typ: 'herni',
    komu: 'vsichni', 
    nadpis: 'Mapa oblasti',
    obsah: '<div class="text-body"><p>Oblast operace se nachází v centru Prahy.</p><p>Hlavní body: Kostel sv. Cyrila a Metoděje, Národní muzeum, Wenceslas Square.</p></div>',
    'datum-zverejneni': '2025-07-26 18:33:44',
    priorita: 'normalni'
  },
  {
    typ: 'organizacni',
    komu: 'vsichni',
    nadpis: 'Bezpečnostní opatření',
    obsah: '<div class="text-body"><p>Všichni agenti musí dodržovat přísná bezpečnostní opatření.</p><p>V případě kompromitace použijte nouzové procedury.</p></div>',
    'datum-zverejneni': '2025-07-26 18:33:47',
    priorita: 'hlavni'
  },
  {
    typ: 'herni',
    komu: 'vsichni',
    nadpis: 'Časová osa operace',
    obsah: '<div class="text-body"><p>Operace začíná v 09:00 a končí v 18:00.</p><p>Klíčové momenty jsou naplánované na 12:00 a 15:30.</p></div>',
    'datum-zverejneni': '2025-07-26 18:33:48',
    priorita: 'normalni'
  },
  {
    typ: 'postava',
    komu: 'opalka',
    nadpis: 'Tajné instrukce',
    obsah: '<div class="text-body"><p>Váš úkol je koordinovat operaci s týmem Anthropoid.</p><p>Zachovejte maximální utajení a opatrnost.</p></div>',
    'datum-zverejneni': '2025-07-26 18:33:45',
    priorita: 'hlavni'
  },
  {
    typ: 'postava',
    komu: 'kubis',
    nadpis: 'Instrukce pro Kubiše',
    obsah: '<div class="text-body"><p>Jako člen týmu Anthropoid máte klíčovou roli v operaci.</p><p>Koordinujte s Gabčíkem a udržujte spojení s Out Distance.</p></div>',
    'datum-zverejneni': '2025-07-26 18:33:46',
    priorita: 'hlavni'
  },
  {
    typ: 'postava',
    komu: 'gabcik',
    nadpis: 'Speciální úkol',
    obsah: '<div class="text-body"><p>Máte na starosti koordinaci s týmem Silver A.</p><p>Udržujte rádiové spojení každou hodinu.</p></div>',
    'datum-zverejneni': '2025-07-26 18:33:49',
    priorita: 'hlavni'
  },
  {
    typ: 'postava',
    komu: 'valcik',
    nadpis: 'Hlídková služba',
    obsah: '<div class="text-body"><p>Jako člen Silver A máte na starosti hlídkovou službu.</p><p>Pozorujte okolí kostela a hlaste jakékoli podezřelé aktivity.</p></div>',
    'datum-zverejneni': '2025-07-26 18:33:50',
    priorita: 'normalni'
  },
  {
    typ: 'postava',
    komu: 'hruby',
    nadpis: 'Technická podpora',
    obsah: '<div class="text-body"><p>Máte na starosti technické vybavení týmu Bioscop.</p><p>Zkontrolujte všechna zařízení před začátkem operace.</p></div>',
    'datum-zverejneni': '2025-07-26 18:33:51',
    priorita: 'normalni'
  },
  {
    typ: 'postava',
    komu: 'svarc',
    nadpis: 'Komunikace',
    obsah: '<div class="text-body"><p>Jako člen týmu Tin jste zodpovědný za komunikaci.</p><p>Udržujte spojení mezi všemi jednotkami.</p></div>',
    'datum-zverejneni': '2025-07-26 18:33:52',
    priorita: 'hlavni'
  },
  {
    typ: 'postava',
    komu: 'bublik',
    nadpis: 'Záložní plán',
    obsah: '<div class="text-body"><p>V případě nouzové situace aktivujte záložní plán B.</p><p>Koordinujte s ostatními členy týmu Bioscop.</p></div>',
    'datum-zverejneni': '2025-07-26 18:33:53',
    priorita: 'normalni'
  },
  {
    typ: 'postava',
    komu: 'petrek',
    nadpis: 'Duchovní podpora',
    obsah: '<div class="text-body"><p>Jako kněz poskytujte duchovní podporu všem účastníkům operace.</p><p>Kostel je vaší základnou, znáte ho nejlépe.</p></div>',
    'datum-zverejneni': '2025-07-26 18:33:54',
    priorita: 'normalni'
  }
];

