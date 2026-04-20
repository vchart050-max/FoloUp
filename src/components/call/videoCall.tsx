"use client";

import type { Interview } from "@/types/interview";
import axios from "axios";
import React, { useState, useRef, useEffect } from "react";

type VideoCallProps = {
  interview: Interview;
  onEnd: () => void;
};

export function VideoCall({ interview, onEnd }: VideoCallProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);

  const questions = interview.questions.map((q) => q.question);

  useEffect(() => {
    const startVideo = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        alert("Please allow camera and microphone");
      }
    };

    startVideo();

    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        for (const track of tracks) {
          track.stop();
        }
      }
    };
  }, []);

  const startRecording = () => {
    const stream = videoRef.current?.srcObject as MediaStream;
    const mediaRecorder = new MediaRecorder(stream);
    const chunks: Blob[] = [];

    mediaRecorder.ondataavailable = (event) => {
      chunks.push(event.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      setRecordedChunks((prev) => [...prev, blob]);
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setIsRecording(true);

    setTimeout(() => {
      mediaRecorder.stop();
      setIsRecording(false);
    }, 90000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="bg-black rounded-lg">
        <video ref={videoRef} autoPlay muted className="w-full" />
      </div>

      <div className="text-center">
        <p className="text-lg font-semibold">
          Question {currentQuestionIndex + 1} of {questions.length}
        </p>
        <p>{questions[currentQuestionIndex]}</p>
        {isRecording && <p className="text-red-600">● Recording...</p>}
      </div>

      <div className="flex gap-2 justify-center">
        {!isRecording ? (
          <button
            type="button"
            onClick={startRecording}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg"
          >
            Start Recording
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            className="bg-red-600 text-white px-6 py-2 rounded-lg"
          >
            Stop Recording
          </button>
        )}

        {!isRecording && recordedChunks.length > currentQuestionIndex && (
          <button
            type="button"
            onClick={nextQuestion}
            className="bg-green-600 text-white px-6 py-2 rounded-lg"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
