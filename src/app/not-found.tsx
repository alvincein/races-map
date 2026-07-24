"use client";

import React from 'react';
import Link from 'next/link';
import { Map } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="not-found-container">
      <div className="not-found-background">
        <div className="bg-glow bg-glow-1"></div>
        <div className="bg-glow bg-glow-2"></div>
      </div>

      <div className="not-found-card glass-panel no-shimmer">
        <div className="not-found-logo-wrapper">
          <img src="/logo-128.png" alt="RaceMap" className="not-found-logo" />
          <span className="not-found-brand-title">RaceMap</span>
        </div>

        <div className="not-found-header">
          <div className="trail-animation-wrapper">
            <svg viewBox="0 0 200 100" className="trail-svg">
              <defs>
                <linearGradient id="trail-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(255, 232, 0, 0)" />
                  <stop offset="50%" stopColor="var(--accent-primary)" />
                  <stop offset="100%" stopColor="#ef4444" />
                </linearGradient>
              </defs>
              {/* The main trail path */}
              <path
                d="M20,70 Q60,20 100,70 T180,30"
                fill="none"
                stroke="rgba(255, 255, 255, 0.1)"
                strokeWidth="3"
                strokeDasharray="6 4"
              />
              {/* Animated active path segment */}
              <path
                d="M20,70 Q60,20 100,70 T180,30"
                fill="none"
                stroke="url(#trail-grad)"
                strokeWidth="3"
                className="trail-path-active"
              />
              {/* Lost route indicator (warning marker) */}
              <circle cx="180" cy="30" r="4" fill="#ef4444" className="trail-dead-end" />
              <line x1="176" y1="26" x2="184" y2="34" stroke="#ef4444" strokeWidth="1.5" />
              <line x1="184" y1="26" x2="176" y2="34" stroke="#ef4444" strokeWidth="1.5" />
              
              {/* Running dot along the path */}
              <circle r="5" fill="var(--accent-primary)" className="trail-runner-dot" />
            </svg>
          </div>
          <h1 className="not-found-code">404</h1>
        </div>

        <div className="not-found-body">
          <h2>Εκτός Διαδρομής!</h2>
          <p>
            Φαίνεται πως χάσατε τη διαδρομή σας ή η σελίδα που αναζητάτε έχει αλλάξει κατεύθυνση. 
            Μην ανησυχείτε, όλοι οι δρόμοι οδηγούν πίσω στον χάρτη των αγώνων.
          </p>
        </div>

        <div className="not-found-footer">
          <Link href="/" className="not-found-btn">
            <Map size={18} />
            <span>Επιστροφή στον Χάρτη</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
