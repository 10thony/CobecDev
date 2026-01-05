/**
 * MCP Browser Service
 * 
 * Provides a bridge to call MCP browser tools from the frontend.
 * Since MCP tools are typically server-side, we'll use a Convex action
 * or direct API calls if available.
 */

// MCP tool function types (matching the MCP tool signatures)
type MCPNavigate = (params: { url: string }) => Promise<void>;
type MCPSnapshot = () => Promise<string>;
type MCPClick = (params: { ref: string; element: string; doubleClick?: boolean; button?: string; modifiers?: string[] }) => Promise<void>;
type MCPType = (params: { ref: string; element: string; text: string; submit?: boolean; slowly?: boolean }) => Promise<void>;
type MCPHover = (params: { ref: string; element: string }) => Promise<void>;
type MCPWaitFor = (params: { time?: number; text?: string; textGone?: string }) => Promise<void>;
type MCPNavigateBack = () => Promise<void>;
type MCPPressKey = (params: { key: string }) => Promise<void>;
type MCPScreenshot = (params: { filename?: string; type?: string; fullPage?: boolean; element?: string; ref?: string }) => Promise<string>;
type MCPGetConsoleMessages = () => Promise<string[]>;
type MCPResize = (params: { width: number; height: number }) => Promise<void>;

/**
 * Check if MCP tools are available in the current environment
 * In Cursor IDE, MCP tools might be available through a global object
 */
function getMCPTools(): {
  navigate?: MCPNavigate;
  snapshot?: MCPSnapshot;
  click?: MCPClick;
  type?: MCPType;
  hover?: MCPHover;
  waitFor?: MCPWaitFor;
  navigateBack?: MCPNavigateBack;
  pressKey?: MCPPressKey;
  takeScreenshot?: MCPScreenshot;
  getConsoleMessages?: MCPGetConsoleMessages;
  resize?: MCPResize;
} {
  // Try to access MCP tools through various possible interfaces
  // In Cursor IDE, these might be available through window or a global
  
  // Option 1: Direct MCP tool functions (if available in environment)
  if (typeof window !== 'undefined') {
    const mcp = (window as any).mcp || (window as any).__mcp__;
    if (mcp && mcp.browser) {
      return mcp.browser;
    }
  }
  
  // Option 2: Check for Cursor-specific MCP interface
  if (typeof (globalThis as any).mcp !== 'undefined') {
    return (globalThis as any).mcp.browser || {};
  }
  
  return {};
}

/**
 * MCP Browser Service Implementation
 * 
 * This service provides a way to call MCP browser tools.
 * In production, this would be called through a Convex action
 * that has access to MCP tools, or directly if available in the environment.
 */
class MCPBrowserService {
  private tools: ReturnType<typeof getMCPTools>;
  private useConvexBridge: boolean = false;
  
  constructor() {
    this.tools = getMCPTools();
    
    // If MCP tools are not directly available, we'll need to use a Convex action bridge
    // For now, we'll throw errors to indicate MCP tools need to be integrated
    if (Object.keys(this.tools).length === 0) {
      console.warn('[MCP Browser Service] MCP tools not directly available. Will use Convex action bridge.');
      this.useConvexBridge = true;
    }
  }
  
  async navigate(url: string): Promise<void> {
    if (this.tools.navigate) {
      return await this.tools.navigate({ url });
    }
    
    if (this.useConvexBridge) {
      // TODO: Call Convex action that uses MCP tools
      throw new Error('MCP browser tools not yet integrated. Please implement Convex action bridge or provide MCP tools.');
    }
    
    throw new Error('MCP navigate tool not available');
  }
  
  async snapshot(): Promise<string> {
    if (this.tools.snapshot) {
      return await this.tools.snapshot();
    }
    
    if (this.useConvexBridge) {
      // TODO: Call Convex action that uses MCP tools
      throw new Error('MCP browser tools not yet integrated. Please implement Convex action bridge or provide MCP tools.');
    }
    
    throw new Error('MCP snapshot tool not available');
  }
  
  async click(ref: string, element: string, options?: { doubleClick?: boolean; button?: string; modifiers?: string[] }): Promise<void> {
    if (this.tools.click) {
      return await this.tools.click({ ref, element, ...options });
    }
    
    if (this.useConvexBridge) {
      // TODO: Call Convex action that uses MCP tools
      throw new Error('MCP browser tools not yet integrated. Please implement Convex action bridge or provide MCP tools.');
    }
    
    throw new Error('MCP click tool not available');
  }
  
  async type(ref: string, element: string, text: string, submit?: boolean, slowly?: boolean): Promise<void> {
    if (this.tools.type) {
      return await this.tools.type({ ref, element, text, submit, slowly });
    }
    
    if (this.useConvexBridge) {
      // TODO: Call Convex action that uses MCP tools
      throw new Error('MCP browser tools not yet integrated. Please implement Convex action bridge or provide MCP tools.');
    }
    
    throw new Error('MCP type tool not available');
  }
  
