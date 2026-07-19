import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// Base de datos local en memoria (fallback resiliente con datos iniciales del semillero)
const localKnowledge = [
  {
    id: 1,
    tag: 'horario',
    content: 'Las sesiones presenciales del semillero Agil Project son todos los miércoles de 4:00 PM a 6:00 PM en el Laboratorio de Software 2.',
    added_by: 'sistema',
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    tag: 'metodologia',
    content: 'En el semillero trabajamos con metodologías ágiles: marco Scrum para la gestión de proyectos, Sprints de 2 semanas, historias de usuario e integración continua.',
    added_by: 'sistema',
    created_at: new Date().toISOString(),
  },
  {
    id: 3,
    tag: 'temario',
    content: 'El plan de estudios del semillero Agil Project incluye: 1) Metodologías Ágiles (Scrum y Kanban), 2) Frontend con React.js, 3) Backend con Node.js y Supabase, 4) Control de versiones con Git y GitHub.',
    added_by: 'sistema',
    created_at: new Date().toISOString(),
  },
  {
    id: 4,
    tag: 'fechas',
    content: 'Próximas fechas importantes: Entrega de propuesta de proyecto el 15 de Agosto; Sprint Review el 30 de Agosto; Sustentación final del proyecto el 15 de Noviembre.',
    added_by: 'sistema',
    created_at: new Date().toISOString(),
  },
  {
    id: 5,
    tag: 'evaluacion',
    content: 'Para aprobar el semillero Agil Project se requiere: 80% de asistencia mínima a las sesiones, desarrollo del proyecto integrador en grupo y sustentación exitosa al final del semestre.',
    added_by: 'sistema',
    created_at: new Date().toISOString(),
  },
  {
    id: 6,
    tag: 'recursos',
    content: 'Recursos oficiales del semillero: Documentación de React (react.dev), guía de JavaScript MDN, tutoriales de Supabase y el repositorio de GitHub de Agil Project.',
    added_by: 'sistema',
    created_at: new Date().toISOString(),
  },
];

let nextLocalId = 7;

export async function addKnowledge(content, tag = null, addedBy = 'admin') {
  // 1. Guardar localmente
  const newItem = {
    id: nextLocalId++,
    content,
    tag: tag ? tag.toLowerCase() : null,
    added_by: addedBy,
    created_at: new Date().toISOString(),
  };
  localKnowledge.unshift(newItem);

  // 2. Intentar guardar en Supabase si está disponible
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('knowledge')
        .insert({ content, tag: tag ? tag.toLowerCase() : null, added_by: addedBy })
        .select()
        .single();
      if (!error && data) return data;
    } catch (e) {
      console.warn('⚠️ Supabase no disponible para addKnowledge, usando almacenamiento local:', e.message);
    }
  }

  return newItem;
}

export async function searchKnowledge(query, limit = 4) {
  // 1. Intentar en Supabase
  if (supabase) {
    try {
      const { data: textData, error: textError } = await supabase
        .from('knowledge')
        .select('id, content, tag, created_at')
        .textSearch('search', query, { type: 'websearch', config: 'spanish' })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!textError && textData && textData.length > 0) {
        return textData;
      }

      // Fallback ilike en Supabase
      const words = query.replace(/[^\w\sáéíóúñÁÉÍÓÚÑ]/gi, '').split(/\s+/).filter((w) => w.length > 3);
      if (words.length > 0) {
        const { data: ilikeData, error: ilikeError } = await supabase
          .from('knowledge')
          .select('id, content, tag, created_at')
          .ilike('content', `%${words[0]}%`)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (!ilikeError && ilikeData && ilikeData.length > 0) {
          return ilikeData;
        }
      }
    } catch (e) {
      // Continuar al fallback local
    }
  }

  // 2. Fallback a búsqueda local si Supabase no está configurado o falla
  const queryLower = query.toLowerCase();
  const words = queryLower.replace(/[^\w\sáéíóúñ]/g, '').split(/\s+/).filter((w) => w.length > 2);

  const matched = localKnowledge.filter((item) => {
    const contentLower = item.content.toLowerCase();
    const tagLower = (item.tag || '').toLowerCase();
    return (
      contentLower.includes(queryLower) ||
      tagLower.includes(queryLower) ||
      words.some((word) => contentLower.includes(word) || tagLower.includes(word))
    );
  });

  return matched.slice(0, limit);
}

export async function searchByTag(tag, limit = 5) {
  const cleanTag = tag.startsWith('#') ? tag.slice(1).toLowerCase() : tag.toLowerCase();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('knowledge')
        .select('id, content, tag, created_at')
        .ilike('tag', `%${cleanTag}%`)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!error && data && data.length > 0) return data;
    } catch (e) {
      // Fallback local
    }
  }

  return localKnowledge
    .filter((item) => item.tag && item.tag.toLowerCase().includes(cleanTag))
    .slice(0, limit);
}

export async function listKnowledge(limit = 10) {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('knowledge')
        .select('id, content, tag, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!error && data && data.length > 0) return data;
    } catch (e) {
      // Fallback local
    }
  }

  return localKnowledge.slice(0, limit);
}

export async function deleteKnowledge(id) {
  const targetId = Number(id);
  const index = localKnowledge.findIndex((item) => item.id === targetId);
  if (index !== -1) {
    localKnowledge.splice(index, 1);
  }

  if (supabase) {
    try {
      await supabase.from('knowledge').delete().eq('id', id);
    } catch (e) {
      // Ignorar si solo es local
    }
  }
}
