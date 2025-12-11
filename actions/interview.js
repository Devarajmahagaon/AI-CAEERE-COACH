"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const fallbackQuiz = (user) => {
  const industry = (user?.industry || "software").toLowerCase();
  const pool = [
    {
      question: `Which of the following best describes a core design concept in ${industry}?`,
      options: ["Loose coupling", "Global state everywhere", "Hidden side-effects", "No testing needed"],
      correctAnswer: "Loose coupling",
      explanation: "Loose coupling improves maintainability and testability.",
    },
    {
      question: "Which HTTP method is idempotent?",
      options: ["POST", "PUT", "PATCH", "CONNECT"],
      correctAnswer: "PUT",
      explanation: "PUT replaces a resource and is idempotent by definition.",
    },
    {
      question: "What is the time complexity of binary search on a sorted array?",
      options: ["O(n)", "O(log n)", "O(n log n)", "O(1)"],
      correctAnswer: "O(log n)",
      explanation: "Each step halves the search space.",
    },
    {
      question: "Which data structure operates on a FIFO principle?",
      options: ["Stack", "Queue", "Tree", "Graph"],
      correctAnswer: "Queue",
      explanation: "Queues process elements First-In-First-Out.",
    },
    {
      question: "Which SQL clause filters rows before grouping?",
      options: ["WHERE", "HAVING", "GROUP BY", "ORDER BY"],
      correctAnswer: "WHERE",
      explanation: "WHERE filters rows; HAVING filters groups.",
    },
    {
      question: "What does ACID stand for in databases?",
      options: [
        "Atomicity, Consistency, Isolation, Durability",
        "Accuracy, Consistency, Isolation, Durability",
        "Atomicity, Concurrency, Integrity, Durability",
        "Availability, Consistency, Isolation, Durability",
      ],
      correctAnswer: "Atomicity, Consistency, Isolation, Durability",
      explanation: "ACID are key transaction properties.",
    },
    {
      question: "Which HTTP status code represents 'Unauthorized' (no valid credentials)?",
      options: ["400", "401", "403", "404"],
      correctAnswer: "401",
      explanation: "401 indicates authentication is required or failed.",
    },
    {
      question: "Which of these is a NoSQL database?",
      options: ["PostgreSQL", "MySQL", "MongoDB", "SQLite"],
      correctAnswer: "MongoDB",
      explanation: "MongoDB is a document-oriented NoSQL database.",
    },
    {
      question: "What does CSS Flexbox primarily control?",
      options: ["2D grid layout", "One‑dimensional layout", "Server rendering", "Accessibility"],
      correctAnswer: "One‑dimensional layout",
      explanation: "Flexbox lays out items in a row or column.",
    },
    {
      question: "Which JavaScript method creates a shallow copy of an array?",
      options: ["push", "map", "splice", "sort"],
      correctAnswer: "map",
      explanation: "map returns a new array without mutating the original.",
    },
    {
      question: "What is the purpose of unit testing?",
      options: [
        "Test integrated systems only",
        "Verify individual components in isolation",
        "Measure performance",
        "Deploy automatically",
      ],
      correctAnswer: "Verify individual components in isolation",
      explanation: "Unit tests validate small pieces of code independently.",
    },
    {
      question: "Which cloud model gives you most control over OS and runtime?",
      options: ["SaaS", "PaaS", "IaaS", "FaaS"],
      correctAnswer: "IaaS",
      explanation: "IaaS provides virtualized infrastructure with OS-level control.",
    },
    {
      question: "What does 'idempotent' mean in API design?",
      options: [
        "Multiple calls have the same effect as a single call",
        "Calls are always cached",
        "Calls are always asynchronous",
        "Calls must be retried",
      ],
      correctAnswer: "Multiple calls have the same effect as a single call",
      explanation: "Idempotent operations can be safely retried.",
    },
    {
      question: "Which one is NOT a JavaScript primitive?",
      options: ["string", "number", "object", "boolean"],
      correctAnswer: "object",
      explanation: "Objects are reference types; not primitives.",
    },
    {
      question: "What does Git 'rebase' do?",
      options: [
        "Combines multiple commits into one",
        "Moves/rewrites commits onto another base",
        "Discards local changes",
        "Creates a new branch",
      ],
      correctAnswer: "Moves/rewrites commits onto another base",
      explanation: "Rebase reapplies commits on a new base tip.",
    },
  ];

  // Shuffle helper
  const shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // Pick 10 unique questions and shuffle options for each
  const selected = shuffle(pool.slice()).slice(0, 10).map((q) => ({
    ...q,
    options: shuffle(q.options.slice()),
  }));

  return selected;
};

export async function generateQuiz() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    select: {
      industry: true,
      skills: true,
    },
  });

  if (!user) throw new Error("User not found");

  const prompt = `
    Generate 10 technical interview questions for a ${
      user.industry
    } professional${
    user.skills?.length ? ` with expertise in ${user.skills.join(", ")}` : ""
  }.
    
    Each question should be multiple choice with 4 options.
    
    Return the response in this JSON format only, no additional text:
    {
      "questions": [
        {
          "question": "string",
          "options": ["string", "string", "string", "string"],
          "correctAnswer": "string",
          "explanation": "string"
        }
      ]
    }
  `;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return fallbackQuiz(user);
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();
    const quiz = JSON.parse(cleanedText);

    return quiz.questions;
  } catch (error) {
    console.error("Error generating quiz:", error);
    return fallbackQuiz(user);
  }
}

export async function saveQuizResult(questions, answers, score) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  const questionResults = questions.map((q, index) => ({
    question: q.question,
    answer: q.correctAnswer,
    userAnswer: answers[index],
    isCorrect: q.correctAnswer === answers[index],
    explanation: q.explanation,
  }));

  // Get wrong answers
  const wrongAnswers = questionResults.filter((q) => !q.isCorrect);

  // Only generate improvement tips if there are wrong answers
  let improvementTip = null;
  if (wrongAnswers.length > 0) {
    const wrongQuestionsText = wrongAnswers
      .map(
        (q) =>
          `Question: "${q.question}"\nCorrect Answer: "${q.answer}"\nUser Answer: "${q.userAnswer}"`
      )
      .join("\n\n");

    const improvementPrompt = `
      The user got the following ${user.industry} technical interview questions wrong:

      ${wrongQuestionsText}

      Based on these mistakes, provide a concise, specific improvement tip.
      Focus on the knowledge gaps revealed by these wrong answers.
      Keep the response under 2 sentences and make it encouraging.
      Don't explicitly mention the mistakes, instead focus on what to learn/practice.
    `;

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        improvementTip =
          "Focus on revising the key concepts behind the questions you missed. Re-read explanations and practice with similar problems.";
      } else {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const tipResult = await model.generateContent(improvementPrompt);
        improvementTip = tipResult.response.text().trim();
      }
    } catch (error) {
      console.error("Error generating improvement tip:", error);
      improvementTip =
        "Review the relevant topics and practice targeted exercises to strengthen weak areas.";
    }
  }

  try {
    const assessment = await db.assessment.create({
      data: {
        userId: user.id,
        quizScore: score,
        questions: questionResults,
        category: "Technical",
        improvementTip,
      },
    });

    return assessment;
  } catch (error) {
    console.error("Error saving quiz result:", error);
    throw new Error("Failed to save quiz result");
  }
}

export async function getAssessments() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  try {
    const assessments = await db.assessment.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return assessments;
  } catch (error) {
    console.error("Error fetching assessments:", error);
    throw new Error("Failed to fetch assessments");
  }
}
