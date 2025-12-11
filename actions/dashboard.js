"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const defaultInsights = (industry) => ({
  salaryRanges: [
    { role: "Junior Engineer", min: 30000, max: 50000, median: 40000, location: "Remote" },
    { role: "Mid Engineer", min: 50000, max: 90000, median: 70000, location: "Remote" },
    { role: "Senior Engineer", min: 90000, max: 140000, median: 115000, location: "Remote" },
    { role: "Manager", min: 100000, max: 160000, median: 130000, location: "Remote" },
    { role: "Director", min: 140000, max: 200000, median: 170000, location: "Remote" }
  ],
  growthRate: 8,
  demandLevel: "High",
  topSkills: ["Problem Solving", "Communication", "Leadership", "Time Management", "Teamwork"],
  marketOutlook: "Positive",
  keyTrends: ["AI Adoption", "Automation", "Remote Work", "Cloud Migration", "Data-Driven Decisions"],
  recommendedSkills: ["SQL", "Python", "Project Management", "Public Speaking", "Writing"]
});

export const generateAIInsights = async (industry) => {
  const apiKey = process.env.GEMINI_API_KEY;
  const prompt = `
          Analyze the current state of the ${industry} industry and provide insights in ONLY the following JSON format without any additional notes or explanations:
          {
            "salaryRanges": [
              { "role": "string", "min": number, "max": number, "median": number, "location": "string" }
            ],
            "growthRate": number,
            "demandLevel": "High" | "Medium" | "Low",
            "topSkills": ["skill1", "skill2"],
            "marketOutlook": "Positive" | "Neutral" | "Negative",
            "keyTrends": ["trend1", "trend2"],
            "recommendedSkills": ["skill1", "skill2"]
          }
          
          IMPORTANT: Return ONLY the JSON. No additional text, notes, or markdown formatting.
          Include at least 5 common roles for salary ranges.
          Growth rate should be a percentage.
          Include at least 5 skills and trends.
        `;

  if (!apiKey) {
    return defaultInsights(industry);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();
    return JSON.parse(cleanedText);
  } catch (e) {
    return defaultInsights(industry);
  }
};

export async function getIndustryInsights() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    include: {
      industryInsight: true,
    },
  });

  if (!user) throw new Error("User not found");

  // If no insights exist, generate them
  if (!user.industryInsight) {
    const insights = await generateAIInsights(user.industry);

    const industryInsight = await db.industryInsight.create({
      data: {
        industry: user.industry,
        ...insights,
        nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return industryInsight;
  }

  return user.industryInsight;
}
