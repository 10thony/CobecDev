# Microsoft Teams Widget Migration Plan

## Overview

This document outlines the comprehensive plan for porting the existing AJAI application components (Vector Search, Data Management, and KFC Management) into a Microsoft Teams widget app. The migration involves significant architectural changes to adapt to Teams' constraints and capabilities.

## Current Architecture Analysis

### Existing Components to Migrate
1. **VectorSearchPage** - AI-powered semantic search for jobs and resumes
2. **DataManagementPage** - File import, data management, and database operations
3. **KfcManagementPage** - Employee nominations and points management
4. **Subcomponents**: KfcPointsManager, KfcNomination, DatabaseManager

### Current Dependencies
- **Frontend**: React 19, Vite, Tailwind CSS, Lucide React
- **Backend**: Convex (real-time database), MongoDB Atlas
- **Authentication**: Clerk
- **AI Services**: OpenAI, Anthropic, Google Gemini
- **File Processing**: Mammoth, PDF-parse, XLSX
- **Storage**: IndexedDB (client-side caching)

## Teams Widget Architecture Requirements

### Teams-Specific Constraints
1. **No Browser Router**: Teams widgets don't support React Router
2. **Limited Storage**: No IndexedDB access, limited localStorage
3. **Authentication**: Must use Microsoft Graph API and Teams SSO
4. **UI Framework**: Must use Fluent UI or Teams-specific components
5. **API Limitations**: CORS restrictions, different network policies
6. **Size Limits**: Widget apps have strict bundle size limitations

### Teams Widget Capabilities
1. **Microsoft Graph API**: Access to Teams data, user profiles, files
2. **Teams SSO**: Seamless authentication with Microsoft accounts
3. **Real-time Updates**: Teams provides real-time data sync
4. **File Integration**: Direct access to SharePoint and OneDrive
5. **Notifications**: Teams notification system

## Migration Strategy

### Phase 1: Foundation Setup 

#### 1.1 Teams Development Environment
```bash
# Install Teams Toolkit
npm install -g @microsoft/teamsfx-cli

# Create new Teams app project
teamsfx init --interactive false --app-name "AJAI Teams Widget" --capability tab

# Install required dependencies
npm install @microsoft/teamsfx-react @fluentui/react @microsoft/microsoft-graph-client
npm install @azure/msal-browser @azure/msal-react
```

#### 1.2 Authentication Migration
**Current**: Clerk authentication
**Target**: Microsoft Graph API + Teams SSO

```typescript
// New authentication service
interface TeamsAuthService {
  initialize(): Promise<void>;
  getCurrentUser(): Promise<TeamsUser>;
  getAccessToken(): Promise<string>;
  signOut(): Promise<void>;
}

// Teams user interface
interface TeamsUser {
  id: string;
  displayName: string;
  email: string;
  tenantId: string;
  teamsContext: any;
}
```

#### 1.3 UI Framework Migration
**Current**: Tailwind CSS + Lucide React
**Target**: Fluent UI + Teams Design System

```typescript
// Component migration mapping
// Current -> Teams Equivalent
// <div className="bg-white rounded-lg shadow"> -> <Card>
// <button className="bg-blue-600 text-white"> -> <PrimaryButton>
// <input className="border rounded"> -> <TextField>
// <Search size={16} /> -> <SearchIcon />
```

### Phase 2: Backend Architecture

#### 2.1 Database Migration Strategy
**Option A: Azure Cosmos DB Migration**
- Migrate Convex functions to Azure Functions
- Use Cosmos DB for MongoDB API compatibility
- Implement real-time updates via Azure SignalR


#### 2.2 API Layer Restructuring
```typescript
// New API service structure
interface TeamsApiService {
  // Vector Search
  searchJobs(query: string, filters: SearchFilters): Promise<JobResult[]>;
  searchResumes(query: string, filters: SearchFilters): Promise<ResumeResult[]>;
  
  // Data Management
  uploadFile(file: File, type: 'job' | 'resume'): Promise<UploadResult>;
  getDataSummary(): Promise<DataSummary>;
  
  // KFC Management
  getNominations(): Promise<Nomination[]>;
  createNomination(nomination: NominationData): Promise<Nomination>;
  approveNomination(id: string, approver: string): Promise<void>;
}
```

#### 2.3 File Storage Migration
**Current**: Direct file upload to Convex
**Target**: SharePoint/OneDrive integration

```typescript
// SharePoint file service
interface SharePointService {
  uploadToDocumentLibrary(file: File, library: string): Promise<string>;
  getFileContent(fileId: string): Promise<string>;
  listFiles(library: string): Promise<SharePointFile[]>;
}
```

### Phase 3: Component Migration 

#### 3.1 VectorSearchPage Migration
**Key Changes Required:**
- Remove React Router navigation
- Adapt to Teams tab navigation
- Replace localStorage with Teams storage
- Update UI to Fluent UI components

