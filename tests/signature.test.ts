import { generateSig } from "../src";

describe("generateRestashSig", () => {
  const secret = process.env.RESTASH_SECRET_KEY!;

  it("should generate and return a valid signature and payload", () => {
    const { payload, signature } = generateSig(secret);
    expect(typeof payload).toBe("string");
    expect(typeof signature).toBe("string");
    expect(payload.includes(":")).toBe(true);
    expect(payload.split(":").length).toBe(2);
  });

  it("should throw if secret key is not provided", () => {
    expect(() => generateSig("")).toThrow("Secret key is required");
  });

  it("should throw if secret key is invalid", () => {
    expect(() => generateSig("pk_1234567890")).toThrow(
      "Secret key is invalid. You are currently using a public key",
    );
  });

  it("should throw if called in the browser", () => {
    // Mock the window object to simulate a browser environment
    Object.defineProperty(global, "window", {
      value: {},
      writable: true,
      configurable: true,
    });

    expect(() => generateSig(secret)).toThrow(
      "Secret key should not be used in the browser. Please only use it in a server environment.",
    );
  });

  // Clean up the mock
  afterEach(() => {
    delete (global as any).window;
  });
});