  async hover(ref: string, element: string): Promise<void> {
    if (this.tools.hover) {
      return await this.tools.hover({ ref, element });
    }
    
    if (this.useConvexBridge) {
      // TODO: Call Convex action that uses MCP tools
      throw new Error('MCP browser tools not yet integrated. Please implement Convex action bridge or provide MCP tools.');
    }
    
    throw new Error('MCP hover tool not available');
  }
  
  async waitFor(options: { time?: number; text?: string; textGone?: string }): Promise<void> {
    if (this.tools.waitFor) {
      return await this.tools.waitFor(options);
    }
    
    // WaitFor can be implemented with setTimeout if time is provided
    if (options.time) {
      await new Promise((resolve) => setTimeout(resolve, options.time * 1000));
      return;
    }
    
    if (this.useConvexBridge) {
      throw new Error('MCP browser tools not yet integrated. Please implement Convex action bridge or provide MCP tools.');
    }
    
    throw new Error('MCP waitFor tool not available');
  }
  
  async navigateBack(): Promise<void> {
    if (this.tools.navigateBack) {
      return await this.tools.navigateBack();
    }
    
    if (this.useConvexBridge) {
      // TODO: Call Convex action that uses MCP tools
      throw new Error('MCP browser tools not yet integrated. Please implement Convex action bridge or provide MCP tools.');
    }
    
    throw new Error('MCP navigateBack tool not available');
  }
  
  async pressKey(key: string): Promise<void> {
    if (this.tools.pressKey) {
      return await this.tools.pressKey({ key });
    }
    
    if (this.useConvexBridge) {
      // TODO: Call Convex action that uses MCP tools
      throw new Error('MCP browser tools not yet integrated. Please implement Convex action bridge or provide MCP tools.');
    }
    
    throw new Error('MCP pressKey tool not available');
  }
  
  async takeScreenshot(filename?: string): Promise<string> {
    if (this.tools.takeScreenshot) {
      return await this.tools.takeScreenshot({ filename });
    }
    
    if (this.useConvexBridge) {
      // TODO: Call Convex action that uses MCP tools
      throw new Error('MCP browser tools not yet integrated. Please implement Convex action bridge or provide MCP tools.');
    }
    
    throw new Error('MCP takeScreenshot tool not available');
  }
  
  async getConsoleMessages(): Promise<string[]> {
    if (this.tools.getConsoleMessages) {
      return await this.tools.getConsoleMessages();
    }
    
    // Return empty array if not available
    return [];
  }
  
  async resize(width: number, height: number): Promise<void> {
    if (this.tools.resize) {
      return await this.tools.resize({ width, height });
    }
    
    if (this.useConvexBridge) {
      // TODO: Call Convex action that uses MCP tools
      throw new Error('MCP browser tools not yet integrated. Please implement Convex action bridge or provide MCP tools.');
    }
    
    throw new Error('MCP resize tool not available');
  }
}

// Singleton instance
let mcpServiceInstance: MCPBrowserService | null = null;

export function getMCPBrowserService(): MCPBrowserService {
  if (!mcpServiceInstance) {
    mcpServiceInstance = new MCPBrowserService();
  }
  return mcpServiceInstance;
}

/**
 * Direct MCP tool access (for use when MCP tools are available in the environment)
 * This allows the AI assistant to call MCP tools directly
 */
export async function callMCPTool(
  toolName: string,
  params: any
): Promise<any> {
  // This function can be called by the AI assistant to directly invoke MCP tools
  // The actual implementation depends on how MCP tools are exposed in the environment
  
  // For now, we'll use a try-catch approach to handle both direct calls and bridge calls
  try {
    const service = getMCPBrowserService();
    
    switch (toolName) {
      case 'navigate':
        return await service.navigate(params.url);
      case 'snapshot':
        return await service.snapshot();
      case 'click':
        return await service.click(params.ref, params.element, params);
      case 'type':
        return await service.type(params.ref, params.element, params.text, params.submit, params.slowly);
      case 'hover':
        return await service.hover(params.ref, params.element);
      case 'waitFor':
        return await service.waitFor(params);
      case 'navigateBack':
        return await service.navigateBack();
      case 'pressKey':
        return await service.pressKey(params.key);
      case 'takeScreenshot':
        return await service.takeScreenshot(params.filename);
      case 'getConsoleMessages':
        return await service.getConsoleMessages();
      case 'resize':
        return await service.resize(params.width, params.height);
      default:
        throw new Error(`Unknown MCP tool: ${toolName}`);
    }
  } catch (error) {
    console.error(`[MCP Browser Service] Error calling ${toolName}:`, error);
    throw error;
  }
}



