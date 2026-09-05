import express from 'express';
import { createBooking, getOccupiedSeats , stripeWebhook} from '../controllers/bookingController.js';

const bookingRouter = express.Router();

bookingRouter.post('/stripe-webhook', stripeWebhook)


bookingRouter.post('/create', createBooking);
bookingRouter.get('/seats/:showId', getOccupiedSeats);

export default bookingRouter;
