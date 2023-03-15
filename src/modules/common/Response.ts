export class BadRequestResponse extends Response {
  constructor(details: string) {
    super(`bad request: ${details}`, { status: 400 });
  }
}
export class NotFoundResponse extends Response {
  constructor() {
    super("not found", { status: 404 });
  }
}
