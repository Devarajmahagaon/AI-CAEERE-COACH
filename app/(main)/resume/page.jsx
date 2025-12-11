import { getResume } from "@/actions/resume";
import ResumeBuilder from "./_components/resume-builder";
import { redirect } from "next/navigation";

export default async function ResumePage() {
  try {
    const resume = await getResume();
    return (
      <div className="container mx-auto py-6">
        <ResumeBuilder initialContent={resume?.content} />
      </div>
    );
  } catch (e) {
    redirect("/sign-in");
  }
}
