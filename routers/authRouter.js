const express = require('express');
const authController = require('../controllers/authController');
const {authenticateToken} = require('../middlewares/authenticateToken');

const authRouter = (connection) => {
    const router = express.Router(); 
    router.post('/register', (req, res) => authController.register(connection)(req, res));
    router.post('/forgot', (req, res) => authController.forgotPassword(connection)(req, res));
    router.post('/login', (req, res) => authController.login(connection)(req, res));
    router.post('/Resetpassword', (req, res) => authController.resetPassword(connection)(req, res));
    router.put('/changeToSeller', authenticateToken, (req, res) => authController.changeToSeller(connection,req, res));
    router.post('/admin/add-user', authController.addUser(connection));
    router.put('/admin/update-role',authenticateToken, authController.updateUserRole(connection));
    router.delete('/admin/delete-user',authenticateToken,authController.deleteUser(connection));
    return router;
};

module.exports = authRouter;

