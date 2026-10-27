// Fictional sample analysis (from the backend_intern_good_fit evaluation case) shaped exactly like the API response.
// It powers the sample page that shows the result screen without an account; the score follows the backend formula.

import type { AnalysisDetail, InterviewQuestion } from "@/lib/api/types";

export const sampleInterviewQuestions: InterviewQuestion[] = [
  {
    question:
      "Walk me through how you would write an integration test for one of the order-service endpoints. What would you run for real, and what would you replace?",
    category: "gap",
    rationale: "Integration testing is a must-have that the CV shows only partly.",
    related_requirement_ids: ["r4"],
  },
  {
    question:
      "How did you design the PostgreSQL schema for the order service, and what would you change about it today?",
    category: "technical",
    rationale: "Schema design is the strongest database evidence in the CV, so expect a deeper follow-up.",
    related_requirement_ids: ["r2"],
  },
  {
    question:
      "In Inventory Tracker, why did you choose FastAPI and SQLAlchemy, and how is the Docker Compose setup organised?",
    category: "project",
    rationale: "The project carries both the framework and the Docker evidence.",
    related_requirement_ids: ["r1", "r7"],
  },
  {
    question:
      "Tell me about a pull request you reviewed where you asked for changes. How did you phrase the feedback?",
    category: "behavioral",
    rationale: "Code review is listed as a must-have and the CV mentions open-source reviews.",
    related_requirement_ids: ["r5"],
  },
  {
    question:
      "You have not used Kubernetes yet. How would you approach deploying the tracker to a cluster?",
    category: "gap",
    rationale: "Kubernetes is a nice-to-have with no support in the CV; a clear plan is a good answer.",
    related_requirement_ids: ["r8"],
  },
];

