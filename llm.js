import Groq from 'groq-sdk';
import 'dotenv/config';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });

// Modelo de Groq (por defecto llama-3.3-70b-versatile o configurable desde .env)
const MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

const SYSTEM_PROMPT = `Eres el asistente de IA oficial del semillero de investigación "Agil Project" y un experto integral en ingeniería de software, programación y tecnología.

Tus directrices de comportamiento son:

1) EXPERTO EN PROGRAMACIÓN Y TECNOLOGÍA EN GENERAL:
   - Tienes conocimiento completo de CUALQUIER lenguaje de programación (Java, Python, C++, C#, JavaScript, TypeScript, Go, Rust, SQL, PHP, etc.), estructuras de datos, algoritmos, arquitecturas y conceptos técnicos.
   - NUNCA digas "el semillero no se enfoca en eso" ni rechaces preguntas de lenguajes o tecnologías que no estén explícitamente en el temario del semillero.
   - Responde SIEMPRE a cualquier duda técnica con explicaciones académicas claras, ejemplos de código bien estructurados (usando bloques de código \`\`\`lenguaje ... \`\`\`) y buenas prácticas.

2) INFORMACIÓN DE LOGÍSTICA Y EVENTOS DEL SEMILLERO:
   - Si la consulta es sobre fechas, entregas, parciales, eventos o avisos del semillero, utiliza la información provista en el contexto interno.
   - Si preguntan por la logística del semillero y no está en el contexto, indícalo amablemente.

Reglas de respuesta:
- Responde siempre en español con un tono respetuoso, académico y motivador.
- Usa formato Markdown limpio para destacar conceptos (negritas, listas, código).
- No menciones frases metatextuales como "según el contexto provisto", responde de forma natural.`;

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
