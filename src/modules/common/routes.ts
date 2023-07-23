import { Uuid } from "~/common/NetworkApi.ts";

export interface IRoute<Params extends Array<string | number>> {
  match(path: string): Params | null;
  format(...params: Params): string;
}

export const routeEditor: IRoute<[]> = {
  match(path: string) {
    const match = path.match(/^\/ggoyl3/);
    if (match) {
      return [];
    } else {
      return null;
    }
  },
  format() {
    return `/ggoyl3`;
  },
};

export const routeEditorEntity: IRoute<[Uuid]> = {
  match(path: string) {
    const match = path.match(/^\/ggoyl3\/(\d+)$/);
    if (match) {
      return [parseInt(match[1]) as Uuid];
    } else {
      return null;
    }
  },
  format(uuid: Uuid) {
    return `/ggoyl3/${uuid}`;
  },
};
