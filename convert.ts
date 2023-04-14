import { createFFmpeg, fetchFile } from "@ffmpeg/ffmpeg";
import { Buffer } from "buffer";

const handleRequest = async (req, res) => {
  try {
    const webmBuffer = Buffer.from(req.body.webm, "base64");
    const ffmpeg = createFFmpeg({ log: true });

    await ffmpeg.load();

    ffmpeg.FS("writeFile", "input.webm", await fetchFile(webmBuffer));
    await ffmpeg.run(
      "-i",
      "input.webm",
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
