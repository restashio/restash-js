import axios from "axios";
import { createHmac } from "crypto";
import { nanoid } from "./lib/alphabet";

type RestashErrorResponse = {
  error: {
    code: string;
    message: string;
  };
};

export type UploadProgress = {
  /** Percentage of the upload completed (0–100) */
  percent: number;

  /** Number of bytes uploaded so far */
  loaded: number;

  /** Total number of bytes to be uploaded */
  total: number;
};

export type UploadResult = {
  /** Unique identifier of the uploaded file */
  id: string;

  /** Public CDN URL of the uploaded file */
  url: string;

  /** Storage key (path) assigned to the file */
  key: string;

  /** Original file name */
  name: string;

  /** File size in bytes */
  size: number;

  /** MIME type of the file */
  contentType: string;
};

export type UploadOptions = {
  /**
   * Optional path to upload the file to.
   * This will determine the folder or directory the file is uploaded to.
   */
  path?: string;

  /**
   * The URL of your server route that returns a signature payload.
   * Only required if your team has signature enforcement enabled.
   */
  handleSignature?: string;

  /**
   * Optional callback that receives real-time upload progress data.
   * Useful for showing a progress bar or percentage.
   */
  onProgress?: ({ percent, loaded, total }: UploadProgress) => void;
};

/**
 * Creates a file uploader instance using your Restash public API key.
 * Use this in the browser to upload files directly to Restash.
 */
export const createRestashUploader = ({ publicKey }: { publicKey: string }) => {
  return async (
    file: File,
    options: UploadOptions = {},
  ): Promise<UploadResult> => {
    if (!publicKey) {
      throw new Error("Public key is required");
    }

    if (publicKey.startsWith("sk_")) {
      throw new Error(
        "Public key is invalid. You are currently using a secret key",
      );
    }

    const { name, type, size } = file;
    const { path, handleSignature, onProgress } = options;

    if (!name || !size || !type) {
      throw new Error("File passed in is invalid");
    }

    let signature;
    let payload;
    // check if handleSignature is provided
    if (handleSignature) {
      const signatureRes = await fetch(handleSignature);
      if (!signatureRes.ok) throw new Error("Failed to get signature");
      const sigData = (await signatureRes.json()) as {
        signature: string;
        payload: string;
      };
      signature = sigData.signature;
      payload = sigData.payload;
    }

    // make fetch request to get the signed url
    const prepareRes = await fetch(
      "https://api.restash.io/v1/uploads/prepare",
      {
        method: "POST",
        headers: { "x-public-key": publicKey },
        body: JSON.stringify({
          file: {
            name,
            type,
            size,
            ...(path && { path }),
          },
          ...(signature && { signature }),
          ...(payload && { payload }),
        }),
      },
    );

    if (!prepareRes.ok) {
      const { error }: RestashErrorResponse = await prepareRes.json();
      throw new Error(error.message);
    }

    const { url, fields, confirmToken } = (await prepareRes.json()) as {
      url: string;
      fields: Record<string, string>;
      confirmToken?: string;
    };

    const formData = new FormData();
    // append fields to form data
    Object.entries(fields).forEach(([key, value]) => {
      formData.append(key, value);
    });

    // append file to form data
    formData.append("file", file);

    // upload the file to s3
    const uploadRes = await axios.post(url, formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (progressEvent) => {
        const { loaded, total } = progressEvent;
        const percent = Math.round((loaded * 100) / (total || 1));
        onProgress?.({ percent, loaded, total: total || 1 });
      },
      validateStatus: () => true,
    });

    if (uploadRes.status < 200 || uploadRes.status >= 300) {
      throw new Error("Failed to upload file");
    }

    // confirm the upload
    const confirmRes = await fetch(
      "https://api.restash.io/v1/uploads/confirm",
      {
        method: "POST",
        headers: { "x-public-key": publicKey },
        body: JSON.stringify({ confirmToken }),
      },
    );

    if (!confirmRes.ok) {
      const { error }: RestashErrorResponse = await confirmRes.json();
      throw new Error(error.message);
    }

    return (await confirmRes.json()) as UploadResult;
  };
};

/**
 * Generates a secure signature for uploads when signatures are required.
 * This function uses your secret key and must be called from your server.
 */
export const generateRestashSig = (secretKey: string) => {
  if (!secretKey) throw new Error("Secret key is required");
  if (secretKey.startsWith("pk_")) {
    throw new Error(
      "Secret key is invalid. You are currently using a public key",
    );
  }

  if (typeof window !== "undefined") {
    throw new Error(
      "Secret key should not be used in the browser. Please only use it in a server environment.",
    );
  }

  const timestamp = Date.now();
  const requestId = nanoid(32);
  const payload = `${requestId}:${timestamp}`;
  const signature = createHmac("sha256", secretKey)
    .update(payload)
    .digest("hex");

  return { payload, signature };
};
