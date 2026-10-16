export type CompletionSource = "you" | "companion";

export function isValidTaskCompletion(
  taskTitle: string,
  evidence: string,
  userMessage: string,
  previousAssistantMessage = "",
  followingAssistantMessage = "",
): boolean {
  const quote = evidence.trim();
  if (quote.length < 3 || !userMessage.toLocaleLowerCase().includes(quote.toLocaleLowerCase())) return false;
  if (/\b(?:don't|do not|can't|cannot|haven't|have not|hasn't|has not|not yet|didn't|did not|never|maybe|might|may|probably|almost|could|unsure|don't know|do not know)\b/i.test(userMessage)) return false;

  const infoTask = /\b(?:share|provide|send|give|get|tell|record|enter|confirm|report|collect|gather)\b/i.test(taskTitle);
  const statsTask = /\b(?:stats|metrics|measurements?|body fat|weight|waist|height|fitness data)\b/i.test(taskTitle);
  const assistantAsked = /\b(?:could you|can you|please|tell me|share|provide|send|give me|what is your|what are your|need your|need to know)\b/i.test(previousAssistantMessage);
  const measuredValue = /\b\d+(?:[.,]\d+)?\s*(?:kg|kgs|kilograms?|lb|lbs|pounds?|cm|mm|inches?|%|percent)\b/i.test(userMessage)
    || /\b(?:body\s*fat|weight|waist|height)\b.{0,25}\b\d+(?:[.,]\d+)?/i.test(userMessage);

  // Supplying requested measurements is completion evidence even without saying "I completed this".
  if (infoTask && statsTask && assistantAsked && measuredValue) return true;

  // Recognize a direct, first-person report that competitor or market research
  // is done. Keep it scoped to research tasks so the same sentence cannot
  // accidentally complete unrelated open steps.
  const researchTask = /\b(?:research|competitors?|competition|market|industry|analysis)\b/i.test(taskTitle);
  const researchClaim = /\b(?:i|we)(?:['’]ve| have)?\s+(?:(?:already)\s+)?(?:researched|investigated|analyzed|analysed|compared)\b/i.test(userMessage);
  const researchTarget = /\b(?:competitors?|competition|rivals?|market|industry)\b/i.test(userMessage);
  if (researchTask && researchClaim && researchTarget) return true;

  // A clear choice is enough for a selection step. When the step also asks to
  // check opening hours, require the next reply to contain those hours too.
  const selectionStep = /\b(?:choose|pick|select|decide|museum|venue|restaurant|option)\b/i.test(taskTitle);
  const clearSelection = /\b(?:let'?s go(?: with)?|i(?:'ll| will)? choose|i picked|i select(?:ed)?|i decided on|we decided on|go with|the one i want is)\b/i.test(userMessage);
  const includesHours = /\b(?:opening hours?|open from|opens at|close at|closes at)\b/i.test(taskTitle);
  const nextReplyHasHours = /\b(?:opening hours?|open from|opens at|close at|closes at)\b/i.test(followingAssistantMessage);
  const dateStep = /\bdate\b/i.test(taskTitle);
  const explicitDate = /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}\b|\b\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i.test(userMessage);
  const travelStep = /\btravel times?\b|\b(?:departure|return|transport)\b/i.test(taskTitle);
  const userHasTravelDetails = /\b(?:booked|reserved|train|bus|coach|driving|drive|leaves at|departs at|arrives at|ticket)\b/i.test(userMessage);
  if (selectionStep && clearSelection && (!includesHours || nextReplyHasHours) && (!dateStep || explicitDate) && (!travelStep || userHasTravelDetails)) return true;

  // Accepting a specific itinerary completes the planning step it answers.
  const planningStep = /\b(?:plan|schedule|itinerary|outline|map out)\b/i.test(taskTitle);
  const clearApproval = /^(?:okay|ok|yes|yeah|yep|that works|looks good|i like that)(?:[,.! ]|$)/i.test(userMessage.trim());
  const assistantProposedPlan = /\b(?:arrive|then|after that|itinerary|schedule|head (?:home|back)|grab (?:a )?lunch|visit)\b/i.test(previousAssistantMessage);
  if (planningStep && clearApproval && assistantProposedPlan) return true;

  const affirmative = /^(?:yes|yeah|yep|correct|i did|it's done|it is done|finished|completed)\b/i.test(userMessage.trim());
  const assistantAskedCompletion = /\b(?:have you|did you|is it|are you|have we)\b.{0,90}\b(?:done|finished|completed|sent|submitted|booked|created|built|shared|tested|scheduled|prepared)\b/i.test(previousAssistantMessage);
  if (affirmative && assistantAskedCompletion) return true;

  if (/\b(?:haven't|have not|hasn't|has not|not yet|didn't|did not|never|maybe|might|may|think|probably|almost|basically|kind of|sort of|could)\b/i.test(quote)) return false;
  return /\b(?:i|we)\s+(?:(?:have|has|already)\s+)*(?:finished|completed|done|sent|submitted|booked|launched|published|created|built|delivered|asked|contacted|called|emailed|reached out|spoke to|talked to|attended|paid|registered|tested|validated|defined|decided|selected|chosen|signed|shared|scheduled|prepared|set up|provided|gave|measured|recorded|confirmed)\b/i.test(quote);
}

