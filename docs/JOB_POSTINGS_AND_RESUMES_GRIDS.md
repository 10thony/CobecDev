# Job Postings and Resumes Grid Components

This document describes the two new grid components created for displaying job postings and resumes data from the Convex database.

## Overview

Two new grid components have been added to the application:

1. **JobPostingsGrid** - Displays all job postings in a sortable, searchable table
2. **ResumesGrid** - Displays all resumes in a sortable, searchable table

Both components are fully integrated into the application with dedicated pages and navigation items.

## Features

### Common Features (Both Grids)

- **Search Bar**: Full-text search across multiple fields
  - Job Postings: title, location, department, job type, summary, duties, requirements
  - Resumes: name, email, filename, professional summary, skills, experience

- **Sortable Columns**: Click any table header to sort
  - First click: Sort ascending
  - Second click: Sort descending  
  - Third click: Clear sorting (return to default order)
  - Visual indicators (arrows) show current sort state

- **Responsive Design**: Adapts to different screen sizes
- **Dark Mode Support**: Full support for light/dark themes
- **Loading States**: Shows spinner while data is loading
- **Empty States**: User-friendly messages when no data is available

### Job Postings Grid

**Location**: `src/components/JobPostingsGrid.tsx`  
**Page**: `src/pages/JobPostingsPage.tsx`  
**Route**: `/job-postings`

#### Table Columns:
- Job Title (sortable)
- Location (sortable)
- Department (sortable)
- Job Type (sortable)
- Salary (sortable)
- Close Date (sortable)
- Actions (View details, Open job link)

#### Detail View Modal:
When clicking the eye icon, a modal appears showing:
- Full job details
- Job summary and description
- Duties and responsibilities
- Requirements and qualifications
- Education requirements
- Security clearance level
- Travel requirements
- Work schedule
- Series/Grade information
- Link to original job posting

### Resumes Grid

**Location**: `src/components/ResumesGrid.tsx`  
**Page**: `src/pages/ResumesPage.tsx`  
**Route**: `/resumes`

#### Table Columns:
- Filename (sortable)
- First Name (sortable)
- Last Name (sortable)
- Email (sortable)
- Years of Experience (sortable)
- Top Skills (displays first 3 skills)
- Actions (View details)

#### Detail View Modal:
When clicking the eye icon, a modal appears showing:
- Personal information (name, email, phone)
- Years of experience
- Security clearance
- Professional summary
- Complete skills list
- Work experience history (with responsibilities)
- Education details
- Certifications
- Professional memberships

## Navigation

Both grids are accessible through the sidebar navigation:

- **Job Postings** - Briefcase icon
- **Resumes** - File icon

## Technical Implementation

### Data Source
- Uses Convex queries (`api.jobPostings.list` and `api.resumes.list`)
- Real-time data updates via Convex subscriptions
- No manual refresh needed

### Sorting Logic
- Client-side sorting for instant response
- Supports string and numeric sorting
- Handles nested object properties (e.g., `personalInfo.firstName`)

### Search Logic
- Case-insensitive text matching
- Searches across multiple relevant fields
- Real-time filtering as user types

### UI Components
- Built with React and TypeScript
- Styled with Tailwind CSS
- Uses Lucide React icons
- Follows existing app design patterns

## Usage

### Accessing the Grids

1. **Via Navigation**: Click "Job Postings" or "Resumes" in the sidebar
2. **Via URL**: Navigate to `/job-postings` or `/resumes`

### Using the Search

1. Type in the search bar
2. Results filter automatically as you type
3. Click the X icon to clear search

### Sorting Data

1. Click any column header to sort
2. Click again to reverse sort direction
3. Click a third time to clear sorting
4. Only one column can be sorted at a time

### Viewing Details

1. Click the eye icon in the Actions column
2. Modal opens with full details
3. Click X or click outside to close

## Files Created/Modified

### New Files:
- `src/components/JobPostingsGrid.tsx` - Job postings grid component
- `src/components/ResumesGrid.tsx` - Resumes grid component  
- `src/pages/JobPostingsPage.tsx` - Job postings page wrapper
- `src/pages/ResumesPage.tsx` - Resumes page wrapper
- `docs/JOB_POSTINGS_AND_RESUMES_GRIDS.md` - This documentation

### Modified Files:
- `src/App.tsx` - Added routes for both grids
- `src/components/Layout.tsx` - Added navigation items with icons

## Database Schema

### Job Postings (jobpostings table)
Key fields displayed:
- `jobTitle`, `location`, `department`, `jobType`
- `salary`, `openDate`, `closeDate`
- `jobSummary`, `duties`, `requirements`, `qualifications`
- `education[]`, `securityClearance`, `travelRequired`
- `workSchedule`, `seriesGrade`, `jobLink`

### Resumes (resumes table)
Key fields displayed:
- `filename`, `personalInfo.*`
- `professionalSummary`, `skills[]`
- `experience[]`, `education[]`
- `certifications`, `professionalMemberships`
- `securityClearance`

## Future Enhancements

Possible improvements:
1. Export to CSV/Excel
2. Bulk actions (delete, export)
3. Advanced filtering (multi-field filters)
4. Pagination for large datasets
5. Column visibility toggle
6. Saved searches/filters
7. Direct edit capabilities
8. Print-friendly views

