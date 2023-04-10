
# RTMP Web*

Real-time multiplayer Web framework, for Deno. Goals:

- Authoritative server with client-side prediction, tweening and rollback (see sequence diagram below)
- Hot module reloading on client and server, for both production and development
- Use Web Transport once it's more widely adopted
- Be generic enough to be used in a variety of games as well as non-game applications
- Keep it free (as in beer and as in speech)
- Use standard APIs and only deviate when it makes sense to do so
- Support as many devices as possible
- Be efficient w/ regard to power and memory consumption

\* Current working title. Passively looking for a better name.


## Develop

1. Install Deno (I recommend using ASDF)
1. Copy scripts/git_hooks/pre-commit to .git/hooks/pre-commit
2. Run scripts/dev.sh
3. Open localhost:8000 in a browser

## Authoritative Server Sequence Diagram
![Authoritative Server Sequence Diagram](./auth_server_seq_diagram.jpg)
<iframe src="https://miro.com/app/live-embed/uXjVMZ4l_4o=/?moveToViewport=-1619,-187,2301,1210&embedId=2235689463" scrolling="no" allow="fullscreen; clipboard-read; clipboard-write" allowfullscreen width="768" height="432" frameborder="0"></iframe>
[View on Miro](https://miro.com/app/board/uXjVMZ4l_4o=/?share_link_id=837242552602)
