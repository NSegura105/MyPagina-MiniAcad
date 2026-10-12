/* ==========================================================================
   MINIACAD - MINI QUIZ (js/quiz.js)
   Dibuja la evaluación a partir de los datos JSON de la página:
     <div id="quiz" data-quiz></div>
     <script type="application/json" id="quiz-datos"> ... </script>

   - Dice al instante si cada respuesta está bien o mal.
   - Al terminar, dice si el estudiante aprueba el curso.
   - Avisa con eventos (quiz:aprobado / quiz:repasar) al reproductor js/curso.js.
   - NO guarda nada (ni puntaje ni avance): la actividad no lo permite.
   - Accesible: <fieldset> + <legend> en cada pregunta y aria-live="polite".
   ========================================================================== */
(() => {
  'use strict';

  const raiz = document.getElementById('quiz');
  const fuente = document.getElementById('quiz-datos');
  if (!raiz || !fuente) return; // Esta página no tiene evaluación

  /* ---------- Datos ---------- */
  let config;
  try {
    config = JSON.parse(fuente.textContent);
  } catch (error) {
    raiz.textContent = 'No pudimos cargar la evaluación. Recarga la página para intentarlo otra vez.';
    return;
  }

  const preguntas = Array.isArray(config.preguntas) ? config.preguntas : [];
  const total = preguntas.length;
  if (total === 0) return;

  const aprobar = Number(config.aprueba) || Math.ceil(total * 0.8);

  const ELOGIOS = [
    '¡Correcto! Muy bien.',
    '¡Excelente! Esa es la respuesta.',
    '¡Genial! Lo hiciste bien.',
    '¡Perfecto! Sigue así.'
  ];

  /* ---------- Estado de este intento ---------- */
  let respondidas = 0;
  let aciertos = 0;
  let temporizador = null;
  let barra, estado, anuncio, resultado, tituloResultado, estrellas, puntaje, textoResultado;

  /* ---------- Utilidades ---------- */
  const crear = (etiqueta, clase, texto) => {
    const nodo = document.createElement(etiqueta);
    if (clase) nodo.className = clase;
    if (texto !== undefined) nodo.textContent = texto; // textContent: nunca inserta HTML
    return nodo;
  };

  // Cambia el orden de las opciones para que no siempre estén en el mismo lugar
  const mezclar = (lista) => {
    const copia = lista.slice();
    for (let i = copia.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
  };

  const limpiar = (nodo) => {
    while (nodo.firstChild) nodo.removeChild(nodo.firstChild);
  };

  const actualizarProgreso = () => {
    barra.value = respondidas;
    barra.textContent = `${respondidas} de ${total}`;
    estado.textContent = `${respondidas} de ${total} preguntas respondidas`;
  };

  /* ---------- Una pregunta ---------- */
  const crearPregunta = (datos, indice) => {
    const tarjeta = crear('article', 'pregunta');
    tarjeta.appendChild(crear('h3', 'pregunta-numero', `Pregunta ${indice + 1}`));

    if (datos.dibujo) {
      const dibujo = crear('p', 'pregunta-dibujo', datos.dibujo);
      dibujo.setAttribute('aria-hidden', 'true'); // Es decorativo: la pregunta ya lo dice con palabras
      tarjeta.appendChild(dibujo);
    }

    // <fieldset> + <legend>: el lector de pantalla anuncia la pregunta al entrar a las opciones
    const grupo = crear('fieldset', 'opciones-grupo');
    grupo.appendChild(crear('legend', 'pregunta-texto', datos.pregunta));

    const contenedor = crear('div', 'opciones');
    const opciones = mezclar(
      datos.opciones.map((texto, i) => ({ texto, correcta: i === datos.correcta }))
    );

    const feedback = crear('p', 'pregunta-feedback');
    feedback.setAttribute('aria-live', 'polite'); // Se anuncia si está bien o mal

    let respondida = false;

    const botones = opciones.map((opcion) => {
      const boton = crear('button', 'opcion', opcion.texto);
      boton.type = 'button';
      boton.addEventListener('click', () => {
        if (respondida) return; // Ya respondida: no se puede cambiar
        respondida = true;

        const acerto = opcion.correcta;
        tarjeta.classList.add(acerto ? 'pregunta-bien' : 'pregunta-mal');

        botones.forEach((otro, i) => {
          otro.classList.add('bloqueada');
          otro.setAttribute('aria-disabled', 'true');
          if (opciones[i].correcta) otro.classList.add('opcion-correcta'); // Siempre se ve cuál era la buena
        });
        if (!acerto) boton.classList.add('opcion-incorrecta');

        const textoCorrecta = opciones.find((o) => o.correcta).texto;
        const extra = datos.explicacion ? ` ${datos.explicacion}` : '';
        feedback.textContent = acerto
          ? `${ELOGIOS[indice % ELOGIOS.length]}${extra}`
          : `Casi. La respuesta correcta es ${textoCorrecta}.${extra}`;

        if (acerto) aciertos++;
        respondidas++;
        actualizarProgreso();

        if (respondidas === total) {
          // Pequeña pausa para que se lea el último mensaje antes del resultado
          temporizador = setTimeout(mostrarResultado, 900);
        }
      });
      contenedor.appendChild(boton);
      return boton;
    });

    grupo.appendChild(contenedor);
    tarjeta.appendChild(grupo);
    tarjeta.appendChild(feedback);
    return tarjeta;
  };

  /* ---------- Resultado final ---------- */
  const mostrarResultado = () => {
    const aprobado = aciertos >= aprobar;
    const porcentaje = Math.round((aciertos / total) * 100);

    resultado.dataset.estado = aprobado ? 'aprobado' : 'reprobado';
    tituloResultado.textContent = aprobado ? '¡Aprobaste la práctica! 🎉' : '¡Casi lo logras! 💪';
    textoResultado.textContent = aprobado
      ? (config.felicitacion || '¡Felicitaciones! Ya completaste este curso.')
      : `Necesitas ${aprobar} aciertos para aprobar. Repasa la lección y vuelve a intentarlo.`;
    estrellas.textContent = '⭐'.repeat(aciertos) + '☆'.repeat(total - aciertos);
    puntaje.textContent = `Obtuviste ${aciertos} de ${total} respuestas correctas (${porcentaje}%)`;

    resultado.hidden = false;
    // El lector de pantalla anuncia el resultado sin mover el foco del estudiante
    anuncio.textContent = `${aprobado ? 'Aprobaste la práctica.' : 'Todavía no apruebas.'} Acertaste ${aciertos} de ${total} preguntas.`;
    resultado.scrollIntoView({ block: 'center' });

    // Avisa al reproductor del curso (js/curso.js) para darle el chulito a la lección
    if (aprobado) {
      raiz.dispatchEvent(new CustomEvent('quiz:aprobado', { bubbles: true, detail: { aciertos, total } }));
    }
  };

  /* ---------- Construcción de toda la evaluación ---------- */
  const construir = () => {
    clearTimeout(temporizador);
    respondidas = 0;
    aciertos = 0;
    limpiar(raiz);

    // Progreso
    const progreso = crear('div', 'quiz-progreso');
    barra = crear('progress');
    barra.max = total;
    barra.value = 0;
    barra.setAttribute('aria-label', 'Progreso de la evaluación');
    barra.textContent = `0 de ${total}`;
    estado = crear('p', 'quiz-estado', `0 de ${total} preguntas respondidas`);
    estado.setAttribute('aria-live', 'polite');
    progreso.appendChild(barra);
    progreso.appendChild(estado);
    raiz.appendChild(progreso);

    // Preguntas
    const rejilla = crear('div', 'quiz-preguntas');
    preguntas.forEach((datos, i) => rejilla.appendChild(crearPregunta(datos, i)));
    raiz.appendChild(rejilla);

    // Zona oculta que anuncia el resultado al lector de pantalla
    anuncio = crear('p', 'solo-lectores');
    anuncio.setAttribute('aria-live', 'polite');
    raiz.appendChild(anuncio);

    // Resultado (oculto hasta terminar)
    resultado = crear('div', 'quiz-resultado');
    resultado.hidden = true;
    resultado.setAttribute('role', 'region');
    tituloResultado = crear('h3');
    tituloResultado.id = 'quiz-resultado-titulo';
    resultado.setAttribute('aria-labelledby', tituloResultado.id);
    estrellas = crear('p', 'quiz-estrellas');
    estrellas.setAttribute('aria-hidden', 'true');
    puntaje = crear('p', 'quiz-puntaje');
    textoResultado = crear('p');

    const acciones = crear('div', 'quiz-acciones');

    // "Repasar": si la página tiene un reproductor de curso, le avisa a js/curso.js
    // a qué lección volver. Ya NO hay botón para saltar a otro curso.
    if (config.repaso) {
      const repaso = crear('button', 'btn-principal solo-reprobado', config.repaso.texto);
      repaso.type = 'button';
      repaso.addEventListener('click', () => {
        raiz.dispatchEvent(new CustomEvent('quiz:repasar', { bubbles: true, detail: config.repaso }));
      });
      acciones.appendChild(repaso);
    }
    const reiniciarBoton = crear('button', 'btn-principal btn-azul', 'Intentar de nuevo');
    reiniciarBoton.type = 'button';
    reiniciarBoton.addEventListener('click', reiniciar);
    acciones.appendChild(reiniciarBoton);

    [tituloResultado, estrellas, puntaje, textoResultado, acciones].forEach((nodo) => resultado.appendChild(nodo));
    raiz.appendChild(resultado);
  };

  /* ---------- Intentar de nuevo ---------- */
  const reiniciar = () => {
    construir();
    const encabezado = document.getElementById(config.foco || 'titulo-quiz');
    if (encabezado) encabezado.focus(); // Vuelve al inicio de la evaluación
  };

  construir();
})();