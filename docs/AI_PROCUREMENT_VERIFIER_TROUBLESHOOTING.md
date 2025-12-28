# AI Procurement Verifier - Troubleshooting Guide

## Common Issues and Solutions

### Issue: Chrome Browser Not Found

**Error Message:**
```
Error during verification: Could not find Chrome (ver. 143.0.7499.169). 
This can occur if either 1. you did not perform an installation before running 
the script (e.g. `npx puppeteer browsers install chrome`) or 2. your cache path 
is incorrectly configured.
```

**Solution:**

The Puppeteer library requires Chrome to be installed. In a Convex Node.js action environment, you need to ensure Chrome is available.

#### Option 1: Install Chrome in Convex Environment (Recommended)

If you're running Convex locally or have access to the deployment environment:

```bash
# Install Chrome for Puppeteer
npx puppeteer browsers install chrome
```

#### Option 2: Use Alternative Browser Automation

If Chrome installation is not possible in your Convex environment, consider:

1. **Using Playwright instead of Puppeteer** - Playwright has better cross-platform support
2. **Using a headless browser service** - Services like Browserless.io or ScrapingBee
3. **Falling back to HTTP-only verification** - Skip browser automation and use simple HTTP requests (less accurate but works without Chrome)

#### Option 3: Temporary Workaround

Until Chrome is installed, the agent will mark links as "failed" rather than "denied", allowing them to be retried later.

### Issue: All Links Denied by AI Due to Errors

If all procurement links were incorrectly denied due to errors (like Chrome not being installed), you can reset them:

#### Using the Migration Script

```bash
npm run reset:ai-denied
```

This will:
- Find all links denied by the AI agent (`verifiedBy === "GPT-5-Mini-Agent"` and `status === "denied"`)
- Reset them back to `pending` status
- Clear AI review fields so they can be processed again
- Set `aiReviewStatus` to `idle` for retry

#### Using the Convex Dashboard

1. Go to your Convex dashboard
2. Navigate to Functions
3. Run `procurementUrls:resetAiDeniedLinks` with `{ confirm: true }`

#### Manual Reset via Code

```typescript
// In Convex dashboard or via API
await ctx.runMutation(api.procurementUrls.resetAiDeniedLinks, {
  confirm: true
});
```

### Issue: Agent Timeout

**Error:** Action timeout (Convex actions have a 2-minute limit)

**Solution:**
- The agent processes links in batches of 10 to stay within time limits
- If you have many links, they'll be processed over multiple cron runs
- Consider reducing batch size if individual links take too long

### Issue: Network Errors

**Error:** Timeout or network errors when loading pages

**Solution:**
- The agent uses `networkidle0` with a 30-second timeout
- If a page fails to load, it falls back to `networkidle2` (less strict)
- Very slow or unresponsive sites may still fail - these are marked as "denied" with appropriate reasoning

### Issue: GPT API Errors

**Error:** OpenAI API errors or rate limits

**Solution:**
- Check your `OPENAI_API_KEY` environment variable is set in Convex
- Verify you have sufficient API credits
- The agent uses `gpt-4o-mini` by default (cost-effective)
- Rate limits are handled automatically by the OpenAI SDK

## Monitoring AI Verification Status

### Check AI Review Status

In the Procurement Link Verifier UI:
- **AI Pending** (idle) - Not yet processed by AI
- **AI Processing** - Currently being verified
- **AI Reviewed** (completed) - Verification complete
- **AI Failed** - Error occurred during verification

### View AI Reasoning

Click the "AI Reasoning" expandable section in each link card to see:
- Why the AI approved or denied the link
- What was found on the page
- Any specific issues detected

## Best Practices

1. **Install Chrome First**: Before running the agent, ensure Chrome is installed
2. **Monitor First Run**: Watch the first batch of verifications to ensure everything works
3. **Review AI Decisions**: Always review AI decisions, especially denials
4. **Manual Override**: Use the "Reset" button to manually override AI decisions if needed
5. **Batch Processing**: The cron runs every 15 minutes - be patient for large batches

## Environment Variables

Required environment variables in Convex:

```env
OPENAI_API_KEY=your-openai-api-key-here
```

Set these in your Convex dashboard under Settings > Environment Variables.

## Support

If you continue to experience issues:

1. Check Convex logs for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure Puppeteer Chrome is installed
4. Review the AI reasoning in the UI to understand decisions
5. Use the reset migration script if links were incorrectly denied










