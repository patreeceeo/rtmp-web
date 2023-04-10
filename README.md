
# RTMP Web*

Real-time multiplayer Web framework, for Deno.

NOTE: This project is still in its infancy. This README is mostly for my own benefit, but if you feel so inclined, don't hesitate to clone/fork, poke around... Would be thrilled receive issues/PRs/any feedback.

\* Current working title. Passively looking for a better name.

## Goals

- Authoritative server with client-side prediction, tweening and rollback (see sequence diagram below)
- Hot module reloading on client and server, for both production and development
- Use Web Transport (once it's more widely adopted) instead of Web Sockets.
- Be generic enough to be used in a variety of games as well as non-game applications
- Use standard APIs and only deviate when it makes sense to do so
  - ES Modules in production
- Leverage the above to make it easier to write isomorphic code.
- Support as many devices as possible
- Be efficient w/ regard to power and memory consumption
- Leverage TypeScript's powerful type system to help developers write maintainable, robust code.
- Support time-travel debugging (?)
- Keep it free (as in beer and as in speech)

## How it works

### (WIP) Creating a Project

The eventual goal is to make it available as a set of ES Modules that can be downloaded from a host like <https://deno.land/x> (maybe even NPM) but for now, creating an example project under `src/examples` is currently the only way to build anything with this framework, as it's still very immature. A project has two entry points: client-side and server-side. Currently, to change which entry points get loaded, you have to edit:

- src/index.html
- .github/workflows/deploy.yml

Then, if your project uses any assets, you must edit scripts/dev.sh and scripts/build-client.sh to copy those to public and dist/public, respectively.

TODO: Simply the above by exposing a variable in scripts/common.sh that identifies the active project. The entry points for both client and server, as well as any assets, would then be assumed to be at a fixed path relative to the root of the project.

### Developing

1. Install Deno (I recommend using ASDF)
1. Copy scripts/git_hooks/pre-commit to .git/hooks/pre-commit
2. Run scripts/dev.sh
3. Open localhost:8000 in a browser

### Building

The way the codebase is built and served in production versus development are essentially the same, and relatively simple thanks to the exclusive use ECMAScript's standard module system AKA ES Modules. There is no bundling phase, the build process simply produces one JavaScript file for each TypeScript source file using ESBuild.

TODO:
- Minification
- Source maps

#### (TODO) Production server-side `importmap`

This would simply mean reading the source import_map.json, ensuring that any relative paths are adjusted for any differences between development and production (ideally none), and writing to the dist folder.

#### (TODO) Production client-side import map (in HTML)

There's a smart way and a dumb way to do this. The dumb way would be to assume every module in the source importmap might be used on the client, so the client-side importmap would be the same as the server-side importmap. I can't think of a reason not to do this, unless there are browsers that eagerly fetch all entries in an importmap before they're actually imported (?). The smart way would either rely on the developer to somehow indicated which imports are used client-side, or on a script that uses a parser like ESPrima to determine that automatically.

#### (TODO) Client-side remote TypeScript modules

Here's how I think this will work. If you put a link to a TypeScript module in your import map (i.e. the URL ends in `.ts`), and the module is being used on the client (a Web browser) the build system will download, transpile and cache it, then when generating the client's import map, it will use the URL to the cached JavaScript file in place of the original URL.

### Authoritative Server

Heavily influenced by [https://www.gabrielgambetta.com/client-server-game-architecture.html](Gabriel Gambetta's writing on Client-Server game architecture.)

#### Sequence Diagram

![Authoritative Server Sequence Diagram](./auth_server_seq_diagram.jpg)

[View on Miro](https://miro.com/app/board/uXjVMZ4l_4o=/?share_link_id=837242552602)
