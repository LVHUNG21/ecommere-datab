const express = require('express');
const {
    createWarehouseStock,
    createWarehouseAllocation,
    createShippingZone,
    createWarehouseShippingZone,
    updateWarehouseStock,
    deleteWarehouseStock,
    getWarehouseStocks,
    addWarehouse
} = require('../controllers/warehouseController');

// const router = express.Router();

const warehouseRouter = (connection) => {
    const router = express.Router();

    router.post('/warehouse-stock', (req, res) => createWarehouseStock(connection,req, res));
    router.post('/add', (req, res) => addWarehouse(connection, req, res));
    router.post('/warehouse-allocation', (req, res) => createWarehouseAllocation(connection, req, res));
    router.post('/shipping-zone', (req, res) => createShippingZone(connection, req, res));
    router.post('/warehouse-shipping-zone', (req, res) => createWarehouseShippingZone(connection, req, res));
    router.put('/warehouse-stock', (req, res) => updateWarehouseStock(connection, req, res));
    router.delete('/warehouse-stock/:stockId', (req, res) => deleteWarehouseStock(connection, req, res));
    router.get('/warehouse-stocks', (req, res) => getWarehouseStocks(connection, req, res));
    return router;
};



module.exports = warehouseRouter;
