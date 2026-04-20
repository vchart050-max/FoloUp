import fs from "fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";
import FormData from "form-data";
import { type NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
);

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "100mb",
    },
  },
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const interviewId = formData.get("interview_id") as string;

    let fullTranscript = "";
    const videoCount = Array.from(formData.keys()).filter((key) => key.startsWith("video_")).length;

    // Process each video
    for (let i = 0; i < videoCount; i++) {
      const videoBlob = formData.get(`video_${i}`) as Blob;
      const question = formData.get(`question_${i}`) as string;

      if (!videoBlob) {
        continue;
      }

      // Convert blob to buffer
      const buffer = Buffer.from(await videoBlob.arrayBuffer());

      // Transcribe with Deepgram
      const deepgramFormData = new FormData();
      deepgramFormData.append("file", buffer, `video_${i}.webm`);

      const transcriptResponse = await axios.post(
        "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true",
        deepgramFormData,
        {
          headers: {
            Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
            ...deepgramFormData.getHeaders(),
          },
        },
      );

      const transcript =
        transcriptResponse.data.results?.channels?.[0]?.alternatives?.[0]?.transcript ||
        "No transcript available";

      fullTranscript += `Q: ${question}\nA: ${transcript}\n\n`;
    }

    // Score with Claude
    const claudeResponse = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: "claude-opus-4-20250805",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: `Score this interview transcript. Provide scores for:
1. Technical Knowledge (1-10)
2. Communication (1-10)
3. Overall (1-10)
4. Brief feedback

Transcript:
${fullTranscript}

Respond in JSON format only:
{
  "technical_knowledge": X,
  "communication": X,
  "overall": X,
  "feedback": "..."
}`,
          },
        ],
      },
      {
        headers: {
          "x-api-key": process.env.CLAUDE_API_KEY,
          "Content-Type": "application/json",
        },
      },
    );

    let scores: {
      technical_knowledge?: number;
      communication?: number;
      overall?: number;
      feedback?: string;
    };
    try {
      const responseText =
        claudeResponse.data.content[0].type === "text" ? claudeResponse.data.content[0].text : "";
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      scores = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch (e) {
      scores = {
        technical_knowledge: 7,
        communication: 7,
        overall: 7,
        feedback: "Interview completed",
      };
    }

    // Save to database
    const { data, error } = await supabase.from("response").insert([
      {
        interview_id: interviewId,
        transcript: fullTranscript,
        technical_score: scores.technical_knowledge || 7,
        communication_score: scores.communication || 7,
        overall_score: scores.overall || 7,
        analytics: {
          feedback: scores.feedback,
          video_count: videoCount,
          submitted_at: new Date().toISOString(),
        },
      },
    ]);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      scores,
      data,
    });
  } catch (error) {
    console.error("Video interview submission error:", error);
    return NextResponse.json({ error: "Failed to process video interview" }, { status: 500 });
  }
}
