import { GROWTH_FUNNEL_STEP_TYPE } from "@/lib/growth/roles";

export const DEFAULT_GROWTH_FUNNEL_STEPS = [
  { stepType: GROWTH_FUNNEL_STEP_TYPE.LANDING_PAGE, label: "Landing page" },
  { stepType: GROWTH_FUNNEL_STEP_TYPE.EMAIL_SEQUENCE, label: "Nurture emails" },
  { stepType: GROWTH_FUNNEL_STEP_TYPE.CTA, label: "Call to action" },
] as const;

export const FUNNEL_TERM_CARDS = [
  {
    label: "Funnel",
    title: "What a funnel is",
    body: [
      "A named path you move people through — for example Garden Consultation.",
      "Contacts live in CRM. The funnel is the journey you assign them to.",
    ],
  },
  {
    label: "Assign contacts",
    title: "How contacts join a funnel",
    body: [
      "Use Assign contacts on a funnel, or Add all CRM contacts to move everyone here.",
      "A contact can only be in one funnel at a time. Moving them here removes them from any other funnel.",
    ],
  },
  {
    label: "Checkout buyers",
    title: "Use for checkout vs Checkout funnel",
    body: [
      "Those are the same control, not two features. Off reads Use for checkout. On reads Checkout funnel.",
      "On means new paid Discover orders automatically join this funnel. It does not add people who are already in CRM — assign those here.",
    ],
  },
  {
    label: "Pause",
    title: "What Pause does",
    body: [
      "Pause marks the funnel inactive so new checkout buyers will not land here.",
      "Contacts already in the funnel stay. Activate turns it back on.",
    ],
  },
  {
    label: "Workspace vs page",
    title: "What visitors see",
    body: [
      "Funnel name, objective, and internal notes are for you in Growth and CRM.",
      "The Hero section and the rest of the public page are what people see at rootsync.io/{your-profile}/funnels/{funnel-url}.",
    ],
  },
  {
    label: "Page design",
    title: "How the funnel maker works",
    body: [
      "Add several pictures or videos, then use Up / Down to move each file between the top of the page and your sections.",
      "You can also drop media into a section with the Pulse editor. Change background, fonts, and shapes; the live preview sits beside the editor on wide screens.",
    ],
  },
] as const;
