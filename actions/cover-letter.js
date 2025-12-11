"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const fallbackLetter = ({ user, data }) => `
Dear Hiring Manager,

I am excited to apply for the ${data.jobTitle} position at ${data.companyName}. With ${user.experience ?? 0} year(s) of experience in ${user.industry ?? "the industry"}, I have developed strong skills in ${
  (user.skills && user.skills.length ? user.skills : ["communication", "problem solving"]).join(
    ", "
  )
} that align well with your needs.

In my previous roles, I have contributed to outcomes such as:
- Delivering high-quality features on time
- Collaborating effectively with cross-functional teams
- Continuously improving processes and documentation

I am particularly interested in this opportunity at ${
  data.companyName
} because it aligns with my background and goals. I believe my experience and proactive approach will enable me to contribute quickly and effectively to your team.

Thank you for considering my application. I would welcome the opportunity to discuss how I can add value to ${
  data.companyName
}.

Sincerely,
${user.name ?? "Candidate"}
`;

export async function generateCoverLetter(data) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  const prompt = `
    Write a professional cover letter for a ${data.jobTitle} position at ${data.companyName}.
    
    About the candidate:
    - Industry: ${user.industry}
    - Years of Experience: ${user.experience}
    - Skills: ${user.skills?.join(", ")}
    - Professional Background: ${user.bio}
    
    Job Description:
    ${data.jobDescription}
    
    Requirements:
    1. Use a professional, enthusiastic tone
    2. Highlight relevant skills and experience
    3. Show understanding of the company's needs
    4. Keep it concise (max 400 words)
    5. Use proper business letter formatting in markdown
    6. Include specific examples of achievements
    7. Relate candidate's background to job requirements
    
    Format the letter in markdown.
  `;

  const apiKey = process.env.GEMINI_API_KEY;
  try {
    if (!apiKey) {
      const content = fallbackLetter({ user, data });
      return await db.coverLetter.create({
        data: {
          content,
          jobDescription: data.jobDescription,
          companyName: data.companyName,
          jobTitle: data.jobTitle,
          status: "completed",
          userId: user.id,
        },
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const content = result.response.text().trim();

    return await db.coverLetter.create({
      data: {
        content,
        jobDescription: data.jobDescription,
        companyName: data.companyName,
        jobTitle: data.jobTitle,
        status: "completed",
        userId: user.id,
      },
    });
  } catch (error) {
    const content = fallbackLetter({ user, data });
    return await db.coverLetter.create({
      data: {
        content,
        jobDescription: data.jobDescription,
        companyName: data.companyName,
        jobTitle: data.jobTitle,
        status: "completed",
        userId: user.id,
      },
    });
  }
}

export async function getCoverLetters() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  return await db.coverLetter.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getCoverLetter(id) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  return await db.coverLetter.findUnique({
    where: {
      id,
      userId: user.id,
    },
  });
}

export async function deleteCoverLetter(id) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  return await db.coverLetter.delete({
    where: {
      id,
      userId: user.id,
    },
  });
}
