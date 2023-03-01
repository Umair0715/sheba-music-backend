const router = require('express').Router();
const { protect } = require('../middlewares/protect');
const reportController = require('../controllers/reportController');


router.route('/')
    .post(protect , reportController.createReport)
    .get(protect , reportController.getReports)

router.route('/:reportId')
    .put(protect , reportController.updateReport)
    .delete(protect , reportController.deleteReport)

router.get('/user-report/:userId' , protect , reportController.getSingleUserReports);
router.get('/my' , protect , reportController.getMyReports);


module.exports = router;