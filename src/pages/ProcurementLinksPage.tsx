import React, { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { ProcurementChat } from '../components/ProcurementChat';
import { ProcurementLinkVerifier } from '../components/ProcurementLinkVerifier';
import { FeedbackComponent } from '../components/FeedbackComponent';

export function ProcurementLinksPage() {
  const { isSignedIn } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'chat' | 'verifier' | 'feedback'>('chat');

  return (
    <div className="min-h-screen bg-tron-bg-deep">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <div className="space-y-4 sm:space-y-6">
          <div className="border-b border-tron-cyan/20 overflow-x-auto">
            <nav className="-mb-px flex justify-center sm:justify-start space-x-2 sm:space-x-4 md:space-x-8 min-w-max">
              <button
                onClick={() => setActiveSubTab('chat')}
                className={`py-2 px-2 sm:px-3 md:px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                  activeSubTab === 'chat'
                    ? 'border-tron-cyan text-tron-cyan'
                    : 'border-transparent text-tron-gray hover:text-tron-white hover:border-tron-cyan/40'
                }`}
              >
                AI Chat
              </button>
              <button
                onClick={() => setActiveSubTab('verifier')}
                className={`py-2 px-2 sm:px-3 md:px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                  activeSubTab === 'verifier'
                    ? 'border-tron-cyan text-tron-cyan'
                    : 'border-transparent text-tron-gray hover:text-tron-white hover:border-tron-cyan/40'
                }`}
              >
                Verifier
              </button>
              <button
                onClick={() => setActiveSubTab('feedback')}
                className={`py-2 px-2 sm:px-3 md:px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                  activeSubTab === 'feedback'
                    ? 'border-tron-cyan text-tron-cyan'
                    : 'border-transparent text-tron-gray hover:text-tron-white hover:border-tron-cyan/40'
                }`}
              >
                Feedback
              </button>
            </nav>
          </div>
          {activeSubTab === 'chat' && (
            <ProcurementChat
              onExportToVerifier={() => setActiveSubTab('verifier')}
            />
          )}
          {activeSubTab === 'verifier' && <ProcurementLinkVerifier />}
          {activeSubTab === 'feedback' && <FeedbackComponent />}
        </div>
      </div>
    </div>
  );
}

