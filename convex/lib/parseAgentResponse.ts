/**
 * Utility to parse AI agent responses and extract structured procurement link data.
 * Handles responses that contain JSON blocks with procurement links.
 */

export interface ProcurementLink {
  state: string;
  capital: string;
  official_website: string;
  procurement_link: string;
  entity_type?: string;
  link_type?: string;
  confidence_score?: number;
}

export interface SearchMetadata {
  target_regions: string[];
  count_found: number;
  timestamp?: string;
}

export interface ParsedResponse {
  /** The plain text content (with JSON block removed for cleaner display) */
  textContent: string;
  /** Structured procurement link data if found */
  responseData?: {
    search_metadata: SearchMetadata;
    procurement_links: ProcurementLink[];
  };
  /** Whether structured data was successfully parsed */
  hasStructuredData: boolean;
}

/**
 * Parse an AI agent's text response to extract structured procurement link data.
 * Looks for JSON blocks in the response and extracts the procurement links structure.
 */
export function parseAgentResponse(rawText: string): ParsedResponse {
  if (!rawText || typeof rawText !== 'string') {
    return {
      textContent: rawText || '',
      hasStructuredData: false,
    };
  }

  // Try to extract JSON block from the response
  // Pattern matches ```json ... ``` or ``` ... ``` blocks
  const jsonBlockPattern = /```(?:json)?\s*\n?([\s\S]*?)\n?```/g;
  const matches = [...rawText.matchAll(jsonBlockPattern)];

  let responseData: ParsedResponse['responseData'] = undefined;
  let textContent = rawText;

  for (const match of matches) {
    const jsonString = match[1].trim();
    
    try {
      const parsed = JSON.parse(jsonString);
      
      // Check if this looks like our procurement links structure
      if (isProcurementLinksResponse(parsed)) {
        responseData = {
          search_metadata: {
            target_regions: parsed.search_metadata?.target_regions || [],
            count_found: parsed.search_metadata?.count_found || parsed.procurement_links?.length || 0,
            timestamp: new Date().toISOString(),
          },
          procurement_links: normalizeLinks(parsed.procurement_links || []),
        };
        
        // Remove the JSON block from text content for cleaner display
        textContent = rawText.replace(match[0], '').trim();
        
        // Clean up any multiple newlines left behind
        textContent = textContent.replace(/\n{3,}/g, '\n\n');
        
        break; // Use first valid JSON block
      }
    } catch {
      // Not valid JSON, continue to next match
      continue;
    }
  }

  // If no fenced JSON block found, try to find raw JSON object in the text
  if (!responseData) {
    const rawJsonPattern = /\{[\s\S]*?"procurement_links"[\s\S]*?\}/;
    const rawMatch = rawText.match(rawJsonPattern);
    
    if (rawMatch) {
      try {
        // Find the complete JSON object by matching brackets
        const jsonStart = rawText.indexOf(rawMatch[0]);
        const extractedJson = extractCompleteJson(rawText, jsonStart);
        
        if (extractedJson) {
          const parsed = JSON.parse(extractedJson);
          
          if (isProcurementLinksResponse(parsed)) {
            responseData = {
              search_metadata: {
                target_regions: parsed.search_metadata?.target_regions || [],
                count_found: parsed.search_metadata?.count_found || parsed.procurement_links?.length || 0,
                timestamp: new Date().toISOString(),
              },
              procurement_links: normalizeLinks(parsed.procurement_links || []),
            };
            
            textContent = rawText.replace(extractedJson, '').trim();
            textContent = textContent.replace(/\n{3,}/g, '\n\n');
          }
        }
      } catch {
        // Failed to parse raw JSON
      }
    }
  }

  return {
    textContent,
    responseData,
    hasStructuredData: !!responseData,
  };
}

/**
 * Check if the parsed object has the expected procurement links structure
 */
function isProcurementLinksResponse(obj: unknown): obj is { 
  search_metadata?: { target_regions?: string[]; count_found?: number };
  procurement_links?: Array<Record<string, unknown>>;
} {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  
  const record = obj as Record<string, unknown>;
  
  // Must have procurement_links array
  if (!Array.isArray(record.procurement_links)) {
    return false;
  }
  
  // Check if at least one link has expected fields
  if (record.procurement_links.length > 0) {
    const firstLink = record.procurement_links[0] as Record<string, unknown>;
    return (
      typeof firstLink.state === 'string' ||
      typeof firstLink.capital === 'string' ||
      typeof firstLink.procurement_link === 'string'
    );
  }
  
  return true;
}

