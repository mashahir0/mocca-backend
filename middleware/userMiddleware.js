import User from "../models/userModel.js";

async function userExistance(req, res, next) {
    try {
        const user = await User.findOne({ email: req.body.email })
        if (user) {
            return res.json({
                message: "user alredy exist"
            })
        } else {
            next()
        }

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "server error", error })
    }

}


const userStatus = async (req,res,next)=>{
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (user.status === false) {
                 return res.status(403).json({ message: 'Your account is blocked. Please contact support.' });
            }else{
                 next()
            }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "server error", error })
    }
}



export {
    userExistance,
    userStatus
}