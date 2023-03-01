const router = require('express').Router();
const { protect } = require('../middlewares/protect');
const ticketController = require('../controllers/ticketController');

router.route("/")
    .post(protect , ticketController.createTicket)
    .get(ticketController.getTickets);
    
router.get('/my' , protect , ticketController.getMyTickets);

router.route('/:id')
    .put(protect , ticketController.updateTicket)
    .delete(protect , ticketController.deleteTicket)
    .get(ticketController.getSingleTicket);

router.get('/user-tickets/:userId' , ticketController.getSingleUserTickets);

module.exports = router;