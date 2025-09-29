// seed_matricula.js
const { Firestore, FieldValue } = require('@google-cloud/firestore');
const db = new Firestore(); // usa GOOGLE_APPLICATION_CREDENTIALS

// Helpers
const iso = (s) => (s ? new Date(s).toISOString() : null);
const money = (v) => (v === '' || v == null ? 0 : Number(String(v).replace(',', '.')));
const yesno = (v) => ['sí','si','yes','true','1'].includes(String(v||'').toLowerCase());

/** filas de ejemplo basadas en tu tabla */
const rows = [
  {
    Nombre:'Ane', Apellidos:'Etxeberria', DNI:'34567213H', Teléfono:'634112233', Email:'ane.etxe@tutupa.com',
    'Fecha Alta':'2025-06-03', 'Hueco Fijo (Día/Hora)':'Lunes 18:00',
    Grupal:'Martes 21:00', 'Pagado':'2025-10', 'Método Pago':'Bizum', 'Precio Mensual':'80',
    'Historial Pagos':'2025-08:89; 2025-09:89',
    'Cancelaciones <24h':'0', 'Faltas Justificadas':'1', 'Comentarios Profesor':'Buen avance en rudimentos',
    'Alquiler Activo (Sí/No)':'No', 'Total Mensualidad (€)':'', 'Pagos Adelantados (Meses)':'', 'Debe (€)':'',
    'Última Actualización':'2025-09-22', 'Baja (Sí/No)':'No'
  },
  {
    Nombre:'Gorka', Apellidos:'Leguina', DNI:'50234122L', Teléfono:'678445512', Email:'gorkorreo@gmail.com',
    'Fecha Alta':'2025-02-15', 'Hueco Fijo (Día/Hora)':'Martes 17:30', Individual:'60 mins', Frecuencia:'Cada Semana',
    Grupal:'Martes 21:00', 'Clases Recámara':'2', 'Recuperaciones Usadas':'1', 'Pagado':'2025-09',
    'Método Pago':'Bizum','Precio Mensual':'260','Historial Pagos':'2025-07:65; 2025-08:65; 2025-09:65',
    'Cancelaciones <24h':'1','Faltas Justificadas':'0','Comentarios Profesor':'Necesita metrónomo',
    'Alquiler Activo (Sí/No)':'Sí','Fecha Alquiler':'2025-09-27','Hora Alquiler':'19:00','Duración (min)':'60','Pago Alquiler':'10',
    'Extendido (Sí/No)':'No','Notas Alquiler':'Repertorio básico','Total Mensualidad (€)':'','Pagos Adelantados (Meses)':'',
    'Debe (€)':'0','Última Actualización':'2025-09-22','Baja (Sí/No)':'No'
  },
  {
    Nombre:'Maialen', Apellidos:'Ruiz', DNI:'78123456P', Teléfono:'722334455', Email:'maialen.ruiz@tutupa.com',
    'Fecha Alta':'2024-11-10','Hueco Fijo (Día/Hora)':'Miércoles 20:00', Individual:'60 mins', Frecuencia:'Cada Dos Semanas',
    'Pagado':'2025-08','Método Pago':'Efectivo','Precio Mensual':'170','Historial Pagos':'2025-07:120; 2025-08:120',
    'Cancelaciones <24h':'0','Faltas Justificadas':'0','Comentarios Profesor':'Mejorar independencia pies',
    'Alquiler Activo (Sí/No)':'No','Duración (min)':'0','Pago Alquiler':'120',
    'Última Actualización':'2025-09-22','Baja (Sí/No)':'No'
  },
  {
    Nombre:'Jon', Apellidos:'Mendizabal', DNI:'45678123K', Teléfono:'611223344', Email:'jon.mendi@tutupa.com',
    'Fecha Alta':'2025-01-20','Hueco Fijo (Día/Hora)':'Lunes 17:00', Individual:'30 mins', Frecuencia:'Cada Semana',
    Grupal:'Miercoles 21:00','Clases Recámara':'1','Recuperaciones Usadas':'0','Pagado':'2025-10',
    'Método Pago':'Efectivo','Precio Mensual':'170','Historial Pagos':'2025-06:75; 2025-07:75; 2025-08:75; 2025-09:75',
    'Cancelaciones <24h':'0','Faltas Justificadas':'2','Comentarios Profesor':'Técnica de doble bombo',
    'Alquiler Activo (Sí/No)':'No','Última Actualización':'2025-09-22','Baja (Sí/No)':'No'
  },
  {
    Nombre:'Leire', Apellidos:'Alonso', DNI:'98765432M', Teléfono:'699887766', Email:'leire.alonso@tutupa.com',
    'Fecha Alta':'2025-03-05','Hueco Fijo (Día/Hora)':'Miércoles 16:30',
    Grupal:'Martes 21:00','Pagado':'2025-09','Método Pago':'Efectivo','Precio Mensual':'80',
    'Historial Pagos':'2025-05:55; 2025-06:55; 2025-07:55; 2025-08:55; 2025-09:55',
    'Cancelaciones <24h':'2','Faltas Justificadas':'1','Comentarios Profesor':'Muy buena coordinación',
    'Alquiler Activo (Sí/No)':'Sí','Fecha Alquiler':'2025-10-01','Hora Alquiler':'18:00','Duración (min)':'90',
    'Pago Alquiler':'15','Extendido (Sí/No)':'Sí','Notas Alquiler':'Sesión extendida',
    'Total Mensualidad (€)':'1','Debe (€)':'0','Última Actualización':'2025-09-22','Baja (Sí/No)':'No'
  },
];

