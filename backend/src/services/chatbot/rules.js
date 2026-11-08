/**
 * ==========================================================
 * PROTEC · Reglas del asistente de diagnóstico
 * ==========================================================
 * Las reglas son DATOS: para agregar un nuevo caso basta con añadir
 * un objeto a `RULES`, sin tocar el motor (engine.js) ni la interfaz.
 *
 * Estructura de una regla:
 * {
 *   id:          identificador único
 *   deviceType:  'celular' | 'laptop' | 'computadora' | '*'  (cualquiera)
 *   category:    categorías relacionadas (string o array)
 *   keywords:    palabras/frases que suelen aparecer en la descripción
 *   title:       nombre corto del problema (se muestra al usuario)
 *   intro:       mensaje con el que el bot presenta el tema
 *   questions:   [{ id, text, type: 'yesno' | 'choice', options? }]
 *   recommendations: consejos generales del tema
 *   requiresTechnician: valor por defecto si ningún resultado lo define
 *   outcomes:    [{ when: { preguntaId: valor | [valores] }, ...resultado }]
 *                Se evalúan en orden; gana el primero que coincide.
 *                El último debe ser `{ default: true, ... }`.
 *   fallback:    true si es la regla general del dispositivo
 * }
 *
 * Valores de respuestas yes/no: 'si' | 'no' | 'nose'
 * Prioridad: 'baja' | 'media' | 'alta'
 */

const yesno = (id, text) => ({ id, text, type: 'yesno' })
const choice = (id, text, options) => ({ id, text, type: 'choice', options })

/* ----------------------------------------------------------
 * CELULAR
 * -------------------------------------------------------- */
