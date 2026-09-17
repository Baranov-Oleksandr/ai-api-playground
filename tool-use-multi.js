import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Строка 6-16: те же функции, что вчера, плюс новая
function calculateLeadScore(budget, urgency) {
    let score = 0;
    if (budget > 3000) score += 5;
    else if (budget > 1000) score += 3;
    else score += 1;
    if (urgency === "high") score += 5;
    else if (urgency === "medium") score += 3;
    else score += 1;
    return score;
}

// Строка 19-21: НОВАЯ функция — определяет тип услуги
function classifyService(text) {
    if (text.toLowerCase().includes("website")) return "web development";
    if (text.toLowerCase().includes("app")) return "mobile app";
    return "other";
}

// Строка 24-45: два инструмента вместо одного — структура списка та же
const tools = [
    {
        name: "calculate_lead_score",
        description: "Calculates a lead score from 1-10 based on budget and urgency",
        input_schema: {
            type: "object",
            properties: {
                budget: { type: "number" },
                urgency: { type: "string", enum: ["low", "medium", "high"] }
            },
            required: ["budget", "urgency"]
        }
    },
    {
        name: "classify_service",
        description: "Classifies what type of service the customer is asking about",
        input_schema: {
            type: "object",
            properties: {
                text: { type: "string", description: "The customer's original message" }
            },
            required: ["text"]
        }
    }
];

const userMessage = "A customer wants a website, budget €4000, they need it urgently.";

// Строка 50-56: первый вызов — точно так же, как вчера
const firstResponse = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 500,
    tools: tools,
    messages: [{ role: "user", content: userMessage }]
});

console.log("Шаг 1 — что вернул Claude:", firstResponse.content);

// Строка 61: теперь Claude может запросить НЕСКОЛЬКО инструментов сразу —
// поэтому используем .filter() вместо .find(), чтобы получить их все
const toolUseBlocks = firstResponse.content.filter(block => block.type === "tool_use");

console.log(`Claude запросил ${toolUseBlocks.length} инструмент(ов)`);

// Строка 66-77: выполняем КАЖДЫЙ запрошенный инструмент в цикле
const toolResults = [];
for (const block of toolUseBlocks) {
    let result;
    if (block.name === "calculate_lead_score") {
        result = calculateLeadScore(block.input.budget, block.input.urgency);
    } else if (block.name === "classify_service") {
        result = classifyService(block.input.text);
    }
    console.log(`Инструмент ${block.name} вернул:`, result);
    toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: String(result)
    });
}

// Строка 80-88: второй вызов — та же структура, что вчера,
// просто отправляем МАССИВ результатов вместо одного
const secondResponse = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 500,
    tools: tools,
    messages: [
        { role: "user", content: userMessage },
        { role: "assistant", content: firstResponse.content },
        { role: "user", content: toolResults }
    ]
});

console.log("Финальный ответ:", secondResponse.content);