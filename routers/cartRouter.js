const express = require('express');
const cartController = require('../controllers/cartController');
const {authenticateToken} = require('../middlewares/authenticateToken');
const {isBuyer} = require('../middlewares/isBuyer');

const cartRouter = (connection) => {
    const router = express.Router();

    router.post('/add-to-cart', authenticateToken, (req, res) => cartController.addToCart(connection)(req, res));
    router.put('/update-cart-item/:variantId', authenticateToken, isBuyer, (req, res) => cartController.updateCartItem(connection)(req, res));
    router.delete('/remove-from-cart/:productId', authenticateToken, isBuyer, (req, res) => cartController.removeFromCart(connection)(req, res));
    return router;
};

module.exports = cartRouter;