const phoneRules = [
  {
    id: 'celular-carga',
    deviceType: 'celular',
    category: ['Carga'],
    keywords: ['carga', 'cargar', 'cargador', 'cable', 'puerto', 'conector', 'enchufe', 'no carga', 'tipo c', 'lightning'],
    title: 'Problema de carga',
    intro: 'Por lo que describes, parece un problema relacionado con la carga del celular.',
    questions: [
      yesno('senal', '¿El dispositivo muestra alguna señal al conectarlo?'),
      yesno('otroCable', '¿Has probado otro cable o cargador?'),
      yesno('puertoDanado', '¿El puerto de carga presenta suciedad o daño visible?'),
    ],
    recommendations: [
      'Revisa el cable y el cargador.',
      'Prueba con otro cargador compatible.',
      'Inspecciona el puerto sin introducir objetos metálicos.',
    ],
    requiresTechnician: true,
    outcomes: [
      {
        when: { puertoDanado: 'si' },
        problem: 'Posible daño o acumulación de suciedad en el puerto de carga.',
        recommendation:
          'Evita forzar la conexión. Se recomienda revisión técnica del puerto de carga para limpiarlo o reemplazarlo de forma segura.',
        priority: 'media',
        requiresTechnician: true,
      },
      {
        when: { otroCable: ['no', 'nose'] },
        problem: 'La falla podría estar en el cable o en el cargador.',
        recommendation: 'Antes de una revisión técnica, intenta estos pasos sencillos.',
        priority: 'baja',
        requiresTechnician: false,
        selfFixSteps: [
          'Prueba con otro cable y otro cargador compatibles y en buen estado.',
          'Conecta el cargador directamente a un contacto de pared, sin multicontactos.',
          'Revisa el puerto con una linterna. Si ves pelusa, retírala con aire comprimido o un palillo de madera. Nunca introduzcas objetos metálicos.',
          'Deja el equipo conectado al menos 30 minutos antes de intentar encenderlo.',
        ],
      },
      {
        default: true,
        problem: 'Posible falla en el puerto, la batería o el circuito de carga.',
        recommendation: 'Se recomienda revisión técnica del puerto, batería o circuito de carga.',
        priority: 'media',
        requiresTechnician: true,
      },
    ],
  },
  {
    id: 'celular-pantalla',
    deviceType: 'celular',
    category: ['Pantalla'],
    keywords: ['pantalla', 'display', 'tactil', 'touch', 'negra', 'grieta', 'rota', 'estrellada', 'lineas', 'parpadea', 'no se ve', 'manchas'],
    title: 'Problema de pantalla',
    intro: 'Entiendo, revisemos la pantalla de tu celular.',
    questions: [
      yesno('negra', '¿La pantalla está completamente negra?'),
      yesno('vibra', '¿El dispositivo vibra o emite sonidos?'),
      yesno('golpes', '¿Presenta golpes o grietas?'),
    ],
    recommendations: ['Evita presionar zonas dañadas de la pantalla.', 'Respalda tu información si el equipo aún responde.'],
    requiresTechnician: true,
    outcomes: [
      {
        when: { golpes: 'si' },
        problem: 'Posible daño físico en la pantalla o en su conexión interna.',
        recommendation: 'Se recomienda revisión técnica para evaluar el reemplazo de la pantalla. Evita seguir presionando la zona dañada.',
        priority: 'media',
        requiresTechnician: true,
      },
      {
        when: { negra: 'si', vibra: ['no', 'nose'] },
        problem: 'El equipo podría estar sin batería o bloqueado.',
        recommendation: 'Antes de escalar el caso, intenta estos pasos.',
        priority: 'baja',
        requiresTechnician: false,
        selfFixSteps: [
          'Conecta el celular a su cargador durante al menos 30 minutos.',
          'Realiza un reinicio forzado: mantén presionados los botones de encendido y bajar volumen entre 10 y 15 segundos (puede variar según el modelo).',
          'Si aparece el logotipo de la marca, espera a que termine de iniciar.',
        ],
      },
      {
        default: true,
        problem: 'Puede existir una falla de pantalla, conexión interna o componente relacionado.',
        recommendation: 'Se recomienda revisión técnica.',
        priority: 'media',
        requiresTechnician: true,
      },
    ],
  },
  {
    id: 'celular-bateria',
    deviceType: 'celular',
    category: ['Batería'],
    keywords: ['bateria', 'descarga', 'se apaga', 'dura poco', 'hinchada', 'inflada', 'porcentaje', 'se calienta'],
    title: 'Problema de batería',
    intro: 'Vamos a revisar el estado de la batería.',
    questions: [
      yesno('descargaRapida', '¿La batería se descarga mucho más rápido que antes?'),
      yesno('abultada', '¿Notas la parte trasera abultada o la pantalla levantada?'),
      yesno('calienta', '¿El equipo se calienta más de lo normal?'),
    ],
    recommendations: ['No uses cargadores genéricos de baja calidad.', 'Evita dejar el equipo expuesto al calor.'],
    requiresTechnician: true,
    outcomes: [
      {
        when: { abultada: 'si' },
        problem: 'Posible batería inflada.',
        recommendation:
          'Deja de usar y de cargar el equipo, y solicita revisión técnica lo antes posible: una batería inflada representa un riesgo.',
        priority: 'alta',
        requiresTechnician: true,
      },
      {
        when: { calienta: 'si' },
        problem: 'Posible falla en la batería o en el circuito de carga.',
        recommendation: 'Se recomienda revisión técnica para medir la batería y el circuito de carga.',
        priority: 'media',
        requiresTechnician: true,
      },
      {
        default: true,
        problem: 'Desgaste de batería o consumo elevado por aplicaciones.',
        recommendation: 'Puedes mejorar la duración con estos ajustes.',
        priority: 'baja',
        requiresTechnician: false,
        selfFixSteps: [
          'Revisa en Ajustes > Batería qué aplicaciones consumen más energía y ciérralas o desinstálalas.',
          'Activa el modo de ahorro de energía y reduce el brillo de la pantalla.',
          'Actualiza el sistema operativo a la versión más reciente.',
          'Reinicia el equipo y observa la duración durante un día de uso normal.',
        ],
      },
    ],
  },
  {
    id: 'celular-software',
    deviceType: 'celular',
    category: ['Software', 'Rendimiento', 'Almacenamiento'],
    keywords: ['lento', 'se traba', 'congela', 'aplicacion', 'app', 'actualizacion', 'se reinicia', 'virus', 'sistema', 'memoria llena', 'almacenamiento'],
    title: 'Problema de software o rendimiento',
    intro: 'Parece un tema de software o rendimiento. Revisemos algunos puntos.',
    questions: [
      yesno('despuesActualizacion', '¿El problema comenzó después de una actualización o de instalar una aplicación?'),
      yesno('reinicia', '¿El equipo se reinicia solo?'),
      yesno('almacenamientoLleno', '¿El almacenamiento está casi lleno?'),
    ],
    recommendations: ['Mantén al menos 15% de almacenamiento libre.', 'Respalda tu información periódicamente.'],
    requiresTechnician: false,
    outcomes: [
      {
        when: { reinicia: 'si' },
        problem: 'Reinicios inesperados: puede ser una falla del sistema o de un componente.',
        recommendation: 'Se recomienda revisión técnica. Respalda tu información si es posible.',
        priority: 'media',
        requiresTechnician: true,
      },
      {
        default: true,
        problem: 'Posible saturación del sistema o conflicto con una aplicación.',
        recommendation: 'Intenta estos pasos para recuperar el rendimiento.',
        priority: 'baja',
        requiresTechnician: false,
        selfFixSteps: [
          'Libera espacio eliminando fotos, videos o aplicaciones que no uses.',
          'Desinstala la última aplicación instalada si el problema comenzó después de instalarla.',
          'Actualiza el sistema y las aplicaciones.',
          'Reinicia el equipo. Como último recurso, respalda tu información y restablece la configuración de fábrica.',
        ],
      },
    ],
  },
  {
    id: 'celular-general',
    deviceType: 'celular',
    fallback: true,
    category: [],
    keywords: [],
    title: 'Revisión general del celular',
    intro: 'Haré algunas preguntas generales para orientar el diagnóstico.',
    questions: [
      yesno('enciende', '¿El dispositivo enciende?'),
      yesno('caida', '¿El dispositivo sufrió una caída o contacto con líquidos?'),
      yesno('constante', '¿El problema ocurre todo el tiempo?'),
    ],
    recommendations: ['Respalda tu información si el equipo aún enciende.'],
    requiresTechnician: true,
    outcomes: [
      {
        when: { caida: 'si' },
        problem: 'Posible daño interno por golpe o humedad.',
        recommendation: 'Apaga el equipo, no lo cargues si estuvo en contacto con líquidos y solicita revisión técnica cuanto antes.',
        priority: 'alta',
        requiresTechnician: true,
      },
      {
        default: true,
        problem: 'Se requiere una revisión física para identificar la causa del problema.',
        recommendation: 'Un técnico revisará tu caso con la información que registraste.',
        priority: 'media',
        requiresTechnician: true,
      },
    ],
  },
]

