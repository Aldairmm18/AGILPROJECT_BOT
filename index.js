import { Telegraf } from 'telegraf';
import 'dotenv/config';
import {
  addKnowledge,
  searchKnowledge,
  searchByTag,
  listKnowledge,
  deleteKnowledge,
} from './db.js';
import { askLLM } from './llm.js';
import { createClient } from '@supabase/supabase-js';

import http from 'http';

// Servidor HTTP ligero para que Render lo ejecute en el plan 100% GRATUITO (Web Service)
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('🤖 Bot del Semillero Agil Project activo 24/7!');
}).listen(PORT, () => {
  console.log(`🌐 Servidor de salud iniciado en puerto ${PORT}`);
});

if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN no está definido en el archivo .env');
  process.exit(1);
}

// Cliente Supabase para operar sobre la tabla proposals (moderación)
const supabase =
  process.env.SUPABASE_URL && process.env.SUPABASE_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)
    : null;

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const ADMIN_IDS = (process.env.ADMIN_IDS || '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);

function isAdmin(ctx) {
  if (!ctx.from) return false;
  return ADMIN_IDS.includes(String(ctx.from.id));
}

// Envío seguro a Telegram con fallback a texto plano si falla el parseo de Markdown
async function replySafe(ctx, text, extraOptions = {}) {
  try {
    await ctx.reply(text, { parse_mode: 'Markdown', ...extraOptions });
  } catch (err) {
    // Si falla el formateo de Markdown por caracteres no escapados, se envía en texto plano
    await ctx.reply(text, extraOptions);
  }
}

// --- /start ---
bot.start((ctx) => {
  const adminMsg = isAdmin(ctx)
    ? '\n\n⭐ *Modo Administrador Activo*\n' +
      '• `/addinfo [#tag] <texto>` — Agregar información\n' +
      '• `/listinfo` — Ver últimas entradas\n' +
      '• `/delinfo <id>` — Borrar una entrada por ID\n' +
      '• `/propuestas` — Ver propuestas pendientes de la web\n' +
      '• `/aprobar <id>` — Aprobar una propuesta y publicarla\n' +
      '• `/rechazar <id>` — Rechazar una propuesta'
    : '';

  const msg =
    '👋 *¡Hola! Soy el Bot Oficial del Semillero Agil Project.*\n\n' +
    'Puedes hacerme preguntas sobre:\n' +
    '• 💻 *Dudas de programación:* Lenguajes, algoritmos, bases de datos.\n' +
    '• 📚 *Información del semillero:* Horarios, fechas de entregas y anuncios.\n\n' +
    '📌 *Comandos útiles:*\n' +
    '• `/help` — Ver ayuda detallada\n' +
    '• `/anuncios` — Ver últimos anuncios del semillero\n' +
    '• `/buscar <término>` — Buscar temas específicos' +
    adminMsg;

  const idInfo = `\n\n🆔 *Tu ID de Telegram:* \`${ctx.from.id}\``;

  replySafe(ctx, msg + idInfo);
});

// --- /myid ---
bot.command('myid', (ctx) => {
  replySafe(ctx, `🆔 Tu ID de Telegram es: \`${ctx.from.id}\``);
});

// --- /help ---
bot.command(['help', 'ayuda'], (ctx) => {
  const adminHelp = isAdmin(ctx)
    ? '\n\n🛠️ *Comandos de Administrador:*\n' +
      '• `/addinfo #parcial El examen es el 25 de julio` (Puedes usar etiquetas `#tag`)\n' +
      '• `/listinfo` — Lista los últimos 10 elementos registrados con su ID\n' +
      '• `/delinfo 5` — Elimina la entrada con ID 5\n' +
      '• `/propuestas` — Muestra las propuestas pendientes enviadas desde la web\n' +
      '• `/aprobar 3` — Aprueba la propuesta #3 y la publica automáticamente\n' +
      '• `/rechazar 3` — Rechaza la propuesta #3'
    : '';

  const msg =
    'ℹ️ *Guía de uso — Bot Semillero Agil Project*\n\n' +
    '💬 *¿Cómo hacer preguntas?*\n' +
    'Solo escribe tu duda directamente en el chat. Por ejemplo:\n' +
    '• _"¿Cómo funciona un join en SQL?"_\n' +
    '• _"¿Cuándo es el próximo taller del semillero?"_\n\n' +
    '🔍 *Comandos de consulta:*\n' +
    '• `/anuncios` — Consulta las últimas novedades\n' +
    '• `/buscar <palabra>` — Busca temas guardados en la base de datos' +
    adminHelp;

  replySafe(ctx, msg);
});

// --- /anuncios ---
bot.command('anuncios', async (ctx) => {
  try {
    const items = await listKnowledge(5);
    if (!items.length) {
      return replySafe(ctx, '📭 Aún no hay anuncios registrados en el semillero.');
    }

    const msg =
      '📢 *Últimos anuncios del Semillero:*\n\n' +
      items
        .map((item, i) => {
          const date = new Date(item.created_at).toLocaleDateString('es-CO');
          const tag = item.tag ? `\`[${item.tag}]\` ` : '';
          return `${i + 1}. ${tag}${item.content} _(${date})_`;
        })
        .join('\n\n');

    replySafe(ctx, msg);
  } catch (err) {
    console.error('Error en /anuncios:', err);
    ctx.reply('Ocurrió un error al consultar los anuncios.');
  }
});

// --- /buscar ---
bot.command('buscar', async (ctx) => {
  const query = ctx.message.text.replace(/^\/buscar/, '').trim();
  if (!query) {
    return replySafe(ctx, '⚠️ *Uso:* `/buscar <término o #tag>`\n*Ejemplo:* `/buscar #parcial` o `/buscar react`');
  }

  try {
    await ctx.sendChatAction('typing');
    let results = [];

    if (query.startsWith('#')) {
      results = await searchByTag(query, 5);
    } else {
      results = await searchKnowledge(query, 5);
    }

    if (!results.length) {
      return replySafe(ctx, `🔍 No encontré información guardada sobre *"${query}"*.`);
    }

    const msg =
      `🔍 *Resultados para "${query}":*\n\n` +
      results
        .map((item) => {
          const tag = item.tag ? `\`[${item.tag}]\` ` : '';
          return `• ${tag}${item.content}`;
        })
        .join('\n\n');

    replySafe(ctx, msg);
  } catch (err) {
    console.error('Error en /buscar:', err);
    ctx.reply('Ocurrió un error al realizar la búsqueda.');
  }
});

// --- Comandos Admin ---

// /addinfo
bot.command('addinfo', async (ctx) => {
  if (!isAdmin(ctx)) {
    return replySafe(ctx, '⛔ Este comando está reservado para los administradores del semillero.');
  }

  const rawText = ctx.message.text.replace(/^\/addinfo/, '').trim();
  if (!rawText) {
    return replySafe(
      ctx,
      '⚠️ *Uso:* `/addinfo [#tag] <texto>`\n' +
        '*Ejemplo 1:* `/addinfo #parcial El examen final es el 20 de Noviembre`\n' +
        '*Ejemplo 2:* `/addinfo Recordar traer portátil cargado a la clase`'
    );
  }

  // Extraer tag si comienza con #
  const tagMatch = rawText.match(/^#([\w-]+)\s+(.+)/s);
  let tag = null;
  let content = rawText;

  if (tagMatch) {
    tag = tagMatch[1];
    content = tagMatch[2];
  }

  try {
    const addedBy = ctx.from.username || String(ctx.from.id);
    const saved = await addKnowledge(content, tag, addedBy);
    const tagInfo = saved.tag ? ` con etiqueta \`#${saved.tag}\`` : '';
    replySafe(ctx, `✅ *Información guardada correctamente* (ID: #${saved.id})${tagInfo}.`);
  } catch (err) {
    console.error('Error en /addinfo:', err);
    ctx.reply('Error al guardar la información en Supabase.');
  }
});

// /listinfo
bot.command('listinfo', async (ctx) => {
  if (!isAdmin(ctx)) {
    return replySafe(ctx, '⛔ Este comando está reservado para los administradores del semillero.');
  }

  try {
    const items = await listKnowledge(10);
    if (!items.length) {
      return replySafe(ctx, '📭 La base de conocimientos está vacía.');
    }

    const msg =
      '📋 *Últimas 10 entradas en la base de datos:*\n\n' +
      items
        .map((i) => {
          const tag = i.tag ? `\`#${i.tag}\` ` : '';
          const preview = i.content.length > 70 ? `${i.content.slice(0, 70)}…` : i.content;
          return `*#${i.id}* — ${tag}${preview}`;
        })
        .join('\n');

    replySafe(ctx, msg);
  } catch (err) {
    console.error('Error en /listinfo:', err);
    ctx.reply('Error al obtener el listado.');
  }
});

// /delinfo
bot.command('delinfo', async (ctx) => {
  if (!isAdmin(ctx)) {
    return replySafe(ctx, '⛔ Este comando está reservado para los administradores del semillero.');
  }

  const id = ctx.message.text.replace(/^\/delinfo/, '').trim();
  if (!id || isNaN(id)) {
    return replySafe(ctx, '⚠️ *Uso:* `/delinfo <ID_número>`\n*Ejemplo:* `/delinfo 3`');
  }

  try {
    await deleteKnowledge(id);
    replySafe(ctx, `🗑️ Entrada *#${id}* eliminada con éxito.`);
  } catch (err) {
    console.error('Error en /delinfo:', err);
    ctx.reply(`No se pudo eliminar la entrada #${id}. Verifica que el ID exista.`);
  }
});

// =====================================================================
// COMANDOS DE MODERACIÓN: propuestas enviadas desde la web (Proponer.jsx)
// =====================================================================

// /propuestas — Lista las propuestas pendientes desde la web
bot.command('propuestas', async (ctx) => {
  if (!isAdmin(ctx)) {
    return replySafe(ctx, '⛔ Este comando está reservado para los administradores del semillero.');
  }

  if (!supabase) {
    return replySafe(ctx, '⚠️ Supabase no está configurado en este entorno.');
  }

  try {
    const { data, error } = await supabase
      .from('proposals')
      .select('id, nombre, tipo, modulo, contenido, estado, created_at')
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: true })
      .limit(10);

    if (error) throw error;

    if (!data || data.length === 0) {
      return replySafe(ctx, '✅ No hay propuestas pendientes de revisión en este momento.');
    }

    const msg =
      `📥 *Propuestas pendientes de revisión (${data.length}):*\n\n` +
      data
        .map((p) => {
          const preview = p.contenido.length > 80 ? `${p.contenido.slice(0, 80)}…` : p.contenido;
          return (
            `*#${p.id}* — [${p.tipo}] \`${p.modulo}\`\n` +
            `👤 ${p.nombre}\n` +
            `_${preview}_`
          );
        })
        .join('\n\n') +
      '\n\n✅ `/aprobar <id>` — ❌ `/rechazar <id>`';

    replySafe(ctx, msg);
  } catch (err) {
    console.error('Error en /propuestas:', err);
    ctx.reply('Error al obtener las propuestas.');
  }
});

