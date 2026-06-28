/**
 * Toonflow AI供应商模板
 * @version 2.0
 */

// ============================================================
// 类型定义
// ============================================================

type VideoMode =
  | "singleImage"
  | "startEndRequired"
  | "endFrameOptional"
  | "startFrameOptional"
  | "text"
  | (`videoReference:${number}` | `imageReference:${number}` | `audioReference:${number}`)[];

interface TextModel {
  name: string;
  modelName: string;
  type: "text";
  think: boolean;
}

interface ImageModel {
  name: string;
  modelName: string;
  type: "image";
  mode: ("text" | "singleImage" | "multiReference")[];
  associationSkills?: string;
}

interface VideoModel {
  name: string;
  modelName: string;
  type: "video";
  mode: VideoMode[];
  associationSkills?: string;
  audio: "optional" | false | true;
  durationResolutionMap: { duration: number[]; resolution: string[] }[];
}

interface TTSModel {
  name: string;
  modelName: string;
  type: "tts";
  voices: { title: string; voice: string }[];
}

interface VendorConfig {
  id: string;
  version: string;
  name: string;
  author: string;
  description?: string;
  icon?: string;
  inputs: { key: string; label: string; type: "text" | "password" | "url"; required: boolean; placeholder?: string }[];
  inputValues: Record<string, string>;
  models: (TextModel | ImageModel | VideoModel | TTSModel)[];
}

type ReferenceList =
  | { type: "image"; sourceType: "base64"; base64: string }
  | { type: "audio"; sourceType: "base64"; base64: string }
  | { type: "video"; sourceType: "base64"; base64: string };

interface ImageConfig {
  prompt: string;
  referenceList?: Extract<ReferenceList, { type: "image" }>[];
  size: "1K" | "2K" | "4K";
  aspectRatio: `${number}:${number}`;
}

interface VideoConfig {
  duration: number;
  resolution: string;
  aspectRatio: "16:9" | "9:16";
  prompt: string;
  referenceList?: ReferenceList[];
  audio?: boolean;
  mode: VideoMode[];
}

interface TTSConfig {
  text: string;
  voice: string;
  speechRate: number;
  pitchRate: number;
  volume: number;
  referenceList?: Extract<ReferenceList, { type: "audio" }>[];
}

interface PollResult {
  completed: boolean;
  data?: string;
  error?: string;
}

// ============================================================
// 全局声明
// ============================================================

declare const axios: any;
declare const logger: (msg: string) => void;
declare const jsonwebtoken: any;
declare const zipImage: (base64: string, size: number) => Promise<string>;
declare const zipImageResolution: (base64: string, w: number, h: number) => Promise<string>;
declare const mergeImages: (base64Arr: string[], maxSize?: string) => Promise<string>;
declare const urlToBase64: (url: string) => Promise<string>;
declare const pollTask: (fn: () => Promise<PollResult>, interval?: number, timeout?: number) => Promise<PollResult>;
declare const base64ToFileUrl: (input: string, folder?: string) => Promise<string>;
declare const createOpenAI: any;
declare const createDeepSeek: any;
declare const createZhipu: any;
declare const createQwen: any;
declare const createAnthropic: any;
declare const createOpenAICompatible: any;
declare const createXai: any;
declare const createMinimax: any;
declare const createGoogleGenerativeAI: any;
declare const exports: {
  vendor: VendorConfig;
  textRequest: (m: TextModel, t: boolean, tl: 0 | 1 | 2 | 3) => any;
  imageRequest: (c: ImageConfig, m: ImageModel) => Promise<string>;
  videoRequest: (c: VideoConfig, m: VideoModel) => Promise<string>;
  ttsRequest: (c: TTSConfig, m: TTSModel) => Promise<string>;
  checkForUpdates?: () => Promise<{ hasUpdate: boolean; latestVersion: string; notice: string }>;
  updateVendor?: () => Promise<string>;
};

// ============================================================
// 供应商配置
// ============================================================

