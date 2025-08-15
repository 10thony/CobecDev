# 🚀 Embedding Regeneration Agent - Quick Start Guide

## Prerequisites

1. **Environment Variables** - Set up required environment variables:
   ```bash
   # Required
   GOOGLE_AI_API_KEY=your_gemini_api_key
   VITE_CONVEX_URL=your_convex_url
   
   # Optional (for development)
   NODE_ENV=development
   LOG_LEVEL=DEBUG
   BATCH_SIZE=10
   ```

2. **Dependencies** - Ensure all dependencies are installed:
   ```bash
   npm install
   ```

3. **Convex Backend** - Make sure your Convex backend is running:
   ```bash
   npm run dev:backend
   ```

## 🧪 Testing the Agent

Before running the full regeneration, test all components:

```bash
# Run comprehensive tests
npm run embeddings:test

# Or run the test script directly
node scripts/test-embedding-regeneration-agent.js
```

**Expected Output**: All 7 tests should pass ✅

## 🚀 Running the Agent

### 1. Development Mode (Recommended for first run)
```bash
# Run with dry-run mode
npm run embeddings:regenerate:dry-run

# Or set environment manually
NODE_ENV=development node scripts/embedding-regeneration-agent.js
```

### 2. Production Mode
```bash
# Full regeneration
npm run embeddings:regenerate

# Or run directly
node scripts/embedding-regeneration-agent.js
```

**⚠️ Warning**: Production mode will update all document embeddings!

## 📊 Monitoring Progress

The agent provides real-time progress updates:
- Progress bars with ETA
- Batch processing status
- Error tracking
- Performance metrics

## 📋 What Happens During Regeneration

### Phase 1: Assessment
- Analyzes current embedding status
- Identifies documents needing updates
- Reports collection statistics

### Phase 2: Skill Taxonomy
- Builds unified skill taxonomy
- Extracts skills from documents
- Validates skill consistency

### Phase 3: Embedding Generation
- Processes documents in batches
- Generates enhanced embeddings
- Updates skill mappings
- Handles errors gracefully

### Phase 4: Validation
- Validates embedding quality
- Tests semantic search accuracy
- Generates comprehensive report

## 🔍 Expected Results

### Success Criteria
- ✅ 100% document coverage
- ✅ Skill consistency > 80%
- ✅ All embeddings are 2048-dimensional
- ✅ Error rate < 5%

### Sample Query Test
Query: "who can build apps for the iphone"
Expected: Returns iOS developers with high similarity scores

## 📁 Generated Files

### Reports
- Location: `reports/` directory
- Format: JSON with timestamp
- Content: Complete regeneration summary

### Logs
- Location: `logs/` directory
- Format: Daily log files
- Content: Detailed operation logs

## 🚨 Troubleshooting

### Common Issues

#### 1. Environment Variables Missing
```bash
Error: Missing required environment variables: GOOGLE_AI_API_KEY, VITE_CONVEX_URL
```
**Solution**: Check your `.env` file or system environment variables.

#### 2. Convex Connection Failed
```bash
Error: Failed to initialize Convex client
```
**Solution**: Verify `VITE_CONVEX_URL` and ensure Convex backend is running.

#### 3. API Rate Limiting
```bash
Error: API quota exceeded
```
**Solution**: Reduce batch size or wait for quota reset.

### Debug Mode
Enable detailed logging:
```bash
LOG_LEVEL=DEBUG node scripts/embedding-regeneration-agent.js
```

## 🔧 Configuration Options

### Environment Variables
```bash
# Performance tuning
BATCH_SIZE=20              # Documents per batch (default: 10)
RETRY_DELAY=3000           # Delay between retries (default: 2000)

# Logging
LOG_LEVEL=DEBUG            # DEBUG, INFO, WARN, ERROR

# Thresholds
MIN_CONFIDENCE_THRESHOLD=0.8    # Minimum confidence (default: 0.7)
SKILL_CONSISTENCY_THRESHOLD=0.9 # Minimum consistency (default: 0.8)
```

### Runtime Configuration
```javascript
// In the script
const CONFIG = {
  BATCH_SIZE: 10,
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000,
  LOG_LEVEL: 'INFO',
  EMBEDDING_DIMENSIONS: 2048,
  MIN_CONFIDENCE_THRESHOLD: 0.7,
  SKILL_CONSISTENCY_THRESHOLD: 0.8
};
```

## 📚 Next Steps

### 1. Monitor Results
- Check generated reports
- Review validation results
- Monitor error rates

### 2. Optimize Performance
- Adjust batch sizes
- Tune API rate limits
- Monitor resource usage

### 3. Schedule Regular Runs
- Set up cron jobs
- Monitor embedding freshness
- Plan maintenance windows

## 🆘 Getting Help

### 1. Check Logs
- Review error logs
- Check operation logs
- Look for patterns

### 2. Run Tests
```bash
npm run embeddings:test
```

### 3. Review Documentation
- [Full README](EMBEDDING_REGENERATION_AGENT_README.md)
- [API Reference](EMBEDDING_REGENERATION_AGENT_README.md#api-reference)
- [Troubleshooting Guide](EMBEDDING_REGENERATION_AGENT_README.md#troubleshooting)

### 4. Contact Support
- Open GitHub issue
- Check Convex status
- Contact development team

---

**🎯 Quick Command Reference**
```bash
# Test everything
npm run embeddings:test

# Development run
npm run embeddings:regenerate:dry-run

# Production run
npm run embeddings:regenerate

# Validate only
npm run embeddings:validate
```

**⚠️ Remember**: Always test in development mode first!
