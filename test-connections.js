import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';
import { Telegraf } from 'telegraf';

console.log('🔍 Iniciando verificación de conexiones...\n');

// 1. Verificar variables de entorno
const requiredEnv = ['TELEGRAM_BOT_TOKEN', 'SUPABASE_URL', 'SUPABASE_KEY', 'GROQ_API_KEY'];
let missingEnv = false;

requiredEnv.forEach((envVar) => {
  if (!process.env[envVar]) {
    console.log(`❌ Variable de entorno faltante: ${envVar}`);
    missingEnv = true;
  } else {
    console.log(`✅ ${envVar} detectada`);
  }
});

if (missingEnv) {
  console.log('\n⚠️ Asegúrate de crear el archivo .env con todas las variables necesarias.');
}

async function runTests() {
  // 2. Probar Supabase
  if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
    try {
      console.log('\n📊 Probando conexión con Supabase...');
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
      const { data, error } = await supabase.from('knowledge').select('count', { count: 'exact', head: true });
      if (error) {
        console.log(`❌ Error al conectar con Supabase (tabla 'knowledge'): ${error.message}`);
      } else {
        console.log('✅ Conexión con Supabase exitosa. Tabla "knowledge" lista.');
      }
    } catch (e) {
      console.log(`❌ Excepción al probar Supabase: ${e.message}`);
    }
  }

  // 3. Probar Groq API
  if (process.env.GROQ_API_KEY) {
    try {
      console.log('\n🤖 Probando conexión con Groq API...');
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      const response = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: 'Di "Hola" en una palabra.' }],
        max_tokens: 10,
      });
      console.log(`✅ Conexión con Groq API exitosa. Respuesta: "${response.choices[0]?.message?.content?.trim()}"`);
    } catch (e) {
      console.log(`❌ Error al probar Groq API: ${e.message}`);
    }
  }

  // 4. Probar Telegram Bot Token
  if (process.env.TELEGRAM_BOT_TOKEN) {
    try {
      console.log('\n✈️ Probando token del Bot de Telegram...');
      const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
      const botInfo = await bot.telegram.getMe();
      console.log(`✅ Bot autenticado correctamente: @${botInfo.username} (${botInfo.first_name})`);
    } catch (e) {
      console.log(`❌ Error al autenticar el Bot de Telegram: ${e.message}`);
    }
  }

  console.log('\n🏁 Pruebas finalizadas.');
}

runTests();
