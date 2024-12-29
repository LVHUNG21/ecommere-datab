const axios = require('axios'); 
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
    const query = (sql, params) => {
    return new Promise((resolve, reject) => {
        connection.query(sql, params, (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
};
const mockPaymentGateway = (req, res) => {
    const { paymentDetails, amount } = req.body;

    const paymentSuccessful = amount > 0;

    if (paymentSuccessful) {
        const mockTransactionId = 'mock_transaction_id_' + Math.floor(Math.random() * 10);
        res.status(200).json({ message: 'Payment successful', transactionId: mockTransactionId });
    } else {
        res.status(400).json({ message: 'Payment failed' });
    }
};

  const getFinalPrice = (productId) => {
        return new Promise((resolve, reject) => {
        
            const callProcedureQuery = 'CALL GetFinalPrice(?, @final_price)';
            connection.query(callProcedureQuery, [productId], (error) => {
                if (error) {
                    return reject(error);
                } 
                const selectResultQuery = 'SELECT @final_price AS final_price';
                connection.query(selectResultQuery, (selectError, results) => {
                    if (selectError) {
                        return reject(selectError);
                    }
                    const finalPrice = results[0].final_price;
                    resolve(finalPrice);
                    console.log('test24',finalPrice);
                });
            });
        });
    };
   const getBuyerId = (userId) => {
    console.log(userId);
        return new Promise((resolve, reject) => {
            const getBuyerIdQuery = 'SELECT buyer_id FROM Buyer WHERE user_id = ?';
            connection.query(getBuyerIdQuery, [userId], (error, results) => {
                if (error) {
                    reject(error);
                } else if (results.length === 0) {
                    reject('Buyer not found for the user');
                } else {
                    resolve(results[0].buyer_id);
                }
            });
        });
    };
    const getCountryFromShippingZone = (shippingZoneId) => {
        return new Promise((resolve, reject) => {
            const query = 'SELECT country FROM shippingzone WHERE id = ?';
            connection.query(query, [shippingZoneId], (error, results) => {
                if (error) {
                    console.error('Error in getCountryFromShippingZone:', error);
                    return reject(error);
                }
    
                if (results.length > 0) {
                    resolve(results[0].country);
                } else {
                    resolve(null);
                }
            });
        });
    };
    

    const getCartItems = (buyerId) => {
        return new Promise((resolve, reject) => {
            const getCartItemsQuery = 'SELECT * FROM CartItem WHERE cart_id IN (SELECT cart_id FROM ShoppingCart WHERE buyer_id = ?)';
            connection.query(getCartItemsQuery, [buyerId], (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results);
                }
            });
        });
    };

    const checkStock = (cartItems) => {
        return new Promise((resolve, reject) => {
            const variantIds = cartItems.map(item => item.variant_id);
            const requiredQuantity = Math.max(...cartItems.map(item => item.quantity)); // This will take the maximum quantity needed as a simple approach
    
            const checkStockQuery = `
                SELECT ws.product_variant_id, ws.warehouse_id, ws.quantity 
                FROM warehousestock ws 
                WHERE ws.product_variant_id IN (?)
                AND ws.quantity >= ?
            `;
            connection.query(checkStockQuery, [variantIds, requiredQuantity], (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results);
                }
            });
        });
    };
    
   const addShippingMethod = (connection) => (req, res) => {
    const { method_name, maximum_order_price_amount, maximum_order_weight, minimum_order_price_amount, minimum_order_weight, price_amount, type, shipping_zone_id, currency, is_default } = req.body;

    if (!method_name || !price_amount || !type || !shipping_zone_id || !currency) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const checkDuplicateQuery = 'SELECT COUNT(*) AS count FROM shippingmethod WHERE method_name = ?';
    connection.query(checkDuplicateQuery, [method_name], (error, results) => {
        if (error) {
            console.error('Error checking duplicate shipping method:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }

        if (results[0].count > 0) {
            return res.status(409).json({ error: 'Shipping method with the same name already exists' });
        }

        const insertShippingMethodQuery = `
            INSERT INTO shippingmethod (method_name, maximum_order_price_amount, maximum_order_weight, minimum_order_price_amount, minimum_order_weight, price_amount, type, shipping_zone_id, currency, is_default) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [method_name, maximum_order_price_amount, maximum_order_weight, minimum_order_price_amount, minimum_order_weight, price_amount, type, shipping_zone_id, currency, is_default];

        connection.query(insertShippingMethodQuery, params, (insertError, insertResults) => {
            if (insertError) {
                console.error('Error inserting shipping method:', insertError);
                return res.status(500).json({ error: 'Internal server error' });
            }
            res.status(201).json({ message: 'Shipping method added successfully', shippingMethodId: insertResults.insertId });
        });
    });
}; 
    const checkInsufficientStock = (stockResults, cartItems) => {
        const insufficientStockItems = [];
        cartItems.forEach(item => {
            const stockItem = stockResults.find(stock => stock.variant_id === item.variant_id);
            if (stockItem && stockItem.quantity < item.quantity) {
                insufficientStockItems.push(item.variant_id);
            }
        });
        return insufficientStockItems;
    };

    const calculateTotalAmount = (cartItems) => {
        return cartItems.reduce((total, item) => total + (item.quantity * item.unit_price), 0);
    };

    const createOrderF = (buyerId, totalAmount, voucher_id=null, shippingAddressId, shippingMethodId) => {
        console.log(totalAmount);
        return new Promise((resolve, reject) => {
            const createOrderQuery = 'INSERT INTO E_Order (Buyer_id, total_amount, Order_status_id, created_at, voucher_id, shippingaddress_id, shippingmethod_id) VALUES (?, ?, 1, NOW(), ?, ?, ?)';
            connection.query(createOrderQuery, [buyerId, totalAmount, voucher_id, shippingAddressId, shippingMethodId], (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result.insertId);
                }
            });
        });
    };
    const allocateStock = (orderId, productId, quantity) => {
    return new Promise((resolve, reject) => {
        const allocateStockQuery = `
        INSERT INTO warehouse_allocation (quantity, allocated, order_item_id, stock_id)
        SELECT ?, 1, ?, ws.id
        FROM warehousestock ws 
        WHERE ws.id = ? 
        AND ws.quantity >= ?
        LIMIT 1
        `;
        connection.query(allocateStockQuery, [quantity, orderId, productId, quantity], (error, result) => {
            if (error) {
                reject(error);
            } else {
                const updateStockQuery = `
                    UPDATE warehousestock 
                    SET quantity = quantity - ? 
                    WHERE product_variant_id = ? 
                    AND quantity >= ?
                    LIMIT 1
                `;
                connection.query(updateStockQuery, [quantity, productId, quantity], (updateError, updateResult) => {
                    if (updateError) {
                        reject(updateError);
                    } else {
                        resolve();
                    }
                });
            }
        });
    });
};

const createOrderItem = (orderId, item) => {
    // console.log("item",unit_price);
    return new Promise((resolve, reject) => {
        const query = 'INSERT INTO orderitem (Order_id, variant_id, quantity, price, created_at) VALUES (?, ?, ?, ?, NOW())';
        connection.query(query, [orderId, item.variant_id, item.quantity, item.unit_price], (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results.insertId);
            }
        });
    });
};

const createOrderItems = (orderId, items) => {
    return Promise.all(items.map(item => createOrderItem(orderId, item)));
};
const addDiscount = (connection) => (req, res) => {
    const { Discount_name, discount_percentage, start_date, end_date, min_order_value, priority } = req.body;

    if (!Discount_name || !discount_percentage || !start_date || !end_date || !min_order_value || !priority) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const checkDuplicateQuery = 'SELECT COUNT(*) AS count FROM discount WHERE Discount_name = ?';
    connection.query(checkDuplicateQuery, [Discount_name], (error, results) => {
        if (error) {
            console.error('Error checking duplicate discount:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }

        if (results[0].count > 0) {
            return res.status(409).json({ error: 'Discount with the same name already exists' });
        }

        const insertDiscountQuery = `
            INSERT INTO discount (Discount_name, discount_percentage, start_date, end_date, created_at, min_order_value, priority) 
            VALUES (?, ?, ?, ?, NOW(), ?, ?)
        `;
        connection.query(insertDiscountQuery, [Discount_name, discount_percentage, start_date, end_date, min_order_value, priority], (insertError, insertResults) => {
            if (insertError) {
                console.error('Error inserting discount:', insertError);
                return res.status(500).json({ error: 'Internal server error' });
            }
            res.status(201).json({ message: 'Discount added successfully', discountId: insertResults.insertId });
        });
    });
};

    const createPayment = (orderId, buyerId) => {
        return new Promise((resolve, reject) => {
            const createPaymentQuery = 'INSERT INTO Payment (Order_id, Buyer_id, payment_method, payment_status, created_at) VALUES (?, ?, ?, ?, NOW())';
            connection.query(createPaymentQuery, [orderId, buyerId, 'Credit Card', 'Paid'], (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    };

    const createShipment = (orderId, productId, carrier_id) => {
        return new Promise((resolve, reject) => {
            const createShipmentQuery = 'INSERT INTO Shipment (Order_id, Product_id, carrier_id, shipping_address, shipping_status, created_at) VALUES (?, ?, ?, ?, ?, NOW())';
            connection.query(createShipmentQuery, [orderId, productId, carrier_id, '123 Shipping St, City, Country', 'Pending'], (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    };

    const updateProductQuantity = (orderItems) => {
        return new Promise((resolve, reject) => {
            const updates = orderItems.map(item => {
                return new Promise((resolve, reject) => {
                    const query = `
                        UPDATE warehousestock ws
                        JOIN warehouse_allocation wa ON ws.id = wa.id
                        SET ws.quantity = ws.quantity - wa.quantity
                        WHERE wa.order_item_id = ?
                    `;
                    connection.query(query, [item.orderItem_id], (error, results) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve();
                        }
                    });
                });
            });
    
            Promise.all(updates)
                .then(() => resolve())
                .catch(error => reject(error));
        });
    };
    
    const deleteCartItems = (buyerId) => {
        return new Promise((resolve, reject) => {
            const deleteCartItemsQuery = 'DELETE FROM CartItem WHERE cart_id IN (SELECT cart_id FROM ShoppingCart WHERE buyer_id = ?)';
            connection.query(deleteCartItemsQuery, [buyerId], (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    };
const updateOrderStatus = (Order_status_id, orderId) => {
        return new Promise((resolve, reject) => {
            const updateOrderStatusQuery = 'UPDATE E_Order SET Order_status_id = ? WHERE Order_id = ?';
            connection.query(updateOrderStatusQuery, [Order_status_id, orderId], (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    };

    const getCartItem = (buyerId, productId) => {
        return new Promise((resolve, reject) => {
            // Truy vấn SQL để lấy thông tin của cart item
            const getCartItemQuery = 'SELECT * FROM CartItem WHERE cart_id IN (SELECT cart_id FROM ShoppingCart WHERE buyer_id = ?) AND cart_item_id = ?';
            connection.query(getCartItemQuery, [buyerId, productId], (error, results) => {
                if (error) {
                    reject(error); // Trả về lỗi nếu có lỗi xảy ra trong quá trình thực hiện truy vấn
                } else {
                    resolve(results); // Trả về kết quả nếu truy vấn thành công
                }
            });
        });
    };

    const updateOrderTotalPrice = (orderId, newTotalPrice) => {
        return new Promise((resolve, reject) => {
            const query = `UPDATE E_Order SET total_amount = ? WHERE Order_id = ?`;
            connection.query(query, [newTotalPrice, orderId], (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    };
    const getOrderItems = (orderId) => {
        return new Promise((resolve, reject) => {
            const query = `SELECT * FROM OrderItem WHERE Order_id = ?`;
            connection.query(query, [orderId], (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results);
                }
            });
        });
    };
const getRevenue = (connection) => async (req, res) => {
    const { sellerId } = req.body;
    console.log('getrevenue');

    if (!sellerId) {
        return res.status(400).json({ error: 'Missing sellerId parameter' });
    }
    try {
        const revenueQuery = `
            SELECT SUM(oi.price * oi.quantity) AS revenue
            FROM OrderItem oi
            JOIN Product_ProductVariant pv ON oi.variant_id = pv.id
            JOIN Product p ON pv.product_id = p.product_id
            JOIN E_Order o ON oi.Order_id = o.Order_id
            WHERE p.seller_id = ? AND o.Order_status_id = 3
        `;

        const revenueResult = await queryDatabase(connection, revenueQuery, [sellerId]);

        if (revenueResult.length === 0 || !revenueResult[0].revenue) {
            return res.status(404).json({ error: 'No revenue found for the specified seller' });
        }

        res.status(200).json({ revenue: revenueResult[0].revenue });
    } catch (error) {
        console.error('Error calculating revenue:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
    const updateShoppingCartTotal = (cartId, newTotalPrice) => {
        return new Promise((resolve, reject) => {
            const updateTotalPriceQuery = 'UPDATE ShoppingCart SET total_price = ? WHERE cart_id = ?';
            connection.query(updateTotalPriceQuery, [newTotalPrice, cartId], (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    };
    const getShoppingCartTotal = async (cartId) => {
        const query1 = 'SELECT SUM(total_price_item) AS total FROM CartItem WHERE Cart_id = ?';
        const [result] = await query(query1, [cartId]);
        console.log('result',result);
        return result.total || 0;
    };
    const getApplicableDiscount = (buyerId, totalAmount) => {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT discount_percentage
                FROM Discount
                WHERE CURDATE() BETWEEN start_date AND end_date
                  AND (min_order_value IS NULL OR ? >= min_order_value)
                ORDER BY discount_percentage DESC
                LIMIT 1
            `;
            connection.query(query, [totalAmount], (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results.length > 0 ? results[0].discount_percentage : null);
                }
            });
        });
    };
    const getOrderById = (orderId) => {
        return new Promise((resolve, reject) => {
            const query = `SELECT * FROM E_Order WHERE Order_id = ?`;
            connection.query(query, [orderId], (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results.length > 0 ? results[0] : null);
                }
            });
        });
    };

    const createInvoice = (orderId, totalAmount) => {
        return new Promise((resolve, reject) => {
            const createInvoiceQuery = 'INSERT INTO Invoice (Order_id, Invoice_status_id, total_amount, created_at) VALUES (?, ?, ?, NOW())';
            connection.query(createInvoiceQuery, [orderId, 3, totalAmount], (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result.insertId);
                }
            });
        });
    };

    const getCartItemByProductId = (buyerId, productId) => {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT ci.*, c.Cart_id 
                FROM CartItem ci
                JOIN shoppingCart c ON ci.Cart_id = c.Cart_id
                WHERE c.Buyer_id = ? AND ci.Product_id = ? 
                LIMIT 1
            `;

            connection.query(query, [buyerId, productId], (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results[0]);
                }
            });
        });
    };
    const getVoucherPrice = async (voucherId, totalAmount, userId, res) => {
        try {
            const voucherQuery = `
            SELECT discount_percentage, apply_once_per_order, once_per_customer
            FROM discount_voucher
            WHERE voucher_id = ? AND NOW() BETWEEN start_date AND end_date
        `;
            const voucherResults = await query(voucherQuery, [voucherId]);
    
            if (voucherResults.length === 0) {
                res.status(400).json({ error: 'Voucher is invalid or has expired' });
                return null;
            }
    
            const voucher = voucherResults[0];
    
            // Kiểm tra điều kiện apply_once_per_customer
            if (voucher.once_per_customer) {
                const customerVoucherQuery = `
                    SELECT COUNT(*) AS count
                    FROM E_Order
                    WHERE Buyer_id = ? AND voucher_id = ?
                `;
                const [customerVoucherResult] = await query(customerVoucherQuery, [userId, voucherId]);
    
                if (customerVoucherResult.count > 0) {
                    res.status(400).json({ error: 'Voucher này chỉ được áp dụng một lần cho mỗi khách hàng.' });
                    return null;
                }
            }
    
            // Kiểm tra điều kiện apply_once_per_order
            if (voucher.apply_once_per_order) {
                const orderVoucherQuery = 'SELECT COUNT(*) AS count FROM E_Order WHERE voucher_id = ?';
                const [orderVoucherResult] = await query(orderVoucherQuery, [voucherId]);
    
                if (orderVoucherResult.count > 0) {
                    res.status(400).json({ error: 'Voucher này chỉ được áp dụng một lần cho mỗi đơn hàng.' });
                    return null;
                }
            }
    
            const discountPercentage = voucher.discount_percentage;
            const discountAmount = (discountPercentage / 100) * totalAmount;
            const finalPrice = totalAmount - discountAmount;
    
            return { finalPrice, voucher };
        } catch (error) {
            console.error('Error in getVoucherPrice:', error);
            res.status(500).json({ error: 'Internal server error' });
            return null;
        }
    };

    const createOrder = (connection) => async (req, res) => {
        const userId = req.user.id;
        const voucherId = req.body.voucher_id;
        let shippingMethodId = req.body.shipping_method_id;  // Get the shipping method ID from the request body
        let shippingAddressId = req.body.shipping_address_id;  // Get the shipping address ID from the request body
    
        try {
            const buyerId = await getBuyerId(userId);
            const cartItems = await getCartItems(buyerId);
    
            if (cartItems.length === 0) {
                return res.status(400).json({ error: 'Shopping cart is empty' });
            }
    
            const stockResults = await checkStock(cartItems);
            const insufficientStockItems = checkInsufficientStock(stockResults, cartItems);
    
            if (insufficientStockItems.length > 0) {
                return res.status(400).json({ error: 'Insufficient stock for products: ' + insufficientStockItems.join(', ') });
            }
    
            let totalAmount = 0;
            for (let item of cartItems) {
                const finalPrice = await getFinalPrice(item.variant_id);  // Adjusted to use variant_id
                item.total_price_item = finalPrice * item.quantity;
                totalAmount += item.total_price_item;
            }
    
            if (voucherId) {
                const voucherResult = await getVoucherPrice(voucherId, totalAmount, userId, res);
                if (!voucherResult) {
                    return; // Error response already sent in getVoucherPrice
                }
    
                totalAmount = voucherResult.finalPrice;
            }
    
            const discountPercentage = await getApplicableDiscount(buyerId, totalAmount);
            let discountAmount = 0;
            if (discountPercentage) {
                discountAmount = (discountPercentage / 100) * totalAmount;
                totalAmount -= discountAmount;
            }
    
            if (!shippingMethodId || !shippingAddressId) {
                if (!shippingAddressId) {
                    // Fetch the default shipping address
                    const defaultAddressQuery = `
                        SELECT *
                        FROM address a
                        JOIN user_address ua ON a.id = ua.address_id
                        WHERE ua.user_id = ? AND ua.is_default = 1
                        LIMIT 1
                    `;
                    const defaultAddressResults = await queryDatabase(connection, defaultAddressQuery, [userId]);
                    if (defaultAddressResults.length === 0) {
                        return res.status(400).json({ error: 'No default shipping address found' });
                    }
                    shippingAddressId = defaultAddressResults[0].address_id;
                }
    
                if (!shippingMethodId) {
                    // Fetch the default shipping method
                    const defaultShippingMethodQuery = `
                        SELECT *
                        FROM shippingmethod
                        WHERE is_default = 1
                        LIMIT 1
                    `;
                    const defaultShippingMethodResults = await queryDatabase(connection, defaultShippingMethodQuery);
                    if (defaultShippingMethodResults.length === 0) {
                        return res.status(400).json({ error: 'No default shipping method found' });
                    }
                    shippingMethodId = defaultShippingMethodResults[0].method_id;
                }
            }
    
            // Fetch shipping address details
            const shippingAddressQuery = `
                SELECT *
                FROM address
                WHERE id = ?
                LIMIT 1
            `;
            const shippingAddressResults = await queryDatabase(connection, shippingAddressQuery, [shippingAddressId]);
            if (shippingAddressResults.length === 0) {
                return res.status(400).json({ error: 'Shipping address not found' });
            }
            const shippingAddress = shippingAddressResults[0];
    
            // Fetch shipping method details
            const shippingMethodQuery = `
                SELECT *
                FROM shippingmethod
                WHERE id = ?
                LIMIT 1
            `;
            const shippingMethodResults = await queryDatabase(connection, shippingMethodQuery, [shippingMethodId]);
            if (shippingMethodResults.length === 0) {
                return res.status(400).json({ error: 'Shipping method not found' });
            }
            const shippingMethod = shippingMethodResults[0];
    
            const countryFromAddress = shippingAddress.country;
            const shippingZoneId = shippingMethod.shipping_zone_id;
            const countryFromShippingZone = await getCountryFromShippingZone(shippingZoneId);
            
            console.log('c1',countryFromAddress,countryFromShippingZone)
            
            if (countryFromAddress !== countryFromShippingZone) {
                return res.status(400).json({ error: 'Shipping address country does not match shipping zone country' });
            }
    
            const orderId = await createOrderF(buyerId, totalAmount, voucherId, shippingAddressId, shippingMethodId);
    
            if (discountPercentage) {
                const saveDiscountDetailQuery = `
                    INSERT INTO DiscountDetail (Discount_id, Order_id, discounted_amount, created_at)
                    SELECT Discount_id, ?, ?, NOW()
                    FROM Discount
                    WHERE CURDATE() BETWEEN start_date AND end_date
                      AND (min_order_value IS NULL OR ? >= min_order_value)
                    ORDER BY discount_percentage DESC
                    LIMIT 1
                `;
                await queryDatabase(connection, saveDiscountDetailQuery, [orderId, discountAmount, totalAmount + discountAmount]);
                await updateOrderTotalPrice(orderId, totalAmount);
            }
    
            await createOrderItems(orderId, cartItems);
    
            const cartIdQuery = 'SELECT cart_id FROM ShoppingCart WHERE buyer_id = ?';
            const cartResults = await queryDatabase(connection, cartIdQuery, [buyerId]);
            const cartId = cartResults[0].cart_id;
            const currentTotalPrice = await getShoppingCartTotal(cartId);
            const newTotalPrice = Math.max(currentTotalPrice - totalAmount, 0);
            await updateShoppingCartTotal(cartId, newTotalPrice);
    
            await deleteCartItems(buyerId);
    
            return res.status(200).json({ message: 'Order created successfully, please proceed to payment', orderId });
        } catch (error) {
            console.error('Error during checkout:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    };
    
    const createOrderFromCartItem = (connection) => async (req, res) => {
        try {
            const userId = req.user.id;
            const cartItemId = req.body.cartItemId;  // Get the cartItemId from the request body
            const voucherId = req.body.voucher_id;  // Get the voucher ID from the request body
            let shippingMethodId = req.body.shipping_method_id;  // Get the shipping method ID from the request body
            let shippingAddressId = req.body.shipping_address_id;  // Get the shipping address ID from the request body
    
            // Lấy buyer_id từ user_id
            const buyerId = await getBuyerId(userId);
    
            // Lấy thông tin của cart item
            const cartItem = await getCartItem(buyerId, cartItemId);
    
            // Kiểm tra xem cart item có tồn tại không
            if (cartItem[0] == undefined) {
                return res.status(404).json({ error: 'Cart item not found' });
            }
    
            // Kiểm tra số lượng tồn kho của sản phẩm trong cart item
            console.log("cart",cartItem)
            const stockResults = await checkStock(cartItem);
            const insufficientStock = checkInsufficientStock(stockResults, [cartItem]);
            if (insufficientStock.length > 0) {
                return res.status(400).json({ error: 'Insufficient stock for product: ' + insufficientStock.join(', ') });
            }
    
            // Tạo đơn hàng cho cart item
            let finalTotalPrice = cartItem[0].total_price_item;
    
            if (voucherId) {
                const voucherResult = await getVoucherPrice(voucherId, finalTotalPrice, userId, res);
                if (!voucherResult) {
                    return; // Error response already sent in getVoucherPrice
                }
                finalTotalPrice = voucherResult.finalPrice;
            }
    
            if (!shippingMethodId || !shippingAddressId) {
                // If not provided, fetch the default shipping address and method
                if (!shippingAddressId) {
                    const defaultAddressQuery = `
                        SELECT *
                        FROM address a
                        JOIN user_address ua ON a.id = ua.address_id
                        WHERE ua.user_id = ? AND ua.is_default = 1
                        LIMIT 1
                    `;
                    const defaultAddressResults = await queryDatabase(connection, defaultAddressQuery, [userId]);
                    if (defaultAddressResults.length === 0) {
                        return res.status(400).json({ error: 'No default shipping address found' });
                    }
                    shippingAddressId = defaultAddressResults[0].address_id;
                }
    
                if (!shippingMethodId) {
                    const defaultShippingMethodQuery = `
                        SELECT *
                        FROM shippingmethod
                        WHERE is_default = 1
                        LIMIT 1
                    `;
                    const defaultShippingMethodResults = await queryDatabase(connection, defaultShippingMethodQuery);
                    if (defaultShippingMethodResults.length === 0) {
                        return res.status(400).json({ error: 'No default shipping method found' });
                    }
                    shippingMethodId = defaultShippingMethodResults[0].method_id;
                }
            }
    
            // Fetch shipping address details
            const shippingAddressQuery = `
                SELECT *
                FROM address
                WHERE id = ?
                LIMIT 1
            `;
            const shippingAddressResults = await queryDatabase(connection, shippingAddressQuery, [shippingAddressId]);
            if (shippingAddressResults.length === 0) {
                return res.status(400).json({ error: 'Shipping address not found' });
            }
            const shippingAddress = shippingAddressResults[0];
    
            // Fetch shipping method details
            const shippingMethodQuery = `
                SELECT *
                FROM shippingmethod
                WHERE id = ?
                LIMIT 1
            `;
            const shippingMethodResults = await queryDatabase(connection, shippingMethodQuery, [shippingMethodId]);
            if (shippingMethodResults.length === 0) {
                return res.status(400).json({ error: 'Shipping method not found' });
            }
            const shippingMethod = shippingMethodResults[0];
    
            const countryFromAddress = shippingAddress.country;
            const shippingZoneId = shippingMethod.shipping_zone_id;
            const countryFromShippingZone = await getCountryFromShippingZone(shippingZoneId);
    
            if (countryFromAddress !== countryFromShippingZone) {
                return res.status(400).json({ error: 'Shipping address country does not match shipping zone country' });
            }
    
            const orderId = await createOrderF(buyerId, finalTotalPrice, voucherId, shippingAddressId, shippingMethodId);
    
            // Áp dụng discount nếu có
            const discountPercentage = await getApplicableDiscount(buyerId, finalTotalPrice);
            if (discountPercentage) {
                const discountAmount = (discountPercentage / 100) * finalTotalPrice;
                finalTotalPrice -= discountAmount;
    
                // Lưu thông tin discount vào DiscountDetail
                const saveDiscountDetailQuery = `
                    INSERT INTO DiscountDetail (Discount_id, Order_id, discounted_amount, created_at)
                    SELECT Discount_id, ?, ?, NOW()
                    FROM Discount
                    WHERE CURDATE() BETWEEN start_date AND end_date
                      AND (min_order_value IS NULL OR ? >= min_order_value)
                    ORDER BY discount_percentage DESC
                    LIMIT 1
                `;
                await query(saveDiscountDetailQuery, [orderId, discountAmount, finalTotalPrice]);
    
                // Cập nhật lại total_price của order sau khi áp dụng discount
                await updateOrderTotalPrice(orderId, finalTotalPrice);
            }
    
            // Tạo các mục đơn hàng
            await createOrderItem(orderId, cartItem[0]);
    
            // Cập nhật lại total_price của shopping cart
            const cartId = cartItem[0].CART_ID;
            const currentTotalPrice = await getShoppingCartTotal(cartId);
            const newTotalPrice = currentTotalPrice - cartItem[0].total_price_item;
            await updateShoppingCartTotal(cartId, Math.max(newTotalPrice, 0));
    
            // Xóa cart item sau khi đã tạo đơn hàng
            const deleteCartItemQuery = 'DELETE FROM CartItem WHERE cart_item_id = ?';
            await query(deleteCartItemQuery, [cartItemId]);
    
            // Trả về phản hồi khi thanh toán thành công
            return res.status(200).json({ message: 'Order created successfully, please proceed to payment', orderId });
        } catch (error) {
            console.error('Error during checkout for cart item:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    };
    const getRevenueByTime = (connection) => async (req, res) => {
    const { sellerId, startTime, endTime } = req.body;

    if (!sellerId || !startTime || !endTime) {
        return res.status(400).json({ error: 'Missing sellerId, startTime or endTime parameter' });
    }

    try {
        const revenueQuery = `
            SELECT SUM(oi.price * oi.quantity) AS revenue
            FROM OrderItem oi
            JOIN Product_ProductVariant pv ON oi.variant_id = pv.id
            JOIN Product p ON pv.product_id = p.product_id
            JOIN E_Order o ON oi.Order_id = o.Order_id
            WHERE p.seller_id = ? AND o.Order_status_id = 3 AND o.created_at BETWEEN ? AND ?
        `;

        const revenueResult = await queryDatabase(connection,revenueQuery, [sellerId, startTime, endTime]);

        if (revenueResult.length === 0 || !revenueResult[0].revenue) {
            return res.status(404).json({ error: 'No revenue found for the specified seller in the given time period' });
        }

        res.status(200).json({ revenue: revenueResult[0].revenue });
    } catch (error) {
        console.error('Error calculating revenue:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

    const confirmPayment = (connection) => async (req, res) => {
        const userId = req.user.id;
        const orderId = req.body.orderId;
    
        try {
            const buyerId = await getBuyerId(userId);
            const order = await getOrderById(orderId);
            if (!order) {
                return res.status(404).json({ error: 'Order not found' });
            }
    
            const orderItems = await getOrderItems(orderId);
            if (orderItems.length === 0) {
                return res.status(404).json({ error: 'No order items found for this order' });
            }
    
            // Calculate total amount
            const amount = orderItems.reduce((total, item) => total + item.price * item.quantity, 0);
    
            // Get payment details from request body
            const paymentDetails = req.body.paymentDetails;
            const paymentMethod = req.body.paymentMethod;
            console.log('amount',amount);
            // Call the mock payment gateway
            const paymentResponse = await axios.post('http://localhost:8088/order/mock-payment-gateway', {
                paymentDetails,
                amount
            });
    
            if (paymentResponse.status === 200) {
                const transactionId = paymentResponse.data.transactionId; // Assuming the response contains transactionId
    
                await createPayment(orderId, buyerId, paymentDetails, transactionId, paymentMethod);
    
                for (let item of orderItems) {
                    await allocateStock(orderId, item.variant_id, item.quantity);  // Adjusted to use variant_id
                }
    
                await updateProductQuantity(orderItems);
                await updateOrderStatus(3, orderId); // Assuming status 3 means payment confirmed
                await createInvoice(orderId, amount);
    
                return res.status(200).json({ message: 'Payment confirmed and order processed successfully' });
            } else {
                return res.status(400).json({ message: 'Payment failed' });
            }
        } catch (error) {
            console.error('Error during payment confirmation:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    };
    const getMonthlyRevenue = (connection) => async (req, res) => {
        const { sellerId } = req.body;
    
        if (!sellerId) {
            return res.status(400).json({ error: 'Missing sellerId parameter' });
        }
    
        try {
            const revenueQuery = `
                SELECT DATE_FORMAT(o.created_at, '%Y-%m') AS month, SUM(oi.price * oi.quantity) AS revenue
                FROM OrderItem oi
                JOIN Product_ProductVariant pv ON oi.variant_id = pv.id
                JOIN Product p ON pv.product_id = p.product_id
                JOIN E_Order o ON oi.Order_id = o.Order_id
                WHERE p.seller_id = ? AND o.Order_status_id = 3
                GROUP BY DATE_FORMAT(o.created_at, '%Y-%m')
                ORDER BY DATE_FORMAT(o.created_at, '%Y-%m')
            `;
    
            const revenueResult = await queryDatabase(connection,revenueQuery, [sellerId]);
    
            if (revenueResult.length === 0) {
                return res.status(404).json({ error: 'No monthly revenue found for the specified seller' });
            }
    
            res.status(200).json(revenueResult);
        } catch (error) {
            console.error('Error calculating monthly revenue:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    };
const getOrder = (connection) => (req, res) => {
    // getOrder logic with connection
};
const changeOrderStatus = (connection) => async (req, res) => {
    const { orderId, Order_status_id } = req.body;
    const userId = req.user.id;  

    if (!orderId || !Order_status_id) {
        return res.status(400).json({ error: 'Order ID and Order status ID are required' });
    }
    try {
        const getUserRoleQuery = 'SELECT userType FROM e_user WHERE User_id = ?';
        const [userRoleResults] = await new Promise((resolve, reject) => {
            connection.query(getUserRoleQuery, [userId], (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results);
                }
            });
        });

        if (userRoleResults.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        console.log(userRoleResults)
        const userRole = userRoleResults.userType;

        if (userRole === 'admin') {
            const updateOrderStatusQuery = 'UPDATE E_Order SET Order_status_id = ? WHERE Order_id = ?';
            const [updateResult] = await new Promise((resolve, reject) => {
                connection.query(updateOrderStatusQuery, [Order_status_id, orderId], (error, result) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(result);
                    }
                });
            });

            if (updateResult.affectedRows === 0) {
                return res.status(404).json({ error: 'Order not found' });
            }

            return res.status(200).json({ message: 'Order status updated successfully' });
        } else if (userRole === 'seller') {
            const getOrderProductsQuery = `
                SELECT p.seller_id
                FROM orderitem oi
                JOIN product_productvariant pv ON oi.variant_id = pv.id
                JOIN product p ON pv.product_id = p.Product_id
                WHERE oi.Order_id = ?
            `;
            
            const [orderProductsResults] = await new Promise((resolve, reject) => {
                connection.query(getOrderProductsQuery, [orderId], (error, results) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(results);
                    }
                });
            });

            if (orderProductsResults.length === 0) {
                return res.status(404).json({ error: 'No products found for this order' });
            }

            const isSellerAuthorized = orderProductsResults.every(row => row.seller_id === userId);

            if (!isSellerAuthorized) {
                return res.status(403).json({ error: 'Unauthorized: You can only change the status of your own orders' });
            }

            const updateOrderStatusQuery = 'UPDATE E_Order SET Order_status_id = ? WHERE Order_id = ?';
            const [updateResult] = await new Promise((resolve, reject) => {
                connection.query(updateOrderStatusQuery, [Order_status_id, orderId], (error, result) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(result);
                    }
                });
            });

            if (updateResult.affectedRows === 0) {
                return res.status(404).json({ error: 'Order not found' });
            }

            return res.status(200).json({ message: 'Order status updated successfully' });
        } else {
            return res.status(403).json({ error: 'Unauthorized: You can only change the status of your own orders' });
        }
    } catch (error) {
        console.error('Error in changeOrderStatus:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
const getRevenueByDateRange = (startDate, endDate) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT SUM(total_amount) AS total_revenue 
            FROM E_Order 
            WHERE Order_status_id = ? AND created_at BETWEEN ? AND ?`;
        connection.query(query, [3, startDate, endDate], (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results[0].total_revenue || 0);
            }
        });
    });
};
const getRevenueByProduct = (productId) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT SUM(oi.quantity * oi.price) AS product_revenue 
            FROM OrderItem oi 
            JOIN E_Order o ON oi.Order_id = o.Order_id 
            WHERE o.Order_status_id = ? AND oi.product_id = ?`;
        connection.query(query, [3, productId], (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results[0].product_revenue || 0);
            }
        });
    });
};

module.exports = {
    changeOrderStatus
};


module.exports = {
    changeOrderStatus
};


module.exports = {
    changeOrderStatus
};

module.exports = {
    createOrder,getRevenue,getRevenueByTime, getMonthlyRevenue,
    getOrder,addDiscount,
    addShippingMethod,
    confirmPayment,createOrderFromCartItem,mockPaymentGateway,changeOrderStatus
};
