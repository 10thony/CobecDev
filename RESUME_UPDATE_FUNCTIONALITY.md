# Resume Update Functionality

## Overview

The ResumeDetailsPage now includes functionality to update existing resumes with new documents. Users can upload a new .docx file to replace the current resume content with fresh AI parsing and embeddings.

## Features

### Document Upload
- **File Type**: Only .docx files are supported
- **AI Parsing**: Uses Gemini AI to extract structured information from the document
- **Embedding Generation**: Automatically generates new search vectors for better matching
- **Field Updates**: All resume fields are updated with the new document's content

### User Interface
- **Prominent Upload Section**: Dedicated section at the top of the resume details page
- **Visual Feedback**: Loading states and progress indicators
- **Error Handling**: Clear error messages for failed uploads
- **Success Feedback**: Confirmation messages for successful updates

## How It Works

### 1. Document Processing
1. User selects a .docx file
2. File is converted to base64 and sent to the server
3. Document text is extracted using mammoth.js
4. AI parses the text to extract structured information

### 2. Data Update
1. Existing resume is found in the database
2. New document data replaces the old content
3. Searchable text is regenerated from the new content
4. New embeddings are generated using Gemini AI
5. Database record is updated with fresh data

### 3. UI Updates
1. Local state is updated with new resume data
2. Form fields are populated with new values
3. Success message is displayed
4. User can continue editing or viewing the updated resume

## Technical Implementation

### Backend (Convex Actions)
- `updateResumeWithDocument`: Main action for updating resumes with new documents
- `parseResumeWithAI`: Helper function for AI parsing
- `generateResumeEmbeddings`: Helper function for embedding generation
- `createResumeSearchableText`: Helper function for searchable text creation

### Frontend (React Components)
- File upload handling with base64 conversion
- Loading states and progress indicators
- Error handling and user feedback
- Automatic form data updates

## Usage

### For Users
1. Navigate to a resume details page
2. Click "Choose .docx File" in the upload section
3. Select a .docx file with updated resume content
4. Wait for processing to complete
5. Review the updated resume information

### For Developers
```javascript
// Example usage in code
const result = await updateResumeWithDocument({
  resumeId: "resume_id_here",
  fileName: "updated_resume.docx",
  fileData: base64EncodedFileData
});

if (result.success) {
  // Handle successful update
  console.log("Resume updated:", result.updatedResume);
} else {
  // Handle error
  console.error("Update failed:", result.message);
}
```

## Error Handling

### Common Errors
- **Invalid file type**: Only .docx files are accepted
- **Empty document**: Document must contain extractable text
- **AI parsing failure**: Fallback to basic structure if AI fails
- **Database errors**: Clear error messages for database issues

### User Feedback
- Loading indicators during processing
- Success messages for completed updates
- Error messages with specific details
- Automatic message clearing after timeouts

## Benefits

1. **Fresh Data**: Users can keep resumes up-to-date with latest information
2. **Better Search**: New embeddings improve vector search accuracy
3. **AI Enhancement**: Automatic parsing ensures consistent data structure
4. **User-Friendly**: Simple upload process with clear feedback
5. **Non-Destructive**: Original data is preserved in metadata

## Testing

Use the provided test script to verify functionality:
```bash
node test_resume_update.js
```

Make sure to:
1. Have a test .docx file named `test_resume.docx` in the project root
2. Set the `CONVEX_URL` environment variable
3. Have existing resumes in the database

## Future Enhancements

- Support for additional file formats (PDF, .doc)
- Batch update functionality
- Version history tracking
- Automatic backup before updates
- Preview of changes before applying 