function parseHistorial(str) {
  if (!str) return [];
  return String(str).split(';').map(s => s.trim()).filter(Boolean).map(pair => {
    const [mes, imp] = pair.split(':').map(t => t.trim());
    return { mes, importe: money(imp) };
  });
}

async function seed() {
  const batch = db.batch();
  const now = FieldValue.serverTimestamp();

  for (const r of rows) {
    const uid = (r.DNI || r.Email).replace(/\W+/g,'-').toLowerCase();

    // alumnos
    const alumnoRef = db.collection('alumnos').doc(uid);
    batch.set(alumnoRef, {
      uid,
      displayName: `${r.Nombre} ${r.Apellidos}`.trim(),
      nombre: r.Nombre, apellidos: r.Apellidos,
      dni: r.DNI, phone: r.Teléfono, email: r.Email,
      fechaAlta: iso(r['Fecha Alta']),
      huecoFijo: r['Hueco Fijo (Día/Hora)'] || null,
      individual: r.Individual || null,
      frecuencia: r.Frecuencia || null,
      grupal: r.Grupal || null,
      baja: yesno(r['Baja (Sí/No)']),
      updatedAt: iso(r['Última Actualización']) || now,
      createdAt: now,
    }, { merge: true });

    // membresía del mes marcado en "Pagado" y precio mensual
    if (r['Pagado'] || r['Precio Mensual']) {
      const membId = `${uid}-${r['Pagado'] || 'N/A'}`;
      const membRef = db.collection('membresias').doc(membId);
      batch.set(membRef, {
        id: membId,
        alumnoUid: uid,
        mes: r['Pagado'] || null,
        precioMensual: money(r['Precio Mensual']),
        metodoPago: r['Método Pago'] || null,
        totalMensualidad: money(r['Total Mensualidad (€)']),
        pagosAdelantadosMeses: Number(r['Pagos Adelantados (Meses)'] || 0),
        debe: money(r['Debe (€)']),
        createdAt: now, updatedAt: now,
      }, { merge: true });
    }

    // pagos (historial)
    for (const p of parseHistorial(r['Historial Pagos'])) {
      const pid = `${uid}-${p.mes}`.replace(/\W+/g,'-');
      const pagoRef = db.collection('pagos').doc(pid);
      batch.set(pagoRef, {
        id: pid, alumnoUid: uid, mes: p.mes,
        importe: p.importe, metodo: r['Método Pago'] || null,
        createdAt: now,
      }, { merge: true });
    }

    // contadores y comentarios como eventos
    const eventos = [];
    const canc = Number(r['Cancelaciones <24h'] || 0);
    if (canc > 0) eventos.push({ tipo:'cancelaciones<24h', cantidad:canc });
    const faltas = Number(r['Faltas Justificadas'] || 0);
    if (faltas > 0) eventos.push({ tipo:'faltas_justificadas', cantidad:faltas });
    if (r['Comentarios Profesor']) eventos.push({ tipo:'comentario', texto:r['Comentarios Profesor'] });

    for (const [i, ev] of eventos.entries()) {
      const eid = `${uid}-ev-${i}-${Date.now()}`;
      batch.set(db.collection('eventos').doc(eid), {
        id: eid, alumnoUid: uid, ...ev, createdAt: now,
      });
    }

    // alquiler (si aplica)
    if (yesno(r['Alquiler Activo (Sí/No)'])) {
      const fecha = r['Fecha Alquiler'] ? `${r['Fecha Alquiler']} ${r['Hora Alquiler'] || '00:00'}` : null;
      const aid = `${uid}-alq-${Date.now()}`;
      batch.set(db.collection('alquileres').doc(aid), {
        id: aid, alumnoUid: uid,
        fechaHora: fecha ? iso(fecha) : null,
        duracionMin: Number(r['Duración (min)'] || 0),
        pago: money(r['Pago Alquiler']),
        extendido: yesno(r['Extendido (Sí/No)']),
        notas: r['Notas Alquiler'] || null,
        createdAt: now,
      });
    }

    // métricas de clases (si vienen)
    if (r['Clases Recámara'] || r['Recuperaciones Usadas']) {
      const mid = `${uid}-metricas-${Date.now()}`;
      batch.set(db.collection('clases_metricas').doc(mid), {
        id: mid, alumnoUid: uid,
        recamara: Number(r['Clases Recámara'] || 0),
        recuperacionesUsadas: Number(r['Recuperaciones Usadas'] || 0),
        updatedAt: now,
      });
    }
  }

  await batch.commit();
  console.log('✅ Siembra completada');
}

seed().catch(err => { console.error(err); process.exit(1); });
