import { useState, useRef, useEffect } from 'react';
import { Id } from '../../convex/_generated/dataModel';
import { ChevronDown } from 'lucide-react';

interface SystemPrompt {
  _id: Id<"chatSystemPrompts">;
  title: string;
  description?: string;
  isPrimarySystemPrompt: boolean;
  type: Id<"chatSystemPromptTypes">;
}

interface SystemPromptType {
  _id: Id<"chatSystemPromptTypes">;
  displayName: string;
}

interface SystemPromptSelectProps {
  value: Id<"chatSystemPrompts"> | null | undefined; // undefined = primary, null = none
  onChange: (value: Id<"chatSystemPrompts"> | null | undefined) => void;
  systemPrompts?: SystemPrompt[];
  promptTypes?: SystemPromptType[];
  disabled?: boolean;
}

export function SystemPromptSelect({
  value,
  onChange,
  systemPrompts,
  promptTypes,
  disabled = false,
}: SystemPromptSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredOption, setHoveredOption] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number; transform?: string } | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<'left' | 'right'>('left');
  const [dropdownVerticalPosition, setDropdownVerticalPosition] = useState<'bottom' | 'top'>('bottom');
  const [dropdownMaxHeight, setDropdownMaxHeight] = useState<number>(300);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownMenuRef = useRef<HTMLDivElement>(null);

  // Calculate dropdown position to prevent overflow
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(() => {
        if (triggerRef.current && dropdownMenuRef.current) {
          const triggerRect = triggerRef.current.getBoundingClientRect();
          const dropdownWidth = dropdownMenuRef.current.offsetWidth || 250; // Default min width
          const spaceOnRight = window.innerWidth - triggerRect.right;
          const spaceOnLeft = triggerRect.left;
          
          // If there's not enough space on the right but enough on the left, position to the right
          if (spaceOnRight < dropdownWidth && spaceOnLeft >= dropdownWidth) {
            setDropdownPosition('right');
          } else {
            setDropdownPosition('left');
          }

          // Check vertical space - estimate dropdown height (max 300px + some buffer)
          const estimatedDropdownHeight = Math.min(300, (systemPrompts?.length || 0) * 32 + 64); // Rough estimate
          const spaceBelow = window.innerHeight - triggerRect.bottom - 8; // 8px margin
          const spaceAbove = triggerRect.top - 8; // 8px margin
          
          // If not enough space below but enough above, position above
          if (spaceBelow < estimatedDropdownHeight && spaceAbove >= estimatedDropdownHeight) {
            setDropdownVerticalPosition('top');
            // Set max height based on available space above
            setDropdownMaxHeight(Math.min(300, Math.max(100, spaceAbove)));
          } else {
            setDropdownVerticalPosition('bottom');
            // Set max height based on available space below
            setDropdownMaxHeight(Math.min(300, Math.max(100, spaceBelow)));
          }
        }
      });
    }
  }, [isOpen, systemPrompts]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setHoveredOption(null);
        setTooltipPosition(null);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Get display text for current selection
  const getDisplayText = (): string => {
    if (value === undefined) {
      return 'Primary (Default)';
    }
    if (value === null) {
      return 'None';
    }
    const prompt = systemPrompts?.find(p => p._id === value);
    if (!prompt) return 'Select...';
    const promptType = promptTypes?.find(t => t._id === prompt.type);
    return `${prompt.title}${prompt.isPrimarySystemPrompt ? ' (Primary)' : ''}${promptType ? ` - ${promptType.displayName}` : ''}`;
  };

  // Get description for an option
  const getDescription = (optionValue: string): string | undefined => {
    if (optionValue === 'primary' || optionValue === 'none') {
      return undefined;
    }
    const prompt = systemPrompts?.find(p => p._id === optionValue);
    return prompt?.description;
  };

  const handleSelect = (optionValue: string) => {
    if (optionValue === 'primary') {
      onChange(undefined);
    } else if (optionValue === 'none') {
      onChange(null);
    } else {
      onChange(optionValue as Id<"chatSystemPrompts">);
    }
    setIsOpen(false);
    setHoveredOption(null);
    setTooltipPosition(null);
  };

  const handleOptionMouseEnter = (e: React.MouseEvent<HTMLDivElement>, optionValue: string) => {
    const description = getDescription(optionValue);
    if (description) {
      setHoveredOption(optionValue);
      const rect = e.currentTarget.getBoundingClientRect();
      const tooltipX = rect.right + 8;
      const tooltipY = rect.top + rect.height / 2;
      
      // Adjust if tooltip would go off-screen horizontally
      const maxX = window.innerWidth - 320; // 300px max width + 20px margin
      const adjustedX = tooltipX > maxX ? rect.left - 320 : tooltipX;
      
      // Adjust if tooltip would go off-screen vertically
      // Estimate tooltip height (roughly 120px for description + title)
      const estimatedTooltipHeight = 120;
      const halfHeight = estimatedTooltipHeight / 2;
      const margin = 8;
      
      // Check if tooltip would go off bottom
      const wouldGoOffBottom = tooltipY + halfHeight + margin > window.innerHeight;
      // Check if tooltip would go off top
      const wouldGoOffTop = tooltipY - halfHeight - margin < 0;
      
      let adjustedY = tooltipY;
      let transform = 'translateY(-50%)';
      
      if (wouldGoOffBottom && !wouldGoOffTop) {
        // Position above center, aligned to bottom
        adjustedY = window.innerHeight - margin;
        transform = 'translateY(-100%)';
      } else if (wouldGoOffTop && !wouldGoOffBottom) {
        // Position below center, aligned to top
        adjustedY = margin;
        transform = 'translateY(0%)';
      } else if (wouldGoOffBottom && wouldGoOffTop) {
        // Very constrained space - center as best as possible
        adjustedY = Math.max(halfHeight + margin, Math.min(window.innerHeight - halfHeight - margin, tooltipY));
      }
      
      setTooltipPosition({
        x: Math.max(8, adjustedX), // Ensure at least 8px from left edge
        y: adjustedY,
        transform,
      });
    }
  };

  const handleOptionMouseLeave = () => {
    setHoveredOption(null);
    setTooltipPosition(null);
  };

  const handleOptionMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (hoveredOption) {
      const rect = e.currentTarget.getBoundingClientRect();
      const tooltipX = rect.right + 8;
      const tooltipY = rect.top + rect.height / 2;
      
      // Adjust if tooltip would go off-screen horizontally
      const maxX = window.innerWidth - 320; // 300px max width + 20px margin
      const adjustedX = tooltipX > maxX ? rect.left - 320 : tooltipX;
      
      // Adjust if tooltip would go off-screen vertically
      const estimatedTooltipHeight = 120;
      const halfHeight = estimatedTooltipHeight / 2;
      const margin = 8;
      
      const wouldGoOffBottom = tooltipY + halfHeight + margin > window.innerHeight;
      const wouldGoOffTop = tooltipY - halfHeight - margin < 0;
      
      let adjustedY = tooltipY;
      let transform = 'translateY(-50%)';
      
      if (wouldGoOffBottom && !wouldGoOffTop) {
        adjustedY = window.innerHeight - margin;
        transform = 'translateY(-100%)';
      } else if (wouldGoOffTop && !wouldGoOffBottom) {
        adjustedY = margin;
        transform = 'translateY(0%)';
      } else if (wouldGoOffBottom && wouldGoOffTop) {
        adjustedY = Math.max(halfHeight + margin, Math.min(window.innerHeight - halfHeight - margin, tooltipY));
      }
      
      setTooltipPosition({
        x: Math.max(8, adjustedX),
        y: adjustedY,
        transform,
      });
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled || systemPrompts === undefined}
        className="px-2 py-1 text-xs bg-tron-bg-deep border border-tron-cyan/30 rounded-lg 
                   text-tron-white focus:outline-none focus:ring-2 focus:ring-tron-cyan 
                   focus:border-tron-cyan cursor-pointer min-w-[120px] sm:min-w-[150px]
                   disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between gap-2
                   hover:border-tron-cyan/50 transition-colors overflow-hidden"
      >
        <span className="truncate">{getDisplayText()}</span>
        <ChevronDown 
          className={`w-3 h-3 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {isOpen && (
        <div 
          ref={dropdownMenuRef}
          className={`absolute ${dropdownVerticalPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'} 
                     ${dropdownPosition === 'right' ? 'right-0' : 'left-0'} z-50 min-w-[200px] sm:min-w-[250px] 
                     bg-tron-bg-deep border border-tron-cyan/30 rounded-lg shadow-tron-glow 
                     overflow-hidden overflow-y-auto`}
          style={{
            maxHeight: `${dropdownMaxHeight}px`
          }}
        >
          {/* Primary option */}
          <div
            onClick={() => handleSelect('primary')}
            onMouseEnter={(e) => handleOptionMouseEnter(e, 'primary')}
            onMouseLeave={handleOptionMouseLeave}
            onMouseMove={handleOptionMouseMove}
            className={`px-3 py-2 text-xs cursor-pointer transition-colors ${
              value === undefined
                ? 'bg-tron-cyan/20 text-tron-cyan'
                : 'text-tron-white hover:bg-tron-cyan/10'
            }`}
          >
            Primary (Default)
          </div>

          {/* None option */}
          <div
            onClick={() => handleSelect('none')}
            onMouseEnter={(e) => handleOptionMouseEnter(e, 'none')}
            onMouseLeave={handleOptionMouseLeave}
            onMouseMove={handleOptionMouseMove}
            className={`px-3 py-2 text-xs cursor-pointer transition-colors ${
              value === null
                ? 'bg-tron-cyan/20 text-tron-cyan'
                : 'text-tron-white hover:bg-tron-cyan/10'
            }`}
          >
            None
          </div>

          {/* System prompts */}
          {systemPrompts && systemPrompts.map((prompt) => {
            const promptType = promptTypes?.find(t => t._id === prompt.type);
            const optionValue = prompt._id;
            const isSelected = value === optionValue;
            
            return (
              <div
                key={prompt._id}
                onClick={() => handleSelect(optionValue)}
                onMouseEnter={(e) => handleOptionMouseEnter(e, optionValue)}
                onMouseLeave={handleOptionMouseLeave}
                onMouseMove={handleOptionMouseMove}
                className={`px-3 py-2 text-xs cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-tron-cyan/20 text-tron-cyan'
                    : 'text-tron-white hover:bg-tron-cyan/10'
                }`}
              >
                <span className="block truncate">
                  {prompt.title}
                  {prompt.isPrimarySystemPrompt && ' (Primary)'}
                  {promptType && ` - ${promptType.displayName}`}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Tooltip */}
      {hoveredOption && tooltipPosition && getDescription(hoveredOption) && (
        <div
          className="fixed z-[60] bg-tron-bg-panel border border-tron-cyan/30 text-tron-white 
                     px-3 py-2 rounded-lg shadow-tron-glow text-xs max-w-[300px] pointer-events-none"
          style={{
            left: `${Math.max(8, tooltipPosition.x)}px`, // Ensure at least 8px from left edge
            top: `${tooltipPosition.y}px`,
            transform: tooltipPosition.transform || 'translateY(-50%)',
          }}
        >
          <div className="font-semibold text-tron-cyan mb-1">
            {hoveredOption === 'primary' 
              ? 'Primary (Default)'
              : hoveredOption === 'none'
              ? 'None'
              : systemPrompts?.find(p => p._id === hoveredOption)?.title}
          </div>
          <div className="text-tron-gray text-xs leading-relaxed whitespace-normal">
            {getDescription(hoveredOption)}
          </div>
        </div>
      )}
    </div>
  );
}