const vendor: VendorConfig = {
  id: "agnes",
  version: "2.0",
  author: "Toonflow",
  name: "Agnes AI",
  description:
    "## Agnes 官方接口\n\n- 文本：OpenAI 兼容 Chat Completions\n- 图片：`/images/generations`\n- 视频：`/responses` + `/agnesapi` 轮询\n\n视频模式下，Toonflow 会自动把引用图写入 OSS/static 目录，并生成可供 Agnes 访问的 URL。部署到服务器时请正确设置 `OSSURL` 为公网地址。",
  inputs: [
    { key: "apiKey", label: "API密钥", type: "password", required: true, placeholder: "Agnes API Key" },
    { key: "baseUrl", label: "请求地址", type: "url", required: true, placeholder: "示例：https://apihub.agnes-ai.com/v1" },
  ],
  inputValues: {
    apiKey: "",
    baseUrl: "https://apihub.agnes-ai.com/v1",
  },
  models: [
    { name: "Agnes 2.0 Flash", modelName: "agnes-2.0-flash", type: "text", think: false },
    { name: "Agnes Image 2.0 Flash", modelName: "agnes-image-2.0-flash", type: "image", mode: ["text", "singleImage", "multiReference"] },
    {
      name: "Agnes Video V2.0 文生视频",
      modelName: "agnes-video-v2.0:text",
      type: "video",
      mode: ["text"],
      audio: false,
      durationResolutionMap: [{ duration: [3, 4, 5, 6, 7, 8, 9, 10, 12, 15], resolution: ["480p", "720p", "1080p"] }],
    },
    {
      name: "Agnes Video V2.0 图生视频",
      modelName: "agnes-video-v2.0:image",
      type: "video",
      mode: ["singleImage"],
      audio: false,
      durationResolutionMap: [{ duration: [3, 4, 5, 6, 7, 8, 9, 10, 12, 15], resolution: ["480p", "720p", "1080p"] }],
    },
    {
      name: "Agnes Video V2.0 多图视频",
      modelName: "agnes-video-v2.0:multi",
      type: "video",
      mode: [["imageReference:9"]],
      audio: false,
      durationResolutionMap: [{ duration: [3, 4, 5, 6, 7, 8, 9, 10, 12, 15], resolution: ["480p", "720p", "1080p"] }],
    },
    {
      name: "Agnes Video V2.0 关键帧动画",
      modelName: "agnes-video-v2.0:keyframes",
      type: "video",
      mode: [["imageReference:9"]],
      audio: false,
      durationResolutionMap: [{ duration: [3, 4, 5, 6, 7, 8, 9, 10, 12, 15], resolution: ["480p", "720p", "1080p"] }],
    },
  ],
};

// ============================================================
// 辅助工具
// ============================================================

const readByPath = (obj: any, path: string): any => {
  if (!obj || !path) return undefined;
  const normalizedPath = path.replace(/\[(\d+)\]/g, ".$1");
  return normalizedPath.split(".").reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
};

