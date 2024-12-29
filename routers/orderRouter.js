const express = require('express');
const orderController = require('../controllers/orderController');
const {authenticateToken} = require('../middlewares/authenticateToken');
const {isBuyer} = require('../middlewares/isBuyer');

const orderRouter = (connection) => {
    const router = express.Router();
    router.post('/checkout', authenticateToken, isBuyer, (req, res) => orderController.createOrder(connection)(req, res));
    router.post('/addShippingMethod', authenticateToken, (req, res) => orderController.addShippingMethod(connection)(req, res));
    router.post('/updateStatus', authenticateToken, (req, res) => orderController.changeOrderStatus(connection)(req, res));
    router.post('/addDiscount', authenticateToken, (req, res) => orderController.addDiscount(connection)(req, res));
    router.post('/checkout-item/:cartItemId', authenticateToken, isBuyer, (req, res) => orderController.createOrderFromCartItem(connection)(req, res));
    router.post('/confirm-payment/', authenticateToken, isBuyer, (req, res) => orderController.confirmPayment(connection)(req, res));
    router.get('/:id', authenticateToken, (req, res) => orderController.getOrder(connection)(req, res));
    router.post('/mock-payment-gateway', (req, res) => orderController.mockPaymentGateway(req, res));
    router.get('/revenue/:id', authenticateToken, (req, res) => orderController.getRevenue(connection)(req, res));
    router.get('/revenue-by-time/:SellerId', authenticateToken,(req, res) => orderController.getRevenueByTime(connection)(req, res));
    router.get('/revenueMonthly/:id', authenticateToken,(req, res) => orderController.getMonthlyRevenue(connection)(req, res));
    return router;
};

module.exports = orderRouter;
