import { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';

type HelpLink = {
  title: string;
  url: string;
  description?: string;
};

type ProviderHelpContent = {
  defaultLinks: HelpLink[];
  providerSpecificLinks?: {
    [key: string]: HelpLink[];
  };
  modelSpecificLinks?: {
    [key: string]: HelpLink[];
  };
};

type HelpWidgetProps = {
  content: ProviderHelpContent;
  selectedProvider?: string;
  selectedModelId?: string;
};

export function HelpWidget({ content, selectedProvider, selectedModelId }: HelpWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Combine default links with provider-specific and model-specific links
  const getHelpLinks = () => {
    let links = [...content.defaultLinks];
    
    // Add provider-specific links if available
    if (selectedProvider && content.providerSpecificLinks?.[selectedProvider]) {
      links = [...links, ...content.providerSpecificLinks[selectedProvider]];
    }
    
    // Add model-specific links if available
    if (selectedModelId && content.modelSpecificLinks?.[selectedModelId]) {
      links = [...links, ...content.modelSpecificLinks[selectedModelId]];
    }
    
    return links;
  };

  const helpLinks = getHelpLinks();

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Help Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-lg transition-colors"
        aria-label="Help"
      >
        {isOpen ? <X size={24} /> : <HelpCircle size={24} />}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Need Help?
          </h3>
          <div className="space-y-3">
            {helpLinks.map((link, index) => (
              <a
                key={index}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="font-medium text-blue-600 dark:text-blue-400">
                  {link.title}
                </div>
                {link.description && (
                  <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    {link.description}
                  </div>
                )}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 