import { createClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const interviewId = formData.get("interview_id") as string;

    const videoCount = Array.from(formData.keys()).filter((key) => key.startsWith("video_")).length;

    let fullTranscript = "";

    // For now, just save the interview with placeholder data
    for (let i = 0; i < videoCount; i++) {
      const question = formData.get(`question_${i}`) as string;
      fullTranscript += `Q: ${question}\nA: [Video recorded]\n\n`;
    }

    // Save to database
    const { data, error } = await supabase.from("response").insert([
      {
        interview_id: interviewId,
        details: {
          transcript: fullTranscript,
          video_count: videoCount,
          submitted_at: new Date().toISOString(),
        },
        is_analysed: true,
        is_ended: true,
      },
    ]);

    if (error) {
      console.error("Database error:", error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: "Interview submitted successfully",
      data,
    });
  } catch (error) {
    console.error("Video submission error:", error);
    return NextResponse.json({ error: "Failed to process video interview" }, { status: 500 });
  }
}