/* ----------------------------------------------------------
 * LAPTOP
 * -------------------------------------------------------- */
const laptopRules = [
  {
    id: 'laptop-sin-imagen',
    deviceType: 'laptop',
    category: ['Pantalla'],
    keywords: ['pantalla negra', 'sin imagen', 'no da imagen', 'no muestra', 'enciende pero', 'negra', 'no se ve', 'pantalla'],
    title: 'Enciende sin imagen',
    intro: 'Vamos a revisar algunas posibles causas de la falta de imagen.',
    questions: [
      yesno('indicadores', '¿Encienden los indicadores?'),
      yesno('ventilador', '¿Escuchas el ventilador?'),
      yesno('iluminacion', '¿La pantalla muestra alguna iluminación?'),
      choice('externa', '¿Probaste conectarla a una pantalla externa?', [
        { value: 'imagen', label: 'Sí, y muestra imagen', aliases: ['si muestra', 'funciona', 'si se ve', 'si'] },
        { value: 'sin_imagen', label: 'Sí, pero no muestra imagen', aliases: ['no muestra', 'tampoco', 'no se ve'] },
        { value: 'no_probado', label: 'No lo he probado', aliases: ['no', 'no he probado', 'no tengo'] },
      ]),
    ],
    recommendations: ['Desconecta accesorios USB antes de encender.', 'Prueba con un monitor externo si tienes uno disponible.'],
    requiresTechnician: true,
    outcomes: [
      {
        when: { indicadores: 'no', ventilador: 'no' },
        problem: 'El equipo no parece encender. Puede tratarse de una falla de alimentación, batería o placa.',
        recommendation: 'Se recomienda revisión técnica del sistema de alimentación.',
        priority: 'media',
        requiresTechnician: true,
      },
      {
        when: { externa: 'imagen' },
        problem: 'La imagen funciona en un monitor externo: la falla parece estar en la pantalla interna o en su cable de conexión.',
        recommendation: 'Se recomienda una revisión física de la pantalla y su cable flex.',
        priority: 'media',
        requiresTechnician: true,
      },
      {
        default: true,
        problem: 'Falla relacionada con el sistema de video, la pantalla, la memoria o una conexión interna.',
        recommendation: 'Se recomienda una revisión física del dispositivo.',
        priority: 'media',
        requiresTechnician: true,
      },
    ],
  },
  {
    id: 'laptop-bateria',
    deviceType: 'laptop',
    category: ['Batería', 'Carga'],
    keywords: ['bateria', 'carga', 'cargador', 'porcentaje', 'no carga', 'se descarga', 'enchufada'],
    title: 'Problema de batería o carga',
    intro: 'Revisemos la batería y el sistema de carga de tu laptop.',
    questions: [
      yesno('conectada', '¿Funciona conectada al cargador?'),
      yesno('porcentaje', '¿La batería aumenta su porcentaje?'),
      yesno('mensaje', '¿El sistema muestra algún mensaje relacionado con la batería?'),
    ],
    recommendations: ['Usa el cargador original o uno con la potencia correcta.'],
    requiresTechnician: true,
    outcomes: [
      {
        when: { conectada: 'no' },
        problem: 'Posible falla en el cargador, el conector de carga o la placa.',
        recommendation: 'Se recomienda revisión técnica del cargador y del circuito de alimentación.',
        priority: 'media',
        requiresTechnician: true,
      },
      {
        when: { mensaje: 'si' },
        problem: 'El sistema reporta un problema con la batería; es probable que requiera reemplazo.',
        recommendation: 'Se recomienda revisión técnica para evaluar el reemplazo de la batería.',
        priority: 'media',
        requiresTechnician: true,
      },
      {
        when: { porcentaje: ['no', 'nose'] },
        problem: 'La batería no está recibiendo carga. Puede deberse al cargador, al conector o a la batería.',
        recommendation: 'Intenta estos pasos antes de escalar el caso.',
        priority: 'baja',
        requiresTechnician: false,
        selfFixSteps: [
          'Verifica que el cargador sea el original o compatible con la potencia correcta.',
          'Revisa que el cable no esté doblado y que el conector entre firmemente.',
          'Apaga el equipo, desconecta el cargador y mantén presionado el botón de encendido 30 segundos. Vuelve a conectar.',
          'Revisa en la configuración de energía que no esté activado un límite o modo de conservación de batería.',
        ],
      },
      {
        default: true,
        problem: 'La batería funciona, pero podría presentar desgaste.',
        recommendation: 'Ajusta la configuración de energía para mejorar la duración.',
        priority: 'baja',
        requiresTechnician: false,
        selfFixSteps: [
          'Activa el modo de ahorro de energía y reduce el brillo.',
          'Cierra programas que se ejecutan en segundo plano.',
          'Actualiza los controladores y el sistema operativo.',
          'Consulta el reporte de salud de la batería del sistema para conocer su desgaste.',
        ],
      },
    ],
  },
  {
    id: 'laptop-encendido',
    deviceType: 'laptop',
    category: ['Encendido'],
    keywords: ['no enciende', 'no prende', 'no arranca', 'muerta', 'se apaga sola', 'no hace nada'],
    title: 'No enciende',
    intro: 'Revisemos por qué tu laptop no enciende.',
    questions: [
      yesno('indicador', '¿Se enciende algún indicador al conectar el cargador?'),
      yesno('otroCargador', '¿Probaste con otro cargador compatible?'),
      yesno('sonido', '¿Escuchas algún sonido o el ventilador al presionar el botón de encendido?'),
    ],
    recommendations: ['Desconecta todos los accesorios antes de intentar encender.'],
    requiresTechnician: true,
    outcomes: [
      {
        when: { indicador: ['no', 'nose'], otroCargador: ['no', 'nose'] },
        problem: 'La laptop podría no estar recibiendo energía del cargador.',
        recommendation: 'Intenta estos pasos antes de solicitar la revisión.',
        priority: 'baja',
        requiresTechnician: false,
        selfFixSteps: [
          'Prueba otro contacto de pared y, si es posible, otro cargador compatible.',
          'Desconecta el cargador, mantén presionado el botón de encendido 30 segundos y vuelve a conectar.',
          'Deja el equipo cargando 20 minutos antes de intentar encenderlo.',
        ],
      },
      {
        default: true,
        problem: 'Posible falla en la placa, la batería o el circuito de encendido.',
        recommendation: 'Se recomienda revisión técnica.',
        priority: 'media',
        requiresTechnician: true,
      },
    ],
  },
  {
    id: 'laptop-rendimiento',
    deviceType: 'laptop',
    category: ['Rendimiento', 'Software', 'Almacenamiento'],
    keywords: ['lenta', 'lento', 'se traba', 'congela', 'calienta', 'ventilador ruidoso', 'virus', 'actualizacion', 'disco', 'pantalla azul'],
    title: 'Rendimiento o sistema',
    intro: 'Parece un tema de rendimiento o del sistema. Revisemos algunos puntos.',
    questions: [
      yesno('calienta', '¿El equipo se calienta o el ventilador suena muy fuerte?'),
      yesno('almacenamiento', '¿El almacenamiento está casi lleno?'),
      yesno('reciente', '¿El problema comenzó tras instalar un programa o una actualización?'),
    ],
    recommendations: ['Mantén el sistema y los controladores actualizados.'],
    requiresTechnician: false,
    outcomes: [
      {
        when: { calienta: 'si' },
        problem: 'Posible sobrecalentamiento por polvo acumulado o pasta térmica desgastada.',
        recommendation: 'Se recomienda un mantenimiento preventivo con limpieza interna.',
        priority: 'media',
        requiresTechnician: true,
      },
      {
        when: { almacenamiento: 'si' },
        problem: 'El almacenamiento casi lleno reduce el rendimiento del sistema.',
        recommendation: 'Libera espacio con estos pasos.',
        priority: 'baja',
        requiresTechnician: false,
        selfFixSteps: [
          'Elimina archivos temporales con la herramienta de limpieza del sistema.',
          'Desinstala programas que no utilices.',
          'Mueve fotos y videos a un disco externo o a la nube.',
          'Reinicia el equipo y comprueba el rendimiento.',
        ],
      },
      {
        when: { reciente: 'si' },
        problem: 'Un programa o actualización reciente podría estar causando el problema.',
        recommendation: 'Intenta revertir el cambio reciente.',
        priority: 'baja',
        requiresTechnician: false,
        selfFixSteps: [
          'Desinstala el programa instalado recientemente.',
          'Usa el punto de restauración del sistema anterior a la actualización.',
          'Ejecuta un análisis completo con tu antivirus.',
        ],
      },
      {
        default: true,
        problem: 'Bajo rendimiento sin una causa evidente; puede requerir revisión de hardware.',
        recommendation: 'Se recomienda una revisión técnica del disco y la memoria.',
        priority: 'baja',
        requiresTechnician: true,
      },
    ],
  },
  {
    id: 'laptop-general',
    deviceType: 'laptop',
    fallback: true,
    category: [],
    keywords: [],
    title: 'Revisión general de la laptop',
    intro: 'Haré algunas preguntas generales para orientar el diagnóstico.',
    questions: [
      yesno('enciende', '¿La laptop enciende?'),
      yesno('caida', '¿Sufrió una caída o contacto con líquidos?'),
      yesno('constante', '¿El problema ocurre todo el tiempo?'),
    ],
    recommendations: ['Respalda tu información si el equipo aún enciende.'],
    requiresTechnician: true,
    outcomes: [
      {
        when: { caida: 'si' },
        problem: 'Posible daño interno por golpe o humedad.',
        recommendation: 'Apaga el equipo, desconéctalo y solicita revisión técnica cuanto antes.',
        priority: 'alta',
        requiresTechnician: true,
      },
      {
        default: true,
        problem: 'Se requiere una revisión física para identificar la causa del problema.',
        recommendation: 'Un técnico revisará tu caso con la información que registraste.',
        priority: 'media',
        requiresTechnician: true,
      },
    ],
  },
]

