"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { X, Bug, Lightbulb, ClipboardList, Send, CheckCircle, Loader2 } from 'lucide-react';
import { submitFeedback, isOnCooldown, cooldownRemaining } from '../lib/feedback';
import './FeedbackModal.css';

type FeedbackType = 'bug' | 'feature' | 'race_data';

interface RaceContext {
  id: string;
  name: string;
}

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedType?: FeedbackType;
  raceContext?: RaceContext | null;
}

const TABS: { id: FeedbackType; label: string; icon: React.ReactNode; placeholder: string }[] = [
  {
    id: 'bug',
    label: 'Πρόβλημα',
    icon: <Bug size={16} />,
    placeholder: 'Περιγράψτε το πρόβλημα που αντιμετωπίσατε...',
  },
  {
    id: 'feature',
    label: 'Ιδέα',
    icon: <Lightbulb size={16} />,
    placeholder: 'Ποια λειτουργία θα θέλατε να δείτε;',
  },
  {
    id: 'race_data',
    label: 'Δεδομένα Αγώνα',
    icon: <ClipboardList size={16} />,
    placeholder: 'Ποια πληροφορία είναι λάθος ή λείπει;',
  },
];

export function FeedbackModal({ isOpen, onClose, preselectedType = 'bug', raceContext = null }: FeedbackModalProps) {
  const [activeTab, setActiveTab] = useState<FeedbackType>(preselectedType);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitState, setSubmitState] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [cooldown, setCooldown] = useState(0);

  // Sync preselected type when modal opens with a new context
  useEffect(() => {
    if (isOpen) {
      setActiveTab(preselectedType);
      setMessage('');
      setEmail('');
      setSubmitState('idle');
      setErrorMessage('');
      setCooldown(cooldownRemaining());
    }
  }, [isOpen, preselectedType]);

  // Cooldown countdown timer
  useEffect(() => {
    if (!isOpen || cooldown <= 0) return;
    const interval = setInterval(() => {
      const remaining = cooldownRemaining();
      setCooldown(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, cooldown]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = useCallback(async () => {
    if (!message.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage('');

    const result = await submitFeedback({
      type: activeTab,
      message,
      email: email || undefined,
      raceId: raceContext?.id,
      raceName: raceContext?.name,
    });

    setIsSubmitting(false);

    if (result.success) {
      setSubmitState('success');
      setTimeout(() => {
        onClose();
        // Reset after close animation
        setTimeout(() => {
          setSubmitState('idle');
          setMessage('');
          setEmail('');
        }, 300);
      }, 2000);
    } else {
      setSubmitState('error');
      setErrorMessage(result.error || 'Κάτι πήγε στραβά.');
      setCooldown(cooldownRemaining());
    }
  }, [message, email, activeTab, raceContext, isSubmitting, onClose]);

  if (!isOpen) return null;

  const currentTab = TABS.find(t => t.id === activeTab)!;
  const canSubmit = message.trim().length > 0 && !isSubmitting && cooldown <= 0 && submitState !== 'success';

  return (
    <div className="feedback-overlay" onClick={onClose}>
      <div
        className={`feedback-modal no-shimmer ${submitState === 'success' ? 'success-state' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="feedback-header">
          <h2>Αναφορά & Προτάσεις</h2>
          <button className="feedback-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {submitState === 'success' ? (
          <div className="feedback-success">
            <div className="success-icon">
              <CheckCircle size={48} />
            </div>
            <h3>Ευχαριστούμε!</h3>
            <p>Η αναφορά σας καταχωρήθηκε επιτυχώς.</p>
          </div>
        ) : (
          <>
            {/* Tab bar */}
            <div className="feedback-tabs">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  className={`feedback-tab ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="feedback-body">
              {/* Race context pill */}
              {raceContext && (
                <div className="feedback-race-context">
                  <ClipboardList size={14} />
                  <span>{raceContext.name}</span>
                </div>
              )}

              <textarea
                className="feedback-textarea"
                placeholder={currentTab.placeholder}
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={4}
                maxLength={2000}
                autoFocus
              />

              <div className="feedback-char-count">
                {message.length} / 2000
              </div>

              <input
                type="email"
                className="feedback-email"
                placeholder="Email (προαιρετικό — για ενημέρωση)"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />

              {errorMessage && (
                <div className="feedback-error">{errorMessage}</div>
              )}
            </div>

            {/* Footer */}
            <div className="feedback-footer">
              {cooldown > 0 ? (
                <span className="feedback-cooldown">
                  Περιμένετε {cooldown}δ...
                </span>
              ) : (
                <span className="feedback-hint">
                  Η αναφορά σας θα εξεταστεί σύντομα
                </span>
              )}
              <button
                className="feedback-submit-btn"
                onClick={handleSubmit}
                disabled={!canSubmit}
              >
                {isSubmitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <Send size={16} />
                    <span>Αποστολή</span>
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
