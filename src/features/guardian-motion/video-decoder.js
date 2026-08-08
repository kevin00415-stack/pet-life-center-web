const SUPPORTED_EXTENSIONS = Object.freeze(["mp4", "mov"]);
const SUPPORTED_MIME_TYPES = Object.freeze(["video/mp4", "video/quicktime"]);

export function validateLocalVideoFile(file) {
  if (!file || typeof file !== "object" || typeof file.name !== "string") throw new Error("LOCAL_VIDEO_FILE_REQUIRED");
  if (/^(https?|data|blob):/i.test(file.name)) throw new Error("REMOTE_VIDEO_SOURCE_REJECTED");
  const extension = file.name.split(".").at(-1)?.toLowerCase();
  if (!SUPPORTED_EXTENSIONS.includes(extension)) throw new Error("VIDEO_FORMAT_UNSUPPORTED");
  if (file.type && !SUPPORTED_MIME_TYPES.includes(file.type.toLowerCase())) throw new Error("VIDEO_MIME_UNSUPPORTED");
  if (Number.isFinite(file.size) && file.size <= 0) throw new Error("VIDEO_FILE_EMPTY");
  return Object.freeze({ extension, mimeType: file.type || (extension === "mov" ? "video/quicktime" : "video/mp4") });
}

export function createBrowserLocalVideoDecoder({ environment = globalThis, sampleFps = 10, maximumFrames = 600 } = {}) {
  return Object.freeze({
    decoderVersion: "guardian-browser-video-decoder-v1",
    supportedFormats: SUPPORTED_EXTENSIONS,
    async decode(file) {
      validateLocalVideoFile(file);
      const document = environment.document;
      const URLApi = environment.URL;
      if (!document?.createElement || !URLApi?.createObjectURL) throw new Error("BROWSER_VIDEO_DECODER_UNAVAILABLE");
      const video = document.createElement("video");
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("VIDEO_CANVAS_UNAVAILABLE");
      const objectUrl = URLApi.createObjectURL(file);
      try {
        video.preload = "auto";
        video.muted = true;
        video.playsInline = true;
        video.src = objectUrl;
        await waitFor(video, "loadedmetadata", "VIDEO_METADATA_DECODE_FAILED");
        if (!Number.isFinite(video.duration) || video.duration <= 0 || !video.videoWidth || !video.videoHeight) throw new Error("VIDEO_METADATA_INVALID");
        if (video.readyState < 2) await waitFor(video, "loadeddata", "VIDEO_FRAME_DECODE_FAILED");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const durationMs = Math.max(1, Math.round(video.duration * 1000));
        const intervalMs = 1000 / sampleFps;
        const frameCount = Math.min(maximumFrames, Math.max(1, Math.floor(durationMs / intervalMs) + 1));
        const frames = [];
        for (let index = 0; index < frameCount; index += 1) {
          const timestampMs = Math.min(Math.max(0, durationMs - 1), Math.round(index * intervalMs));
          await seek(video, timestampMs / 1000);
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const rgba = new Uint8ClampedArray(context.getImageData(0, 0, canvas.width, canvas.height).data);
          frames.push(Object.freeze({ frameIndex: index, timestampMs, durationMs: Math.round(intervalMs), width: canvas.width, height: canvas.height, rgba }));
        }
        assertMonotonic(frames);
        return Object.freeze({ decoderVersion: this.decoderVersion, sourceFormat: validateLocalVideoFile(file).extension.toUpperCase(), frames: Object.freeze(frames) });
      } finally {
        video.removeAttribute?.("src");
        video.load?.();
        URLApi.revokeObjectURL(objectUrl);
      }
    }
  });
}

export function createMemoryPixelFrameDecoder() {
  return Object.freeze({
    decoderVersion: "guardian-memory-pixel-decoder-v1",
    supportedFormats: SUPPORTED_EXTENSIONS,
    async decode(file) {
      const format = validateLocalVideoFile(file);
      if (!Array.isArray(file.authorizedPixelFrames)) throw new Error("AUTHORIZED_PIXEL_FRAMES_REQUIRED");
      const frames = file.authorizedPixelFrames.map((frame, frameIndex) => validatePixelFrame(frame, frameIndex));
      assertMonotonic(frames);
      return Object.freeze({ decoderVersion: this.decoderVersion, sourceFormat: format.extension.toUpperCase(), frames: Object.freeze(frames) });
    }
  });
}

function validatePixelFrame(frame, frameIndex) {
  if (!Number.isInteger(frame.width) || frame.width < 2 || !Number.isInteger(frame.height) || frame.height < 2) throw new Error("PIXEL_FRAME_DIMENSIONS_INVALID");
  if (!(frame.rgba instanceof Uint8ClampedArray) || frame.rgba.length !== frame.width * frame.height * 4) throw new Error("PIXEL_FRAME_RGBA_INVALID");
  if (!Number.isFinite(frame.timestampMs) || frame.timestampMs < 0) throw new Error("PIXEL_FRAME_TIMESTAMP_INVALID");
  return Object.freeze({ frameIndex, timestampMs: frame.timestampMs, durationMs: frame.durationMs ?? 100, width: frame.width, height: frame.height, rgba: new Uint8ClampedArray(frame.rgba) });
}

function assertMonotonic(frames) {
  for (let index = 1; index < frames.length; index += 1) if (frames[index].timestampMs <= frames[index - 1].timestampMs) throw new Error("INVALID_TIMESTAMP_ORDER");
}

function waitFor(target, eventName, errorCode) {
  return new Promise((resolve, reject) => {
    const cleanup = () => { target.removeEventListener("error", onError); target.removeEventListener(eventName, onSuccess); };
    const onSuccess = () => { cleanup(); resolve(); };
    const onError = () => { cleanup(); reject(new Error(errorCode)); };
    target.addEventListener(eventName, onSuccess, { once: true });
    target.addEventListener("error", onError, { once: true });
  });
}

async function seek(video, seconds) {
  if (Math.abs(video.currentTime - seconds) < 0.0005 && video.readyState >= 2) return;
  const complete = waitFor(video, "seeked", "VIDEO_FRAME_DECODE_FAILED");
  video.currentTime = seconds;
  await complete;
}
