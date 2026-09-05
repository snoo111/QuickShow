import Booking from "../models/booking.js";
import Show from "../models/Show.js"
import stripe from 'stripe'
import jwt from "jsonwebtoken"

const getUserId = (req) => {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) return null
    const decoded = jwt.decode(token)
    return decoded?.sub
}

const checkSeatsAvailability = async(showId, selectedSeats) => {
    try{
        const showData = await Show.findById(showId)
        if(!showData) return false;
        const occupiedSeats = showData.occupiedSeats;
        const isAnySeatTaken = selectedSeats.some(seat => occupiedSeats[seat]);
        return !isAnySeatTaken;
    }catch (error){
        console.log(error.message);
        return false;
    }
}

export const createBooking = async (req, res)=>{
    try{
        const userId = getUserId(req)
        if(!userId) return res.json({success:false, message:"not authorized"})
        const {showId, selectedSeats} = req.body;
        const {origin} = req.headers;

        const isAvailable = await checkSeatsAvailability(showId, selectedSeats)
        if(!isAvailable){
            return res.json({success:false, message:"Selected Seats are not available."})
        }

        const showData = await Show.findById(showId).populate('movie');

        const booking = await Booking.create({
            user:userId,
            show:showId,
            amount:showData.showPrice * selectedSeats.length,
            bookedSeats: selectedSeats
        })

        selectedSeats.map((seat) => {
            showData.occupiedSeats[seat] = userId;
        })
        showData.markModified('occupiedSeats');
        await showData.save();

        const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY)

        const line_items = [{
            price_data:{
                currency:'usd',
                product_data:{
                    name:showData.movie.title,
                },
                unit_amount:Math.floor(booking.amount) * 100
            },
            quantity:1
        }]

        const session = await stripeInstance.checkout.sessions.create({
            success_url: `${origin}/loading/my-bookings`,
            cancel_url: `${origin}/my-bookings`,
            line_items: line_items,
            mode:'payment',
            metadata:{
                bookingId: booking._id.toString()  
            },
            expires_at:Math.floor(Date.now() / 1000) + 30 * 60,
        })

        booking.paymentLink = session.url;
        await booking.save()

        //Run Inngest Scheduler Function to check payment status after 10 minutes
        await inngest.send({
            name:"app/checkpayment",
            data:{
                bookingId:booking._id.toString()
            }
        })

        res.json({success:true, url:session.url})

    }catch (error) {
        console.log(error.message);
        res.json({success:false, message: error.message})
    }
}

export const getOccupiedSeats = async (req, res)=>{
    try{
        const {showId} = req.params;
        const showData = await Show.findById(showId)
        const occupiedSeats = Object.keys(showData.occupiedSeats)
        res.json({success:true, occupiedSeats})
    }catch(error){
        console.log(error.message);
        res.json({success:false, message:error.message})
    }
}

export const stripeWebhook = async (req, res) => {
    console.log("Webhook received!")
    const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY)
    const sig = req.headers['stripe-signature']
    let event

    try {
        event = stripeInstance.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        )
    } catch (err) {
        console.log(err.message)
        return res.status(400).json({ message: err.message })
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object
        const bookingId = session.metadata.bookingId
        await Booking.findByIdAndUpdate(bookingId, { isPaid: true })
    }

    res.json({ received: true })
}