# AJAI HR Vector Search System - Embedding Regeneration Agent

## Overview

The Embedding Regeneration Agent is a comprehensive tool designed to regenerate and enhance embeddings for all documents (resumes and job postings) in the AJAI HR Vector Search System. It ensures that all documents have up-to-date, skill-enhanced embeddings that enable accurate semantic search.

## 🎯 Mission

The agent's primary goal is to maintain high-quality embeddings across the entire document collection, ensuring:
- 100% document coverage with valid embeddings
- Skill consistency score > 80% across collections
- All embeddings are 2048-dimensional using the text-embedding-004 model
- Error rate < 5% during regeneration process

## 🏗️ System Architecture

### Core Components

1. **EnvironmentValidator** - Validates required environment variables
2. **ConvexClient** - Manages Convex backend communication
3. **DocumentAnalyzer** - Analyzes collection status and identifies documents needing updates
4. **SkillTaxonomyManager** - Builds and validates unified skill taxonomy
5. **EmbeddingGenerator** - Generates enhanced embeddings with skill context
6. **BatchProcessor** - Processes documents in configurable batches
7. **ValidationEngine** - Validates results and tests semantic search accuracy
8. **ReportGenerator** - Generates comprehensive regeneration reports

### Data Flow

```
Pre-Assessment → Skill Taxonomy Building → Batch Processing → Validation → Search Testing → Report Generation
```

## 📋 Required Tasks

### 1. Pre-Regeneration Assessment
- Check current embedding status across both collections
- Identify documents needing updates (missing, outdated, or low confidence)
- Validate environment setup (GOOGLE_AI_API_KEY, VITE_CONVEX_URL)
- Assess data quality and skill extraction status

### 2. Skill Taxonomy Preparation
- Build unified skill taxonomy from existing data
- Extract skills from resumes and job postings
- Identify skill relationships and cross-references
- Validate skill consistency across collections

### 3. Embedding Regeneration Process
- Generate enhanced embeddings with skill context for each document
- Update skill mappings with newly discovered skills
- Maintain data integrity during the update process
- Handle errors gracefully with fallback mechanisms

### 4. Post-Regeneration Validation
- Verify embedding quality (dimensions, similarity scores)
- Test semantic search accuracy with sample queries
- Validate skill consistency improvements
- Generate regeneration report with metrics and issues

## 🔧 Technical Requirements

### Environment Setup
Required environment variables:
```bash
GOOGLE_AI_API_KEY=your_gemini_api_key
VITE_CONVEX_URL=your_convex_url
```

### Convex Functions Used
- `dynamicSkillMapping:buildSkillTaxonomy` - Build skill taxonomy
- `enhancedEmbeddingService:generateEnhancedEmbedding` - Generate embeddings
- `enhancedEmbeddingService:updateDocumentEmbedding` - Update documents
- `enhancedEmbeddingService:validateEmbeddingsForRegeneration` - Validate results
- `dataManagement:getCollectionStats` - Get collection statistics
- `dataManagement:getDocumentsForUpdate` - Get documents needing updates

### Configuration
```javascript
const CONFIG = {
  BATCH_SIZE: 10,                    // Documents per batch
  MAX_RETRIES: 3,                    // Maximum retry attempts
  RETRY_DELAY: 2000,                 // Delay between retries (ms)
  LOG_LEVEL: 'INFO',                 // Logging level
  EMBEDDING_DIMENSIONS: 2048,        // Expected embedding dimensions
  MIN_CONFIDENCE_THRESHOLD: 0.7,     // Minimum confidence threshold
  SKILL_CONSISTENCY_THRESHOLD: 0.8   // Minimum skill consistency
};
```

## 🚀 Usage

### Basic Usage
```bash
# Run full regeneration
npm run embeddings:regenerate

# Run with dry-run mode (development)
npm run embeddings:regenerate:dry-run

# Validate existing embeddings only
npm run embeddings:validate
```

### Direct Script Execution
```bash
# Full regeneration
node scripts/embedding-regeneration-agent.js

# Development mode
NODE_ENV=development node scripts/embedding-regeneration-agent.js

# With custom configuration
BATCH_SIZE=20 LOG_LEVEL=DEBUG node scripts/embedding-regeneration-agent.js
```

### Programmatic Usage
```javascript
const { EmbeddingRegenerationAgent } = require('./scripts/embedding-regeneration-agent');

const agent = new EmbeddingRegenerationAgent();
await agent.initialize();

// Run full regeneration
const report = await agent.run();

// Or run individual phases
const assessment = await agent.runPreRegenerationAssessment();
const skillTaxonomy = await agent.buildSkillTaxonomy();
const results = await agent.regenerateEmbeddings('resumes', assessment);
```

## 📊 Success Criteria

### Quantitative Metrics
- **100% document coverage** - All documents have valid embeddings
- **Skill consistency score > 80%** across collections
- **Embedding dimensions** - All embeddings are 2048-dimensional
- **Error rate < 5%** during regeneration process

### Qualitative Metrics
- **Semantic search accuracy** - Queries return relevant results
- **Skill mapping quality** - Related skills are properly identified
- **Cross-collection alignment** - Skills use consistent terminology
- **System reliability** - Fallback mechanisms work when AI fails

## ⚠️ Error Handling & Fallbacks

### AI Service Failures
- Fallback to basic skill extraction when Gemini AI is unavailable
- Use existing embeddings if regeneration fails for specific documents
- Log all errors with context for debugging
- Continue processing other documents when possible

