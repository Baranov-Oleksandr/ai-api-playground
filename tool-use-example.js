import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Это НАСТОЯЩАЯ функция в твоём коде — Claude сам её не выполняет,
// он только "просит" её вызвать с нужными параметрами
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

// Шаг 1: описываем Claude, какие инструменты у него есть
const tools = [
    {
        name: "calculate_lead_score",
        description: "Calculates a lead score from 1-10 based on budget and urgency",
        input_schema: {
            type: "object",
            properties: {
                budget: { type: "number", description: "Customer's budget in EUR" },
                urgency: { type: "string", enum: ["low", "medium", "high"] }
            },
            required: ["budget", "urgency"]
        }
    }
];

// Шаг 2: первый вызов — даём Claude задачу + список доступных инструментов
const firstResponse = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 500,
    tools: tools,
    messages: [
        {
            role: "user",
            content: "A customer wants a website, budget €4000, they need it urgently. Calculate their lead score."
        }
    ]
});

console.log("Ответ Claude (шаг 1):", firstResponse.content);

// Шаг 3: ищем в ответе блок с типом 'tool_use' — Claude "просит" вызвать функцию
const toolUseBlock = firstResponse.content.find(block => block.type === "tool_use");

if (toolUseBlock) {
    console.log("Claude хочет вызвать инструмент:", toolUseBlock.name);
    console.log("С параметрами:", toolUseBlock.input);

    // Шаг 4: реально выполняем функцию в НАШЕМ коде
    const result = calculateLeadScore(toolUseBlock.input.budget, toolUseBlock.input.urgency);
    console.log("Результат функции:", result);

    // Шаг 5: отправляем результат обратно Claude — это и есть "agent loop":
    // Claude просит -> мы выполняем -> отдаём результат -> Claude формулирует финальный ответ
    const secondResponse = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        tools: tools,
        messages: [
            { role: "user", content: "A customer wants a website, budget €4000, they need it urgently. Calculate their lead score." },
            { role: "assistant", content: firstResponse.content },
            {
                role: "user",
                content: [
                    {
                        type: "tool_result",
                        tool_use_id: toolUseBlock.id,
                        content: String(result)
                    }
                ]
            }
        ]
    });

    console.log("Финальный ответ Claude (шаг 2):", secondResponse.content);
}