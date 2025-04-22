import { createRestashUploader } from "../src";

describe("Upload a file", () => {
  const publicKey = process.env.RESTASH_PUBLIC_KEY!;
  const upload = createRestashUploader({ publicKey });
  const file = new File(["test"], "test.txt", { type: "text/plain" });
  const blob = new Blob(["test"], { type: "text/plain" });

  it("should throw if no pubic key is provided", async () => {
    const uploadWithoutKey = createRestashUploader({ publicKey: "" });
    await expect(() => uploadWithoutKey(file)).rejects.toThrow(
      "Public key is required",
    );
  });

  it("should throw if a secret key is provided", async () => {
    const uploadWithSecretKey = createRestashUploader({
      publicKey: "sk_1234567890",
    });
    await expect(() => uploadWithSecretKey(file)).rejects.toThrow(
      "Public key is invalid. You are currently using a secret key",
    );
  });

  it("should throw if a valid file or blob is not provided", async () => {
    await expect(() => upload({} as any)).rejects.toThrow(
      "Invalid file passed in. Please pass in a File or Blob",
    );
  });

  it("should generate a random name if no name is provided when uploading a blob", async () => {
    const result = await upload(blob);
    expect(result.name).toMatch(/^[a-f0-9]{16}$/); // 32 characters hex string
  });

  it("should use the provided name when uploading a file or blob", async () => {
    const result = await upload(file, { name: "test.txt" });
    expect(result.name).toBe("test.txt");
  });

  it("should return the uploaded file information", async () => {
    const result = await upload(file);
    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("url", expect.stringContaining("https://"));
    expect(result).toHaveProperty("name", file.name);
    expect(result).toHaveProperty("contentType", file.type);
    expect(result).toHaveProperty("size", file.size);
    expect(result).toHaveProperty("key", expect.stringContaining(file.name));
  });

  it("should call onProgress with percent, loaded, and total when provided", async () => {
    const onProgress = jest.fn();
    await upload(file, { onProgress });

    for (const [progress] of onProgress.mock.calls) {
      expect(progress).toHaveProperty("percent");
      expect(progress).toHaveProperty("loaded");
      expect(progress).toHaveProperty("total");
      expect(progress.percent).toBeGreaterThanOrEqual(0);
      expect(progress.percent).toBeLessThanOrEqual(100);
      expect(progress.loaded).toBeGreaterThanOrEqual(0);
      expect(progress.total).toBeGreaterThanOrEqual(file.size);
    }

    expect(onProgress).toHaveBeenCalled();
  });

  it("should throw if signature endpoint does not return payload and signature", async () => {
    const uploadWithFakeSigEndpoint = createRestashUploader({
      publicKey,
      handleSignature: "/fake-endpoint",
    });

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ signature: "", payload: "123" }),
    });

    await expect(() => uploadWithFakeSigEndpoint(file)).rejects.toThrow(
      "Your signature endpoint did not return a valid signature",
    );
  });

  it("should throw if prepare endpoint does not return a url, fields, or confirm token", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        url: "my-url",
        fields: { key: "test" },
        confirmToken: "",
      }),
    });
  });
});