/**
 * Extract city name from URL domain
 */
function extractCityFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    let hostname = urlObj.hostname.toLowerCase();
    
    // Remove www prefix
    hostname = hostname.replace(/^www\./, '');
    
    // Extract main domain (last two parts for .gov, .org, etc.)
    const parts = hostname.split('.');
    let mainDomain = parts.length >= 2 
      ? parts.slice(-2).join('.')  // e.g., "orlando.gov"
      : parts[0];                   // e.g., "orlando"
    
    // Remove TLD
    mainDomain = mainDomain.replace(/\.(gov|org|com|net|edu)$/, '');
    
    // Known city domain patterns and their city names
    const cityDomainMap: Record<string, string> = {
      'orlando': 'orlando',
      'orlandogov': 'orlando',
      'atlanta': 'atlanta',
      'atlantaga': 'atlanta',
      'atlantagov': 'atlanta',
      'denver': 'denver',
      'denvergov': 'denver',
      'denvergov': 'denver',
      'tallahassee': 'tallahassee',
      'columbia': 'columbia',
      'columbiasc': 'columbia',
      'austin': 'austin',
      'austintexas': 'austin',
      'houston': 'houston',
      'houstontx': 'houston',
      'phoenix': 'phoenix',
      'phoenixaz': 'phoenix',
    };
    
    // Check direct mapping first
    if (cityDomainMap[mainDomain]) {
      return cityDomainMap[mainDomain];
    }
    
    // Try to extract city from patterns like "citygov", "city-gov", "citystate"
    const patterns = [
      /^([a-z]+?)(gov|govt|government)$/,           // orlandogov, denvergov
      /^([a-z]+?)(tx|ga|az|fl|co|sc|ca|ny)$/,       // houstontx, atlantaga
      /^([a-z]+?)-gov/,                              // city-gov
      /^([a-z]+)$/,                                  // plain city name
    ];
    
    for (const pattern of patterns) {
      const match = mainDomain.match(pattern);
      if (match && match[1] && match[1].length > 2) {
        const extracted = match[1];
        // Exclude state abbreviations and common words
        const excludeList = ['www', 'www2', 'www3', 'mail', 'ftp', 'admin', 'portal', 'procurement', 'purchasing'];
        if (!excludeList.includes(extracted)) {
          return extracted;
        }
      }
    }
    
    // Exclude known state domains
    const stateDomains = ['colorado', 'florida', 'georgia', 'texas', 'california', 'newyork', 
                          'sc', 'ga', 'fl', 'co', 'tx', 'ca', 'ny', 'myflorida', 'gov'];
    if (stateDomains.includes(mainDomain)) {
      return null; // This is a state domain, not a city
    }
    
    // If it's a reasonable length and doesn't look like a state domain, return it
    if (mainDomain.length >= 3 && mainDomain.length <= 20) {
      return mainDomain;
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Check if city name matches URL domain
 */
function validateCityUrlMatch(cityName: string, url: string, entityType?: string): boolean {
  const entityTypeLower = entityType?.toLowerCase() || '';
  const isStateLevel = entityTypeLower.includes('state');
  
  // For state-level links, we're more lenient - state domains can use capital city name
  if (isStateLevel) {
    // But still check if it's clearly a different city's URL
    const urlCity = extractCityFromUrl(url);
    if (urlCity) {
      const cityLower = cityName.toLowerCase();
      const urlCityLower = urlCity.toLowerCase();
      
      // If URL clearly belongs to a different city (not state domain), flag it
      // Example: entity_type="State", city="Tallahassee", URL="orlando.gov" → mismatch
      if (cityLower !== urlCityLower && 
          !urlCityLower.includes(cityLower) && 
          !cityLower.includes(urlCityLower)) {
        // Check if it's a known state domain
        const stateDomains = ['colorado', 'florida', 'georgia', 'texas', 'sc', 'ga', 'fl', 'co', 'tx', 'myflorida'];
        const isStateDomain = stateDomains.some(sd => url.toLowerCase().includes(sd));
        if (!isStateDomain) {
          return false; // URL is for a different city
        }
      }
    }
    return true; // State links with state domains are OK
  }
  
  // For city-level links, we need strict matching
  const urlCity = extractCityFromUrl(url);
  if (!urlCity) {
    return true; // Can't extract city, assume valid (might be state domain)
  }
  
  const cityLower = cityName.toLowerCase().trim();
  const urlCityLower = urlCity.toLowerCase().trim();
  
  // Exact match
  if (cityLower === urlCityLower) {
    return true;
  }
  
  // Check if city name appears in URL city (substring match)
  if (urlCityLower.includes(cityLower) || cityLower.includes(urlCityLower)) {
    return true;
  }
  
  // Common city name variations mapping
  const cityVariations: Record<string, string[]> = {
    'atlanta': ['atlantaga', 'atlanta', 'atlantagov'],
    'denver': ['denvergov', 'denver'],
    'orlando': ['orlando', 'orlandogov'],
    'tallahassee': ['tallahassee', 'tallahasse'],
    'columbia': ['columbiasc', 'columbia'],
    'austin': ['austintexas', 'austin'],
    'houston': ['houstontx', 'houston'],
    'phoenix': ['phoenix', 'phoenixaz'],
  };
  
  // Check variations
  for (const [city, variations] of Object.entries(cityVariations)) {
    const cityMatches = variations.some(v => 
      cityLower === v || cityLower.includes(v) || v.includes(cityLower)
    );
    const urlMatches = variations.some(v => 
      urlCityLower === v || urlCityLower.includes(v) || v.includes(urlCityLower)
    );
    
    if (cityMatches && urlMatches) {
      return true;
    }
  }
  
  // If city is in variations but URL doesn't match, it's a mismatch
  // Example: city="Tallahassee" but URL contains "orlando" → false
  for (const [city, variations] of Object.entries(cityVariations)) {
    const cityMatches = variations.some(v => 
      cityLower === v || cityLower.includes(v) || v.includes(cityLower)
    );
    if (cityMatches) {
      // City is known, but URL doesn't match any of its variations
      const urlMatches = variations.some(v => 
        urlCityLower === v || urlCityLower.includes(v) || v.includes(urlCityLower)
      );
      if (!urlMatches) {
        return false; // Known city but URL doesn't match
      }
    }
  }
  
  return false; // No match found
}

/**
 * Normalize links to ensure they have all required fields and validate city-URL matching
 */
function normalizeLinks(links: Array<Record<string, unknown>>): ProcurementLink[] {
  return links
    .map((link) => {
      const normalized: ProcurementLink = {
        state: String(link.state || 'Unknown'),
        capital: String(link.capital || link.city || 'Unknown'),
        official_website: String(link.official_website || link.website || ''),
        procurement_link: String(link.procurement_link || link.link || ''),
        entity_type: link.entity_type ? String(link.entity_type) : undefined,
        link_type: link.link_type ? String(link.link_type) : undefined,
        confidence_score: typeof link.confidence_score === 'number' 
          ? link.confidence_score 
          : undefined,
      };
      
      // Validate city-URL matching for city-level links
      if (normalized.entity_type && normalized.entity_type.toLowerCase().includes('city')) {
        const isValid = validateCityUrlMatch(
          normalized.capital,
          normalized.procurement_link || normalized.official_website,
          normalized.entity_type
        );
        
        if (!isValid) {
          // Lower confidence score for mismatched links
          if (normalized.confidence_score !== undefined) {
            normalized.confidence_score = Math.min(normalized.confidence_score, 0.5);
          } else {
            normalized.confidence_score = 0.3;
          }
        }
      }
      
      return normalized;
    })
    .filter((link) => {
      // Filter out links with very low confidence that likely have mismatches
      // But keep them if they're explicitly marked as low confidence (user can review)
      return true; // Keep all links, but mark low confidence ones
    });
}

/**
 * Extract a complete JSON object from text starting at a given position.
 * Handles nested braces properly.
 */
function extractCompleteJson(text: string, startPos: number): string | null {
  if (text[startPos] !== '{') {
    return null;
  }
  
  let braceCount = 0;
  let inString = false;
  let escapeNext = false;
  
  for (let i = startPos; i < text.length; i++) {
    const char = text[i];
    
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    
    if (char === '\\' && inString) {
      escapeNext = true;
      continue;
    }
    
    if (char === '"') {
      inString = !inString;
      continue;
    }
    
    if (!inString) {
      if (char === '{') {
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          return text.substring(startPos, i + 1);
        }
      }
    }
  }
  
  return null;
}
