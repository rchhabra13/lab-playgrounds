# AI Memory Playground (Agent Memory Lab)

On Monday you tell an AI assistant you're vegetarian. On Friday you ask where to eat, and it suggests a steakhouse. It didn't forget. It never remembered in the first place.

This lab is a single web page that explains why that happens and what "agent memory" really means. The short version is that the model has no memory of its own. It only sees one block of text per request, the context window. Everything people call memory is the software around the model writing things down, storing them somewhere else, and pasting the right pieces back in at the right moment.

## What's on the page

The page follows that one vegetarian example from start to finish. It first walks through the four kinds of memory researchers usually talk about, taken from the CoALA paper: working memory (what the model can see right now), episodic memory (things that happened, and when), semantic memory (plain facts like "Diet: vegetarian"), and procedural memory (standing rules like "keep answers short").

Then comes the playground. It's a simulated agent with two chat sessions already loaded. Replies come from simple rules instead of a real model, so nothing is hidden and every memory step is visible. You can watch it recall your diet in session 2 even though that message has scrolled out of its context window. Tell it "I moved to Berlin", start a new session, and ask for dinner again to see an old fact get replaced. Sliders let you shrink the context window or change how many memories get recalled, and you can switch each memory store on or off to see what breaks.

After the playground, the page breaks one message into its five steps (retrieve, assemble, respond, write, maintain) and covers the hard parts real systems struggle with: deciding what's worth saving, resolving conflicts, retrieval misses, stale facts, memory poisoning, and privacy. It closes with real systems that do this today, including Claude Code's memory folder, MemGPT/Letta and Mem0, plus links to the papers.

## Running it

There's nothing to install. Open `index.html` in any browser. The only thing it fetches is its fonts from Google Fonts, and the whole agent runs in the page, so nothing you type leaves your machine. Offline, it still works with fallback fonts.
