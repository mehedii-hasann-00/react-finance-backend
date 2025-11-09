import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json())

app.get('/',(req,res)=>{
    res.send('helo')
    console.log('home')
})

const PORT = process.env.PORT || 3000;
console.log("Will listen on PORT =", PORT);
app.listen(PORT, () => console.log(`Server running on ${PORT}`));

