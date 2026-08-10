# Render triggers — what makes a component re-render

**One-sentence version (what I'd say first in an interview):**
A component re-renders when its own state changes, when its parent re-renders, or when a context it consumes changes — and rendering is strictly top-down, so a component can never trigger a sibling to re-render directly.

**How it works (my own words, no copy-paste):**
Render is a function call: React calls your component with (props, state, context) and gets JSX back. It re-calls that function when any of those three inputs change:

1. **Own state** — `setState` in the component schedules a re-render of that component and, by default, everything below it in the tree.
2. **Parent re-rendered** — if the parent re-renders, React re-renders the child too, *even if the props are identical*. Props changing is not the trigger; the parent rendering is. (`React.memo` is the opt-out: skip the re-render if props are shallowly equal.)
3. **Context changed** — any component subscribed via `useContext` re-renders when the provider's value changes, regardless of where it sits in the tree.

The tree shape is the key constraint: state flows down as props, events flow up as callbacks. There is no sideways channel. If sibling B needs to react to something typed in sibling A, the state must live in their common ancestor (lifting state up) or in something outside the tree both subscribe to (context, an external store). A's `setState` re-renders A and A's subtree — B is not in A's subtree, so B is untouched.

**Where it shows up in my project (file + what happened):**
`app/page.tsx` — `ParticipantForm` holds all its fields in one `formData` object. Typing in the Name input calls `setFormData`, which re-renders the whole `ParticipantForm` — every field re-renders even though only `name` changed. Meanwhile `GoalForm` and `NotesForm`, which sit beside it in `Home`, don't re-render at all: they're siblings, not children, and share no state or context. `GoalRow` re-renders only when `GoalForm`'s `goals` state changes (parent-driven) — it has no state of its own anymore after I removed `isSelected`.

**The mistake I made / bug I hit, and why it happened:**
The naive mental model is "props changed → child re-renders," which leads to over-eager memoization. The actual rule is "parent rendered → child renders unless memoized." So the fix for wasted renders is usually not sprinkling `useMemo` everywhere but moving state *down* closer to where it's used, so the re-render subtree is smaller. Keeping `draftGoal` inside `GoalForm` instead of in `Home` is exactly that: typing in the draft box re-renders `GoalForm` only, not the whole page.

**Question I'd ask a candidate to test this:**
"Two sibling components both need a value the user types into one of them. Where does the state have to live, why, and what re-renders on each keystroke?" — A good answer names the common ancestor (or context/store), explains that siblings can't trigger each other because render is top-down, and identifies the re-render boundary as the state owner's subtree.