```typescript
// New VectorSearch component structure
interface TeamsVectorSearchProps {
  teamsContext: any;
  onNavigate: (route: string) => void;
}

const TeamsVectorSearch: React.FC<TeamsVectorSearchProps> = ({
  teamsContext,
  onNavigate
}) => {
  // Migrated search logic
  // Teams-specific UI components
  // SharePoint file integration
};
```

#### 3.2 DataManagementPage Migration
**Key Changes Required:**
- Replace file upload with SharePoint integration
- Use Teams file picker API
- Implement Teams-specific data storage
- Update admin permissions to Teams roles

```typescript
// Teams file management
interface TeamsFileManager {
  pickFile(acceptTypes: string[]): Promise<File>;
  uploadToTeams(file: File): Promise<string>;
  getTeamsFiles(): Promise<TeamsFile[]>;
}
```

#### 3.3 KfcManagementPage Migration
**Key Changes Required:**
- Replace Clerk admin system with Teams roles
- Use Teams channels for nominations
- Implement Teams notifications
- Store data in SharePoint Lists

```typescript
// Teams KFC management
interface TeamsKfcManager {
  getTeamMembers(): Promise<TeamsMember[]>;
  createNominationChannel(): Promise<string>;
  sendNominationNotification(nomination: Nomination): Promise<void>;
}
```

### Phase 4: AI Integration Adaptation 

#### 4.1 AI Service Migration
**Current**: Direct API calls to OpenAI/Anthropic/Gemini
**Target**: Azure Cognitive Services + Teams integration

```typescript
// Azure AI services integration
interface AzureAIService {
  generateEmbeddings(text: string): Promise<number[]>;
  searchSimilarDocuments(query: string, documents: Document[]): Promise<SearchResult[]>;
  processDocument(file: File): Promise<ProcessedDocument>;
}
```

#### 4.2 Vector Search Optimization
- Implement Azure Cognitive Search
- Use Azure Functions for embedding generation
- Optimize for Teams performance constraints

### Phase 5: Teams-Specific Features

#### 5.1 Teams Integration Features
```typescript
// Teams-specific functionality
interface TeamsIntegration {
  // Notifications
  sendAdaptiveCard(card: AdaptiveCard): Promise<void>;
  sendMessageToChannel(channelId: string, message: string): Promise<void>;
  
  // File Integration
  openFileInTeams(fileId: string): Promise<void>;
  shareFileWithTeam(fileId: string, teamId: string): Promise<void>;
  
  // User Management
  getTeamMembers(teamId: string): Promise<TeamsMember[]>;
  getUserProfile(userId: string): Promise<TeamsUserProfile>;
}
```

#### 5.2 Adaptive Cards Implementation
- Create adaptive cards for nominations
- Implement approval workflows
- Add rich notifications

## Technical Implementation Details

### 1. Project Structure
```
teams-widget/
├── src/
│   ├── components/
│   │   ├── VectorSearch/
│   │   ├── DataManagement/
│   │   └── KfcManagement/
│   ├── services/
│   │   ├── teamsAuth.ts
│   │   ├── teamsApi.ts
│   │   ├── sharePoint.ts
│   │   └── azureAI.ts
│   ├── hooks/
│   │   ├── useTeamsContext.ts
│   │   └── useTeamsAuth.ts
│   └── utils/
│       ├── teamsHelpers.ts
│       └── adaptiveCards.ts
├── teams-app/
│   ├── appPackage/
│   └── manifest.json
└── azure/
    ├── functions/
    └── resources/
```

### 2. Dependencies to Add
```json
{
  "dependencies": {
    "@microsoft/teamsfx-react": "^2.0.0",
    "@fluentui/react": "^8.0.0",
    "@microsoft/microsoft-graph-client": "^3.0.0",
    "@azure/msal-browser": "^2.0.0",
    "@azure/msal-react": "^1.0.0",
    "@microsoft/adaptivecards": "^2.0.0",
    "@azure/cognitiveservices-textanalytics": "^5.0.0",
    "@azure/search-documents": "^11.0.0"
  }
}
```

### 3. Configuration Files
```typescript
// teamsfx.config.json
{
  "version": "1.0.0",
  "environmentFolderPath": "./env",
  "configurations": {
    "local": {
      "auth": {
        "clientId": "your-client-id",
        "clientSecret": "your-client-secret"
      },
      "api": {
        "microsoftGraph": {
          "endpoint": "https://graph.microsoft.com/v1.0"
        }
      }
    }
  }
}
```

## Migration Challenges and Solutions

### 1. Authentication Complexity
**Challenge**: Migrating from Clerk to Teams SSO
**Solution**: 
- Implement MSAL.js for authentication
- Use Teams context for user information
- Create migration script for existing users

### 2. Data Storage Limitations
**Challenge**: Teams widgets can't use IndexedDB
**Solution**:
- Use Teams storage APIs
- Implement SharePoint Lists for structured data
- Use Azure Blob Storage for file storage