/* ----------------------------------------------------------
 * COMPUTADORA DE ESCRITORIO
 * -------------------------------------------------------- */
const desktopRules = [
  {
    id: 'computadora-no-enciende',
    deviceType: 'computadora',
    category: ['Encendido'],
    keywords: ['no enciende', 'no prende', 'no arranca', 'no hace nada', 'fuente', 'se apaga'],
    title: 'No enciende',
    intro: 'Revisemos por qué tu computadora no enciende.',
    questions: [
      yesno('indicador', '¿Se enciende algún indicador?'),
      yesno('ventiladores', '¿Funcionan los ventiladores?'),
      yesno('sonido', '¿Escuchas algún sonido al intentar encender?'),
      yesno('cable', '¿Verificaste el cable de alimentación?'),
    ],
    recommendations: ['Revisa el interruptor trasero de la fuente de poder.'],
    requiresTechnician: true,
    outcomes: [
      {
        when: { cable: ['no', 'nose'] },
        problem: 'Podría tratarse de un problema de conexión eléctrica.',
        recommendation: 'Revisa la alimentación con estos pasos.',
        priority: 'baja',
        requiresTechnician: false,
        selfFixSteps: [
          'Verifica que el cable de poder esté firmemente conectado a la fuente y al contacto.',
          'Revisa que el interruptor trasero de la fuente esté en la posición de encendido (I).',
          'Prueba otro contacto de pared, sin regulador ni multicontacto.',
          'Si tienes otro cable de poder compatible, pruébalo.',
        ],
      },
      {
        when: { indicador: 'si', ventiladores: 'si' },
        problem: 'El equipo recibe energía pero no arranca. Puede ser la memoria RAM, la tarjeta de video o la placa base.',
        recommendation: 'Se recomienda revisión técnica de los componentes principales.',
        priority: 'media',
        requiresTechnician: true,
      },
      {
        default: true,
        problem: 'Posible falla en la fuente de poder, conexiones internas o componentes principales.',
        recommendation: 'Se recomienda revisar fuente de poder, conexiones internas o componentes principales.',
        priority: 'media',
        requiresTechnician: true,
      },
    ],
  },
  {
    id: 'computadora-sin-video',
    deviceType: 'computadora',
    category: ['Pantalla'],
    keywords: ['monitor', 'sin imagen', 'pantalla negra', 'no da video', 'sin senal', 'no hay senal', 'pantalla'],
    title: 'Sin imagen en el monitor',
    intro: 'Revisemos la conexión de video y el monitor.',
    questions: [
      yesno('monitor', '¿El monitor enciende y muestra un mensaje como "Sin señal"?'),
      yesno('cable', '¿Revisaste que el cable de video esté bien conectado en ambos extremos?'),
      yesno('pitidos', '¿La computadora emite pitidos al encender?'),
    ],
    recommendations: ['Si tienes tarjeta de video dedicada, conecta el monitor a ella y no a la placa.'],
    requiresTechnician: true,
    outcomes: [
      {
        when: { pitidos: 'si' },
        problem: 'Los pitidos suelen indicar una falla de memoria RAM o de la tarjeta de video.',
        recommendation: 'Se recomienda revisión técnica de memoria y video.',
        priority: 'media',
        requiresTechnician: true,
      },
      {
        when: { cable: ['no', 'nose'] },
        problem: 'Posible problema de conexión del cable de video.',
        recommendation: 'Revisa la conexión con estos pasos.',
        priority: 'baja',
        requiresTechnician: false,
        selfFixSteps: [
          'Desconecta y vuelve a conectar el cable de video en ambos extremos.',
          'Si tienes tarjeta de video dedicada, conecta el monitor a sus puertos (no a los de la placa).',
          'Selecciona la entrada correcta en el menú del monitor (HDMI, DisplayPort, VGA).',
          'Prueba con otro cable o con otro monitor si tienes disponible.',
        ],
      },
      {
        default: true,
        problem: 'Posible falla de la tarjeta de video, el monitor o la placa base.',
        recommendation: 'Se recomienda revisión técnica.',
        priority: 'media',
        requiresTechnician: true,
      },
    ],
  },
  {
    id: 'computadora-rendimiento',
    deviceType: 'computadora',
    category: ['Rendimiento', 'Software', 'Almacenamiento'],
    keywords: ['lenta', 'lento', 'se traba', 'congela', 'calienta', 'virus', 'actualizacion', 'disco', 'pantalla azul', 'reinicia'],
    title: 'Rendimiento o sistema',
    intro: 'Parece un tema de rendimiento o del sistema. Revisemos algunos puntos.',
    questions: [
      yesno('calienta', '¿El equipo se calienta o los ventiladores suenan muy fuerte?'),
      yesno('almacenamiento', '¿El almacenamiento está casi lleno?'),
      yesno('reinicia', '¿El equipo se reinicia solo o muestra pantallas azules?'),
    ],
    recommendations: ['Realiza mantenimiento preventivo al menos una vez al año.'],
    requiresTechnician: false,
    outcomes: [
      {
        when: { reinicia: 'si' },
        problem: 'Reinicios o pantallas azules: posible falla de memoria, disco, fuente o controladores.',
        recommendation: 'Se recomienda revisión técnica. Respalda tu información.',
        priority: 'media',
        requiresTechnician: true,
      },
      {
        when: { calienta: 'si' },
        problem: 'Posible sobrecalentamiento por polvo o pasta térmica desgastada.',
        recommendation: 'Se recomienda mantenimiento preventivo con limpieza interna.',
        priority: 'media',
        requiresTechnician: true,
      },
      {
        default: true,
        problem: 'El sistema podría estar saturado.',
        recommendation: 'Intenta estos pasos para recuperar el rendimiento.',
        priority: 'baja',
        requiresTechnician: false,
        selfFixSteps: [
          'Libera espacio en el disco y desinstala programas que no uses.',
          'Desactiva programas que inician automáticamente con el sistema.',
          'Actualiza el sistema operativo y los controladores.',
          'Ejecuta un análisis completo con tu antivirus.',
        ],
      },
    ],
  },
  {
    id: 'computadora-general',
    deviceType: 'computadora',
    fallback: true,
    category: [],
    keywords: [],
    title: 'Revisión general de la computadora',
    intro: 'Haré algunas preguntas generales para orientar el diagnóstico.',
    questions: [
      yesno('enciende', '¿La computadora enciende?'),
      yesno('cambios', '¿Hiciste algún cambio reciente de hardware o software?'),
      yesno('constante', '¿El problema ocurre todo el tiempo?'),
    ],
    recommendations: ['Respalda tu información si el equipo aún enciende.'],
    requiresTechnician: true,
    outcomes: [
      {
        default: true,
        problem: 'Se requiere una revisión física para identificar la causa del problema.',
        recommendation: 'Un técnico revisará tu caso con la información que registraste.',
        priority: 'media',
        requiresTechnician: true,
      },
    ],
  },
]

