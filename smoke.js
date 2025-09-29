const { Firestore } = require('@google-cloud/firestore');
const keyfile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const proj = process.env.GOOGLE_CLOUD_PROJECT || require(keyfile).project_id;

const db = new Firestore({
  projectId: proj,
  keyFilename: keyfile,
});

(async () => {
  try {
    await db.collection('users').doc('smoke4')
      .set({ ok: true, at: new Date().toISOString() });
    console.log('✅ Firestore OK');
    process.exit(0);
  } catch (e) {
    console.error('❌', e.code, e.message);
    process.exit(1);
  }
})();