const pickFirstPath = (obj: any, paths: string[]): any => {
  for (const path of paths) {
    const value = readByPath(obj, path);
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
};

const normalizeApiKey = () => {
  if (!vendor.inputValues.apiKey) throw new Error("缺少API Key");
  return vendor.inputValues.apiKey.replace(/^Bearer\s+/i, "");
};

const normalizeBaseUrl = () => {
  if (!vendor.inputValues.baseUrl) throw new Error("缺少请求地址");
  return vendor.inputValues.baseUrl.replace(/\/+$/, "");
};

const getGatewayUrl = () => normalizeBaseUrl().replace(/\/v1$/i, "");

const getHeaders = () => ({
  Authorization: `Bearer ${normalizeApiKey()}`,
  "Content-Type": "application/json",
});

const ensurePublicUrls = async (referenceList: ReferenceList[] | undefined) => {
  const imageRefs = (referenceList || []).filter((item) => item.type === "image");
  const urls = await Promise.all(
    imageRefs.map(async (item, index) => {
      return await base64ToFileUrl(item.base64, `vendor/agnes/image-${index + 1}`);
    }),
  );
  return urls;
};

const parseVideoProfile = (modelName: string) => {
  const index = modelName.indexOf(":");
  if (index === -1) return { actualModelName: modelName, profile: "text" };
  return { actualModelName: modelName.slice(0, index), profile: modelName.slice(index + 1) };
};

const getImageSize = (aspectRatio: `${number}:${number}`, size: "1K" | "2K" | "4K") => {
  const sizeMap: Record<`${number}:${number}`, Record<"1K" | "2K" | "4K", string>> = {
    "1:1": { "1K": "1024x1024", "2K": "1536x1536", "4K": "2048x2048" },
    "16:9": { "1K": "1024x768", "2K": "1536x1024", "4K": "2048x1536" },
    "9:16": { "1K": "768x1024", "2K": "1024x1536", "4K": "1536x2048" },
    "4:3": { "1K": "1024x768", "2K": "1536x1152", "4K": "2048x1536" },
    "3:4": { "1K": "768x1024", "2K": "1152x1536", "4K": "1536x2048" },
  };
  return sizeMap[aspectRatio]?.[size] || sizeMap["1:1"][size];
};

const getVideoSize = (aspectRatio: "16:9" | "9:16", resolution: string) => {
  const resolutionMap: Record<string, Record<"16:9" | "9:16", string>> = {
    "480p": { "16:9": "854x480", "9:16": "480x854" },
    "720p": { "16:9": "1280x720", "9:16": "720x1280" },
    "1080p": { "16:9": "1920x1080", "9:16": "1080x1920" },
  };
  return resolutionMap[resolution]?.[aspectRatio] || resolutionMap["720p"][aspectRatio];
};

const extractImageResult = (data: any) => {
  const base64 = pickFirstPath(data, ["data[0].b64_json", "data.0.b64_json", "b64_json"]);
  if (base64) return base64.startsWith("data:") ? base64 : `data:image/png;base64,${base64}`;
  return pickFirstPath(data, ["data[0].url", "data.0.url", "url"]);
};

const extractVideoId = (data: any) => {
  return pickFirstPath(data, ["video_id", "id", "data.video_id", "data.id", "output.0.video_id"]);
};

const extractVideoStatus = (data: any) => {
  return String(pickFirstPath(data, ["status", "data.status", "output.0.status"]) || "").toLowerCase();
};

const extractVideoUrl = (data: any) => {
  return pickFirstPath(data, [
    "remixed_from_video_id",
    "video_url",
    "data.video_url",
    "output.0.video_url",
    "output_video_url",
  ]);
};

const extractErrorMessage = (data: any) => {
  return pickFirstPath(data, ["error.message", "message", "msg", "data.message", "output.0.error.message"]);
};

// ============================================================
// 适配器函数
// ============================================================

const textRequest = (model: TextModel, think: boolean, thinkLevel: 0 | 1 | 2 | 3) => {
  const apiKey = normalizeApiKey();
  return createOpenAI({ baseURL: normalizeBaseUrl(), apiKey }).chat(model.modelName);
};

const imageRequest = async (config: ImageConfig, model: ImageModel): Promise<string> => {
  const body: Record<string, any> = {
    model: model.modelName,
    prompt: config.prompt,
    size: getImageSize(config.aspectRatio, config.size),
  };

  const imageRefs = (config.referenceList || []).map((item) => item.base64).filter(Boolean);
  if (imageRefs.length > 0) {
    body.extra_body = {
      image: imageRefs.slice(0, 9),
      response_format: "b64_json",
    };
  } else {
    body.return_base64 = true;
  }

  logger(`[Agnes Image] 开始提交任务: ${model.modelName}`);
  const resp = await axios.post(`${normalizeBaseUrl()}/images/generations`, body, { headers: getHeaders() });
  const result = extractImageResult(resp.data);

  if (!result) {
    throw new Error(`Agnes 图片接口未返回图片结果: ${JSON.stringify(resp.data).slice(0, 500)}`);
  }

  if (/^https?:\/\//i.test(result)) return await urlToBase64(result);
  return result;
};

const videoRequest = async (config: VideoConfig, model: VideoModel): Promise<string> => {
  const { actualModelName, profile } = parseVideoProfile(model.modelName);
  const imageUrls = await ensurePublicUrls(config.referenceList);
  const size = getVideoSize(config.aspectRatio, config.resolution || "720p");
  const [widthStr, heightStr] = size.split("x");
  const width = Number(widthStr);
  const height = Number(heightStr);
  const numFrames = Math.max(25, Math.min(441, Math.floor(config.duration || 5) * 24 + 1));

  const body: Record<string, any> = {
    model: actualModelName,
    prompt: config.prompt || "Generate a video",
    width,
    height,
    num_frames: numFrames,
    frame_rate: 24,
  };

  if (profile === "image") {
    if (imageUrls.length < 1) throw new Error("Agnes 图生视频模式至少需要 1 张公网图片 URL");
    body.image = imageUrls[0];
    body.mode = "ti2vid";
  }

  if (profile === "multi") {
    if (imageUrls.length < 2) throw new Error("Agnes 多图视频模式至少需要 2 张公网图片 URL");
    body.extra_body = { image: imageUrls.slice(0, 9) };
  }

  if (profile === "keyframes") {
    if (imageUrls.length < 2) throw new Error("Agnes 关键帧动画模式至少需要 2 张公网图片 URL");
    body.extra_body = { image: imageUrls.slice(0, 9), mode: "keyframes" };
  }

  logger(`[Agnes Video] 开始提交任务: ${actualModelName}, profile=${profile}`);
  const submitResp = await axios.post(`${normalizeBaseUrl()}/videos`, body, { headers: getHeaders() });
  const videoUrl = extractVideoUrl(submitResp.data);
  if (videoUrl) return await urlToBase64(videoUrl);

  const videoId = extractVideoId(submitResp.data);
  if (!videoId) {
    throw new Error(`Agnes 视频接口未返回 video_id: ${JSON.stringify(submitResp.data).slice(0, 500)}`);
  }

  logger(`[Agnes Video] 任务ID: ${videoId}`);
  const result = await pollTask(
    async () => {
      const resp = await axios.get(`${getGatewayUrl()}/agnesapi`, {
        headers: { Authorization: `Bearer ${normalizeApiKey()}` },
        params: {
          video_id: videoId,
          model_name: actualModelName,
        },
      });
      const status = extractVideoStatus(resp.data);
      const pollVideoUrl = extractVideoUrl(resp.data);

      if (pollVideoUrl || ["completed", "succeeded", "success", "done"].includes(status)) {
        if (pollVideoUrl) return { completed: true, data: pollVideoUrl };
        return { completed: true, error: "Agnes 视频任务已完成，但未返回视频地址" };
      }

      if (["failed", "error", "cancelled", "canceled", "rejected"].includes(status)) {
        return { completed: true, error: extractErrorMessage(resp.data) || "Agnes 视频生成失败" };
      }

      logger(`[Agnes Video] 轮询中... status=${status || "processing"}`);
      return { completed: false };
    },
    5000,
    600000,
  );

  if (result.error) throw new Error(result.error);
  if (!result.data) throw new Error("Agnes 视频任务未返回结果");
  return await urlToBase64(result.data);
};

const ttsRequest = async (config: TTSConfig, model: TTSModel): Promise<string> => {
  return "";
};

const checkForUpdates = async (): Promise<{ hasUpdate: boolean; latestVersion: string; notice: string }> => {
  return { hasUpdate: false, latestVersion: "2.0", notice: "## Agnes AI 供应商配置" };
};

const updateVendor = async (): Promise<string> => {
  return "";
};

// ============================================================
// 导出
// ============================================================

exports.vendor = vendor;
exports.textRequest = textRequest;
exports.imageRequest = imageRequest;
exports.videoRequest = videoRequest;
exports.ttsRequest = ttsRequest;
exports.checkForUpdates = checkForUpdates;
exports.updateVendor = updateVendor;

export { };