// /aprobar <id> — Aprueba la propuesta y la pasa al knowledge base compartido
bot.command('aprobar', async (ctx) => {
  if (!isAdmin(ctx)) {
    return replySafe(ctx, '⛔ Este comando está reservado para los administradores del semillero.');
  }

  if (!supabase) {
    return replySafe(ctx, '⚠️ Supabase no está configurado en este entorno.');
  }

  const id = ctx.message.text.replace(/^\/aprobar/, '').trim();
  if (!id || isNaN(id)) {
    return replySafe(ctx, '⚠️ *Uso:* `/aprobar <ID>`\n*Ejemplo:* `/aprobar 5`');
  }

  try {
    // 1. Buscar la propuesta
    const { data: proposal, error: fetchErr } = await supabase
      .from('proposals')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !proposal) {
      return replySafe(ctx, `❌ No se encontró la propuesta #${id}.`);
    }

    if (proposal.estado !== 'pendiente') {
      return replySafe(ctx, `ℹ️ La propuesta #${id} ya fue *${proposal.estado}*.`);
    }

    const approvedBy = ctx.from.username || String(ctx.from.id);

    // 2. Publicar el contenido al knowledge base (tabla compartida con la web)
    const tag = proposal.tipo.toLowerCase().replace(/\s+/g, '_');
    const saved = await addKnowledge(proposal.contenido, tag, proposal.nombre);

    // Actualizar modulo en Supabase si está disponible
    if (saved.id) {
      await supabase
        .from('knowledge')
        .update({ modulo: proposal.modulo })
        .eq('id', saved.id);
    }

    // 3. Marcar la propuesta como aprobada
    await supabase
      .from('proposals')
      .update({ estado: 'aprobado', aprobado_by: approvedBy })
      .eq('id', id);

    replySafe(
      ctx,
      `✅ *Propuesta #${id} aprobada y publicada exitosamente.*\n\n` +
        `📚 *Módulo:* ${proposal.modulo}\n` +
        `👤 *Autor:* ${proposal.nombre}\n\n` +
        `El contenido ya está disponible en la web y en el bot.`
    );
  } catch (err) {
    console.error('Error en /aprobar:', err);
    ctx.reply(`Error al aprobar la propuesta #${id}.`);
  }
});

