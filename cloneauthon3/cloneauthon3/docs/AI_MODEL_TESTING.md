# AI Model Testing Guide

This guide explains how to test all available AI models in the chat application.

## Overview

The AI model testing suite includes comprehensive tests for all supported models across different providers:

- **OpenAI**: GPT-4, GPT-3.5, o3 models
- **Anthropic**: Claude 3 and Claude 2.1 models  
- **Google**: Gemini Pro and Gemini 1.5 models
- **Hugging Face**: Various open-source models

## Quick Start

### 1. Configure API Keys

Edit the API keys in `convex/aiModels.test.ts`:

```typescript
const API_KEYS = {
  OPENAI_API_KEY: "sk-your-openai-key-here",
  ANTHROPIC_API_KEY: "sk-ant-your-anthropic-key-here", 
  GOOGLE_AI_API_KEY: "your-google-ai-key-here",
  HF_API_KEY: "hf-your-huggingface-key-here"
};
```

### 2. Run Tests

**Option A: Using the test runner script**
```bash
node scripts/test-ai-models.js
```

**Option B: Using npm directly**
```bash
npm test convex/aiModels.test.ts
```

**Option C: Run specific provider tests**
```bash
# Test only OpenAI models
npm test convex/aiModels.test.ts -- --grep "OpenAI Models"

# Test only Anthropic models  
npm test convex/aiModels.test.ts -- --grep "Anthropic Models"
```

## Test Structure

### Individual Model Tests

Each model has its own test that:
- Validates API key availability
- Sends a test message
- Validates the response format
- Logs the response for manual verification

### Batch Testing

The batch test runs all models sequentially and provides:
- Success/failure status for each model
- Response summaries
- Overall statistics

### Utility Tests

- API key validation
- Model count verification
- Configuration checks

## Available Models

### OpenAI Models (6 models)
- GPT-4 Turbo (Latest) - `gpt-4-turbo-preview`
- GPT-4 - `gpt-4`
- GPT-3.5 Turbo - `gpt-3.5-turbo`
- GPT-3.5 Turbo 16K - `gpt-3.5-turbo-16k`
- o3-mini - `o3-mini` (uses `max_completion_tokens`)
- o3-mini-preview - `o3-mini-preview` (uses `max_completion_tokens`)

### Anthropic Models (4 models)
- Claude 3 Opus - `claude-3-opus-20240229`
- Claude 3 Sonnet - `claude-3-sonnet-20240229`
- Claude 3 Haiku - `claude-3-haiku-20240307`
- Claude 2.1 - `claude-2.1`

### Google Models (4 models)
- Gemini Pro - `gemini-pro`
- Gemini Pro Vision - `gemini-pro-vision`
- Gemini 1.5 Pro - `gemini-1.5-pro`
- Gemini 1.5 Pro Vision - `gemini-1.5-pro-vision`

### Hugging Face Models (4 models)
- Mistral 7B Instruct - `mistralai/Mistral-7B-Instruct-v0.2`
- Llama 2 70B Chat - `meta-llama/Llama-2-70b-chat-hf`
- FLAN-T5 XXL - `google/flan-t5-xxl`
- BLOOM - `bigscience/bloom`

## Test Message

All models receive the same test message:
```
"Hello! Please respond with a simple greeting and tell me which model you are."
```

## Expected Behaviors

### Response Validation
- All responses should be non-empty strings
- Responses should contain model identification
- o3 models should mention "o3" in their response
- Claude models should mention "Claude" in their response
- Gemini models should mention "Gemini" in their response

### Error Handling
The tests handle various error scenarios gracefully:
- **API Key Issues**: Logs warning, doesn't fail test
- **Quota Exceeded**: Logs warning, doesn't fail test  
- **Rate Limiting**: Logs warning, doesn't fail test
- **Model Access**: Logs error details for debugging

## Configuration

### Timeouts
- Individual model tests: 30 seconds
- Batch test: 5 minutes
- Rate limiting delay: 1 second between requests

### Test Environment
- Uses Vitest testing framework
- Integrates with existing Convex setup
- Supports both individual and batch execution

## Troubleshooting

### Common Issues

**"No API key provided"**
- Edit the API keys in `convex/aiModels.test.ts`
- Ensure keys are valid and have proper permissions

**"API key issue"**
- Verify API key format and validity
- Check account status and billing
- Ensure proper permissions for requested models

**"Quota exceeded"**
- Check your API usage limits
- Some models may require specific subscriptions
- Consider upgrading your plan

**"Rate limited"**
- Tests include delays to avoid rate limiting
- If still occurring, increase delays in test configuration

**"Model not found"**
- Verify model IDs are correct
- Some models may require special access
- Check provider documentation for current model availability

### Debug Mode

To run tests with more verbose output:
```bash
npm test convex/aiModels.test.ts -- --reporter=verbose
```

## Adding New Models

To add new models to the test suite:

1. Add the model to the appropriate provider array in `convex/aiModels.test.ts`
2. Update the model definitions in `convex/aiModels.ts`
3. Run tests to verify integration

Example:
```typescript
const OPENAI_MODELS = [
  // ... existing models
  {
    name: "New Model",
    modelId: "new-model-id",
    apiKey: API_KEYS.OPENAI_API_KEY,
    provider: "openai"
  }
];
```

## Security Notes

- API keys are stored in the test file for convenience
- Never commit real API keys to version control
- Consider using environment variables for production testing
- The test file is excluded from production builds

## Performance Considerations

- Tests run sequentially to avoid overwhelming APIs
- Rate limiting delays prevent API throttling
- Batch tests may take several minutes to complete
- Consider running individual provider tests for faster feedback

## Integration with CI/CD

The test suite can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Test AI Models
  run: |
    npm test convex/aiModels.test.ts
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
    GOOGLE_AI_API_KEY: ${{ secrets.GOOGLE_AI_API_KEY }}
    HF_API_KEY: ${{ secrets.HF_API_KEY }}
```

## Support

For issues with the test suite:
1. Check the troubleshooting section above
2. Review the test output for specific error messages
3. Verify API key permissions and quotas
4. Check provider documentation for model availability 