const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");
const { v4: uuid } = require("uuid");

admin.initializeApp();
const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

function toISO(d){ return new Date(d).toISOString(); }
function genMonthSlots(ym){ const [y,m]=ym.split("-").map(Number);
  const start=new Date(Date.UTC(y,m-1,1,16,0,0)); const end=new Date(Date.UTC(y,m,0,20,0,0));
  const days=[1,2,3], out=[];
  for(let d=new Date(start); d<=end; d.setUTCDate(d.getUTCDate()+1)){
    const dow=((d.getUTCDay()+6)%7)+1; if(!days.includes(dow)) continue;
    for(let h=16; h<20; h++) for(let k of [0,30]){
      const s=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate(),h,k,0));
      const e=new Date(s); e.setUTCMinutes(e.getUTCMinutes()+30);
      out.push({startISO:toISO(s), endISO:toISO(e)});
    }
  } return out;
}

app.get("/availability", async (req,res)=>{
  try{
    const month=String(req.query.month||"").trim();
    if(!/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({error:"month=YYYY-MM"});
    const all=genMonthSlots(month);
    const qs=await db.collection("reservas")
      .where("startISO",">=", `${month}-01T00:00:00.000Z`)
      .where("startISO","<",  `${month}-31T23:59:59.999Z`).get();
    const busy=new Set(qs.docs.map(d=>d.data().startISO));
    const free=all.filter(s=>!busy.has(s.startISO)).map(s=>({...s,available:true}));
    res.json({slots:free});
  }catch(e){ res.status(500).json({error:e.message}); }
});

app.post("/book", async (req,res)=>{
  try{
    const {name, email, phone="", startISO}=req.body||{};
    if(!name||!email||!startISO) return res.status(400).json({error:"name,email,startISO required"});
    const taken=await db.collection("reservas").where("startISO","==",startISO).limit(1).get();
    if(!taken.empty) return res.status(409).json({error:"slot taken"});
    const endISO=new Date(new Date(startISO).getTime()+30*60000).toISOString();
    const signupToken=uuid();
    const doc={nombre:name,email,telefono:phone,startISO,endISO,status:"confirmada",
      signupToken, signupExpires: admin.firestore.Timestamp.fromDate(new Date(new Date(startISO).getTime()+90*60000)),
      emailMatriculaEnviado:false, createdAt: admin.firestore.FieldValue.serverTimestamp()};
    const ref=await db.collection("reservas").add(doc);
    res.json({ok:true,id:ref.id,signupToken});
  }catch(e){ res.status(500).json({error:e.message}); }
});

exports.api = onRequest({ region: "europe-west1" }, (req,res)=>app(req,res));

const { onSchedule } = require("firebase-functions/v2/scheduler");
exports.matriculaMailer = onSchedule("every 5 minutes", async () => {
  const now = admin.firestore.Timestamp.now();
  const q = await db.collection("reservas")
    .where("emailMatriculaEnviado","==",false)
    .where("startISO","<=", new Date(Date.now()-30*60000).toISOString())
    .limit(50).get();
  const origin = "https://studio-783157605-a2dcf.web.app";
  const batch = db.batch();
  for (const d of q.docs) {
    const r = d.data();
    const url = `${origin}/matricula?token=${r.signupToken}`;
    batch.set(db.collection("mail").doc(), {
      to: r.email,
      message: { subject: "Tu matrícula Tutupá", html: `Hola ${r.nombre}. Matricúlate aquí: <a href="${url}">${url}</a>` }
    });
    batch.update(d.ref, { emailMatriculaEnviado:true, emailMatriculaEnviadoAt: admin.firestore.FieldValue.serverTimestamp() });
  }
  if (!q.empty) await batch.commit();
});
