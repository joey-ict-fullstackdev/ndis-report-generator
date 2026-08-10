# Keys & reconciliation — what React actually keys on

**One-sentence version (what I'd say first in an interview):**
When diffing lists, React matches old children to new children by `key` (within the same parent and position among siblings of the same type), and the key is React's only notion of element identity — so if the key lies (e.g. array index), React preserves and reuses the wrong component instance, including its internal state.

**How it works (my own words, no copy-paste):**
Reconciliation is React comparing the previous element tree to the next one to produce minimal DOM operations. Two assumptions make it O(n) instead of O(n³):

1. **Different types → different trees.** If the element type at a position changes (`<div>` → `<section>`, `GoalRow` → `OtherRow`), React tears down the whole subtree and rebuilds — no attempt to diff into it.
2. **Lists are matched by key.** For arrays, React builds a map from `key` → old child. On the next render it walks the new array and looks each key up: match → keep the existing component instance, update its props, and *preserve its state*; no match → unmount the leftover old ones, mount the new ones.

The critical consequence: **state belongs to the instance, and the instance is identified by the key.** React doesn't know what a "goal" is. It only knows "the child with key K before, and the child with key K now — same component, keep its state, pass new props." If K is the array index, then after deleting the first item, every remaining item shifts down an index — so the instance React kept at index 1 now receives *different* props (the text of what used to be item 2), while keeping the *old* state. The component "becomes" a different item while remembering things about the previous one. That's the key lying about identity.

A stable, unique id (minted once at data-creation time, e.g. `crypto.randomUUID()`) makes the key truthful: the same data keeps the same key across deletes and reorders, so each instance's state travels with its data. Generating the key *during render* (`key={crypto.randomUUID()}`) is the opposite failure — every render produces new keys, React sees zero matches, and remounts the entire list every time, destroying all state and DOM.

**Where it shows up in my project (file + what happened):**
`app/page.tsx` — I built the bug on purpose in `GoalFormIndexDemo`: rows keyed by `key={index}`, each `IndexDemoRow` holding local `isSelected` state. The real `GoalForm` then got the fix: `goals` is `{ id: string; text: string }[]`, ids minted once via `crypto.randomUUID()` at creation (initializer for seeds, `handleAddGoal` for new ones), rows keyed `key={goal.id}`. The delete/reorder logic (`filter`/`splice`) didn't change at all — only what the array holds and how the text is read back (`goal.text`).

**The mistake I made / bug I hit, and why it happened:**
The demo test: select C, delete A. With index keys, deleting A shifted B and C down to indices 0 and 1. React matched index 1 to the old instance at index 1 — which was B's row, holding B's state — and fed it C's text. C's selection vanished; the state stayed glued to the *position* instead of the *data*. After the id-key fix, the same test passes: React matches C's id across renders, the instance with the `isSelected = true` state is re-parented to its new position, and the selection travels with C. My first version of the real form also had a disguised index key — `` key={`${goal}-${index}`} `` — which is the same bug, since the index is still in the key.

**Question I'd ask a candidate to test this:**
"A todo list has an uncontrolled `<input>` inside each row, keyed by index. User types in row 3, then deletes row 1. What does the user see, and why?" — A strong answer explains key-based matching: row 3's text appears in row 2's position (or the typed value jumps rows) because React kept the instance at index 1 and gave it new props, state/DOM included. Bonus: name both wrong fixes (index keys, render-time random keys) and the right one (stable id minted at creation).
