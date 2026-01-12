#!/usr/bin/env python3
"""
parseResumeFile.py
Parse a single resume file (DOCX/PDF) and extract structured data without AI.
This script is designed to be called from Node.js/Convex to avoid PII bleeding to AI services.

Usage:
    python scripts/parseResumeFile.py <file_path>
    
Or with base64 input:
    python scripts/parseResumeFile.py --base64 <base64_data> --filename <filename>

Output: JSON object matching the Resume interface structure
"""

import os
import json
import re
import sys
import base64
import tempfile
from pathlib import Path

# Required dependencies:
# pip install python-docx PyPDF2
try:
    from docx import Document
    import PyPDF2
except ImportError:
    print("ERROR: Required packages not installed. Run: pip install python-docx PyPDF2", file=sys.stderr)
    sys.exit(1)


def extract_text_from_pdf(file_path: str) -> str:
    """Extract text content from a PDF file."""
    text = ""
    try:
        with open(file_path, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            for page in reader.pages:
                text += page.extract_text() or ""
    except Exception as e:
        print(f"Error reading PDF {file_path}: {e}", file=sys.stderr)
    return text


def extract_text_from_docx(file_path: str) -> str:
    """Extract text content from a DOCX file."""
    text = ""
    try:
        doc = Document(file_path)
        text = "\n".join(para.text for para in doc.paragraphs)
    except Exception as e:
        print(f"Error reading DOCX {file_path}: {e}", file=sys.stderr)
    return text


def extract_text_from_buffer(buffer: bytes, filename: str) -> str:
    """Extract text from a buffer based on file extension."""
    ext = Path(filename).suffix.lower()
    
    if ext == ".pdf":
        # For PDF, we need to write to temp file or use BytesIO
        import io
        try:
            reader = PyPDF2.PdfReader(io.BytesIO(buffer))
            text = ""
            for page in reader.pages:
                text += page.extract_text() or ""
            return text
        except Exception as e:
            print(f"Error reading PDF from buffer: {e}", file=sys.stderr)
            return ""
    elif ext in [".docx", ".doc"]:
        # For DOCX, write to temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            tmp.write(buffer)
            tmp_path = tmp.name
        try:
            text = extract_text_from_docx(tmp_path)
        finally:
            os.unlink(tmp_path)
        return text
    return ""


def extract_email(text: str) -> str:
    """Extract email address from text."""
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    match = re.search(email_pattern, text)
    return match.group(0) if match else ""


def extract_phone(text: str) -> str:
    """Extract phone number from text."""
    # Common phone patterns
    phone_patterns = [
        r'\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}',  # (123) 456-7890 or 123-456-7890
        r'\d{3}[-.\s]?\d{3}[-.\s]?\d{4}',  # 123-456-7890
        r'\+?\d{1,3}[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}',  # International
    ]
    for pattern in phone_patterns:
        match = re.search(pattern, text)
        if match:
            return match.group(0)
    return ""


def extract_name(text: str) -> tuple[str, str, str]:
    """Extract name from the first few lines of text."""
    lines = text.split('\n')[:5]  # Check first 5 lines
    for line in lines:
        line = line.strip()
        if len(line) > 0 and not line.startswith(('Email:', 'Phone:', 'Address:', 'Summary:', 'Objective:')):
            # Try to parse name (usually first line or second line)
            parts = line.split()
            if 2 <= len(parts) <= 4:
                if len(parts) == 2:
                    return (parts[0], "", parts[1])
                elif len(parts) == 3:
                    return (parts[0], parts[1], parts[2])
                elif len(parts) == 4:
                    return (parts[0], parts[1], f"{parts[2]} {parts[3]}")
    return ("", "", "")


def extract_years_of_experience(text: str) -> int:
    """Extract years of experience from text."""
    # Look for patterns like "5 years", "10+ years", etc.
    patterns = [
        r'(\d+)\+?\s*years?\s*(?:of\s*)?experience',
        r'(\d+)\+?\s*years?\s*in',
        r'experience[:\s]+(\d+)\+?\s*years?',
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            try:
                return int(match.group(1))
            except ValueError:
                pass
    
    # Fallback: count experience entries
    exp_section = extract_section(text, ['experience', 'work experience', 'professional experience', 'employment'])
    if exp_section:
        # Count job entries (lines that look like job titles)
        lines = exp_section.split('\n')
        count = 0
        for line in lines:
            if re.match(r'^[A-Z][^•\n]{10,}', line.strip()):
                count += 1
        return min(count, 30)  # Cap at 30
    
    return 0


def extract_section(text: str, section_names: list[str]) -> str:
    """Extract a section from text by looking for section headers."""
    text_lower = text.lower()
    
    for section_name in section_names:
        # Look for section header
        pattern = rf'^({re.escape(section_name)})\s*:?\s*$'
        match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
        if match:
            start = match.end()
            # Find next section or end of text
            next_section_pattern = r'^(?:SUMMARY|OBJECTIVE|EXPERIENCE|EDUCATION|SKILLS|CERTIFICATIONS|PROJECTS|AWARDS|REFERENCES)\s*:?\s*$'
            next_match = re.search(next_section_pattern, text[start:], re.IGNORECASE | re.MULTILINE)
            end = start + next_match.start() if next_match else len(text)
            return text[start:end].strip()
    
    return ""


def parse_experience(text: str) -> list[dict]:
    """Parse work experience from text."""
    exp_section = extract_section(text, ['experience', 'work experience', 'professional experience', 'employment history'])
    if not exp_section:
        return []
    
    experiences = []
    lines = exp_section.split('\n')
    current_exp = None
    
    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue
        
        # Check if this looks like a job title (usually capitalized, not a bullet)
        if re.match(r'^[A-Z][^•\n]{10,}', line) and not line.startswith(('•', '-', '*', 'Designed', 'Developed', 'Managed')):
            # Save previous experience if exists
            if current_exp:
                experiences.append(current_exp)
            
            # Start new experience
            current_exp = {
                "title": line,
                "company": "",
                "location": "",
                "duration": "",
                "responsibilities": []
            }
            
            # Check next line for company/location
            if i + 1 < len(lines):
                next_line = lines[i + 1].strip()
                if ',' in next_line:
                    parts = [p.strip() for p in next_line.split(',')]
                    if len(parts) >= 2:
                        current_exp["company"] = parts[0]
                        current_exp["location"] = parts[1]
                        # Check if there's a date/duration
                        if len(parts) >= 3:
                            current_exp["duration"] = parts[2]
                    elif len(parts) == 1:
                        current_exp["company"] = parts[0]
                elif re.search(r'\d{4}|\d{1,2}/\d{4}|(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)', next_line, re.IGNORECASE):
                    current_exp["duration"] = next_line
        elif current_exp:
            # Check if this is a duration line
            if re.search(r'\d{4}|\d{1,2}/\d{4}|(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)', line, re.IGNORECASE):
                if not current_exp["duration"]:
                    current_exp["duration"] = line
            # Check if this is a responsibility (bullet point or action verb)
            elif line.startswith(('•', '-', '*')) or re.match(r'^(Designed|Developed|Managed|Created|Implemented|Led|Worked|Provided|Responsible)', line, re.IGNORECASE):
                current_exp["responsibilities"].append(line.lstrip('•-* '))
    
    # Add last experience
    if current_exp:
        experiences.append(current_exp)
    
    return experiences


def parse_skills(text: str) -> list[str]:
    """Parse skills from text."""
    skills_section = extract_section(text, ['skills', 'technical skills', 'core competencies', 'key skills'])
    if not skills_section:
        return []
    
    # Split by commas, semicolons, or newlines
    skills = []
    for delimiter in [',', ';', '\n']:
        if delimiter in skills_section:
            skills = [s.strip() for s in skills_section.split(delimiter)]
            break
    
    if not skills:
        skills = [skills_section.strip()]
    
    # Clean up skills
    cleaned_skills = []
    for skill in skills:
        skill = skill.strip()
        if skill and len(skill) > 1:
            # Remove bullet points
            skill = skill.lstrip('•-* ')
            cleaned_skills.append(skill)
    
    return cleaned_skills[:50]  # Limit to 50 skills


def parse_education(text: str) -> list[str]:
    """Parse education from text."""
    edu_section = extract_section(text, ['education', 'academic background', 'qualifications'])
    if not edu_section:
        return []
    
    # Split by newlines and filter
    lines = [line.strip() for line in edu_section.split('\n') if line.strip()]
    return lines[:10]  # Limit to 10 entries


def parse_resume(text: str, filename: str) -> dict:
    """Parse resume text into structured format."""
    # Extract personal info
    email = extract_email(text)
    phone = extract_phone(text)
    firstName, middleName, lastName = extract_name(text)
    yearsOfExperience = extract_years_of_experience(text)
    
    # Extract sections
    professionalSummary = extract_section(text, ['summary', 'professional summary', 'objective', 'profile'])
    if not professionalSummary:
        # Try to get first paragraph if no summary section
        lines = text.split('\n')[:10]
        professionalSummary = ' '.join([l.strip() for l in lines if l.strip() and not l.strip().startswith(('Email:', 'Phone:', 'Address:'))])[:500]
    
    education = parse_education(text)
    experience = parse_experience(text)
    skills = parse_skills(text)
    
    certifications = extract_section(text, ['certifications', 'certification', 'training', 'certificates'])
    professionalMemberships = extract_section(text, ['memberships', 'professional memberships', 'affiliations'])
    securityClearance = extract_section(text, ['security clearance', 'clearance'])
    
    return {
        "filename": filename,
        "originalText": text,
        "personalInfo": {
            "firstName": firstName,
            "middleName": middleName,
            "lastName": lastName,
            "email": email,
            "phone": phone,
            "yearsOfExperience": yearsOfExperience
        },
        "professionalSummary": professionalSummary[:1000],  # Limit length
        "education": education,
        "experience": experience,
        "skills": skills,
        "certifications": certifications[:500],
        "professionalMemberships": professionalMemberships[:500],
        "securityClearance": securityClearance[:200]
    }


def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        print("ERROR: Usage: python parseResumeFile.py <file_path> or --base64 <base64_data> --filename <filename>", file=sys.stderr)
        sys.exit(1)
    
    # Check if using base64 input
    if sys.argv[1] == '--base64':
        if len(sys.argv) < 5 or sys.argv[3] != '--filename':
            print("ERROR: Usage: python parseResumeFile.py --base64 <base64_data> --filename <filename>", file=sys.stderr)
            sys.exit(1)
        
        base64_data = sys.argv[2]
        filename = sys.argv[4]
        
        try:
            buffer = base64.b64decode(base64_data)
            text = extract_text_from_buffer(buffer, filename)
        except Exception as e:
            print(f"ERROR: Failed to decode base64 or extract text: {e}", file=sys.stderr)
            sys.exit(1)
    else:
        file_path = sys.argv[1]
        filename = Path(file_path).name
        
        if not os.path.exists(file_path):
            print(f"ERROR: File not found: {file_path}", file=sys.stderr)
            sys.exit(1)
        
        ext = Path(file_path).suffix.lower()
        if ext == ".pdf":
            text = extract_text_from_pdf(file_path)
        elif ext in [".docx", ".doc"]:
            text = extract_text_from_docx(file_path)
        else:
            print(f"ERROR: Unsupported file type: {ext}", file=sys.stderr)
            sys.exit(1)
    
    if not text or not text.strip():
        print("ERROR: No text could be extracted from the file", file=sys.stderr)
        sys.exit(1)
    
    # Parse the resume
    try:
        result = parse_resume(text, filename)
        # Output JSON to stdout
        print(json.dumps(result, indent=2, ensure_ascii=False))
    except Exception as e:
        print(f"ERROR: Failed to parse resume: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
