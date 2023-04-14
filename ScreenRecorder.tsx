// components/ScreenRecorder.tsx

import axios from "axios";
import React, { useState } from "react";

interface ScreenRecorderProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

const ScreenRecorder: React.FC<ScreenRecorderProps> = ({ canvasRef }) => {
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null
  );
  const [recordedBlobs, setRecordedBlobs] = useState<Blob[]>([]);

  const handleDataAvailable = (event: BlobEvent) => {
    if (event.data && event.data.size > 0) {
      setRecordedBlobs((prevBlobs) => [...prevBlobs, event.data]);
    }
  };

  const startRecording = async () => {
    if (!canvasRef.current) return;

    const frameRate = 30;
    const stream = await canvasRef.current.captureStream(frameRate);

    const mimeType = "video/webm;codecs=vp8";
    const recorder = new MediaRecorder(stream, {
      mimeType,
      bitsPerSecond: 2500000,
    });
    recorder.ondataavailable = handleDataAvailable;
    recorder.start();

    setMediaRecorder(recorder);
  };

  const stopRecording = () => {
    mediaRecorder?.stop();
    setMediaRecorder(null);
  };

  const downloadRecording = async () => {
    if (recordedBlobs.length > 0) {
      const webmBlob = new Blob(recordedBlobs, { type: "video/webm" });
      const webmBuffer = await webmBlob.arrayBuffer();
      const webmBase64 = Buffer.from(webmBuffer).toString("base64");

      try {
        const response = await axios.post(
          "/api/convert",
          {
            webm: webmBase64,
          },
          {
            headers: { "Content-Type": "application/json" },
          }
        );

        if (response.status === 200) {
          const { mp4: mp4Base64 } = response.data;
          const mp4Blob = new Blob([Buffer.from(mp4Base64, "base64")], {
            type: "video/mp4",
          });

          const url = window.URL.createObjectURL(mp4Blob);
          const a = document.createElement("a");
          a.style.display = "none";
          a.href = url;
          a.download = "element-recording.mp4";
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            setRecordedBlobs([]);
          }, 100);
        } else {
          alert("Failed to convert the video");
        }
      } catch (error) {
        console.error(error);
        alert("Failed to convert the video");
      }
    }
  };

  return (
    <div>
      <button type="button" onClick={startRecording}>
        Start Recording
      </button>
      <button type="button" onClick={stopRecording} disabled={!mediaRecorder}>
        Stop Recording
      </button>
      <button
        type="button"
        onClick={downloadRecording}
        disabled={recordedBlobs.length === 0}
      >
        Download Recording
      </button>
    </div>
  );
};

export default ScreenRecorder;
