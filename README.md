# Bot del Semillero — Agil Project

Bot de Telegram que:
- Responde dudas de programación (usando un LLM).
- Responde preguntas sobre las clases del semillero, basándose en info que los admins van subiendo.

## 1. Requisitos
- Node.js 18+
- Cuenta en [Supabase](https://supabase.com) (gratis)
- Bot de Telegram creado con [@BotFather](https://t.me/BotFather)
- API key de [Groq](https://console.groq.com) (gratis)

## 2. Setup

1. `npm install`
2. Copia `.env.example` a `.env` y llena las variables:
   - `TELEGRAM_BOT_TOKEN`: te lo da @BotFather al crear el bot.
   - `SUPABASE_URL` / `SUPABASE_KEY`: en tu proyecto de Supabase → Settings → API.
   - `GROQ_API_KEY`: en console.groq.com → API Keys.
   - `ADMIN_IDS`: tu ID de Telegram (y el de otros admins), separados por coma.
     Para saber tu ID, escríbele a [@userinfobot](https://t.me/userinfobot).
3. En tu proyecto de Supabase, abre el **SQL Editor** y corre el contenido de `supabase_schema.sql`
   (crea la tabla `knowledge` donde se guarda toda la info del semillero).
4. `npm start`

## 3. Uso

**Cualquier persona en el chat/grupo donde esté el bot:**
- Escribe cualquier pregunta, de programación o del semillero, y el bot responde.

**Solo admins (los IDs en `ADMIN_IDS`):**
- `/addinfo <texto>` — guarda info nueva. Ej: `/addinfo El parcial de estructuras es el 25 de julio`
- `/listinfo` — ver las últimas 10 entradas guardadas
- `/delinfo <id>` — borra una entrada por su id

## 4. Cómo funciona (RAG simple)

Cada vez que alguien pregunta algo:
1. El bot busca en la tabla `knowledge` de Supabase si hay info relacionada (búsqueda de texto en español).
2. Si encuentra algo relevante, se lo pasa como contexto al modelo.
3. El modelo responde combinando ese contexto (si existe) con su conocimiento general de programación.

Así, si preguntan "¿cuándo es el próximo parcial?" y un admin ya subió esa info con `/addinfo`,
el bot responde con el dato real. Si preguntan "¿cómo hago un JOIN en SQL?", responde con su
conocimiento general porque no depende de nada que hayas subido.

## 5. Deploy 24/7

Para que el bot esté siempre activo (no solo mientras corre en tu computador), súbelo a
[Railway](https://railway.app) o [Render](https://render.com) (planes gratis para empezar):
sube el proyecto, configura las mismas variables de entorno del `.env`, y que corra `npm start`.

## 6. Próximos pasos posibles

- Cambiar Groq por la API de Claude si quieres más calidad en respuestas de código complejas
  (solo hay que cambiar `src/llm.js`).
- Agregar embeddings (búsqueda semántica con pgvector) en vez de solo texto, si la base de
  conocimiento crece mucho y la búsqueda por palabras se queda corta.
- Permitir que cualquier admin suba info reenviando un mensaje al bot, sin tener que escribir `/addinfo`.
- Agregar tags por materia/tema para organizar mejor lo que se sube.
