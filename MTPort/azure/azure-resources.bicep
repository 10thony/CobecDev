@description('The name of the resource group')
param resourceGroupName string

@description('The location for the resources')
param location string = resourceGroup().location

@description('The name of the Teams app')
param appName string

@description('The environment (dev, staging, prod)')
param environment string = 'dev'

@description('The tenant ID for the application')
param tenantId string

@description('The client ID for the application')
param clientId string

// Variables
var appServicePlanName = '${appName}-plan-${environment}'
var webAppName = '${appName}-web-${environment}'
var functionAppName = '${appName}-func-${environment}'
var storageAccountName = '${appName}storage${environment}'
var cosmosDbAccountName = '${appName}-cosmos-${environment}'
var cognitiveServicesName = '${appName}-cog-${environment}'
var searchServiceName = '${appName}-search-${environment}'
var signalRServiceName = '${appName}-signalr-${environment}'
var keyVaultName = '${appName}-kv-${environment}'

// App Service Plan
resource appServicePlan 'Microsoft.Web/serverfarms@2022-03-01' = {
  name: appServicePlanName
  location: location
  sku: {
    name: 'B1'
    tier: 'Basic'
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

// Storage Account
resource storageAccount 'Microsoft.Storage/storageAccounts@2022-09-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
  }
}

// Cosmos DB Account
resource cosmosDbAccount 'Microsoft.DocumentDB/databaseAccounts@2022-11-15' = {
  name: cosmosDbAccountName
  location: location
  properties: {
    databaseAccountOfferType: 'Standard'
    locations: [
      {
        locationName: location
        failoverPriority: 0
      }
    ]
    capabilities: [
      {
        name: 'EnableMongo'
      }
    ]
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
  }
}

// Cosmos DB Database
resource cosmosDbDatabase 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2022-11-15' = {
  parent: cosmosDbAccount
  name: 'ajai-database'
  properties: {
    resource: {
      id: 'ajai-database'
    }
  }
}

// Cosmos DB Collections
resource jobPostingsCollection 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2022-11-15' = {
  parent: cosmosDbDatabase
  name: 'jobPostings'
  properties: {
    resource: {
      id: 'jobPostings'
      partitionKey: {
        paths: ['/jobTitle']
        kind: 'Hash'
      }
    }
  }
}

resource resumesCollection 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2022-11-15' = {
  parent: cosmosDbDatabase
  name: 'resumes'
  properties: {
    resource: {
      id: 'resumes'
      partitionKey: {
        paths: ['/personalInfo/email']
        kind: 'Hash'
      }
    }
  }
}

resource nominationsCollection 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2022-11-15' = {
  parent: cosmosDbDatabase
  name: 'nominations'
  properties: {
    resource: {
      id: 'nominations'
      partitionKey: {
        paths: ['/nomineeId']
        kind: 'Hash'
      }
    }
  }
}

// Cognitive Services
resource cognitiveServices 'Microsoft.CognitiveServices/accounts@2022-12-01' = {
  name: cognitiveServicesName
  location: location
  sku: {
    name: 'S0'
  }
  kind: 'TextAnalytics'
  properties: {
    customSubDomainName: cognitiveServicesName
    networkAcls: {
      defaultAction: 'Allow'
    }
  }
}

// Azure Cognitive Search
resource searchService 'Microsoft.Search/searchServices@2022-09-01' = {
  name: searchServiceName
  location: location
  sku: {
    name: 'Standard'
  }
  properties: {
    replicaCount: 1
    partitionCount: 1
    hostingMode: 'default'
  }
}

// SignalR Service
resource signalRService 'Microsoft.SignalRService/signalR@2022-08-01' = {
  name: signalRServiceName
  location: location
  sku: {
    name: 'Free_F1'
    tier: 'Free'
  }
  properties: {
    features: [
      {
        flag: 'ServiceMode'
        value: 'Default'
      }
    ]
    cors: {
      allowedOrigins: ['*']
    }
  }
}

// Key Vault
resource keyVault 'Microsoft.KeyVault/vaults@2022-07-01' = {
  name: keyVaultName
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: tenantId
    accessPolicies: []
    enabledForDeployment: true
    enabledForTemplateDeployment: true
    enabledForDiskEncryption: true
  }
}

// Function App
resource functionApp 'Microsoft.Web/sites@2022-03-01' = {
  name: functionAppName
  location: location
  kind: 'functionapp,linux'
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      linuxFxVersion: 'Node|18'
      appSettings: [
        {
          name: 'AzureWebJobsStorage'
          value: storageAccount.properties.primaryEndpoints.blob
        }
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4'
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'node'
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~18'
        }
        {
          name: 'COSMOS_DB_ENDPOINT'
          value: cosmosDbAccount.properties.documentEndpoint
        }
        {
          name: 'COSMOS_DB_KEY'
          value: listKeys(cosmosDbAccount.id, cosmosDbAccount.apiVersion).primaryMasterKey
        }
        {
          name: 'COGNITIVE_SERVICES_KEY'
          value: listKeys(cognitiveServices.id, cognitiveServices.apiVersion).key1
        }
        {
          name: 'COGNITIVE_SERVICES_ENDPOINT'
          value: cognitiveServices.properties.endpoint
        }
        {
          name: 'SEARCH_SERVICE_NAME'
          value: searchService.name
        }
        {
          name: 'SEARCH_SERVICE_KEY'
          value: listAdminKeys(searchService.id, searchService.apiVersion).primaryKey
        }
        {
          name: 'SIGNALR_CONNECTION_STRING'
          value: listKeys(signalRService.id, signalRService.apiVersion).primaryKey
        }
      ]
    }
  }
}

// Web App
resource webApp 'Microsoft.Web/sites@2022-03-01' = {
  name: webAppName
  location: location
  kind: 'app,linux'
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      linuxFxVersion: 'Node|18'
      appSettings: [
        {
          name: 'REACT_APP_CLIENT_ID'
          value: clientId
        }
        {
          name: 'REACT_APP_TENANT_ID'
          value: tenantId
        }
        {
          name: 'REACT_APP_API_BASE_URL'
          value: 'https://${functionAppName}.azurewebsites.net'
        }
      ]
    }
  }
}

// Outputs
output webAppUrl string = webApp.properties.defaultHostName
output functionAppUrl string = functionApp.properties.defaultHostName
output cosmosDbEndpoint string = cosmosDbAccount.properties.documentEndpoint
output searchServiceName string = searchService.name
output signalRConnectionString string = listKeys(signalRService.id, signalRService.apiVersion).primaryConnectionString 