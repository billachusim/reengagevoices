import { describe, expect, it } from "vitest";
import { audioObjectPath } from "../src/lib/audio-storage";

describe("archive audio object validation", () => {
  const origin = "https://archive.example";
  it("accepts object paths and signed links from the archive only", () => {
    expect(audioObjectPath("user/recording.mp3")).toBe("user/recording.mp3");
    expect(audioObjectPath(`${origin}/storage/v1/object/sign/story-audio/user/recording.mp3?token=example`, origin)).toBe("user/recording.mp3");
  });
  it("rejects arbitrary hosts, redirects, other buckets and traversal", () => {
    for (const value of ["https://127.0.0.1/private", "https://external.example/audio.mp3", "../secret", "user/../secret", "user/%2e%2e/secret", "/user/audio.mp3", "user\\audio.mp3", `${origin}/storage/v1/object/sign/story-covers/user/image.jpg`, `${origin}/redirect?url=https://127.0.0.1`]) {
      expect(audioObjectPath(value, origin)).toBeNull();
    }
  });
});