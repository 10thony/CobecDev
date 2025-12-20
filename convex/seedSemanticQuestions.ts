import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Seed script for semantic questions to improve embeddings
 * Run this mutation once to populate the database with initial questions
 * 
 * Usage: npx convex run seedSemanticQuestions:seed
 */

const SEMANTIC_QUESTIONS = [
  // =====================================================
  // JOB POSTING QUESTIONS - Technical Skills & Expertise
  // =====================================================
  {
    question: "What are the core technical skills and technologies required for this position?",
    category: "job_posting",
    subCategory: "technical_skills",
    description: "Captures programming languages, frameworks, tools, and technical proficiencies needed",
    weight: 10,
    isActive: true,
    exampleAnswer: "Python, React, AWS, Docker, PostgreSQL, REST APIs, Git",
    tags: ["technical", "skills", "programming", "tools", "technologies"]
  },
  {
    question: "What level of expertise is required in each technical domain?",
    category: "job_posting",
    subCategory: "technical_skills",
    description: "Identifies whether skills need to be beginner, intermediate, advanced, or expert level",
    weight: 8,
    isActive: true,
    exampleAnswer: "Expert in Python, Advanced in React, Intermediate in AWS",
    tags: ["expertise", "proficiency", "skill-level", "technical"]
  },
  {
    question: "What software development methodologies and practices are expected?",
    category: "job_posting",
    subCategory: "technical_skills",
    description: "Captures Agile, Scrum, DevOps, CI/CD, testing practices, code review processes",
    weight: 7,
    isActive: true,
    exampleAnswer: "Agile/Scrum, TDD, CI/CD pipelines, peer code reviews, automated testing",
    tags: ["methodology", "agile", "devops", "practices", "process"]
  },

  // =====================================================
  // JOB POSTING QUESTIONS - Experience & Background
  // =====================================================
  {
    question: "How many years of relevant professional experience are required?",
    category: "job_posting",
    subCategory: "experience",
    description: "Specifies minimum and preferred years of experience in the field",
    weight: 9,
    isActive: true,
    exampleAnswer: "5+ years in software development, 3+ years with cloud platforms",
    tags: ["experience", "years", "seniority", "background"]
  },
  {
    question: "What specific industry domains or sectors should candidates have experience in?",
    category: "job_posting",
    subCategory: "experience",
    description: "Identifies relevant industry experience (healthcare, finance, government, etc.)",
    weight: 7,
    isActive: true,
    exampleAnswer: "Healthcare IT, HIPAA compliance, medical records systems",
    tags: ["industry", "domain", "sector", "vertical", "experience"]
  },
  {
    question: "What types of projects or initiatives should the candidate have worked on?",
    category: "job_posting",
    subCategory: "experience",
    description: "Captures specific project types, scales, and complexities",
    weight: 8,
    isActive: true,
    exampleAnswer: "Large-scale migrations, microservices architecture, high-traffic systems",
    tags: ["projects", "initiatives", "experience", "achievements"]
  },

  // =====================================================
  // JOB POSTING QUESTIONS - Education & Certifications
  // =====================================================
  {
    question: "What educational background and degrees are required or preferred?",
    category: "job_posting",
    subCategory: "education",
    description: "Specifies degree requirements (BS, MS, PhD) and relevant fields of study",
    weight: 6,
    isActive: true,
    exampleAnswer: "Bachelor's in Computer Science or related field, Master's preferred",
    tags: ["education", "degree", "qualifications", "academic"]
  },
  {
    question: "What professional certifications are required, preferred, or beneficial?",
    category: "job_posting",
    subCategory: "certifications",
    description: "Identifies industry certifications (AWS, PMP, Security+, etc.)",
    weight: 7,
    isActive: true,
    exampleAnswer: "AWS Solutions Architect, Certified Kubernetes Administrator",
    tags: ["certifications", "credentials", "professional", "licenses"]
  },

  // =====================================================
  // JOB POSTING QUESTIONS - Responsibilities & Duties
  // =====================================================
  {
    question: "What are the primary day-to-day responsibilities and tasks?",
    category: "job_posting",
    subCategory: "responsibilities",
    description: "Captures core job duties and regular activities",
    weight: 9,
    isActive: true,
    exampleAnswer: "Design and implement APIs, conduct code reviews, mentor junior developers",
    tags: ["responsibilities", "duties", "tasks", "activities"]
  },
  {
    question: "What leadership or mentorship responsibilities does this role involve?",
    category: "job_posting",
    subCategory: "responsibilities",
    description: "Identifies team leadership, mentoring, and people management aspects",
    weight: 7,
    isActive: true,
    exampleAnswer: "Lead team of 5 engineers, mentor interns, participate in hiring",
    tags: ["leadership", "mentorship", "management", "team"]
  },
  {
    question: "What strategic or architectural decisions will the candidate be responsible for?",
    category: "job_posting",
    subCategory: "responsibilities",
    description: "Captures high-level decision-making and architectural responsibilities",
    weight: 8,
    isActive: true,
    exampleAnswer: "Define system architecture, technology stack decisions, technical roadmap",
    tags: ["strategy", "architecture", "decisions", "planning"]
  },

  // =====================================================
  // JOB POSTING QUESTIONS - Soft Skills & Competencies
  // =====================================================
  {
    question: "What communication and collaboration skills are essential for this role?",
    category: "job_posting",
    subCategory: "soft_skills",
    description: "Identifies requirements for teamwork, communication, and interpersonal skills",
    weight: 7,
    isActive: true,
    exampleAnswer: "Strong written and verbal communication, cross-functional collaboration",
    tags: ["communication", "collaboration", "teamwork", "soft-skills"]
  },
  {
    question: "What problem-solving and analytical capabilities are needed?",
    category: "job_posting",
    subCategory: "soft_skills",
    description: "Captures critical thinking, analytical, and problem-solving requirements",
    weight: 8,
    isActive: true,
    exampleAnswer: "Complex problem decomposition, data-driven decision making, root cause analysis",
    tags: ["problem-solving", "analytical", "critical-thinking", "soft-skills"]
  },

  // =====================================================
  // JOB POSTING QUESTIONS - Work Environment & Culture
  // =====================================================
  {
    question: "What is the work arrangement (remote, hybrid, on-site)?",
    category: "job_posting",
    subCategory: "work_environment",
    description: "Specifies location requirements and flexibility",
    weight: 6,
    isActive: true,
    exampleAnswer: "Hybrid - 3 days in office, 2 days remote",
    tags: ["location", "remote", "hybrid", "work-arrangement"]
  },
  {
    question: "What is the team structure and reporting relationship?",
    category: "job_posting",
    subCategory: "work_environment",
    description: "Describes team size, structure, and organizational hierarchy",
    weight: 5,
    isActive: true,
    exampleAnswer: "Reports to Engineering Manager, part of 10-person product team",
    tags: ["team", "organization", "reporting", "structure"]
  },
  {
    question: "What security clearance level is required?",
    category: "job_posting",
    subCategory: "requirements",
    description: "Specifies government security clearance requirements",
    weight: 9,
    isActive: true,
    exampleAnswer: "Secret clearance required, Top Secret preferred",
    tags: ["security", "clearance", "government", "requirements"]
  },

  // =====================================================
  // RESUME QUESTIONS - Technical Expertise & Skills
  // =====================================================
  {
    question: "What technical skills and technologies does this candidate have experience with?",
    category: "resume",
    subCategory: "technical_skills",
    description: "Lists all programming languages, frameworks, tools, and technologies",
    weight: 10,
    isActive: true,
    exampleAnswer: "JavaScript, TypeScript, React, Node.js, AWS, Docker, MongoDB",
    tags: ["technical", "skills", "technologies", "programming", "expertise"]
  },
  {
    question: "What is the candidate's depth of expertise in each technical area?",
    category: "resume",
    subCategory: "technical_skills",
    description: "Evaluates proficiency levels from experience and project work",
    weight: 9,
    isActive: true,
    exampleAnswer: "5 years React (expert), 3 years AWS (advanced), 2 years Kubernetes (intermediate)",
    tags: ["expertise", "proficiency", "skill-depth", "technical"]
  },
  {
    question: "What development methodologies and best practices has the candidate used?",
    category: "resume",
    subCategory: "technical_skills",
    description: "Identifies experience with Agile, DevOps, testing, CI/CD, etc.",
    weight: 7,
    isActive: true,
    exampleAnswer: "Agile/Scrum teams, implemented CI/CD pipelines, TDD practices",
    tags: ["methodology", "practices", "agile", "devops", "process"]
  },

  // =====================================================
  // RESUME QUESTIONS - Professional Experience
  // =====================================================
  {
    question: "What is the candidate's total years of professional experience?",
    category: "resume",
    subCategory: "experience",
    description: "Calculates overall professional experience and career progression",
    weight: 9,
    isActive: true,
    exampleAnswer: "8 years total experience, 5 years as senior engineer",
    tags: ["experience", "years", "career", "seniority"]
  },
  {
    question: "What industries or domains has the candidate worked in?",
    category: "resume",
    subCategory: "experience",
    description: "Identifies industry experience and domain knowledge",
    weight: 7,
    isActive: true,
    exampleAnswer: "3 years healthcare, 2 years fintech, 3 years government contracting",
    tags: ["industry", "domain", "sector", "vertical"]
  },
  {
    question: "What types of projects has the candidate delivered?",
    category: "resume",
    subCategory: "experience",
    description: "Catalogs project types, sizes, and complexity levels",
    weight: 8,
    isActive: true,
    exampleAnswer: "Led microservices migration, built real-time analytics platform, scaled to 1M users",
    tags: ["projects", "deliverables", "achievements", "impact"]
  },
  {
    question: "What are the candidate's key achievements and quantifiable results?",
    category: "resume",
    subCategory: "experience",
    description: "Captures measurable impacts, improvements, and accomplishments",
    weight: 9,
    isActive: true,
    exampleAnswer: "Reduced latency by 60%, saved $200K annually, improved deployment frequency by 10x",
    tags: ["achievements", "results", "impact", "metrics", "accomplishments"]
  },

  // =====================================================
  // RESUME QUESTIONS - Leadership & Collaboration
  // =====================================================
  {
    question: "What leadership roles and responsibilities has the candidate held?",
    category: "resume",
    subCategory: "leadership",
    description: "Identifies team lead, management, and leadership experience",
    weight: 8,
    isActive: true,
    exampleAnswer: "Led team of 6 engineers, technical lead on 3 major projects",
    tags: ["leadership", "management", "team-lead", "responsibility"]
  },
  {
    question: "What mentoring and coaching experience does the candidate have?",
    category: "resume",
    subCategory: "leadership",
    description: "Captures mentorship, training, and knowledge transfer activities",
    weight: 6,
    isActive: true,
    exampleAnswer: "Mentored 10 junior developers, conducted technical training sessions",
    tags: ["mentorship", "coaching", "training", "leadership"]
  },
  {
    question: "How has the candidate collaborated with cross-functional teams?",
    category: "resume",
    subCategory: "collaboration",
    description: "Shows experience working with product, design, QA, and other teams",
    weight: 7,
    isActive: true,
    exampleAnswer: "Worked with product managers, designers, and data scientists on product launches",
    tags: ["collaboration", "cross-functional", "teamwork", "communication"]
  },

  // =====================================================
  // RESUME QUESTIONS - Education & Certifications
  // =====================================================
  {
    question: "What degrees and educational credentials does the candidate hold?",
    category: "resume",
    subCategory: "education",
    description: "Lists all degrees, institutions, and fields of study",
    weight: 6,
    isActive: true,
    exampleAnswer: "MS Computer Science from Stanford, BS Mathematics from MIT",
    tags: ["education", "degree", "credentials", "academic"]
  },
  {
    question: "What professional certifications has the candidate earned?",
    category: "resume",
    subCategory: "certifications",
    description: "Catalogs all relevant certifications and credentials",
    weight: 7,
    isActive: true,
    exampleAnswer: "AWS Solutions Architect Professional, PMP, CISSP",
    tags: ["certifications", "credentials", "professional", "licenses"]
  },
  {
    question: "What ongoing learning and professional development has the candidate pursued?",
    category: "resume",
    subCategory: "education",
    description: "Shows commitment to learning through courses, workshops, conferences",
    weight: 5,
    isActive: true,
    exampleAnswer: "Completed machine learning course, attended AWS re:Invent, active in open source",
    tags: ["learning", "development", "training", "growth"]
  },

  // =====================================================
  // RESUME QUESTIONS - Specialized Skills
  // =====================================================
  {
    question: "What security clearances does the candidate hold?",
    category: "resume",
    subCategory: "clearances",
    description: "Identifies current and past security clearances",
    weight: 9,
    isActive: true,
    exampleAnswer: "Active Top Secret clearance since 2018",
    tags: ["security", "clearance", "government", "credentials"]
  },
  {
    question: "What unique or specialized skills set this candidate apart?",
    category: "resume",
    subCategory: "specialized_skills",
    description: "Captures niche expertise, unique combinations, or rare skills",
    weight: 7,
    isActive: true,
    exampleAnswer: "Quantum computing research, patent holder, published author",
    tags: ["specialized", "unique", "expertise", "differentiation"]
  },

  // =====================================================
  // GENERAL QUESTIONS - Matching & Fit
  // =====================================================
  {
    question: "What role levels and titles is this candidate qualified for?",
    category: "general",
    subCategory: "matching",
    description: "Determines appropriate seniority levels based on experience",
    weight: 8,
    isActive: true,
    exampleAnswer: "Senior Engineer, Staff Engineer, Technical Lead",
    tags: ["seniority", "level", "title", "qualification"]
  },
  {
    question: "What are the key strengths and differentiators?",
    category: "general",
    subCategory: "matching",
    description: "Summarizes core competencies and competitive advantages",
    weight: 9,
    isActive: true,
    exampleAnswer: "Deep expertise in distributed systems, proven leadership, strong communication",
    tags: ["strengths", "differentiators", "competencies", "advantages"]
  },
  {
    question: "What potential gaps or areas for growth exist?",
    category: "general",
    subCategory: "matching",
    description: "Identifies areas where additional experience or skills would be beneficial",
    weight: 6,
    isActive: true,
    exampleAnswer: "Limited frontend experience, no formal people management experience",
    tags: ["gaps", "growth", "development", "improvement"]
  },

  // =====================================================
  // VECTOR SEARCH PROMPTS - From VECTOR_SEARCH_PROMPTS.md
  // =====================================================
  
  // Aviation & Aerospace Matching (Job Posting Questions)
  {
    question: "Find resumes for Aviation Safety Inspector positions with FAA experience",
    category: "job_posting",
    subCategory: "aviation_aerospace",
    description: "Match aviation safety professionals with FAA background",
    weight: 9,
    isActive: true,
    tags: ["aviation", "safety", "faa", "inspector"]
  },
  {
    question: "Search for candidates with airworthiness and safety management experience",
    category: "job_posting",
    subCategory: "aviation_aerospace",
    description: "Find airworthiness certification and safety management professionals",
    weight: 9,
    isActive: true,
    tags: ["airworthiness", "safety", "aviation"]
  },
  {
    question: "Find resumes for aviation engineering positions with mechanical expertise",
    category: "job_posting",
    subCategory: "aviation_aerospace",
    description: "Match mechanical engineers with aviation industry experience",
    weight: 8,
    isActive: true,
    tags: ["aviation", "engineering", "mechanical"]
  },

  // Engineering Positions (Job Posting Questions)
  {
    question: "Find resumes for Computer Engineer positions with software development skills",
    category: "job_posting",
    subCategory: "engineering",
    description: "Match computer engineers with software development experience",
    weight: 9,
    isActive: true,
    tags: ["computer-engineering", "software", "development"]
  },
  {
    question: "Search for candidates with engineering and project management experience",
    category: "resume",
    subCategory: "engineering",
    description: "Find engineers with project management and leadership skills",
    weight: 9,
    isActive: true,
    tags: ["engineering", "project-management", "leadership"]
  },
  {
    question: "Find resumes for engineering positions requiring security clearance",
    category: "job_posting",
    subCategory: "engineering",
    description: "Match engineers with active security clearances",
    weight: 9,
    isActive: true,
    tags: ["engineering", "security-clearance", "government"]
  },

  // Software & Technology
  {
    question: "Find resumes for software engineering positions with Python and JavaScript experience",
    category: "job_posting",
    subCategory: "software_engineering",
    description: "Match software engineers proficient in Python and JavaScript",
    weight: 9,
    isActive: true,
    tags: ["software-engineering", "python", "javascript"]
  },
  {
    question: "Search for candidates with cloud computing and AWS experience",
    category: "resume",
    subCategory: "cloud_computing",
    description: "Find cloud engineers with AWS platform experience",
    weight: 9,
    isActive: true,
    tags: ["cloud-computing", "aws", "devops"]
  },
  {
    question: "Find resumes for cybersecurity positions with network security experience",
    category: "job_posting",
    subCategory: "cybersecurity",
    description: "Match cybersecurity professionals with network security expertise",
    weight: 9,
    isActive: true,
    tags: ["cybersecurity", "network-security", "infosec"]
  },
  {
    question: "Search for candidates with machine learning and data science expertise",
    category: "resume",
    subCategory: "data_science",
    description: "Find data scientists with ML and AI experience",
    weight: 9,
    isActive: true,
    tags: ["machine-learning", "data-science", "ai"]
  },

  // Government & Security Clearance
  {
    question: "Find resumes for government positions requiring security clearance",
    category: "job_posting",
    subCategory: "government_clearance",
    description: "Match cleared professionals to government positions",
    weight: 10,
    isActive: true,
    tags: ["security-clearance", "government", "federal"]
  },
  {
    question: "Search for positions requiring TS/SCI with CI polygraph",
    category: "job_posting",
    subCategory: "government_clearance",
    description: "Find top secret positions with polygraph requirements",
    weight: 10,
    isActive: true,
    tags: ["ts-sci", "polygraph", "top-secret"]
  },
  {
    question: "Find candidates with DoD Secret clearance",
    category: "resume",
    subCategory: "government_clearance",
    description: "Match secret cleared professionals to DoD positions",
    weight: 9,
    isActive: true,
    tags: ["secret", "dod", "clearance"]
  },

  // Skill-Specific Searches (General - applies to both)
  {
    question: "Find candidates or jobs with Python programming skills",
    category: "general",
    subCategory: "programming_skills",
    description: "Match Python developers with relevant opportunities",
    weight: 10,
    isActive: true,
    tags: ["python", "programming", "development"]
  },
  {
    question: "Find candidates or jobs with SQL and database management",
    category: "general",
    subCategory: "database_skills",
    description: "Match database professionals with SQL expertise",
    weight: 9,
    isActive: true,
    tags: ["sql", "database", "data"]
  },
  {
    question: "Find candidates or jobs with AWS and cloud infrastructure",
    category: "general",
    subCategory: "cloud_skills",
    description: "Match AWS cloud professionals",
    weight: 9,
    isActive: true,
    tags: ["aws", "cloud", "infrastructure"]
  },
  {
    question: "Find candidates or jobs with Docker and Kubernetes",
    category: "general",
    subCategory: "devops_skills",
    description: "Match containerization experts",
    weight: 8,
    isActive: true,
    tags: ["docker", "kubernetes", "devops"]
  },
  {
    question: "Find candidates or jobs with Power Platform skills",
    category: "general",
    subCategory: "business_intelligence",
    description: "Match Power Platform experts (PowerBI, PowerApps)",
    weight: 8,
    isActive: true,
    tags: ["power-platform", "powerbi", "microsoft"]
  },

  // Location-Based Searches (General)
  {
    question: "Find remote positions and candidates willing to work remotely",
    category: "general",
    subCategory: "location",
    description: "Match remote work opportunities and remote-ready professionals",
    weight: 8,
    isActive: true,
    tags: ["remote", "work-from-home", "distributed"]
  },
  {
    question: "Find positions and candidates in Washington DC area",
    category: "general",
    subCategory: "location",
    description: "Match professionals and jobs in DC metropolitan area",
    weight: 7,
    isActive: true,
    tags: ["washington-dc", "dmv", "location"]
  },
  {
    question: "Find positions and candidates in FAA duty locations nationwide",
    category: "general",
    subCategory: "location",
    description: "Match aviation professionals to FAA locations",
    weight: 8,
    isActive: true,
    tags: ["faa", "aviation", "duty-stations"]
  },

  // Experience Level (General)
  {
    question: "Find entry-level positions and recent graduates",
    category: "general",
    subCategory: "experience_level",
    description: "Match junior professionals to entry-level opportunities",
    weight: 7,
    isActive: true,
    tags: ["entry-level", "junior", "graduate"]
  },
  {
    question: "Find mid-level positions and candidates with 3-5 years experience",
    category: "general",
    subCategory: "experience_level",
    description: "Match mid-level professionals to appropriate positions",
    weight: 8,
    isActive: true,
    tags: ["mid-level", "intermediate", "experienced"]
  },
  {
    question: "Find senior-level positions and candidates with 8+ years experience",
    category: "general",
    subCategory: "experience_level",
    description: "Match senior professionals to leadership positions",
    weight: 9,
    isActive: true,
    tags: ["senior", "advanced", "expert"]
  },

  // Advanced Semantic Searches (General)
  {
    question: "Find candidates with experience in safety-critical systems and regulatory compliance",
    category: "resume",
    subCategory: "advanced_semantic",
    description: "Match professionals with safety and compliance expertise",
    weight: 9,
    isActive: true,
    tags: ["safety", "compliance", "regulatory"]
  },
  {
    question: "Search for positions requiring expertise in complex technical systems",
    category: "job_posting",
    subCategory: "advanced_semantic",
    description: "Find roles requiring advanced technical problem-solving",
    weight: 8,
    isActive: true,
    tags: ["complex-systems", "problem-solving", "technical"]
  },
  {
    question: "Find candidates with background in government contracting and federal regulations",
    category: "resume",
    subCategory: "advanced_semantic",
    description: "Match professionals with federal contracting knowledge",
    weight: 8,
    isActive: true,
    tags: ["government", "contracting", "federal"]
  },
  {
    question: "Search for positions requiring project coordination and stakeholder management",
    category: "job_posting",
    subCategory: "advanced_semantic",
    description: "Find project coordination and stakeholder management roles",
    weight: 8,
    isActive: true,
    tags: ["project-management", "coordination", "stakeholder"]
  },
  {
    question: "Find candidates with experience in quality assurance and process improvement",
    category: "resume",
    subCategory: "advanced_semantic",
    description: "Match QA and process improvement professionals",
    weight: 7,
    isActive: true,
    tags: ["quality-assurance", "process-improvement", "qa"]
  },
];

export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const insertedIds = [];

    console.log(`Starting to seed ${SEMANTIC_QUESTIONS.length} semantic questions...`);

    for (const question of SEMANTIC_QUESTIONS) {
      const id = await ctx.db.insert("semanticQuestions", {
        ...question,
        usageCount: 0,
        effectiveness: undefined,
        createdBy: undefined,
        createdAt: now,
        updatedAt: now,
      });
      insertedIds.push(id);
    }

    console.log(`Successfully seeded ${insertedIds.length} semantic questions!`);

    return {
      success: true,
      count: insertedIds.length,
      ids: insertedIds,
    };
  },
});

// Mutation to clear all semantic questions (for testing/reset)
export const clearAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    const allQuestions = await ctx.db.query("semanticQuestions").collect();
    
    for (const question of allQuestions) {
      await ctx.db.delete(question._id);
    }

    return {
      success: true,
      deleted: allQuestions.length,
    };
  },
});

