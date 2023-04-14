import { FFmpeg, createFFmpeg, fetchFile } from "@ffmpeg/ffmpeg";
import { Buffer } from "buffer";

let ffmpegInstance = null as FFmpeg | null;

const getFFmpegInstance = async () => {
  if (!ffmpegInstance) {
    ffmpegInstance = createFFmpeg({ log: true });
    await ffmpegInstance.load();
  }

  return ffmpegInstance;
};

const handleRequest = async (req, res) => {
  try {
    console.log("Received request with webm size:", req.body.webm.length);
    const ffmpeg = await getFFmpegInstance();
    const webmBuffer = Buffer.from(req.body.webm, "base64");

    ffmpeg.FS("writeFile", "input.webm", await fetchFile(webmBuffer));

    const playbackSpeed = 1; // Change this value to adjust playback speed (1 is normal speed, 2 is 2x slower, 0.5 is 2x faster, etc.)
    const targetFramerate = 30; // Change this value to adjust the output framerate

    await ffmpeg.run(
      "-i",
      "input.webm",
      "-vf",
      `setpts=${playbackSpeed}*PTS,fps=${targetFramerate}`,
      "-c:v",
      "libx264",
      "-preset",
      "slow",
      "-profile:v",
      "main",
      "-movflags",
      "+faststart",
      "output.mp4"
    );

    const mp4Buffer = ffmpeg.FS("readFile", "output.mp4");
    const uint8Array = new Uint8Array(mp4Buffer.buffer);
    const mp4Base64 = Buffer.from(uint8Array).toString("base64");

    // Delete input and output files from the virtual file system
    ffmpeg.FS("unlink", "input.webm");
    ffmpeg.FS("unlink", "output.mp4");

    res.status(200).json({ mp4: mp4Base64 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Conversion failed" });
  }
};

export default async function handler(req, res) {
  if (req.method === "POST") {
    await handleRequest(req, res);
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "50mb",
    },
  },
};
