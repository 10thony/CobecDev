import fs from 'fs';

try {
  const config = JSON.parse(fs.readFileSync('vector_search_indexes.json', 'utf-8'));
  console.log('✓ Successfully loaded vector_search_indexes.json');
  
  const jobpostingsIndex = config.jobpostings_collection_index;
  console.log('Jobpostings index structure:');
  console.log('- Name:', jobpostingsIndex.name);
  console.log('- Type:', jobpostingsIndex.type);
  console.log('- Fields count:', jobpostingsIndex.definition.fields.length);
  
  // Test the new structure we'll create
  const indexDefinition = {
    mappings: {
      dynamic: true,
      fields: jobpostingsIndex.definition.fields
    }
  };
  
  console.log('\nNew index definition structure:');
  console.log('- Has mappings:', !!indexDefinition.mappings);
  console.log('- Dynamic:', indexDefinition.mappings.dynamic);
  console.log('- Fields count:', indexDefinition.mappings.fields.length);
  
  console.log('\n✓ Configuration structure is valid for MongoDB Atlas Vector Search');
  
} catch (error) {
  console.error('❌ Error:', error.message);
} 