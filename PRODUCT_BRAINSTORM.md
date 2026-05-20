# PRODUCT_BRAINSTORM.md - work_search_log

Draft v1 - 2026-05-19.

This note is a companion to `PRODUCT_PLAN.md`. The plan is strong on the
compliance wedge: helping people record unemployment work-search activity in a
state-shaped way. This brainstorm asks a broader product question:

> Are LinkedIn and other job-search platforms actually serving young people and
> job seekers more broadly, or is there room for a more humane, idea-oriented
> job-search tool?

Short answer: the compliance tool is still the cleanest first product. But the
new `Dream Jobs` feature points at something promising: a private, low-pressure
place where a person can collect job ideas, half-formed career directions,
networking thoughts, voice notes, email drafts, and "maybe someday" interests
before they become formal applications or unemployment records.

---

## 1. Working Thesis

LinkedIn, Indeed, Handshake, Huntr, Teal, Simplify, and ATS portals mostly
optimize for **formal job-search artifacts**:

- a polished profile;
- a resume and cover letter;
- a saved job;
- an application;
- a recruiter message;
- an interview stage;
- a hire.

That is useful, but it skips the messy middle where many real searches happen:

- "I might want to work in climate, but I don't know where."
- "I met someone interesting and should follow up."
- "This job is not right, but this company is."
- "I am embarrassed to ask for help."
- "I need to sound human in an email, not like a template."
- "I need to prove I am searching for UI, but I also need to figure out what I
  actually want."

That messy middle is where this app could differentiate. The product does not
need to become another job board. It can become a **local-first career notebook
with compliance-grade exports when needed**.

---

## 2. Are Current Platforms Serving Young Job Seekers?

### 2.1 What platforms do well

LinkedIn and the broader job-search ecosystem are not useless. They provide:

- enormous job and people search coverage;
- social proof through profiles, endorsements, work history, and posts;
- recruiter visibility;
- school, alumni, and weak-tie discovery;
- saved jobs and application tracking;
- AI matching and resume/profile tooling;
- increasingly good natural-language search.

LinkedIn's own 2026 research says its AI-powered job search is being used at
large scale, and it now pushes job seekers toward better matches rather than
pure application volume. The 2026 Grad's Guide also correctly identifies that
network access is a major barrier for young workers.

### 2.2 Where they fall short

The main failure is not that LinkedIn has no jobs. The failure is that the
experience often makes the job seeker feel like inventory.

Current signals:

- LinkedIn reported in January 2026 that U.S. applicants per open role had
  doubled since spring 2022, and 65% of people said finding a job had become
  more challenging.
- LinkedIn's April 2026 grad research found that 44% of Gen Z respondents said
  not having the right network was the biggest barrier to landing an
  entry-level role.
- iCIMS reported in June 2025 that entry-level applications were up 22% year
  over year, openings were flat, hires were down 8% since the prior May, and
  new grads faced a 6.6% unemployment rate.
- The New York Fed's Q4 2025 recent-grad labor-market data showed 5.7%
  unemployment and 42.5% underemployment among recent college graduates.
- Huntr's Q1 2026 dataset reported a 108-day median time from search start to
  first offer, with applications sourced through Google converting to
  interviews at more than twice LinkedIn's rate in its sample.
- Huntr's Q1 2026 survey also found very low trust in online listings, with
  many respondents reporting suspected ghost jobs or scams.

The exact numbers vary by source and methodology, but the pattern is clear:
young people are being told to network, tailor, apply, build projects, use AI,
avoid scams, understand ATS systems, prove skills, and stay optimistic in a
market where the feedback loop is often silent. That is a lot of cognitive and
emotional load.

### 2.3 The youth-specific gap

Young job seekers often lack:

- a strong network;
- a clear vocabulary for the work they want;
- enough prior work examples to satisfy "entry-level but experienced" roles;
- confidence about whether a message is appropriate;
- knowledge of which opportunities are real;
- practice turning interest into outreach;
- a private place to explore without performing publicly.

