export class NotFoundResponse extends Response {
  constructor() {
    super("not found", { status: 404 });
  }
}