// /rechazar <id> — Rechaza la propuesta sin publicarla
bot.command('rechazar', async (ctx) => {
  if (!isAdmin(ctx)) {
    return replySafe(ctx, '⛔ Este comando está reservado para los administradores del semillero.');
  }

  if (!supabase) {
    return replySafe(ctx, '⚠️ Supabase no está configurado en este entorno.');
  }

  const id = ctx.message.text.replace(/^\/rechazar/, '').trim();
  if (!id || isNaN(id)) {
    return replySafe(ctx, '⚠️ *Uso:* `/rechazar <ID>`\n*Ejemplo:* `/rechazar 5`');
  }

  try {
    const { error } = await supabase
      .from('proposals')
      .update({ estado: 'rechazado' })
      .eq('id', id)
      .eq('estado', 'pendiente');

    if (error) throw error;

    replySafe(ctx, `❌ Propuesta *#${id}* rechazada y marcada como no publicable.`);
  } catch (err) {
    console.error('Error en /rechazar:', err);
    ctx.reply(`Error al rechazar la propuesta #${id}.`);
  }
});

// --- Manejador general de mensajes de texto ---
bot.on('text', async (ctx) => {
  if (ctx.message.text.startsWith('/')) return;

  const question = ctx.message.text.trim();
  if (!question) return;

  try {
    await ctx.sendChatAction('typing');
    const context = await searchKnowledge(question, 4);
    const answer = await askLLM(question, context);
    await replySafe(ctx, answer);
  } catch (err) {
    console.error('Error procesando pregunta:', err);
    ctx.reply('Tuve un problema al procesar tu consulta. Por favor intenta de nuevo en un momento.');
  }
});

bot.launch();
console.log('🤖 Bot del Semillero Agil Project iniciado correctamente.');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
