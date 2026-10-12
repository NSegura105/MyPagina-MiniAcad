/* ==========================================================================
   MINIACAD - REPRODUCTOR DE CURSO (js/curso.js)
   Hace que un curso funcione como en una plataforma de verdad:
     - El contenido está dividido en LECCIONES (se ven en "Mi ruta", a la izquierda).
     - Dentro de cada lección el contenido sale POR PARTES: hay que pulsar
       "Continuar" para ver la siguiente (no basta con bajar la página).
     - Una lección se completa al llegar al final (o al aprobar la práctica)
       y recibe su chulito ✓. La siguiente lección se desbloquea.
     - El curso se completa cuando TODAS las lecciones tienen chulito.
   - NO guarda nada (ni cookies, ni localStorage): el avance vive solo en
     esta visita, como pide la actividad.
   - Accesible: botones reales, aria-current, aria-live, foco que se mueve
     al contenido nuevo y funciona todo con el teclado.
   Sin JavaScript: la página muestra todo el contenido en orden (mejora progresiva).
   ========================================================================== */
(() => {
  'use strict';

  const player = document.querySelector('[data-player]');
  if (!player) return;
  player.classList.add('js-activo'); // A partir de aquí CSS sabe que hay JavaScript

  /* ---------- Elementos ---------- */
  const pasos = Array.from(player.querySelectorAll('.paso'));
  const items = Array.from(player.querySelectorAll('.ruta-item[data-paso]'));
  const itemFinal = player.querySelector('.ruta-item[data-final]');
  const final = player.querySelector('.curso-completo');
  const barra = player.querySelector('.ruta-progreso progress');
  const textoProgreso = player.querySelector('.ruta-progreso-texto');
  const anuncio = player.querySelector('.player-anuncio');
  const toggle = player.querySelector('.ruta-toggle');
  const lista = player.querySelector('.ruta-lista');
  const insignia = player.querySelector('.ruta-insignia');

  const total = pasos.length;
  if (total === 0) return;

  /* ---------- Estado (solo en memoria) ---------- */
  const estado = pasos.map((paso) => ({
    completo: false,
    visibles: 1, // cuántas partes de la lección ya se ven
    bloques: Array.from(paso.querySelectorAll(':scope > .bloque')),
    quiz: paso.querySelector('[data-quiz]') !== null,
    control: null,
    boton: null,
    ayuda: null
  }));
  let actual = 0;
  let enFinal = false;

  /* ---------- Utilidades ---------- */
  const crear = (etiqueta, clase, texto) => {
    const nodo = document.createElement(etiqueta);
    if (clase) nodo.className = clase;
    if (texto !== undefined) nodo.textContent = texto;
    return nodo;
  };

  const bloqueada = (i) => i > 0 && !estado[i - 1].completo;
  const completas = () => estado.filter((e) => e.completo).length;
  const todasCompletas = () => completas() === total;

  const enfocar = (nodo) => {
    if (!nodo) return;
    if (!nodo.hasAttribute('tabindex')) nodo.setAttribute('tabindex', '-1');
    nodo.focus();
  };

  /* ---------- Barra de control de cada lección ---------- */
  estado.forEach((e, i) => {
    e.control = crear('div', 'paso-control');
    e.ayuda = crear('p', 'paso-ayuda');
    e.boton = crear('button', 'btn-principal btn-continuar');
    e.boton.type = 'button';
    e.boton.addEventListener('click', () => accion(i));
    e.control.appendChild(e.ayuda);
    e.control.appendChild(e.boton);
    pasos[i].appendChild(e.control);
  });

  /* ---------- Qué hace el botón grande de cada lección ---------- */
  const accion = (i) => {
    const e = estado[i];

    if (e.visibles < e.bloques.length && !e.completo) {
      // Mostrar la siguiente parte
      e.visibles++;
      pintar();
      const nuevo = e.bloques[e.visibles - 1];
      enfocar(nuevo.querySelector('h3') || nuevo);
      return;
    }

    if (!e.completo) {
      completar(i); // Última parte de una lección sin práctica
    }

    if (i < total - 1) {
      irA(i + 1);
    } else {
      mostrarFinal();
    }
  };

  const completar = (i) => {
    if (estado[i].completo) return;
    estado[i].completo = true;
    anuncio.textContent = `Lección ${i + 1} completada. Tienes ${completas()} de ${total} lecciones con chulito.`;
    pintar();
  };

  /* ---------- Navegación ---------- */
  const irA = (i, conFoco = true) => {
    if (i < 0 || i >= total || bloqueada(i)) return;
    actual = i;
    enFinal = false;
    pintar();
    cerrarRuta();
    if (conFoco) enfocar(pasos[i].querySelector('h2'));
  };

  const mostrarFinal = () => {
    if (!todasCompletas()) return;
    enFinal = true;
    pintar();
    cerrarRuta();
    anuncio.textContent = '¡Felicitaciones! Completaste todo el curso.';
    if (final) enfocar(final.querySelector('h2'));
  };

  /* ---------- Dibujar el estado en la pantalla ---------- */
  const pintar = () => {
    // Lecciones
    pasos.forEach((paso, i) => {
      const e = estado[i];
      const visible = !enFinal && i === actual;
      paso.hidden = !visible;
      e.bloques.forEach((bloque, k) => {
        bloque.hidden = !(e.completo || k < e.visibles);
      });

      // Texto y botón de la parte de abajo
      const quedan = !e.completo && e.visibles < e.bloques.length;
      const esperaPractica = !e.completo && e.quiz && e.visibles === e.bloques.length;
      e.boton.hidden = esperaPractica;
      e.ayuda.hidden = !esperaPractica;
      e.ayuda.textContent = esperaPractica
        ? 'Responde la práctica y aprueba para ganar el chulito de esta lección.'
        : '';

      if (quedan) {
        const siguiente = e.bloques[e.visibles];
        e.boton.textContent = `Continuar: ${siguiente.dataset.titulo || 'siguiente parte'}`;
      } else if (!e.completo) {
        e.boton.textContent = 'Terminar lección ✓';
      } else if (i < total - 1) {
        e.boton.textContent = 'Ir a la siguiente lección →';
      } else {
        e.boton.textContent = 'Terminar el curso 🎉';
      }
    });

    // Mi ruta (menú lateral)
    items.forEach((item, i) => {
      let tipo = 'pendiente';
      if (estado[i].completo) tipo = 'completo';
      if (bloqueada(i)) tipo = 'bloqueado';
      if (!enFinal && i === actual) tipo = estado[i].completo ? 'actual-completo' : 'actual';

      item.dataset.estado = tipo;
      item.setAttribute('aria-disabled', tipo === 'bloqueado' ? 'true' : 'false');
      if (!enFinal && i === actual) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');

      const etiqueta = item.querySelector('.ruta-estado');
      if (etiqueta) {
        etiqueta.textContent = {
          completo: 'Completada',
          'actual-completo': 'Completada',
          actual: 'Estás aquí',
          pendiente: 'Disponible',
          bloqueado: 'Bloqueada'
        }[tipo];
      }
    });

    if (itemFinal) {
      const lista = todasCompletas();
      itemFinal.dataset.estado = enFinal ? 'actual-completo' : (lista ? 'pendiente' : 'bloqueado');
      itemFinal.setAttribute('aria-disabled', lista ? 'false' : 'true');
      if (enFinal) itemFinal.setAttribute('aria-current', 'step');
      else itemFinal.removeAttribute('aria-current');
      const etiqueta = itemFinal.querySelector('.ruta-estado');
      if (etiqueta) etiqueta.textContent = enFinal ? 'Completo' : (lista ? 'Disponible' : 'Bloqueada');
    }

    if (final) final.hidden = !enFinal;

    // Progreso
    const hechas = completas();
    if (barra) {
      barra.max = total;
      barra.value = hechas;
      barra.textContent = `${hechas} de ${total}`;
    }
    if (textoProgreso) {
      textoProgreso.textContent = `${hechas} de ${total} lecciones completadas`;
    }
    if (insignia) {
      insignia.dataset.completo = todasCompletas() ? 'si' : 'no';
      insignia.textContent = todasCompletas() ? 'Curso completado' : 'Curso en progreso';
    }
    if (toggle) {
      toggle.querySelector('.ruta-toggle-texto').textContent =
        `Mi ruta · ${hechas} de ${total} completadas`;
    }
  };

  /* ---------- Menú lateral: clic en una lección ---------- */
  items.forEach((item, i) => {
    item.addEventListener('click', () => {
      if (item.getAttribute('aria-disabled') === 'true') {
        anuncio.textContent = 'Esta lección está bloqueada. Completa la lección anterior primero.';
        return;
      }
      irA(i);
    });
  });

  if (itemFinal) {
    itemFinal.addEventListener('click', () => {
      if (itemFinal.getAttribute('aria-disabled') === 'true') {
        anuncio.textContent = 'El final del curso está bloqueado. Completa todas las lecciones primero.';
        return;
      }
      mostrarFinal();
    });
  }

  /* ---------- Menú lateral en celulares (se abre y se cierra) ---------- */
  const cerrarRuta = () => {
    if (!toggle || !lista) return;
    toggle.setAttribute('aria-expanded', 'false');
    lista.dataset.abierta = 'false';
  };

  if (toggle && lista) {
    cerrarRuta();
    toggle.addEventListener('click', () => {
      const abrir = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(abrir));
      lista.dataset.abierta = String(abrir);
    });
  }

  /* ---------- Eventos que manda js/quiz.js ---------- */
  // La práctica se aprobó: la lección gana su chulito (sin cambiar de pantalla,
  // para que el niño pueda leer su resultado).
  player.addEventListener('quiz:aprobado', (evento) => {
    const paso = evento.target.closest('.paso');
    const i = pasos.indexOf(paso);
    if (i >= 0) completar(i);
  });

  // "Repasar": vuelve a la lección que indique la práctica
  player.addEventListener('quiz:repasar', (evento) => {
    const destino = Number(evento.detail && evento.detail.paso);
    irA(Number.isInteger(destino) ? destino : 0);
  });

  /* ---------- Inicio ---------- */
  pintar();
})();
