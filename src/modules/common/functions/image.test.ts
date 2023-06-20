import { getFromCache, loadFromUrl, LoadOptions } from "./image.ts";
import { assertEquals } from "asserts";

Deno.test("loadFromUrl", async () => {
  const options = new LoadOptions();
  options.createImage = async (src: string) => {
    const img = {} as unknown as HTMLImageElement;
    img.src = src;
    img.width = 16;
    img.height = 16;
    await Promise.resolve();
    return img;
  };
  const image = await loadFromUrl("./test.png", options);
  assertEquals(image.src, "./test.png");
  assertEquals(image.width, 16);
  assertEquals(image.height, 16);
});

Deno.test("getFromCache", async () => {
  const options = new LoadOptions();
  options.createImage = async (src: string) => {
    const img = {} as unknown as HTMLImageElement;
    img.src = src;
    img.width = 16;
    img.height = 16;
    await Promise.resolve();
    return img;
  };
  await loadFromUrl("./test.png", options);
  const image = getFromCache("./test.png");
  assertEquals(image.src, "./test.png");
  assertEquals(image.width, 16);
  assertEquals(image.height, 16);
});
