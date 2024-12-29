const queryDatabase = (connection, sql, params) => {
    return new Promise((resolve, reject) => {
        connection.query(sql, params, (error, results) => {
            if (error) {
                return reject(error);
            }
            resolve(results);
        });
    });
};

const addWarehouse = async (connection, req, res) => {
    const { warehouseName, companyName, email, addressId } = req.body;

    const checkAddressIdQuery = `
        SELECT ua.user_id
        FROM user_address ua
        JOIN Seller s ON ua.user_id = s.User_id
        WHERE ua.address_id = ?`;

    const checkDuplicateWarehouseQuery = `
        SELECT id
        FROM warehouse
        WHERE name = ? AND company_name = ? AND email = ? AND address_id = ?`;

    const insertWarehouseQuery = `
        INSERT INTO warehouse (name, company_name, email, address_id)
        VALUES (?, ?, ?, ?)`;

    try {
        const contactResults = await queryDatabase(connection, checkAddressIdQuery, [addressId]);

        if (contactResults.length === 0) {
            return res.status(400).json({ error: 'Invalid addressId: Does not belong to a seller' });
        }

        const duplicateResults = await queryDatabase(connection, checkDuplicateWarehouseQuery, [warehouseName, companyName, email, addressId]);

        if (duplicateResults.length > 0) {
            return res.status(400).json({ error: 'Warehouse already exists' });
        }

        const result = await queryDatabase(connection, insertWarehouseQuery, [warehouseName, companyName, email, addressId]);
        res.status(201).json({message:'Create warehouse successfull', warehouseId: result.insertId });
    } catch (error) {
        console.error('Error executing query:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const createWarehouseStock = async (connection, req, res) => {

    const { quantity, variant_id, warehouseId } = req.body;

    const checkVariantSql = 'SELECT * FROM product_productvariant WHERE id = ?';
    const checkWarehouseSql = 'SELECT * FROM warehouse WHERE id = ?';
    const checkDuplicateSql = 'SELECT * FROM warehousestock WHERE product_variant_id = ? AND warehouse_id = ?';
    const insertSql = 'INSERT INTO warehousestock (quantity, product_variant_id, warehouse_id) VALUES (?, ?, ?)';
    const updateSql = 'UPDATE warehousestock SET quantity = quantity + ? WHERE product_variant_id = ? AND warehouse_id = ?';

    try {
        const variantResult = await queryDatabase(connection, checkVariantSql, [variant_id]);
        if (variantResult.length === 0) {
            res.status(400).json({ error: 'Invalid variant_id' });
            return;
        }

        const warehouseResult = await queryDatabase(connection, checkWarehouseSql, [warehouseId]);
        if (warehouseResult.length === 0) {
            res.status(400).json({ error: 'Invalid warehouse_id' });
            return;
        }

        const duplicateCheckResult = await queryDatabase(connection, checkDuplicateSql, [variant_id, warehouseId]);
        if (duplicateCheckResult.length > 0) {
            await queryDatabase(connection, updateSql, [quantity, variant_id, warehouseId]);
            res.status(200).json({ message: 'Stock quantity updated successfully' });
        } else {
            const result = await queryDatabase(connection, insertSql, [quantity, variant_id, warehouseId]);
            res.status(201).json({ message: 'Warehouse stock created successfully', stockId: result.insertId });
        }
    } catch (error) {
        console.error('Error creating or updating warehouse stock:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const createWarehouseAllocation = async (connection, req, res) => {
    const { quantity, allocated, orderItemId, stockId } = req.body;
    const sql = 'INSERT INTO warehouse_allocation (quantity, allocated, orderitem_id, stock_id) VALUES (?, ?, ?, ?)';
    try {
        const result = await queryDatabase(connection, sql, [quantity, allocated, orderItemId, stockId]);
        res.status(201).json({ allocationId: result.insertId });
    } catch (error) {
        console.error('Error creating warehouse allocation:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const createShippingZone = async (connection, req, res) => {
    const { zoneName } = req.body;
    const sql = 'INSERT INTO shipping_zone (zone_name) VALUES (?)';
    try {
        const result = await queryDatabase(connection, sql, [zoneName]);
        res.status(201).json({ zoneId: result.insertId });
    } catch (error) {
        console.error('Error creating shipping zone:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const createWarehouseShippingZone = async (connection, req, res) => {
    const { warehouseId, shippingZoneId } = req.body;
    const sql = 'INSERT INTO warehouse_shipping_zone (warehouse_id, shipping_zone_id) VALUES (?, ?)';
    try {
        const result = await queryDatabase(connection, sql, [warehouseId, shippingZoneId]);
        res.status(201).json({ warehouseShippingZoneId: result.insertId });
    } catch (error) {
        console.error('Error creating warehouse shipping zone:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const updateWarehouseStock = async (connection, req, res) => {
    const { stockId, quantity, variantId, warehouseId } = req.body;
    const sql = 'UPDATE warehousestock SET quantity = ?, product_variant_id = ?, warehouse_id = ? WHERE id = ?';
    try {
        await queryDatabase(connection, sql, [quantity, variantId, warehouseId, stockId]);
        res.status(200).json({ message: 'Stock updated successfully' });
    } catch (error) {
        console.error('Error updating warehouse stock:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const deleteWarehouseStock = async (connection, req, res) => {
    const { stockId } = req.params;
    const sql = 'DELETE FROM warehousestock WHERE id = ?';
    try {
        await queryDatabase(connection, sql, [stockId]);
        res.status(200).json({ message: 'Stock deleted successfully' });
    } catch (error) {
        console.error('Error deleting warehouse stock:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getWarehouseStocks = async (connection, req, res) => {
    const sql = 'SELECT * FROM warehousestock';
    try {
        const result = await queryDatabase(connection, sql);
        res.status(200).json(result);
    } catch (error) {
        console.error('Error getting warehouse stocks:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    createWarehouseStock,
    createWarehouseAllocation,
    createShippingZone,
    createWarehouseShippingZone,
    updateWarehouseStock,
    deleteWarehouseStock,
    getWarehouseStocks,
    addWarehouse
};
