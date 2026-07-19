import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const seedItems = [
  {
    tag: 'horario',
    content: 'Las sesiones presenciales del semillero Agil Project son todos los miércoles de 4:00 PM a 6:00 PM en el Laboratorio de Software.',
  },
  {
    tag: 'metodologia',
    content: 'En el semillero trabajamos con metodologías ágiles: Scrum para la gestión de proyectos, Sprints de 2 semanas, historias de usuario e integración continua.',
  },
  {
    tag: 'temario',
    content: 'El plan de estudios del semillero incluye: 1) Metodologías Ágiles (Scrum/Kanban), 2) Frontend con React.js, 3) Backend con Node.js y Supabase, 4) Git/GitHub avanzado.',
  },
  {
    tag: 'fechas',
    content: 'Próximas fechas importantes: Entrega de propuesta de proyecto el 15 de Agosto; Sprint Review el 30 de Agosto; Sustentación final el 15 de Noviembre.',
  },
  {
    tag: 'evaluacion',
    content: 'Para aprobar el semillero se requiere: 80% de asistencia mínima a las sesiones, desarrollo del proyecto integrador en grupo y sustentación exitosa.',
  },
  {
    tag: 'recursos',
    content: 'Recursos recomendados: Documentación oficial de React (react.dev), guía de JavaScript MDN, tutoriales de Supabase y repositorio oficial de GitHub del semillero.',
  },
];

async function seed() {
  console.log('🌱 Insertando datos iniciales en la base de datos de Supabase...\n');

  // Verificar items actuales
  const { data: currentData, error: fetchError } = await supabase.from('knowledge').select('*');

  if (fetchError) {
    console.error('❌ Error al consultar la tabla knowledge:', fetchError.message);
    return;
  }

  console.log(`📌 Registros actuales en la base de datos: ${currentData.length}`);

  if (currentData.length === 0) {
    const { data: insertedData, error: insertError } = await supabase
      .from('knowledge')
      .insert(seedItems.map((item) => ({ ...item, added_by: 'sistema' })))
      .select();

    if (insertError) {
      console.error('❌ Error al insertar datos iniciales:', insertError.message);
    } else {
      console.log(`✅ Se insertaron con éxito ${insertedData.length} registros iniciales sobre el semillero Agil Project.`);
    }
  } else {
    console.log('ℹ️ La base de datos ya contiene información. Insertando únicamente ítems faltantes si aplica...');
    for (const item of seedItems) {
      const exists = currentData.some((c) => c.content === item.content);
      if (!exists) {
        await supabase.from('knowledge').insert({ ...item, added_by: 'sistema' });
        console.log(`  + Agregado: [${item.tag}] ${item.content.slice(0, 50)}...`);
      }
    }
  }

  console.log('\n✨ Proceso de carga finalizado.');
}

seed();