### Data Quality Issues
- Skip documents with missing or invalid searchable text
- Use default skills when skill extraction fails
- Maintain existing embeddings for problematic documents
- Flag issues for manual review

### Rate Limiting
- Configurable delays between API calls
- Batch processing to minimize API usage
- Exponential backoff for failed requests
- Graceful degradation under high load

## 📈 Performance & Scalability

### Batch Processing
- Configurable batch sizes (default: 10 documents)
- Progress tracking with ETA calculations
- Memory-efficient processing
- Parallel processing where possible

### Cost Management
- Monitor API usage (Gemini AI calls, Convex operations)
- Optimize batch sizes to balance speed and cost
- Use caching for repeated operations
- Implement rate limiting if needed

### Monitoring
- Real-time progress updates
- Detailed logging to files
- Performance metrics collection
- Error rate tracking

## 🔍 Testing & Validation

### Pre-Regeneration Tests
```bash
# Test environment setup
npm run embeddings:validate

# Test individual components
node -e "
const { EnvironmentValidator } = require('./scripts/embedding-regeneration-agent');
EnvironmentValidator.validate();
"
```

### Post-Regeneration Tests
```bash
# Test semantic search
curl -X POST "https://your-convex-url/action/enhancedEmbeddingService:semanticSearch" \
  -H "Content-Type: application/json" \
  -d '{"query": "who can build apps for the iphone", "collectionName": "resumes"}'

# Validate embeddings
curl -X GET "https://your-convex-url/query/enhancedEmbeddingService:validateEmbeddings?collectionName=resumes"
```

## 📋 Required Outputs

### 1. Regeneration Report
- Summary statistics (total processed, updated, errors)
- Collection-specific metrics
- Skill taxonomy information
- Processing performance data
- Validation results
- Search test results
- Recommendations for improvement

### 2. Validation Results
- Sample search queries with results
- Skill consistency metrics before and after
- Performance benchmarks (embedding generation time)
- Quality assurance test results

### 3. Logs
- Detailed operation logs
- Error logs with context
- Performance metrics
- API usage statistics

## 🚨 Critical Considerations

### Data Safety
- Never delete existing data without backup
- Validate embeddings before replacing old ones
- Maintain audit trail of all changes
- Test on subset before full regeneration

### Production Deployment
- Run in development mode first
- Monitor system resources during execution
- Have rollback plan ready
- Schedule during low-traffic periods

### Monitoring & Alerting
- Set up alerts for high error rates
- Monitor API quota usage
- Track processing performance
- Alert on validation failures

## 🔧 Troubleshooting

### Common Issues

#### Environment Variables Missing
```bash
Error: Missing required environment variables: GOOGLE_AI_API_KEY, VITE_CONVEX_URL
```
**Solution**: Set required environment variables in `.env` file or system environment.

#### Convex Connection Failed
```bash
Error: Failed to initialize Convex client
```
**Solution**: Verify `VITE_CONVEX_URL` is correct and Convex backend is running.

#### API Rate Limiting
```bash
Error: API quota exceeded
```
**Solution**: Reduce batch size, increase delays, or wait for quota reset.

#### Low Confidence Embeddings
```bash
Warning: Low confidence embedding generated: 0.6
```
**Solution**: Review document content quality and skill extraction logic.

### Debug Mode
Enable debug logging for detailed troubleshooting:
```bash
LOG_LEVEL=DEBUG node scripts/embedding-regeneration-agent.js
```

### Manual Recovery
If the agent fails mid-process:
1. Check logs for specific error
2. Fix underlying issue
3. Restart agent (it will skip already processed documents)
4. Monitor for recurring issues

## 📚 API Reference

### Main Agent Class
```javascript
class EmbeddingRegenerationAgent {
  async initialize(): Promise<void>
  async run(): Promise<Report>
  async runPreRegenerationAssessment(): Promise<Assessment>
  async buildSkillTaxonomy(): Promise<SkillTaxonomy>
  async regenerateEmbeddings(collection: string, assessment: Assessment): Promise<Results>
  async validateResults(): Promise<ValidationResults>
  async testSemanticSearch(): Promise<SearchTestResults>
}
```

### Configuration Options
```javascript
const CONFIG = {
  BATCH_SIZE: number,              // Documents per batch
  MAX_RETRIES: number,             // Maximum retry attempts
  RETRY_DELAY: number,             // Delay between retries
  LOG_LEVEL: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR',
  EMBEDDING_DIMENSIONS: number,    // Expected embedding dimensions
  MIN_CONFIDENCE_THRESHOLD: number, // Minimum confidence
  SKILL_CONSISTENCY_THRESHOLD: number // Minimum consistency
};
```

## 🤝 Contributing

### Development Setup
1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables
4. Run tests: `npm test`
5. Start development: `npm run dev`

### Adding New Features
1. Create feature branch
2. Implement functionality
3. Add tests
4. Update documentation
5. Submit pull request

### Testing
```bash
# Run all tests
npm test

# Run specific test file
npm test -- --run tests/embedding-regeneration.test.js

# Run with coverage
npm test -- --coverage
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
1. Check the troubleshooting section
2. Review logs and error messages
3. Check Convex backend status
4. Open an issue on GitHub
5. Contact the development team

## 🔄 Version History

- **v1.0.0** - Initial release with basic functionality
- **v1.1.0** - Added skill taxonomy building
- **v1.2.0** - Enhanced error handling and fallbacks
- **v1.3.0** - Added comprehensive validation and reporting

---

**Note**: This agent is designed for production use but should be thoroughly tested in development environments first. Always backup your data before running large-scale regeneration operations.
