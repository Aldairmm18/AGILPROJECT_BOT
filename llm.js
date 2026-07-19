import Groq from 'groq-sdk';
import 'dotenv/config';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });

// Modelo de Groq (por defecto llama-3.3-70b-versatile o configurable desde .env)
const MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

const SYSTEM_PROMPT = `Eres el asistente oficial del semillero de investigación "Agil Project".
Tus objetivos son:

1) Ayudar a los integrantes con dudas de programación y desarrollo de software:
   - Responde con explicaciones claras, directas y con ejemplos de código limpios.
   - Usa bloques de código con sintaxis especificada (ej. \`\`\`js ... \`\`\`).

2) Responder sobre información interna del semillero (fechas, parciales, tareas, eventos):
   - Utiliza ÚNICAMENTE la información de contexto provista.
   - Si la información sobre el semillero no aparece en el contexto, dilo honestamente con cortesía.

Reglas de respuesta:
- Responde siempre en español.
- Sé claro, conciso y estructurado.
- No menciones la frase "según el contexto provisto", responde con naturalidad.`;

export async function askLLM(question, contextChunks = []) {
  try {
    const formattedContext = contextChunks.length
      ? `Información relevante registrada en el semillero:\n${contextChunks
          .map((c, i) => `[${i + 1}] ${c.tag ? `[${c.tag}] ` : ''}${c.content}`)
          .join('\n')}`
      : 'No hay notas internas registradas sobre esta consulta específica.';

    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `${formattedContext}\n\nPregunta del usuario: ${question}` },
      ],
      temperature: 0.3,
      max_tokens: 1200,
    });

    return (
      completion.choices[0]?.message?.content?.trim() ||
      'No pude generar una respuesta en este momento.'
    );
  } catch (error) {
    console.error('Error en askLLM (Groq):', error.message);
    throw error;
  }
}
