/**
 * policyClash.js
 * ------------------------------------------------------------
 * "Policy Clash" is the mid-fight civics quiz mechanic. Every
 * question is written to state a fact, or to clearly label an
 * opinion/platform position as belonging to a party rather than
 * as settled truth. Correct answers award a Stamina or Meter
 * bonus to whichever fighter answers correctly.
 * ------------------------------------------------------------
 */

const POLICY_CLASH_QUESTIONS = [
  {
    prompt: "How many U.S. Senators does each state get, regardless of population?",
    choices: ["1", "2", "3", "It depends on population"],
    correct: 1,
    explain: "Every state gets exactly 2 U.S. Senators — that's set by the Constitution.",
    reward: "stamina"
  },
  {
    prompt: "Which branch of government is primarily responsible for writing federal laws?",
    choices: ["Executive", "Judicial", "Legislative", "Cabinet"],
    correct: 2,
    explain: "Congress (the Legislative branch) writes and passes federal laws.",
    reward: "meter"
  },
  {
    prompt: "A candidate says 'we should lower taxes to grow the economy.' Is that a fact or an opinion?",
    choices: ["A proven fact", "A policy opinion/position", "A court ruling", "A law"],
    correct: 1,
    explain: "That's a policy position — economists disagree on its effects. It's an opinion, not a settled fact.",
    reward: "stamina"
  },
  {
    prompt: "How many votes does it take in the Senate to override a presidential veto (with the House also voting)?",
    choices: ["Simple majority", "2/3 in each chamber", "3/5 in the Senate only", "Unanimous"],
    correct: 1,
    explain: "Overriding a veto requires a 2/3 vote in both the House and the Senate.",
    reward: "meter"
  },
  {
    prompt: "What is the minimum age to serve as President of the United States?",
    choices: ["30", "35", "40", "25"],
    correct: 1,
    explain: "The Constitution sets the minimum age for President at 35.",
    reward: "stamina"
  },
  {
    prompt: "True or false: every U.S. state runs its elections exactly the same way.",
    choices: ["True", "False"],
    correct: 1,
    explain: "False — states set their own election rules within federal law, so procedures vary a lot.",
    reward: "meter"
  }
];

function getRandomPolicyClashQuestion(excludeIndexes = []) {
  const pool = POLICY_CLASH_QUESTIONS
    .map((q, i) => i)
    .filter(i => !excludeIndexes.includes(i));
  const chosen = pool.length ? pool : POLICY_CLASH_QUESTIONS.map((q, i) => i);
  const idx = chosen[Math.floor(Math.random() * chosen.length)];
  return { index: idx, question: POLICY_CLASH_QUESTIONS[idx] };
}
