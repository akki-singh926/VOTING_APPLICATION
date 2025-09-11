//require('dotenv').config();
require('dotenv').config();
const port=process.env.PORT||3000;
const express=require('express');
const app = express()
const db=require('./db');
app.use(express.json());
const bodyParser=require('body-parser');
const cors = require("cors");
app.use(cors());

//const{jwtAuthMiddleware}=require('./jwt');

const userRoutes=require('./Routes/userRoutes');
app.use('/user',userRoutes);
const candidateRoutes=require('./Routes/candidateRoutes');
app.use('/candidate',candidateRoutes);
const electionRoutes = require('./Routes/electionRoutes');
app.use('/election', electionRoutes);

app.listen(port,()=>{
    console.log("Listening on port 3000");
})
