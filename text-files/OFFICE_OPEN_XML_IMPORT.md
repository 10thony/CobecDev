# Office Open XML Document Import

## Overview
The application now supports importing Office Open XML documents (.docx files) for resumes, in addition to the existing JSON import functionality. This allows users to upload their actual resume documents and have the application automatically extract and structure the data.

## Features

### ✅ **Supported File Types**
- `.docx` files (Office Open XML format)
- Existing `.json` files (unchanged)

### ✅ **AI-Powered Parsing**
- Uses OpenAI GPT-4 to intelligently parse resume content
- Extracts structured information including:
  - Personal information (name, email, phone, experience)
  - Professional summary
  - Education history
  - Work experience with details
  - Skills
  - Certifications
  - Professional memberships
  - Security clearance

### ✅ **Text Extraction**
- Uses the `mammoth` library to extract raw text from .docx files
- Handles complex document formatting
- Preserves text content while removing formatting

### ✅ **Error Handling**
- Graceful error messages for unsupported file types
- Clear feedback for corrupted or password-protected documents
- Fallback to basic parsing if AI parsing fails

## Implementation Details

### Backend (Convex Actions)
- **`importOfficeDocument`**: New action in `convex/mongoSearch.ts`
- **`parseResumeWithAI`**: AI-powered parsing function
- **`mammoth`**: Text extraction from .docx files
- **`docx`**: Additional Office Open XML support

### Frontend (React)
- **`handleOfficeDocumentImport`**: New handler in `DataManagementPage.tsx`
- **Updated UI**: Three-column layout with separate import options
- **File validation**: Client-side .docx file type checking

### Data Structure
The imported documents follow the same structure as the existing resume template:

```json
{
  "_id": "generated_id",
  "filename": "resume.docx",
  "originalText": "extracted text content",
  "personalInfo": {
    "firstName": "string",
    "middleName": "string",
    "lastName": "string",
    "email": "string",
    "phone": "string",
    "yearsOfExperience": number
  },
  "professionalSummary": "string",
  "education": ["string"],
  "experience": [
    {
      "title": "string",
      "company": "string",
      "location": "string",
      "duration": "string",
      "responsibilities": ["string"]
    }
  ],
  "skills": ["string"],
  "certifications": "string",
  "professionalMemberships": "string",
  "securityClearance": "string",
  "_metadata": {
    "fileName": "resume.docx",
    "importedAt": "date",
    "parsedAt": "date"
  },
  "extractedSkills": ["string"],
  "processedAt": "date",
  "processedMetadata": {
    "sourceFile": "resume.docx",
    "extractionMethod": "mammoth + AI",
    "textLength": number
  },
  "searchableText": "string",
  "embedding": []
}
```

## Usage

1. **Navigate to Data Management Page**
   - Go to the Data Management section of the application

2. **Upload .docx File**
   - Click on the "Import Resumes (DOCX)" section
   - Select a .docx file from your computer
   - The file will be automatically processed

3. **Processing**
   - Text is extracted from the document
   - AI parses the content into structured data
   - Data is stored in MongoDB with the same format as JSON imports

4. **Verification**
   - Check the status message for import results
   - Use the "Refresh Data" button to see the imported resume
   - The resume will be available for vector search and other features

## Error Messages

- **"This file type is not supported"**: Uploaded file is not a .docx file
- **"Unable to extract text from this document"**: File may be corrupted or password-protected
- **"The document format was unable to be processed"**: General processing error
- **"Failed to process document"**: Other processing errors with specific details

## Dependencies

### New NPM Packages
- `mammoth`: Text extraction from .docx files
- `docx`: Additional Office Open XML support

### Existing Dependencies
- `openai`: AI-powered parsing
- `mongodb`: Database storage
- `convex`: Backend framework

## Future Enhancements

- Support for additional Office formats (.doc, .odt)
- Enhanced AI parsing with more context
- Batch import functionality
- Document validation and preview
- Custom parsing rules for different resume formats 