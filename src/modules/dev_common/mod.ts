import { relative } from "path";
import { debounce } from "async";

interface ModuleEventHandler {
  (paths: IterableIterator<string>): void;
}

let listenerCount = 0;
const pathSet = new Set<string>();
export async function addModuleEventHandler(
  events: Array<Deno.FsEvent["kind"]>,
  handler: ModuleEventHandler,
  absPaths: Array<string>,
) {
  const watcher = Deno.watchFs(absPaths, { recursive: true });

  const debouncedListener = debounce(() => {
    const copy = new Set(pathSet);
    handler(copy.values());
    pathSet.clear();
  }, 200);

  listenerCount++;
  console.log(
    `Module event handler #${listenerCount} for ${absPaths.join(", ")}`,
  );

  for await (const event of watcher) {
    if (events.includes(event.kind)) {
      for (const path of event.paths) {
        const cwdRelativePath = relative(Deno.cwd(), path);
        // TODO there's some confusing naming conventions going on in this code
        // The names "id" and "url" are used to refer to the same things, and those
        // things are actually path(name)s.
        pathSet.add(cwdRelativePath);
      }
    }
    if (pathSet.size > 0) {
      debouncedListener();
    }
  }
}

export function sleep(time: number) {
  return new Promise((resolve) => setTimeout(resolve, time));
}
