// Test script to verify MongoDB ObjectId conversion fix
import { MongoClient, ObjectId } from 'mongodb';

// Mock MongoDB document with ObjectId
const mockMongoDoc = {
  _id: new ObjectId("686219e2beee534a2a71fd8c"),
  jobTitle: "Software Engineer",
  location: "San Francisco, CA",
  embedding: [0.1, 0.2, 0.3],
  metadata: {
    nestedId: new ObjectId("686219d8beee534a2a71fceb"),
    array: [
      { id: new ObjectId("686219e2beee534a2a71fd8d"), name: "test" }
    ]
  }
};

// Convert function (same as in vectorSearch.ts)
function convertMongoDocument(doc) {
  if (!doc) return doc;
  
  // Convert ObjectId to string
  if (doc._id && typeof doc._id === 'object' && doc._id.toString) {
    doc._id = doc._id.toString();
  }
  
  // Recursively convert nested objects and arrays
  for (const [key, value] of Object.entries(doc)) {
    if (Array.isArray(value)) {
      doc[key] = value.map(item => convertMongoDocument(item));
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      doc[key] = convertMongoDocument(value);
    }
  }
  
  return doc;
}

// Test the conversion
console.log('Original document:');
console.log(JSON.stringify(mockMongoDoc, null, 2));

console.log('\nConverted document:');
const converted = convertMongoDocument(mockMongoDoc);
console.log(JSON.stringify(converted, null, 2));

// Verify all ObjectIds are now strings
function checkForObjectIds(obj, path = '') {
  for (const [key, value] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key;
    
    if (value && typeof value === 'object' && value.constructor && value.constructor.name === 'ObjectId') {
      console.error(`❌ Found ObjectId at ${currentPath}:`, value);
      return false;
    } else if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        if (!checkForObjectIds(value[i], `${currentPath}[${i}]`)) {
          return false;
        }
      }
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (!checkForObjectIds(value, currentPath)) {
        return false;
      }
    }
  }
  return true;
}

console.log('\nChecking for remaining ObjectIds...');
if (checkForObjectIds(converted)) {
  console.log('✅ All ObjectIds successfully converted to strings!');
} else {
  console.log('❌ Some ObjectIds remain unconverted');
} 