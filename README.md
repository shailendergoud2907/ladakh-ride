# ladakh-ride

A Ladakh road trip above the Claude prompt. A Royal Enfield rides from Leh to
Khardung La as your conversation's context window fills up.

- Snow peaks, a Pangong Tso lake, prayer flags, a stupa at Leh and 25/50/75% milestones.
- Caption shows percent of context used, tokens used out of the window, a flavour-only altitude, and your 5-hour limit when your account reports one.
- Toasts at 75% and 90% full.
- `/ride` hides or shows it. Terminals that cannot draw images get a text track instead.

## Install

Type this at the prompt of a terminal Claude Code session:

```
/plugin install ladakh-ride --marketplace shailendergoud2907/ladakh-ride
```

Answer `y` to add the marketplace, then pick the user scope.

## Develop

```
claude plugin validate .
claude plugin test .
```

## More mods in this repo

| Mod | What it does | Install |
| --- | --- | --- |
| ride-status | Status line shows context used as altitude | `/plugin install ride-status --marketplace shailendergoud2907/ladakh-ride` |
| focus-timer | `/focus 25` starts a timer, `/focus stop` cancels | `/plugin install focus-timer --marketplace shailendergoud2907/ladakh-ride` |
| safe-ride | Blocks `rm -rf` on home or root, plain force-push, `git reset --hard` | `/plugin install safe-ride --marketplace shailendergoud2907/ladakh-ride` |
| tool-log | Side panel of tool calls, `/tool-log` | `/plugin install tool-log --marketplace shailendergoud2907/ladakh-ride` |
| done-chime | Chime and toast after a turn of 30 s or more (sound plays on macOS) | `/plugin install done-chime --marketplace shailendergoud2907/ladakh-ride` |
| limit-alert | Toast at 80% and 95% of the 5-hour limit | `/plugin install limit-alert --marketplace shailendergoud2907/ladakh-ride` |
| mba-voice | Adds a short working-style note to the system prompt | `/plugin install mba-voice --marketplace shailendergoud2907/ladakh-ride` |
| ladakh-tips | `/ladakh` prints a riding tip | `/plugin install ladakh-tips --marketplace shailendergoud2907/ladakh-ride` |
