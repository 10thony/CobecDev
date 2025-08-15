# Dynamic Skill Mapping System - Quick Setup Guide

## 🚀 **Quick Start**

### **1. Environment Setup**
Ensure you have the required environment variables:
```bash
# Required for AI-powered skill extraction
GOOGLE_AI_API_KEY=your_gemini_api_key_here

# Required for Convex
VITE_CONVEX_URL=your_convex_url_here
```

### **2. Install Dependencies**
```bash
npm install @google/generative-ai
```

### **3. Deploy to Convex**
```bash
npx convex dev
```

## 🔧 **System Components**

The system consists of three main files:

1. **`convex/dynamicSkillMapping.ts`** - Core skill mapping functionality
2. **`convex/enhancedEmbeddingService.ts`** - Enhanced embedding generation
3. **`convex/vectorSearch.ts`** - Updated vector search with skill enhancement

## 🧪 **Testing the System**

### **Run Full Test Suite**
```bash
node scripts/test-dynamic-skill-mapping.js
```

### **Test Specific Query**
```bash
node scripts/test-dynamic-skill-mapping.js --query "who can build apps for the iphone"
```

## 📊 **Key Functions to Use**

### **Skill Extraction**
```typescript
// Extract skills from text
const skills = await client.action("dynamicSkillMapping:extractSkillsWithAI", {
  text: "Your text here",
  context: "resume", // or "job_posting"
  useAI: true
});
```

### **Build Skill Taxonomy**
```typescript
// Build comprehensive skill taxonomy
const taxonomy = await client.action("dynamicSkillMapping:buildSkillTaxonomy", {});
```

### **Enhanced Search**
```typescript
// Search with skill enhancement
const results = await client.action("dynamicSkillMapping:semanticSearchWithDynamicSkills", {
  query: "your search query",
  collection: "both", // or "resumes" or "jobpostings"
  useSkillEnhancement: true
});
```

### **Cross-Collection Matching**
```typescript
// Find skill matches across collections
const matches = await client.query("dynamicSkillMapping:findSkillMatchesAcrossCollections", {
  skill: "javascript",
  limit: 10
});
```

## 🎯 **Expected Results**

For the query "who can build apps for the iphone":

- **Query Enhancement**: Automatically enhanced to include iOS, mobile development, app development
- **Skill Discovery**: Finds iOS-related skills from both resumes and job postings
- **Cross-Reference**: Maps related terms across different terminology
- **Improved Accuracy**: Better semantic matching through skill context

## 🔍 **Monitoring and Validation**

### **Check Skill Consistency**
```typescript
const consistency = await client.query("enhancedEmbeddingService:validateSkillConsistency", {});
console.log(`Consistency Score: ${consistency.overallScore}%`);
```

### **Update Skill Mappings**
```typescript
const updated = await client.action("dynamicSkillMapping:updateSkillMappings", {
  newSkills: ["new-skill-1", "new-skill-2"],
  source: "user_query",
  context: "Description of update"
});
```

## 🚨 **Troubleshooting**

### **AI Skill Extraction Fails**
- Check `GOOGLE_AI_API_KEY` environment variable
- System automatically falls back to basic extraction
- Check Convex logs for detailed error messages

### **Low Consistency Scores**
- Run skill consistency validation
- Check for skills that exist in only one collection
- Use skill mapping updates to improve consistency

### **Performance Issues**
- Use batch processing for large datasets
- Implement caching for frequently accessed taxonomies
- Monitor embedding generation times

## 📈 **Performance Tips**

1. **Batch Processing**: Use batch functions for large-scale operations
2. **Caching**: Cache skill taxonomy results when possible
3. **Incremental Updates**: Update skill mappings incrementally
4. **Fallback Mechanisms**: Always have fallback options for critical functions

## 🔄 **System Evolution**

The system automatically:
- Discovers new skills from new data
- Updates skill relationships
- Improves consistency over time
- Adapts to new technologies

No manual intervention required for basic skill discovery and mapping updates.
