const express = require('express');
const productController = require('../controllers/productController');
const authController = require('../controllers/authController');
const {authenticateToken,getUserTypeById} = require('../middlewares/authenticateToken');
const {isSeller} = require('../middlewares/isSeller');
const {isAdmin} = require('../middlewares/isAdmin');


const productRouter = (connection) => {
    const router = express.Router();

    
    router.post('/addProduct', authenticateToken, isSeller, (req, res) => productController.addProduct(connection)(req, res));
    router.post('/addDiscountSale', authenticateToken, isSeller, (req, res) => productController.addDiscountSale(connection)(req, res));
    router.post('/addProductToDiscountSale', authenticateToken, isSeller, (req, res) => productController.addProductToDiscountSale(connection)(req, res));
   
    router.post('/deleteProduct', authenticateToken, (req, res) => productController.deleteProduct(connection)(req, res));
    router.post('/updateProduct', authenticateToken, (req, res) => productController.updateProduct(connection)(req, res));
    router.post('/addReview', authenticateToken, (req, res) => productController.addReview(connection)(req, res));
    router.post('/addToWishlist',(req, res) => productController.addToWishlist(connection)(req, res));
    router.post('/addDailyDeal',(req, res) => productController.addDailyDeal(connection)(req, res));
    router.post('/addProductToDailyDeal',(req, res) => productController.addProductDailyDeal(connection)(req, res));
    router.post('/returnProduct', (req, res) => productController.returnProduct(connection)(req, res));
    router.get('/search', productController.searchProduct(connection));
    router.get('/getProductByCategory', productController.getProduct(connection));
    router.get('/getVariant', productController.getVariant(connection));
    router.get('/getAllProduct', productController.getAllProducts(connection));
    router.post('/addProductAttribute', authenticateToken, isSeller, (req, res) => productController.addProductAttribute(connection, req, res));
    router.post('/addProductAttributeValue', authenticateToken, isSeller, (req, res) => productController.addProductAttributeValue(connection, req, res));
    router.post('/addProductType', authenticateToken, isSeller, (req, res) => productController.addProductType(connection, req, res));
    router.post('/addProductAttributeVariant', authenticateToken, isSeller, (req, res) => productController.addProductAttributeVariant(connection, req, res));
    router.post('/addProductAttributeProduct', authenticateToken, isSeller, (req, res) => productController.addProductAttributeProduct(connection, req, res));
    router.post('/assignProductAttributeToProduct', authenticateToken, isSeller, (req, res) => productController.assignProductAttributeToProduct(connection, req, res));
    router.post('/assignVariantAttributeToVariant', authenticateToken, isSeller, (req, res) => productController.assignVariantAttributeToVariant(connection, req, res));
    router.post('/addAssignedProductAttributeValue', authenticateToken, isSeller, (req, res) => productController.addAssignedProductAttributeValue(connection, req, res));
    router.post('/addAssignedVariantAttributeValue', authenticateToken, isSeller, (req, res) => productController.addAssignedVariantAttributeValue(connection, req, res)); 
    router.get('/fullInfoProduct/:id', (req, res) => productController.getFullInfoProduct(connection)(req, res));
    
    const getUserTypeMiddleware = async (req, res, next) => {
    try {
        const userType = await authController.getUserTypeById(req.user.id); 
        console.log(userType)
        if (userType) {
            req.user.userType = userType;
            next();
        } else {
            res.status(403).json({ message: 'Access denied' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
    router.post('/addVoucher', authenticateToken,getUserTypeMiddleware, (req, res, next) => {
        console.log(req.user)
        if (req.user.userType === 'seller') {
            isSeller(req, res, next);
        } else if (req.user.userType === 'admin') {
            isAdmin(req, res, next);
        } else {
            res.status(403).json({ message: 'Access denied' });
        }
    }, (req, res) => productController.addVoucher(connection)(req, res));
    

    return router;
};

module.exports = productRouter;
