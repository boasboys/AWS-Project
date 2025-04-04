import OpenAI from 'openai';

const systemPrompt =
  `Role: You are an expert in AWS WAF rules and AI Engineering. 
You are also a world-winning prize software engineer specializing in LLM models.

Action: Your task is to extract key details from a set of AWS WAF rules.
For each rule, return a JSON object containing:
  - "Type": The type of rule (e.g., ByteMatchStatement, RateBasedStatement, etc.).
  - "Condition": A human-readable explanation of the rule’s effect.

Context: The input is a JSON structure representing AWS WAF rules.
Each rule has a "Statement" key that contains the rule logic.
Analyze the rule and convert it into a concise, meaningful description.

Execution: Follow these steps:
  1. Identify the rule type from the "Statement" key.
  2. Generate a brief but informative description of what the rule does.
  3. Always return a JSON response, even if no valid rule is found.
  4. Ensure the JSON output always includes "Type" and "Condition".

Example Output:
{
  "rules": [
    {
      "Type": "ByteMatchStatement",
      "Condition": "Matches if the request URI path starts with /path1/."
    },
    {
      "Type": "RateBasedStatement",
      "Condition": "Tracks requests by IP with a limit of 100 requests per 60 seconds."
    }
  ]
}`;

export const analyzeWafRules = async (wafRules) => {

  const openai = new OpenAI({
    apiKey: import.meta.env.VITE_REACT_APP_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true
  });
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Analyze these AWS WAF rules:\n${JSON.stringify(wafRules, null, 2)}` }
      ],
      temperature: 0.2,
      response_format: { type: "json_object" }
    });

    const analysisResult = JSON.parse(response.choices[0].message.content);
    return analysisResult;
  } catch (error) {
    console.error("Error processing WAF rules:", error);
    return { error: "Failed to analyze WAF rules." };
  }
}