const mongoose=require('mongoose');
//define the person schema
//const bcrypt= require('bcrypt');

const candidateSchema=new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    party:{
        type:String,
        required:true
    },
    age:{
        type:String,
        reuired:true
    },
     bio: {
    type: String,
    default: ''
  },
  imageUrl: {
    type: String,
    default: '' // allow empty -> frontend will show placeholder
  },

    votes:[
        {
            user:{
                type:mongoose.Schema.Types.ObjectId,
                ref:'User',
                required:true
            },
            votedAt:{
                type:Date,
                default:Date.now()

            }
        }
    ],
    voteCount:{
        type:Number,
        Default:0

    }
      
   
})
const candidate=mongoose.model('candidate',candidateSchema);
module.exports=candidate;