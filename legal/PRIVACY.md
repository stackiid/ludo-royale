# Privacy Policy

**Last updated:** August 2026

This Privacy Policy explains what happens to your data when you play
**Ludo Royale**. The short version: there's no server, no account, and
nothing about your play is ever sent anywhere. Here's the full picture.

## 1. We Don't Collect Anything

Ludo Royale has no backend server, no database, and no analytics. We (the
developer) have no way to see how you play, who you are, or anything else
about your session - because nothing you do in the Game is ever
transmitted to us or to anyone else.

Specifically, the Game does **not**:

- Create user accounts or require sign-in
- Collect names, emails, or any personal information
- Use cookies
- Use analytics, telemetry, or tracking pixels of any kind
- Show ads or share data with advertisers
- Transmit your gameplay, statistics, or player names anywhere

## 2. What's Stored, and Where

The Game uses your browser's built-in `localStorage` - a storage area
that lives entirely on your own device and is never sent over the
network - to remember three things between visits:

| Stored data     | What it contains                                                            | Why                                             |
| --------------- | --------------------------------------------------------------------------- | ----------------------------------------------- |
| **Settings**    | Sound on/off, animations on/off                                             | So your preferences persist between sessions    |
| **Statistics**  | Games played, wins, losses, fastest win, longest match                      | So the Statistics screen has something to show  |
| **Saved match** | The in-progress match's board state, whose turn it is, and the elapsed time | So "Resume Match" works after you close the tab |

The player names you type in Match Setup are part of that saved match
data - stored locally, never transmitted, and easy to change or clear at
any time via Settings → **Clear Saved Match** / **Reset Statistics**, or
by clearing your browser's site data for this page.

## 3. Third-Party Content Delivery Networks

To render fonts, icons, and animations, the Game loads a small number of
resources from third-party CDNs when you open it:

- **Google Fonts** (fonts.googleapis.com, fonts.gstatic.com) - Space Grotesk & Inter typefaces
- **cdnjs.cloudflare.com** - Font Awesome icons and the Anime.js animation library
- **cdn.tailwindcss.com** - the Tailwind CSS utility engine

Loading any resource from a URL involves your browser making a standard
HTTP request, which - like any request to any website - can expose
ordinary technical information (such as your IP address and browser type)
to that provider, per their own privacy policies. We don't control what
these providers do with that request-level data, and we don't send them
anything about you beyond what your browser sends automatically when
fetching a font or script file. If you'd prefer not to make these
requests at all, you can self-host these resources when running your own
copy of the Game (see `README.md`).

## 4. Children's Privacy

The Game is generally suitable for players of any age and, since it
collects no personal information from anyone, imposes no age restriction.
If you're a parent or guardian and have questions about what data the
Game stores, Section 2 above is the complete list.

## 5. Data Security

Because everything is stored locally in your own browser, the security of
that data is governed by your own device and browser's security - the
same way it would be for any other website's local storage. We recommend
keeping your browser up to date.

## 6. Your Choices

You're always in control of your locally-stored data:

- **Clear it selectively** via Settings → Reset Statistics / Clear Saved Match, in-game.
- **Clear it entirely** via your browser's "Clear browsing data" for this site.
- **Prevent it entirely** by using private/incognito browsing, though this also means statistics and match-resume won't work.

## 7. Changes to This Policy

If this policy changes, we'll update the "Last updated" date above. Since
there are no accounts or emails on file, we have no way to notify you
directly - please check back if you have concerns.

## 8. Contact

Questions about this Privacy Policy? Reach out via the contact details in
[README.md](../README.md#credits--author).
