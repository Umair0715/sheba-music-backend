const router = require('express').Router();
const { protect } = require('../middlewares/protect');
const walletController = require('../controllers/walletController');

router.route('/')
    .post(protect , walletController.createWallet)
    .get(protect , walletController.getMyWallet);
router.route('/:id')
    .delete(protect , walletController.deleteWallet)
    .get(protect , walletController.getSingleUserWallet);

router.post('/transfer/:transferToWalletId' , protect , walletController.transferToWallet )
router.get('/history/my' , protect , walletController.getMyWalletHistory);
router.post('/deposit' , protect , walletController.depositToWallet);

module.exports = router;