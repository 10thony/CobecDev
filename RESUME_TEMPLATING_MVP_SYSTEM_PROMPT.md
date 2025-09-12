# Resume Templating MVP System Prompt

## Overview
This system enables Cobec admins to create resume validation templates that can be applied to resumes in the database to check compliance with specific requirements (e.g., government contract formats, internal standards). The system supports both bulk validation and individual resume validation.

## Core Functionality

### 1. Template Management
- **Template Creation**: Admins can create new resume validation templates
- **Template Naming**: Each template has a unique name and optional description
- **Template Storage**: Templates stored as atomic documents with embedded rules
- **Template Versioning**: Track creation date and creator for audit purposes

### 2. Section-Based Validation
- **Section Definition**: Templates define sections to validate (e.g., "skills", "experience", "education")
- **Rule Types**: Each section can have multiple validation rules:
  - `EXISTS`: Section must exist and have content
  - `NOT_EMPTY`: Section must have non-whitespace content
  - `WORD_COUNT`: Section must have minimum/maximum word count
  - `REGEX`: Section content must match specified pattern
- **Rule Configuration**: Each rule includes:
  - Rule type
  - Value (for word count limits, regex patterns)
  - Custom failure message for user feedback

### 3. Validation Modes

#### Bulk Validation
- **Template Selection**: Admin selects a template to apply
- **Incremental Processing**: Apply validation to all resumes in database
- **Compliance Tracking**: Store compliance status for each resume
- **Batch Processing**: Handle large datasets efficiently
- **Progress Tracking**: Show validation progress and completion status

#### Individual Validation
- **Resume Details Integration**: "Validate" button on resume detail pages
- **Template Selection**: User selects which template to validate against
- **Real-time Results**: Immediate compliance feedback
- **Detailed Reporting**: Show which sections passed/failed and why

### 4. Compliance System
- **Binary Status**: Resumes are either compliant or non-compliant
- **Failure Details**: Track which specific sections and rules failed
- **Section-Level Results**: Show compliance status per section
- **Rule-Level Results**: Show which specific rules failed

## Technical Requirements

### Database Schema
```typescript
// Template Document Structure
Template {
  _id: Id<"templates">
  name: string
  description?: string
  sections: Array<{
    sectionName: string
    rules: Array<{
      type: "EXISTS" | "NOT_EMPTY" | "WORD_COUNT" | "REGEX"
      value?: string | number
      message: string
    }>
  }>
  createdAt: number
  createdBy: Id<"users">
}

// Compliance Results
ComplianceResult {
  _id: Id<"complianceResults">
  resumeId: Id<"resumes">
  templateId: Id<"templates">
  isCompliant: boolean
  sectionResults: Array<{
    sectionName: string
    isCompliant: boolean
    failedRules: Array<{
      ruleType: string
      message: string
    }>
  }>
  validatedAt: number
  validatedBy: Id<"users">
}
```

### API Endpoints
- `createTemplate(templateData)` - Create new validation template
- `getTemplates()` - List all available templates
- `updateTemplate(templateId, templateData)` - Update existing template
- `deleteTemplate(templateId)` - Remove template
- `validateResume(resumeId, templateId)` - Validate single resume
- `bulkValidateResumes(templateId)` - Validate all resumes with template
- `getComplianceResults(resumeId?, templateId?)` - Get validation results

### User Interface Requirements

#### Admin Template Builder
- **Template Form**: Name, description input fields
- **Section Management**: Add/remove sections with names
- **Rule Configuration**: Dropdown for rule types, value inputs, message fields
- **Template Preview**: Show how template would validate sample resume
- **Template List**: View, edit, delete existing templates

#### Validation Interface
- **Bulk Validation**: Template selection, progress indicator, results summary
- **Individual Validation**: Template selection dropdown, compliance status display
- **Results Display**: Clear indication of compliant/non-compliant status
- **Failure Details**: Expandable sections showing specific rule failures

## Business Rules

### Access Control
- Only Cobec admins can create, edit, or delete templates
- All users can view templates and run validations
- Compliance results are visible to users with resume access

### Validation Logic
- Resumes must pass ALL rules in ALL sections to be compliant
- Section validation fails if ANY rule in that section fails
- Empty or missing sections fail EXISTS and NOT_EMPTY rules
- Word count validation counts whitespace-separated words
- Regex validation is case-sensitive by default

### Data Integrity
- Templates cannot be deleted if they have associated compliance results
- Template updates do not automatically re-validate existing results
- Compliance results are immutable once created (new validation creates new result)

## Success Criteria
1. Admins can create templates with multiple sections and rule types
2. Bulk validation processes all resumes and stores compliance results
3. Individual validation provides immediate feedback on resume details page
4. Compliance results clearly show what needs to be fixed
5. System handles large datasets (1000+ resumes) efficiently
6. Template management is intuitive and requires no technical knowledge

## Future Enhancements (Post-MVP)
- Advanced rule types (date validation, keyword requirements)
- Template import/export functionality
- Compliance analytics and reporting
- Automated resume fixing suggestions
- Template versioning and rollback
- Integration with job posting requirements
