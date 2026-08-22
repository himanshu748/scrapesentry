# ScrapeSentry product design thesis

## Product truth

HTTP success is not data success. ScrapeSentry interrogates every scraper result, isolates contract violations and releases output only after recovery is proven.

## Audience

Scraper engineers, data platform teams and evaluators who need to see the safety policy work, not read feature claims.

## Desired feeling

Precise, controlled and memorable. Failure should feel urgent while recovery feels earned.

## Primary action

Run the real recovery flow in the live console.

## Visual concept

Data under interrogation. Structured rows physically pass through a contract scanner. A false HTTP success tears apart under contract inspection, broken fields fall into quarantine and a guarded line carries the repair through human approval to verified output.

## Archetype

- Primary: data story
- Secondary: technical instrument with a cinematic reveal

## Product map

- `/` makes the silent failure legible, demonstrates the safety policy and routes visitors into the product
- `/console` is the operating surface for monitoring, quarantine, repair approval and guarded release
- `/docs` explains how an engineer connects an existing collector, configures the server and consumes protected output
- `/evidence` ties product claims to recorded Bright Data jobs, source artifacts, fingerprints and verification gates

The shared navigation uses Product, Console, Docs and Evidence so a visitor can move from understanding to operation to adoption to proof without searching through one long page.

## Landing page silhouette

An asymmetric editorial hero is dominated by a horizontal scanner. A split receipt exposes the difference between HTTP and data success. One continuous recovery mechanism spans the page, followed by a practical adoption path, a compact evidence ledger and an agent-native command surface. The real operating console lives on its own route.

## Type strategy

Instrument Serif carries the editorial argument. Inter keeps product copy and controls precise. JetBrains Mono labels rows, contracts, jobs, hashes and gates. Large type appears only for the central truth while operational text stays compact and legible.

## Material and color language

Cold silver-white canvas, graphite ink and brushed-metal controls. Emerald is reserved for verified output. Coral red is reserved for failure and quarantine. Thin rules, square data rails and restrained radii keep the surface technical without becoming sterile.

## Media strategy

The landing narrative uses code-native rows, receipts, gates, SVG paths and terminal evidence instead of repeating dashboard captures. Existing production captures remain available inside the real evidence system and demo assets, but no screenshot carries the public story.

## Signature moment

An Anime.js contract scan moves twelve incoming records through the gate, ejects the broken row into quarantine and steadies the verified output. Visitors can replay it. Reduced-motion users receive the complete final state immediately.

## Motion concept

The emotional target is controlled urgency. Anime.js owns the scanner timeline and row choreography. Motion owns viewport staging, shared step state and tactile controls. The signature easing is decisive deceleration. Durations use 140ms for press feedback, 360ms for interface state and 720ms for narrative reveals.

## Three cliches to avoid

- A dashboard screenshot used as the hero
- A repeated grid of rounded feature cards
- Generic scroll reveals with no relationship to the recovery story

## Responsive model

The hero keeps the argument first. Verified output remains left of the contract gate while incoming rows remain right at tablet, laptop and desktop widths. At narrow phone widths the scanner becomes a vertical source-to-output gate. The HTTP receipt split becomes a stacked comparison with the contract tear preserved. The recovery rail becomes a vertical guarded path, not five stacked cards. Controls stay at least 44px and all landing interactions remain keyboard accessible.

The adoption section gives visitors two honest paths: evaluate the complete credit-safe hosted recovery or follow the dedicated setup guide to connect an existing collector through the server-side production adapter and MCP. Public credentials never enter browser code.

## Interaction contract

The scanner can be replayed. Recovery steps support click, touch and arrow-key navigation. The approval mechanism changes the selected story state but does not pretend to mutate production. The primary CTA moves to the real console where drift, repair, approval and verification call the backend policy engine.

## Accepted concept fidelity lock

The accepted production specification is encoded in the landing components, the brand system and `dashboard/design/landing-v4-thesis.md`. Internal review renders stay local and are intentionally excluded from the repository.

- Canvas: true white with cool graphite text, hairline gray rules, emerald success and coral failure
- Hero: editorial copy on the left, open data rails on the right and a physical metal contract gate centered between verified and incoming rows
- Hero copy: “Scrapers fail silently. ScrapeSentry does not.” followed by the supplied data-drift sentence
- Hero actions: “Watch it recover” then “Open live console”
- Header: ScrapeSentry, Product, Console, Docs, Evidence and one compact console action
- Failure story: “Data under interrogation” and “A 200 response can still be a data failure.”
- Failure media: two torn paper receipts, HTTP success on the left and a cracked failed data contract on the right
- Recovery: one continuous white pipeline with five physical gates, a failed record, a verified record and a coral quarantine evidence tray
- Generated machine asset: /product/contract-gate-v2.png, used as a transparent cutout while all interface labels and records stay code-native

No dark hero panel, no dark recovery section, no hero kicker and no proof-chip row are allowed in this direction.

## Route concepts

The landing route follows the accepted product thesis. The application, docs and evidence routes share the same hierarchy, rhythm and material language:

- Console: a dense recovery control plane with collector identity, protected output, violation evidence and release gates
- Docs: a calm quick-start layout with copyable commands, a sticky index and visible outcomes
- Evidence: an auditable ledger with provider identities, captured contract, artifact fingerprint and release verification

Exploratory layouts guide hierarchy, rhythm and material language. Generated commands, endpoints and provider claims are rejected unless the repository or production evidence supports them.
