# AJAI - AI-Powered Job Matching & Chat Platform

A comprehensive web application that combines AI-powered chat capabilities with advanced vector search technology for intelligent job posting and resume matching. Built with modern web technologies for optimal performance and user experience.

## 🚀 Application Overview

AJAI is a dual-purpose platform that serves both as an intelligent chat assistant and a sophisticated job matching system. It leverages AI to provide contextual responses and uses semantic search to match job seekers with relevant opportunities.

## 🤖 AI Chat Bot

### Technology Stack
The chat functionality is built using a modern, full-stack architecture:

- **Frontend**: React 19 with TypeScript, Vite for fast development and building
- **Routing**: React Router DOM for seamless navigation between chat sessions
- **Backend**: Convex for real-time database and serverless functions
- **Authentication**: Clerk for secure user authentication and session management
- **Styling**: Tailwind CSS with custom theming support
- **AI Integration**: Support for multiple AI providers (Anthropic, OpenAI, Google)

### Key Features
- **Multi-Provider AI Support**: Switch between different AI models and providers
- **Real-time Chat**: Instant message delivery with live typing indicators
- **Code Highlighting**: Syntax-highlighted code blocks in responses
- **Vector Search Integration**: Chat can access job/resume data for contextual responses
- **Persistent Conversations**: Chat history is saved and can be resumed
- **Responsive Design**: Works seamlessly across desktop and mobile devices
- **Dark/Light Theme**: Customizable theme system with user preferences

### Chat Capabilities
- **General AI Assistance**: Ask questions, get help with coding, writing, analysis
- **Job-Related Queries**: Get information about specific job postings or requirements
- **Resume Analysis**: Receive feedback on resume content and suggestions
- **Career Guidance**: Get advice on career paths, skills development, and job search strategies

## 🔍 Vector Search Functionality

### Advanced Semantic Matching
The vector search system uses AI-powered embeddings to understand the semantic meaning of job postings and resumes, enabling intelligent matching beyond simple keyword searches.

### Core Components

#### 1. **Text Preprocessing**
- Cleans and normalizes text from job postings and resumes
- Extracts key skills, requirements, and qualifications
- Creates searchable text combinations for optimal matching
- Handles various document formats (Excel, JSON, Word documents)

#### 2. **Embedding Generation**
- Uses OpenAI's text-embedding-ada-002 model
- Generates 1536-dimensional vectors for semantic understanding
- Stores embeddings in MongoDB for fast retrieval
- Supports batch processing for large datasets

#### 3. **Vector Search Engine**
- **Cosine Similarity**: Calculates semantic similarity between documents
- **Job-to-Resume Matching**: Find candidates for specific positions
- **Resume-to-Job Matching**: Discover relevant opportunities for job seekers
- **AI Agent Search**: Natural language query processing for complex searches

#### 4. **Data Management System**
- **Import Capabilities**: 
  - Excel files (.xlsx, .xls) for bulk job posting data
  - JSON files for structured resume data
  - Word documents (.docx) for individual resumes
- **Data Processing**: Automatic parsing and metadata extraction
- **Search & Filter**: Advanced filtering by location, skills, experience level
- **Export Functionality**: Download processed data for external use

### Search Features
- **Semantic Search**: Find matches based on meaning, not just keywords
- **Skill-Based Filtering**: Filter results by specific skills or requirements
- **Location Matching**: Geographic-based job and candidate matching
- **Experience Level Matching**: Align job requirements with candidate experience
- **Real-time Results**: Instant search results with similarity scores

### Use Cases

#### For Job Seekers
- Find relevant job postings based on skills and experience
- Discover career opportunities they might miss through traditional search
- Get personalized job recommendations with similarity scores
- Understand job requirements and qualifications

#### For Recruiters
- Find qualified candidates for specific positions
- Identify candidates with transferable skills
- Reduce time-to-hire with better matching algorithms
- Access detailed candidate profiles and experience

## 🛠️ Setup & Installation

### Prerequisites
- Node.js 18+ 
- MongoDB database (local or Atlas)
- OpenAI API key for vector search functionality

### Environment Configuration
1. **Run the setup script** to configure API keys:
   ```bash
   node scripts/setup-env.js
   ```
   
   This creates a `.env` file with:
   - `OPENAI_API_KEY`: For server-side AI operations
   - `VITE_OPENAI_API_KEY`: For client-side vector search
   - `CLERK_PUBLISHABLE_KEY`: For authentication
   - `CONVEX_DEPLOY_KEY`: For backend deployment

### Development
```bash
# Install dependencies
npm install

# Start development servers
npm run dev
```

This starts both the frontend (Vite) and backend (Convex) servers simultaneously.

## 📊 Data Management

### Importing Data
1. **Job Postings**: Use the Data Management page to import Excel files containing job listings
2. **Resumes**: Import individual Word documents or bulk JSON files
3. **Processing**: The system automatically extracts skills, requirements, and generates embeddings

### Vector Search Setup
1. **Generate Embeddings**: Run the embedding generator to create semantic vectors
2. **Test Search**: Use the Vector Search page to test matching functionality
3. **AI Agent**: Launch the conversational AI interface for natural language queries

## 🔧 Technical Architecture

### Database Structure
```
workdemos/
├── jobpostings/     # Job posting collection
│   ├── jobTitle, location, salary, requirements
│   ├── searchableText (processed)
│   ├── extractedSkills
│   └── embedding (1536-dim vector)
└── resumes/         # Resume collection
    ├── personalInfo, experience, skills
    ├── searchableText (processed)
    ├── extractedSkills
    └── embedding (1536-dim vector)
```

### Performance Characteristics
- **Search Speed**: Sub-second response times for vector searches
- **Accuracy**: High semantic matching using AI embeddings
- **Scalability**: Handles thousands of documents efficiently
- **Cost**: Minimal ongoing costs (only for new document processing)

## 🚀 Deployment

### Production Deployment
- **Frontend**: Deploy to Vercel, Netlify, or similar platforms
- **Backend**: Convex handles serverless deployment automatically
- **Database**: MongoDB Atlas for production data storage
- **Vector Search**: Optional MongoDB Atlas Vector Search for enhanced performance

### Environment Variables
Ensure all required environment variables are set in your production environment:
- OpenAI API keys
- Clerk authentication keys
- Convex deployment keys
- MongoDB connection strings

## 📚 Documentation

- **AI Model Testing**: See `docs/AI_MODEL_TESTING.md` for detailed testing procedures
- **Theme System**: See `docs/THEME_SYSTEM.md` for customization options
- **Vector Search**: See `VECTOR_SEARCH_IMPLEMENTATION_GUIDE.md` for technical details

## 🤝 Contributing

This project uses modern development practices:
- TypeScript for type safety
- ESLint for code quality
- Vitest for testing
- Prettier for code formatting

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
