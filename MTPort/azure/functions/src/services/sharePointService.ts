import { Client } from '@microsoft/microsoft-graph-client';
import { SharePointFile, SharePointUploadRequest, SharePointUploadResponse } from '../types';

export class SharePointService {
  private graphClient: Client;

  constructor(accessToken: string) {
    this.graphClient = Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      }
    });
  }

  // Upload file to SharePoint document library
  async uploadToDocumentLibrary(
    file: Buffer,
    fileName: string,
    library: string,
    folder?: string
  ): Promise<SharePointUploadResponse> {
    try {
      const siteId = await this.getSiteId();
      const driveId = await this.getDriveId(siteId, library);
      
      let uploadPath = `/${fileName}`;
      if (folder) {
        uploadPath = `/${folder}/${fileName}`;
      }

      const uploadSession = await this.graphClient
        .api(`/drives/${driveId}/root:${uploadPath}:/createUploadSession`)
        .post({
          item: {
            '@microsoft.graph.conflictBehavior': 'replace',
            name: fileName
          }
        });

      // Upload the file in chunks
      const chunkSize = 320 * 1024; // 320KB chunks
      const totalSize = file.length;
      let uploadedBytes = 0;

      while (uploadedBytes < totalSize) {
        const chunk = file.slice(uploadedBytes, uploadedBytes + chunkSize);
        const contentRange = `bytes ${uploadedBytes}-${Math.min(uploadedBytes + chunkSize - 1, totalSize - 1)}/${totalSize}`;

        const response = await fetch(uploadSession.uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Length': chunk.length.toString(),
            'Content-Range': contentRange
          },
          body: chunk
        });

        if (response.status === 201 || response.status === 200) {
          const result = await response.json();
          return {
            success: true,
            fileId: result.id,
            webUrl: result.webUrl,
            message: 'File uploaded successfully'
          };
        }

        uploadedBytes += chunkSize;
      }

      throw new Error('Upload failed');
    } catch (error) {
      console.error('Error uploading to SharePoint:', error);
      return {
        success: false,
        fileId: '',
        webUrl: '',
        message: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  // Get file content from SharePoint
  async getFileContent(fileId: string): Promise<string> {
    try {
      const response = await this.graphClient
        .api(`/me/drive/items/${fileId}/content`)
        .get();

      return response.toString();
    } catch (error) {
      console.error('Error getting file content:', error);
      throw new Error('Failed to get file content');
    }
  }

  // List files in a SharePoint library
  async listFiles(library: string, folder?: string): Promise<SharePointFile[]> {
    try {
      const siteId = await this.getSiteId();
      const driveId = await this.getDriveId(siteId, library);
      
      let path = '/root/children';
      if (folder) {
        path = `/root:/${folder}:/children`;
      }

      const response = await this.graphClient
        .api(`/drives/${driveId}${path}`)
        .get();

      return response.value.map((item: any) => ({
        id: item.id,
        name: item.name,
        size: item.size,
        lastModified: new Date(item.lastModifiedDateTime),
        webUrl: item.webUrl,
        downloadUrl: item['@microsoft.graph.downloadUrl']
      }));
    } catch (error) {
      console.error('Error listing files:', error);
      throw new Error('Failed to list files');
    }
  }

  // Create a new folder in SharePoint
  async createFolder(folderName: string, library: string, parentFolder?: string): Promise<string> {
    try {
      const siteId = await this.getSiteId();
      const driveId = await this.getDriveId(siteId, library);
      
      let parentPath = '/root';
      if (parentFolder) {
        parentPath = `/root:/${parentFolder}:`;
      }

      const response = await this.graphClient
        .api(`/drives/${driveId}${parentPath}/children`)
        .post({
          name: folderName,
          folder: {},
          '@microsoft.graph.conflictBehavior': 'rename'
        });

      return response.id;
    } catch (error) {
      console.error('Error creating folder:', error);
      throw new Error('Failed to create folder');
    }
  }

  // Delete a file from SharePoint
  async deleteFile(fileId: string): Promise<void> {
    try {
      await this.graphClient
        .api(`/me/drive/items/${fileId}`)
        .delete();
    } catch (error) {
      console.error('Error deleting file:', error);
      throw new Error('Failed to delete file');
    }
  }

  // Get file metadata
  async getFileMetadata(fileId: string): Promise<SharePointFile> {
    try {
      const response = await this.graphClient
        .api(`/me/drive/items/${fileId}`)
        .get();

      return {
        id: response.id,
        name: response.name,
        size: response.size,
        lastModified: new Date(response.lastModifiedDateTime),
        webUrl: response.webUrl,
        downloadUrl: response['@microsoft.graph.downloadUrl']
      };
    } catch (error) {
      console.error('Error getting file metadata:', error);
      throw new Error('Failed to get file metadata');
    }
  }

  // Search files in SharePoint
  async searchFiles(query: string, library?: string): Promise<SharePointFile[]> {
    try {
      let searchPath = '/me/drive/search(q=\'{query}\')';
      if (library) {
        const siteId = await this.getSiteId();
        const driveId = await this.getDriveId(siteId, library);
        searchPath = `/drives/${driveId}/search(q='{query}')`;
      }

      const response = await this.graphClient
        .api(searchPath.replace('{query}', encodeURIComponent(query)))
        .get();

      return response.value.map((item: any) => ({
        id: item.id,
        name: item.name,
        size: item.size,
        lastModified: new Date(item.lastModifiedDateTime),
        webUrl: item.webUrl,
        downloadUrl: item['@microsoft.graph.downloadUrl']
      }));
    } catch (error) {
      console.error('Error searching files:', error);
      throw new Error('Failed to search files');
    }
  }

  // Get SharePoint site ID
  private async getSiteId(): Promise<string> {
    try {
      const response = await this.graphClient
        .api('/sites/root')
        .get();
      return response.id;
    } catch (error) {
      console.error('Error getting site ID:', error);
      throw new Error('Failed to get site ID');
    }
  }

  // Get SharePoint drive ID for a library
  private async getDriveId(siteId: string, library: string): Promise<string> {
    try {
      const response = await this.graphClient
        .api(`/sites/${siteId}/drives`)
        .get();

      const drive = response.value.find((d: any) => d.name === library);
      if (!drive) {
        throw new Error(`Library '${library}' not found`);
      }

      return drive.id;
    } catch (error) {
      console.error('Error getting drive ID:', error);
      throw new Error('Failed to get drive ID');
    }
  }

  // Get available document libraries
  async getDocumentLibraries(): Promise<Array<{ id: string; name: string; webUrl: string }>> {
    try {
      const siteId = await this.getSiteId();
      const response = await this.graphClient
        .api(`/sites/${siteId}/drives`)
        .get();

      return response.value.map((drive: any) => ({
        id: drive.id,
        name: drive.name,
        webUrl: drive.webUrl
      }));
    } catch (error) {
      console.error('Error getting document libraries:', error);
      throw new Error('Failed to get document libraries');
    }
  }

  // Share a file with specific users
  async shareFile(fileId: string, users: string[], permission: 'read' | 'write' = 'read'): Promise<void> {
    try {
      const permissions = users.map(email => ({
        email,
        roles: [permission]
      }));

      await this.graphClient
        .api(`/me/drive/items/${fileId}/invite`)
        .post({
          recipients: permissions,
          message: 'You have been granted access to this file',
          requireSignIn: true,
          sendInvitation: true
        });
    } catch (error) {
      console.error('Error sharing file:', error);
      throw new Error('Failed to share file');
    }
  }
}

// Factory function to create SharePoint service with access token
export const createSharePointService = (accessToken: string): SharePointService => {
  return new SharePointService(accessToken);
}; 