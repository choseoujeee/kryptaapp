'use client';

import React from 'react';
import { getLarpConfig } from '@/lib/data';

interface LayoutProps {
  children: React.ReactNode;
  showHeader?: boolean;
  showFooter?: boolean;
  title?: string;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  showHeader = true, 
  showFooter = true,
  title 
}) => {
  console.log('Rendering Layout component');
  
  const config = getLarpConfig();

  const renderHeader = () => {
    if (!showHeader) return null;

    return (
      <header className="bg-vintage-paper2 border-b-2 border-vintage-brown shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center gap-4">
            <h1 className="title-main text-xl md:text-2xl" data-macaly="main-title">
              {title || config.nazev}
            </h1>
          </div>
          <div className="text-center mt-2">
            <div className="w-full h-px bg-vintage-brown opacity-50"></div>
          </div>
        </div>
      </header>
    );
  };

  const renderFooter = () => {
    if (!showFooter) return null;

    return (
      <footer className="bg-vintage-paper2 border-t-2 border-vintage-brown mt-8">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center space-y-2">
            <div className="w-full h-px bg-vintage-brown opacity-50 mb-4"></div>
            <div className="text-sm text-vintage-brown font-serif">
              <span className="font-bold">Organizátor:</span> {config.organizator} | 
              <span className="font-bold"> Kontakt:</span> {config.kontakt}
            </div>
            {config.zapati && (
              <div 
                className="text-xs text-vintage-brown italic"
                data-macaly="footer-text"
              >
                {config.zapati}
              </div>
            )}
          </div>
        </div>
      </footer>
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      {renderHeader()}
      
      <main className="flex-1 container mx-auto px-4 py-6">
        {children}
      </main>
      
      {renderFooter()}
    </div>
  );
};

export default Layout;