/* ----------------------------------------------------------
 * REGLAS PARA CUALQUIER DISPOSITIVO
 * -------------------------------------------------------- */
const sharedRules = [
  {
    id: 'general-conectividad',
    deviceType: '*',
    category: ['Conectividad'],
    keywords: ['wifi', 'wi-fi', 'internet', 'bluetooth', 'red', 'senal', 'datos moviles', 'no conecta'],
    title: 'Problema de conectividad',
    intro: 'Revisemos la conexión a internet o Bluetooth.',
    questions: [
      yesno('otrosDispositivos', '¿Otros dispositivos se conectan correctamente a la misma red?'),
      yesno('reinicio', '¿Ya reiniciaste el equipo y el módem o router?'),
      yesno('detecta', '¿El equipo detecta las redes disponibles?'),
    ],
    recommendations: ['Acércate al router para descartar problemas de señal.'],
    requiresTechnician: false,
    outcomes: [
      {
        when: { otrosDispositivos: 'no' },
        problem: 'El problema parece estar en la red o en el router, no en tu equipo.',
        recommendation: 'Revisa la red con estos pasos.',
        priority: 'baja',
        requiresTechnician: false,
        selfFixSteps: [
          'Reinicia el módem o router desconectándolo 30 segundos.',
          'Verifica que el servicio de internet esté activo con tu proveedor.',
          'Vuelve a conectar tu equipo a la red.',
        ],
      },
      {
        when: { reinicio: ['no', 'nose'] },
        problem: 'Puede ser una falla temporal de la conexión.',
        recommendation: 'Intenta estos pasos.',
        priority: 'baja',
        requiresTechnician: false,
        selfFixSteps: [
          'Reinicia tu equipo y el router.',
          'Olvida la red Wi-Fi y vuelve a conectarte ingresando la contraseña.',
          'Desactiva y activa el modo avión o el adaptador de red.',
        ],
      },
      {
        when: { detecta: 'no' },
        problem: 'Posible falla en el adaptador inalámbrico o su antena.',
        recommendation: 'Se recomienda revisión técnica del módulo de red.',
        priority: 'media',
        requiresTechnician: true,
      },
      {
        default: true,
        problem: 'Problema de conectividad que podría requerir revisión de configuración o del adaptador.',
        recommendation: 'Se recomienda revisión técnica.',
        priority: 'baja',
        requiresTechnician: true,
      },
    ],
  },
  {
    id: 'general-sonido',
    deviceType: '*',
    category: ['Sonido'],
    keywords: ['sonido', 'audio', 'bocina', 'altavoz', 'microfono', 'audifonos', 'no se escucha', 'volumen'],
    title: 'Problema de sonido',
    intro: 'Revisemos el audio de tu dispositivo.',
    questions: [
      yesno('volumen', '¿Revisaste el volumen y que el equipo no esté en silencio?'),
      yesno('audifonos', '¿Funcionan los audífonos o una bocina externa?'),
      yesno('distorsion', '¿El sonido se escucha distorsionado o con ruido?'),
    ],
    recommendations: ['Prueba el audio con diferentes aplicaciones.'],
    requiresTechnician: true,
    outcomes: [
      {
        when: { volumen: ['no', 'nose'] },
        problem: 'Podría ser un ajuste de volumen o de salida de audio.',
        recommendation: 'Revisa la configuración con estos pasos.',
        priority: 'baja',
        requiresTechnician: false,
        selfFixSteps: [
          'Sube el volumen y desactiva el modo silencio o "No molestar".',
          'Verifica que la salida de audio seleccionada sea la correcta.',
          'Desconecta audífonos o dispositivos Bluetooth vinculados.',
          'Reinicia el equipo.',
        ],
      },
      {
        when: { audifonos: 'si' },
        problem: 'El audio funciona con dispositivos externos: la falla parece estar en la bocina interna.',
        recommendation: 'Se recomienda revisión técnica de la bocina.',
        priority: 'baja',
        requiresTechnician: true,
      },
      {
        default: true,
        problem: 'Posible falla en el sistema de audio o sus controladores.',
        recommendation: 'Se recomienda revisión técnica.',
        priority: 'baja',
        requiresTechnician: true,
      },
    ],
  },
]

export const RULES = [...phoneRules, ...laptopRules, ...desktopRules, ...sharedRules]
