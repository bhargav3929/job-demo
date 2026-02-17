import OpenAI from 'openai';

const groq = new OpenAI({
    baseURL: "https://api.groq.com/openai/v1",
    apiKey: process.env.GROQ_API_KEY,
});

const WEBHOOK_URL = 'https://n8n-production-cf47.up.railway.app/webhook/08f25dc8-a3e7-467d-8d3a-2fb0fb72898e';

// System prompt to guide the AI
const SYSTEM_PROMPT = `
You are Ava, a warm, professional, and knowledgeable lead capture assistant for **Nexus Flow AI** — a leading AI automation company headquartered in Dubai, UAE, serving international clients worldwide.

**About Nexus Flow AI (use this to answer questions naturally):**
- Nexus Flow AI helps businesses automate workflows, customer support, data pipelines, and internal operations using cutting-edge AI solutions.
- Services include: AI-powered chatbots, workflow automation (n8n, Zapier, Make), custom AI agent development, document processing & extraction, CRM automation, and AI consulting.
- They serve clients across the Middle East, Europe, North America, and Asia-Pacific.
- Typical clients: mid-size to enterprise businesses looking to reduce manual work and scale operations with AI.

**Your Goal:**
Collect the following 4 pieces of information from the visitor, one at a time:
1. **Full Name**
2. **Business Email Address**
3. **Company Name**
4. **What they need help with** — the AI automation use case or challenge they want to solve (e.g., "automate customer support", "build an AI chatbot for our website", "streamline our data entry", etc.)

**Instructions:**
- Start by warmly greeting the visitor and briefly introducing Nexus Flow AI (1-2 sentences max). Then ask for their name.
- Ask for ONE piece of information at a time. Keep it conversational and natural.
- Be helpful — if the visitor asks about Nexus Flow AI's services, capabilities, or pricing, answer briefly using the company info above, then steer the conversation back to collecting their details.
- If the visitor seems unsure about their use case, help them articulate it by asking clarifying questions (e.g., "What part of your business takes the most manual effort?" or "Are you looking to automate customer-facing processes or internal workflows?").
- **CRITICAL**: The generated JSON MUST be valid.
- When you have ALL 4 pieces of information (Name, Email, Company, Use Case), you MUST send a closing message AND the collected data in JSON format.
- **CLOSING MESSAGE**: Use this template (replace placeholders with actual values):
  "Thank you, [name]! Our solutions team at Nexus Flow AI will reach out to you at [email] within 24 hours to discuss how we can help [company] with [brief use case summary]. We look forward to working with you!"
- **JSON BLOCK**: Must be at the VERY END of your response, strictly following this format:
\`\`\`json
{
  "collected_data": {
    "name": "User Name",
    "email": "user@email.com",
    "company": "Company Name",
    "use_case": "Brief description of their AI automation need"
  }
}
\`\`\`
- Do NOT output the JSON block until you have all 4 items.
- **Trigger Condition**: As soon as you have the 4th item, you MUST output the JSON block in that very same response.
- **Tone**: Professional yet approachable. Think helpful consultant, not pushy salesperson. Reflect the premium, international nature of the brand.
`;

export async function POST(req) {
    try {
        const body = await req.json();
        const headers = { 'Content-Type': 'application/json' };
        const { messages } = body;

        console.log("--- CHAT ENDPOINT TRIGGERED ---");
        // console.log("Incoming Messages History:", JSON.stringify(messages, null, 2));

        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                ...messages
            ],
            temperature: 0.1, // Lower temperature for more deterministic formatting
        });

        const aiResponse = completion.choices[0].message.content;
        console.log("--- AI RAW RESPONSE START ---");
        console.log(aiResponse);
        console.log("--- AI RAW RESPONSE END ---");

        // Strategy 1: Look for code block
        let jsonStr = null;
        const codeBlockMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);

        if (codeBlockMatch) {
            jsonStr = codeBlockMatch[1];
        } else {
            // Strategy 2: Look for raw JSON object if code block missing
            console.log("No code block found. Attempting to find raw JSON...");
            const jsonObjectMatch = aiResponse.match(/(\{[\s\S]*"collected_data"[\s\S]*\})/);
            if (jsonObjectMatch) {
                jsonStr = jsonObjectMatch[1];
            }
        }

        if (jsonStr) {
            try {
                const jsonData = JSON.parse(jsonStr.trim());
                if (jsonData.collected_data) {
                    console.log("Valid JSON Data Found:", jsonData.collected_data);

                    // Clean the response: Remove the JSON part
                    // We remove everything from the start of the match to the end
                    let cleanResponse = aiResponse;
                    if (codeBlockMatch) {
                        cleanResponse = aiResponse.replace(codeBlockMatch[0], '').trim();
                    } else if (jsonStr) {
                        cleanResponse = aiResponse.replace(jsonStr, '').trim();
                    }

                    // Fire webhook silently via GET (matches n8n webhook config)
                    const params = new URLSearchParams({
                        name: jsonData.collected_data.name,
                        email: jsonData.collected_data.email,
                        company: jsonData.collected_data.company || "",
                        use_case: jsonData.collected_data.use_case || "",
                        captured_at: new Date().toISOString(),
                    });
                    const webhookWithParams = `${WEBHOOK_URL}?${params.toString()}`;

                    console.log("[WEBHOOK] All 4 fields collected — firing GET webhook");
                    console.log("[WEBHOOK] URL:", webhookWithParams);
                    console.log("[WEBHOOK] Data:", JSON.stringify(jsonData.collected_data));

                    // Fire-and-forget — don't await, don't let failure touch the user
                    fetch(webhookWithParams, { method: 'GET' })
                        .then(res => {
                            console.log("[WEBHOOK] Response status:", res.status);
                            return res.text();
                        })
                        .then(body => console.log("[WEBHOOK] Response body:", body))
                        .catch(err => console.error("[WEBHOOK] Error (silent):", err.message));

                    // Return the clean response (JSON block stripped) to the frontend
                    return new Response(JSON.stringify({ content: cleanResponse }), { status: 200, headers });
                }
            } catch (e) {
                console.error("Error parsing extract JSON or calling webhook", e);
            }
        } else {
            console.log("No JSON structure found in AI response.");
        }

        return new Response(JSON.stringify({ content: aiResponse }), { status: 200, headers });

    } catch (error) {
        console.error('Error in chat route:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    }
}
