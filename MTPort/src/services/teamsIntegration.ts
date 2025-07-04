import { Client } from '@microsoft/microsoft-graph-client';
import { AdaptiveCardBuilder, AdaptiveCard } from '../utils/adaptiveCards';

export interface TeamsMember {
  id: string;
  displayName: string;
  email: string;
  jobTitle?: string;
  department?: string;
}

export interface TeamsUserProfile {
  id: string;
  displayName: string;
  email: string;
  jobTitle?: string;
  department?: string;
  officeLocation?: string;
  businessPhones?: string[];
}

export interface AdaptiveCardData {
  title: string;
  subtitle?: string;
  facts?: Array<{ title: string; value: string }>;
  actions?: Array<{ title: string; action: string; data?: any }>;
  imageUrl?: string;
}

export interface TeamsFile {
  id: string;
  name: string;
  size: number;
  lastModified: string;
  webUrl: string;
  downloadUrl: string;
}

export class TeamsIntegrationService {
  private graphClient: Client;

  constructor(graphClient: Client) {
    this.graphClient = graphClient;
  }

  // Notification Methods
  async sendAdaptiveCard(card: any, channelId: string): Promise<void> {
    try {
      const message = {
        body: {
          contentType: 'html',
          content: `<attachment id="${Date.now()}"></attachment>`
        },
        attachments: [
          {
            id: Date.now().toString(),
            contentType: 'application/vnd.microsoft.card.adaptive',
            content: card
          }
        ]
      };

      await this.graphClient
        .api(`/teams/${channelId}/channels/${channelId}/messages`)
        .post(message);
    } catch (error) {
      console.error('Failed to send adaptive card:', error);
      throw new Error('Failed to send adaptive card to Teams channel');
    }
  }

  async sendMessageToChannel(channelId: string, message: string): Promise<void> {
    try {
      const chatMessage = {
        body: {
          contentType: 'html',
          content: message
        }
      };

      await this.graphClient
        .api(`/teams/${channelId}/channels/${channelId}/messages`)
        .post(chatMessage);
    } catch (error) {
      console.error('Failed to send message to channel:', error);
      throw new Error('Failed to send message to Teams channel');
    }
  }

  async sendNotificationToUser(userId: string, card: any): Promise<void> {
    try {
      const message = {
        body: {
          contentType: 'html',
          content: `<attachment id="${Date.now()}"></attachment>`
        },
        attachments: [
          {
            id: Date.now().toString(),
            contentType: 'application/vnd.microsoft.card.adaptive',
            content: card
          }
        ]
      };

      await this.graphClient
        .api(`/users/${userId}/chats`)
        .post(message);
    } catch (error) {
      console.error('Failed to send notification to user:', error);
      throw new Error('Failed to send notification to user');
    }
  }

  // File Integration Methods
  async openFileInTeams(fileId: string): Promise<void> {
    try {
      const file = await this.graphClient
        .api(`/me/drive/items/${fileId}`)
        .get();
      
      window.open(file.webUrl, '_blank');
    } catch (error) {
      console.error('Failed to open file in Teams:', error);
      throw new Error('Failed to open file in Teams');
    }
  }

  async shareFileWithTeam(fileId: string, teamId: string): Promise<void> {
    try {
      const permission = {
        roles: ['read'],
        grantedToIdentities: [
          {
            application: null,
            device: null,
            user: {
              id: teamId
            }
          }
        ]
      };

      await this.graphClient
        .api(`/me/drive/items/${fileId}/permissions`)
        .post(permission);
    } catch (error) {
      console.error('Failed to share file with team:', error);
      throw new Error('Failed to share file with team');
    }
  }

  async getTeamsFiles(teamId: string, channelId: string): Promise<TeamsFile[]> {
    try {
      const files = await this.graphClient
        .api(`/teams/${teamId}/channels/${channelId}/filesFolder/children`)
        .get();

      return files.value.map((file: any) => ({
        id: file.id,
        name: file.name,
        size: file.size,
        lastModified: file.lastModifiedDateTime,
        webUrl: file.webUrl,
        downloadUrl: file['@microsoft.graph.downloadUrl']
      }));
    } catch (error) {
      console.error('Failed to get Teams files:', error);
      throw new Error('Failed to get Teams files');
    }
  }

