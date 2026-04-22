"use client";

import axios from "axios";
import React, { useState, useRef, useEffect } from "react";
import { toast } from "sonner";

type VideoInterviewProps = {
  interviewId: string;
  questions: Array<{ id: string; question: string }>;
  onComplete: (results: any) => void;
};

export function VideoInterview({ interviewId, questions, onComplete }: VideoInterviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlobs, setRecordedBlobs] = useState<Blob[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  // Start camera on mount
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error("Camera error:", error);
        toast.error("Please allow camera and microphone access");
      }
    };

    startCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, []);

  // Timer for recording
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingTime(0);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);
  useVideoMode ? (
    <VideoInterview
      interviewId={interviewId}
      questions={interviewData.questions}
      onComplete={(results) => {
        alert("Interview submitted!");
        // Redirect to results page
      }}
    />
  ) : (
    // existing voice interview code
    <ExistingInterviewComponent />
  );

  const startRecording = async () => {
    try {
      const stream = videoRef.current?.srcObject as MediaStream;
      if (!stream) {
        toast.error("Camera not ready");
        return;
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm",
      });
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        setRecordedBlobs((prev) => [...prev, blob]);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);

      // Auto-stop after 2 minutes
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === "recording") {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
          toast.success("Recording saved. Click Next to continue.");
        }
      }, 120000);
    } catch (error) {
      console.error("Recording error:", error);
      toast.error("Failed to start recording");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast.success("Recording saved!");
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      submitInterview();
    }
  };

  const submitInterview = async () => {
    setIsSubmitting(true);
    try {
      if (recordedBlobs.length === 0) {
        toast.error("No recordings found");
        return;
      }

      // Create FormData with all videos
      const formData = new FormData();
      formData.append("interview_id", interviewId);

      recordedBlobs.forEach((blob, index) => {
        formData.append(`video_${index}`, blob, `answer_${index}.webm`);
        formData.append(`question_${index}`, questions[index].question);
      });

      // Submit to backend
      const response = await axios.post("/api/submit-video-interview", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success("Interview submitted successfully!");
      onComplete(response.data);
    } catch (error) {
      console.error("Submission error:", error);
      toast.error("Failed to submit interview");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Video Interview</h1>
        <p className="text-gray-600">
          Question {currentQuestionIndex + 1} of {totalQuestions}
        </p>
        <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
          <div
            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Video Feed */}
      <div className="mb-6">
        <div className="relative bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            muted
            className="w-full h-auto"
            style={{ minHeight: "400px" }}
          />

          {isRecording && (
            <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
              <span className="font-semibold">
                {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, "0")}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Question Display */}
      <div className="mb-6 p-6 bg-indigo-50 border-l-4 border-indigo-600 rounded">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">{currentQuestion.question}</h2>
        <p className="text-gray-600">You have up to 2 minutes to answer</p>
      </div>

      {/* Controls */}
      <div className="flex gap-4 mb-6 flex-wrap">
        {!isRecording ? (
          <button
            onClick={startRecording}
            disabled={isSubmitting}
            className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            🎥 Start Recording
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="flex-1 bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition"
          >
            ⏹ Stop Recording
          </button>
        )}

        {!isRecording && recordedBlobs.length > currentQuestionIndex && (
          <button
            onClick={nextQuestion}
            disabled={isSubmitting}
            className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition"
          >
            {isSubmitting
              ? "Processing..."
              : currentQuestionIndex === totalQuestions - 1
                ? "✓ Submit Interview"
                : "Next Question →"}
          </button>
        )}
      </div>

      {/* Info */}
      <div className="text-sm text-gray-500 text-center">
        {recordedBlobs.length > currentQuestionIndex
          ? "✓ Answer recorded"
          : "Click 'Start Recording' to begin"}
      </div>
    </div>
  );
}
