/*
 * JavaScript for the 4C Workshop website
 * Handles dynamic rendering of modules, progress tracking, answer toggling and quiz evaluation.
 */

document.addEventListener('DOMContentLoaded', () => {
  /**
   * Data describing each workshop segment. Each object contains
   * metadata for rendering the card, instructions and simulation answers.
   */
  const modulesData = [
    {
      id: 'orientation',
      title: 'Orientation & Assumptions',
      time: '0–3 min',
      objective:
        'Confirm scope, tools and deliverables so everything you produce is reusable.',
      instructions:
        'Confirm you will work offline (no browsing, code or images). Note any small tweaks such as your sector or audience. Then copy and paste the provided 4C prompt into ChatGPT.',
      prompt: `Context: You are a marketing professional learning prompt engineering using ChatGPT text only with synthetic data.\nTask: Restate the assumptions in 3 bullets: audience, tools/constraints, primary deliverables. Confirm they fit; if not, propose one minimal adjustment.\nOutput Format: Three bullets + optional single adjustment line.\nConstraints & Tone: Concise, practical, ready to proceed.`,
      expected:
        'You produce a short confirmation with at most one focused adjustment.',
      selfCheck: [
        'Did you confirm no browsing/code/images?',
        'If your context differs, did you note a minimal adjustment?'
      ],
      simulation:
        '<ul><li><strong>Audience:</strong> Marketing professional new to prompt engineering, using the 4C framework.</li><li><strong>Tools/constraints:</strong> ChatGPT text only; no browsing, code or images; synthetic data.</li><li><strong>Deliverables:</strong> 4‑Component Cheat Sheet for Marketing and Best Practices &amp; Pitfalls. Adjustment (if needed): Keep examples in B2B manufacturing; swap to your sector if required.</li></ul>',
      icon: 'images/role.png'
    },
    {
      id: 'framework',
      title: 'The 4‑Component Framework',
      time: '3–8 min',
      objective:
        'Summarize each component with marketing examples to build your cheat sheet.',
      instructions:
        'Define each 4C element and provide two short marketing examples per element using synthetic data.',
      prompt: `Context: You are documenting a fast, reusable 4‑component prompting method for everyday marketing tasks.\nTask: Define Context, Task, Output Format, Constraints & Tone, and provide 2 short marketing examples per element.\nOutput Format: Markdown list with bolded component headers and bullets.\nConstraints & Tone: Plain language; each example ≤2 lines; synthetic data only.`,
      expected:
        'You produce a crisp summary ready for your cheat sheet.',
      selfCheck: [
        'Do examples show audience, goal and limits?',
        'Is everything skimmable?'
      ],
      simulation:
        `<p><strong>Context examples:</strong> Senior product marketer for a B2B SaaS workflow tool targeting mid‑market manufacturing ops managers; Advisor to a content strategist writing for audit‑sensitive buyers.</p><p><strong>Task examples:</strong> Prioritize top 3 messages; justify 2 channels; 3 measurable metrics; Contrast two value props; recommend one with quantified rationale.</p><p><strong>Output Format examples:</strong> Summary; Top Messages (3); Channels & Rationale (2); Success Metrics (3). Two tables: Pros/Cons; Choose‑When; ≤250 words.</p><p><strong>Constraints &amp; Tone examples:</strong> Pragmatic, non‑hype; quantify with caveats; synthetic only. ≤300 words; avoid superlatives; add verification checklist.</p>`,
      icon: 'images/four_c.png'
    },
    {
      id: 'role',
      title: 'Role‑Aware Prompts & Task Verbs',
      time: '8–14 min',
      objective:
        'Draft a role‑aware prompt with measurable criteria for a marketing brief.',
      instructions:
        'Choose a common task (e.g., refine a campaign brief). Draft a prompt as a senior product marketer advising a teammate on a campaign for [product/feature] targeting [audience] with goal [goal].',
      prompt: `Context: You are a senior product marketer advising a teammate on a campaign for [product/feature] targeting [audience] with goal [goal].\nTask: Produce a refined brief that: Top Messages (3), Channels & Rationale (2), Success Metrics (3).\nOutput Format: Summary; Top Messages (3); Channels & Rationale (2); Success Metrics (3); Risks & Assumptions.\nConstraints & Tone: ≤300 words; pragmatic, non‑hype; synthetic data; avoid vague claims.`,
      expected:
        'You have a concise brief with measurable metrics and explicit risks.',
      selfCheck: [
        'Are verbs actionable (prioritize, justify, quantify)?',
        'Are metrics measurable and dated?'
      ],
      simulation:
        `<p><strong>Summary:</strong> Feature Flow reduces handoff errors by standardizing transitions and showing where work stalls.</p><ul><li><strong>Top Messages:</strong> Fewer do‑overs; Faster handoffs; Fits existing work.</li><li><strong>Channels &amp; Rationale:</strong> LinkedIn sponsored posts: title targeting; concise outcomes drive curiosity. Email nurture: short walkthrough → quick discovery call; measurable.</li><li><strong>Success Metrics:</strong> ≥2.5% LinkedIn CTR; ≥30% email open, ≥4% click; ≥20 qualified discovery calls in 30 days.</li><li><strong>Risks & Assumptions:</strong> Gains depend on process discipline; teams vary. Assumes sufficient mid‑market manufacturing TAM.</li></ul>`,
      icon: 'images/role.png'
    },
    {
      id: 'zerovsfew',
      title: 'Zero‑Shot vs Few‑Shot',
      time: '14–19 min',
      objective:
        'Compare the two strategies and decide which to use first in your scenario.',
      instructions:
        'Contrast zero‑shot vs few‑shot for tone‑critical tasks. Decide which to try first in your scenario.',
      prompt: `Context: You need guidance for choosing zero‑shot or few‑shot when tone, compliance and length limits matter.\nTask: Compare zero‑shot vs few‑shot with a Pros/Cons table and a Choose‑When table.\nOutput Format: Two short tables.\nConstraints & Tone: ≤250 words; concrete and skimmable.`,
      expected:
        'You produce clear selection rules tailored to marketing.',
      selfCheck: [
        'Which will you use first in the scenario, and why?'
      ],
      simulation:
        `<h4>Pros/Cons</h4><table><tr><th>Approach</th><th>Pros</th><th>Cons</th></tr><tr><td>Zero‑shot</td><td>Fast, flexible, good for ideation</td><td>Tone drift; inconsistent structure</td></tr><tr><td>Few‑shot</td><td>Strong tone/format control; compliance friendly</td><td>Requires exemplars; longer prompts</td></tr></table><h4>Choose‑When</h4><table><tr><th>Use this when…</th><th>Zero‑shot</th><th>Few‑shot</th></tr><tr><td>Requirements clear, creativity welcome</td><td>✅</td><td></td></tr><tr><td>Strict brand tone/compliance</td><td></td><td>✅</td></tr><tr><td>Ambiguous format; prior examples exist</td><td></td><td>✅</td></tr><tr><td>Early exploration with many variants</td><td>✅</td><td></td></tr></table>`,
      icon: 'images/zero_vs_fewshot.png'
    },
    {
      id: 'hidden',
      title: 'Hidden Reasoning (Outline‑First + Self‑Check)',
      time: '19–24 min',
      objective:
        'Generate final outputs while keeping reasoning private.',
      instructions:
        'Ask the model to outline internally, return only the final deliverable, then run a brief self‑check and silently fix issues before presenting the final.',
      prompt: `Context: You want higher quality without showing internal reasoning.\nTask: Internally outline an approach for a [deliverable type: e.g., value prop + proof points], then return only the final deliverable. After that, run a Self‑Check against [criteria] and silently fix issues before presenting the final.\nOutput Format: Final deliverable, then Self‑Check Summary with pass/fail bullets and fixes already applied.\nConstraints & Tone: Do not reveal the outline; ≤400 words; pragmatic tone.`,
      expected:
        'You see a polished deliverable plus a short self‑check summary—no exposed notes.',
      selfCheck: [
        'If the outline appears, add: “Do not reveal your outline.”',
        'Did the self‑check result in concrete fixes?'
      ],
      simulation:
        `<p><strong>Value Prop:</strong> Feature Flow reduces handoff errors by standardizing transitions and highlighting where work stalls, so teams fix the biggest leak first.</p><ul><li>Teams report ~15–20% fewer reworks after standardizing handoffs (pilot placeholder).</li><li>Supervisors see cleaner audits due to explicit ownership.</li><li>Start small (one line); expand where data shows gains — low‑risk adoption.</li></ul><p><strong>Self‑Check Summary:</strong> Tone pragmatic — Pass; Quant with caveat — Pass; Audience fit — Pass; Risks flagged — Pass.</p>`,
      icon: 'images/hidden_reasoning.png'
    },
    {
      id: 'verification',
      title: 'Offline Verification & Hallucination Mitigation',
      time: '24–28 min',
      objective:
        'Create a practical verification checklist to reduce hallucinations and over‑claims.',
      instructions:
        'Produce a 7‑item verification checklist covering numeric claims, tone/voice alignment, audience fit, constraint adherence, metric clarity, feasibility and ethics/risks. Provide two example citation placeholders.',
      prompt: `Context: You must verify outputs without web access.\nTask: Produce a 7‑item verification checklist covering numeric claims, tone/voice alignment, audience fit, constraint adherence, metric clarity, feasibility and ethics/risks. Provide 2 example citation placeholders for later validation.\nOutput Format: Numbered checklist + two placeholder examples.\nConstraints & Tone: Specific, testable items; concise.`,
      expected:
        'You have a practical checklist and placeholder format.',
      selfCheck: [
        'Does at least one item challenge assumptions?',
        'Do placeholders look like (Internal pilot memo, 2025)?'
      ],
      simulation:
        `<ol><li>Numbers caveated; placeholders present.</li><li>Tone pragmatic; avoid hype words.</li><li>Audience fit: actionable for ops managers.</li><li>Constraints: word counts/structure followed.</li><li>Metrics: measurable and dated.</li><li>Feasibility: implementable steps.</li><li>Ethics/Risks: no sensitive data; risks stated.</li></ol><p><strong>Placeholders:</strong> (Internal pilot memo, 2025); (Ops survey summary, Q1 2025).</p>`,
      icon: 'images/verification.png'
    },
    {
      id: 'cheatsheet',
      title: 'Cheat Sheet Skeleton',
      time: '28–33 min',
      objective:
        'Build a compact one‑page scaffold you can keep visible during work.',
      instructions:
        'Draft a one‑page cheat sheet with sections: When to Use 4C; Component Templates; Role & Strong Verbs; Zero vs Few‑Shot; Hidden Reasoning; Verification Checklist; Common Pitfalls; Mini Rubric.',
      prompt: `Context: You are creating a one‑page 4‑Component Prompt Framework Cheat Sheet for Marketing to reuse daily.\nTask: Draft a compact scaffold with sections: When to Use 4C; Component Templates; Role & Strong Verbs; Zero vs Few‑Shot; Hidden Reasoning; Verification Checklist; Common Pitfalls; Mini Rubric.\nOutput Format: Markdown, bullet‑heavy, ~350 words max.\nConstraints & Tone: Skimmable, field‑ready, no filler.`,
      expected:
        'You produce a clear, compact draft ready to polish.',
      selfCheck: [
        'Is each bullet crisp and actionable?',
        'Is the page one screen/print page?'
      ],
      simulation:
        `<p><strong>When to Use 4C:</strong> Any task where clarity, tone or verification matters.</p><p><strong>Templates:</strong> Context (role, audience, inputs) • Task (verbs, deliverables, criteria) • Output Format (sections/limits) • Constraints & Tone (voice, do/don’t, verification).</p><p><strong>Strong Verbs:</strong> prioritize, justify, contrast, quantify, score, enforce, verify.</p><p><strong>Zero vs Few‑Shot:</strong> zero for speed/ideation; few for tone/compliance.</p><p><strong>Hidden Reasoning:</strong> outline internally; final only; brief self‑check.</p><p><strong>Verification (7):</strong> numbers caveated; tone pragmatic; audience fit; limits met; metrics; feasibility; ethics.</p><p><strong>Common Pitfalls:</strong> vague verbs; no limits; hype numbers; no risks; no placeholders.</p><p><strong>Mini Rubric:</strong> Fit • Clarity • Evidence • Faithfulness • Reusability • Efficiency.</p>`,
      icon: 'images/cheatsheet.png'
    },
    {
      id: 'practice',
      title: 'Practice Scenario (Marketing)',
      time: '33–53 min',
      objective:
        'Produce zero‑shot & few‑shot outputs, verify them and select the stronger set.',
      instructions:
        'You are launching “Feature Flow”, a workflow addon for a B2B SaaS platform. Audience: mid‑market manufacturing operations managers who struggle with handoff errors. Goal: generate top‑funnel demand via LinkedIn sponsored posts and email nurture. Tone: confident, pragmatic, non‑hype. Avoid over‑promising time savings. Prefer quant with caveats. Create zero‑shot and few‑shot variants.',
      prompt: `Scenario: Launching “Feature Flow” for mid‑market manufacturing ops managers. Goal: top‑funnel demand via LinkedIn posts and email nurture.\n(a) Zero‑Shot Prompt — Context: You are a senior B2B product marketer preparing top‑funnel assets for mid‑market manufacturing ops managers. Product: “Feature Flow”; pain: handoff errors; channels: LinkedIn + email nurture. Task: Create (1) 3 LinkedIn post variants (≤50 words each) and (2) one 120‑word nurture email with a pragmatic CTA. Emphasize risk reduction and fewer handoff errors; avoid hype. Output Format: LinkedIn Variants (3) and Email Nurture (120 words). Constraints & Tone: Confident, concrete; quantify with caveats; no clichés.\n(b) Few‑Shot Prompt — Provide 2–3 short exemplars that mirror the desired tone. Context and task remain the same. Create the assets matching the exemplar tone.`,
      expected:
        'You produce both versions; apply your verification checklist; revise and select the stronger set.',
      selfCheck: [
        'Are LinkedIn posts ≤50 words?',
        'Numbers caveated?',
        'Which version better matches tone and constraints—why?'
      ],
      simulation:
        `<h4>Zero‑Shot LinkedIn Variants</h4><ul><li>Handoffs fail when steps live in heads. Feature Flow standardizes transitions so fewer gaps become rework. See where minutes leak; fix the top blocker first. Start with one line; expand as gains show.</li><li>Less rework, cleaner audits. Standardized handoffs mean fewer do‑overs. Walk your process, spot the gaps, pick one fix.</li><li>If work falls through cracks, measure the cracks. Feature Flow shows where handoffs stall and who owns next. Book a 15‑minute look‑through.</li></ul><p><strong>Zero‑Shot Email (120 words)</strong><br>Handoffs break when steps are implied, not defined. Feature Flow standardizes transitions so teams see where minutes leak and why. Mid‑market manufacturers report fewer do‑overs and cleaner audits when ownership is explicit and next steps are visible. Results vary by process discipline, so start small: one line, one team, one week. If the data shows fewer reworks and faster sign‑offs, expand where it pays off. Walk your process with us, spot the top blocker, and choose a low‑risk fix. Book a 15‑minute look‑through. (Internal pilot memo, 2025)</p><h4>Few‑Shot LinkedIn Variants</h4><ul><li>Handoffs break when steps live in heads. Feature Flow makes the next owner explicit, so fewer gaps become rework. Start with one line; keep what pays off.</li><li>Less rework, more throughput. Standardized handoffs mean fewer do‑overs and cleaner audits. Walk the steps, spot the leak, pick one fix.</li><li>Measure the cracks. Feature Flow shows where handoffs stall and who owns next. Teams report ~15–20% fewer reworks; results vary. Book a 15‑minute look‑through.</li></ul><p><strong>Few‑Shot Email (120 words)</strong><br>Rework hides in the handoff. When ownership is explicit and next steps are visible, fewer gaps turn into do‑overs. Feature Flow helps teams standardize transitions, see where minutes leak, and fix the biggest one first. Mid‑market manufacturers report ~15–20% fewer reworks after clarifying handoffs; results vary by process discipline and work mix. Start with one line. If data shows faster sign‑offs and cleaner audits, expand where it pays off. Walk the steps. Spot the leak. Pick one fix. Book a 15‑minute look‑through. (Internal pilot memo, 2025)</p><p><strong>Decision:</strong> Quant present with caveat — OK; tone pragmatic — OK; limits met — OK. <em>Winner: Few‑shot (tighter tone control, clearer CTA).</em></p>`,
      icon: 'images/practice.png'
    },
    {
      id: 'best',
      title: 'Best Practices & Pitfalls',
      time: '53–57 min',
      objective:
        'Distill top rules and fixes you can reuse every day.',
      instructions:
        'Produce Top 10 Best Practices and Top 10 Pitfalls for marketing prompts using the 4C framework. Pair each pitfall with a corrective fix.',
      prompt: `Context: You’re distilling the session into rules you’ll reuse.\nTask: Produce Top 10 Best Practices and Top 10 Pitfalls for marketing prompts using the 4‑component framework; pair each pitfall with a corrective fix.\nOutput Format: Two numbered lists.\nConstraints & Tone: Specific, observable, short; marketing‑focused.`,
      expected:
        'You have two concise lists you can keep at hand.',
      selfCheck: [
        'Does every pitfall have a fix?',
        'Are items stated as actions?'
      ],
      simulation:
        `<h4>Top 10 Best Practices</h4><ol><li>Assign a role and audience in Context.</li><li>Use strong verbs with measurable outcomes.</li><li>Specify sections/tables and limits.</li><li>Add a verification checklist.</li><li>Prefer few‑shot for tone/compliance.</li><li>Require caveated numbers and placeholders.</li><li>Include Risks &amp; Assumptions.</li><li>Keep outputs scannable.</li><li>Save templates with [placeholders].</li><li>Iterate: prompt → score with rubric → refine.</li></ol><h4>Top 10 Pitfalls → Fixes</h4><ol><li>Vague verbs → rank/score/justify/quantify.</li><li>No limits → Add counts and word limits.</li><li>Hype claims → Caveats + placeholders.</li><li>Tone drift → Few‑shot exemplars.</li><li>One‑off outputs → Add [placeholders].</li><li>No metrics → Put measurable criteria in Task.</li><li>Long prompts → Cut filler; keep behavior‑changing constraints.</li><li>Hidden risks → Add Risks & Assumptions.</li><li>Unsupported quant → Replace with cautious ranges.</li><li>Mixed audiences → Fix a single audience and use their vocabulary.</li></ol>`,
      icon: 'images/best_practices.png'
    },
    {
      id: 'wrap',
      title: 'Quick Quiz & Wrap',
      time: '57–60 min',
      objective:
        'Check understanding and commit to next steps.',
      instructions:
        'Complete the quiz below and write three sentences on how you’ll use the cheat sheet this week.',
      prompt: 'See the Quiz section of this page.',
      expected:
        'You produce correct answers and a clear action plan.',
      selfCheck: [
        'Did you commit to one concrete habit (e.g., always add verification)?'
      ],
      simulation:
        `<p><strong>Answers:</strong> Constraints &amp; Tone; Strict tone/compliance; ambiguous format where exemplars clarify. Outline internally; final answer; brief self‑check. “Flag any numeric claim lacking support; replace with a cautious range + caveat.” Specify measurable outcomes and limits in the Task.</p><p><strong>Reflection:</strong> You will standardize the verification checklist, collect two exemplars per asset type, and track edits reduced as your KPI.</p>`,
      icon: 'images/verification.png'
    }
  ];

  /**
   * Render all module cards into the DOM.
   */
  const modulesContainer = document.getElementById('modules');
  modulesData.forEach((mod) => {
    const details = document.createElement('details');
    details.className = 'module-card';
    details.dataset.id = mod.id;

    const summary = document.createElement('summary');
    const headerDiv = document.createElement('div');
    headerDiv.className = 'module-header';
    const img = document.createElement('img');
    img.src = mod.icon;
    img.alt = '';
    img.className = 'module-icon';
    const titleWrapper = document.createElement('div');
    const titleEl = document.createElement('span');
    titleEl.className = 'module-title';
    titleEl.textContent = mod.title;
    const timeEl = document.createElement('span');
    timeEl.className = 'module-time';
    timeEl.textContent = mod.time;
    titleWrapper.appendChild(titleEl);
    titleWrapper.appendChild(document.createElement('br'));
    titleWrapper.appendChild(timeEl);
    headerDiv.appendChild(img);
    headerDiv.appendChild(titleWrapper);
    summary.appendChild(headerDiv);
    details.appendChild(summary);

    const content = document.createElement('div');
    content.className = 'module-content';
    content.innerHTML = `
      <h4>Objective</h4>
      <p>${mod.objective}</p>
      <h4>Instructions</h4>
      <p>${mod.instructions}</p>
      <h4>Copy &amp; Paste Prompt</h4>
      <pre>${mod.prompt}</pre>
      <h4>Expected Artifact</h4>
      <p>${mod.expected}</p>
      <h4>Self‑Check</h4>
      <div class="self-checklist">${mod.selfCheck
        .map((sc) => `<label><input type="checkbox" disabled /> ${sc}</label>`) 
        .join('')}</div>
      <h4>Your Notes</h4>
      <textarea placeholder="Write your response or notes here..."></textarea>
      <div class="module-actions">
        <button class="btn btn-toggle-answer" type="button">Show Answer</button>
        <button class="btn btn-complete" type="button">Mark Completed</button>
      </div>
      <div class="simulation-answer" style="display:none; margin-top:1rem;">
        <h4>Simulation Answer</h4>
        ${mod.simulation}
      </div>
    `;
    details.appendChild(content);
    modulesContainer.appendChild(details);
  });

  /**
   * Progress bar update function. It calculates how many modules have
   * been marked complete and adjusts the bar width accordingly.
   */
  function updateProgress() {
    const buttons = document.querySelectorAll('.btn-complete');
    let completed = 0;
    buttons.forEach((btn) => {
      if (btn.classList.contains('completed')) completed++;
    });
    const progress = (completed / modulesData.length) * 100;
    document.getElementById('progress-bar').style.width = `${progress}%`;
    // Persist progress in localStorage
    const completedIds = Array.from(buttons)
      .filter((btn) => btn.classList.contains('completed'))
      .map((btn) => btn.closest('details').dataset.id);
    localStorage.setItem('4c_completed', JSON.stringify(completedIds));
  }

  /**
   * Restore progress from localStorage if available.
   */
  function restoreProgress() {
    const completedIds = JSON.parse(localStorage.getItem('4c_completed') || '[]');
    completedIds.forEach((id) => {
      const detailsEl = document.querySelector(`details[data-id="${id}"]`);
      if (detailsEl) {
        const btn = detailsEl.querySelector('.btn-complete');
        btn.classList.add('completed');
        btn.textContent = 'Completed';
      }
    });
    updateProgress();
  }

  restoreProgress();

  /**
   * Event delegation for toggle answer and mark completed buttons.
   */
  modulesContainer.addEventListener('click', (event) => {
    const target = event.target;
    // Toggle simulation answer
    if (target.classList.contains('btn-toggle-answer')) {
      const answerDiv = target.closest('.module-content').querySelector('.simulation-answer');
      if (answerDiv.style.display === 'none') {
        answerDiv.style.display = 'block';
        target.classList.add('toggled');
        target.textContent = 'Hide Answer';
      } else {
        answerDiv.style.display = 'none';
        target.classList.remove('toggled');
        target.textContent = 'Show Answer';
      }
    }
    // Mark module as completed
    if (target.classList.contains('btn-complete')) {
      if (!target.classList.contains('completed')) {
        target.classList.add('completed');
        target.textContent = 'Completed';
      } else {
        target.classList.remove('completed');
        target.textContent = 'Mark Completed';
      }
      updateProgress();
    }
  });

  /**
   * Quiz evaluation logic
   */
  const quizForm = document.getElementById('quiz-form');
  const quizResult = document.getElementById('quiz-result');
  const quizReflection = document.getElementById('quiz-reflection');
  quizForm.addEventListener('submit', (e) => {
    e.preventDefault();
    let score = 0;
    const explanations = [];
    // Question 1
    const q1 = quizForm.elements['q1'].value;
    if (q1 === 'D') {
      score++;
      explanations.push('1. Correct! Constraints & Tone defines how quality will be judged.');
    } else {
      explanations.push('1. The correct answer is D) Constraints & Tone because it encodes the guardrails and expectations.');
    }
    // Question 2
    const q2 = quizForm.elements['q2'].value.trim().toLowerCase();
    const fewshotKeywords = ['tone', 'compliance', 'examples', 'brand', 'format', 'exemplars'];
    const q2Correct = fewshotKeywords.some((kw) => q2.includes(kw));
    if (q2Correct) {
      score++;
      explanations.push('2. Correct! Few‑shot helps when tone/compliance matters or prior examples clarify ambiguous requests.');
    } else {
      explanations.push('2. Few‑shot outperforms zero‑shot when you need to lock tone or comply with strict brand/format requirements, or when prior exemplars exist.');
    }
    // Question 3
    const q3 = quizForm.elements['q3'].value;
    if (q3 === 'B') {
      score++;
      explanations.push('3. Correct! Asking the model to outline internally, returning only the final answer and a brief self‑check keeps reasoning private while improving quality.');
    } else {
      explanations.push('3. The correct answer is B) Outline internally; return final answer; brief self‑check.');
    }
    // Question 4
    const q4 = quizForm.elements['q4'].value.trim().toLowerCase();
    const q4Correct = q4.includes('flag') && (q4.includes('numeric') || q4.includes('number')) && (q4.includes('range') || q4.includes('caveat'));
    if (q4Correct) {
      score++;
      explanations.push('4. Correct! Flag unsupported numbers and replace them with cautious ranges and caveats.');
    } else {
      explanations.push('4. A good verification step is to flag any numeric claim lacking support and replace it with a cautious range plus a caveat.');
    }
    // Question 5
    const q5 = quizForm.elements['q5'].value;
    if (q5 === 'B') {
      score++;
      explanations.push('5. Correct! Specifying measurable outcomes and limits in the Task prevents vague outputs.');
    } else {
      explanations.push('5. The correct answer is B) Specify measurable outcomes and limits in the Task.');
    }
    // Display result
    quizResult.hidden = false;
    quizResult.innerHTML = `<h3>Your Score: ${score}/5</h3><ul><li>${explanations.join('</li><li>')}</li></ul>`;
    // Show reflection area
    quizReflection.hidden = false;
    // Automatically mark the wrap module as completed
    const wrapModule = document.querySelector('details[data-id="wrap"] .btn-complete');
    if (wrapModule && !wrapModule.classList.contains('completed')) {
      wrapModule.classList.add('completed');
      wrapModule.textContent = 'Completed';
      updateProgress();
    }
  });

  /**
   * Save reflection habit to localStorage and display confirmation.
   */
  const reflectionSaveBtn = document.getElementById('reflection-save');
  const reflectionInput = document.getElementById('reflection-input');
  const reflectionMessage = document.getElementById('reflection-message');
  reflectionSaveBtn.addEventListener('click', () => {
    const text = reflectionInput.value.trim();
    if (text.length > 0) {
      localStorage.setItem('4c_reflection', text);
      reflectionMessage.hidden = false;
      reflectionMessage.textContent = 'Your reflection has been saved in your browser.';
      // optionally update completed progress for wrap
    }
  });

  // Load saved reflection if exists
  const savedReflection = localStorage.getItem('4c_reflection');
  if (savedReflection) {
    reflectionInput.value = savedReflection;
    reflectionMessage.hidden = false;
    reflectionMessage.textContent = 'Your previous reflection has been loaded.';
  }
});