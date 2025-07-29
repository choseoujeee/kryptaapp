'use client';

import React from 'react';
import Stamp from '@/components/Stamp';

export default function Home() {
  console.log('Rendering landing page');
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-vintage-paper">
      <div className="max-w-2xl mx-auto text-center p-8">
        {/* Warning Header */}
        <div className="mb-8">
          <div className="text-6xl mb-4 font-typewriter font-bold">!</div>
        </div>

        {/* Main Warning */}
        <div className="space-y-6">
          <h1 className="font-typewriter text-3xl md:text-4xl font-bold uppercase tracking-widest text-vintage-ink">
            RESTRICTED AREA
          </h1>
          
          <div className="space-y-4">
            <div className="flex justify-center">
              <Stamp type="classified">CLASSIFIED DOCUMENTS</Stamp>
            </div>
            
            <p className="font-serif text-xl text-vintage-ink">
              BRITISH ARMY PERSONNEL ONLY
            </p>
            
            <div className="my-6">
              <div className="w-24 h-px bg-vintage-brown mx-auto opacity-50"></div>
            </div>
            
            <p className="font-typewriter text-lg text-vintage-brown uppercase tracking-wider">
              UNAUTHORISED ACCESS PROHIBITED
            </p>
            
            <div className="flex justify-center mt-6">
              <Stamp type="official">WAR OFFICE 1942</Stamp>
            </div>
          </div>
        </div>

        {/* Additional Warning Elements */}
        <div className="mt-12 space-y-4">
          <div className="flex justify-center space-x-4">
            <Stamp type="top-secret">TOP SECRET</Stamp>
            <Stamp type="confidential">CONFIDENTIAL</Stamp>
          </div>
          
          <div className="text-xs text-vintage-brown font-typewriter opacity-75 mt-8">
            Any attempt to access classified information without proper authorization<br />
            will result in immediate investigation by military intelligence.
          </div>
        </div>
      </div>
    </div>
  );
}
