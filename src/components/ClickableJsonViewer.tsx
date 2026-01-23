import React from 'react';

interface ClickableJsonViewerProps {
  content: string;
  className?: string;
}

/**
 * Component that renders JSON/text content with clickable URLs.
 * URLs are automatically detected and made clickable, opening in a new tab.
 */
export function ClickableJsonViewer({ content, className = '' }: ClickableJsonViewerProps) {
  // Regular expression to match URLs (http, https, www, etc.)
  const urlRegex = /(https?:\/\/[^\s"']+|www\.[^\s"']+)/gi;

  // Split content by URLs and create an array of text and link elements
  const parts: (string | { type: 'link'; url: string; text: string })[] = [];
  let lastIndex = 0;
  let match;

  // Reset regex lastIndex
  urlRegex.lastIndex = 0;

  while ((match = urlRegex.exec(content)) !== null) {
    // Add text before the URL
    if (match.index > lastIndex) {
      parts.push(content.substring(lastIndex, match.index));
    }

    // Add the URL as a link
    let url = match[0];
    // Add https:// if it's a www link
    if (url.startsWith('www.')) {
      url = 'https://' + url;
    }
    parts.push({ type: 'link', url, text: match[0] });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after the last URL
  if (lastIndex < content.length) {
    parts.push(content.substring(lastIndex));
  }

  // If no URLs were found, just return the content as-is
  if (parts.length === 0) {
    parts.push(content);
  }

  return (
    <pre className={`text-xs text-tron-gray whitespace-pre-wrap font-mono ${className}`}>
      {parts.map((part, index) => {
        if (typeof part === 'string') {
          return <React.Fragment key={index}>{part}</React.Fragment>;
        } else {
          return (
            <a
              key={index}
              href={part.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-tron-cyan hover:text-tron-cyan/80 underline break-all"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              {part.text}
            </a>
          );
        }
      })}
    </pre>
  );
}
