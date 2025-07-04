# AJAI Teams Widget

AI-powered job and resume matching for Microsoft Teams

## Overview

The AJAI Teams Widget is a Microsoft Teams application that provides intelligent job and resume matching using AI vector search, data management capabilities, and KFC nomination management. This project migrates the existing AJAI application components to work seamlessly within Microsoft Teams.

## Features

### 🔍 Vector Search
- AI-powered semantic search for jobs and resumes
- Cross-matched vector search for better results
- Configurable similarity thresholds
- Real-time search results with Teams integration

### 📊 Data Management
- File upload and processing (Excel, JSON, DOCX, PDF)
- SharePoint integration for file storage
- Data import/export capabilities
- Database management and cleanup

### 🏆 KFC Management
- Employee nomination system
- Points tracking and management
- Team member management
- Approval workflows with Teams notifications

## Architecture

### Frontend (React + Fluent UI)
- **Framework**: React 18 with TypeScript
- **UI Library**: Fluent UI React Components
- **State Management**: React Hooks
- **Authentication**: MSAL.js for Microsoft Graph integration
- **Teams Integration**: Microsoft Teams SDK

### Backend (Azure Services)
- **Functions**: Azure Functions for API endpoints
- **Database**: Azure Cosmos DB with MongoDB API
- **Search**: Azure Cognitive Search
- **AI Services**: Azure Cognitive Services
- **Storage**: Azure Blob Storage
- **Real-time**: Azure SignalR Service

### Key Components
```
src/
├── components/          # React components
│   ├── TeamsVectorSearch.tsx
│   ├── TeamsDataManagement.tsx
│   ├── TeamsKfcManagement.tsx
│   ├── LoadingSpinner.tsx
│   └── ErrorBoundary.tsx
├── hooks/              # Custom React hooks
│   ├── useTeamsAuth.ts
│   └── useTeamsContext.ts
├── services/           # API and external services
│   ├── teamsAuth.ts
│   ├── teamsApi.ts
│   ├── sharePoint.ts
│   └── azureAI.ts
├── types/              # TypeScript type definitions
│   ├── index.ts
│   └── teams-sdk.d.ts
└── utils/              # Utility functions
    ├── teamsHelpers.ts
    └── adaptiveCards.ts
```

## Prerequisites

- Node.js 18+ 
- Microsoft 365 Developer Account
- Azure Subscription
- Teams Toolkit CLI

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```env
# Microsoft Graph API
REACT_APP_CLIENT_ID=your-client-id
REACT_APP_TENANT_ID=your-tenant-id

# Azure Services
REACT_APP_FUNCTION_ENDPOINT=https://your-function-app.azurewebsites.net
REACT_APP_COSMOS_ENDPOINT=https://your-cosmos-account.documents.azure.com
REACT_APP_SEARCH_ENDPOINT=https://your-search-service.search.windows.net
REACT_APP_STORAGE_CONNECTION_STRING=your-storage-connection-string

# AI Services
REACT_APP_OPENAI_API_KEY=your-openai-key
REACT_APP_AZURE_AI_ENDPOINT=https://your-ai-service.cognitiveservices.azure.com
REACT_APP_AZURE_AI_KEY=your-ai-key
```

### 3. Teams Toolkit Setup

```bash
# Install Teams Toolkit CLI
npm install -g @microsoft/teamsfx-cli

# Initialize Teams project
teamsfx init --interactive false --app-name "AJAI Teams Widget" --capability tab

# Provision Azure resources
teamsfx provision --env local

# Deploy to Azure
teamsfx deploy --env local
```

### 4. Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Test the application
npm test
```

## Development Workflow

### Milestone 1: Foundation ✅
- [x] Set up Teams development environment
- [x] Implement Teams authentication
- [x] Create basic project structure
- [x] Configure Fluent UI theming
- [x] Set up TypeScript types

### Milestone 2: Backend Migration 🔄
- [ ] Set up Azure resources
- [ ] Migrate database schema
- [ ] Implement API services
- [ ] Configure Azure Functions
- [ ] Set up Cosmos DB collections

### Milestone 3: Component Migration 📋
- [ ] Migrate VectorSearchPage
- [ ] Migrate DataManagementPage
- [ ] Migrate KfcManagementPage
- [ ] Implement Teams-specific features
- [ ] Add adaptive cards

### Milestone 4: AI Integration 🤖
- [ ] Set up Azure Cognitive Services
- [ ] Migrate vector search functionality
- [ ] Optimize AI performance
- [ ] Implement document processing

### Milestone 5: Teams Features 🚀
- [ ] Implement Teams-specific features
- [ ] Add adaptive cards
- [ ] Test Teams integration
- [ ] Performance optimization

## API Reference

### Authentication
```typescript
// Teams authentication hook
const { user, isAuthenticated, login, logout } = useTeamsAuth();

// Teams context hook
const { context, isLoading } = useTeamsContext();
```

### Vector Search
```typescript
// Search jobs
const jobs = await teamsApi.searchJobs(query, filters);

// Search resumes
const resumes = await teamsApi.searchResumes(query, filters);

// Search both
const results = await teamsApi.searchBoth(query, filters);
```

### Data Management
```typescript
// Upload file
const result = await teamsApi.uploadFile(file, 'job');

// Get data summary
const summary = await teamsApi.getDataSummary();

// Export data
const blob = await teamsApi.exportData('json');
```

### KFC Management
```typescript
// Get nominations
const nominations = await teamsApi.getNominations();

// Create nomination
const nomination = await teamsApi.createNomination(nominationData);

// Approve nomination
await teamsApi.approveNomination(id, approver);
```

## Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:integration
```

### Teams-Specific Testing
- Test in Teams desktop client
- Test in Teams web client
- Test mobile Teams app

## Deployment

### Development Environment
```bash
teamsfx provision --env dev
teamsfx deploy --env dev
```

### Production Environment
```bash
teamsfx provision --env prod
teamsfx deploy --env prod
teamsfx publish --env prod
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

### Code Style
- Use TypeScript for all new code
- Follow Fluent UI design patterns
- Use React hooks for state management
- Write comprehensive tests

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Verify client ID and tenant ID in environment variables
   - Check Azure AD app registration permissions

2. **Teams Context Not Available**
   - Ensure app is running within Teams
   - Check Teams SDK initialization

3. **API Connection Issues**
   - Verify Azure Function endpoints
   - Check CORS configuration
   - Validate API keys and connection strings

### Debug Mode
```bash
# Enable debug logging
DEBUG=teams:* npm run dev
```

## Security

- All API calls use Microsoft Graph authentication
- Sensitive data is stored in Azure Key Vault
- HTTPS is enforced for all communications
- Input validation and sanitization implemented

## Performance

- Lazy loading for large datasets
- Caching with Azure Redis Cache
- Optimized bundle size for Teams constraints
- Efficient vector search algorithms

## Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the Teams documentation

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Microsoft Teams Platform
- Fluent UI Design System
- Azure Cognitive Services
- OpenAI API 