export const sampleAnalysis: AnalysisDetail = {
  id: "sample",
  status: "completed",
  output_language: "en",
  resume_id: "sample-resume",
  job_description_id: "sample-posting",
  resume_title: "Jane Doe — CV, September 2026",
  job_title: "Junior Backend Developer",
  company: null,
  score: 79,
  fit_level: "strong",
  created_at: "2026-10-23T09:12:00Z",
  completed_at: "2026-10-23T09:12:41Z",
  error_code: null,
  error_message: null,
  interview_questions: sampleInterviewQuestions,
  result: {
    overall: {
      score: 79,
      fit_level: "strong",
      summary:
        "Your core backend skills are well evidenced by the Acme internship and the Inventory Tracker project. Two must-haves are only partly shown: a full year with a Python framework and integration testing. Kubernetes, a nice-to-have, is absent.",
      score_explanation:
        "Each requirement counts as matched (1), partial (0.5) or missing (0); must-have requirements weigh twice as much as nice-to-have ones. The score is the weighted percentage.",
      limitations: [
        "A listed skill shows that you used it, not how deeply: “matched” means evidenced, not mastered.",
        "Only the CV text was analysed. Projects on GitHub, references and certificates were not checked.",
      ],
    },
    requirements: [
      {
        id: "r1",
        text: "1+ years with a Python web framework (Django or FastAPI)",
        category: "experience",
        importance: "must_have",
        status: "partial",
        reasoning:
          "FastAPI is used in an internship and a project, but the internship lasted four months, so a full year is not clearly shown.",
        evidence: [
          { evidence_id: "e1", quote: "Python and FastAPI", similarity: 0.82 },
          { evidence_id: "e6", quote: "FastAPI backend", similarity: 0.76 },
        ],
      },
      {
        id: "r2",
        text: "Solid SQL and relational database skills, PostgreSQL preferred",
        category: "technical_skill",
        importance: "must_have",
        status: "matched",
        reasoning:
          "Designing PostgreSQL schemas in the internship and using PostgreSQL in a project show hands-on relational database work.",
        evidence: [
          { evidence_id: "e2", quote: "Designed PostgreSQL schemas", similarity: 0.86 },
          { evidence_id: "e6", quote: "SQLAlchemy and PostgreSQL", similarity: 0.74 },
        ],
      },
      {
        id: "r3",
        text: "Build and maintain REST APIs",
        category: "technical_skill",
        importance: "must_have",
        status: "matched",
        reasoning: "REST endpoints were built during the internship.",
        evidence: [{ evidence_id: "e1", quote: "Built REST endpoints", similarity: 0.88 }],
      },
      {
        id: "r4",
        text: "Write unit and integration tests",
        category: "technical_skill",
        importance: "must_have",
        status: "partial",
        reasoning: "Unit tests with pytest are evidenced. No line mentions integration tests.",
        evidence: [
          { evidence_id: "e3", quote: "Wrote pytest unit tests", similarity: 0.83 },
          { evidence_id: "e9", quote: "pytest", similarity: 0.61 },
        ],
      },
      {
        id: "r5",
        text: "Comfortable with Git and code review workflows",
        category: "tool",
        importance: "must_have",
        status: "matched",
        reasoning: "Reviewing and merging pull requests is direct evidence of a code review workflow.",
        evidence: [
          { evidence_id: "e8", quote: "Reviewed and merged pull requests on GitHub", similarity: 0.81 },
        ],
      },
      {
        id: "r6",
        text: "Good written communication in English",
        category: "soft_skill",
        importance: "must_have",
        status: "matched",
        reasoning: "Weekly written feedback in English is concrete evidence.",
        evidence: [{ evidence_id: "e5", quote: "weekly feedback emails in English", similarity: 0.77 }],
      },
      {
        id: "r7",
        text: "Familiarity with Docker for local development",
        category: "tool",
        importance: "nice_to_have",
        status: "matched",
        reasoning: "The project was containerised with Docker Compose for local development.",
        evidence: [
          { evidence_id: "e7", quote: "Docker Compose for local development", similarity: 0.85 },
          { evidence_id: "e9", quote: "Docker basics", similarity: 0.58 },
        ],
      },
      {
        id: "r8",
        text: "Experience with Kubernetes",
        category: "tool",
        importance: "nice_to_have",
        status: "missing",
        reasoning: "The CV does not mention Kubernetes or any container orchestration.",
        evidence: [],
      },
    ],
    candidate_evidence: [
      {
        id: "e1",
        text: "Built REST endpoints with Python and FastAPI as a backend intern at Acme Corp (Jun–Sep 2025).",
        section: "Experience",
        skills: ["Python", "FastAPI", "REST"],
      },
      {
        id: "e2",
        text: "Designed PostgreSQL schemas for the order service.",
        section: "Experience",
        skills: ["PostgreSQL", "SQL"],
      },
      {
        id: "e3",
        text: "Wrote pytest unit tests for the order service.",
        section: "Experience",
        skills: ["pytest"],
      },
      {
        id: "e4",
        text: "Led weekly lab sessions for 40 students as a Data Structures teaching assistant (2024).",
        section: "Experience",
        skills: ["Teaching"],
      },
      {
        id: "e5",
        text: "Wrote weekly feedback emails in English to students.",
        section: "Experience",
        skills: ["English"],
      },
      {
        id: "e6",
        text: "Inventory Tracker: FastAPI backend with SQLAlchemy and PostgreSQL, React frontend.",
        section: "Projects",
        skills: ["FastAPI", "SQLAlchemy", "PostgreSQL", "React"],
      },
      {
        id: "e7",
        text: "Containerised Inventory Tracker with Docker Compose for local development.",
        section: "Projects",
        skills: ["Docker"],
      },
      {
        id: "e8",
        text: "Reviewed and merged pull requests on GitHub for a small open-source CLI tool.",
        section: "Projects",
        skills: ["Git", "GitHub", "Code review"],
      },
      {
        id: "e9",
        text: "Python, FastAPI, SQL, PostgreSQL, Git, Docker basics, pytest.",
        section: "Skills",
        skills: ["Python", "FastAPI", "SQL", "PostgreSQL", "Git", "Docker", "pytest"],
      },
    ],
    suggestions: [
      {
        title: "Add an integration test to Inventory Tracker and name it in the CV",
        detail:
          "Write one API test that runs against a real test database, then add a line such as “API integration tests with pytest and a PostgreSQL test database” under Projects. It closes a must-have gap.",
        target: "project",
        priority: "high",
        related_requirement_ids: ["r4"],
      },
      {
        title: "Make the length of your FastAPI experience visible",
        detail:
          "Add dates to Inventory Tracker and state how long you have worked with FastAPI in total, so the reader can add the internship and project time together.",
        target: "cv_section",
        priority: "high",
        related_requirement_ids: ["r1"],
      },
      {
        title: "Prepare a short answer on deploying the tracker to Kubernetes",
        detail:
          "It is a plus, not a must. Explaining how you would move your Docker Compose setup to a cluster is enough at this level.",
        target: "interview_topic",
        priority: "medium",
        related_requirement_ids: ["r8"],
      },
      {
        title: "Replace “Docker basics” with what you actually did",
        detail:
          "“Docker Compose for a local multi-service setup” is stronger and is already true in your Projects section.",
        target: "cv_section",
        priority: "low",
        related_requirement_ids: ["r7"],
      },
    ],
  },
};
