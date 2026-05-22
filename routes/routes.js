const express = require('express');
const controller = require('../controllers/controller');

const router = express.Router();

router.get('/health', controller.health);
router.get('/rooms', controller.getRooms);
router.post('/book', controller.bookRooms);
router.post(
  '/random-occupancy',
  controller.randomOccupancy
);
router.post('/reset', controller.resetRooms);
router.post(
  '/travel-matrix',
  controller.travelMatrix
);

module.exports = router;