LinkedIn is public, performative, and reputation-sensitive. That helps once
someone knows what they want to say. It is a poor place to be uncertain.

### 2.4 The broader gap

This is not only a youth problem. Career changers, laid-off workers,
neurodivergent job seekers, older workers, caregivers returning to work,
immigrants, and unemployed people dealing with UI requirements face similar
friction:

- formal tools pressure them to "look professional" before they have clarity;
- job boards reward volume even when volume becomes demoralizing;
- networking advice is vague;
- applications and compliance records live in separate systems;
- the emotional side of searching is treated as outside the product.

This suggests a product opening: **less job board, more search companion**.

---

## 3. What The Current Code Already Suggests

The repo has already moved beyond the original 2018 HTML log.

Current architecture:

- React SPA under `client/src`;
- Node HTTP JSON API in `server.js`;
- SQLite storage in `db.js`;
- Form-1750-aligned entry fields;
- edit/delete/backdate support;
- week view and CSV export;
- week metadata for partial UI;
- tests in `tests/server.test.js`;
- `Dream Jobs` route in `client/src/pages/Dreams.jsx`.

The important product shift is `is_dream`.

In `db.js`, entries can now be either:

- regular work-search records, counted in daily/weekly views; or
- dreams, excluded from compliance views until promoted.

In `Dreams.jsx`, a user can:

- add a dream;
- edit it;
- delete it;
- promote it into a real work-search activity on a chosen date.

That is small in code, but big in product meaning. It creates a third state
between "nothing" and "official activity":

1. **Idea** - interesting, not yet acted on.
2. **Action** - applied, contacted, attended, researched, followed up.
3. **Record** - exported for UI or personal accountability.

Most job trackers start at step 2. This app can start at step 1.

---

## 4. Viable Product Directions

### 4.1 Direction A: Compliance-first with a gentle idea layer

This is the safest next product.

Keep the primary promise:

> Keep unemployment work-search records privately and export them cleanly.

Add a secondary promise:

> Capture job ideas before they become work-search activities.

Features:

- Dream jobs list.
- "Promote to activity."
- Idea notes.
- Follow-up reminder date.
- Source: LinkedIn, Indeed, friend, event, article, company website, voice note.
- Tags: industry, location, remote, values, skills, people, scary-but-interesting.
- "Why this caught my eye" field.

Why it works:

- small delta from current code;
- keeps liability low;
- makes the app more useful between required weekly entries;
- avoids competing head-on with LinkedIn/Teal/Huntr.

### 4.2 Direction B: Career idea notebook

This is the more interesting product.

The app becomes a private space for:

- dream jobs;
- companies;
- people;
- interests;
- projects to build;
- skills to learn;
- conversations to have;
- emails and call scripts;
- reflections after interviews or networking.

The UI could have lightweight object types:

- `Idea`
- `Company`
- `Person`
- `Opportunity`
- `Conversation`
- `Application`
- `Work-search activity`

The key design move: do not force every thought into a job application. Let
informal material stay informal until the user is ready.

### 4.3 Direction C: Interest-sharing network

This is the riskiest but potentially broadest.

The product could help people share interests with trusted contacts:

- "I am curious about biotech operations in Boston."
- "I want to talk to someone who moved from teaching into instructional design."
- "I am looking for part-time lab work, not necessarily a full-time job."
- "I want to build a tiny project with someone to prove a skill."

This should not start as a public social feed. LinkedIn already owns the public
performance layer, and performing uncertainty is hard. A better shape:

- private by default;
- share one card at a time;
- export a plain-language "career interests" note;
- generate a warm message to a specific person;
- track who has seen or responded;
- no likes, follower counts, or public ranking.

This could become a humane alternative to "networking" as a vague command.

---

## 5. AI Features That Fit

AI should reduce blank-page anxiety, not manufacture fake certainty.

### 5.1 Whisper-style voice capture

Use case:

> "I just walked out of an event. I met Priya from Vertex, she said regulatory
> ops might be a good path, and I should email her next week."

