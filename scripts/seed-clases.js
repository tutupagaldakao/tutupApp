const admin = require('firebase-admin');
const c = require(process.env.HOME+'/tutupapp/keys/tutupapp-service.json');
admin.initializeApp({ credential: admin.credential.cert(c), projectId: process.env.GOOGLE_CLOUD_PROJECT });
const db = admin.firestore();

(async () => {
  const now = new Date();
  const addDays = d => new Date(now.getTime() + d*86400000).toISOString();

  // Usa los DNI que ya tienes en Firestore:
  const clases = [
    { alumnoId:'34567213H', alumnoEmail:'ane.etxe@tutupa.com', fecha:addDays(1),  hora:'18:00', duracionMin:60, aula:'A1', profesor:'Tutu' },
    { alumnoId:'34567213H', alumnoEmail:'ane.etxe@tutupa.com', fecha:addDays(8),  hora:'18:00', duracionMin:60, aula:'A1', profesor:'Tutu' },
    { alumnoId:'50234122L', alumnoEmail:'gorkorreo@gmail.com', fecha:addDays(2),  hora:'17:30', duracionMin:60, aula:'A2', profesor:'Tutu' },
    { alumnoId:'50234122L', alumnoEmail:'gorkorreo@gmail.com', fecha:addDays(9),  hora:'17:30', duracionMin:60, aula:'A2', profesor:'Tutu' },
  ];
  const batch = db.batch();
  for (const c of clases) {
    const ref = db.collection('clases').doc();
    batch.set(ref, c);
  }
  await batch.commit();
  console.log('✅ Clases sembradas');
  process.exit(0);
})();
