const jwt=require('jsonwebtoken');
const jwtAuthMiddleware=(req,res,next)=>{
//first check the request header has authorisation or not

const authorization=req.headers.authorization
if(!authorization)return res.status(401).json({error:"unauthorized"})


    //extract jwt token from request header
const token=req.headers.authorization.split(' ')[1];
if(!token) return res.status(401).json({error:"unauthorized"});

try{
    //verify the jwt token

    const decoded=jwt.verify(token,process.env.JWT_SECRET);
    req.user=decoded;
    next();


}
catch(err){
    console.log(err);
    res.status(401).json({error:"Invalid token"});
}

}
const generateToken=(userData)=>{
    return jwt.sign(userData,process.env.JWT_SECRET);
}


module.exports={jwtAuthMiddleware,generateToken}