### 3. Real-time Updates
**Challenge**: Replacing Convex real-time subscriptions
**Solution**:
- Use Azure SignalR Service
- Implement polling for Teams-specific updates
- Use Teams notification system

### 4. File Processing
**Challenge**: Teams file access restrictions
**Solution**:
- Use SharePoint REST API
- Implement Azure Functions for processing
- Use Teams file picker API

### 5. UI/UX Adaptation
**Challenge**: Converting Tailwind to Fluent UI
**Solution**:
- Create component mapping library
- Implement Teams design system
- Use Teams theming system

## Testing Strategy

### 1. Unit Testing
```typescript
// Test Teams-specific components
describe('TeamsVectorSearch', () => {
  it('should handle Teams context correctly', () => {
    // Test Teams integration
  });
  
  it('should use Fluent UI components', () => {
    // Test UI components
  });
});
```

### 2. Integration Testing
- Test SharePoint integration
- Test Microsoft Graph API calls
- Test Teams authentication flow

### 3. Teams-Specific Testing
- Test in Teams desktop client
- Test in Teams web client
- Test mobile Teams app

## Deployment Strategy

### 1. Development Environment
```bash
# Local development
npm run dev:teams

# Teams app testing
teamsfx provision --env local
teamsfx deploy --env local
```

### 2. Production Deployment
```bash
# Azure deployment
teamsfx provision --env prod
teamsfx deploy --env prod

# Teams app publishing
teamsfx publish --env prod
```

### 3. App Store Submission
- Prepare app manifest
- Create app package
- Submit to Teams app store
- Configure admin approval

##  Milestones

## For everymilestone this must occur:
###  Testing & Deployment
- [ ] Comprehensive testing
- [ ] Performance optimization

### Milestone 1 : Foundation
- [X] Set up Teams development environment
- [X] Implement Teams authentication
- [X] Create basic project structure

###  Milestone 2: Backend Migration
- [X] Set up Azure resources
- [X] Migrate database schema
- [X] Implement API services

###  Milestone 3: Component Migration
- [X] Migrate VectorSearchPage
- [X] Migrate DataManagementPage
- [X] Migrate KfcManagementPage

### Milestone 4: AI Integration
- [X] Set up Azure Cognitive Services
- [X] Migrate vector search functionality
- [X] Optimize AI performance

###  Milestone 5: Teams Features
- [ ] Implement Teams-specific features
- [ ] Add adaptive cards
- [ ] Test Teams integration



## Resource Requirements

### Development Team
- **Frontend Developer** (React/Teams): 1 person, 14 weeks
- **Backend Developer** (Azure/API): 1 person, 10 weeks
- **DevOps Engineer** (Azure/Teams): 1 person, 6 weeks
- **UI/UX Designer** (Fluent UI): 1 person, 8 weeks

### Infrastructure Costs
- **Azure Functions**: ~$50/month
- **Azure Cosmos DB**: ~$100/month
- **Azure Cognitive Services**: ~$200/month
- **Azure SignalR**: ~$30/month

### Tools and Licenses
- **Microsoft 365 Developer Account**: Free
- **Azure Subscription**: Pay-as-you-go
- **Teams Toolkit**: Free
- **Visual Studio Code**: Free

## Risk Assessment

### High Risk
1. **Teams API Limitations**: May restrict functionality
2. **Authentication Migration**: Complex user data migration
3. **Performance Issues**: Teams widget performance constraints

### Medium Risk
1. **UI/UX Adaptation**: User experience changes
2. **File Processing**: SharePoint integration complexity
3. **Real-time Updates**: Replacing Convex functionality

### Low Risk
1. **Data Migration**: Straightforward schema migration
2. **Testing**: Standard testing procedures
3. **Deployment**: Well-documented Teams deployment process

## Success Criteria

### Functional Requirements
- [ ] All three main components work in Teams
- [ ] Authentication flows correctly
- [ ] File upload/download works
- [ ] Real-time updates function
- [ ] AI search capabilities maintained

### Performance Requirements
- [ ] App loads within 3 seconds
- [ ] Search results return within 2 seconds
- [ ] File uploads complete within 30 seconds
- [ ] Memory usage stays under 100MB

### User Experience Requirements
- [ ] Teams-native UI/UX
- [ ] Seamless authentication
- [ ] Intuitive navigation
- [ ] Responsive design

## Conclusion

This migration plan provides a comprehensive roadmap for porting the AJAI application components to Microsoft Teams. The plan addresses the major architectural changes required while maintaining the core functionality and user experience. The phased approach allows for incremental development and testing, reducing risk and ensuring successful delivery.

The estimated timeline of 14 weeks provides sufficient time for development, testing, and deployment, with additional buffer for unexpected challenges. The resource requirements are realistic and the cost estimates are conservative.

Success will be measured by the ability to maintain all current functionality while providing a native Teams experience that enhances user productivity and collaboration.
