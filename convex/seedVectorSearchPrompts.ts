import { internalMutation } from "./_generated/server";

/**
 * Seed script for vector search prompts from VECTOR_SEARCH_PROMPTS.md
 * These prompts will be used to generate embeddings for better semantic matching
 * 
 * Usage: npx convex run seedVectorSearchPrompts:seed
 */

const VECTOR_SEARCH_PROMPTS = [
  // =====================================================
  // Job-to-Resume Matching - Aviation & Aerospace
  // =====================================================
  {
    question: "Find resumes for Aviation Safety Inspector positions with FAA experience",
    category: "job_to_resume",
    subCategory: "aviation_aerospace",
    description: "Match aviation safety professionals with FAA background",
    weight: 9,
    isActive: true,
    tags: ["aviation", "safety", "faa", "inspector", "aerospace"]
  },
  {
    question: "Search for candidates with aviation safety and operations experience",
    category: "job_to_resume",
    subCategory: "aviation_aerospace",
    description: "Find aviation operations and safety management experts",
    weight: 9,
    isActive: true,
    tags: ["aviation", "safety", "operations", "management"]
  },
  {
    question: "Find resumes for FAASTeam Program Manager positions",
    category: "job_to_resume",
    subCategory: "aviation_aerospace",
    description: "Match candidates for FAA Safety Team program management",
    weight: 8,
    isActive: true,
    tags: ["faa", "program-manager", "safety-team", "aviation"]
  },
  {
    question: "Search for candidates with airworthiness and safety management experience",
    category: "job_to_resume",
    subCategory: "aviation_aerospace",
    description: "Find airworthiness certification and safety management professionals",
    weight: 9,
    isActive: true,
    tags: ["airworthiness", "safety", "certification", "aviation"]
  },
  {
    question: "Find resumes for aviation engineering positions with mechanical expertise",
    category: "job_to_resume",
    subCategory: "aviation_aerospace",
    description: "Match mechanical engineers with aviation industry experience",
    weight: 8,
    isActive: true,
    tags: ["aviation", "engineering", "mechanical", "aircraft"]
  },
  {
    question: "Search for candidates with electronics engineering and aviation experience",
    category: "job_to_resume",
    subCategory: "aviation_aerospace",
    description: "Find electronics engineers with aviation systems knowledge",
    weight: 8,
    isActive: true,
    tags: ["electronics", "engineering", "aviation", "systems"]
  },
  {
    question: "Find resumes for civil engineering positions in aviation sector",
    category: "job_to_resume",
    subCategory: "aviation_aerospace",
    description: "Match civil engineers with aviation infrastructure experience",
    weight: 7,
    isActive: true,
    tags: ["civil-engineering", "aviation", "infrastructure"]
  },
  {
    question: "Search for candidates with computer engineering and aviation systems experience",
    category: "job_to_resume",
    subCategory: "aviation_aerospace",
    description: "Find computer engineers with aviation systems expertise",
    weight: 8,
    isActive: true,
    tags: ["computer-engineering", "aviation", "systems", "software"]
  },
  {
    question: "Find resumes for fire protection engineering in aviation",
    category: "job_to_resume",
    subCategory: "aviation_aerospace",
    description: "Match fire protection engineers with aviation safety background",
    weight: 7,
    isActive: true,
    tags: ["fire-protection", "engineering", "aviation", "safety"]
  },
  {
    question: "Search for candidates with engineering technician experience in aviation",
    category: "job_to_resume",
    subCategory: "aviation_aerospace",
    description: "Find engineering technicians with aviation industry experience",
    weight: 7,
    isActive: true,
    tags: ["engineering-technician", "aviation", "technical", "support"]
  },

  // =====================================================
  // Job-to-Resume Matching - Engineering Positions
  // =====================================================
  {
    question: "Find resumes for General Engineer positions with technical expertise",
    category: "job_to_resume",
    subCategory: "engineering",
    description: "Match general engineers with broad technical backgrounds",
    weight: 8,
    isActive: true,
    tags: ["general-engineer", "technical", "engineering", "design"]
  },
  {
    question: "Search for candidates with mechanical engineering and design experience",
    category: "job_to_resume",
    subCategory: "engineering",
    description: "Find mechanical engineers with design and development expertise",
    weight: 8,
    isActive: true,
    tags: ["mechanical-engineering", "design", "development", "cad"]
  },
  {
    question: "Find resumes for Computer Engineer positions with software development skills",
    category: "job_to_resume",
    subCategory: "engineering",
    description: "Match computer engineers with software development experience",
    weight: 9,
    isActive: true,
    tags: ["computer-engineering", "software", "development", "programming"]
  },
  {
    question: "Search for candidates with electronics engineering and systems experience",
    category: "job_to_resume",
    subCategory: "engineering",
    description: "Find electronics engineers with systems integration expertise",
    weight: 8,
    isActive: true,
    tags: ["electronics", "engineering", "systems", "integration"]
  },
  {
    question: "Find resumes for Civil Engineer positions with infrastructure experience",
    category: "job_to_resume",
    subCategory: "engineering",
    description: "Match civil engineers with infrastructure and construction background",
    weight: 8,
    isActive: true,
    tags: ["civil-engineering", "infrastructure", "construction", "design"]
  },
  {
    question: "Search for candidates with engineering technician and technical support experience",
    category: "job_to_resume",
    subCategory: "engineering",
    description: "Find engineering technicians with technical support skills",
    weight: 7,
    isActive: true,
    tags: ["engineering-technician", "technical-support", "maintenance"]
  },
  {
    question: "Find resumes for Fire Protection Engineer positions with safety experience",
    category: "job_to_resume",
    subCategory: "engineering",
    description: "Match fire protection engineers with safety systems expertise",
    weight: 7,
    isActive: true,
    tags: ["fire-protection", "safety", "engineering", "systems"]
  },
  {
    question: "Search for candidates with engineering and project management experience",
    category: "job_to_resume",
    subCategory: "engineering",
    description: "Find engineers with project management and leadership skills",
    weight: 9,
    isActive: true,
    tags: ["engineering", "project-management", "leadership", "planning"]
  },
  {
    question: "Find resumes for engineering positions requiring security clearance",
    category: "job_to_resume",
    subCategory: "engineering",
    description: "Match engineers with active security clearances",
    weight: 9,
    isActive: true,
    tags: ["engineering", "security-clearance", "government", "classified"]
  },
  {
    question: "Search for candidates with engineering and government contracting experience",
    category: "job_to_resume",
    subCategory: "engineering",
    description: "Find engineers with government contracting background",
    weight: 8,
    isActive: true,
    tags: ["engineering", "government", "contracting", "federal"]
  },

  // =====================================================
  // Job-to-Resume Matching - General Professional
  // =====================================================
  {
    question: "Find resumes for software engineering positions with Python and JavaScript experience",
    category: "job_to_resume",
    subCategory: "software_engineering",
    description: "Match software engineers proficient in Python and JavaScript",
    weight: 9,
    isActive: true,
    tags: ["software-engineering", "python", "javascript", "programming"]
  },
  {
    question: "Search for candidates with 5+ years of project management experience",
    category: "job_to_resume",
    subCategory: "project_management",
    description: "Find experienced project managers with proven track record",
    weight: 8,
    isActive: true,
    tags: ["project-management", "experience", "leadership", "pmp"]
  },
  {
    question: "Find resumes for data analyst positions with SQL and Python skills",
    category: "job_to_resume",
    subCategory: "data_analytics",
    description: "Match data analysts with SQL and Python proficiency",
    weight: 9,
    isActive: true,
    tags: ["data-analyst", "sql", "python", "analytics"]
  },
  {
    question: "Search for candidates with security clearance and government experience",
    category: "job_to_resume",
    subCategory: "government",
    description: "Find professionals with active clearances and government background",
    weight: 9,
    isActive: true,
    tags: ["security-clearance", "government", "federal", "classified"]
  },
  {
    question: "Find resumes for cybersecurity positions with network security experience",
    category: "job_to_resume",
    subCategory: "cybersecurity",
    description: "Match cybersecurity professionals with network security expertise",
    weight: 9,
    isActive: true,
    tags: ["cybersecurity", "network-security", "infosec", "security"]
  },
  {
    question: "Search for candidates with cloud computing and AWS experience",
    category: "job_to_resume",
    subCategory: "cloud_computing",
    description: "Find cloud engineers with AWS platform experience",
    weight: 9,
    isActive: true,
    tags: ["cloud-computing", "aws", "devops", "infrastructure"]
  },
  {
    question: "Find resumes for financial analyst positions with Excel and modeling experience",
    category: "job_to_resume",
    subCategory: "finance",
    description: "Match financial analysts with modeling and Excel expertise",
    weight: 8,
    isActive: true,
    tags: ["financial-analyst", "excel", "modeling", "finance"]
  },
  {
    question: "Search for candidates with leadership experience in technical teams",
    category: "job_to_resume",
    subCategory: "leadership",
    description: "Find technical leaders with team management experience",
    weight: 8,
    isActive: true,
    tags: ["leadership", "technical", "management", "team-lead"]
  },
  {
    question: "Find resumes for business analyst positions with requirements gathering experience",
    category: "job_to_resume",
    subCategory: "business_analysis",
    description: "Match business analysts with requirements analysis skills",
    weight: 8,
    isActive: true,
    tags: ["business-analyst", "requirements", "analysis", "documentation"]
  },
  {
    question: "Search for candidates with research and development experience",
    category: "job_to_resume",
    subCategory: "research",
    description: "Find R&D professionals with innovation experience",
    weight: 7,
    isActive: true,
    tags: ["research", "development", "innovation", "r&d"]
  },

  // =====================================================
  // Resume-to-Job Matching - Experience-Based
  // =====================================================
  {
    question: "Find jobs for a software engineer with 8 years of experience in web development",
    category: "resume_to_job",
    subCategory: "software_engineering",
    description: "Match experienced software engineers to appropriate positions",
    weight: 9,
    isActive: true,
    tags: ["software-engineer", "web-development", "senior", "experience"]
  },
  {
    question: "Search for positions suitable for a project manager with PMP certification",
    category: "resume_to_job",
    subCategory: "project_management",
    description: "Find project management roles for certified professionals",
    weight: 8,
    isActive: true,
    tags: ["project-manager", "pmp", "certification", "leadership"]
  },
  {
    question: "Find jobs for a data scientist with machine learning and Python expertise",
    category: "resume_to_job",
    subCategory: "data_science",
    description: "Match data scientists to ML and analytics positions",
    weight: 9,
    isActive: true,
    tags: ["data-scientist", "machine-learning", "python", "ai"]
  },
  {
    question: "Search for government positions requiring security clearance",
    category: "resume_to_job",
    subCategory: "government",
    description: "Find federal jobs for cleared professionals",
    weight: 9,
    isActive: true,
    tags: ["government", "security-clearance", "federal", "cleared"]
  },
  {
    question: "Find jobs for an aviation professional with safety management experience",
    category: "resume_to_job",
    subCategory: "aviation",
    description: "Match aviation safety professionals to relevant positions",
    weight: 9,
    isActive: true,
    tags: ["aviation", "safety", "management", "faa"]
  },
  {
    question: "Search for positions for a cybersecurity specialist with network security skills",
    category: "resume_to_job",
    subCategory: "cybersecurity",
    description: "Find cybersecurity roles for network security experts",
    weight: 9,
    isActive: true,
    tags: ["cybersecurity", "network-security", "infosec", "security"]
  },
  {
    question: "Find jobs for a cloud architect with AWS and Azure experience",
    category: "resume_to_job",
    subCategory: "cloud",
    description: "Match cloud architects to infrastructure positions",
    weight: 9,
    isActive: true,
    tags: ["cloud-architect", "aws", "azure", "infrastructure"]
  },
  {
    question: "Search for positions for a financial analyst with modeling and Excel skills",
    category: "resume_to_job",
    subCategory: "finance",
    description: "Find financial analysis roles for modeling experts",
    weight: 8,
    isActive: true,
    tags: ["financial-analyst", "modeling", "excel", "finance"]
  },
  {
    question: "Find jobs for a technical leader with team management experience",
    category: "resume_to_job",
    subCategory: "leadership",
    description: "Match technical leaders to management positions",
    weight: 8,
    isActive: true,
    tags: ["technical-leader", "management", "leadership", "team"]
  },
  {
    question: "Search for positions for a business analyst with requirements gathering experience",
    category: "resume_to_job",
    subCategory: "business_analysis",
    description: "Find business analysis roles for requirements experts",
    weight: 8,
    isActive: true,
    tags: ["business-analyst", "requirements", "analysis", "documentation"]
  },

  // =====================================================
  // Skill-Specific Searches - Technical Skills
  // =====================================================
  {
    question: "Find candidates or jobs with ArcGIS skills",
    category: "skill_search",
    subCategory: "gis",
    description: "Match GIS professionals and positions requiring ArcGIS",
    weight: 7,
    isActive: true,
    tags: ["arcgis", "gis", "mapping", "spatial"]
  },
  {
    question: "Find candidates or jobs with Survey123 skills",
    category: "skill_search",
    subCategory: "gis",
    description: "Match Survey123 experts with relevant opportunities",
    weight: 6,
    isActive: true,
    tags: ["survey123", "gis", "data-collection", "esri"]
  },
  {
    question: "Find candidates or jobs with JavaScript skills",
    category: "skill_search",
    subCategory: "programming",
    description: "Match JavaScript developers with appropriate positions",
    weight: 9,
    isActive: true,
    tags: ["javascript", "programming", "web-development", "frontend"]
  },
  {
    question: "Find candidates or jobs with Power Platform skills",
    category: "skill_search",
    subCategory: "business_intelligence",
    description: "Match Power Platform experts (PowerBI, PowerApps, Power Automate)",
    weight: 8,
    isActive: true,
    tags: ["power-platform", "powerbi", "powerapps", "microsoft"]
  },
  {
    question: "Find candidates or jobs with Tableau skills",
    category: "skill_search",
    subCategory: "business_intelligence",
    description: "Match Tableau visualization experts",
    weight: 8,
    isActive: true,
    tags: ["tableau", "visualization", "bi", "analytics"]
  },
  {
    question: "Find candidates or jobs with Python skills",
    category: "skill_search",
    subCategory: "programming",
    description: "Match Python developers with relevant opportunities",
    weight: 10,
    isActive: true,
    tags: ["python", "programming", "data-science", "backend"]
  },
  {
    question: "Find candidates or jobs with SQL skills",
    category: "skill_search",
    subCategory: "database",
    description: "Match database professionals with SQL expertise",
    weight: 9,
    isActive: true,
    tags: ["sql", "database", "queries", "data"]
  },
  {
    question: "Find candidates or jobs with AWS skills",
    category: "skill_search",
    subCategory: "cloud",
    description: "Match AWS cloud professionals",
    weight: 9,
    isActive: true,
    tags: ["aws", "cloud", "devops", "infrastructure"]
  },
  {
    question: "Find candidates or jobs with Docker skills",
    category: "skill_search",
    subCategory: "devops",
    description: "Match containerization experts",
    weight: 8,
    isActive: true,
    tags: ["docker", "containers", "devops", "kubernetes"]
  },
  {
    question: "Find candidates or jobs with machine learning expertise",
    category: "skill_search",
    subCategory: "ai_ml",
    description: "Match machine learning and AI professionals",
    weight: 9,
    isActive: true,
    tags: ["machine-learning", "ai", "data-science", "ml"]
  },

  // =====================================================
  // Location-Based Searches
  // =====================================================
  {
    question: "Find positions and candidates in Washington DC area",
    category: "location_search",
    subCategory: "metro_areas",
    description: "Match professionals and jobs in DC metropolitan area",
    weight: 7,
    isActive: true,
    tags: ["washington-dc", "dmv", "location", "metro"]
  },
  {
    question: "Find positions and candidates in California",
    category: "location_search",
    subCategory: "states",
    description: "Match professionals and jobs in California",
    weight: 7,
    isActive: true,
    tags: ["california", "location", "west-coast", "tech"]
  },
  {
    question: "Find positions and candidates in Texas",
    category: "location_search",
    subCategory: "states",
    description: "Match professionals and jobs in Texas",
    weight: 7,
    isActive: true,
    tags: ["texas", "location", "houston", "dallas"]
  },
  {
    question: "Find remote positions and candidates willing to work remotely",
    category: "location_search",
    subCategory: "remote",
    description: "Match remote work opportunities and remote-ready professionals",
    weight: 8,
    isActive: true,
    tags: ["remote", "work-from-home", "distributed", "virtual"]
  },
  {
    question: "Find positions and candidates in FAA duty locations nationwide",
    category: "location_search",
    subCategory: "faa",
    description: "Match aviation professionals to FAA locations",
    weight: 8,
    isActive: true,
    tags: ["faa", "aviation", "duty-stations", "nationwide"]
  },

  // =====================================================
  // Experience-Level Searches
  // =====================================================
  {
    question: "Find entry-level positions and recent graduates",
    category: "experience_search",
    subCategory: "entry_level",
    description: "Match junior professionals to entry-level opportunities",
    weight: 7,
    isActive: true,
    tags: ["entry-level", "junior", "graduate", "new-grad"]
  },
  {
    question: "Find mid-level positions and candidates with 3-5 years experience",
    category: "experience_search",
    subCategory: "mid_level",
    description: "Match mid-level professionals to appropriate positions",
    weight: 8,
    isActive: true,
    tags: ["mid-level", "intermediate", "3-5-years", "experienced"]
  },
  {
    question: "Find senior-level positions and candidates with 8+ years experience",
    category: "experience_search",
    subCategory: "senior_level",
    description: "Match senior professionals to leadership positions",
    weight: 9,
    isActive: true,
    tags: ["senior", "advanced", "8plus-years", "expert"]
  },
  {
    question: "Find executive positions and candidates with leadership experience",
    category: "experience_search",
    subCategory: "executive",
    description: "Match executives to C-level and director positions",
    weight: 8,
    isActive: true,
    tags: ["executive", "c-level", "director", "leadership"]
  },

  // =====================================================
  // Government & Security Clearance
  // =====================================================
  {
    question: "Find resumes for government positions requiring security clearance",
    category: "government_clearance",
    subCategory: "clearance_required",
    description: "Match cleared professionals to government positions",
    weight: 10,
    isActive: true,
    tags: ["security-clearance", "government", "federal", "classified"]
  },
  {
    question: "Find candidates with US Public Trust clearance",
    category: "government_clearance",
    subCategory: "public_trust",
    description: "Match public trust cleared professionals",
    weight: 8,
    isActive: true,
    tags: ["public-trust", "clearance", "government", "federal"]
  },
  {
    question: "Search for positions requiring TS/SCI with CI polygraph",
    category: "government_clearance",
    subCategory: "ts_sci",
    description: "Find top secret positions with polygraph requirements",
    weight: 10,
    isActive: true,
    tags: ["ts-sci", "polygraph", "top-secret", "clearance"]
  },
  {
    question: "Find candidates with DoD Secret clearance",
    category: "government_clearance",
    subCategory: "secret",
    description: "Match secret cleared professionals to DoD positions",
    weight: 9,
    isActive: true,
    tags: ["secret", "dod", "clearance", "defense"]
  },
  {
    question: "Search for candidates with government contracting experience",
    category: "government_clearance",
    subCategory: "contracting",
    description: "Find professionals with federal contracting background",
    weight: 8,
    isActive: true,
    tags: ["government", "contracting", "federal", "procurement"]
  },

  // =====================================================
  // Industry-Specific Searches
  // =====================================================
  {
    question: "Find candidates or jobs in the aerospace and defense industry",
    category: "industry_search",
    subCategory: "aerospace_defense",
    description: "Match aerospace and defense professionals",
    weight: 9,
    isActive: true,
    tags: ["aerospace", "defense", "aviation", "military"]
  },
  {
    question: "Find candidates or jobs in the technology and software industry",
    category: "industry_search",
    subCategory: "technology",
    description: "Match tech industry professionals",
    weight: 9,
    isActive: true,
    tags: ["technology", "software", "tech", "it"]
  },
  {
    question: "Find candidates or jobs in the government and public sector",
    category: "industry_search",
    subCategory: "government",
    description: "Match public sector professionals",
    weight: 9,
    isActive: true,
    tags: ["government", "public-sector", "federal", "state"]
  },
  {
    question: "Find candidates or jobs in cybersecurity and information security",
    category: "industry_search",
    subCategory: "cybersecurity",
    description: "Match information security professionals",
    weight: 9,
    isActive: true,
    tags: ["cybersecurity", "infosec", "security", "cyber"]
  },

  // =====================================================
  // Advanced Semantic Searches
  // =====================================================
  {
    question: "Find candidates with experience in safety-critical systems and regulatory compliance",
    category: "advanced_semantic",
    subCategory: "safety_compliance",
    description: "Match professionals with safety and compliance expertise",
    weight: 9,
    isActive: true,
    tags: ["safety", "compliance", "regulatory", "critical-systems"]
  },
  {
    question: "Search for positions requiring expertise in complex technical systems and problem-solving",
    category: "advanced_semantic",
    subCategory: "complex_systems",
    description: "Find roles requiring advanced technical problem-solving",
    weight: 8,
    isActive: true,
    tags: ["complex-systems", "problem-solving", "technical", "architecture"]
  },
  {
    question: "Find candidates with background in government contracting and federal regulations",
    category: "advanced_semantic",
    subCategory: "federal_contracting",
    description: "Match professionals with federal contracting knowledge",
    weight: 8,
    isActive: true,
    tags: ["government", "contracting", "federal", "regulations"]
  },
  {
    question: "Search for positions requiring experience in aviation safety and operational procedures",
    category: "advanced_semantic",
    subCategory: "aviation_operations",
    description: "Find aviation operations and safety management roles",
    weight: 9,
    isActive: true,
    tags: ["aviation", "safety", "operations", "procedures"]
  },
  {
    question: "Find candidates with expertise in engineering design and technical documentation",
    category: "advanced_semantic",
    subCategory: "engineering_documentation",
    description: "Match engineers with design and documentation skills",
    weight: 7,
    isActive: true,
    tags: ["engineering", "design", "documentation", "technical-writing"]
  },
  {
    question: "Search for positions requiring project coordination and stakeholder management",
    category: "advanced_semantic",
    subCategory: "project_coordination",
    description: "Find project coordination and stakeholder management roles",
    weight: 8,
    isActive: true,
    tags: ["project-management", "coordination", "stakeholder", "communication"]
  },
  {
    question: "Find candidates with background in technical analysis and data-driven decision making",
    category: "advanced_semantic",
    subCategory: "technical_analysis",
    description: "Match analytical professionals with data-driven expertise",
    weight: 8,
    isActive: true,
    tags: ["technical-analysis", "data-driven", "analytics", "decision-making"]
  },
  {
    question: "Search for positions requiring expertise in system integration and cross-functional collaboration",
    category: "advanced_semantic",
    subCategory: "system_integration",
    description: "Find systems integration and collaboration roles",
    weight: 8,
    isActive: true,
    tags: ["system-integration", "collaboration", "cross-functional", "teamwork"]
  },
  {
    question: "Find candidates with experience in quality assurance and process improvement",
    category: "advanced_semantic",
    subCategory: "quality_improvement",
    description: "Match QA and process improvement professionals",
    weight: 7,
    isActive: true,
    tags: ["quality-assurance", "process-improvement", "qa", "continuous-improvement"]
  },
  {
    question: "Search for positions requiring background in risk assessment and mitigation strategies",
    category: "advanced_semantic",
    subCategory: "risk_management",
    description: "Find risk management and mitigation roles",
    weight: 8,
    isActive: true,
    tags: ["risk-management", "risk-assessment", "mitigation", "compliance"]
  },
];

export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const insertedIds = [];

    console.log(`Starting to seed ${VECTOR_SEARCH_PROMPTS.length} vector search prompts...`);

    for (const question of VECTOR_SEARCH_PROMPTS) {
      const id = await ctx.db.insert("semanticQuestions", {
        ...question,
        usageCount: 0,
        effectiveness: undefined,
        createdBy: "system",
        createdAt: now,
        updatedAt: now,
      });
      insertedIds.push(id);
    }

    console.log(`Successfully seeded ${insertedIds.length} vector search prompts!`);

    return {
      success: true,
      count: insertedIds.length,
      ids: insertedIds,
    };
  },
});

// Get count of existing questions
export const getCount = internalMutation({
  args: {},
  handler: async (ctx) => {
    const allQuestions = await ctx.db.query("semanticQuestions").collect();
    
    return {
      total: allQuestions.length,
      byCategory: allQuestions.reduce((acc, q) => {
        acc[q.category] = (acc[q.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  },
});

