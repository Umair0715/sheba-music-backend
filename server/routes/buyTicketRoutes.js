const router = require('express').Router();
const { protect } = require('../middlewares/protect');
const buyTicketController = require('../controllers/buyTicketController');

router.route('/')
    .post(protect , buyTicketController.buyTicket);

router.get('/my' , protect , buyTicketController.getMyBuyTickets)

module.exports = router;