AJAI - System Architecture & Tech Stack Overview
🏗️ High-Level Architecture
AJAI is a full-stack AI-powered job matching and chat platform built with a modern, scalable architecture that combines real-time chat capabilities with advanced vector search technology. The application follows a client-server architecture with a serverless backend approach.
Architecture Pattern
Frontend: Single Page Application (SPA) with React
Backend: Serverless functions with Convex
Database: Real-time database with Convex + MongoDB integration
Authentication: Third-party auth provider (Clerk)
AI Services: Multi-provider AI integration (OpenAI, Anthropic, Google)
🛠️ Tech Stack
Frontend Technologies
React 19 with TypeScript for type-safe UI development
Vite for fast development server and optimized builds
React Router DOM for client-side routing
Tailwind CSS with custom theming system
Lucide React for consistent iconography
Sonner for toast notifications
Backend & Database
Convex as the primary backend platform
Real-time database with automatic sync
Serverless functions for business logic
Built-in authentication integration
MongoDB for legacy data and vector search
Job postings and resume storage
Vector embeddings for semantic search
IndexedDB for client-side caching
Authentication & Security
Clerk for user authentication and session management
Role-based access control (Admin/User roles)
Secure API key management for AI services
AI & Machine Learning
Multi-Provider AI Support:
OpenAI (GPT models)
Anthropic (Claude models)
Google (Gemini models)
Vector Search Engine:
OpenAI embeddings (text-embedding-ada-002)
Google Gemini embeddings
Cosine similarity algorithms
Semantic search capabilities
Development Tools
TypeScript for type safety
ESLint for code quality
Vitest for testing
PostCSS with Tailwind
Prettier for code formatting
🚀 Core Features & Implemented Functionality
1. AI Chat System
Multi-model chat with real-time streaming
Conversation management with persistent chat history
Code syntax highlighting for technical responses
Model switching between different AI providers
Context-aware responses with vector search integration
2. Vector Search Engine
Semantic job matching using AI embeddings
Resume-to-job matching with similarity scoring
Advanced filtering by skills, location, experience
Batch processing for large datasets
Real-time search results with instant feedback
3. Data Management System
Multi-format import (Excel, JSON, Word documents)
Automated data processing and metadata extraction
Data validation and error handling
Export functionality for processed data
Bulk operations for large datasets
4. KFC Nomination System
Employee recognition platform with point-based rewards
Real-time nominations with approval workflow
Points tracking and leaderboards
Admin approval system for nominations
Performance analytics and reporting
5. User Management & Access Control
Role-based permissions (Admin/User)
User profile management with Clerk integration
Admin dashboard for system configuration
Audit logging for user actions
Secure API access control
6. Theme & UI System
Dark/Light mode with persistent preferences
Custom color schemes and branding
Responsive design for all device sizes
Accessibility features and keyboard navigation
Modern UI components with Tailwind
7. Real-time Features
Live chat updates with typing indicators
Real-time nomination approvals
Instant search results with live filtering
Live data synchronization across clients
Real-time notifications and alerts
🔄 Data Flow Architecture
Frontend → Backend
User interactions trigger React state updates
API calls are made to Convex functions
Real-time subscriptions maintain live data sync
Authentication is handled via Clerk integration
Backend Processing
Convex functions process business logic
AI service calls are made to external providers
Vector search queries MongoDB for semantic matches
Real-time updates are pushed to connected clients
Data Storage
Primary data stored in Convex real-time database
Vector embeddings stored in MongoDB for search
User sessions managed by Clerk
Client cache using IndexedDB for performance
🎯 Key Strengths
Scalable architecture with serverless backend
Real-time capabilities across all features
Multi-AI provider support for flexibility
Advanced vector search for intelligent matching
Modern development stack with TypeScript
Comprehensive testing and quality assurance
Professional UI/UX with accessibility focus
🔧 Development & Deployment
Hot reload development with Vite
Type-safe development with TypeScript
Automated testing with Vitest
ESLint integration for code quality
Vercel deployment ready
Environment-based configuration
Comprehensive documentation and guides