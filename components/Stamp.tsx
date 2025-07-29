'use client';

import React from 'react';

export type StampType = 'classified' | 'top-secret' | 'official' | 'approved' | 'confidential';

interface StampProps {
  type: StampType;
  children: React.ReactNode;
  className?: string;
}

const Stamp: React.FC<StampProps> = ({ type, children, className = '' }) => {
  console.log(`Rendering stamp: ${type}`);
  
  return (
    <span 
      className={`stamp stamp-${type} ${className}`}
      data-macaly={`stamp-${type}`}
    >
      {children}
    </span>
  );
};

export default Stamp;