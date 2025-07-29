'use client';

import React, { useState } from 'react';
import DOMPurify from 'dompurify';
import { DokumentRow } from '@/lib/data';
import Stamp from './Stamp';

interface DocumentAccordionProps {
  documents: Record<string, DokumentRow[]>;
}

const DocumentTypeInfo = {
  organizacni: {
    label: 'Organizační',
    icon: '',
    stamp: 'official' as const,
    color: 'doc-organizacni'
  },
  herni: {
    label: 'Herní', 
    icon: '',
    stamp: 'classified' as const,
    color: 'doc-herni'
  },
  postava: {
    label: 'Tvoje postava',
    icon: '', 
    stamp: 'top-secret' as const,
    color: 'doc-postava'
  }
};

const DocumentAccordion: React.FC<DocumentAccordionProps> = ({ documents }) => {
  console.log('Rendering DocumentAccordion with:', Object.keys(documents));
  console.log('Full documents data:', documents);
  
  const [openTypes, setOpenTypes] = useState<Set<string>>(new Set());
  const [openDocuments, setOpenDocuments] = useState<Set<string>>(new Set());

  const toggleType = (type: string) => {
    console.log(`Toggling document type: ${type}`);
    const newOpenTypes = new Set(openTypes);
    if (newOpenTypes.has(type)) {
      newOpenTypes.delete(type);
      // Close all documents of this type
      const newOpenDocs = new Set(openDocuments);
      documents[type]?.forEach(doc => newOpenDocs.delete(doc.nadpis));
      setOpenDocuments(newOpenDocs);
    } else {
      newOpenTypes.add(type);
    }
    setOpenTypes(newOpenTypes);
  };

  const toggleDocument = (title: string) => {
    console.log(`Toggling document: ${title}`);
    const newOpenDocs = new Set(openDocuments);
    if (newOpenDocs.has(title)) {
      newOpenDocs.delete(title);
    } else {
      newOpenDocs.add(title);
    }
    setOpenDocuments(newOpenDocs);
  };

  const renderDocumentContent = (doc: DokumentRow) => {
    const sanitizedContent = DOMPurify.sanitize(doc.obsah);
    
    return (
      <div className="p-4 bg-vintage-paper rounded-sm border border-vintage-brown border-opacity-30">
        <div 
          className="text-body"
          dangerouslySetInnerHTML={{ __html: sanitizedContent }}
          data-macaly={`document-content-${doc.nadpis.toLowerCase().replace(/\s+/g, '-')}`}
        />
        <div className="mt-4 pt-2 border-t border-vintage-brown border-opacity-20">
          <button
            onClick={() => toggleDocument(doc.nadpis)}
            className="btn-secondary text-xs"
            data-macaly={`collapse-${doc.nadpis.toLowerCase().replace(/\s+/g, '-')}`}
          >
            Sbalit dokument ▲
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4" data-macaly="documents-accordion">
      <div className="title-section flex items-center gap-2">
        <span>DOKUMENTY:</span>
      </div>

      {Object.entries(documents).map(([type, docs]) => {
        console.log(`Processing document type: ${type}, docs count: ${docs?.length || 0}`);
        console.log(`Docs for ${type}:`, docs);
        
        const typeInfo = DocumentTypeInfo[type as keyof typeof DocumentTypeInfo];
        if (!typeInfo || docs.length === 0) {
          console.log(`Skipping type ${type} - no typeInfo or empty docs`);
          return null;
        }

        const isTypeOpen = openTypes.has(type);

        return (
          <div key={type} className="document-card" data-macaly={`document-type-${type}`}>
            {/* Level 1: Document Type Header */}
            <div 
              className="accordion-header cursor-pointer"
              onClick={() => toggleType(type)}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">
                  {isTypeOpen ? '▼' : '▷'}
                </span>
                <Stamp type={typeInfo.stamp}>
                  {typeInfo.stamp.toUpperCase().replace('-', ' ')}
                </Stamp>
                <span className="font-serif font-bold">
                  {typeInfo.label} ({docs.length})
                </span>
              </div>
            </div>

            {/* Level 2: Documents List */}
            {isTypeOpen && (
              <div className="accordion-content space-y-2">
                {docs.map((doc, index) => {
                  const isDocOpen = openDocuments.has(doc.nadpis);
                  const isHighPriority = doc.priorita === 'hlavni';

                  return (
                    <div key={index} className="border-l-2 border-vintage-brown border-opacity-30 pl-4">
                      {/* Document Header */}
                      <div 
                        className="flex items-center gap-2 py-2 cursor-pointer hover:bg-vintage-paper2 rounded-sm px-2 transition-colors"
                        onClick={() => toggleDocument(doc.nadpis)}
                        data-macaly={`document-header-${doc.nadpis.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <span className="text-vintage-brown">
                          {isDocOpen ? '▼' : '▷'}
                        </span>
                        {isHighPriority && (
                          <span className="text-vintage-red font-bold text-xs">
                            [HLAVNÍ]
                          </span>
                        )}
                        <span className="font-serif font-semibold text-vintage-ink">
                          {doc.nadpis}
                        </span>
                      </div>

                      {/* Level 3: Document Content */}
                      {isDocOpen && (
                        <div className="mt-2 ml-4">
                          {renderDocumentContent(doc)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default DocumentAccordion;