import express from "express";
const app = express();
app.get("/", (_req,res)=>res.send("tutupApp OK 🚀"));
app.listen(process.env.PORT||8080, ()=>console.log("up"));
