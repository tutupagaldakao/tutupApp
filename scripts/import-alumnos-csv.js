const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const admin = require('firebase-admin');

const creds = require(process.env.HOME + '/tutupapp/keys/tutupapp-service.json');
admin.initializeApp({ credential: admin.credential.cert(creds), projectId: process.env.GOOGLE_CLOUD_PROJECT });
const db = admin.firestore();

const MAP = {
  'Nombre':'nombre',
  'Apellidos':'apellidos',
  'DNI':'dni',
  'Teléfono':'telefono',
  'Email':'email',
  'Fecha Alta':'fecha_alta',
  'Hueco Fijo (Día/Hora)':'hueco_fijo',
  'Individual':'individual',
  'Frecuencia':'frecuencia',
  'Grupal':'grupal',
  'Clases Recámara':'clases_recamara',
  'Recuperaciones Usadas':'recuperaciones_usadas',
  'Pagado':'pagado',
  'Método Pago':'metodo_pago',
  'Precio Mensual':'precio_mensual',
  'Historial Pagos':'historial_pagos',
  'Cancelaciones <24h':'cancelaciones_24h',
  'Faltas Justificadas':'faltas_justificadas',
  'Comentarios Profesor':'comentarios_profesor',
  'Alquiler Activo (Sí/No)':'alquiler_activo',
  'Fecha Alquiler':'fecha_alquiler',
  'Hora Alquiler':'hora_alquiler',
  'Duración (min)':'duracion_min',
  'Pago Alquiler':'pago_alquiler',
  'Extendido (Sí/No)':'extendido',
  'Notas Alquiler':'notas_alquiler',
  'Total Mensualidad (€)':'total_mensualidad',
  'Pagos Adelantados (Meses)':'pagos_adelantados_meses',
  'Debe (€)':'debe',
  'Última Actualización':'ultima_actualizacion',
  'Baja (Sí/No)':'baja'
};

const BOOL = new Set(['pagado','alquiler_activo','extendido','baja']);
const NUMB = new Set(['precio_mensual','duracion_min','total_mensualidad','pagos_adelantados_meses','debe','clases_recamara','recuperaciones_usadas','cancelaciones_24h','faltas_justificadas']);

function toBool(v){
  if (v == null) return null;
  const s = String(v).trim().toLowerCase();
  if (['sí','si','true','1','yes','y','s'].includes(s)) return true;
  if (['no','false','0','n'].includes(s)) return false;
  return null;
}
function toNum(v){
  if (v == null || String(v).trim() === '') return null;
  const x = Number(String(v).replace(',', '.'));
  return Number.isFinite(x) ? x : null;
}

function normalizeRow(row){
  const out = {};
  for (const [k, v] of Object.entries(row)){
    const key = MAP[k] || k;
    let val = v;
    if (BOOL.has(key)) val = toBool(v);
    else if (NUMB.has(key)) val = toNum(v);
    else if (typeof v === 'string') val = v.trim();
    out[key] = val;
  }
  // extra derivados
  out.nombre_completo = [out.nombre, out.apellidos].filter(Boolean).join(' ');
  return out;
}

function docIdFrom(o){
  if (o.dni) return o.dni.replace(/\s+/g,'').toUpperCase();
  if (o.email) return o.email.toLowerCase().replace(/[^a-z0-9]+/g,'_');
  if (o.nombre_completo) return o.nombre_completo.toLowerCase().replace(/[^a-z0-9]+/g,'_');
  return 'alumno_' + Math.random().toString(36).slice(2,10);
}

(async ()=>{
  try{
    const file = process.argv[2];
    if (!file) throw new Error('Uso: node scripts/import-alumnos-csv.js data/alumnos.csv');
    const csv = fs.readFileSync(path.resolve(file), 'utf8');

    const records = parse(csv, { columns: true, skip_empty_lines: true, trim: true });
    console.log(`📦 Filas CSV: ${records.length}`);
    if (!records.length){ console.log('Nada que importar.'); process.exit(0); }

    let ok = 0, fail = 0;
    const chunk = 400;
    for (let i=0; i<records.length; i+=chunk){
      const slice = records.slice(i, i+chunk);
      const batch = db.batch();
      for (const r of slice){
        try{
          const data = normalizeRow(r);
          const id = docIdFrom(data);
          const ref = db.collection('alumnos').doc(id);
          batch.set(ref, data, { merge: true });
        }catch(e){
          fail++;
          console.error('Fila con error:', e.message);
        }
      }
      await batch.commit();
      ok += slice.length;
      console.log(`✅ subido ${ok}/${records.length}`);
    }
    console.log(`\n🎯 Terminado. OK: ${ok}  FALLÓ: ${fail}`);
    process.exit(0);
  }catch(e){
    console.error('💥 Error:', e.message);
    process.exit(1);
  }
})();
