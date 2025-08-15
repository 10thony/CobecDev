console.log('🔄 Testing migration dependencies...');

try {
  console.log('📦 Testing MongoDB import...');
  const { MongoClient } = require('mongodb');
  console.log('✅ MongoDB import successful');
} catch (error) {
  console.error('❌ MongoDB import failed:', error.message);
}

try {
  console.log('📦 Testing Convex import...');
  const { ConvexHttpClient } = require('convex/server');
  console.log('✅ Convex import successful');
} catch (error) {
  console.error('❌ Convex import failed:', error.message);
}

try {
  console.log('📦 Testing fs import...');
  const fs = require('fs');
  console.log('✅ fs import successful');
} catch (error) {
  console.error('❌ fs import failed:', error.message);
}

try {
  console.log('📦 Testing path import...');
  const path = require('path');
  console.log('✅ path import successful');
} catch (error) {
  console.error('❌ path import failed:', error.message);
}

console.log('🎉 All dependency tests completed'); 