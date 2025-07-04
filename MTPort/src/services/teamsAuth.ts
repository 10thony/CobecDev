import { PublicClientApplication, Configuration, AccountInfo, AuthenticationResult } from '@azure/msal-browser';
import { TeamsUser, AuthConfig, AuthResult } from '../types';

// MSAL configuration for Teams
const msalConfig: Configuration = {
  auth: {
    clientId: process.env.REACT_APP_CLIENT_ID || 'your-client-id',
    authority: `https://login.microsoftonline.com/${process.env.REACT_APP_TENANT_ID || 'common'}`,
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level: any, message: string, containsPii: boolean) => {
        if (containsPii) {
          return;
        }
        switch (level) {
          case 0:
            console.error(message);
            break;
          case 1:
            console.warn(message);
            break;
          case 2:
            console.info(message);
            break;
          case 3:
            console.debug(message);
            break;
          default:
            console.log(message);
            break;
        }
      },
      logLevel: 2, // Info level
    },
  },
};

// Scopes for Microsoft Graph API
const loginRequest = {
  scopes: [
    'User.Read',
    'User.ReadBasic.All',
    'Team.ReadBasic.All',
    'Channel.ReadBasic.All',
    'Files.Read',
    'Files.ReadWrite',
    'Sites.Read.All',
    'Sites.ReadWrite.All',
  ],
};

// Scopes for silent token acquisition
const silentRequest = {
  scopes: loginRequest.scopes,
  account: undefined as AccountInfo | undefined,
};

class TeamsAuthService {
  private msalInstance: PublicClientApplication;
  private currentUser: TeamsUser | null = null;

  constructor() {
    this.msalInstance = new PublicClientApplication(msalConfig);
  }

  /**
   * Initialize the authentication service
   */
  async initialize(): Promise<void> {
    try {
      await this.msalInstance.initialize();
      console.log('Teams Auth Service initialized successfully');
      
      // Check if user is already signed in
      const accounts = this.msalInstance.getAllAccounts();
      if (accounts.length > 0) {
        await this.setCurrentUser(accounts[0]);
      }
    } catch (error) {
      console.error('Failed to initialize Teams Auth Service:', error);
      throw error;
    }
  }

  /**
   * Sign in the user
   */
  async signIn(): Promise<TeamsUser> {
    try {
      const response = await this.msalInstance.loginPopup(loginRequest);
      await this.setCurrentUser(response.account!);
      return this.currentUser!;
    } catch (error) {
      console.error('Sign in failed:', error);
      throw error;
    }
  }

  /**
   * Sign out the user
   */
  async signOut(): Promise<void> {
    try {
      const accounts = this.msalInstance.getAllAccounts();
      if (accounts.length > 0) {
        await this.msalInstance.logoutPopup({
          account: accounts[0],
        });
      }
      this.currentUser = null;
    } catch (error) {
      console.error('Sign out failed:', error);
      throw error;
    }
  }

  /**
   * Get the current authenticated user
   */
  getCurrentUser(): TeamsUser | null {
    return this.currentUser;
  }

  /**
   * Get access token for Microsoft Graph API
   */
  async getAccessToken(): Promise<string> {
    try {
      const accounts = this.msalInstance.getAllAccounts();
      if (accounts.length === 0) {
        throw new Error('No user account found');
      }

      silentRequest.account = accounts[0];
      const response = await this.msalInstance.acquireTokenSilent(silentRequest);
      return response.accessToken;
    } catch (error) {
      console.error('Failed to acquire token silently:', error);
      
      // Try interactive token acquisition
      try {
        const response = await this.msalInstance.acquireTokenPopup(loginRequest);
        return response.accessToken;
      } catch (popupError) {
        console.error('Failed to acquire token interactively:', popupError);
        throw popupError;
      }
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  /**
   * Get user information from Microsoft Graph
   */
  async getUserInfo(): Promise<any> {
    try {
      const token = await this.getAccessToken();
      const response = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get user info: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get user info:', error);
      throw error;
    }
  }

  /**
   * Get Teams context information
   */
  async getTeamsContext(): Promise<any> {
    try {
      // This would typically come from the Teams SDK
      // For now, we'll return a mock context
      return {
        app: {
          sessionId: 'mock-session-id',
          theme: 'default',
          locale: 'en-US',
        },
        page: {
          id: 'mock-page-id',
          frameContext: 'content',
        },
        user: this.currentUser ? {
          id: this.currentUser.id,
          displayName: this.currentUser.displayName,
          email: this.currentUser.email,
          tenantId: this.currentUser.tenantId,
        } : null,
      };
    } catch (error) {
      console.error('Failed to get Teams context:', error);
      throw error;
    }
  }

  /**
   * Set the current user from MSAL account
   */
  private async setCurrentUser(account: AccountInfo): Promise<void> {
    try {
      // Get additional user info from Microsoft Graph
      const userInfo = await this.getUserInfo();
      
      this.currentUser = {
        id: account.localAccountId,
        displayName: userInfo.displayName || account.name || 'Unknown User',
        email: userInfo.mail || account.username || '',
        tenantId: account.tenantId,
        teamsContext: await this.getTeamsContext(),
      };
    } catch (error) {
      console.error('Failed to set current user:', error);
      // Fallback to basic account info
      this.currentUser = {
        id: account.localAccountId,
        displayName: account.name || 'Unknown User',
        email: account.username || '',
        tenantId: account.tenantId,
        teamsContext: null,
      };
    }
  }

  /**
   * Handle authentication redirect
   */
  async handleRedirectPromise(): Promise<TeamsUser | null> {
    try {
      const response = await this.msalInstance.handleRedirectPromise();
      if (response) {
        await this.setCurrentUser(response.account!);
        return this.currentUser;
      }
      return null;
    } catch (error) {
      console.error('Failed to handle redirect promise:', error);
      return null;
    }
  }

  /**
   * Get authentication configuration
   */
  getAuthConfig(): AuthConfig {
    return {
      clientId: msalConfig.auth.clientId,
      authority: msalConfig.auth.authority,
      redirectUri: msalConfig.auth.redirectUri,
      scopes: loginRequest.scopes,
    };
  }

  /**
   * Check if token is expired
   */
  async isTokenExpired(): Promise<boolean> {
    try {
      const accounts = this.msalInstance.getAllAccounts();
      if (accounts.length === 0) {
        return true;
      }

      // Try to acquire token silently to check if it's expired
      silentRequest.account = accounts[0];
      await this.msalInstance.acquireTokenSilent(silentRequest);
      return false;
    } catch (error) {
      return true;
    }
  }

  /**
   * Refresh the access token
   */
  async refreshToken(): Promise<AuthResult> {
    try {
      const accounts = this.msalInstance.getAllAccounts();
      if (accounts.length === 0) {
        throw new Error('No user account found');
      }

      silentRequest.account = accounts[0];
      const response = await this.msalInstance.acquireTokenSilent(silentRequest);
      
      return {
        accessToken: response.accessToken,
        expiresOn: response.expiresOn,
        account: response.account,
      };
    } catch (error) {
      console.error('Failed to refresh token:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const teamsAuthService = new TeamsAuthService();
export default teamsAuthService; 