  // User Management Methods
  async getTeamMembers(teamId: string): Promise<TeamsMember[]> {
    try {
      const members = await this.graphClient
        .api(`/teams/${teamId}/members`)
        .get();

      return members.value.map((member: any) => ({
        id: member.id,
        displayName: member.displayName,
        email: member.email,
        jobTitle: member.jobTitle,
        department: member.department
      }));
    } catch (error) {
      console.error('Failed to get team members:', error);
      throw new Error('Failed to get team members');
    }
  }

  async getUserProfile(userId: string): Promise<TeamsUserProfile> {
    try {
      const user = await this.graphClient
        .api(`/users/${userId}`)
        .get();

      return {
        id: user.id,
        displayName: user.displayName,
        email: user.mail || user.userPrincipalName,
        jobTitle: user.jobTitle,
        department: user.department,
        officeLocation: user.officeLocation,
        businessPhones: user.businessPhones
      };
    } catch (error) {
      console.error('Failed to get user profile:', error);
      throw new Error('Failed to get user profile');
    }
  }

  async getCurrentUserProfile(): Promise<TeamsUserProfile> {
    try {
      const user = await this.graphClient
        .api('/me')
        .get();

      return {
        id: user.id,
        displayName: user.displayName,
        email: user.mail || user.userPrincipalName,
        jobTitle: user.jobTitle,
        department: user.department,
        officeLocation: user.officeLocation,
        businessPhones: user.businessPhones
      };
    } catch (error) {
      console.error('Failed to get current user profile:', error);
      throw new Error('Failed to get current user profile');
    }
  }

  // Channel Management
  async createNominationChannel(teamId: string, channelName: string): Promise<string> {
    try {
      const channel = {
        displayName: channelName,
        description: 'Channel for employee nominations and approvals',
        membershipType: 'standard'
      };

      const result = await this.graphClient
        .api(`/teams/${teamId}/channels`)
        .post(channel);

      return result.id;
    } catch (error) {
      console.error('Failed to create nomination channel:', error);
      throw new Error('Failed to create nomination channel');
    }
  }

  async getChannels(teamId: string): Promise<any[]> {
    try {
      const channels = await this.graphClient
        .api(`/teams/${teamId}/channels`)
        .get();

      return channels.value;
    } catch (error) {
      console.error('Failed to get channels:', error);
      throw new Error('Failed to get channels');
    }
  }

  // Adaptive Card Builders
  createNominationCard(nomination: any): AdaptiveCard {
    return AdaptiveCardBuilder.createNominationCard(nomination);
  }

  createJobMatchCard(jobMatch: any): AdaptiveCard {
    return AdaptiveCardBuilder.createJobMatchCard(jobMatch);
  }

  createDataUploadCard(uploadResult: any): AdaptiveCard {
    return AdaptiveCardBuilder.createDataUploadCard(uploadResult);
  }

  // Utility Methods
  async sendNominationNotification(nomination: any, approvers: TeamsMember[]): Promise<void> {
    const card = this.createNominationCard(nomination);
    
    for (const approver of approvers) {
      try {
        await this.sendNotificationToUser(approver.id, card);
      } catch (error) {
        console.error(`Failed to send notification to ${approver.displayName}:`, error);
      }
    }
  }

  async sendJobMatchNotification(jobMatch: any, userId: string): Promise<void> {
    const card = this.createJobMatchCard(jobMatch);
    await this.sendNotificationToUser(userId, card);
  }

  async sendDataUploadNotification(uploadResult: any, userId: string): Promise<void> {
    const card = this.createDataUploadCard(uploadResult);
    await this.sendNotificationToUser(userId, card);
  }
} 