Flow:

1. User records a short voice note.
2. Transcription turns it into text.
3. AI extracts structured suggestions:
   - person;
   - organization;
   - topic;
   - possible follow-up;
   - date/reminder;
   - whether it might count as a work-search activity.
4. User reviews before saving.

Privacy posture:

- make recording local-first where possible;
- clearly label whether audio/text leaves the device;
- store transcript, not raw audio, by default;
- never auto-create compliance records without user confirmation.

### 5.2 Networking plan generator

Input:

- target field;
- current skills;
- location;
- comfort level;
- existing contacts;
- time available this week.

Output:

- 3 people or groups to contact;
- 2 events or organizations to investigate;
- 1 low-pressure message;
- 1 concrete work-search activity that could count for UI if completed.

This is especially useful because "network more" is both correct and uselessly
vague. The product can turn it into a humane weekly plan.

### 5.3 Email and call templates

Useful templates:

- informational interview request;
- follow-up after meeting someone;
- alumni outreach;
- recruiter response;
- "I applied and wanted to introduce myself";
- "Do you know who I should talk to?";
- voicemail script;
- post-interview thank-you;
- gentle second follow-up.

Important design rule: the output should sound like the user, not like
LinkedIn sludge. Let the user choose tone:

- direct;
- warm;
- concise;
- curious;
- very informal;
- more polished.

### 5.4 Idea clustering

AI can periodically summarize patterns:

- "You keep saving lab operations, climate data, and public-interest tech."
- "Most of your dream jobs involve writing plus systems."
- "You have 7 ideas but only 1 person attached to them."
- "Three ideas could become UI-countable activities this week."

This is more valuable than generic career advice because it uses the user's
own notes.

### 5.5 Scam and ghost-job heuristics

The product can help users evaluate listings before investing emotional energy:

- stale posting;
- no salary;
- suspicious recruiter email domain;
- request for payment/equipment purchase;
- vague company identity;
- duplicated listing across many locations;
- unrealistic entry-level requirements.

This should be presented as "risk signals," not definitive truth.

---

## 6. Features Worth Considering

### Near-term additions to current app

1. Rename or broaden `Dream Jobs` to `Ideas`.
2. Add `status` to dream/idea records:
   - idea;
   - research;
   - person to contact;
   - contacted;
   - applied;
   - paused;
   - no longer interested.
3. Add `next_step` and `remind_on`.
4. Add `source` and `source_url`.
5. Add `interest_tags`.
6. Add "promote to work-search activity" with an interstitial review screen.
7. Add "generate outreach draft" from an idea.
8. Add "convert note to structured idea" for pasted notes.

### Medium-term product features

1. Voice note capture and transcription.
2. People/contact notebook.
3. Networking plan for the week.
4. AI-assisted email/call scripts.
5. Project ideas linked to dream roles.
6. Skills evidence tracker: projects, writing samples, volunteer work,
   coursework, certifications.
7. "Confidence log" or "search journal" for morale and pattern recognition.
8. Weekly review:
   - required UI activities;
   - actual activities;
   - dream ideas added;
   - people contacted;
   - next week's plan.

### Product features to avoid early

1. Public social feed.
2. Automated mass applying.
3. Auto-submission into state UI portals.
4. Resume exaggeration or synthetic experience generation.
5. Employer/recruiter marketplace.
6. Ranking users by search activity.

Those features either create liability, duplicate stronger incumbents, or make
the product feel less safe.

---

## 7. Suggested Data Model Extension

The current `entries` table can stretch a little further, but a broader idea
product will want separate tables.

Possible next schema:

```sql
ideas (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  organization TEXT,
  status TEXT NOT NULL DEFAULT 'idea',
  source TEXT,
  source_url TEXT,
  why_interesting TEXT,
  next_step TEXT,
  remind_on TEXT,
  notes TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

people (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  organization TEXT,
  role TEXT,
  email TEXT,
  linkedin_url TEXT,
  notes TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

idea_people (
  idea_id INTEGER NOT NULL,
  person_id INTEGER NOT NULL,
  relationship TEXT,
  PRIMARY KEY (idea_id, person_id)
);

idea_events (
  id INTEGER PRIMARY KEY,
  idea_id INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  body TEXT,
  created_at INTEGER NOT NULL
);
```

