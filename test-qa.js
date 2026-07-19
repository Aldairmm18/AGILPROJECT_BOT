import 'dotenv/config';
import { searchKnowledge } from './db.js';
import { askLLM } from './llm.js';

async function testQA() {
  const preguntas = [
    '¿Cuándo y a qué hora son las clases del semillero?',
    '¿Qué temas vamos a aprender en Agil Project?',
    '¿Qué requisitos hay para aprobar el semillero?',
  ];

  for (const q of preguntas) {
    console.log(`\n❓ Pregunta: "${q}"`);
    const context = await searchKnowledge(q, 4);
    console.log(`📌 Contexto recuperado (${context.length} items):`, context.map(c => `[${c.tag}] ${c.content.slice(0, 40)}...`));
    const respuesta = await askLLM(q, context);
    console.log(`🤖 Respuesta LLM:\n${respuesta}\n----------------------------------`);
  }
}

testQA();