Then `entries` remains the compliance/activity log. An idea can create an
entry, but they are not the same object.

This separation matters because "dream" is conceptually not just a future
entry. It may become a person, a project, a skill plan, a company to watch, or
nothing at all.

---

## 8. UX Principles

1. **Private before performative.** People need somewhere to be uncertain.
2. **Ideas before applications.** Not everything starts as a job posting.
3. **Human language before career jargon.** Let users write messy notes.
4. **User confirmation before records.** Never silently turn a thought into a
   UI compliance claim.
5. **Low shame.** The interface should not punish pauses, gaps, or abandoned
   ideas.
6. **Actionable, not overwhelming.** A weekly plan should be three doable
   moves, not a productivity sermon.
7. **Exportable always.** Users should own their records, notes, and drafts.

---

## 9. Product Positioning

Possible positioning:

> A private job-search notebook for ideas, outreach, and unemployment
> work-search records.

Or:

> Capture the messy middle of finding work: ideas, people, notes, follow-ups,
> and official activity logs.

Or, more civic-tech:

> A local-first work-search companion for people navigating unemployment,
> career change, and the modern job market.

The product should not claim to replace LinkedIn, Indeed, Handshake, Teal, or
Huntr. It should sit underneath them:

- save a LinkedIn role into the notebook;
- turn a Handshake event into a follow-up plan;
- turn an Indeed listing into a work-search activity;
- turn a conversation into a reminder;
- turn a messy thought into a next step.

---

## 10. Recommendation

Do not pivot away from the compliance product yet. That is still the sharpest
wedge because it solves a concrete problem with a clear artifact: weekly
work-search records.

But do broaden the product vocabulary from `Dream Jobs` to `Ideas`.

Recommended next product increment:

1. Keep `Dream Jobs` working as-is.
2. Rename the visible route to `Ideas` while preserving the underlying
   `is_dream` field for now.
3. Add `next_step`, `source_url`, and `status`.
4. Add a simple "Draft outreach" button that generates a local template from
   the idea fields without calling AI yet.
5. Add a weekly review section:
   - activities logged;
   - ideas captured;
   - follow-ups due;
   - ideas that could become UI-countable activities.

Then, if that feels alive in real use, add AI in this order:

1. pasted-note-to-idea extraction;
2. outreach draft generation;
3. networking plan generation;
4. voice transcription;
5. scam/ghost-job risk review.

This keeps the product grounded: a useful private log first, an AI career
companion second, and a social product only much later if real users pull it
there.

---

## Sources

- LinkedIn, "LinkedIn Research: Nearly 80% of people feel unprepared to find a
  job in 2026," Jan. 7, 2026:
  https://news.linkedin.com/en-us/2026/LinkedIn-Research-Talent-2026
- LinkedIn, "How Graduates Can Find the Best Job Opportunities in 2026,"
  Apr. 15, 2026:
  https://news.linkedin.com/2026/Grads-Guide-2026
- Indeed Hiring Lab, "What Workers Expect When They're Expecting Better Work,"
  Jan. 19, 2026:
  https://www.hiringlab.org/2026/01/19/2025-indeed-workforce-insights-survey/
- iCIMS, "New iCIMS Research Shows Gen Z Is Eager to Prove Their Skills, But
  Face a Tight Job Market and Hiring Disconnects," Jun. 24, 2025:
  https://www.icims.com/company/newsroom/juneinsights2025/
- Federal Reserve Bank of New York, "The Labor Market for Recent College
  Graduates," Q4 2025 data:
  https://www.newyorkfed.org/research/college-labor-market
- Huntr, "The Q1 2026 Job Search Trends Report," May 2026:
  https://huntr.co/research/job-search-trends-q1-2026

